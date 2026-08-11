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
import {
  runReportRedundancyPass,
  validateAssembledReport,
  type AssembledReportUnit,
  type ReportAssemblyIssue
} from "./report-assembly.js";
import { callReportModel, type ReportModelCall } from "./report-model-client.js";
import { estimateReportModelCost } from "./report-model-pricing.js";
import {
  reportValidationIssuesToNamedDefects,
  reviseReportDraftForNamedDefects,
  runReportWriterChain
} from "./report-writer-chain.js";
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

export function reportValidatorAttemptCap(
  job: Pick<FulfillmentJobRow, "validator_attempt_overrides">,
  unitId: string,
  fallback: number
) {
  const configured = job.validator_attempt_overrides?.[unitId];
  return typeof configured === "number" && Number.isInteger(configured) && configured >= 1
    ? configured
    : fallback;
}

function nowPatch(status: string) {
  return { fulfillment_status: status };
}

function failures(existing: unknown[], stage: string, values: unknown) {
  return [...existing, { stage, at: new Date().toISOString(), values }];
}

type PassingUnitCacheEntry = {
  schema: "report-passing-unit-cache.v1";
  unitId: string;
  draft: ReportDraft;
  sourceSnapshot: {
    fulfillmentPassed: true;
    validatorResults: unknown[];
    judge: ReportJudgeResult;
    promptVersions: Record<string, unknown>;
    factsHash: string | null;
    attemptCounts: { validator: number; judge: number };
  };
  reportTokenCountAfter: number;
};

export type ReportPersistenceRetryOptions = {
  attempts?: number;
  baseDelayMs?: number;
  sleep?: (milliseconds: number) => Promise<void>;
};

export type ReportWorkerContinuationPolicy = {
  deadlineAtMs: number;
  maxNewUnits: number;
  now?: () => number;
};

export class ReportPersistenceInfrastructureError extends Error {
  constructor(unitId: string, attempts: number, cause: unknown) {
    const message = cause instanceof Error ? cause.message : String(cause);
    super(`REPORT_INFRASTRUCTURE_ERROR: persistence failed for gated unit ${unitId} after ${attempts} attempts: ${message}`);
    this.name = "ReportPersistenceInfrastructureError";
  }
}

export class ReportAssemblyRegenerationRequired extends Error {
  readonly issues: ReportAssemblyIssue[];

  constructor(issues: ReportAssemblyIssue[]) {
    super(`REPORT_ASSEMBLY_REGENERATION_REQUIRED: ${JSON.stringify(issues)}`);
    this.name = "ReportAssemblyRegenerationRequired";
    this.issues = issues;
  }
}

function parsedPassingUnitCache(value: unknown): Record<string, PassingUnitCacheEntry> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return Object.fromEntries(Object.entries(value as Record<string, unknown>).filter(([, entry]) => (
    entry && typeof entry === "object"
    && (entry as { schema?: unknown }).schema === "report-passing-unit-cache.v1"
    && typeof (entry as { unitId?: unknown }).unitId === "string"
  ))) as Record<string, PassingUnitCacheEntry>;
}

