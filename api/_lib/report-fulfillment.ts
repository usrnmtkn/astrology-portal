import crypto from "node:crypto";
import { createTldrAstroReportFactsClient, type ReportChartSubject } from "./report-facts.ts";
import { reportFulfillmentConfig } from "./report-fulfillment-config.ts";
import type { ReportFulfillmentStore, FulfillmentJobRow, FulfillmentReportRow } from "./report-fulfillment-store.ts";
import { verifyReportFactLock } from "./report-fact-lock.ts";
import { judgeReportUnit, type ReportJudgeResult } from "./report-judge.ts";
import { createReportMailProvider, type ReportMailProvider } from "./report-mail.ts";
import {
  assertReportDomainFulfillmentReady,
  assembleReportGenerationPayload,
  validateReportDraft,
  type ReportDomain,
  type ReportDraft,
  type ReportHorizon
} from "./report-generation.ts";
import { reportSystemPromptVersions } from "./report-prompt-versions.ts";
import type { ReportModelCall } from "./report-model-client.ts";
import { runReportWriterChain } from "./report-writer-chain.ts";
import { createSupabaseReportAdmin, type SupabaseReportAdmin } from "./supabase-report-admin.ts";
import { birthProfileFromPersistedData } from "./report-billing-window.ts";

const unitsByHorizon = {
  "1_month": ["overview", "what-matters-most", "domain:main", "key-dates"],
  "4_months": ["overview", "period-theme", "development:1", "development:2", "key-dates", "closing-synthesis"],
  "6_months": ["overview", "period-theme", "phase-1", "phase-2", "key-dates", "review"],
  "12_months": ["overview", "year-theme", "domain:main", "winter-current", "spring", "summer", "autumn", "money", "key-dates", "review-current-year", "winter-next"]
} as const;

const personalHealthYearUnits = [
  "overview", "year-theme", "domain:main", "winter-current", "spring", "summer", "autumn",
  "health-capacity", "key-dates", "review-current-year", "winter-next"
] as const;

function fulfillmentUnitIds(reportDomain: ReportDomain, reportHorizon: ReportHorizon) {
  return reportDomain === "personal_health" && reportHorizon === "12_months"
    ? personalHealthYearUnits
    : unitsByHorizon[reportHorizon];
}

export type ReportFactsCalculator = (report: FulfillmentReportRow) => Promise<{ facts: Record<string, unknown>; facts_engine: string }>;
export type ReportJudgeCall = typeof judgeReportUnit;

function stableJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
  if (value && typeof value === "object") return `{${Object.entries(value as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b)).map(([key, entry]) => `${JSON.stringify(key)}:${stableJson(entry)}`).join(",")}}`;
  return JSON.stringify(value) ?? "null";
}

export function reportFactsHash(facts: Record<string, unknown>) {
  return crypto.createHash("sha256").update(stableJson(facts)).digest("hex");
}

function totalTokens(calls: Array<{ usage: { totalTokens: number } }>) {
  return calls.reduce((sum, call) => sum + call.usage.totalTokens, 0);
}

function nowPatch(status: string) {
  return { fulfillment_status: status };
}

function failures(existing: unknown[], stage: string, values: unknown) {
  return [...existing, { stage, at: new Date().toISOString(), values }];
}

export function createReportFactsCalculator(admin: SupabaseReportAdmin = createSupabaseReportAdmin()): ReportFactsCalculator {
  const client = createTldrAstroReportFactsClient();
  return async (report) => {
    const profileRow = await admin.selectOne<{ data: unknown }>("user_profiles", new URLSearchParams({ user_id: `eq.${report.user_id}`, select: "data" }));
    const birth = birthProfileFromPersistedData(profileRow?.data);
    if (!birth?.birthDate || !birth.birthLocation) throw new Error("Report birth data is unavailable.");
    const natalSubject: ReportChartSubject = {
      datetime: { date: birth.birthDate, time: birth.birthTime, timeKnown: !birth.birthTimeUnknown && Boolean(birth.birthTime), timeZone: birth.birthLocation.timeZone },
      location: birth.birthLocation,
      settings: { houseSystem: "whole_sign", zodiac: "tropical", aspectProfile: "standard" }
    };
    const [version, facts] = await Promise.all([
      client.serviceVersion(),
      client.reportWindow({ natalSubject, location: birth.birthLocation, reportDomain: report.report_domain, reportHorizon: report.report_horizon, start: report.period_start, end: report.period_end })
    ]);
    return { facts, facts_engine: `tldrastro-api@${version}` };
  };
}

