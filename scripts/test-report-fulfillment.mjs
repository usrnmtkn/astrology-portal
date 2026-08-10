import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import { REPORT_AUTOMATION_RULING_PATH, REPORT_AUTOMATION_RULING_VERSION, REPORT_SKUS, reportBillingMode, reportCallEstimate, reportFulfillmentConfig, reportSku } from "../api/_lib/report-fulfillment-config.ts";
import { processReportFulfillmentJob, runReportFulfillmentBatch } from "../api/_lib/report-fulfillment.ts";
import { REPORT_JUDGE_CATEGORIES, reportJudgeOverall, reportJudgeVerdict } from "../api/_lib/report-judge.ts";
import { authorizeReportGeneration, grantCompEntitlement, revokeEntitlement } from "../api/_lib/report-entitlements.ts";
import { verifyReportFactLock } from "../api/_lib/report-fact-lock.ts";
import { createReportMailProvider } from "../api/_lib/report-mail.ts";
import { reportUrl } from "../api/_lib/report-http.ts";
import { estimateReportModelCost, estimateReportPlanningProfile, reportModelPricing } from "../api/_lib/report-model-pricing.ts";
import { releaseReviewedReport } from "../api/_lib/report-release.ts";
import { verifyStripeWebhookSignature } from "../api/_lib/stripe-report-billing.ts";
import { assembleReportGenerationPayload } from "../api/_lib/report-generation.ts";
import {
  enforceReportRevisionStopRule, ReportRevisionScopeError, ReportStopRuleError,
  runReportWriterChain, spliceReportRevision
} from "../api/_lib/report-writer-chain.ts";

process.env.REPORT_AUTO_PUBLISH = "false";
const frozen = JSON.parse(fs.readFileSync(new URL("./fixtures/marie-report-frozen-facts.json", import.meta.url), "utf8"));
const spliceReplay = JSON.parse(fs.readFileSync(new URL("./fixtures/report-run1-overview-splice-replay.json", import.meta.url), "utf8"));
const skuCatalog = JSON.parse(fs.readFileSync(new URL("../config/report-sku-catalog-v1.json", import.meta.url), "utf8"));
const ruling = fs.readFileSync(REPORT_AUTOMATION_RULING_PATH, "utf8");
assert.ok(ruling.includes(`**Version:** \`${REPORT_AUTOMATION_RULING_VERSION}\``));
assert.match(ruling, /\*\*Status:\*\* `owner_approved`/u);

const signaturePayload = JSON.stringify({ id: "evt_fixture", type: "checkout.session.completed" });
const timestamp = 1_786_247_200;
const signature = crypto.createHmac("sha256", "whsec_fixture").update(`${timestamp}.${signaturePayload}`).digest("hex");
assert.equal(verifyStripeWebhookSignature({ payload: signaturePayload, signatureHeader: `t=${timestamp},v1=${signature}`, secret: "whsec_fixture", nowSeconds: timestamp }), true);
assert.equal(verifyStripeWebhookSignature({ payload: `${signaturePayload}x`, signatureHeader: `t=${timestamp},v1=${signature}`, secret: "whsec_fixture", nowSeconds: timestamp }), false);
assert.equal(new Set(REPORT_SKUS.map((sku) => sku.key)).size, 16);
assert.ok(REPORT_SKUS.every((sku) => sku.priceEnv.startsWith("STRIPE_REPORT_PRICE_") && sku.amountEnv.startsWith("STRIPE_REPORT_AMOUNT_") && sku.nameEnv.startsWith("STRIPE_REPORT_NAME_")));
assert.equal(skuCatalog.schema, "tldrastro.report-sku-catalog.v1");
assert.equal(skuCatalog.billing_mode, "free_test");
assert.deepEqual(skuCatalog.skus.map((sku) => sku.sku).sort(), REPORT_SKUS.map((sku) => sku.key).sort());
assert.ok(skuCatalog.skus.every((sku) => sku.price_cents === 0 && sku.stripe_product_id.startsWith("PLACEHOLDER_") && sku.stripe_price_id.startsWith("PLACEHOLDER_")));
assert.equal(reportSku("general_1_month").key, "general_1m", "Legacy entitlement keys must resolve to the compact catalog key.");
delete process.env.REPORT_BILLING_MODE;
assert.equal(reportBillingMode(), "free_test");
process.env.REPORT_BILLING_MODE = "stripe";
assert.equal(reportBillingMode(), "stripe");
delete process.env.REPORT_BILLING_MODE;