async function withPersistenceBackoff(
  unitId: string,
  operation: () => Promise<void>,
  options: ReportPersistenceRetryOptions = {}
) {
  const attempts = Math.max(1, options.attempts ?? 3);
  const baseDelayMs = Math.max(0, options.baseDelayMs ?? 250);
  const sleep = options.sleep ?? ((milliseconds: number) => new Promise<void>((resolve) => setTimeout(resolve, milliseconds)));
  let lastError: unknown;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      await operation();
      return;
    } catch (error) {
      lastError = error;
      if (attempt < attempts) await sleep(baseDelayMs * 2 ** (attempt - 1));
    }
  }
  throw new ReportPersistenceInfrastructureError(unitId, attempts, lastError);
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
  persistenceRetry?: ReportPersistenceRetryOptions;
  continuationPolicy?: ReportWorkerContinuationPolicy;
}) {
  const config = reportFulfillmentConfig();
  const report = await input.store.report(input.job.report_id);
  const entitlement = await input.store.entitlement(input.job.entitlement_id);
  if (!report || !entitlement) throw new Error("Fulfillment job lost its report or entitlement.");
  if (entitlement.status !== "active") {
    await input.store.updateJob(input.job.id, { state: "cancelled", last_error: `Entitlement is ${entitlement.status}.` });
    return { status: "cancelled" };
  }
  if (!input.job.authorization_token || !input.job.authorized_call_budget || !input.job.authorized_token_budget) {
    throw new Error("REPORT_CALL_AUTHORIZATION_REQUIRED: fulfillment has no owner-issued call budget.");
  }
  let tokenCountTotal = report.token_count_total ?? 0;
  let authorizationTokenCount = input.job.authorization_token_count ?? 0;
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
      authorizationTokenCount += result.usage.totalTokens;
      estimatedCostTotal = Number((estimatedCostTotal + estimatedCostUsd).toFixed(6));
      const lifetimeTokenBudget = report.token_budget_lifetime ?? config.reportLifetimeTokenBudget;
      assertReportTokenBudgets({
        authorizationTokenCount,
        authorizationTokenBudget: input.job.authorized_token_budget,
        lifetimeTokenCount: tokenCountTotal,
        lifetimeTokenBudget
      });
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
  let redundancyAttempts = report.attempt_counts?.redundancy ?? 0;
  const passingUnitCache = parsedPassingUnitCache(input.job.passing_unit_cache);
  let generatedUnitsThisCycle = 0;

  const requeueForContinuation = async () => {
    const continuedAt = new Date((input.continuationPolicy?.now ?? Date.now)()).toISOString();
    await input.store.updateReport(report.id, nowPatch("writing"));
    await input.store.updateJob(input.job.id, {
      state: "queued",
      step: "writing",
      run_after: continuedAt,
      locked_at: null,
      locked_by: null,
      last_error: null
    });
    return {
      status: "queued" as const,
      continuation: true,
      tokenCount,
      tokenCountTotal,
      estimatedCostUsd: estimatedCostTotal,
      judgeScores
    };
  };

  const persistPassingUnit = async (entry: PassingUnitCacheEntry) => {
    const nextTokenCount = Math.max(tokenCount, entry.reportTokenCountAfter);
    const nextValidatorAttempts = Math.max(validatorAttempts, entry.sourceSnapshot.attemptCounts.validator);
    const nextJudgeAttempts = Math.max(judgeAttempts, entry.sourceSnapshot.attemptCounts.judge);
    const remainingCache = { ...passingUnitCache };
    delete remainingCache[entry.unitId];
    await withPersistenceBackoff(entry.unitId, async () => {
      await input.store.saveUnit(report, entry.unitId, entry.draft, entry.sourceSnapshot);
      await input.store.updateReport(report.id, {
        token_count: nextTokenCount,
        attempt_counts: { validator: nextValidatorAttempts, judge: nextJudgeAttempts }
      });
      await input.store.updateJob(input.job.id, { passing_unit_cache: remainingCache });
    }, input.persistenceRetry);
    tokenCount = nextTokenCount;
    validatorAttempts = nextValidatorAttempts;
    judgeAttempts = nextJudgeAttempts;
    delete passingUnitCache[entry.unitId];
    validatorSummary.push({
      unitId: entry.unitId,
      passed: true,
      issues: Array.isArray(entry.sourceSnapshot.validatorResults) ? entry.sourceSnapshot.validatorResults : []
    });
    judgeScores.push({ unitId: entry.unitId, result: entry.sourceSnapshot.judge });
    Object.assign(promptVersions, entry.sourceSnapshot.promptVersions);
  };

  for (const unitId of fulfillmentUnitIds(report.report_domain, report.report_horizon)) {
    const cachedPassingUnit = passingUnitCache[unitId];
    if (cachedPassingUnit) {
      await input.store.updateJob(input.job.id, { step: "delivery" });
      await persistPassingUnit(cachedPassingUnit);
      continue;
    }
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
    if (input.continuationPolicy) {
      const now = input.continuationPolicy.now ?? Date.now;
      const unitLimitReached = generatedUnitsThisCycle >= Math.max(1, input.continuationPolicy.maxNewUnits);
      const deadlineReached = now() >= input.continuationPolicy.deadlineAtMs;
      if (unitLimitReached || deadlineReached) return requeueForContinuation();
    }
    await input.store.updateJob(input.job.id, { step: "writing" });
    const payload = assembleReportGenerationPayload({ reportId: report.id, reportDomain: report.report_domain, reportHorizon: report.report_horizon, unitId, frozenFacts: report.facts });
    if (payload.sourceGaps.length) throw new Error(`SOURCE_GAP: ${payload.sourceGaps.map((gap) => gap.requestedKey).join(", ")}`);
    const versions = reportSystemPromptVersions(payload.canonicalOwnerPrompt.sourcePath);
    promptVersions.canonical = versions.canonical.version;
    promptVersions.critique = versions.critique.version;
    promptVersions.judge = versions.judge.version;
    promptVersions.noCleverness = versions.noCleverness.version;
    promptVersions.ownerReviewEvidence = versions.ownerReviewEvidence.version;
    const validatorAttemptCap = reportValidatorAttemptCap(input.job, unitId, config.validatorAttemptCap);
    const validateWithNamedRevisions = async (initialDraft: ReportDraft, initialChainTokens: number) => {
      let candidate = initialDraft;
      let acceptedTokens = initialChainTokens;
      let issues: Array<{ code: string; message: string; severity?: "error" | "warning"; value?: string }> = [];
      for (let attempt = 0; attempt < validatorAttemptCap; attempt += 1) {
        await input.store.updateReport(report.id, nowPatch("validating"));
        await input.store.updateJob(input.job.id, { step: "validating" });
        validatorAttempts += 1;
        const validation = validateReportDraft(candidate, payload);
        const factLock = verifyReportFactLock(candidate, payload.frozenFacts);
        issues = [...validation, ...factLock.issues];
        if (issues.length === 0) return { draft: candidate, acceptedTokens, issues };
        if (attempt + 1 >= validatorAttemptCap) break;
        const defects = reportValidationIssuesToNamedDefects(candidate, issues);
        if (!defects.length) break;
        await input.store.updateReport(report.id, nowPatch("writing"));
        await input.store.updateJob(input.job.id, { step: "writing" });
        const revision = await reviseReportDraftForNamedDefects({ payload, draft: candidate, defects, callModel: authorizedCall });
        candidate = revision.revised;
        acceptedTokens += totalTokens(revision.calls);
      }
      throw new Error(`Validator attempt cap exhausted for ${unitId}: ${JSON.stringify(issues)}`);
    };
    await input.store.updateReport(report.id, nowPatch("writing"));
    await input.store.updateJob(input.job.id, { step: "writing" });
    const assemblyFailureContext = Array.isArray((existing?.source_snapshot?.assemblyValidation as { issues?: unknown[] } | undefined)?.issues)
      ? (existing?.source_snapshot?.assemblyValidation as { issues: unknown[] }).issues.map((entry) => JSON.stringify(entry))
      : [];
    const initialChain = await runReportWriterChain({
      payload,
      failureContext: assemblyFailureContext.length ? assemblyFailureContext : undefined,
      callModel: authorizedCall
    });
    const initialValidation = await validateWithNamedRevisions(initialChain.revised, totalTokens(initialChain.calls));
    let draft = initialValidation.draft;
    let acceptedChainTokens = initialValidation.acceptedTokens;
    let validatorResults: unknown[] = initialValidation.issues;
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
      const judgeRevisionValidation = await validateWithNamedRevisions(chain.revised, totalTokens(chain.calls));
      draft = judgeRevisionValidation.draft;
      acceptedChainTokens = judgeRevisionValidation.acceptedTokens;
      validatorResults = judgeRevisionValidation.issues;
    }
    if (!judged || judged.result.verdict !== "pass") throw new Error(`Judge attempt cap exhausted for ${unitId}.`);
    const sourceSnapshot: PassingUnitCacheEntry["sourceSnapshot"] = {
      fulfillmentPassed: true, validatorResults, judge: judged.result, promptVersions,
      factsHash: report.facts_hash, attemptCounts: { validator: validatorAttempts, judge: judgeAttempts }
    };
    const passingUnit: PassingUnitCacheEntry = {
      schema: "report-passing-unit-cache.v1",
      unitId,
      draft,
      sourceSnapshot,
      reportTokenCountAfter: tokenCount + acceptedChainTokens + acceptedJudgeTokens
    };
    passingUnitCache[unitId] = passingUnit;
    await withPersistenceBackoff(unitId, async () => {
      await input.store.updateJob(input.job.id, { step: "delivery", passing_unit_cache: passingUnitCache });
    }, input.persistenceRetry);
    await persistPassingUnit(passingUnit);
    generatedUnitsThisCycle += 1;
  }

  const orderedUnitIds = [...fulfillmentUnitIds(report.report_domain, report.report_horizon)];
  const unitRows = await input.store.unitRows(report.id);
  const unitById = new Map(unitRows.map((row) => [row.content_key.replace(`report:${report.id}:`, ""), row]));
  const assembledUnits: AssembledReportUnit[] = orderedUnitIds.map((unitId) => {
    const row = unitById.get(unitId);
    if (!row) throw new Error(`REPORT_ASSEMBLY_INCOMPLETE: missing persisted unit '${unitId}'.`);
    return {
      unitId,
      draft: {
        headline: row.headline,
        summary: row.summary,
        body: row.body,
        sections: Array.isArray(row.sections) ? row.sections as Array<{ heading?: string; body?: string }> : []
      }
    };
  });
  const invalidateAssemblyUnits = async (issues: ReportAssemblyIssue[]) => {
    const byUnit = new Map<string, ReportAssemblyIssue[]>();
    for (const entry of issues) byUnit.set(entry.unitId, [...(byUnit.get(entry.unitId) ?? []), entry]);
    for (const [unitId, unitIssues] of byUnit) {
      const row = unitById.get(unitId);
      const assembled = assembledUnits.find((unit) => unit.unitId === unitId);
      if (!row || !assembled) continue;
      await input.store.saveUnit(report, unitId, assembled.draft, {
        ...row.source_snapshot,
        fulfillmentPassed: false,
        assemblyValidation: { passed: false, issues: unitIssues }
      });
    }
    await input.store.updateReport(report.id, {
      ...nowPatch("writing"),
      token_count: tokenCount,
      token_count_total: tokenCountTotal,
      token_spend_usd_estimate: estimatedCostTotal,
      attempt_counts: { validator: validatorAttempts, judge: judgeAttempts, redundancy: redundancyAttempts }
    });
  };
  const structuralIssues = validateAssembledReport(assembledUnits);
  if (structuralIssues.length) {
    await invalidateAssemblyUnits(structuralIssues);
    throw new ReportAssemblyRegenerationRequired(structuralIssues);
  }

  await input.store.updateReport(report.id, nowPatch("validating"));
  await input.store.updateJob(input.job.id, { step: "validating" });
  redundancyAttempts += 1;
  const reportPayload = assembleReportGenerationPayload({
    reportId: report.id,
    reportDomain: report.report_domain,
    reportHorizon: report.report_horizon,
    unitId: orderedUnitIds[0],
    frozenFacts: report.facts
  });
  const redundancy = await runReportRedundancyPass({ units: assembledUnits, payload: reportPayload, callModel: authorizedCall });
  tokenCount += redundancy.usage.totalTokens;
  promptVersions.redundancy = redundancy.promptVersion;
  if (redundancy.findings.length) {
    const redundancyIssues: ReportAssemblyIssue[] = redundancy.findings.map((finding) => ({
      code: `report_${finding.category}`,
      message: finding.evidence,
      severity: "error",
      unitId: finding.unit_id,
      relatedUnitIds: finding.related_unit_ids,
      location: finding.location,
      sentenceIndex: finding.sentence_index,
      scopeStart: finding.scope_start,
      scopeEnd: finding.scope_end,
      quote: finding.quote
    }));
    await invalidateAssemblyUnits(redundancyIssues);
    throw new ReportAssemblyRegenerationRequired(redundancyIssues);
  }

  const publicationStatus = config.autoPublishEnabled ? "live" : "needs_review";
  await input.store.updateReport(report.id, {
    ...nowPatch(publicationStatus), status: publicationStatus, prompt_versions: promptVersions,
    judge_scores: judgeScores, token_count: tokenCount,
    validator_results: validatorSummary,
    attempt_counts: { validator: validatorAttempts, judge: judgeAttempts, redundancy: redundancyAttempts },
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

export function assertReportTokenBudgets(input: {
  authorizationTokenCount: number;
  authorizationTokenBudget: number;
  lifetimeTokenCount: number;
  lifetimeTokenBudget: number;
}) {
  if (input.authorizationTokenCount > input.authorizationTokenBudget) {
    throw new Error(`Authorization token budget exceeded (${input.authorizationTokenCount}/${input.authorizationTokenBudget}).`);
  }
  if (input.lifetimeTokenCount > input.lifetimeTokenBudget) {
    throw new Error(`Report lifetime token budget exceeded (${input.lifetimeTokenCount}/${input.lifetimeTokenBudget}).`);
  }
}

export async function runReportFulfillmentBatch(input: {
  workerId: string;
  store: ReportFulfillmentStore;
  calculateFacts: ReportFactsCalculator;
  callModel?: ReportModelCall;
  judgeCall?: ReportJudgeCall;
  mail?: ReportMailProvider;
  jobId?: string;
  persistenceRetry?: ReportPersistenceRetryOptions;
  continuationPolicy?: ReportWorkerContinuationPolicy;
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
      const persistenceInfrastructureFailure = error instanceof ReportPersistenceInfrastructureError || /^REPORT_INFRASTRUCTURE_ERROR: persistence/u.test(message);
      const assemblyRegeneration = error instanceof ReportAssemblyRegenerationRequired || /^REPORT_ASSEMBLY_REGENERATION_REQUIRED:/u.test(message);
      const terminal = birthDataFailure || clientFailure || /REPORT_CALL_AUTHORIZATION_REQUIRED|REPORT_DOMAIN_PROMPT_PENDING|CALCULATION_API_PREFLIGHT_FAILED|SOURCE_GAP|attempt cap exhausted|token budget exceeded|birth data is unavailable|lost its report or entitlement|facts bundle/iu.test(message);
      const retryable = persistenceInfrastructureFailure || assemblyRegeneration
        ? job.attempt < config.jobAttemptCap
        : message.startsWith("FACTS_PENDING:") || (!terminal && job.attempt < config.jobAttemptCap);
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
      processed.push({
        jobId: job.id,
        error: message,
        retryable,
        failureClass: persistenceInfrastructureFailure ? "infrastructure_persistence" : assemblyRegeneration ? "assembly_regeneration" : birthDataFailure ? "birth_data" : clientFailure ? "calculation_client" : "runtime"
      });
    }
  }
  return { paused: false, processed };
}