export async function processReportFulfillmentJob(input: {
  job: FulfillmentJobRow;
  store: ReportFulfillmentStore;
  calculateFacts: ReportFactsCalculator;
  callModel?: ReportModelCall;
  judgeCall?: ReportJudgeCall;
  mail?: ReportMailProvider;
  random?: () => number;
}) {
  const config = reportFulfillmentConfig();
  const report = await input.store.report(input.job.report_id);
  const entitlement = await input.store.entitlement(input.job.entitlement_id);
  if (!report || !entitlement) throw new Error("Fulfillment job lost its report or entitlement.");
  if (entitlement.status !== "active") {
    await input.store.updateJob(input.job.id, { state: "cancelled", last_error: `Entitlement is ${entitlement.status}.` });
    return { status: "cancelled" };
  }
  assertReportDomainFulfillmentReady(report.report_domain);
  let factsBundle = await input.store.reusableFacts(report);
  if (!factsBundle) {
    const claimed = await input.store.claimFacts(report, input.job.id);
    if (!claimed) throw new Error("FACTS_PENDING: another fulfillment worker owns this user-window calculation.");
    await input.store.updateReport(report.id, nowPatch("calculating"));
    const calculated = await input.calculateFacts(report);
    factsBundle = { ...calculated, facts_hash: reportFactsHash(calculated.facts) };
    await input.store.saveFacts(report, factsBundle);
  }
  report.facts = factsBundle.facts;
  report.facts_engine = factsBundle.facts_engine;
  report.facts_hash = factsBundle.facts_hash;
  await input.store.updateReport(report.id, { ...nowPatch("writing"), ...factsBundle });
  let tokenCount = report.token_count ?? 0;
  const promptVersions: Record<string, unknown> = {};
  const judgeScores: Array<{ unitId: string; result: ReportJudgeResult }> = [];
  const validatorSummary: Array<{ unitId: string; passed: true; issues: unknown[] }> = [];
  let validatorAttempts = report.attempt_counts?.validator ?? 0;
  let judgeAttempts = report.attempt_counts?.judge ?? 0;

  for (const unitId of fulfillmentUnitIds(report.report_domain, report.report_horizon)) {
    const existing = await input.store.unit(report.id, unitId);
    if (existing?.source_snapshot?.fulfillmentPassed === true) {
      const snapshot = existing.source_snapshot;
      validatorSummary.push({ unitId, passed: true, issues: Array.isArray(snapshot.validatorResults) ? snapshot.validatorResults : [] });
      if (snapshot.judge && typeof snapshot.judge === "object") {
        judgeScores.push({ unitId, result: snapshot.judge as ReportJudgeResult });
      }
      if (snapshot.promptVersions && typeof snapshot.promptVersions === "object") {
        Object.assign(promptVersions, snapshot.promptVersions);
      }
      continue;
    }
    await input.store.updateJob(input.job.id, { step: "writing" });
    const payload = assembleReportGenerationPayload({ reportId: report.id, reportDomain: report.report_domain, reportHorizon: report.report_horizon, unitId, frozenFacts: report.facts });
    if (payload.sourceGaps.length) throw new Error(`SOURCE_GAP: ${payload.sourceGaps.map((gap) => gap.requestedKey).join(", ")}`);
    const versions = reportSystemPromptVersions(payload.canonicalOwnerPrompt.sourcePath);
    promptVersions.canonical = versions.canonical.version;
    promptVersions.critique = versions.critique.version;
    promptVersions.judge = versions.judge.version;
    let feedback: string[] = [];
    let draft: ReportDraft | null = null;
    let validatorResults: unknown[] = [];
    for (let attempt = 0; attempt < config.validatorAttemptCap; attempt += 1) {
      await input.store.updateReport(report.id, nowPatch("writing"));
      await input.store.updateJob(input.job.id, { step: "writing" });
      validatorAttempts += 1;
      const chain = await runReportWriterChain({ payload, failureContext: feedback, callModel: input.callModel });
      tokenCount += totalTokens(chain.calls);
      if (tokenCount > config.tokenBudget) throw new Error(`Report token budget exceeded (${tokenCount}/${config.tokenBudget}).`);
      await input.store.updateReport(report.id, nowPatch("validating"));
      await input.store.updateJob(input.job.id, { step: "validating" });
      const validation = validateReportDraft(chain.revised, payload);
      const factLock = verifyReportFactLock(chain.revised, payload.frozenFacts);
      validatorResults = [...validation, ...factLock.issues];
      if (validatorResults.length === 0) {
        draft = chain.revised;
        break;
      }
      feedback = validatorResults.map((issue) => JSON.stringify(issue));
    }
    if (!draft) throw new Error(`Validator attempt cap exhausted for ${unitId}: ${JSON.stringify(validatorResults)}`);
    validatorSummary.push({ unitId, passed: true, issues: [] });
    await input.store.updateReport(report.id, nowPatch("judging"));
    await input.store.updateJob(input.job.id, { step: "judging" });
    let judged: Awaited<ReturnType<typeof judgeReportUnit>> | null = null;
    for (let attempt = 0; attempt < config.judgeAttemptCap; attempt += 1) {
      judgeAttempts += 1;
      judged = await (input.judgeCall ?? judgeReportUnit)({ payload, draft, validatorResults, threshold: config.judgeThreshold, callModel: input.callModel });
      tokenCount += judged.usage.totalTokens;
      if (judged.result.verdict === "pass") break;
      await input.store.updateReport(report.id, nowPatch("writing"));
      await input.store.updateJob(input.job.id, { step: "writing" });
      const chain = await runReportWriterChain({ payload, failureContext: judged.result.findings.map((finding) => JSON.stringify(finding)), callModel: input.callModel });
      tokenCount += totalTokens(chain.calls);
      await input.store.updateReport(report.id, nowPatch("validating"));
      await input.store.updateJob(input.job.id, { step: "validating" });
      const validation = validateReportDraft(chain.revised, payload);
      const factLock = verifyReportFactLock(chain.revised, payload.frozenFacts);
      if (validation.length || !factLock.passed) throw new Error(`Judge-driven revision failed hard validators for ${unitId}.`);
      draft = chain.revised;
    }
    if (!judged || judged.result.verdict !== "pass") throw new Error(`Judge attempt cap exhausted for ${unitId}.`);
    judgeScores.push({ unitId, result: judged.result });
    await input.store.saveUnit(report, unitId, draft, {
      fulfillmentPassed: true, validatorResults, judge: judged.result, promptVersions,
      factsHash: report.facts_hash, attemptCounts: { validator: validatorAttempts, judge: judgeAttempts }
    });
    await input.store.updateReport(report.id, {
      token_count: tokenCount,
      token_spend_usd: Number(((tokenCount / 1_000_000) * config.tokenCostPerMillion).toFixed(4)),
      attempt_counts: { validator: validatorAttempts, judge: judgeAttempts }
    });
  }

  const publicationStatus = config.autoPublishEnabled ? "live" : "needs_review";
  await input.store.updateReport(report.id, {
    ...nowPatch(publicationStatus), status: publicationStatus, prompt_versions: promptVersions,
    judge_scores: judgeScores, token_count: tokenCount,
    token_spend_usd: Number(((tokenCount / 1_000_000) * config.tokenCostPerMillion).toFixed(4)),
    validator_results: validatorSummary,
    attempt_counts: { validator: validatorAttempts, judge: judgeAttempts },
    ...(config.autoPublishEnabled ? { delivered_at: new Date().toISOString() } : {})
  });
  await input.store.updateJob(input.job.id, { state: "complete", step: "complete", locked_at: null, locked_by: null });
  if (config.autoPublishEnabled) {
    const combinationCount = await input.store.countCombination(report, promptVersions);
    const reason = combinationCount < config.firstCombinationAuditCount
      ? "new_combination" as const
      : (input.random ?? Math.random)() < config.auditSampleRate ? "random_sample" as const : null;
    if (reason) await input.store.queueAudit(report, reason, promptVersions);
    const mail = input.mail ?? createReportMailProvider();
    try {
      const result = await mail.sendReportReady({ reportId: report.id, userId: report.user_id, reportUrl: `${process.env.APP_URL ?? process.env.VITE_APP_URL ?? ""}/reports/${report.id}` });
      await input.store.recordDelivery(report.id, { provider: result.provider, provider_message_id: result.messageId ?? null, status: "sent", sent_at: new Date().toISOString() });
    } catch (error) {
      await input.store.recordDelivery(report.id, { provider: "unconfigured", status: "failed", error: error instanceof Error ? error.message : "Mail delivery failed." });
    }
  }
  return { status: publicationStatus, tokenCount, judgeScores };
}