process.env.REPORT_AUTO_PUBLISH = "true";
delete process.env.REPORT_AUTOMATION_OWNER_RULING_VERSION;
assert.equal(reportCallEstimate("12_months").expectedCallBudget, 44);
assert.equal(reportCallEstimate("12_months").safetyMarginCalls, 11);
assert.equal(reportCallEstimate("12_months").recommendedCallBudget, 55);
assert.equal(reportFulfillmentConfig().tokenBudget, 1_450_000);
assert.equal(reportModelPricing().version, "2026-08-10");
assert.equal(estimateReportModelCost("gpt-5.6-sol", { inputTokens: 1_000_000, outputTokens: 0, totalTokens: 1_000_000 }), 5);
assert.equal(estimateReportPlanningProfile("12_months").estimatedCostUsd, 6.3415);
delete process.env.REPORT_JUDGE_THRESHOLD;
assert.equal(reportFulfillmentConfig().judgeThreshold, 0.85, "V3.1 must default to the owner-approved 0.85 threshold.");
assert.equal(reportFulfillmentConfig().autoPublishEnabled, false, "Auto-publish requires the owner ruling version as well as its feature flag.");
process.env.REPORT_AUTOMATION_OWNER_RULING_VERSION = REPORT_AUTOMATION_RULING_VERSION;
assert.equal(reportFulfillmentConfig().autoPublishEnabled, true);
process.env.REPORT_AUTO_PUBLISH = "false";
delete process.env.REPORT_AUTOMATION_OWNER_RULING_VERSION;

const draft = { headline: "FIXTURE_ONLY.", body: "FIRST_SENTENCE. SECOND_SENTENCE.", sections: [] };
const namedRevision = { ...draft, body: "FIRST_SENTENCE. REVISED_SECOND_SENTENCE." };
assert.equal(enforceReportRevisionStopRule(draft, namedRevision, [{
  id: "d1", category: "unlived_abstraction", location: "body", sentence_index: 1,
  quote: "SECOND_SENTENCE.", evidence: "FIXTURE_ONLY", instruction: "FIXTURE_ONLY"
}]).body, namedRevision.body);
assert.throws(() => enforceReportRevisionStopRule(draft, { ...draft, body: "REVISED_FIRST_SENTENCE. SECOND_SENTENCE." }, [{
  id: "d1", category: "unlived_abstraction", location: "body", sentence_index: 1,
  quote: "SECOND_SENTENCE.", evidence: "FIXTURE_ONLY", instruction: "FIXTURE_ONLY"
}]), ReportStopRuleError);
const scopedDraft = { ...draft, body: "FIRST_SENTENCE.\n\nSECOND_SENTENCE.\n\nTHIRD_SENTENCE.\n\nFOURTH_SENTENCE." };
const scopedRevision = { ...scopedDraft, body: "FIRST_SENTENCE.\n\nREVISED_SECOND_SENTENCE.\n\nREVISED_THIRD_SENTENCE.\n\nFOURTH_SENTENCE." };
assert.equal(enforceReportRevisionStopRule(scopedDraft, scopedRevision, [{
  id: "multi-1", category: "interpretive_gap", location: "body", sentence_index: 1, scope_start: 1, scope_end: 2,
  quote: "SECOND_SENTENCE. THIRD_SENTENCE.", evidence: "FIXTURE_ONLY", instruction: "FIXTURE_ONLY"
}]).body, scopedRevision.body, "A multi-paragraph edit inside a declared defect scope must pass.");
assert.throws(() => enforceReportRevisionStopRule(scopedDraft, scopedRevision, [{
  id: "multi-1", category: "interpretive_gap", location: "body", sentence_index: 1,
  quote: "SECOND_SENTENCE.", evidence: "FIXTURE_ONLY", instruction: "FIXTURE_ONLY"
}]), ReportStopRuleError, "The same multi-paragraph edit without a scope declaration must fail.");

const spliceDefects = [
  { id: "splice-body", category: "unlived_abstraction", location: "body", sentence_index: 1, scope_start: 1, scope_end: 2, quote: "SECOND_SENTENCE. THIRD_SENTENCE.", evidence: "FIXTURE_ONLY", evidence_ids: [], instruction: "FIXTURE_ONLY" },
  { id: "splice-timing", category: "astrology_chronology", location: "timing", sentence_index: 0, scope_start: 0, scope_end: 0, quote: "FIXTURE_ONLY_TIMING.", evidence: "FIXTURE_ONLY", evidence_ids: [], instruction: "FIXTURE_ONLY" }
];
const spliceInput = { ...scopedDraft, timing: "FIXTURE_ONLY_TIMING." };
const spliced = spliceReportRevision(spliceInput, spliceDefects, { replacements: [
  { defect_id: "splice-body", location: "body", scope_start: 1, scope_end: 2, replacement: "REPLACED_SCOPE." },
  { defect_id: "splice-timing", location: "timing", scope_start: 0, scope_end: 0, replacement: "REPLACED_TIMING." }
] });
assert.equal(spliced.body, "FIRST_SENTENCE.\n\nREPLACED_SCOPE.\n\nFOURTH_SENTENCE.", "Runtime must splice multi-defect replacements in one response.");
assert.equal(spliced.timing, "REPLACED_TIMING.");
assert.ok(spliced.body.startsWith(spliceInput.body.slice(0, spliceInput.body.indexOf("SECOND_SENTENCE."))), "Bytes before a named scope must remain identical.");
assert.ok(spliced.body.endsWith(spliceInput.body.slice(spliceInput.body.indexOf("FOURTH_SENTENCE."))), "Bytes after a named scope must remain identical.");
assert.throws(() => spliceReportRevision(spliceInput, spliceDefects, { replacements: [
  { defect_id: "splice-body", location: "summary", scope_start: 1, scope_end: 2, replacement: "SPILL." },
  { defect_id: "splice-timing", location: "timing", scope_start: 0, scope_end: 0, replacement: "REPLACED_TIMING." }
] }), ReportRevisionScopeError, "A changed location/index token must be rejected as scope spill.");

