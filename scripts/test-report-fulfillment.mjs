import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import { REPORT_AUTOMATION_RULING_PATH, REPORT_AUTOMATION_RULING_VERSION, REPORT_SKUS, reportCallEstimate, reportFulfillmentConfig } from "../api/_lib/report-fulfillment-config.ts";
import { processReportFulfillmentJob, runReportFulfillmentBatch } from "../api/_lib/report-fulfillment.ts";
import { REPORT_JUDGE_CATEGORIES, reportJudgeOverall, reportJudgeVerdict } from "../api/_lib/report-judge.ts";
import { authorizeReportGeneration, grantCompEntitlement, revokeEntitlement } from "../api/_lib/report-entitlements.ts";
import { verifyReportFactLock } from "../api/_lib/report-fact-lock.ts";
import { createReportMailProvider } from "../api/_lib/report-mail.ts";
import { reportUrl } from "../api/_lib/report-http.ts";
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
assert.equal(new Set(REPORT_SKUS.map((sku) => sku.key)).size, 16);
assert.ok(REPORT_SKUS.every((sku) => sku.priceEnv.startsWith("STRIPE_REPORT_PRICE_") && sku.amountEnv.startsWith("STRIPE_REPORT_AMOUNT_") && sku.nameEnv.startsWith("STRIPE_REPORT_NAME_")));