export async function runReportFulfillmentBatch(input: {
  workerId: string;
  store: ReportFulfillmentStore;
  calculateFacts: ReportFactsCalculator;
  callModel?: ReportModelCall;
  judgeCall?: ReportJudgeCall;
  mail?: ReportMailProvider;
}) {
  const config = reportFulfillmentConfig();
  if (config.workerPaused || await input.store.workerPaused()) return { paused: true, processed: [] };
  const jobs = await input.store.claimJobs(input.workerId, config.workerBatchSize);
  const processed = [];
  for (const job of jobs) {
    try {
      processed.push({ jobId: job.id, result: await processReportFulfillmentJob({ ...input, job }) });
    } catch (error) {
      const report = await input.store.report(job.report_id);
      const message = error instanceof Error ? error.message : "Unknown fulfillment failure.";
      const terminal = /REPORT_DOMAIN_PROMPT_PENDING|SOURCE_GAP|attempt cap exhausted|token budget exceeded|birth data is unavailable|lost its report or entitlement|facts bundle/iu.test(message);
      const retryable = message.startsWith("FACTS_PENDING:") || (!terminal && job.attempt < config.jobAttemptCap);
      if (report) {
        await input.store.updateReport(report.id, {
          ...nowPatch(retryable ? report.fulfillment_status : "exception"),
          failure_history: failures(report.failure_history ?? [], job.step, message)
        });
      }
      await input.store.updateJob(job.id, retryable ? {
        state: "retry",
        run_after: new Date(Date.now() + Math.min(60_000, 2 ** job.attempt * 1_000)).toISOString(),
        last_error: message,
        locked_at: null,
        locked_by: null
      } : { state: "exception", last_error: message, locked_at: null, locked_by: null });
      processed.push({ jobId: job.id, error: message, retryable });
    }
  }
  return { paused: false, processed };
}