assert.throws(() => enforceReportRevisionStopRule(spliceReplay.draft, spliceReplay.failedWholeUnitRevision, spliceReplay.defects), ReportStopRuleError,
  "Run 1's whole-unit revision must preserve the recorded old stop-rule failure.");
const replaySpliced = spliceReportRevision(spliceReplay.draft, spliceReplay.defects, { replacements: [
  { defect_id: "defect-1", location: "body", scope_start: 0, scope_end: 0, replacement: "Private work, unfinished obligations, and changing responsibilities develop before their public result appears." },
  { defect_id: "defect-2", location: "timing", scope_start: 0, scope_end: 0, replacement: "February 18, 2026 through February 18, 2027" }
] });
assert.equal(replaySpliced.timing, "February 18, 2026 through February 18, 2027");
assert.ok(replaySpliced.body.includes("You may spend the first half of the year finishing work privately"));
assert.equal(replaySpliced.action, spliceReplay.draft.action, "Replay must leave every unnamed field byte-identical.");

const missingComparisonPayload = assembleReportGenerationPayload({
  reportId: "fixture-missing-comparisons", reportDomain: "general", reportHorizon: "12_months", unitId: "overview", frozenFacts: frozen
});
assert.ok(missingComparisonPayload.ownerComparisonSet.length >= 2, "The assembled Jupiter-capable report packet must include its V3 owner comparison set.");
delete missingComparisonPayload.ownerComparisonSet;
let missingComparisonProviderCalls = 0;
await assert.rejects(runReportWriterChain({ payload: missingComparisonPayload, callModel: async () => {
  missingComparisonProviderCalls += 1;
  throw new Error("Provider must not be called.");
} }), /REPORT_COMPARISON_SET_MISSING/u);
assert.equal(missingComparisonProviderCalls, 0, "Missing owner comparisons must fail closed before a billed draft call.");

const spliceChainPayload = assembleReportGenerationPayload({
  reportId: "fixture-splice-chain", reportDomain: "general", reportHorizon: "12_months", unitId: "overview", frozenFacts: frozen
});
const spliceChainDraft = {
  headline: "FIXTURE_ONLY_HEADLINE.", tldr: "FIXTURE_ONLY_TLDR.", summary: "FIXTURE_ONLY_SUMMARY.",
  body: "FIXTURE_ONLY_FIRST. FIXTURE_ONLY_SECOND.", action: "FIXTURE_ONLY_ACTION.",
  timing: "FIXTURE_ONLY_OLD_TIMING.", sections: []
};
const spliceChainDefects = [
  { id: "chain-body", category: "density_violation", location: "body", sentence_index: 0, scope_start: 0, scope_end: 0, quote: "FIXTURE_ONLY_FIRST.", evidence: "FIXTURE_ONLY", evidence_ids: [], instruction: "FIXTURE_ONLY_REPLACE" },
  { id: "chain-timing", category: "astrology_chronology", location: "timing", sentence_index: 0, scope_start: 0, scope_end: 0, quote: "FIXTURE_ONLY_OLD_TIMING.", evidence: "FIXTURE_ONLY", evidence_ids: [], instruction: "FIXTURE_ONLY_REPLACE" }
];
const spliceChainSchemas = [];
const spliceChain = await runReportWriterChain({ payload: spliceChainPayload, callModel: async (input) => {
  spliceChainSchemas.push(input.schemaName);
  const value = input.schemaName === "report_unit_draft" ? spliceChainDraft
    : input.schemaName === "report_unit_critique" ? { result: "defects", applicability: { interpretive_movement: "not_applicable", reason: "FIXTURE_ONLY" }, defects: spliceChainDefects }
      : { replacements: [
        { defect_id: "chain-body", location: "body", scope_start: 0, scope_end: 0, replacement: "FIXTURE_ONLY_REPLACED." },
        { defect_id: "chain-timing", location: "timing", scope_start: 0, scope_end: 0, replacement: "FIXTURE_ONLY_NEW_TIMING." }
      ] };
  return { value, model: input.model, provider: input.provider, usage: { inputTokens: 1, outputTokens: 1, totalTokens: 2 } };
} });
assert.deepEqual(spliceChainSchemas, ["report_unit_draft", "report_unit_critique", "report_unit_revision_spans"], "All named defects must be revised in one span-only call.");
assert.equal(spliceChain.revised.body, "FIXTURE_ONLY_REPLACED. FIXTURE_ONLY_SECOND.");
assert.equal(spliceChain.revised.summary, spliceChainDraft.summary, "The writer chain must keep unnamed text byte-identical.");
assert.equal(verifyReportFactLock({ ...draft, body: "March 3 is traceable." }, frozen).passed, true);
assert.equal(verifyReportFactLock({ ...draft, body: "March 31 is not traceable." }, frozen).passed, false);
assert.equal(verifyReportFactLock({ ...draft, body: "MAR 3 · FIXTURE_ONLY · FIXTURE_ONLY. · *A lunar eclipse falls on your natal Saturn.*" }, frozen).passed, true);
assert.equal(verifyReportFactLock({ ...draft, body: "MAR 3 · FIXTURE_ONLY · FIXTURE_ONLY. · *Pluto squares your natal Venus.*" }, frozen).passed, false);

