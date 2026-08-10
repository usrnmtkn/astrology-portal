import crypto from "node:crypto";
import { createTldrAstroReportFactsClient, ReportCalculationApiClientError, type ReportChartSubject } from "./report-facts.js";
import { reportFulfillmentConfig } from "./report-fulfillment-config.js";
import type { ReportFulfillmentStore, FulfillmentJobRow, FulfillmentReportRow } from "./report-fulfillment-store.ts";
import { verifyReportFactLock } from "./report-fact-lock.js";
import { judgeReportUnit, type ReportJudgeResult } from "./report-judge.js";
import { createReportMailProvider, type ReportMailProvider } from "./report-mail.js";
import {
  assertReportDomainFulfillmentReady,
  assembleReportGenerationPayload,
  validateReportDraft,
  type ReportDomain,
  type ReportDraft,
  type ReportHorizon
} from "./report-generation.js";
import { reportSystemPromptVersions } from "./report-prompt-versions.js";
import { callReportModel, type ReportModelCall } from "./report-model-client.js";
import { estimateReportModelCost } from "./report-model-pricing.js";
import { runReportWriterChain } from "./report-writer-chain.js";
import { createSupabaseReportAdmin, type SupabaseReportAdmin } from "./supabase-report-admin.js";
import { ReportBirthDataError, requireReportBirthProfile, type BirthProfile } from "./report-billing-window.js";
import { reportUrl } from "./report-http.js";

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

