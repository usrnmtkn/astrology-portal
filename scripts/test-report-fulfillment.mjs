import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import { REPORT_AUTOMATION_RULING_PATH, REPORT_AUTOMATION_RULING_VERSION, REPORT_SKUS, reportBillingMode, reportCallEstimate, reportFulfillmentConfig, reportSku } from "../api/_lib/report-fulfillment-config.ts";
import { assertReportTokenBudgets, processReportFulfillmentJob, ReportAssemblyRegenerationRequired, ReportPersistenceInfrastructureError, reportValidatorAttemptCap, runReportFulfillmentBatch } from "../api/_lib/report-fulfillment.ts";
import { createReportFulfillmentStore } from "../api/_lib/report-fulfillment-store.ts";
import { ReportBirthDataError, birthProfileFromPersistedData } from "../api/_lib/report-billing-window.ts";
import { ReportCalculationApiClientError } from "../api/_lib/report-facts.ts";
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
  mergeOverlappingReportDefects, reportValidationIssuesToNamedDefects,
  reviseReportDraftForNamedDefects, runReportWriterChain, spliceReportRevision
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
assert.equal(birthProfileFromPersistedData({ profile: { charts: [{
  birthDate: "1979-02-18", birthTime: "11:20 aM",
  birthLocation: { label: "New York", latitude: 40.7, longitude: -74, timeZone: "America/New_York" },
  natalChart: { ascendantLongitude: 71.15, midheavenLongitude: 316.6 }
}] } }).birthTime, "11:20", "Fulfillment must normalize legacy human birth times before any calculation payload.");
assert.deepEqual(birthProfileFromPersistedData({ profile: { charts: [{
  birthDate: "1979-02-18", birthTime: "11:20",
  birthLocation: { label: "New York", latitude: 40.7, longitude: -74, timeZone: "America/New_York" },
  natalChart: { ascendantLongitude: 71.15, midheavenLongitude: 316.6 }
}] } }).natalPointLongitudes, { Ascendant: 71.15, Midheaven: 316.6 },
"Fulfillment must carry verified stored natal angles into the single report calculation source.");
delete process.env.REPORT_BILLING_MODE;
assert.equal(reportBillingMode(), "free_test");
process.env.REPORT_BILLING_MODE = "stripe";
assert.equal(reportBillingMode(), "stripe");
delete process.env.REPORT_BILLING_MODE;

process.env.REPORT_AUTO_PUBLISH = "true";
delete process.env.REPORT_AUTOMATION_OWNER_RULING_VERSION;
assert.equal(reportCallEstimate("12_months").redundancyPassCalls, 1);
assert.equal(reportCallEstimate("12_months").coldReadCalls, 11);
assert.equal(reportCallEstimate("12_months").expectedCallBudget, 56);
assert.equal(reportCallEstimate("12_months").safetyMarginCalls, 11);
assert.equal(reportCallEstimate("12_months").recommendedCallBudget, 67);
assert.equal(reportFulfillmentConfig().authorizationTokenBudget, 1_450_000);
assert.equal(reportFulfillmentConfig().reportLifetimeTokenBudget, 1_450_000);
assert.equal(reportFulfillmentConfig().workerBatchSize, 1, "The 300-second worker may claim only one report per invocation.");
assert.equal(reportFulfillmentConfig().workerMaxNewUnitsPerCycle, 1, "A worker cycle must finish and persist one new unit before yielding.");
assert.equal(reportFulfillmentConfig().workerCycleDeadlineMs, 240_000, "The worker must reserve 60 seconds before Vercel's hard timeout.");
assert.equal(reportValidatorAttemptCap({ validator_attempt_overrides: { summer: 5 } }, "summer", 3), 5,
  "Report 74951c07's Summer override must add two attempts to the governed cap of three.");
assert.equal(reportValidatorAttemptCap({ validator_attempt_overrides: { summer: 5 } }, "spring", 3), 3,
  "The Summer recovery override must not alter any other unit.");
const validatorRecoveryMigration = fs.readFileSync(new URL(
  "../apps/web/supabase/migrations/20260811140000_report_validator_splice_recovery.sql",
  import.meta.url
), "utf8");
for (const governedValue of [
  "authorized_call_budget = 85",
  "authorized_token_budget = 4000000",
  "token_budget_lifetime = 6000000",
  "authorization_call_count = 43",
  "authorization_token_count = 2081764",
  "validator_attempt_overrides->>'summer' = '5'"
]) assert.ok(validatorRecoveryMigration.includes(governedValue), `Recovery migration must pin ${governedValue}.`);
assert.match(validatorRecoveryMigration, /authorization_token = existing_authorization/u,
  "The recovery migration must preserve the current one-use authorization identity.");