const refundCalls = [];
await revokeEntitlement({
  update: async (table, query, patch) => {
    refundCalls.push({ table, query, patch });
    return table === "report_entitlements" ? [{ id: "ent-1" }] : [];
  }
}, { entitlementId: "ent-1", reason: "refunded", now: "2026-08-09T00:00:00Z" });
assert.ok(refundCalls.some((call) => call.table === "user_reports" && call.patch.fulfillment_status === "revoked" && call.patch.status === "draft"));
assert.ok(refundCalls.some((call) => call.table === "report_fulfillment_jobs" && call.patch.state === "cancelled"));

const compInserts = [];
const grantedComp = await grantCompEntitlement({
  async selectOne() {
    return { data: { profile: { charts: [{ birthDate: "1990-02-18", birthTime: "10:30", birthLocation: { label: "New York", latitude: 40.7, longitude: -74, timeZone: "America/New_York" } }] } } };
  },
  async insert(table, row) { compInserts.push({ table, row }); return [{ id: "comp-ent-1", status: row.status }]; }
}, { userId: "user-1", reportDomain: "work_money", reportHorizon: "12_months", windowStart: "2026-09-01", now: "2026-08-10T12:00:00Z" });
assert.equal(grantedComp.window.end, "2027-08-31");
assert.equal(compInserts[0].row.source, "comp");
assert.equal(compInserts[0].row.product_key, "work_money_12m");
assert.equal(compInserts[0].row.stripe_event_id, null);
assert.equal(compInserts[0].row.stripe_checkout_session_id, null);
assert.equal(compInserts[0].row.status, "active");

const directGrantKeys = [];
for (const sku of REPORT_SKUS) {
  await grantCompEntitlement({
    async selectOne() {
      return { data: { profile: { charts: [{ birthDate: "1990-02-18", birthTime: "10:30", birthLocation: { label: "New York", latitude: 40.7, longitude: -74, timeZone: "America/New_York" } }] } } };
    },
    async insert(_table, row) { directGrantKeys.push(row.product_key); return [{ id: `fixture-${row.product_key}`, status: row.status }]; }
  }, { userId: "shadow-user", reportDomain: sku.reportDomain, reportHorizon: sku.reportHorizon, windowStart: "2026-09-01", now: "2026-08-10T12:00:00Z" });
}
assert.deepEqual(directGrantKeys.sort(), REPORT_SKUS.map((sku) => sku.key).sort(), "Free-test grants must use all 16 compact catalog keys.");

const authorizationUpdates = [];
const authorization = await authorizeReportGeneration({
  async update(table, query, patch) {
    authorizationUpdates.push({ table, query, patch });
    return table === "report_fulfillment_jobs" ? [{ id: "comp-job-1" }] : [{ id: "comp-report-1" }];
  }
}, { reportId: "comp-report-1", callBudget: 44, now: "2026-08-10T12:01:00Z" });
assert.deepEqual(authorization, { authorized: true, callBudget: 44 });
const jobAuthorization = authorizationUpdates.find((entry) => entry.table === "report_fulfillment_jobs").patch;
assert.match(jobAuthorization.authorization_token, /^[0-9a-f-]{36}$/u);
assert.equal(jobAuthorization.authorized_call_budget, 44);
assert.equal(jobAuthorization.state, "queued");
assert.ok(authorizationUpdates.some((entry) => entry.table === "user_reports" && entry.patch.fulfillment_status === "queued"));

delete process.env.REPORT_MAIL_ENDPOINT;
delete process.env.REPORT_MAIL_TOKEN;
delete process.env.REPORT_READY_MAIL_TEMPLATE_ID;
let mailFetches = 0;
const logOnlyMail = await createReportMailProvider(async () => { mailFetches += 1; throw new Error("must not fetch"); }).sendReportReady({
  reportId: "report-1", userId: "user-1", reportUrl: "/reports/report-1"
});
assert.equal(logOnlyMail.mode, "log_only");
assert.equal(logOnlyMail.provider, "log-only");
assert.equal(mailFetches, 0);
assert.equal(logOnlyMail.payload.variables.reportUrl, "/reports/report-1");
delete process.env.APP_URL;
delete process.env.VITE_APP_URL;
assert.equal(reportUrl("/reports/report-1"), "/reports/report-1");
assert.equal(reportUrl("/reports/report-1", { headers: { "x-forwarded-proto": "https", "x-forwarded-host": "preview.example" } }), "https://preview.example/reports/report-1");

delete process.env.STRIPE_SECRET_KEY;