export type ReportFactsCalculator = ((report: FulfillmentReportRow) => Promise<{ facts: Record<string, unknown>; facts_engine: string }>) & {
  preflight?: (report: FulfillmentReportRow, requiresBirthTime: boolean) => Promise<void>;
};
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
  const preparedBirthProfiles = new Map<string, BirthProfile>();
  const prepareBirthProfile = async (report: FulfillmentReportRow, requiresBirthTime: boolean) => {
    const profileRow = await admin.selectOne<{ data: unknown }>("user_profiles", new URLSearchParams({ user_id: `eq.${report.user_id}`, select: "data" }));
    const birth = requireReportBirthProfile(profileRow?.data, requiresBirthTime);
    preparedBirthProfiles.set(report.id, birth);
    return birth;
  };
  const calculate: ReportFactsCalculator = async (report) => {
    const birth = preparedBirthProfiles.get(report.id) ?? await prepareBirthProfile(report, true);
    preparedBirthProfiles.delete(report.id);
    if (!birth.birthLocation) throw new ReportBirthDataError("BIRTH_DATA_MISSING", "Add a valid birth place before generating this report.");
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
  calculate.preflight = async (report, requiresBirthTime) => {
    await prepareBirthProfile(report, requiresBirthTime);
    await client.preflight();
  };
  return calculate;
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
  if (!input.job.authorization_token || !input.job.authorized_call_budget) {
    throw new Error("REPORT_CALL_AUTHORIZATION_REQUIRED: fulfillment has no owner-issued call budget.");
  }
  let tokenCountTotal = report.token_count_total ?? 0;
  let estimatedCostTotal = report.token_spend_usd_estimate ?? 0;
  const providerCall = input.callModel ?? callReportModel;
  let activeLedgerCallId: string | null = null;
  const authorizedCall: ReportModelCall = (modelInput) => providerCall({
    ...modelInput,
    beforeProviderCall: async (attempt) => {
      await modelInput.beforeProviderCall?.(attempt);
      // Missing pricing is configuration failure and must be discovered before
      // an authorization is consumed or a provider request is sent.
      estimateReportModelCost(attempt.model, { inputTokens: 0, outputTokens: 0, totalTokens: 0 });
      const begun = await input.store.beginAuthorizedCall(input.job.id, input.job.authorization_token as string, attempt);
      activeLedgerCallId = begun.callId;
    },
    afterProviderCall: async (attempt, result) => {
      await modelInput.afterProviderCall?.(attempt, result);
      if (!activeLedgerCallId) throw new Error("REPORT_CALL_LEDGER_MISSING: provider completed without an active ledger row.");
      const callId = activeLedgerCallId;
      activeLedgerCallId = null;
      const estimatedCostUsd = estimateReportModelCost(attempt.model, result.usage);
      await input.store.finishAuthorizedCall(callId, {
        state: "complete", inputTokens: result.usage.inputTokens, cachedInputTokens: result.usage.cachedInputTokens,
        outputTokens: result.usage.outputTokens, totalTokens: result.usage.totalTokens,
        estimatedCostUsd, responseId: result.responseId
      });
      tokenCountTotal += result.usage.totalTokens;
      estimatedCostTotal = Number((estimatedCostTotal + estimatedCostUsd).toFixed(6));
      if (tokenCountTotal > config.tokenBudget) {
        throw new Error(`Report total token budget exceeded (${tokenCountTotal}/${config.tokenBudget}).`);
      }
    },
    onProviderCallError: async (attempt, error) => {
      await modelInput.onProviderCallError?.(attempt, error);
      if (!activeLedgerCallId) return;
      const callId = activeLedgerCallId;
      activeLedgerCallId = null;
      await input.store.finishAuthorizedCall(callId, {
        state: "error", error: error instanceof Error ? error.message : "Provider call failed."
      });
    }
  });
  assertReportDomainFulfillmentReady(report.report_domain);
  let factsBundle = await input.store.reusableFacts(report);
  if (!factsBundle) {
    await input.calculateFacts.preflight?.(report, Boolean(entitlement.requires_birth_time));
    const claimed = await input.store.claimFacts(report, input.job.id);
    if (!claimed) throw new Error("FACTS_PENDING: another fulfillment worker owns this user-window calculation.");
    await input.store.updateReport(report.id, nowPatch("calculating"));
    try {
      const calculated = await input.calculateFacts(report);
      factsBundle = { ...calculated, facts_hash: reportFactsHash(calculated.facts) };
      await input.store.saveFacts(report, factsBundle);
    } catch (error) {
      try {
        await input.store.releaseFactsClaim(report);
      } catch (releaseError) {
        console.error("Report facts claim release failed after calculation error.", releaseError);
      }
      throw error;
    }
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
    let acceptedChainTokens = 0;
    let validatorResults: unknown[] = [];
    for (let attempt = 0; attempt < config.validatorAttemptCap; attempt += 1) {
      await input.store.updateReport(report.id, nowPatch("writing"));
      await input.store.updateJob(input.job.id, { step: "writing" });
      validatorAttempts += 1;
      const chain = await runReportWriterChain({ payload, failureContext: feedback, callModel: authorizedCall });
      await input.store.updateReport(report.id, nowPatch("validating"));
      await input.store.updateJob(input.job.id, { step: "validating" });
      const validation = validateReportDraft(chain.revised, payload);
      const factLock = verifyReportFactLock(chain.revised, payload.frozenFacts);
      validatorResults = [...validation, ...factLock.issues];
      if (validatorResults.length === 0) {
        draft = chain.revised;
        acceptedChainTokens = totalTokens(chain.calls);
        break;
      }
      feedback = validatorResults.map((issue) => JSON.stringify(issue));
    }
    if (!draft) throw new Error(`Validator attempt cap exhausted for ${unitId}: ${JSON.stringify(validatorResults)}`);
    validatorSummary.push({ unitId, passed: true, issues: [] });
    await input.store.updateReport(report.id, nowPatch("judging"));
    await input.store.updateJob(input.job.id, { step: "judging" });
    let judged: Awaited<ReturnType<typeof judgeReportUnit>> | null = null;
    let acceptedJudgeTokens = 0;
    for (let attempt = 0; attempt < config.judgeAttemptCap; attempt += 1) {
      judgeAttempts += 1;
      judged = await (input.judgeCall ?? judgeReportUnit)({ payload, draft, validatorResults, threshold: config.judgeThreshold, callModel: authorizedCall });
      if (judged.result.verdict === "pass") {
        acceptedJudgeTokens = judged.usage.totalTokens;
        break;
      }
      await input.store.updateReport(report.id, nowPatch("writing"));
      await input.store.updateJob(input.job.id, { step: "writing" });
      const chain = await runReportWriterChain({ payload, failureContext: judged.result.findings.map((finding) => JSON.stringify(finding)), callModel: authorizedCall });
      await input.store.updateReport(report.id, nowPatch("validating"));
      await input.store.updateJob(input.job.id, { step: "validating" });
      const validation = validateReportDraft(chain.revised, payload);
      const factLock = verifyReportFactLock(chain.revised, payload.frozenFacts);
      if (validation.length || !factLock.passed) throw new Error(`Judge-driven revision failed hard validators for ${unitId}.`);
      draft = chain.revised;
      acceptedChainTokens = totalTokens(chain.calls);
    }
    if (!judged || judged.result.verdict !== "pass") throw new Error(`Judge attempt cap exhausted for ${unitId}.`);
    tokenCount += acceptedChainTokens + acceptedJudgeTokens;
    judgeScores.push({ unitId, result: judged.result });
    await input.store.saveUnit(report, unitId, draft, {
      fulfillmentPassed: true, validatorResults, judge: judged.result, promptVersions,
      factsHash: report.facts_hash, attemptCounts: { validator: validatorAttempts, judge: judgeAttempts }
    });
    await input.store.updateReport(report.id, {
      token_count: tokenCount,
      attempt_counts: { validator: validatorAttempts, judge: judgeAttempts }
    });
  }

  const publicationStatus = config.autoPublishEnabled ? "live" : "needs_review";
  await input.store.updateReport(report.id, {
    ...nowPatch(publicationStatus), status: publicationStatus, prompt_versions: promptVersions,
    judge_scores: judgeScores, token_count: tokenCount,
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
      const result = await mail.sendReportReady({ reportId: report.id, userId: report.user_id, reportUrl: reportUrl(`/reports/${report.id}`) });
      await input.store.recordDelivery(report.id, {
        provider: result.provider,
        provider_message_id: result.messageId ?? null,
        status: result.mode === "sent" ? "sent" : "queued",
        payload: result.payload,
        ...(result.mode === "sent" ? { sent_at: new Date().toISOString() } : {})
      });
    } catch (error) {
      await input.store.recordDelivery(report.id, { provider: "unconfigured", status: "failed", error: error instanceof Error ? error.message : "Mail delivery failed." });
    }
  }
  return { status: publicationStatus, tokenCount, tokenCountTotal, estimatedCostUsd: estimatedCostTotal, judgeScores };
}

