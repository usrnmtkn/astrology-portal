import crypto from "node:crypto";
import { createTldrAstroReportFactsClient, ReportCalculationApiClientError, type ReportChartSubject } from "./report-facts.js";
import { reportFulfillmentConfig } from "./report-fulfillment-config.js";
import type { ReportFulfillmentStore, FulfillmentJobRow, FulfillmentReportRow, ReportModelCallTimingRow } from "./report-fulfillment-store.ts";
import { verifyReportFactLock } from "./report-fact-lock.js";
import { judgeReportUnit, type ReportJudgeResult } from "./report-judge.js";
import { createReportMailProvider, type ReportMailProvider } from "./report-mail.js";
import {
  assertReportDomainFulfillmentReady,
  assembleReportGenerationPayload,
  isReportSynthesisUnit,
  reportFactors,
  validateReportDraft,
  type ReportDomain,
  type ReportDraft,
  type ReportHorizon
} from "./report-generation.js";
import { reportSystemPromptVersions, type ReportPromptMode } from "./report-prompt-versions.js";
import {
  deduplicateAssembledReport,
  detectPostDedupCoherenceScopes,
  normalizeAssembledReportWhitespace,
  repairMechanicalPostDedupSeams,
  validateReportKeyDateFormat,
  validateAssembledReport,
  type AssembledReportUnit,
  type ReportAssemblyIssue
} from "./report-assembly.js";
import {
  callReportModel,
  ReportModelResponseRejectedError,
  type ReportModelCall,
  withReportModelResponseRetries
} from "./report-model-client.js";
import { estimateReportModelCost } from "./report-model-pricing.js";
import {
  reportValidationIssuesToNamedDefects,
  reviseReportDraftForNamedDefects,
  runReportWriterChain,
  type ReportWriterChainCheckpoint
} from "./report-writer-chain.js";
import { createSupabaseReportAdmin, type SupabaseReportAdmin } from "./supabase-report-admin.js";
import { natalPointLongitudesFromChart, ReportBirthDataError, requireReportBirthProfile, type BirthProfile } from "./report-billing-window.js";
import { reportUrl } from "./report-http.js";
import {
  assembleDeterministicReportKeyDates,
  filterReportKeyDateAssemblyEligibility,
  reportKeyDateEventManifest,
  reportKeyDateSourceUnitIds
} from "./report-key-dates.js";

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

function totalEstimatedCost(calls: Array<{ model: string; usage: { inputTokens: number; cachedInputTokens?: number; outputTokens: number; totalTokens: number } }>) {
  return calls.reduce((sum, call) => sum + estimateReportModelCost(call.model, call.usage), 0);
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
    writerReviews: Array<{ critique: unknown; coldCritique: unknown }>;
    keyDateEntries?: Array<{ eventId: string; title: string; sentence: string }>;
    keyDateEligibleEventIds?: string[];
    keyDateInterpretedEventIds?: string[];
    promptVersions: Record<string, unknown>;
    factsHash: string | null;
    attemptCounts: { validator: number; judge: number };
    /** Accepted-work and retry economics for this unit's successful attempt.
     * Earlier failed job attempts remain immutable in the call ledger. */
    tokenAccounting?: {
      acceptedTokens: number;
      totalTokens: number;
      retryTokens: number;
      estimatedUsd: number;
      acceptedEstimatedUsd: number;
      retryEstimatedUsd: number;
    };
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
  runtimeDeadlineAtMs?: number;
  maxNewUnits: number;
  now?: () => number;
};

export type ReportCallDurationEstimate = {
  samples: number;
  estimateMs: number;
};

export function reportCallDurationEstimates(
  rows: ReportModelCallTimingRow[],
  defaultEstimateMs: number
): Record<string, ReportCallDurationEstimate> {
  const estimates: Record<string, ReportCallDurationEstimate> = {};
  for (const row of rows) {
    const startedAt = Date.parse(row.created_at);
    const completedAt = Date.parse(row.completed_at);
    if (!row.schema_name || !Number.isFinite(startedAt) || !Number.isFinite(completedAt) || completedAt < startedAt) continue;
    const durationMs = Math.max(1, completedAt - startedAt);
    const current = estimates[row.schema_name];
    estimates[row.schema_name] = {
      samples: (current?.samples ?? 0) + 1,
      // The longest completed observation is intentionally conservative. The
      // separate safety margin absorbs additional provider/runtime variance.
      estimateMs: Math.max(current?.estimateMs ?? 0, durationMs)
    };
  }
  estimates.__default__ = { samples: 0, estimateMs: Math.max(1, defaultEstimateMs) };
  return estimates;
}

export class ReportWorkerDeadlineYield extends Error {
  constructor(
    readonly schemaName: string,
    readonly remainingMs: number,
    readonly estimatedCallMs: number,
    readonly safetyMarginMs: number
  ) {
    super(`REPORT_WORKER_DEADLINE_YIELD: ${schemaName} requires ${estimatedCallMs}+${safetyMarginMs}ms but only ${remainingMs}ms remain.`);
    this.name = "ReportWorkerDeadlineYield";
  }
}