process.env.REPORT_AUTO_PUBLISH = "true";
delete process.env.REPORT_AUTOMATION_OWNER_RULING_VERSION;
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
assert.equal(compInserts[0].row.stripe_event_id, null);
assert.equal(compInserts[0].row.stripe_checkout_session_id, null);
assert.equal(compInserts[0].row.status, "active");

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
    async consumeAuthorizedCall(jobId, token) {
      if (token !== "fixture-authorization") throw new Error("REPORT_CALL_AUTHORIZATION_REQUIRED");
      const key = `calls:${jobId}`;
      const next = Number(facts.get(key) ?? 0) + 1;
      facts.set(key, next);
      return next;
    },
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
    await input.beforeProviderCall?.();
    if (calls === crashAt) throw new Error("FIXTURE_ONLY_CRASH");
    if (input.schemaName === "report_unit_draft") {
      assert.match(input.prompt, /LIVED_PROSE_STANDARD[\s\S]*INTERNAL PRE-DRAFT EXTRACTION \(REQUIRED\)[\s\S]*REPORT_GENERATION_PAYLOAD/u);
    }
    if (input.schemaName === "report_unit_critique") {
      assert.match(input.prompt, /LIVED_PROSE_STANDARD[\s\S]*FLATNESS \/ LIVED PROSE[\s\S]*COMPLETE_UNIT[\s\S]*UNIT_FACTS[\s\S]*OWNER_COMPARISON_SET/u);
      assert.match(input.prompt, /Never return flatness or lived_prose as a defect category\./u);
    }
    return {
      value: input.schemaName === "report_unit_critique" ? {
        result: "no_defects",
        applicability: { interpretive_movement: "applicable", reason: "FIXTURE_ONLY" },
        defects: []
      } : structuredClone(modelDraft),
      model: "FIXTURE_ONLY_MODEL", provider: "FIXTURE_ONLY_PROVIDER",
      usage: { inputTokens: 1, outputTokens: 1, totalTokens: 2 }
    };
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
for (const [index, sku] of activeSkus.entries()) {
  const reportId = `report-${index}`;
  const entitlementId = `entitlement-${index}`;
  store.reports.set(reportId, {
    id: reportId, user_id: "user-1", subject_id: null, report_domain: sku.reportDomain, report_horizon: sku.reportHorizon,
    period_start: frozen.startsAt.slice(0, 10), period_end: factsForHorizon(sku.reportHorizon).endsAt.slice(0, 10),
    facts: {}, facts_engine: "pending", facts_hash: null, fulfillment_status: "queued", prompt_versions: {}, token_count: 0,
    attempt_counts: { validator: 0, judge: 0 }, failure_history: [], status: "draft"
  });
  const isCompEndToEnd = sku.key === "work_money_12_months";
  store.entitlements.set(entitlementId, { id: entitlementId, user_id: "user-1", status: "active", source: isCompEndToEnd ? "comp" : "stripe", product_key: sku.key, period_start: frozen.startsAt.slice(0, 10), period_end: factsForHorizon(sku.reportHorizon).endsAt.slice(0, 10) });
  const providerMock = modelCallWithCrash();
  const meteredJudgeCall = isCompEndToEnd ? async (judgeInput) => {
    await judgeInput.callModel({ provider: "FIXTURE_ONLY_PROVIDER", model: "FIXTURE_ONLY_MODEL", prompt: "FIXTURE_ONLY", schemaName: "fixture_judge_meter", schema: {} });
    return judgeCall();
  } : judgeCall;
  const result = await processReportFulfillmentJob({
    job: authorizedJob({ id: `job-${index}`, report_id: reportId, entitlement_id: entitlementId, state: "running", step: "calculating", attempt: 1 }),
    store, calculateFacts, callModel: providerMock, judgeCall: meteredJudgeCall
  });
  assert.equal(result.status, "needs_review");
  assert.equal(store.reports.get(reportId).status, "needs_review");
  if (isCompEndToEnd) {
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

const unauthorizedStore = createMemoryStore();
unauthorizedStore.reports.set("unauthorized-report", { ...structuredClone([...store.reports.values()][0]), id: "unauthorized-report" });
unauthorizedStore.entitlements.set("unauthorized-ent", { id: "unauthorized-ent", status: "active", source: "comp", product_key: "general_1_month" });
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
concurrentStore.entitlements.set("concurrent-general-ent", { id: "concurrent-general-ent", user_id: "concurrent-user", status: "active", product_key: "general_1_month" });
concurrentStore.entitlements.set("concurrent-work-ent", { id: "concurrent-work-ent", user_id: "concurrent-user", status: "active", product_key: "work_money_1_month" });
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
resumeStore.entitlements.set("resume-ent", { id: "resume-ent", user_id: "resume-user", status: "active", product_key: "general_1_month" });
const crashCall = modelCallWithCrash(3);
await assert.rejects(processReportFulfillmentJob({ job: authorizedJob({ id: "resume-job", report_id: resumeReport.id, entitlement_id: "resume-ent", state: "running", step: "writing", attempt: 1 }), store: resumeStore, calculateFacts, callModel: crashCall, judgeCall }), /FIXTURE_ONLY_CRASH/u);
assert.ok(resumeStore.units.has("resume-report:overview"));
const resumeCall = modelCallWithCrash();
await processReportFulfillmentJob({ job: authorizedJob({ id: "resume-job", report_id: resumeReport.id, entitlement_id: "resume-ent", state: "running", step: "writing", attempt: 2 }), store: resumeStore, calculateFacts, callModel: resumeCall, judgeCall });
assert.equal(resumeCall.count(), 6, "Resume must skip the completed unit and make two writer calls for each of three remaining units.");

const retryStore = createMemoryStore();
retryStore.claimJobs = async () => [authorizedJob({ id: "retry-job", report_id: "retry-report", entitlement_id: "retry-ent", state: "running", step: "writing", attempt: 1 })];
retryStore.reports.set("retry-report", { ...structuredClone(resumeReport), id: "retry-report", fulfillment_status: "writing" });
retryStore.entitlements.set("retry-ent", { id: "retry-ent", user_id: "resume-user", status: "active", product_key: "general_1_month" });
let retryPatch = null;
retryStore.updateJob = async (_id, patch) => { retryPatch = patch; };
await runReportFulfillmentBatch({ workerId: "fixture-worker", store: retryStore, calculateFacts, callModel: modelCallWithCrash(1), judgeCall });
assert.equal(retryPatch.state, "retry", "Transient model failures remain resumable until the job cap.");

const adminSource = fs.readFileSync(new URL("../api/admin/report-fulfillment.ts", import.meta.url), "utf8");
assert.ok(!/edit(?:_|\s|-)?prose|update(?:_|\s|-)?body/iu.test(adminSource), "The exception dashboard must not add a prose-editing path.");
for (const actionName of ["grant_comp", "authorize_generation", "revoke_comp"]) assert.ok(adminSource.includes(`body.action === "${actionName}"`));
const adminPanelSource = fs.readFileSync(new URL("../apps/admin/src/ReportFulfillmentAdminPanel.tsx", import.meta.url), "utf8");
for (const label of ["Grant report", "Authorize ", "Revoke comp"]) assert.ok(adminPanelSource.includes(label));
for (const route of ["../api/report-checkout.ts", "../api/report-customer-portal.ts"]) {
  const source = fs.readFileSync(new URL(route, import.meta.url), "utf8");
  assert.match(source, /if \(!process\.env\.STRIPE_SECRET_KEY\) return sendJson\(res, 503, \{ configured: false,/u, `${route} must fail cleanly when Stripe is absent.`);
}

console.log("Report fulfillment passed: comp grant/revoke, log-only mail, relative links, per-call authorization, 16 active SKUs, mocked comp E2E to needs_review, shared facts, crash resume, retry queue, and no-edit admin contract.");