export async function runReportFulfillmentBatch(input: {
  workerId: string;
  store: ReportFulfillmentStore;
  calculateFacts: ReportFactsCalculator;
  callModel?: ReportModelCall;
  judgeCall?: ReportJudgeCall;
  mail?: ReportMailProvider;
  jobId?: string;
}) {
  const config = reportFulfillmentConfig();
  if (config.workerPaused || await input.store.workerPaused()) return { paused: true, processed: [] };
  const jobs = input.jobId
    ? await input.store.claimJob(input.workerId, input.jobId)
    : await input.store.claimJobs(input.workerId, config.workerBatchSize);
  const processed = [];
  for (const job of jobs) {
    try {
      processed.push({ jobId: job.id, result: await processReportFulfillmentJob({ ...input, job }) });
    } catch (error) {
      const report = await input.store.report(job.report_id);
      const message = error instanceof Error ? error.message : "Unknown fulfillment failure.";
      const birthDataFailure = error instanceof ReportBirthDataError || /^BIRTH_DATA_(?:MISSING|INVALID):/u.test(message);
      const clientFailure = error instanceof ReportCalculationApiClientError || /^CALCULATION_API_CLIENT_ERROR:/u.test(message);
      const terminal = birthDataFailure || clientFailure || /REPORT_CALL_AUTHORIZATION_REQUIRED|REPORT_DOMAIN_PROMPT_PENDING|CALCULATION_API_PREFLIGHT_FAILED|SOURCE_GAP|attempt cap exhausted|token budget exceeded|birth data is unavailable|lost its report or entitlement|facts bundle/iu.test(message);
      const retryable = message.startsWith("FACTS_PENDING:") || (!terminal && job.attempt < config.jobAttemptCap);
      if (report) {
        await input.store.updateReport(report.id, {
          ...nowPatch(birthDataFailure ? "awaiting_birth_data" : retryable ? report.fulfillment_status : "exception"),
          failure_history: failures(report.failure_history ?? [], job.step, message)
        });
      }
      if (birthDataFailure) await input.store.updateEntitlement(job.entitlement_id, { status: "awaiting_birth_data" });
      await input.store.updateJob(job.id, birthDataFailure ? {
        state: "paused", last_error: message, locked_at: null, locked_by: null
      } : retryable ? {
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