function deadlineYieldFrom(error: unknown): ReportWorkerDeadlineYield | null {
  let current: unknown = error;
  for (let depth = 0; depth < 4 && current; depth += 1) {
    if (current instanceof ReportWorkerDeadlineYield) return current;
    current = current instanceof Error ? current.cause : null;
  }
  return null;
}

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

const WRITER_CHAIN_CHECKPOINT_KEY = "__writer_chain_checkpoint";

function parsedWriterChainCheckpoint(value: unknown): ReportWriterChainCheckpoint | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const entry = (value as Record<string, unknown>)[WRITER_CHAIN_CHECKPOINT_KEY];
  if (!entry || typeof entry !== "object" || Array.isArray(entry)) return null;
  const checkpoint = entry as Partial<ReportWriterChainCheckpoint>;
  return checkpoint.schema === "report-writer-chain-checkpoint.v1"
    && typeof checkpoint.chainKey === "string"
    && typeof checkpoint.unitId === "string"
    && typeof checkpoint.completedStage === "string"
    && checkpoint.draft !== null
    && typeof checkpoint.draft === "object"
    && Array.isArray(checkpoint.calls)
    ? checkpoint as ReportWriterChainCheckpoint
    : null;
}

function isAssemblyInvalidatedPassingSnapshot(snapshot: Record<string, unknown> | undefined) {
  if (!snapshot || snapshot.fulfillmentPassed !== false) return false;
  const assembly = snapshot.assemblyValidation;
  const judge = snapshot.judge;
  return Boolean(
    assembly && typeof assembly === "object"
    && Array.isArray((assembly as { issues?: unknown[] }).issues)
    && (assembly as { issues: unknown[] }).issues.length
    && judge && typeof judge === "object"
    && (judge as { verdict?: unknown }).verdict === "pass"
  );
}

