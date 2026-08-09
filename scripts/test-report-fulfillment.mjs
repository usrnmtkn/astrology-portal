import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import { REPORT_AUTOMATION_RULING_PATH, REPORT_AUTOMATION_RULING_VERSION, REPORT_SKUS, reportFulfillmentConfig } from "../api/_lib/report-fulfillment-config.ts";
import { processReportFulfillmentJob, runReportFulfillmentBatch } from "../api/_lib/report-fulfillment.ts";
import { revokeEntitlement } from "../api/_lib/report-entitlements.ts";
import { verifyReportFactLock } from "../api/_lib/report-fact-lock.ts";
import { verifyStripeWebhookSignature } from "../api/_lib/stripe-report-billing.ts";
import { enforceReportRevisionStopRule, ReportStopRuleError } from "../api/_lib/report-writer-chain.ts";

process.env.REPORT_AUTO_PUBLISH = "false";
const frozen = JSON.parse(fs.readFileSync(new URL("./fixtures/marie-report-frozen-facts.json", import.meta.url), "utf8"));
const ruling = fs.readFileSync(REPORT_AUTOMATION_RULING_PATH, "utf8");
assert.ok(ruling.includes(`**Version:** \`${REPORT_AUTOMATION_RULING_VERSION}\``));
assert.match(ruling, /\*\*Status:\*\* `owner_approved`/u);

const signaturePayload = JSON.stringify({ id: "evt_fixture", type: "checkout.session.completed" });
const timestamp = 1_786_247_200;
const signature = crypto.createHmac("sha256", "whsec_fixture").update(`${timestamp}.${signaturePayload}`).digest("hex");
assert.equal(verifyStripeWebhookSignature({ payload: signaturePayload, signatureHeader: `t=${timestamp},v1=${signature}`, secret: "whsec_fixture", nowSeconds: timestamp }), true);
assert.equal(verifyStripeWebhookSignature({ payload: `${signaturePayload}x`, signatureHeader: `t=${timestamp},v1=${signature}`, secret: "whsec_fixture", nowSeconds: timestamp }), false);
assert.equal(new Set(REPORT_SKUS.map((sku) => sku.key)).size, 12);
assert.ok(REPORT_SKUS.every((sku) => sku.priceEnv.startsWith("STRIPE_REPORT_PRICE_") && sku.amountEnv.startsWith("STRIPE_REPORT_AMOUNT_") && sku.nameEnv.startsWith("STRIPE_REPORT_NAME_")));

process.env.REPORT_AUTO_PUBLISH = "true";
delete process.env.REPORT_AUTOMATION_OWNER_RULING_VERSION;
assert.equal(reportFulfillmentConfig().autoPublishEnabled, false, "Auto-publish requires the owner ruling version as well as its feature flag.");
process.env.REPORT_AUTOMATION_OWNER_RULING_VERSION = REPORT_AUTOMATION_RULING_VERSION;
assert.equal(reportFulfillmentConfig().autoPublishEnabled, true);
process.env.REPORT_AUTO_PUBLISH = "false";
delete process.env.REPORT_AUTOMATION_OWNER_RULING_VERSION;

const draft = { headline: "FIXTURE_ONLY.", body: "FIRST_SENTENCE. SECOND_SENTENCE.", sections: [] };
const namedRevision = { ...draft, body: "FIRST_SENTENCE. REVISED_SECOND_SENTENCE." };
assert.equal(enforceReportRevisionStopRule(draft, namedRevision, [{
  id: "d1", category: "vagueness", location: "body", sentence_index: 1,
  quote: "SECOND_SENTENCE.", evidence: "FIXTURE_ONLY", instruction: "FIXTURE_ONLY"
}]).body, namedRevision.body);
assert.throws(() => enforceReportRevisionStopRule(draft, { ...draft, body: "REVISED_FIRST_SENTENCE. SECOND_SENTENCE." }, [{
  id: "d1", category: "vagueness", location: "body", sentence_index: 1,
  quote: "SECOND_SENTENCE.", evidence: "FIXTURE_ONLY", instruction: "FIXTURE_ONLY"
}]), ReportStopRuleError);
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