function factsForHorizon(horizon) {
  const result = structuredClone(frozen);
  const ends = { "1_month": "2026-03-18T01:59:11Z", "4_months": "2026-06-18T01:59:11Z", "6_months": "2026-08-18T01:59:11Z", "12_months": frozen.endsAt };
  result.reportHorizon = horizon;
  result.endsAt = ends[horizon];
  result.slowTransitArcs = result.slowTransitArcs.flatMap((arc) => {
    // This fact exists to complete the governed Summer calibration packet. It
    // intentionally remains a SOURCE_GAP until owner-reviewed manifestation
    // content exists, so the orchestration fixture excludes it instead of
    // weakening production's fail-closed content gate.
    if (arc.id === "jupiter-opposition-midheaven") return [];
    const passes = arc.passes.filter((pass) => pass.exactAt <= result.endsAt);
    return passes.length ? [{ ...arc, passes }] : [];
  });
  result.lunarEvents = result.lunarEvents.filter((event) => event.occursAt <= result.endsAt);
  if (horizon !== "12_months") delete result.solarReturn;
  return result;
}

function createMemoryStore() {
  const reports = new Map();
  const entitlements = new Map();
  const units = new Map();
  const facts = new Map();
  return {
    reports, entitlements, units, facts,
    async claimJobs() { return []; },
    async workerPaused() { return false; },
    async report(id) { return reports.get(id) ?? null; },
    async entitlement(id) { return entitlements.get(id) ?? null; },
    async updateReport(id, patch) { Object.assign(reports.get(id), patch); },
    async updateJob() {},
    async beginAuthorizedCall(jobId, token, attempt) {
      if (token !== "fixture-authorization") throw new Error("REPORT_CALL_AUTHORIZATION_REQUIRED");
      const key = `calls:${jobId}`;
      const next = Number(facts.get(key) ?? 0) + 1;
      facts.set(key, next);
      facts.set(`call:${jobId}:${next}`, { ...attempt, state: "authorized" });
      return { callId: `${jobId}:${next}`, callNumber: next };
    },
    async finishAuthorizedCall(callId, result) { facts.set(`finished:${callId}`, result); return true; },
    async reusableFacts(report) { return facts.get(`${report.user_id}:${report.report_horizon}:${report.period_start}`) ?? null; },
    async claimFacts(report) {
      const key = `${report.user_id}:${report.report_horizon}:${report.period_start}`;
      if (facts.has(`claim:${key}`)) return false;
      facts.set(`claim:${key}`, true);
      return true;
    },
    async releaseFactsClaim(report) { facts.delete(`claim:${report.user_id}:${report.report_horizon}:${report.period_start}`); },
    async saveFacts(report, bundle) { facts.set(`${report.user_id}:${report.report_horizon}:${report.period_start}`, bundle); },
    async unit(reportId, unitId) { return units.get(`${reportId}:${unitId}`) ?? null; },
    async saveUnit(report, unitId, value, sourceSnapshot) { units.set(`${report.id}:${unitId}`, { id: `${report.id}:${unitId}`, body: value.body, sections: value.sections, source_snapshot: sourceSnapshot }); },
    async unitRows(reportId) { return [...units.entries()].filter(([key]) => key.startsWith(`${reportId}:`)).map(([, value]) => value); },
    async countCombination() { return 0; }, async queueAudit() {}, async recordDelivery() {}
  };
}

const modelDraft = { headline: "FIXTURE_ONLY_HEADLINE.", tldr: "FIXTURE_ONLY_TLDR.", summary: "FIXTURE_ONLY_SUMMARY.", body: "FIXTURE_ONLY_BODY.", action: "FIXTURE_ONLY_ACTION.", timing: "FIXTURE_ONLY_TIMING.", sections: [] };
const passingJudgeScores = Object.fromEntries(REPORT_JUDGE_CATEGORIES.map((category) => [category, 4]));
assert.equal(reportJudgeOverall(passingJudgeScores), 1);
assert.equal(reportJudgeVerdict(passingJudgeScores, 0.85), "pass");
for (const category of ["astrology_chronology", "factual_traceability", "lived_experience", "interpretive_movement", "owner_voice"]) {
  assert.equal(reportJudgeVerdict({ ...passingJudgeScores, [category]: 2 }, 0.85), "below_threshold", `${category} must be a hard gate.`);
}
assert.equal(reportJudgeVerdict({ ...passingJudgeScores, natural_language: 2 }, 0.85), "pass", "Non-gated categories remain governed by the configured overall threshold.");
const shortUnitScores = { ...passingJudgeScores, interpretive_movement: null };
assert.equal(reportJudgeOverall(shortUnitScores, false), 1);
assert.equal(reportJudgeVerdict(shortUnitScores, 0.85, false), "pass", "Movement is excluded when a short unit marks it not applicable.");
function modelCallWithCrash(crashAt = Infinity) {
  let calls = 0;
  const call = async (input) => {
    calls += 1;
    const attempt = { provider: input.provider, model: input.model, schemaName: input.schemaName };
    await input.beforeProviderCall?.(attempt);
    if (calls === crashAt) {
      const error = new Error("FIXTURE_ONLY_CRASH");
      await input.onProviderCallError?.(attempt, error);
      throw error;
    }
    if (input.schemaName === "report_unit_draft") {
      assert.match(input.prompt, /LIVED_PROSE_STANDARD[\s\S]*INTERNAL PRE-DRAFT EXTRACTION \(REQUIRED\)[\s\S]*REPORT_GENERATION_PAYLOAD/u);
    }
    if (input.schemaName === "report_unit_critique") {
      assert.match(input.prompt, /LIVED_PROSE_STANDARD[\s\S]*FLATNESS \/ LIVED PROSE[\s\S]*COMPLETE_UNIT[\s\S]*UNIT_FACTS[\s\S]*OWNER_COMPARISON_SET/u);
      assert.match(input.prompt, /Never return flatness or lived_prose as a defect category\./u);
    }
    const result = {
      value: input.schemaName === "report_unit_critique" ? {
        result: "no_defects",
        applicability: { interpretive_movement: "applicable", reason: "FIXTURE_ONLY" },
        defects: []
      } : structuredClone(modelDraft),
      model: input.model, provider: input.provider,
      usage: { inputTokens: 1, outputTokens: 1, totalTokens: 2 }
    };
    await input.afterProviderCall?.(attempt, result);
    return result;
  };
  call.count = () => calls;
  return call;
}
const judgeCall = async () => ({
  result: {
    scores: passingJudgeScores,
    applicability: { interpretive_movement: "applicable", reason: "FIXTURE_ONLY" },
    overall: 1, verdict: "pass", findings: []
  },
  usage: { inputTokens: 1, outputTokens: 1, totalTokens: 2 }, model: "FIXTURE_ONLY_JUDGE", promptVersion: "FIXTURE_ONLY_JUDGE_V1"
});