function writerChainKey(payload: unknown, promptVersions: unknown, failureContext?: string[]) {
  return crypto.createHash("sha256").update(stableJson({
    payload,
    promptVersions,
    failureContext: failureContext ?? []
  })).digest("hex");
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
    const socialProfile = await admin.selectOne<{ natal_chart?: unknown }>("social_profiles", new URLSearchParams({ user_id: `eq.${report.user_id}`, select: "natal_chart" }));
    const socialAngles = natalPointLongitudesFromChart(socialProfile?.natal_chart);
    const prepared = {
      ...birth,
      natalPointLongitudes: Object.keys(socialAngles).length ? socialAngles : birth.natalPointLongitudes
    };
    preparedBirthProfiles.set(report.id, prepared);
    return prepared;
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
      client.reportWindow({ natalSubject, location: birth.birthLocation, reportDomain: report.report_domain, reportHorizon: report.report_horizon, start: report.period_start, end: report.period_end, natalPointLongitudes: birth.natalPointLongitudes })
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
  /** Legacy mode exists only for deterministic historical contracts. Owner-
   * approved Production fulfillment uses the active naturalness stack. */
  promptMode?: ReportPromptMode;
}) {
  const config = reportFulfillmentConfig();
  const promptMode = input.promptMode ?? "active";
  const report = await input.store.report(input.job.report_id);
  const entitlement = await input.store.entitlement(input.job.entitlement_id);
  if (!report || !entitlement) throw new Error("Fulfillment job lost its report or entitlement.");
  if (entitlement.status !== "active") {
    await input.store.updateJob(input.job.id, {
      state: "cancelled",
      last_error: `Entitlement is ${entitlement.status}.`,
      locked_at: null,
      locked_by: null,
      lease_expires_at: null
    });
    return { status: "cancelled" };
  }
  if (!input.job.authorization_token || !input.job.authorized_call_budget || !input.job.authorized_token_budget) {
    throw new Error("REPORT_CALL_AUTHORIZATION_REQUIRED: fulfillment has no owner-issued call budget.");
  }
  let tokenCountTotal = report.token_count_total ?? 0;
  let authorizationTokenCount = input.job.authorization_token_count ?? 0;
  let estimatedCostTotal = report.token_spend_usd_estimate ?? 0;
  const providerCall = withReportModelResponseRetries(input.callModel ?? callReportModel);
  const callClock = input.continuationPolicy?.now ?? Date.now;
  const callDurationEstimates = reportCallDurationEstimates(
    await input.store.callTimingHistory(input.job.id),
    config.workerCallDurationDefaultMs
  );
  let activeLedgerCallId: string | null = null;
  let activeCallStartedAtMs: number | null = null;
  let persistDeadlineYield: ((deadlineYield: ReportWorkerDeadlineYield) => Promise<void>) | null = null;
  const observeCallDuration = (schemaName: string) => {
    if (activeCallStartedAtMs === null) return;
    const durationMs = Math.max(1, callClock() - activeCallStartedAtMs);
    activeCallStartedAtMs = null;
    const current = callDurationEstimates[schemaName];
    callDurationEstimates[schemaName] = {
      samples: (current?.samples ?? 0) + 1,
      estimateMs: Math.max(current?.estimateMs ?? 0, durationMs)
    };
  };
  const authorizedCall: ReportModelCall = (modelInput) => providerCall({
    ...modelInput,
    beforeProviderCall: async (attempt) => {
      if (input.continuationPolicy) {
        const runtimeDeadlineAtMs = input.continuationPolicy.runtimeDeadlineAtMs ?? input.continuationPolicy.deadlineAtMs;
        const remainingMs = Math.max(0, runtimeDeadlineAtMs - callClock());
        const estimatedCallMs = (callDurationEstimates[attempt.schemaName] ?? callDurationEstimates.__default__).estimateMs;
        if (remainingMs < estimatedCallMs + config.workerCallSafetyMarginMs) {
          const deadlineYield = new ReportWorkerDeadlineYield(
            attempt.schemaName,
            remainingMs,
            estimatedCallMs,
            config.workerCallSafetyMarginMs
          );
          if (!persistDeadlineYield) throw deadlineYield;
          await persistDeadlineYield(deadlineYield);
          throw deadlineYield;
        }
      }
      activeCallStartedAtMs = callClock();
      await modelInput.beforeProviderCall?.(attempt);
      // Missing pricing is configuration failure and must be discovered before
      // an authorization is consumed or a provider request is sent.
      estimateReportModelCost(attempt.model, { inputTokens: 0, outputTokens: 0, totalTokens: 0 });
      const begun = await input.store.beginAuthorizedCall(input.job.id, input.job.authorization_token as string, attempt);
      activeLedgerCallId = begun.callId;
    },
    afterProviderCall: async (attempt, result) => {
      await modelInput.afterProviderCall?.(attempt, result);
      observeCallDuration(attempt.schemaName);
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
      observeCallDuration(attempt.schemaName);
      if (!activeLedgerCallId) return;
      const callId = activeLedgerCallId;
      activeLedgerCallId = null;
      const rejected = error instanceof ReportModelResponseRejectedError ? error : null;
      const estimatedCostUsd = rejected?.usage
        ? estimateReportModelCost(attempt.model, rejected.usage)
        : 0;
      await input.store.finishAuthorizedCall(callId, {
        state: "error",
        inputTokens: rejected?.usage?.inputTokens,
        cachedInputTokens: rejected?.usage?.cachedInputTokens,
        outputTokens: rejected?.usage?.outputTokens,
        totalTokens: rejected?.usage?.totalTokens,
        estimatedCostUsd,
        responseId: rejected?.responseId,
        error: error instanceof Error ? error.message : "Provider call failed."
      });
      if (rejected?.usage) {
        tokenCountTotal += rejected.usage.totalTokens;
        authorizationTokenCount += rejected.usage.totalTokens;
        estimatedCostTotal = Number((estimatedCostTotal + estimatedCostUsd).toFixed(6));
        const lifetimeTokenBudget = report.token_budget_lifetime ?? config.reportLifetimeTokenBudget;
        assertReportTokenBudgets({
          authorizationTokenCount,
          authorizationTokenBudget: input.job.authorized_token_budget,
          lifetimeTokenCount: tokenCountTotal,
          lifetimeTokenBudget
        });
      }
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
  const validatorSummary: Array<{
    unitId: string;
    passed: true;
    issues: unknown[];
    warnings?: unknown[];
    mechanicalRemovals?: unknown[];
  }> = [];
  let validatorAttempts = report.attempt_counts?.validator ?? 0;
  let judgeAttempts = report.attempt_counts?.judge ?? 0;
  let redundancyAttempts = report.attempt_counts?.redundancy ?? 0;
  const passingUnitCache = parsedPassingUnitCache(input.job.passing_unit_cache);
  let writerChainCheckpoint = parsedWriterChainCheckpoint(input.job.passing_unit_cache);
  let generatedUnitsThisCycle = 0;
  const orderedUnitIds = [...fulfillmentUnitIds(report.report_domain, report.report_horizon)];
  const writerUnitIds = orderedUnitIds.filter((unitId) => unitId !== "key-dates");
  const initialPersistedRows = promptMode === "active"
    ? await input.store.unitRows(report.id)
    : [];
  const persistedDrafts = new Map(initialPersistedRows.flatMap((row) => {
    if (row.source_snapshot?.fulfillmentPassed !== true && !isAssemblyInvalidatedPassingSnapshot(row.source_snapshot)) return [];
    const unitId = row.content_key.replace(`report:${report.id}:`, "");
    const renderMetadata = row.source_snapshot?.renderMetadata as { timing?: unknown } | undefined;
    return [[unitId, {
      headline: row.headline,
      summary: row.summary,
      body: row.body,
      timing: typeof renderMetadata?.timing === "string" ? renderMetadata.timing : "",
      sections: Array.isArray(row.sections) ? row.sections as Array<{ heading?: string; body?: string }> : []
    } satisfies ReportDraft] as const];
  }));

  const durableJobCache = () => ({
    ...passingUnitCache,
    ...(writerChainCheckpoint ? { [WRITER_CHAIN_CHECKPOINT_KEY]: writerChainCheckpoint } : {})
  });

  const requeueForContinuation = async () => {
    const continuedAt = new Date((input.continuationPolicy?.now ?? Date.now)()).toISOString();
    await input.store.updateReport(report.id, {
      ...nowPatch("writing"),
      token_count_total: tokenCountTotal,
      token_spend_usd_estimate: estimatedCostTotal
    });
    await input.store.updateJob(input.job.id, {
      state: "queued",
      step: "writing",
      run_after: continuedAt,
      locked_at: null,
      locked_by: null,
      lease_expires_at: null,
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

  persistDeadlineYield = async () => {
    await requeueForContinuation();
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
    persistedDrafts.set(entry.unitId, structuredClone(entry.draft));
    writerChainCheckpoint = null;
    validatorSummary.push({
      unitId: entry.unitId,
      passed: true,
      issues: Array.isArray(entry.sourceSnapshot.validatorResults) ? entry.sourceSnapshot.validatorResults : []
    });
    judgeScores.push({ unitId: entry.unitId, result: entry.sourceSnapshot.judge });
    Object.assign(promptVersions, entry.sourceSnapshot.promptVersions);
  };

  for (const unitId of writerUnitIds) {
    const cachedPassingUnit = passingUnitCache[unitId];
    if (cachedPassingUnit) {
      await input.store.updateJob(input.job.id, { step: "delivery" });
      await persistPassingUnit(cachedPassingUnit);
      continue;
    }
    const existing = await input.store.unit(report.id, unitId);
    if (existing?.source_snapshot?.fulfillmentPassed === true || isAssemblyInvalidatedPassingSnapshot(existing?.source_snapshot)) {
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
    const unitIndex = orderedUnitIds.indexOf(unitId);
    const priorUnitContext = promptMode === "active"
      ? orderedUnitIds.slice(0, unitIndex).flatMap((priorUnitId) => {
        const prior = persistedDrafts.get(priorUnitId);
        return prior ? [{
          unitId: priorUnitId,
          synthesis: isReportSynthesisUnit(priorUnitId),
          headline: prior.headline ?? "",
          summary: prior.summary ?? "",
          body: prior.body ?? "",
          sections: structuredClone(prior.sections ?? [])
        }] : [];
      })
      : [];
    const payload = assembleReportGenerationPayload({
      reportId: report.id,
      reportDomain: report.report_domain,
      reportHorizon: report.report_horizon,
      unitId,
      frozenFacts: report.facts,
      priorUnitContext
    });
    if (payload.sourceGaps.length) throw new Error(`SOURCE_GAP: ${payload.sourceGaps.map((gap) => gap.requestedKey).join(", ")}`);
    const versions = reportSystemPromptVersions(payload.canonicalOwnerPrompt.sourcePath, promptMode);
    promptVersions.canonical = versions.canonical.version;
    promptVersions.critique = versions.critique.version;
    promptVersions.judge = versions.judge.version;
    promptVersions.noCleverness = versions.noCleverness.version;
    promptVersions.ownerReviewEvidence = versions.ownerReviewEvidence.version;
    promptVersions.coldProse = versions.coldProse.version;
    promptVersions.earnedSentence = versions.earnedSentence.version;
    if ("naturalness" in versions) promptVersions.naturalness = versions.naturalness.version;
    const validatorAttemptCap = reportValidatorAttemptCap(input.job, unitId, config.validatorAttemptCap);
    let persistedCheckpointConsumed = false;
    const runCheckpointedWriterChain = async (failureContext?: string[], resumePersistedCheckpoint = false) => {
      // A checkpoint created by a judge-requested retry has a different key
      // from the unit's initial chain. After a worker yield, the judge findings
      // are no longer on the stack, so recomputing the initial key would discard
      // completed retry work. On the first chain entry for this unit, the
      // durable checkpoint is the source of truth regardless of which governed
      // failure context produced it.
      const persistedCheckpoint = resumePersistedCheckpoint
        && !persistedCheckpointConsumed
        && writerChainCheckpoint?.unitId === unitId
        ? writerChainCheckpoint
        : undefined;
      if (persistedCheckpoint) persistedCheckpointConsumed = true;
      const chainKey = persistedCheckpoint?.chainKey ?? writerChainKey(payload, versions, failureContext);
      const checkpoint = persistedCheckpoint ?? (
        writerChainCheckpoint?.chainKey === chainKey
          && writerChainCheckpoint.unitId === unitId
          ? writerChainCheckpoint
          : undefined
      );
      return runReportWriterChain({
        payload,
        failureContext,
        callModel: authorizedCall,
        chainKey,
        checkpoint,
        persistCheckpoint: async (nextCheckpoint) => {
          writerChainCheckpoint = nextCheckpoint;
          await withPersistenceBackoff(`${unitId}:${nextCheckpoint.completedStage}`, async () => {
            await input.store.updateJob(input.job.id, {
              step: "writing",
              passing_unit_cache: durableJobCache()
            });
          }, input.persistenceRetry);
        },
        promptMode
      });
    };
    const validateWithNamedRevisions = async (initialDraft: ReportDraft, initialChainTokens: number, initialChainCost: number) => {
      let candidate = initialDraft;
      let acceptedTokens = initialChainTokens;
      let acceptedEstimatedUsd = initialChainCost;
      let issues: Array<{ code: string; message: string; severity?: "error" | "warning"; value?: string }> = [];
      for (let attempt = 0; attempt < validatorAttemptCap; attempt += 1) {
        await input.store.updateReport(report.id, nowPatch("validating"));
        await input.store.updateJob(input.job.id, { step: "validating" });
        validatorAttempts += 1;
        const validation = validateReportDraft(candidate, payload, {
          enforceSeasonStructure: promptMode === "active"
        });
        const factLock = verifyReportFactLock(candidate, payload.frozenFacts, {
          trustedTiming: payload.structuralRequirements?.dateRange
        });
        issues = [...validation, ...factLock.issues];
        if (issues.length === 0) return { draft: candidate, acceptedTokens, acceptedEstimatedUsd, issues };
        if (attempt + 1 >= validatorAttemptCap) break;
        const defects = reportValidationIssuesToNamedDefects(candidate, issues);
        if (!defects.length) break;
        await input.store.updateReport(report.id, nowPatch("writing"));
        await input.store.updateJob(input.job.id, { step: "writing" });
        const revision = await reviseReportDraftForNamedDefects({
          payload, draft: candidate, defects, callModel: authorizedCall, promptMode
        });
        candidate = revision.revised;
        acceptedTokens += totalTokens(revision.calls);
        acceptedEstimatedUsd += totalEstimatedCost(revision.calls);
      }
      throw new Error(`Validator attempt cap exhausted for ${unitId}: ${JSON.stringify(issues)}`);
    };
    await input.store.updateReport(report.id, nowPatch("writing"));
    await input.store.updateJob(input.job.id, { step: "writing" });
    const assemblyFailureContext = Array.isArray((existing?.source_snapshot?.assemblyValidation as { issues?: unknown[] } | undefined)?.issues)
      ? (existing?.source_snapshot?.assemblyValidation as { issues: unknown[] }).issues.map((entry) => JSON.stringify(entry))
      : [];
    const unitTotalTokensBefore = tokenCountTotal;
    const unitEstimatedCostBefore = estimatedCostTotal;
    const initialChain = await runCheckpointedWriterChain(
      assemblyFailureContext.length ? assemblyFailureContext : undefined,
      true
    );
    const writerReviews: Array<{ critique: unknown; coldCritique: unknown }> = [{
      critique: initialChain.critique,
      coldCritique: initialChain.coldCritique
    }];
    const initialValidation = await validateWithNamedRevisions(
      initialChain.revised,
      totalTokens(initialChain.calls),
      totalEstimatedCost(initialChain.calls)
    );
    let draft = initialValidation.draft;
    let acceptedChainTokens = initialValidation.acceptedTokens;
    let acceptedChainEstimatedUsd = initialValidation.acceptedEstimatedUsd;
    let validatorResults: unknown[] = initialValidation.issues;
    await input.store.updateReport(report.id, nowPatch("judging"));
    await input.store.updateJob(input.job.id, { step: "judging" });
    let judged: Awaited<ReturnType<typeof judgeReportUnit>> | null = null;
    let acceptedJudgeTokens = 0;
    for (let attempt = 0; attempt < config.judgeAttemptCap; attempt += 1) {
      judgeAttempts += 1;
      judged = await (input.judgeCall ?? judgeReportUnit)({
        payload, draft, validatorResults, threshold: config.judgeThreshold, callModel: authorizedCall, promptMode
      });
      if (judged.result.verdict === "pass") {
        acceptedJudgeTokens = judged.usage.totalTokens;
        break;
      }
      await input.store.updateReport(report.id, nowPatch("writing"));
      await input.store.updateJob(input.job.id, { step: "writing" });
      const chain = await runCheckpointedWriterChain(
        judged.result.findings.map((finding) => JSON.stringify(finding))
      );
      writerReviews.push({ critique: chain.critique, coldCritique: chain.coldCritique });
      const judgeRevisionValidation = await validateWithNamedRevisions(
        chain.revised,
        totalTokens(chain.calls),
        totalEstimatedCost(chain.calls)
      );
      draft = judgeRevisionValidation.draft;
      acceptedChainTokens = judgeRevisionValidation.acceptedTokens;
      acceptedChainEstimatedUsd = judgeRevisionValidation.acceptedEstimatedUsd;
      validatorResults = judgeRevisionValidation.issues;
    }
    if (!judged || judged.result.verdict !== "pass") throw new Error(`Judge attempt cap exhausted for ${unitId}.`);
    const unitAcceptedTokens = acceptedChainTokens + acceptedJudgeTokens;
    const unitAcceptedEstimatedUsd = acceptedChainEstimatedUsd
      + estimateReportModelCost(judged.model, judged.usage);
    // Production judges use the authorized provider wrapper and therefore
    // appear in the immutable ledger delta. Test/provider adapters may return
    // judge usage directly, so never report fewer total tokens than accepted.
    const unitTotalTokens = Math.max(unitAcceptedTokens, tokenCountTotal - unitTotalTokensBefore);
    const unitEstimatedUsd = Math.max(unitAcceptedEstimatedUsd, estimatedCostTotal - unitEstimatedCostBefore);
    const sourceSnapshot: PassingUnitCacheEntry["sourceSnapshot"] = {
      fulfillmentPassed: true, validatorResults, judge: judged.result, promptVersions,
      writerReviews,
      keyDateEntries: draft.keyDates ?? [],
      keyDateEligibleEventIds: payload.keyDateRequirements.map((event) => event.eventId),
      keyDateInterpretedEventIds: (draft.keyDates ?? []).map((event) => event.eventId),
      factsHash: report.facts_hash, attemptCounts: { validator: validatorAttempts, judge: judgeAttempts },
      tokenAccounting: {
        acceptedTokens: unitAcceptedTokens,
        totalTokens: unitTotalTokens,
        retryTokens: Math.max(0, unitTotalTokens - unitAcceptedTokens),
        estimatedUsd: Number(unitEstimatedUsd.toFixed(6)),
        acceptedEstimatedUsd: Number(unitAcceptedEstimatedUsd.toFixed(6)),
        retryEstimatedUsd: Number(Math.max(0, unitEstimatedUsd - unitAcceptedEstimatedUsd).toFixed(6))
      }
    };
    const passingUnit: PassingUnitCacheEntry = {
      schema: "report-passing-unit-cache.v1",
      unitId,
      draft,
      sourceSnapshot,
      reportTokenCountAfter: tokenCount + unitAcceptedTokens
    };
    passingUnitCache[unitId] = passingUnit;
    writerChainCheckpoint = null;
    await withPersistenceBackoff(unitId, async () => {
      await input.store.updateJob(input.job.id, { step: "delivery", passing_unit_cache: passingUnitCache });
    }, input.persistenceRetry);
    await persistPassingUnit(passingUnit);
    generatedUnitsThisCycle += 1;
  }

  if (orderedUnitIds.includes("key-dates")) {
    const existingKeyDates = await input.store.unit(report.id, "key-dates");
    if (existingKeyDates?.source_snapshot?.fulfillmentPassed === true
      && (existingKeyDates.source_snapshot.deterministicAssembly as { schema?: unknown } | undefined)?.schema === "report-key-dates-assembly.v4") {
      const snapshot = existingKeyDates.source_snapshot;
      validatorSummary.push({
        unitId: "key-dates",
        passed: true,
        issues: Array.isArray(snapshot.validatorResults) ? snapshot.validatorResults : []
      });
      if (snapshot.promptVersions && typeof snapshot.promptVersions === "object") {
        Object.assign(promptVersions, snapshot.promptVersions);
      }
    } else {
      const sourceRows = await input.store.unitRows(report.id);
      const sourceUnitIds = new Set(reportKeyDateSourceUnitIds(report.report_horizon));
      const storedSourceUnits = sourceRows.flatMap((row) => {
        const unitId = row.content_key.replace(`report:${report.id}:`, "");
        if (!sourceUnitIds.has(unitId) || row.source_snapshot?.fulfillmentPassed !== true) return [];
        return [{
          unitId,
          draft: {
            headline: row.headline,
            summary: row.summary,
            body: row.body,
            timing: typeof (row.source_snapshot?.renderMetadata as { timing?: unknown } | undefined)?.timing === "string"
              ? (row.source_snapshot.renderMetadata as { timing: string }).timing
              : "",
            sections: Array.isArray(row.sections) ? row.sections as Array<{ heading?: string; body?: string }> : [],
            keyDates: Array.isArray(row.source_snapshot?.keyDateEntries)
              ? row.source_snapshot.keyDateEntries as Array<{ eventId: string; title: string; sentence: string }>
              : []
          }
        }];
      });
      const storedEligibleEventIds = sourceRows.flatMap((row) => Array.isArray(row.source_snapshot?.keyDateEligibleEventIds)
        ? row.source_snapshot.keyDateEligibleEventIds as string[] : []);
      const storedInterpretedEventIds = sourceRows.flatMap((row) => Array.isArray(row.source_snapshot?.keyDateInterpretedEventIds)
        ? row.source_snapshot.keyDateInterpretedEventIds as string[] : []);
      const canonicalEligibleEventIds = reportKeyDateEventManifest(
        report.facts,
        report.report_horizon,
        reportFactors(report.facts).map((factor) => factor.id)
      ).map((event) => event.eventId);
      const { sourceUnits, eligibleEventIds, interpretedEventIds } = filterReportKeyDateAssemblyEligibility({
        sourceUnits: storedSourceUnits,
        eligibleEventIds: storedEligibleEventIds,
        interpretedEventIds: storedInterpretedEventIds,
        canonicalEligibleEventIds
      });
      const keyDatesDraft = assembleDeterministicReportKeyDates({
        reportHorizon: report.report_horizon,
        frozenFacts: report.facts,
        sourceUnits,
        eligibleEventIds,
        interpretedEventIds
      });
      const formatIssues = validateReportKeyDateFormat(keyDatesDraft, sourceUnits);
      const factLock = verifyReportFactLock(keyDatesDraft, report.facts);
      const keyDateIssues = [...formatIssues, ...factLock.issues];
      if (keyDateIssues.length) {
        throw new Error(`REPORT_KEY_DATES_FORMAT_CONTRACT: ${JSON.stringify(keyDateIssues)}`);
      }
      writerChainCheckpoint = null;
      await withPersistenceBackoff("key-dates", async () => {
        await input.store.saveUnit(report, "key-dates", keyDatesDraft, {
          fulfillmentPassed: true,
          deterministicAssembly: {
            schema: "report-key-dates-assembly.v4",
            sourceUnitIds: sourceUnits.map((unit) => unit.unitId),
            writerChainSkipped: true,
            coldReadSkipped: true,
            judgeSkipped: true,
            formatContractValidated: true
          },
          validatorResults: keyDateIssues,
          writerReviews: [],
          promptVersions: {},
          factsHash: report.facts_hash,
          attemptCounts: { validator: validatorAttempts, judge: judgeAttempts },
          tokenAccounting: {
            acceptedTokens: 0,
            totalTokens: 0,
            retryTokens: 0,
            estimatedUsd: 0,
            acceptedEstimatedUsd: 0,
            retryEstimatedUsd: 0
          }
        });
        await input.store.updateJob(input.job.id, { passing_unit_cache: durableJobCache() });
      }, input.persistenceRetry);
      validatorSummary.push({ unitId: "key-dates", passed: true, issues: keyDateIssues });
    }
  }

  const unitRows = await input.store.unitRows(report.id);
  const unitById = new Map(unitRows.map((row) => [row.content_key.replace(`report:${report.id}:`, ""), row]));
  let assembledUnits: AssembledReportUnit[] = orderedUnitIds.map((unitId) => {
    const row = unitById.get(unitId);
    if (!row) throw new Error(`REPORT_ASSEMBLY_INCOMPLETE: missing persisted unit '${unitId}'.`);
    return {
      unitId,
      draft: {
        headline: row.headline,
        summary: row.summary,
        body: row.body,
        timing: typeof (row.source_snapshot?.renderMetadata as { timing?: unknown } | undefined)?.timing === "string"
          ? (row.source_snapshot.renderMetadata as { timing: string }).timing
          : "",
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
  const deduplication = deduplicateAssembledReport(assembledUnits, {
    allowSynthesisRepetition: promptMode === "active"
  });
  const mechanicalCoherence = repairMechanicalPostDedupSeams(deduplication.units, deduplication.removals);
  assembledUnits = mechanicalCoherence.units;
  if (mechanicalCoherence.remaining.length) {
    // Owner ruling 2026-08-14: this is an assembly repair, not unit
    // regeneration. Deduplication may damage one paragraph by removing an
    // interior sentence; the permitted repair is a single bounded splice of
    // that named paragraph. It must never reopen or rewrite the passing unit.
    const scope = mechanicalCoherence.remaining[0];
    const unit = assembledUnits.find((candidate) => candidate.unitId === scope.unitId);
    const row = unitById.get(scope.unitId);
    if (!unit || !row) throw new Error(`REPORT_ASSEMBLY_COHERENCE_UNIT_MISSING: ${scope.unitId}`);
    const payload = assembleReportGenerationPayload({
      reportId: report.id,
      reportDomain: report.report_domain,
      reportHorizon: report.report_horizon,
      unitId: scope.unitId,
      frozenFacts: report.facts
    });
    const revision = await reviseReportDraftForNamedDefects({
      payload,
      draft: unit.draft,
      defects: [{
        id: `assembly-coherence:${scope.unitId}:${scope.location}:${scope.paragraphIndex}`,
        category: "unnatural_phrasing",
        location: scope.location,
        sentence_index: scope.scopeStart,
        scope_start: scope.scopeStart,
        scope_end: scope.scopeEnd,
        quote: scope.quote,
        evidence: `Mechanical deduplication left a paragraph with ${scope.reasons.join(", ")}.`,
        evidence_ids: [],
        instruction: "Repair only this paragraph so every remaining sentence connects continuously after the removed duplicate. Remove any dangling connector or orphaned pronoun. Preserve every astrology fact, date, degree, aspect, house, certainty level, and attribution. Do not add a new interpretation or conclusion."
      }],
      callModel: authorizedCall
    });
    const normalized = normalizeAssembledReportWhitespace([{ ...unit, draft: revision.revised }])[0];
    const remaining = detectPostDedupCoherenceScopes([normalized]);
    if (remaining.length) {
      throw new Error(`REPORT_ASSEMBLY_COHERENCE_REPAIR_REJECTED: ${JSON.stringify(remaining)}`);
    }
    const repairTokens = totalTokens(revision.calls);
    tokenCount += repairTokens;
    await withPersistenceBackoff(`${scope.unitId}:assembly-coherence`, async () => {
      await input.store.saveUnit(report, scope.unitId, normalized.draft, {
        ...row.source_snapshot,
        fulfillmentPassed: true,
        assemblyCoherenceRepairs: [
          ...(Array.isArray(row.source_snapshot?.assemblyCoherenceRepairs) ? row.source_snapshot.assemblyCoherenceRepairs : []),
          {
            schema: "report-assembly-coherence-repair.v1",
            repairClass: "bounded_dedup_seam_splice",
            unitRegeneration: false,
            location: scope.location,
            paragraphIndex: scope.paragraphIndex,
            reasons: scope.reasons,
            boundedCallCount: 1,
            usage: revision.calls[0]?.usage ?? null
          }
        ]
      });
      await input.store.updateReport(report.id, {
        ...nowPatch("writing"),
        token_count: tokenCount,
        token_count_total: tokenCountTotal,
        token_spend_usd_estimate: estimatedCostTotal
      });
    }, input.persistenceRetry);
    return requeueForContinuation();
  }
  assembledUnits = normalizeAssembledReportWhitespace(assembledUnits);
  const structuralIssues = validateAssembledReport(assembledUnits, {
    enforceSeasonStructure: promptMode === "active",
    allowSynthesisRepetition: promptMode === "active"
  });
  const structuralErrors = structuralIssues.filter((entry) => entry.severity === "error");
  const assemblyWarnings = structuralIssues.filter((entry) => entry.severity !== "error");
  const warningsByUnit = new Map<string, ReportAssemblyIssue[]>();
  for (const entry of assemblyWarnings) warningsByUnit.set(entry.unitId, [...(warningsByUnit.get(entry.unitId) ?? []), entry]);
  const removalsByUnit = new Map<string, typeof deduplication.removals>();
  for (const entry of deduplication.removals) removalsByUnit.set(entry.unitId, [...(removalsByUnit.get(entry.unitId) ?? []), entry]);
  const coherenceRepairsByUnit = new Map<string, typeof mechanicalCoherence.repairs>();
  for (const entry of mechanicalCoherence.repairs) coherenceRepairsByUnit.set(entry.unitId, [...(coherenceRepairsByUnit.get(entry.unitId) ?? []), entry]);
  for (const assembled of assembledUnits) {
    const row = unitById.get(assembled.unitId);
    if (!row) continue;
    const unitErrors = structuralErrors.filter((entry) => entry.unitId === assembled.unitId);
    const unitWarnings = warningsByUnit.get(assembled.unitId) ?? [];
    const unitRemovals = removalsByUnit.get(assembled.unitId) ?? [];
    const unitCoherenceRepairs = coherenceRepairsByUnit.get(assembled.unitId) ?? [];
    const previouslyAssemblyInvalidated = isAssemblyInvalidatedPassingSnapshot(row.source_snapshot);
    if (!previouslyAssemblyInvalidated && !unitErrors.length && !unitWarnings.length && !unitRemovals.length && !unitCoherenceRepairs.length) continue;
    await input.store.saveUnit(report, assembled.unitId, assembled.draft, {
      ...row.source_snapshot,
      fulfillmentPassed: unitErrors.length === 0,
      assemblyValidation: {
        passed: unitErrors.length === 0,
        issues: [...unitErrors, ...unitWarnings],
        warnings: unitWarnings,
        mechanicalRemovals: unitRemovals,
        mechanicalCoherenceRepairs: unitCoherenceRepairs
      }
    });
  }
  if (structuralErrors.length) {
    await invalidateAssemblyUnits(structuralErrors);
    throw new ReportAssemblyRegenerationRequired(structuralErrors);
  }

  validatorSummary.push({
    unitId: "assembled-report",
    passed: true,
    issues: assemblyWarnings,
    warnings: assemblyWarnings,
    mechanicalRemovals: deduplication.removals,
    mechanicalCoherenceRepairs: mechanicalCoherence.repairs
  });

  const publicationStatus = config.autoPublishEnabled ? "live" : "needs_review";
  await input.store.updateReport(report.id, {
    ...nowPatch(publicationStatus), status: publicationStatus, prompt_versions: promptVersions,
    judge_scores: judgeScores, token_count: tokenCount,
    validator_results: validatorSummary,
    attempt_counts: { validator: validatorAttempts, judge: judgeAttempts, redundancy: redundancyAttempts },
    ...(config.autoPublishEnabled ? { delivered_at: new Date().toISOString() } : {})
  });
  await input.store.updateJob(input.job.id, { state: "complete", step: "complete", locked_at: null, locked_by: null, lease_expires_at: null });
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
      const deadlineYield = deadlineYieldFrom(error);
      if (deadlineYield) {
        processed.push({
          jobId: job.id,
          result: {
            status: "queued",
            continuation: true,
            deadlineAdmission: {
              schemaName: deadlineYield.schemaName,
              remainingMs: deadlineYield.remainingMs,
              estimatedCallMs: deadlineYield.estimatedCallMs,
              safetyMarginMs: deadlineYield.safetyMarginMs
            }
          }
        });
        continue;
      }
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
        state: "paused", last_error: message, locked_at: null, locked_by: null, lease_expires_at: null
      } : retryable ? {
        state: "retry",
        run_after: new Date(Date.now() + Math.min(60_000, 2 ** job.attempt * 1_000)).toISOString(),
        last_error: message,
        locked_at: null,
        locked_by: null,
        lease_expires_at: null
      } : { state: "exception", last_error: message, locked_at: null, locked_by: null, lease_expires_at: null });
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