function factsForHorizon(horizon) {
  const result = structuredClone(frozen);
  const ends = { "1_month": "2026-03-18T01:59:11Z", "4_months": "2026-06-18T01:59:11Z", "6_months": "2026-08-18T01:59:11Z", "12_months": frozen.endsAt };
  result.reportHorizon = horizon;
  result.endsAt = ends[horizon];
  result.slowTransitArcs = result.slowTransitArcs.flatMap((arc) => {
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
function modelCallWithCrash(crashAt = Infinity) {
  let calls = 0;
  const call = async (input) => {
    calls += 1;
    if (calls === crashAt) throw new Error("FIXTURE_ONLY_CRASH");
    return {
      value: input.schemaName === "report_unit_critique" ? { result: "no_defects", defects: [] } : structuredClone(modelDraft),
      model: "FIXTURE_ONLY_MODEL", provider: "FIXTURE_ONLY_PROVIDER",
      usage: { inputTokens: 1, outputTokens: 1, totalTokens: 2 }
    };
  };
  call.count = () => calls;
  return call;
}
const judgeCall = async () => ({
  result: { scores: { astrology_chronology: 4, factual_traceability: 4, specificity: 4, natural_language: 4, syntax_variety: 4, emotional_temperature: 4, density: 4 }, overall: 1, verdict: "pass", findings: [] },
  usage: { inputTokens: 1, outputTokens: 1, totalTokens: 2 }, model: "FIXTURE_ONLY_JUDGE", promptVersion: "FIXTURE_ONLY_JUDGE_V1"
});

const store = createMemoryStore();
let calculationCalls = 0;
const calculateFacts = async (report) => {
  calculationCalls += 1;
  return { facts: factsForHorizon(report.report_horizon), facts_engine: "FIXTURE_ONLY_ENGINE" };
};
for (const [index, sku] of REPORT_SKUS.entries()) {
  const reportId = `report-${index}`;
  const entitlementId = `entitlement-${index}`;
  store.reports.set(reportId, {
    id: reportId, user_id: "user-1", subject_id: null, report_domain: sku.reportDomain, report_horizon: sku.reportHorizon,
    period_start: frozen.startsAt.slice(0, 10), period_end: factsForHorizon(sku.reportHorizon).endsAt.slice(0, 10),
    facts: {}, facts_engine: "pending", facts_hash: null, fulfillment_status: "queued", prompt_versions: {}, token_count: 0,
    attempt_counts: { validator: 0, judge: 0 }, failure_history: [], status: "draft"
  });
  store.entitlements.set(entitlementId, { id: entitlementId, user_id: "user-1", status: "active", product_key: sku.key, period_start: frozen.startsAt.slice(0, 10), period_end: factsForHorizon(sku.reportHorizon).endsAt.slice(0, 10) });
  const result = await processReportFulfillmentJob({
    job: { id: `job-${index}`, report_id: reportId, entitlement_id: entitlementId, state: "running", step: "calculating", attempt: 1 },
    store, calculateFacts, callModel: modelCallWithCrash(), judgeCall
  });
  assert.equal(result.status, "needs_review");
  assert.equal(store.reports.get(reportId).status, "needs_review");
}
assert.equal(REPORT_SKUS.length, 12);
assert.equal(calculationCalls, 4, "One facts calculation per user/window must serve all three domains.");

const concurrentStore = createMemoryStore();
const concurrentBase = {
  user_id: "concurrent-user", subject_id: null, report_horizon: "1_month",
  period_start: frozen.startsAt.slice(0, 10), period_end: "2026-03-18", facts: {}, facts_engine: "pending", facts_hash: null,
  fulfillment_status: "queued", prompt_versions: {}, token_count: 0, attempt_counts: { validator: 0, judge: 0 }, failure_history: [], status: "draft"
};
concurrentStore.reports.set("concurrent-general", { ...structuredClone(concurrentBase), id: "concurrent-general", report_domain: "general" });
concurrentStore.reports.set("concurrent-work", { ...structuredClone(concurrentBase), id: "concurrent-work", report_domain: "work_money" });
concurrentStore.entitlements.set("concurrent-general-ent", { id: "concurrent-general-ent", user_id: "concurrent-user", status: "active", product_key: "general_1_month" });
concurrentStore.entitlements.set("concurrent-work-ent", { id: "concurrent-work-ent", user_id: "concurrent-user", status: "active", product_key: "work_money_1_month" });
let releaseCalculation;
const calculationLatch = new Promise((resolve) => { releaseCalculation = resolve; });
let concurrentCalculations = 0;
const heldCalculation = async () => { concurrentCalculations += 1; await calculationLatch; return { facts: factsForHorizon("1_month"), facts_engine: "FIXTURE_ONLY_ENGINE" }; };
const firstConcurrent = processReportFulfillmentJob({
  job: { id: "concurrent-job-1", report_id: "concurrent-general", entitlement_id: "concurrent-general-ent", state: "running", step: "calculating", attempt: 1 },
  store: concurrentStore, calculateFacts: heldCalculation, callModel: modelCallWithCrash(), judgeCall
});
await new Promise((resolve) => setImmediate(resolve));
await assert.rejects(processReportFulfillmentJob({
  job: { id: "concurrent-job-2", report_id: "concurrent-work", entitlement_id: "concurrent-work-ent", state: "running", step: "calculating", attempt: 1 },
  store: concurrentStore, calculateFacts: heldCalculation, callModel: modelCallWithCrash(), judgeCall
}), /FACTS_PENDING/u);
releaseCalculation();
await firstConcurrent;
await processReportFulfillmentJob({
  job: { id: "concurrent-job-2", report_id: "concurrent-work", entitlement_id: "concurrent-work-ent", state: "running", step: "calculating", attempt: 2 },
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
resumeStore.entitlements.set("resume-ent", { id: "resume-ent", user_id: "resume-user", status: "active", product_key: "general_1_month" });
const crashCall = modelCallWithCrash(3);
await assert.rejects(processReportFulfillmentJob({ job: { id: "resume-job", report_id: resumeReport.id, entitlement_id: "resume-ent", state: "running", step: "writing", attempt: 1 }, store: resumeStore, calculateFacts, callModel: crashCall, judgeCall }), /FIXTURE_ONLY_CRASH/u);
assert.ok(resumeStore.units.has("resume-report:overview"));
const resumeCall = modelCallWithCrash();
await processReportFulfillmentJob({ job: { id: "resume-job", report_id: resumeReport.id, entitlement_id: "resume-ent", state: "running", step: "writing", attempt: 2 }, store: resumeStore, calculateFacts, callModel: resumeCall, judgeCall });
assert.equal(resumeCall.count(), 6, "Resume must skip the completed unit and make two writer calls for each of three remaining units.");

const retryStore = createMemoryStore();
retryStore.claimJobs = async () => [{ id: "retry-job", report_id: "retry-report", entitlement_id: "retry-ent", state: "running", step: "writing", attempt: 1 }];
retryStore.reports.set("retry-report", { ...structuredClone(resumeReport), id: "retry-report", fulfillment_status: "writing" });
retryStore.entitlements.set("retry-ent", { id: "retry-ent", user_id: "resume-user", status: "active", product_key: "general_1_month" });
let retryPatch = null;
retryStore.updateJob = async (_id, patch) => { retryPatch = patch; };
await runReportFulfillmentBatch({ workerId: "fixture-worker", store: retryStore, calculateFacts, callModel: modelCallWithCrash(1), judgeCall });
assert.equal(retryPatch.state, "retry", "Transient model failures remain resumable until the job cap.");

const adminSource = fs.readFileSync(new URL("../api/admin/report-fulfillment.ts", import.meta.url), "utf8");
assert.ok(!/edit(?:_|\s|-)?prose|update(?:_|\s|-)?body/iu.test(adminSource), "The exception dashboard must not add a prose-editing path.");

console.log("Report fulfillment passed: SKUs, owner gate, signatures, refunds, fact lock, stop rule, shared and concurrently claimed facts, 12 mocked products, crash resume, retry queue, and no-edit admin contract.");