function authorizedJob(input) {
  return { ...input, authorization_token: "fixture-authorization", authorized_call_budget: 1000, model_call_count: 0 };
}

const store = createMemoryStore();
let calculationCalls = 0;
const calculateFacts = async (report) => {
  calculationCalls += 1;
  return { facts: factsForHorizon(report.report_horizon), facts_engine: "FIXTURE_ONLY_ENGINE" };
};
const activeSkus = REPORT_SKUS;
let completedCompReport = null;
for (const [index, sku] of activeSkus.entries()) {
  const reportId = `report-${index}`;
  const entitlementId = `entitlement-${index}`;
  store.reports.set(reportId, {
    id: reportId, user_id: "user-1", subject_id: null, report_domain: sku.reportDomain, report_horizon: sku.reportHorizon,
    period_start: frozen.startsAt.slice(0, 10), period_end: factsForHorizon(sku.reportHorizon).endsAt.slice(0, 10),
    facts: {}, facts_engine: "pending", facts_hash: null, fulfillment_status: "queued", prompt_versions: {}, token_count: 0,
    attempt_counts: { validator: 0, judge: 0 }, failure_history: [], status: "draft"
  });
  const isCompEndToEnd = sku.key === "work_money_12m";
  store.entitlements.set(entitlementId, { id: entitlementId, user_id: "user-1", status: "active", source: isCompEndToEnd ? "comp" : "stripe", product_key: sku.key, period_start: frozen.startsAt.slice(0, 10), period_end: factsForHorizon(sku.reportHorizon).endsAt.slice(0, 10) });
  const providerMock = modelCallWithCrash();
  const meteredJudgeCall = isCompEndToEnd ? async (judgeInput) => {
    await judgeInput.callModel({ provider: "openai", model: "gpt-5.6-terra", prompt: "FIXTURE_ONLY", schemaName: "fixture_judge_meter", schema: {} });
    return judgeCall();
  } : judgeCall;
  const result = await processReportFulfillmentJob({
    job: authorizedJob({ id: `job-${index}`, report_id: reportId, entitlement_id: entitlementId, state: "running", step: "calculating", attempt: 1 }),
    store, calculateFacts, callModel: providerMock, judgeCall: meteredJudgeCall
  });
  assert.equal(result.status, "needs_review");
  assert.equal(store.reports.get(reportId).status, "needs_review");
  if (isCompEndToEnd) {
    completedCompReport = structuredClone(store.reports.get(reportId));
    assert.equal(providerMock.count(), reportCallEstimate("12_months").cleanPathCalls, "The comp mock must traverse draft, critique, and judge for all 12-month units.");
    assert.equal(store.facts.get(`calls:job-${index}`), reportCallEstimate("12_months").cleanPathCalls);
    assert.ok(providerMock.count() <= reportCallEstimate("12_months").recommendedCallBudget);
  }
}
assert.equal(REPORT_SKUS.length, 16);
assert.equal(activeSkus.length, 16);
assert.equal(calculationCalls, 4, "One facts calculation per user/window must serve all four active domains.");
assert.ok([...store.reports.values()].filter((report) => report.report_domain === "personal_health")
  .every((report) => report.status === "needs_review"), "Personal & Health fulfillment must be active and remain review-gated.");