assert.match(validatorRecoveryMigration,
  /if not exists \([\s\S]*public\.user_reports[\s\S]*and not exists \([\s\S]*public\.report_fulfillment_jobs[\s\S]*then[\s\S]*return;/u,
  "A clean database without either Production recovery row must apply the schema portion and skip only the report-specific recovery.");
assert.doesNotThrow(() => assertReportTokenBudgets({
  authorizationTokenCount: 793_038,
  authorizationTokenBudget: 2_500_000,
  lifetimeTokenCount: 2_050_321,
  lifetimeTokenBudget: 4_500_000
}), "Report 74951c07's exact post-timeout ledger state must pass under the owner-raised scoped and lifetime budgets.");
assert.throws(() => assertReportTokenBudgets({
  authorizationTokenCount: 2_500_001,
  authorizationTokenBudget: 2_500_000,
  lifetimeTokenCount: 3_757_284,
  lifetimeTokenBudget: 4_500_000
}), /Authorization token budget exceeded/u);
assert.throws(() => assertReportTokenBudgets({
  authorizationTokenCount: 793_038,
  authorizationTokenBudget: 2_500_000,
  lifetimeTokenCount: 4_500_001,
  lifetimeTokenBudget: 4_500_000
}), /Report lifetime token budget exceeded/u);
assert.equal(reportModelPricing().version, "2026-08-10");
assert.equal(estimateReportModelCost("gpt-5.6-sol", { inputTokens: 1_000_000, outputTokens: 0, totalTokens: 1_000_000 }), 5);
assert.equal(estimateReportPlanningProfile("12_months").totalTokens, 1_222_200);
assert.equal(estimateReportPlanningProfile("12_months").estimatedCostUsd, 6.9805);
assert.equal(estimateReportPlanningProfile("12_months").operationsPerReport[0].stage, "assembled_redundancy");
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

const summerOverlapDraft = {
  ...draft,
  body: "SUMMER_FIRST. SUMMER_SHARED. SUMMER_THIRD. SUMMER_UNNAMED."
};
const summerOverlapDefects = [
  { id: "defect-2", category: "density_violation", location: "body", sentence_index: 0, scope_start: 0, scope_end: 1, quote: "SUMMER_FIRST. SUMMER_SHARED.", evidence: "FIXTURE_ONLY_MENU", evidence_ids: [], instruction: "Reduce to at most five items." },
  { id: "defect-3", category: "owner_voice_drift", location: "body", sentence_index: 1, scope_start: 1, scope_end: 2, quote: "SUMMER_SHARED. SUMMER_THIRD.", evidence: "FIXTURE_ONLY_VOICE", evidence_ids: ["FIXTURE_ONLY_OWNER"], instruction: "Restore the supported owner register." }
];
const mergedSummerDefects = mergeOverlappingReportDefects(summerOverlapDraft, summerOverlapDefects);
assert.equal(mergedSummerDefects.length, 1, "Summer's defect-3 overlap must become one deterministic replacement scope.");
assert.deepEqual({
  id: mergedSummerDefects[0].id,
  location: mergedSummerDefects[0].location,
  start: mergedSummerDefects[0].scope_start,
  end: mergedSummerDefects[0].scope_end,
  quote: mergedSummerDefects[0].quote
}, {
  id: "merged:defect-2+defect-3",
  location: "body",
  start: 0,
  end: 2,
  quote: "SUMMER_FIRST. SUMMER_SHARED. SUMMER_THIRD."
});
assert.match(mergedSummerDefects[0].instruction, /defect-2:density_violation[\s\S]*defect-3:owner_voice_drift/u,
  "The merged Summer scope must carry both original instructions.");
const summerOverlapSpliced = spliceReportRevision(summerOverlapDraft, mergedSummerDefects, { replacements: [{
  defect_id: "merged:defect-2+defect-3", location: "body", scope_start: 0, scope_end: 2,
  replacement: "SUMMER_COMBINED_REPLACEMENT."
}] });
assert.equal(summerOverlapSpliced.body, "SUMMER_COMBINED_REPLACEMENT. SUMMER_UNNAMED.",
  "The merged replacement must leave Summer's unnamed sentence byte-identical.");

const productionSummerDraft = {
  headline: "An application may be pending.",
  tldr: "An application may need an answer.",
  summary: "An application may move this season.",
  body: "The August 12 solar eclipse falls in your third house, so an announcement, application, piece of writing, class, contract, conversation, or decision may need an answer from someone else. A class, contract, announcement, or piece of writing may need clearer terms before it moves forward.",
  action: "", timing: "", sections: []
};
const productionSummerIssues = [
  { code: "lexical_budget", message: "application exceeds the configured lexical budget." },
  { code: "menu_size", message: "Manifestation menu exceeds five items: The August 12 solar eclipse falls in your third house, so an announcement, application, piece of writing, class, contract, conversation, or decision may need an answer from someone else." },
  { code: "menu_size", message: "Manifestation menu exceeds five items: A class, contract, announcement, or piece of writing may need clearer terms before it moves forward." }
];
const productionSummerValidatorDefects = reportValidationIssuesToNamedDefects(productionSummerDraft, productionSummerIssues);
assert.equal(productionSummerValidatorDefects.length, 3);
assert.ok(productionSummerValidatorDefects.every((defect) => defect.quote && productionSummerDraft.body.includes(defect.quote)),
  "Every Summer validator finding must quote and scope an actual sentence from the failed unit.");
assert.match(productionSummerValidatorDefects.find((defect) => defect.id.includes("lexical_budget")).instruction, /Replace the over-budget noun 'application'/u);
assert.ok(productionSummerValidatorDefects.filter((defect) => defect.id.includes("menu_size"))
  .every((defect) => defect.instruction.startsWith("Reduce the quoted sentence to at most five items.")));
assert.equal(mergeOverlappingReportDefects(productionSummerDraft, productionSummerValidatorDefects).length, 2,
  "The lexical and menu findings on Summer's first sentence must share one replacement; the second sentence remains separately scoped.");

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
const summerOverlapSchemas = [];
const summerOverlapRevision = await reviseReportDraftForNamedDefects({
  payload: spliceChainPayload,
  draft: summerOverlapDraft,
  defects: summerOverlapDefects,
  callModel: async (input) => {
    summerOverlapSchemas.push(input.schemaName);
    assert.match(input.prompt, /merged:defect-2\+defect-3/u);
    assert.match(input.prompt, /Reduce to at most five items\.[\s\S]*Restore the supported owner register\./u);
    return {
      value: { replacements: [{
        defect_id: "merged:defect-2+defect-3", location: "body", scope_start: 0, scope_end: 2,
        replacement: "SUMMER_COMBINED_REPLACEMENT."
      }] },
      model: input.model, provider: input.provider,
      usage: { inputTokens: 1, outputTokens: 1, totalTokens: 2 }
    };
  }
});
assert.deepEqual(summerOverlapSchemas, ["report_unit_revision_spans"], "Merged defects must cost one splice call, not one call per finding.");
assert.equal(summerOverlapRevision.revised.body, "SUMMER_COMBINED_REPLACEMENT. SUMMER_UNNAMED.");
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
  if (input.schemaName === "report_unit_cold_read") {
    assert.match(input.prompt, /RENDERED_UNIT/u);
    assert.doesNotMatch(input.prompt, /UNIT_FACTS|CANONICAL_PROMPT|OWNER_COMPARISON_SET|VALIDATOR_RESULTS/u);
  }
  const value = input.schemaName === "report_unit_draft" ? spliceChainDraft
    : input.schemaName === "report_unit_critique" ? { result: "defects", applicability: { interpretive_movement: "not_applicable", reason: "FIXTURE_ONLY" }, defects: spliceChainDefects }
      : input.schemaName === "report_unit_cold_read" ? { result: "no_defects", applicability: { interpretive_movement: "not_applicable", reason: "FIXTURE_ONLY" }, defects: [] }
      : { replacements: [
        { defect_id: "chain-body", location: "body", scope_start: 0, scope_end: 0, replacement: "FIXTURE_ONLY_REPLACED." },
        { defect_id: "chain-timing", location: "timing", scope_start: 0, scope_end: 0, replacement: "FIXTURE_ONLY_NEW_TIMING." }
      ] };
  return { value, model: input.model, provider: input.provider, usage: { inputTokens: 1, outputTokens: 1, totalTokens: 2 } };
} });
assert.deepEqual(spliceChainSchemas, ["report_unit_draft", "report_unit_critique", "report_unit_revision_spans", "report_unit_cold_read"], "All named defects must be revised in one span-only call before the final cold read.");
assert.equal(spliceChain.revised.body, "FIXTURE_ONLY_REPLACED. FIXTURE_ONLY_SECOND.");
assert.equal(spliceChain.revised.summary, spliceChainDraft.summary, "The writer chain must keep unnamed text byte-identical.");
assert.equal(spliceChain.coldCritique.result, "no_defects");
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
assert.deepEqual(authorization, { authorized: true, callBudget: 44, tokenBudget: 1_450_000, jobId: "comp-job-1" });
const jobAuthorization = authorizationUpdates.find((entry) => entry.table === "report_fulfillment_jobs").patch;
assert.match(jobAuthorization.authorization_token, /^[0-9a-f-]{36}$/u);
assert.equal(jobAuthorization.authorized_call_budget, 44);
assert.equal(jobAuthorization.authorization_call_count, 0);
assert.equal(jobAuthorization.authorized_token_budget, 1_450_000);
assert.equal(jobAuthorization.authorization_token_count, 0);
assert.equal("model_call_count" in jobAuthorization, false, "A new authorization must not reset immutable lifetime call numbering.");
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

const productionShapedUnitWrites = [];
const productionShapedStore = createReportFulfillmentStore({
  async insert(table, row, options) {
    productionShapedUnitWrites.push({ table, row, options });
    return [{ id: "9188ad58-5a3b-4b6d-9474-b2ff67279ec9", ...row }];
  }
});
await productionShapedStore.saveUnit({
  id: "74951c07-64fe-461d-ac49-e81858af3296",
  user_id: "97965306-21fd-481a-8bf2-7d271ab76c8b",
  subject_id: null,
  report_domain: "general",
  report_horizon: "12_months",
  period_start: "2026-02-18",
  period_end: "2027-02-17",
  facts: { schema: "tldrastro.report-facts.v1", source: "FIXTURE_ONLY_PRODUCTION_SHAPE" },
  facts_engine: "tldrastro-api@FIXTURE_ONLY",
  facts_hash: "FIXTURE_ONLY_FACTS_HASH",
  fulfillment_status: "judging",
  prompt_versions: {},
  token_count: 0,
  token_count_total: 0,
  token_spend_usd_estimate: 0,
  attempt_counts: { validator: 0, judge: 0 },
  failure_history: []
}, "overview", {
  headline: "FIXTURE_ONLY_HEADLINE.",
  tldr: "FIXTURE_ONLY_TLDR.",
  summary: "FIXTURE_ONLY_SUMMARY.",
  body: "FIXTURE_ONLY_BODY.",
  action: "FIXTURE_ONLY_ACTION.",
  timing: "FIXTURE_ONLY_TIMING.",
  sections: []
}, {
  fulfillmentPassed: true,
  validatorResults: [],
  judge: { scores: Object.fromEntries(REPORT_JUDGE_CATEGORIES.map((category) => [category, 4])), overall: 1, verdict: "pass", findings: [] },
  promptVersions: { judge: "report-judge-v3.1" },
  factsHash: "FIXTURE_ONLY_FACTS_HASH",
  attemptCounts: { validator: 1, judge: 1 }
});
assert.equal(productionShapedUnitWrites.length, 1);
assert.equal(productionShapedUnitWrites[0].table, "user_generated_interpretations");
assert.equal(
  productionShapedUnitWrites[0].options.onConflict,
  "user_id,subject_type,subject_id,content_key,target_date,mode",
  "The report-unit upsert must name the governed Production unique constraint exactly."
);
assert.deepEqual({
  user_id: productionShapedUnitWrites[0].row.user_id,
  subject_type: productionShapedUnitWrites[0].row.subject_type,
  subject_id: productionShapedUnitWrites[0].row.subject_id,
  content_key: productionShapedUnitWrites[0].row.content_key,
  target_date: productionShapedUnitWrites[0].row.target_date,
  mode: productionShapedUnitWrites[0].row.mode
}, {
  user_id: "97965306-21fd-481a-8bf2-7d271ab76c8b",
  subject_type: "report_unit",
  subject_id: "74951c07-64fe-461d-ac49-e81858af3296",
  content_key: "report:74951c07-64fe-461d-ac49-e81858af3296:overview",
  target_date: "2026-02-18",
  mode: "report"
}, "The regression write must retain the full Production-shaped conflict identity.");