assert.ok(completedCompReport, "The free-test comp report must complete before release is exercised.");
const releaseUpdates = [];
const releaseInserts = [];
const releaseResult = await releaseReviewedReport({
  admin: {
    async update(table, query, patch) { releaseUpdates.push({ table, query, patch }); return [{ id: completedCompReport.id }]; },
    async request() { return []; },
    async insert(table, row) { releaseInserts.push({ table, row }); return [row]; }
  },
  report: completedCompReport,
  reportUrl: "/reports/free-test-report",
  mail: { async sendReportReady(input) { return { provider: "log-only", mode: "log_only", payload: { recipientUserId: input.userId, reportUrl: input.reportUrl } }; } }
});
assert.deepEqual(releaseResult, { ok: true, deliveryMode: "log_only" });
assert.ok(releaseUpdates.some((entry) => entry.table === "user_reports" && entry.patch.fulfillment_status === "live"));
assert.ok(releaseInserts.some((entry) => entry.table === "report_audit_samples"));
assert.ok(releaseInserts.some((entry) => entry.table === "report_delivery_events" && entry.row.status === "queued" && entry.row.provider === "log-only"));

const unauthorizedStore = createMemoryStore();
unauthorizedStore.reports.set("unauthorized-report", { ...structuredClone([...store.reports.values()][0]), id: "unauthorized-report" });
unauthorizedStore.entitlements.set("unauthorized-ent", { id: "unauthorized-ent", status: "active", source: "comp", product_key: "general_1m" });
await assert.rejects(processReportFulfillmentJob({
  job: { id: "unauthorized-job", report_id: "unauthorized-report", entitlement_id: "unauthorized-ent", state: "running", step: "calculating", attempt: 1, authorization_token: null, authorized_call_budget: null, model_call_count: 0 },
  store: unauthorizedStore, calculateFacts, callModel: modelCallWithCrash(), judgeCall
}), /REPORT_CALL_AUTHORIZATION_REQUIRED/u);

const concurrentStore = createMemoryStore();
const concurrentBase = {
  user_id: "concurrent-user", subject_id: null, report_horizon: "1_month",
  period_start: frozen.startsAt.slice(0, 10), period_end: "2026-03-18", facts: {}, facts_engine: "pending", facts_hash: null,
  fulfillment_status: "queued", prompt_versions: {}, token_count: 0, attempt_counts: { validator: 0, judge: 0 }, failure_history: [], status: "draft"
};
concurrentStore.reports.set("concurrent-general", { ...structuredClone(concurrentBase), id: "concurrent-general", report_domain: "general" });
concurrentStore.reports.set("concurrent-work", { ...structuredClone(concurrentBase), id: "concurrent-work", report_domain: "work_money" });
concurrentStore.entitlements.set("concurrent-general-ent", { id: "concurrent-general-ent", user_id: "concurrent-user", status: "active", product_key: "general_1m" });
concurrentStore.entitlements.set("concurrent-work-ent", { id: "concurrent-work-ent", user_id: "concurrent-user", status: "active", product_key: "work_money_1m" });
let releaseCalculation;
const calculationLatch = new Promise((resolve) => { releaseCalculation = resolve; });
let concurrentCalculations = 0;
const heldCalculation = async () => { concurrentCalculations += 1; await calculationLatch; return { facts: factsForHorizon("1_month"), facts_engine: "FIXTURE_ONLY_ENGINE" }; };
const firstConcurrent = processReportFulfillmentJob({
  job: authorizedJob({ id: "concurrent-job-1", report_id: "concurrent-general", entitlement_id: "concurrent-general-ent", state: "running", step: "calculating", attempt: 1 }),
  store: concurrentStore, calculateFacts: heldCalculation, callModel: modelCallWithCrash(), judgeCall
});
await new Promise((resolve) => setImmediate(resolve));
await assert.rejects(processReportFulfillmentJob({
  job: authorizedJob({ id: "concurrent-job-2", report_id: "concurrent-work", entitlement_id: "concurrent-work-ent", state: "running", step: "calculating", attempt: 1 }),
  store: concurrentStore, calculateFacts: heldCalculation, callModel: modelCallWithCrash(), judgeCall
}), /FACTS_PENDING/u);
releaseCalculation();
await firstConcurrent;
await processReportFulfillmentJob({
  job: authorizedJob({ id: "concurrent-job-2", report_id: "concurrent-work", entitlement_id: "concurrent-work-ent", state: "running", step: "calculating", attempt: 2 }),
  store: concurrentStore, calculateFacts: heldCalculation, callModel: modelCallWithCrash(), judgeCall
});
assert.equal(concurrentCalculations, 1, "Concurrent domain purchases must share one claimed facts calculation.");