function createMemoryStore() {
  const reports = new Map();
  const entitlements = new Map();
  const units = new Map();
  const facts = new Map();
  const jobs = new Map();
  return {
    reports, entitlements, units, facts, jobs,
    async claimJobs() { return []; },
    async claimJob() { return []; },
    async workerPaused() { return false; },
    async report(id) { return reports.get(id) ?? null; },
    async entitlement(id) { return entitlements.get(id) ?? null; },
    async updateReport(id, patch) { Object.assign(reports.get(id), patch); },
    async updateEntitlement(id, patch) { Object.assign(entitlements.get(id), patch); },
    async updateJob(id, patch) {
      const current = jobs.get(id) ?? {};
      Object.assign(current, structuredClone(patch));
      jobs.set(id, current);
    },
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
    async saveUnit(report, unitId, value, sourceSnapshot) { units.set(`${report.id}:${unitId}`, {
      id: `${report.id}:${unitId}`,
      content_key: `report:${report.id}:${unitId}`,
      headline: value.headline ?? "",
      summary: value.summary ?? "",
      body: value.body ?? "",
      sections: value.sections ?? [],
      source_snapshot: sourceSnapshot
    }); },
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
function fixtureUnitDraft(unitId) {
  const unitFingerprint = crypto.createHash("sha256").update(unitId).digest("hex").slice(0, 10).toUpperCase();
  return {
    headline: `FIXTURE_ONLY ${unitFingerprint} HEADLINE.`,
    tldr: `FIXTURE_ONLY ${unitFingerprint} TLDR.`,
    summary: `FIXTURE_ONLY ${unitFingerprint} SUMMARY.`,
    body: `FIXTURE_ONLY ${unitFingerprint} BODY.`,
    action: `FIXTURE_ONLY ${unitFingerprint} ACTION.`,
    timing: `FIXTURE_ONLY ${unitFingerprint} TIMING.`,
    sections: unitId === "key-dates" ? [{
      heading: "FIXTURE_ONLY SEASON",
      body: "FEB 18 · FIXTURE_ONLY TITLE · A supported event may require an answer. · FIXTURE_ONLY attribution."
    }] : []
  };
}
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
    if (input.schemaName === "report_unit_cold_read") {
      assert.match(input.prompt, /RENDERED_UNIT/u);
      assert.doesNotMatch(input.prompt, /UNIT_FACTS|CANONICAL_PROMPT|OWNER_COMPARISON_SET|VALIDATOR_RESULTS/u,
        "The final cold read must receive rendered prose only, never context that can rescue it.");
    }
    const unitId = /"unitId":\s*"([^"]+)"/u.exec(input.prompt)?.[1] ?? "fixture-unit";
    const uniqueDraft = fixtureUnitDraft(unitId);
    const result = {
      value: input.schemaName === "report_unit_critique" || input.schemaName === "report_unit_cold_read" ? {
        result: "no_defects",
        applicability: { interpretive_movement: "applicable", reason: "FIXTURE_ONLY" },
        defects: []
      } : input.schemaName === "report_redundancy_pass" ? {
        result: "no_findings",
        findings: []
      } : uniqueDraft,
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
  return {
    ...input,
    authorization_token: "fixture-authorization",
    authorized_call_budget: 1000,
    model_call_count: 0,
    authorization_call_count: 0,
    authorized_token_budget: 1_450_000,
    authorization_token_count: 0
  };
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

const preflightStore = createMemoryStore();
preflightStore.reports.set("preflight-report", {
  ...structuredClone([...store.reports.values()][0]), id: "preflight-report", user_id: "preflight-user",
  fulfillment_status: "queued", facts: {}, facts_engine: "pending", facts_hash: null
});
preflightStore.entitlements.set("preflight-ent", { id: "preflight-ent", user_id: "preflight-user", status: "active", source: "comp", product_key: "general_1m" });
let preflightClaimed = false;
preflightStore.claimFacts = async () => { preflightClaimed = true; return true; };
let preflightJobPatch = null;
preflightStore.updateJob = async (_id, patch) => { preflightJobPatch = patch; };
preflightStore.claimJobs = async () => [authorizedJob({
  id: "preflight-job", report_id: "preflight-report", entitlement_id: "preflight-ent",
  state: "running", step: "calculating", attempt: 1
})];
const unavailableCalculation = Object.assign(async (report) => calculateFacts(report), {
  async preflight() {
    throw new Error("CALCULATION_API_PREFLIGHT_FAILED: POST /timing/report-window contract probe returned 404; expected 422 for an intentionally incomplete payload.");
  }
});
const preflightBatch = await runReportFulfillmentBatch({
  workerId: "preflight-worker", store: preflightStore, calculateFacts: unavailableCalculation,
  callModel: modelCallWithCrash(), judgeCall
});
assert.equal(preflightClaimed, false, "The calculation API preflight must run before a facts-window claim.");
assert.equal(preflightBatch.processed[0].retryable, false, "A missing calculation endpoint must fail terminally without retries.");
assert.equal(preflightJobPatch.state, "exception");
assert.match(preflightJobPatch.last_error, /CALCULATION_API_PREFLIGHT_FAILED/u);

const malformedBirthStore = createMemoryStore();
malformedBirthStore.reports.set("malformed-birth-report", {
  ...structuredClone([...store.reports.values()][0]), id: "malformed-birth-report", user_id: "malformed-user",
  fulfillment_status: "queued", facts: {}, facts_engine: "pending", facts_hash: null, failure_history: []
});
malformedBirthStore.entitlements.set("malformed-birth-ent", {
  id: "malformed-birth-ent", user_id: "malformed-user", status: "active", product_key: "general_12m", requires_birth_time: true
});
let malformedClaimed = false;
malformedBirthStore.claimFacts = async () => { malformedClaimed = true; return true; };
let malformedJobPatch = null;
malformedBirthStore.updateJob = async (_id, patch) => { malformedJobPatch = patch; };
malformedBirthStore.claimJobs = async () => [authorizedJob({
  id: "malformed-birth-job", report_id: "malformed-birth-report", entitlement_id: "malformed-birth-ent",
  state: "running", step: "calculating", attempt: 1
})];
const malformedBirthCalculation = Object.assign(async () => { throw new Error("must not calculate"); }, {
  async preflight() { throw new ReportBirthDataError("BIRTH_DATA_INVALID", "Enter a valid birth time, such as 11:20 AM or 23:20."); }
});
const malformedBirthBatch = await runReportFulfillmentBatch({
  workerId: "malformed-birth-worker", store: malformedBirthStore, calculateFacts: malformedBirthCalculation,
  callModel: modelCallWithCrash(), judgeCall
});
assert.equal(malformedClaimed, false, "Malformed birth data must stop before a facts-window claim.");
assert.equal(malformedBirthBatch.processed[0].retryable, false);
assert.equal(malformedBirthStore.reports.get("malformed-birth-report").fulfillment_status, "awaiting_birth_data");
assert.equal(malformedBirthStore.entitlements.get("malformed-birth-ent").status, "awaiting_birth_data");
assert.equal(malformedJobPatch.state, "paused");
assert.match(malformedJobPatch.last_error, /^BIRTH_DATA_INVALID:/u);

const clientErrorStore = createMemoryStore();
clientErrorStore.reports.set("client-error-report", {
  ...structuredClone([...store.reports.values()][0]), id: "client-error-report", user_id: "client-error-user",
  fulfillment_status: "queued", facts: {}, facts_engine: "pending", facts_hash: null, failure_history: []
});
clientErrorStore.entitlements.set("client-error-ent", {
  id: "client-error-ent", user_id: "client-error-user", status: "active", product_key: "general_12m", requires_birth_time: true
});
let clientErrorReleased = 0;
clientErrorStore.releaseFactsClaim = async () => { clientErrorReleased += 1; };
let clientErrorJobPatch = null;
clientErrorStore.updateJob = async (_id, patch) => { clientErrorJobPatch = patch; };
clientErrorStore.claimJobs = async () => [authorizedJob({
  id: "client-error-job", report_id: "client-error-report", entitlement_id: "client-error-ent",
  state: "running", step: "calculating", attempt: 1
})];
const deterministicClientFailure = Object.assign(async () => {
  throw new ReportCalculationApiClientError(400, { code: "BAD_REQUEST", message: "FIXTURE_ONLY" });
}, { async preflight() {} });
const clientErrorBatch = await runReportFulfillmentBatch({
  workerId: "client-error-worker", store: clientErrorStore, calculateFacts: deterministicClientFailure,
  callModel: modelCallWithCrash(), judgeCall
});
assert.equal(clientErrorBatch.processed[0].retryable, false, "Deterministic 4xx calculation failures must never enter the retry loop.");
assert.equal(clientErrorJobPatch.state, "exception");
assert.match(clientErrorJobPatch.last_error, /^CALCULATION_API_CLIENT_ERROR:/u);
assert.equal(clientErrorReleased, 1, "A failed calculation must release its facts-window claim immediately.");

const immediateStore = createMemoryStore();
let claimedImmediateJob = null;
immediateStore.claimJob = async (workerId, jobId) => { claimedImmediateJob = { workerId, jobId }; return []; };
await runReportFulfillmentBatch({
  workerId: "authorize-doorbell", jobId: "authorized-job-id", store: immediateStore,
  calculateFacts, callModel: modelCallWithCrash(), judgeCall
});
assert.deepEqual(claimedImmediateJob, { workerId: "authorize-doorbell", jobId: "authorized-job-id" }, "Authorize pickup must target the newly authorized job.");

const deadlineStore = createMemoryStore();
const deadlineReport = {
  id: "deadline-report", user_id: "deadline-user", subject_id: null, report_domain: "general", report_horizon: "1_month",
  period_start: frozen.startsAt.slice(0, 10), period_end: "2026-03-18", facts: {}, facts_engine: "pending", facts_hash: null,
  fulfillment_status: "queued", prompt_versions: {}, token_count: 0, token_count_total: 0,
  attempt_counts: { validator: 0, judge: 0 }, failure_history: [], status: "draft"
};
const deadlineJob = authorizedJob({
  id: "deadline-job", report_id: deadlineReport.id, entitlement_id: "deadline-ent",
  state: "running", step: "writing", attempt: 1, locked_at: "2026-08-11T06:10:48Z", locked_by: "fixture-worker"
});
deadlineStore.reports.set(deadlineReport.id, deadlineReport);
deadlineStore.entitlements.set("deadline-ent", { id: "deadline-ent", user_id: "deadline-user", status: "active", product_key: "general_1m" });
deadlineStore.jobs.set(deadlineJob.id, structuredClone(deadlineJob));
const deadlineModel = modelCallWithCrash();
const deadlineResult = await processReportFulfillmentJob({
  job: deadlineJob,
  store: deadlineStore,
  calculateFacts,
  callModel: deadlineModel,
  judgeCall,
  continuationPolicy: { deadlineAtMs: 240_000, maxNewUnits: 1, now: () => 120_000 }
});
assert.equal(deadlineResult.status, "queued", "A deadline-aware cycle must yield instead of starting a second incomplete unit.");
assert.equal(deadlineResult.continuation, true);
assert.equal(deadlineStore.units.size, 1, "The current unit must be fully persisted before the worker yields.");
assert.ok(deadlineStore.units.has("deadline-report:overview"));
assert.equal(deadlineModel.count(), 3, "Yielding at a unit boundary must include the closing cold read and must not add or interrupt calls after persistence.");
assert.deepEqual({
  state: deadlineStore.jobs.get(deadlineJob.id).state,
  step: deadlineStore.jobs.get(deadlineJob.id).step,
  lockedAt: deadlineStore.jobs.get(deadlineJob.id).locked_at,
  lockedBy: deadlineStore.jobs.get(deadlineJob.id).locked_by,
  lastError: deadlineStore.jobs.get(deadlineJob.id).last_error
}, { state: "queued", step: "writing", lockedAt: null, lockedBy: null, lastError: null }, "The persisted job must be immediately claimable by the next scheduled cycle.");

const validatorRepairStore = createMemoryStore();
const validatorRepairReport = {
  ...structuredClone(deadlineReport),
  id: "validator-repair-report",
  user_id: "validator-repair-user",
  fulfillment_status: "queued"
};
const validatorRepairJob = authorizedJob({
  id: "validator-repair-job", report_id: validatorRepairReport.id, entitlement_id: "validator-repair-ent",
  state: "running", step: "writing", attempt: 1
});
validatorRepairStore.reports.set(validatorRepairReport.id, validatorRepairReport);
validatorRepairStore.entitlements.set("validator-repair-ent", {
  id: "validator-repair-ent", user_id: validatorRepairReport.user_id, status: "active", product_key: "general_1m"
});
validatorRepairStore.jobs.set(validatorRepairJob.id, structuredClone(validatorRepairJob));
const validatorRepairSchemas = [];
const validatorRepairModel = async (input) => {
  const attempt = { provider: input.provider, model: input.model, schemaName: input.schemaName };
  validatorRepairSchemas.push(input.schemaName);
  await input.beforeProviderCall?.(attempt);
  let value;
  if (input.schemaName === "report_unit_draft") {
    value = {
      ...modelDraft,
      body: "You may submit an application. You may revise an application. You may discuss an application. You may replace an application."
    };
  } else if (input.schemaName === "report_unit_critique" || input.schemaName === "report_unit_cold_read") {
    value = { result: "no_defects", applicability: { interpretive_movement: "applicable", reason: "FIXTURE_ONLY" }, defects: [] };
  } else {
    assert.match(input.prompt, /validator-1-1-lexical_budget/u);
    assert.match(input.prompt, /Replace the over-budget noun 'application'/u);
    value = { replacements: [{
      defect_id: "validator-1-1-lexical_budget", location: "body", scope_start: 3, scope_end: 3,
      replacement: "You may replace a proposal."
    }] };
  }
  const result = { value, model: input.model, provider: input.provider, usage: { inputTokens: 1, outputTokens: 1, totalTokens: 2 } };
  await input.afterProviderCall?.(attempt, result);
  return result;
};
const validatorRepairResult = await processReportFulfillmentJob({
  job: validatorRepairJob,
  store: validatorRepairStore,
  calculateFacts,
  callModel: validatorRepairModel,
  judgeCall,
  continuationPolicy: { deadlineAtMs: 240_000, maxNewUnits: 1, now: () => 120_000 }
});
assert.equal(validatorRepairResult.status, "queued");
assert.deepEqual(validatorRepairSchemas, ["report_unit_draft", "report_unit_critique", "report_unit_cold_read", "report_unit_revision_spans"],
  "A deterministic validator failure must re-enter as one named splice, never a second whole-unit draft.");
assert.match(validatorRepairStore.units.get("validator-repair-report:overview").body, /replace a proposal/u);
assert.doesNotMatch(validatorRepairStore.units.get("validator-repair-report:overview").body, /replace an application/u);

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
const crashCall = modelCallWithCrash(4);
await assert.rejects(processReportFulfillmentJob({ job: authorizedJob({ id: "resume-job", report_id: resumeReport.id, entitlement_id: "resume-ent", state: "running", step: "writing", attempt: 1 }), store: resumeStore, calculateFacts, callModel: crashCall, judgeCall }), /FIXTURE_ONLY_CRASH/u);
assert.ok(resumeStore.units.has("resume-report:overview"));
const resumeCall = modelCallWithCrash();
await processReportFulfillmentJob({ job: authorizedJob({ id: "resume-job", report_id: resumeReport.id, entitlement_id: "resume-ent", state: "running", step: "writing", attempt: 2 }), store: resumeStore, calculateFacts, callModel: resumeCall, judgeCall });
assert.equal(resumeCall.count(), 10, "Resume must skip the completed unit, make draft, critique, and cold-read calls for each of three remaining units, and run one report-level redundancy pass.");

function assemblyReadyReport(id) {
  return {
    ...structuredClone(resumeReport),
    id,
    facts: factsForHorizon("1_month"),
    facts_engine: "FIXTURE_ONLY_ENGINE",
    facts_hash: "FIXTURE_ONLY_FACTS_HASH",
    fulfillment_status: "validating",
    token_count: 0,
    token_count_total: 0,
    token_spend_usd_estimate: 0,
    attempt_counts: { validator: 0, judge: 0 }
  };
}

async function seedAssemblyUnits(targetStore, report, bodyByUnit = {}) {
  for (const [index, unitId] of ["overview", "what-matters-most", "domain:main", "key-dates"].entries()) {
    const marker = `${index + 1}${index + 1}${index + 1}`;
    await targetStore.saveUnit(report, unitId, {
      headline: `FIXTURE ${marker} HEADING.`,
      tldr: `FIXTURE ${marker} TLDR.`,
      summary: `A distinct summary belongs to marker ${marker}.`,
      body: bodyByUnit[unitId] ?? `A distinct body consequence belongs to marker ${marker}.`,
      action: `A distinct action belongs to marker ${marker}.`,
      timing: `A distinct timing note belongs to marker ${marker}.`,
      sections: unitId === "key-dates" ? [{
        heading: "FIXTURE KEY DATES",
        body: "FEB 18 · FIXTURE TITLE · A supported event may require an answer. · FIXTURE attribution."
      }] : []
    }, {
      fulfillmentPassed: true,
      validatorResults: [],
      judge: { scores: passingJudgeScores, overall: 1, verdict: "pass", findings: [] },
      promptVersions: { judge: "report-judge-v3.1" },
      factsHash: report.facts_hash,
      attemptCounts: { validator: 1, judge: 1 }
    });
  }
}

const structuralStore = createMemoryStore();
const structuralReport = assemblyReadyReport("structural-report");
structuralStore.reports.set(structuralReport.id, structuralReport);
structuralStore.entitlements.set("structural-ent", { id: "structural-ent", user_id: structuralReport.user_id, status: "active", product_key: "general_1m" });
const repeatedClose = "The same closing sentence must not appear in two report units.";
await seedAssemblyUnits(structuralStore, structuralReport, { overview: repeatedClose, "what-matters-most": repeatedClose });
const structuralModel = modelCallWithCrash();
await assert.rejects(processReportFulfillmentJob({
  job: authorizedJob({ id: "structural-job", report_id: structuralReport.id, entitlement_id: "structural-ent", state: "running", step: "validating", attempt: 1 }),
  store: structuralStore, calculateFacts, callModel: structuralModel, judgeCall
}), (error) => error instanceof ReportAssemblyRegenerationRequired && error.issues.some((entry) => entry.code === "repeated_exact_sentence"));
assert.equal(structuralModel.count(), 0, "Deterministic assembly defects must fail before a report-level provider call.");
assert.equal(structuralStore.units.get("structural-report:overview").source_snapshot.fulfillmentPassed, true);
assert.equal(structuralStore.units.get("structural-report:what-matters-most").source_snapshot.fulfillmentPassed, false,
  "Only the implicated repeated unit should re-enter its writer chain.");
assert.notEqual(structuralStore.reports.get(structuralReport.id).fulfillment_status, "needs_review");

const redundancyStore = createMemoryStore();
const redundancyReport = assemblyReadyReport("redundancy-report");
redundancyStore.reports.set(redundancyReport.id, redundancyReport);
redundancyStore.entitlements.set("redundancy-ent", { id: "redundancy-ent", user_id: redundancyReport.user_id, status: "active", product_key: "general_1m" });
await seedAssemblyUnits(redundancyStore, redundancyReport);
let redundancyProviderCalls = 0;
const redundancyFindingCall = async (input) => {
  redundancyProviderCalls += 1;
  const attempt = { provider: input.provider, model: input.model, schemaName: input.schemaName };
  await input.beforeProviderCall?.(attempt);
  assert.equal(input.schemaName, "report_redundancy_pass");
  const quote = "A distinct body consequence belongs to marker 222.";
  const result = {
    value: {
      result: "findings",
      findings: [{
        id: "fixture-semantic-repeat", category: "semantic_duplication", unit_id: "what-matters-most",
        related_unit_ids: ["overview"], location: "body", sentence_index: 0, scope_start: 0, scope_end: 0,
        quote, evidence: "FIXTURE_ONLY supported comparison evidence.", instruction: "FIXTURE_ONLY regenerate the named unit without repeating the overview job."
      }]
    },
    model: input.model, provider: input.provider,
    usage: { inputTokens: 1, outputTokens: 1, totalTokens: 2 }
  };
  await input.afterProviderCall?.(attempt, result);
  return result;
};
await assert.rejects(processReportFulfillmentJob({
  job: authorizedJob({ id: "redundancy-job", report_id: redundancyReport.id, entitlement_id: "redundancy-ent", state: "running", step: "validating", attempt: 1 }),
  store: redundancyStore, calculateFacts, callModel: redundancyFindingCall, judgeCall
}), (error) => error instanceof ReportAssemblyRegenerationRequired && error.issues.some((entry) => entry.code === "report_semantic_duplication"));
assert.equal(redundancyProviderCalls, 1, "The report-level pass is one findings-only provider call.");
assert.equal(redundancyStore.units.get("redundancy-report:what-matters-most").source_snapshot.fulfillmentPassed, false);
assert.equal(redundancyStore.reports.get(redundancyReport.id).token_count, 2, "Accepted report-level evaluation tokens must remain accounted when a named unit is requeued.");
assert.notEqual(redundancyStore.reports.get(redundancyReport.id).fulfillment_status, "needs_review");

const persistenceStore = createMemoryStore();
const persistenceReport = {
  ...structuredClone(resumeReport),
  id: "persistence-report",
  user_id: "persistence-user",
  fulfillment_status: "queued",
  failure_history: []
};
const persistenceJob = authorizedJob({
  id: "persistence-job",
  report_id: persistenceReport.id,
  entitlement_id: "persistence-ent",
  state: "running",
  step: "writing",
  attempt: 1,
  passing_unit_cache: {}
});
persistenceStore.reports.set(persistenceReport.id, persistenceReport);
persistenceStore.entitlements.set("persistence-ent", {
  id: "persistence-ent",
  user_id: "persistence-user",
  status: "active",
  product_key: "general_1m"
});
persistenceStore.jobs.set(persistenceJob.id, structuredClone(persistenceJob));
const memorySaveUnit = persistenceStore.saveUnit.bind(persistenceStore);
let persistenceWrites = 0;
persistenceStore.saveUnit = async (...args) => {
  persistenceWrites += 1;
  if (args[1] === "overview" && persistenceWrites <= 3) {
    throw new Error("Supabase production-shaped write returned 503.");
  }
  return memorySaveUnit(...args);
};
const persistenceDelays = [];
const firstPersistenceModel = modelCallWithCrash();
let persistenceJudgeCalls = 0;
const countedPersistenceJudge = async (...args) => {
  persistenceJudgeCalls += 1;
  return judgeCall(...args);
};
persistenceStore.claimJobs = async () => [structuredClone(persistenceJob)];
const persistenceFailure = await runReportFulfillmentBatch({
  workerId: "persistence-worker-1",
  store: persistenceStore,
  calculateFacts,
  callModel: firstPersistenceModel,
  judgeCall: countedPersistenceJudge,
  persistenceRetry: { attempts: 3, baseDelayMs: 10, sleep: async (milliseconds) => { persistenceDelays.push(milliseconds); } }
});
assert.equal(firstPersistenceModel.count(), 3, "The gated overview, including its cold read, must be billed exactly once before its persistence failure.");
assert.equal(persistenceJudgeCalls, 1);
assert.deepEqual(persistenceDelays, [10, 20], "Persistence writes must use bounded exponential backoff.");
assert.equal(persistenceFailure.processed[0].retryable, true);
assert.equal(persistenceFailure.processed[0].failureClass, "infrastructure_persistence");
assert.match(persistenceFailure.processed[0].error, /^REPORT_INFRASTRUCTURE_ERROR: persistence failed for gated unit overview/u);
assert.equal(persistenceStore.jobs.get(persistenceJob.id).state, "retry");
const cachedOverview = persistenceStore.jobs.get(persistenceJob.id).passing_unit_cache.overview;
assert.equal(cachedOverview.schema, "report-passing-unit-cache.v1");
assert.deepEqual(cachedOverview.draft, fixtureUnitDraft("overview"), "The exact passing text must be durable in job state before the unit write.");
assert.deepEqual(cachedOverview.sourceSnapshot.judge.scores, passingJudgeScores, "The passing judge scores must be durable in job state.");

const secondPersistenceModel = modelCallWithCrash();
persistenceStore.claimJobs = async () => [{
  ...structuredClone(persistenceJob),
  ...structuredClone(persistenceStore.jobs.get(persistenceJob.id)),
  state: "running",
  attempt: 2
}];
const persistenceResume = await runReportFulfillmentBatch({
  workerId: "persistence-worker-2",
  store: persistenceStore,
  calculateFacts,
  callModel: secondPersistenceModel,
  judgeCall: countedPersistenceJudge,
  persistenceRetry: { attempts: 3, baseDelayMs: 10, sleep: async () => {} }
});
assert.equal(persistenceResume.processed[0].result.status, "needs_review");
assert.equal(secondPersistenceModel.count(), 10, "The retry must persist cached overview work without re-entering its writer chain, generate only three remaining units with cold reads, and run one report-level redundancy pass.");
assert.equal(firstPersistenceModel.count() + secondPersistenceModel.count(), 13, "Infrastructure retry must not add any calls above the clean four-unit path plus cold reads and its report-level redundancy pass.");
assert.equal(persistenceJudgeCalls, 4, "Infrastructure retry must not re-bill the cached overview judge.");
assert.deepEqual(persistenceStore.jobs.get(persistenceJob.id).passing_unit_cache, {}, "A cached unit clears only after its write and report accounting succeed.");
assert.deepEqual(persistenceStore.units.get("persistence-report:overview").source_snapshot.judge.scores, passingJudgeScores);
assert.equal(persistenceStore.units.get("persistence-report:overview").source_snapshot.writerReviews[0].coldCritique.result, "no_defects",
  "Persisted review evidence must include the context-free closing pass.");

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
for (const actionName of ["grant_comp", "authorize_generation", "revoke_comp", "set_lifetime_token_budget"]) assert.ok(adminSource.includes(`body.action === "${actionName}"`));
assert.ok(adminSource.includes("token_budget_lifetime"), "The owner-only admin endpoint must expose the adjustable lifetime token backstop.");
assert.ok(adminSource.includes('code: "ACTIVE_COMP_EXISTS"'), "Duplicate comp grants must return a stable, human-readable conflict code.");
assert.ok(adminSource.includes("status: 409"), "Duplicate comp grants must return HTTP 409.");
assert.ok(adminSource.includes("An active comp report already exists"), "Duplicate comp grants must explain that the existing queue row should be used.");
assert.ok(adminSource.includes("reportId: report?.id ?? null"), "Successful comp grants must identify the generated report row for UI focus.");
assert.ok(adminSource.includes("waitUntil(fetch(workerUrl"), "Authorize must ring an immediate worker cycle without removing the scheduled pickup.");
assert.ok(adminSource.includes("jobId=${encodeURIComponent(authorized.jobId)}"), "The immediate worker trigger must target the authorized job.");
const adminPanelSource = fs.readFileSync(new URL("../apps/admin/src/ReportFulfillmentAdminPanel.tsx", import.meta.url), "utf8");
for (const label of ["Grant report", "Authorize ", "Revoke comp", "Lifetime token cap", "Set cap"]) assert.ok(adminPanelSource.includes(label));
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

console.log("Report fulfillment passed: 16-key free-test catalog, Stripe fail-closed mode, direct comp grant/revoke, per-call authorization, deadline-aware one-unit worker continuation, Production-shaped unit upsert, durable passing-unit cache, persistence backoff without re-billing, mocked generation/judge/manual-release/log-only-delivery E2E, shared facts, crash resume, retry queue, and no-edit admin contract.");