const resumeStore = createMemoryStore();
const resumeReport = {
  id: "resume-report", user_id: "resume-user", subject_id: null, report_domain: "general", report_horizon: "1_month",
  period_start: frozen.startsAt.slice(0, 10), period_end: "2026-03-18", facts: {}, facts_engine: "pending", facts_hash: null,
  fulfillment_status: "queued", prompt_versions: {}, token_count: 0, attempt_counts: { validator: 0, judge: 0 }, failure_history: [], status: "draft"
};
resumeStore.reports.set(resumeReport.id, resumeReport);
resumeStore.entitlements.set("resume-ent", { id: "resume-ent", user_id: "resume-user", status: "active", product_key: "general_1m" });
const crashCall = modelCallWithCrash(3);
await assert.rejects(processReportFulfillmentJob({ job: authorizedJob({ id: "resume-job", report_id: resumeReport.id, entitlement_id: "resume-ent", state: "running", step: "writing", attempt: 1 }), store: resumeStore, calculateFacts, callModel: crashCall, judgeCall }), /FIXTURE_ONLY_CRASH/u);
assert.ok(resumeStore.units.has("resume-report:overview"));
const resumeCall = modelCallWithCrash();
await processReportFulfillmentJob({ job: authorizedJob({ id: "resume-job", report_id: resumeReport.id, entitlement_id: "resume-ent", state: "running", step: "writing", attempt: 2 }), store: resumeStore, calculateFacts, callModel: resumeCall, judgeCall });
assert.equal(resumeCall.count(), 6, "Resume must skip the completed unit and make two writer calls for each of three remaining units.");

const retryStore = createMemoryStore();
retryStore.claimJobs = async () => [authorizedJob({ id: "retry-job", report_id: "retry-report", entitlement_id: "retry-ent", state: "running", step: "writing", attempt: 1 })];
retryStore.reports.set("retry-report", { ...structuredClone(resumeReport), id: "retry-report", fulfillment_status: "writing" });
retryStore.entitlements.set("retry-ent", { id: "retry-ent", user_id: "resume-user", status: "active", product_key: "general_1m" });
let retryPatch = null;
retryStore.updateJob = async (_id, patch) => { retryPatch = patch; };
await runReportFulfillmentBatch({ workerId: "fixture-worker", store: retryStore, calculateFacts, callModel: modelCallWithCrash(1), judgeCall });
assert.equal(retryPatch.state, "retry", "Transient model failures remain resumable until the job cap.");

const adminSource = fs.readFileSync(new URL("../api/admin/report-fulfillment.ts", import.meta.url), "utf8");
assert.ok(!/edit(?:_|\s|-)?prose|update(?:_|\s|-)?body/iu.test(adminSource), "The exception dashboard must not add a prose-editing path.");
for (const actionName of ["grant_comp", "authorize_generation", "revoke_comp"]) assert.ok(adminSource.includes(`body.action === "${actionName}"`));
assert.ok(adminSource.includes('code: "ACTIVE_COMP_EXISTS"'), "Duplicate comp grants must return a stable, human-readable conflict code.");
assert.ok(adminSource.includes("status: 409"), "Duplicate comp grants must return HTTP 409.");
assert.ok(adminSource.includes("An active comp report already exists"), "Duplicate comp grants must explain that the existing queue row should be used.");
assert.ok(adminSource.includes("reportId: report?.id ?? null"), "Successful comp grants must identify the generated report row for UI focus.");
const adminPanelSource = fs.readFileSync(new URL("../apps/admin/src/ReportFulfillmentAdminPanel.tsx", import.meta.url), "utf8");
for (const label of ["Grant report", "Authorize ", "Revoke comp"]) assert.ok(adminPanelSource.includes(label));
assert.ok(adminPanelSource.includes("Report granted. The fulfillment queue was refreshed"), "Successful comp grants need visible refresh confirmation.");
assert.ok(adminPanelSource.includes("The report was granted, but the fulfillment queue could not refresh"), "A post-grant refresh failure must warn the owner not to grant again.");
assert.ok(adminPanelSource.includes("scrollIntoView"), "Successful comp grants must move the new queue row into view.");
assert.ok(adminPanelSource.includes("ACTIVE_COMP_EXISTS") || adminSource.includes("ACTIVE_COMP_EXISTS"), "Duplicate comp conflicts need a stable UI contract.");
assert.ok(adminPanelSource.includes("admin-report-feedback"), "Fulfillment feedback must render in the page flow instead of covering queue actions.");
assert.ok(adminPanelSource.includes("Dismiss fulfillment message"), "Fulfillment feedback must be dismissible.");
for (const route of ["../api/report-checkout.ts", "../api/report-customer-portal.ts"]) {
  const source = fs.readFileSync(new URL(route, import.meta.url), "utf8");
  assert.ok(source.indexOf('reportBillingMode() === "free_test"') < source.indexOf("!process.env.STRIPE_SECRET_KEY"), `${route} must disable Stripe before inspecting Stripe credentials.`);
}
const webhookSource = fs.readFileSync(new URL("../api/stripe-webhook.ts", import.meta.url), "utf8");
assert.ok(webhookSource.includes('reportBillingMode() === "free_test"'));
const stripeSetupSource = fs.readFileSync(new URL("./setup-stripe-report-products.mjs", import.meta.url), "utf8");
assert.ok(stripeSetupSource.indexOf('reportBillingMode() !== "stripe"') < stripeSetupSource.indexOf("for (const sku"));

console.log("Report fulfillment passed: 16-key free-test catalog, Stripe fail-closed mode, direct comp grant/revoke, per-call authorization, mocked generation/judge/manual-release/log-only-delivery E2E, shared facts, crash resume, retry queue, and no-edit admin contract.");
