import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import { REPORT_AUTOMATION_RULING_PATH, REPORT_AUTOMATION_RULING_VERSION, REPORT_SKUS, reportBillingMode, reportCallEstimate, reportFulfillmentConfig, reportSku } from "../api/_lib/report-fulfillment-config.ts";
import { assertReportTokenBudgets, processReportFulfillmentJob, ReportPersistenceInfrastructureError, reportCallDurationEstimates, reportValidatorAttemptCap, runReportFulfillmentBatch } from "../api/_lib/report-fulfillment.ts";
import { createReportFulfillmentStore } from "../api/_lib/report-fulfillment-store.ts";
import { ReportBirthDataError, birthProfileFromPersistedData } from "../api/_lib/report-billing-window.ts";
import { ReportCalculationApiClientError } from "../api/_lib/report-facts.ts";
import { REPORT_JUDGE_CATEGORIES, reportJudgeOverall, reportJudgeVerdict } from "../api/_lib/report-judge.ts";
import { authorizeReportGeneration, createFreshReportGeneration, grantCompEntitlement, revokeEntitlement } from "../api/_lib/report-entitlements.ts";
import { verifyReportFactLock } from "../api/_lib/report-fact-lock.ts";
import { assembleDeterministicReportKeyDates } from "../api/_lib/report-key-dates.ts";
import { createReportMailProvider } from "../api/_lib/report-mail.ts";
import { reportUrl } from "../api/_lib/report-http.ts";
import { estimateReportModelCost, estimateReportPlanningProfile, reportModelPricing } from "../api/_lib/report-model-pricing.ts";
import {
  ReportModelResponseRejectedError,
  withReportModelResponseRetries
} from "../api/_lib/report-model-client.ts";
import { releaseReviewedReport } from "../api/_lib/report-release.ts";
import { verifyStripeWebhookSignature } from "../api/_lib/stripe-report-billing.ts";
import { assembleReportGenerationPayload, validateReportDraft } from "../api/_lib/report-generation.ts";
import {
  reportDraftMovementApplicable, reportUnitSentenceAddresses, sentenceAddressedReportUnit
} from "../api/_lib/report-evaluation-packet.ts";
import {
  assertReportOwnerVoiceEvidence,
  enforceReportRevisionStopRule, ReportRevisionScopeError, ReportStopRuleError,
  mergeOverlappingReportDefects, reportValidationIssuesToNamedDefects,
  normalizeReportColdReadCritique, reviseReportDraftForNamedDefects, runReportWriterChain, spliceReportRevision
} from "../api/_lib/report-writer-chain.ts";
import { validateAssembledReport, validateReportKeyDateFormat } from "../api/_lib/report-assembly.ts";

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
assert.equal(reportCallEstimate("12_months").redundancyPassCalls, 0);
assert.equal(reportCallEstimate("12_months").writerUnitCount, 10);
assert.equal(reportCallEstimate("12_months").coldReadCalls, 10);
assert.equal(reportCallEstimate("12_months").cleanPathCalls, 40);
assert.equal(reportCallEstimate("12_months").expectedCallBudget, 50);
assert.equal(reportCallEstimate("12_months").safetyMarginCalls, 10);
assert.equal(reportCallEstimate("12_months").recommendedCallBudget, 60);
assert.equal(reportFulfillmentConfig().authorizationTokenBudget, 1_450_000);
assert.equal(reportFulfillmentConfig().reportLifetimeTokenBudget, 1_450_000);
assert.equal(reportFulfillmentConfig().workerBatchSize, 1, "The 300-second worker may claim only one report per invocation.");
assert.equal(reportFulfillmentConfig().workerMaxNewUnitsPerCycle, 1, "A worker cycle must finish and persist one new unit before yielding.");
assert.equal(reportFulfillmentConfig().workerCycleDeadlineMs, 240_000, "The worker must reserve 60 seconds before Vercel's hard timeout.");
assert.equal(reportFulfillmentConfig().workerCallDurationDefaultMs, 60_000);
assert.equal(reportFulfillmentConfig().workerCallSafetyMarginMs, 90_000, "Every provider-call admission must retain the owner-ruled 90-second margin.");
assert.deepEqual(reportCallDurationEstimates([
  { schema_name: "report_unit_draft", created_at: "2026-08-11T21:21:00.000Z", completed_at: "2026-08-11T21:22:10.000Z" },
  { schema_name: "report_unit_draft", created_at: "2026-08-11T21:23:00.000Z", completed_at: "2026-08-11T21:24:45.000Z" },
  { schema_name: "report_unit_critique", created_at: "2026-08-11T21:20:00.000Z", completed_at: "2026-08-11T21:20:40.000Z" }
], 60_000), {
  report_unit_draft: { samples: 2, estimateMs: 105_000 },
  report_unit_critique: { samples: 1, estimateMs: 40_000 },
  __default__: { samples: 0, estimateMs: 60_000 }
}, "Call-type estimates must retain the longest immutable-ledger observation.");
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
assert.equal(reportModelPricing().version, "2026-08-13");
assert.equal(estimateReportModelCost("gpt-5.6-sol", { inputTokens: 1_000_000, outputTokens: 0, totalTokens: 1_000_000 }), 5);
assert.equal(estimateReportPlanningProfile("12_months").totalTokens, 1_190_200);
assert.equal(estimateReportPlanningProfile("12_months").estimatedCostUsd, 6.7705);
assert.deepEqual(estimateReportPlanningProfile("12_months").operationsPerReport, []);
delete process.env.REPORT_JUDGE_THRESHOLD;
assert.equal(reportFulfillmentConfig().judgeThreshold, 0.85, "V3.1 must default to the owner-approved 0.85 threshold.");
assert.equal(reportFulfillmentConfig().autoPublishEnabled, false, "Auto-publish requires the owner ruling version as well as its feature flag.");
process.env.REPORT_AUTOMATION_OWNER_RULING_VERSION = REPORT_AUTOMATION_RULING_VERSION;
assert.equal(reportFulfillmentConfig().autoPublishEnabled, true);
process.env.REPORT_AUTO_PUBLISH = "false";
delete process.env.REPORT_AUTOMATION_OWNER_RULING_VERSION;

const draft = { headline: "FIXTURE_ONLY.", body: "FIRST_SENTENCE. SECOND_SENTENCE.", sections: [] };
const namedRevision = { ...draft, body: "FIRST_SENTENCE. REVISED_SECOND_SENTENCE." };

const productionColdReadDefect1 = {
  result: "defects",
  applicability: { interpretive_movement: "applicable", reason: "The rendered key-dates unit contains multiple records." },
  defects: [{
    id: "defect-1",
    category: "owner_voice_drift",
    location: "body",
    sentence_index: 0,
    scope_start: 0,
    scope_end: 0,
    quote: "A supported key-date sentence.",
    evidence: "On a cold read, the sentence sounds assembled.",
    evidence_ids: [],
    instruction: "Replace only the named sentence."
  }]
};
assert.doesNotThrow(() => assertReportOwnerVoiceEvidence(productionColdReadDefect1, [], "cold_read"),
  "The recorded defect-1 cold-read payload is evidence by construction and must not require comparison passages.");
assert.throws(() => assertReportOwnerVoiceEvidence(productionColdReadDefect1, [], "context_aware_critique"),
  /defect-1 lacks eligible comparison evidence/u,
  "The same uncited owner-voice finding must still fail in the context-aware critique.");

const productionKeyDatesDraft = assembleDeterministicReportKeyDates({
  reportHorizon: "12_months",
  frozenFacts: {
    slowTransitArcs: [{
      id: "jupiter-conjunction-jupiter",
      transitPlanet: "Jupiter",
      natalPoint: "Jupiter",
      aspect: "conjunction",
      isReturn: true,
      passes: [{ motion: "direct", exactAt: "2026-07-04T15:07:02Z" }]
    }, {
      id: "jupiter-square-moon",
      transitPlanet: "Jupiter",
      natalPoint: "Moon",
      aspect: "square",
      isReturn: false,
      passes: [{ motion: "direct", exactAt: "2026-08-27T16:35:38Z" }]
    }],
    lunarEvents: [{
      id: "solar_eclipse-2026-08-12",
      kind: "solar_eclipse",
      occursAt: "2026-08-12T17:36:45Z",
      natalHouse: 3,
      natalContacts: []
    }]
  },
  sourceUnits: [{
    unitId: "summer",
    draft: {
      headline: "SUMMER: Your work reaches other people, but new opportunities strain your daily schedule",
      body: "Summer is when work you have been developing privately starts reaching other people. Jupiter returns to its natal position in your 3rd house, beginning a new 12-year cycle around writing, learning, speaking, teaching, and everyday communication. You may begin writing regularly, take a course, send a proposal, or develop an idea that will occupy you for years.\n\nThe 3rd-house solar eclipse may bring privately developed work to submission, publication, or announcement. An application, announcement, piece of writing, or decision may reach the point where someone else can respond.\n\nNear the end of summer, all the new communication starts competing with your daily capacity. Jupiter squares your 6th-house Moon. Each new opportunity can look manageable by itself.",
      sections: [],
      keyDates: [{
        eventId: "jupiter-conjunction-jupiter:0",
        title: "A longer conversation begins",
        sentence: "Give one idea enough room to become something you can keep developing."
      }, {
        eventId: "solar_eclipse-2026-08-12",
        title: "Put the important part into words",
        sentence: "An announcement, application, or piece of writing may need a clear answer from someone else."
      }, {
        eventId: "jupiter-square-moon:0",
        title: "The calendar tells the truth",
        sentence: "Notice which basic routines lose time every time another commitment gets added."
      }]
    }
  }],
  eligibleEventIds: ["jupiter-conjunction-jupiter:0", "solar_eclipse-2026-08-12", "jupiter-square-moon:0"],
  interpretedEventIds: ["jupiter-conjunction-jupiter:0", "solar_eclipse-2026-08-12", "jupiter-square-moon:0"]
});
assert.deepEqual(validateReportKeyDateFormat(productionKeyDatesDraft), [],
  "Production-shaped deterministic key dates must pass the existing four-field Markdown format contract.");
assert.equal(verifyReportFactLock(productionKeyDatesDraft, {
  slowTransitArcs: [{ id: "jupiter-conjunction-jupiter", transitPlanet: "Jupiter", natalPoint: "Jupiter", aspect: "conjunction", isReturn: true, passes: [{ exactAt: "2026-07-04T15:07:02Z" }] },
    { id: "jupiter-square-moon", transitPlanet: "Jupiter", natalPoint: "Moon", aspect: "square", passes: [{ exactAt: "2026-08-27T16:35:38Z" }] }],
  lunarEvents: [{ id: "solar_eclipse-2026-08-12", kind: "solar_eclipse", occursAt: "2026-08-12T17:36:45Z", natalHouse: 3, natalContacts: [] }]
}).passed, true, "Deterministic date labels and technical attributions must remain traceable to the frozen facts.");
assert.match(productionKeyDatesDraft.body, /JUL 4 · A longer conversation begins[\s\S]*Give one idea enough room/u);
assert.match(productionKeyDatesDraft.body, /AUG 12 · Put the important part into words[\s\S]*clear answer from someone else/u);
assert.match(productionKeyDatesDraft.body, /AUG 27 · The calendar tells the truth[\s\S]*basic routines lose time/u);
assert.equal(productionKeyDatesDraft.sections.length, 0, "Key dates must be one deterministic formatted assembly, not a writer-created section tree.");

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

const productionYearThemeDraft = {
  headline: "Finish the private work before other people need an answer",
  tldr: "FIXTURE_ONLY_TLDR.", summary: "FIXTURE_ONLY_SUMMARY.", body: "FIXTURE_ONLY_BODY.",
  action: "Set aside one uninterrupted block. Consider whether an existing responsibility may need to move or end, and protect the uninterrupted hours required to finish the work first.",
  timing: "FIXTURE_ONLY_TIMING.", sections: []
};
const [productionWhetherDefect] = reportValidationIssuesToNamedDefects(productionYearThemeDraft, [{
  code: "whether", message: "Report output contains whether."
}]);
assert.deepEqual({
  id: productionWhetherDefect.id,
  location: productionWhetherDefect.location,
  sentenceIndex: productionWhetherDefect.sentence_index,
  scopeStart: productionWhetherDefect.scope_start,
  scopeEnd: productionWhetherDefect.scope_end,
  quote: productionWhetherDefect.quote,
  instruction: productionWhetherDefect.instruction
}, {
  id: "validator-1-1-whether",
  location: "action",
  sentenceIndex: 1,
  scopeStart: 1,
  scopeEnd: 1,
  quote: "Consider whether an existing responsibility may need to move or end, and protect the uninterrupted hours required to finish the work first.",
  instruction: "Rewrite the quoted sentence without the word whether while preserving its branches and meaning."
}, "Report 8b3e266e's exact year-theme failure must target the sentence containing whether, never the headline fallback.");
const productionWhetherFixed = spliceReportRevision(productionYearThemeDraft, [productionWhetherDefect], { replacements: [{
  defect_id: productionWhetherDefect.id,
  location: "action",
  scope_start: 1,
  scope_end: 1,
  replacement: "Decide if an existing responsibility may need to move or end, and protect the uninterrupted hours required to finish the work first."
}] });
assert.doesNotMatch(productionWhetherFixed.action, /\bwhether\b/iu,
  "The exact year-theme validator splice must remove whether without changing any unnamed sentence.");
assert.equal(productionWhetherFixed.action?.split(". ")[0], "Set aside one uninterrupted block",
  "The exact year-theme validator splice must preserve the unnamed action sentence byte-for-byte.");

const exactLintPayload = assembleReportGenerationPayload({
  reportId: "fixture-exact-lint-routing", reportDomain: "general", reportHorizon: "12_months", unitId: "year-theme", frozenFacts: frozen
});
const exactLintDraft = {
  headline: "FIXTURE_ONLY_HEADLINE.", tldr: "FIXTURE_ONLY_TLDR.", summary: "FIXTURE_ONLY_SUMMARY.",
  body: "I think the schedule may change. The work may shift — but the date remains.",
  action: "Consider whether an existing responsibility may move. This report may help.",
  timing: "FIXTURE_ONLY_TIMING.", sections: []
};
const exactLintIssues = validateReportDraft(exactLintDraft, exactLintPayload).filter((issue) => (
  ["astrologer_persona", "em_dash", "whether", "writer_note_leakage"].includes(issue.code)
));
const exactLintDefects = reportValidationIssuesToNamedDefects(exactLintDraft, exactLintIssues);
assert.deepEqual(exactLintDefects.map((defect) => ({
  code: defect.id.split("-").at(-1), location: defect.location, sentence: defect.sentence_index, quote: defect.quote
})), [
  { code: "em_dash", location: "body", sentence: 1, quote: "The work may shift — but the date remains." },
  { code: "whether", location: "action", sentence: 0, quote: "Consider whether an existing responsibility may move." },
  { code: "astrologer_persona", location: "body", sentence: 0, quote: "I think the schedule may change." },
  { code: "writer_note_leakage", location: "action", sentence: 1, quote: "This report may help." }
], "Every deterministic lint must carry its exact quoted sentence and single replacement scope into the writer chain.");
assert.ok(exactLintDefects.every((defect) => defect.scope_start === defect.scope_end && defect.scope_start === defect.sentence_index));

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
const productionColdReadFailures = [
  "Merged replacement scope is outside 'body'.",
  "Cold read returned interpretive_gap for a unit where interpretive movement is not applicable.",
  "Merged replacement scope is outside 'body; paragraph 0'.",
  "Replacement location 'summary; paragraph 0' is not present.",
  "Replacement location 'body; paragraph 0' is not present."
];
assert.equal(productionColdReadFailures.length, 5, "The complete report 8b3e266e failure history must remain represented by regressions.");

const coordinateDraft = {
  headline: "FIXTURE_ONLY_HEADLINE.", tldr: "", summary: "FIXTURE_ONLY_SUMMARY.",
  body: "FIXTURE_ONLY_BODY_FIRST. FIXTURE_ONLY_BODY_SECOND.", action: "", timing: "", sections: []
};
const coordinateSentences = reportUnitSentenceAddresses(coordinateDraft);
assert.deepEqual(coordinateSentences.map(({ id, location, sentenceIndex }) => ({ id, location, sentenceIndex })), [
  { id: "S1", location: "headline", sentenceIndex: 0 },
  { id: "S2", location: "summary", sentenceIndex: 0 },
  { id: "S3", location: "body", sentenceIndex: 0 },
  { id: "S4", location: "body", sentenceIndex: 1 }
], "Report sentence IDs must deterministically map to runtime-owned field sentence indices.");
assert.match(sentenceAddressedReportUnit(coordinateDraft), /\[S4\] \[LOCATION=body; PARAGRAPH_INDEX=0\] FIXTURE_ONLY_BODY_SECOND\./u);
const normalizedCoordinateFinding = normalizeReportColdReadCritique(coordinateDraft, {
  result: "defects", applicability: { interpretive_movement: "applicable", reason: "FIXTURE_ONLY" },
  defects: [{
    id: "cold-coordinate", category: "unnatural_phrasing",
    sentence_ids: ["S4"], quote: "FIXTURE_ONLY_BODY_SECOND.",
    evidence: "FIXTURE_ONLY", evidence_ids: [], instruction: "FIXTURE_ONLY_REPLACE"
  }]
});
assert.deepEqual({
  location: normalizedCoordinateFinding.defects[0].location,
  sentenceIndex: normalizedCoordinateFinding.defects[0].sentence_index,
  start: normalizedCoordinateFinding.defects[0].scope_start,
  end: normalizedCoordinateFinding.defects[0].scope_end
}, { location: "body", sentenceIndex: 1, start: 1, end: 1 },
"A current finding must resolve by sentence ID to a bounded internal sentence scope.");
const staleCoordinateFinding = normalizeReportColdReadCritique(coordinateDraft, {
  result: "defects", applicability: { interpretive_movement: "applicable", reason: "FIXTURE_ONLY" },
  defects: [{
    id: "stale-cold-coordinate", category: "unnatural_phrasing",
    sentence_ids: ["S4"], quote: "FIXTURE_ONLY_REMOVED_BY_EARLIER_EDIT.",
    evidence: "FIXTURE_ONLY", evidence_ids: [], instruction: "FIXTURE_ONLY_REPLACE"
  }]
});
assert.deepEqual(staleCoordinateFinding, {
  result: "no_defects",
  applicability: { interpretive_movement: "applicable", reason: "The rendered unit contains at least two substantive prose paragraphs." },
  defects: []
}, "A revision finding whose quoted text is no longer present in the edited unit must be discarded as stale.");

for (const inventedAddress of ["S999", "body; paragraph 0"]) {
  assert.throws(() => normalizeReportColdReadCritique(coordinateDraft, {
    result: "defects", applicability: { interpretive_movement: "applicable", reason: "FIXTURE_ONLY" },
    defects: [{
      id: `invented-${inventedAddress}`, category: "unnatural_phrasing", sentence_ids: [inventedAddress],
      quote: "FIXTURE_ONLY_BODY_FIRST.", evidence: "FIXTURE_ONLY", evidence_ids: [], instruction: "FIXTURE_ONLY"
    }]
  }), /was not supplied/u, `An invented '${inventedAddress}' sentence ID must be rejected before revision.`);
}

const oneParagraphColdDraft = {
  headline: "FIXTURE_ONLY_HEADLINE.", tldr: "", summary: "", body: "FIXTURE_ONLY_BODY.",
  action: "", timing: "", sections: []
};
assert.equal(reportDraftMovementApplicable(oneParagraphColdDraft), false);
const suppressedMovementFinding = normalizeReportColdReadCritique(oneParagraphColdDraft, {
  result: "defects", applicability: { interpretive_movement: "applicable", reason: "FIXTURE_ONLY_MODEL_BYPASS" },
  defects: [{
    id: "not-applicable-movement", category: "interpretive_gap",
    sentence_ids: ["S2"], quote: "FIXTURE_ONLY_BODY.",
    evidence: "FIXTURE_ONLY", evidence_ids: [], instruction: "FIXTURE_ONLY"
  }]
}, false);
assert.deepEqual(suppressedMovementFinding, {
  result: "no_defects",
  applicability: {
    interpretive_movement: "not_applicable",
    reason: "The rendered unit contains fewer than two substantive prose paragraphs."
  },
  defects: []
}, "A provider bypass cannot reintroduce interpretive_gap when movement is not applicable.");

let outOfBoundsRevisionCalls = 0;
await assert.rejects(reviseReportDraftForNamedDefects({
  payload: spliceChainPayload,
  draft: coordinateDraft,
  defects: [
    { id: "outside-body-a", category: "density_violation", location: "body", sentence_index: 0, scope_start: 0, scope_end: 2, quote: "FIXTURE_ONLY", evidence: "FIXTURE_ONLY", evidence_ids: [], instruction: "FIXTURE_ONLY" },
    { id: "outside-body-b", category: "owner_voice_drift", location: "body", sentence_index: 1, scope_start: 1, scope_end: 3, quote: "FIXTURE_ONLY", evidence: "FIXTURE_ONLY", evidence_ids: [], instruction: "FIXTURE_ONLY" }
  ],
  callModel: async () => { outOfBoundsRevisionCalls += 1; throw new Error("Provider must not be called."); }
}), /references a sentence outside 'body'/u,
"Production's merged out-of-bounds body scope must fail before a revision call.");
assert.equal(outOfBoundsRevisionCalls, 0);

const crossFieldDefects = [
  { id: "field-summary", category: "unnatural_phrasing", location: "summary", sentence_index: 0, scope_start: 0, scope_end: 0, quote: "FIXTURE_ONLY_SUMMARY.", evidence: "FIXTURE_ONLY", evidence_ids: [], instruction: "FIXTURE_ONLY" },
  { id: "field-body", category: "unnatural_phrasing", location: "body", sentence_index: 0, scope_start: 0, scope_end: 0, quote: "FIXTURE_ONLY_BODY_FIRST.", evidence: "FIXTURE_ONLY", evidence_ids: [], instruction: "FIXTURE_ONLY" }
];
assert.equal(mergeOverlappingReportDefects(coordinateDraft, crossFieldDefects).length, 2,
  "Equal sentence indices in different fields must never merge into one replacement scope.");

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
function sentenceAddressedDefects(draft, defects) {
  const addresses = reportUnitSentenceAddresses(draft);
  return defects.map(({ location, sentence_index: _sentenceIndex, scope_start: scopeStart, scope_end: scopeEnd, ...defect }) => ({
    ...defect,
    sentence_ids: addresses
      .filter((sentence) => sentence.location === location && sentence.sentenceIndex >= scopeStart && sentence.sentenceIndex <= scopeEnd)
      .map((sentence) => sentence.id)
  }));
}
const spliceChainAddressedDefects = sentenceAddressedDefects(spliceChainDraft, spliceChainDefects);
const spliceChainSchemas = [];
const spliceChain = await runReportWriterChain({ payload: spliceChainPayload, callModel: async (input) => {
  spliceChainSchemas.push(input.schemaName);
  if (input.schemaName === "report_unit_critique") {
    assert.ok(input.schema.properties.defects.items.properties.sentence_ids,
      "The full critique must use the same sentence-ID addressing contract as the cold read.");
    assert.equal("location" in input.schema.properties.defects.items.properties, false);
    assert.match(input.prompt, /quote is informational only/u);
  }
  if (input.schemaName === "report_unit_cold_read") {
    assert.match(input.prompt, /SENTENCE_ADDRESSED_UNIT/u);
    assert.doesNotMatch(input.prompt, /UNIT_FACTS|CANONICAL_PROMPT|OWNER_COMPARISON_SET|VALIDATOR_RESULTS/u);
  }
  const value = input.schemaName === "report_unit_draft" ? spliceChainDraft
    : input.schemaName === "report_unit_critique" ? { result: "defects", applicability: { interpretive_movement: "not_applicable", reason: "FIXTURE_ONLY" }, defects: spliceChainAddressedDefects }
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

// Production report 8b3e266e repeatedly completed domain:main's draft,
// critique, and revision, then yielded before cold read. The durable stage
// record must make the next worker start at cold read, never draft.
const domainMainCheckpointPayload = assembleReportGenerationPayload({
  reportId: "8b3e266e-286d-4ea7-a008-f60776e6b791",
  reportDomain: "general",
  reportHorizon: "12_months",
  unitId: "domain:main",
  frozenFacts: frozen
});
const domainMainCheckpointSchemas = [];
let domainMainCheckpoint = null;
const domainMainChainKey = "FIXTURE_ONLY_PRODUCTION_DOMAIN_MAIN_ATTEMPT";
const domainMainCheckpointModel = async (input) => {
  domainMainCheckpointSchemas.push(input.schemaName);
  if (input.schemaName === "report_unit_cold_read" && domainMainCheckpointSchemas.filter((schema) => schema === "report_unit_cold_read").length === 1) {
    throw new Error("FIXTURE_ONLY_DEADLINE_YIELD_BEFORE_COLD_READ");
  }
  const value = input.schemaName === "report_unit_draft" ? spliceChainDraft
    : input.schemaName === "report_unit_critique" ? {
      result: "defects", applicability: { interpretive_movement: "not_applicable", reason: "FIXTURE_ONLY" }, defects: spliceChainAddressedDefects
    }
      : input.schemaName === "report_unit_revision_spans" ? { replacements: [
        { defect_id: "chain-body", location: "body", scope_start: 0, scope_end: 0, replacement: "FIXTURE_ONLY_REPLACED." },
        { defect_id: "chain-timing", location: "timing", scope_start: 0, scope_end: 0, replacement: "FIXTURE_ONLY_NEW_TIMING." }
      ] }
        : { result: "no_defects", applicability: { interpretive_movement: "not_applicable", reason: "FIXTURE_ONLY" }, defects: [] };
  return { value, model: input.model, provider: input.provider, usage: { inputTokens: 1, outputTokens: 1, totalTokens: 2 } };
};
await assert.rejects(runReportWriterChain({
  payload: domainMainCheckpointPayload,
  chainKey: domainMainChainKey,
  callModel: domainMainCheckpointModel,
  persistCheckpoint: async (checkpoint) => { domainMainCheckpoint = structuredClone(checkpoint); }
}), /FIXTURE_ONLY_DEADLINE_YIELD_BEFORE_COLD_READ/u);
assert.equal(domainMainCheckpoint.completedStage, "revision");
assert.deepEqual(domainMainCheckpoint.calls.map((call) => call.stage), ["draft", "critique", "revise"]);
const domainMainResumeStart = domainMainCheckpointSchemas.length;
const resumedDomainMain = await runReportWriterChain({
  payload: domainMainCheckpointPayload,
  chainKey: domainMainChainKey,
  checkpoint: domainMainCheckpoint,
  callModel: domainMainCheckpointModel,
  persistCheckpoint: async (checkpoint) => { domainMainCheckpoint = structuredClone(checkpoint); }
});
assert.deepEqual(domainMainCheckpointSchemas.slice(domainMainResumeStart), ["report_unit_cold_read"],
  "A yielded Production-shaped domain:main attempt must resume at cold read without re-billing draft, critique, or revision.");
assert.equal(domainMainCheckpoint.completedStage, "cold_read");
assert.deepEqual(resumedDomainMain.calls.map((call) => call.stage), ["draft", "critique", "revise", "cold_read"]);
assert.equal(resumedDomainMain.revised.body, "FIXTURE_ONLY_REPLACED. FIXTURE_ONLY_SECOND.");

const coldCoordinateSchemas = [];
const coldCoordinateChain = await runReportWriterChain({ payload: spliceChainPayload, callModel: async (input) => {
  coldCoordinateSchemas.push(input.schemaName);
  if (input.schemaName === "report_unit_draft") {
    return { value: oneParagraphColdDraft, model: input.model, provider: input.provider, usage: { inputTokens: 1, outputTokens: 1, totalTokens: 2 } };
  }
  if (input.schemaName === "report_unit_critique") {
    return { value: { result: "no_defects", applicability: { interpretive_movement: "not_applicable", reason: "FIXTURE_ONLY" }, defects: [] }, model: input.model, provider: input.provider, usage: { inputTokens: 1, outputTokens: 1, totalTokens: 2 } };
  }
  assert.equal(input.schemaName, "report_unit_cold_read");
  assert.deepEqual(input.schema.properties.defects.items.properties.sentence_ids.items.enum, ["S1", "S2"],
    "The provider schema must reject every address except an exact supplied sentence ID.");
  assert.equal(input.schema.properties.defects.items.properties.category.enum.includes("interpretive_gap"), false,
    "The provider schema must reject interpretive_gap when movement is not applicable.");
  assert.equal("location" in input.schema.properties.defects.items.properties, false,
    "Cold-read findings must not receive the old free-form location field.");
  assert.match(input.prompt, /runtime owns segmentation/u);
  return {
    // Deliberately bypass the schema in this mock: runtime suppression remains
    // the second line of defense for a nonconforming provider response.
    value: {
      result: "defects", applicability: { interpretive_movement: "applicable", reason: "FIXTURE_ONLY_BYPASS" },
      defects: [{
        id: "bypass-movement", category: "interpretive_gap",
        sentence_ids: ["S2"], quote: "FIXTURE_ONLY_BODY.",
        evidence: "FIXTURE_ONLY", evidence_ids: [], instruction: "FIXTURE_ONLY"
      }]
    },
    model: input.model, provider: input.provider, usage: { inputTokens: 1, outputTokens: 1, totalTokens: 2 }
  };
} });
assert.deepEqual(coldCoordinateSchemas, ["report_unit_draft", "report_unit_critique", "report_unit_cold_read"],
  "A suppressed non-applicable movement finding must never trigger a revision call.");
assert.equal(coldCoordinateChain.coldCritique.result, "no_defects");

const markdownKeyDatesDraft = {
  headline: "KEY TURNING POINTS", tldr: "FIXTURE_ONLY_TLDR.", summary: "FIXTURE_ONLY_SUMMARY.", body: "",
  action: "FIXTURE_ONLY_ACTION.", timing: "Across the report year", sections: [{
    heading: "KEY TURNING POINTS",
    body: [
      "- **A home responsibility reaches a decision point.** A lunar eclipse falls near natal Saturn.",
      "- **An old role needs different terms.** Uranus squares your natal Sun, disrupting a plan that depends on the old arrangement continuing.",
      "- **The terms require scrutiny.** Credit, access, and final authority still have to be negotiated.",
      "- **A new method gets a practical test.** The useful version is the one you can repeat during an ordinary week.",
      "- **A communication cycle begins.** Writing, learning, or teaching may become work you continue developing.",
      "- **Communication expands.** Each opportunity can look manageable by itself.",
      "- **The communication becomes public.** A draft, decision, or conversation may need revision because other people now have to understand it."
    ].join("\n\n")
  }]
};
const markdownAddresses = reportUnitSentenceAddresses(markdownKeyDatesDraft);
const addressAtParagraph = (paragraphIndex) => markdownAddresses.find((sentence) => (
  sentence.location === "sections.0.body" && sentence.paragraphIndex === paragraphIndex
));
assert.ok(addressAtParagraph(1) && addressAtParagraph(6), "The markdown-heavy key-dates fixture must expose stable sentence IDs in the two Production failure paragraphs.");
assert.equal((sentenceAddressedReportUnit(markdownKeyDatesDraft).match(/^\[S\d+\]/gmu) ?? []).length, markdownAddresses.length,
  "Every sentence in a markdown-heavy unit must be pre-segmented and labeled exactly once.");

const productionRejectedFindings = [
  { id: "D6", paragraphIndex: 6, quote: "The communication becomes public" },
  { id: "D3", paragraphIndex: 6, quote: "A draft decision or conversation may need revision" },
  { id: "D5", paragraphIndex: 6, quote: "other people now have to understand it" },
  { id: "D3", paragraphIndex: 1, quote: "An old role needs different terms" }
];
for (const rejected of productionRejectedFindings) {
  const sentence = addressAtParagraph(rejected.paragraphIndex);
  const normalized = normalizeReportColdReadCritique(markdownKeyDatesDraft, {
    result: "defects",
    applicability: { interpretive_movement: "applicable", reason: "FIXTURE_ONLY_PRODUCTION_REJECTION" },
    defects: [{
      id: rejected.id, category: "unnatural_phrasing", sentence_ids: [sentence.id], quote: rejected.quote,
      evidence: "FIXTURE_ONLY_REJECTED_QUOTE", evidence_ids: [], instruction: "FIXTURE_ONLY_CORRECT_THE_SENTENCE"
    }]
  });
  if (sentenceAddressedReportUnit(markdownKeyDatesDraft).includes(rejected.quote)) {
    assert.equal(normalized.defects[0].location, "sections.0.body");
    assert.equal(normalized.defects[0].sentence_index, sentence.sentenceIndex);
  } else {
    assert.equal(normalized.result, "no_defects");
    assert.deepEqual(normalized.defects, [],
      `${rejected.id}'s exact Production payload must be discarded when its quote is absent from the edited markdown-heavy unit.`);
  }
}

let exhaustedResponseAttempts = 0;
await assert.rejects(
  withReportModelResponseRetries(async () => {
    exhaustedResponseAttempts += 1;
    throw new ReportModelResponseRejectedError("FIXTURE_ONLY_STILL_INVALID");
  })({
    provider: "openai",
    model: "FIXTURE_ONLY_MODEL",
    prompt: "FIXTURE_ONLY_PROMPT",
    schemaName: "FIXTURE_ONLY_SCHEMA",
    schema: { type: "object" }
  }),
  /FIXTURE_ONLY_STILL_INVALID/u
);
assert.equal(exhaustedResponseAttempts, 4,
  "Response-contract exhaustion must escalate only after the initial call plus three retries.");
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

const explicitBudgetUpdates = [];
const explicitBudgetAuthorization = await authorizeReportGeneration({
  async update(table, query, patch) {
    explicitBudgetUpdates.push({ table, query, patch });
    return table === "report_fulfillment_jobs" ? [{ id: "fresh-job-2" }] : [{ id: "fresh-report-2" }];
  }
}, { reportId: "fresh-report-2", callBudget: 70, tokenBudget: 1_800_000, now: "2026-08-14T00:00:00Z" });
assert.deepEqual(explicitBudgetAuthorization, { authorized: true, callBudget: 70, tokenBudget: 1_800_000, jobId: "fresh-job-2" });
assert.equal(explicitBudgetUpdates.find((entry) => entry.table === "report_fulfillment_jobs").patch.authorized_token_budget, 1_800_000);

const freshGenerationRequests = [];
const freshGeneration = await createFreshReportGeneration({
  async request(path, init) {
    freshGenerationRequests.push({ path, init });
    return [{ report_id: "fresh-report-2", job_id: "fresh-job-2", generation_number: 2 }];
  }
}, "source-report-1");
assert.deepEqual(freshGeneration, { reportId: "fresh-report-2", jobId: "fresh-job-2", generationNumber: 2 });
assert.equal(freshGenerationRequests[0].path, "rpc/create_fresh_report_generation");
assert.deepEqual(JSON.parse(freshGenerationRequests[0].init.body), { source_report_id: "source-report-1" });

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
assert.equal(productionShapedUnitWrites[0].row.source_snapshot.renderMetadata.timing, "FIXTURE_ONLY_TIMING.",
  "The report-unit persistence layer must preserve the reader-facing season date range through assembly and delivery.");
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
    async callTimingHistory(jobId) { return facts.get(`timings:${jobId}`) ?? []; },
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
  const deterministicKeyDateSources = new Set(["what-matters-most", "development:1", "phase-1", "winter-current"]);
  return {
    headline: `FIXTURE_ONLY ${unitFingerprint} HEADLINE.`,
    tldr: `FIXTURE_ONLY ${unitFingerprint} TLDR.`,
    summary: `FIXTURE_ONLY ${unitFingerprint} SUMMARY.`,
    body: deterministicKeyDateSources.has(unitId)
      ? `FIXTURE_ONLY ${unitFingerprint}: Saturn trines your natal Jupiter. A supported calendar consequence may belong to ${unitFingerprint}.`
      : `FIXTURE_ONLY ${unitFingerprint} BODY.`,
    action: `FIXTURE_ONLY ${unitFingerprint} ACTION.`,
    timing: `FIXTURE_ONLY ${unitFingerprint} TIMING.`,
    sections: unitId === "key-dates" ? [{
      heading: "FIXTURE_ONLY SEASON",
      body: "FEB 18 · FIXTURE_ONLY TITLE · A supported event may require an answer. · FIXTURE_ONLY attribution."
    }] : [],
    keyDates: []
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
      assert.match(input.prompt, /LIVED_PROSE_STANDARD[\s\S]*FLATNESS \/ LIVED PROSE[\s\S]*SENTENCE_ADDRESSED_UNIT[\s\S]*UNIT_FACTS[\s\S]*OWNER_COMPARISON_SET/u);
      assert.match(input.prompt, /Never return flatness or lived_prose as a defect category\./u);
    }
    if (input.schemaName === "report_unit_cold_read") {
      assert.match(input.prompt, /SENTENCE_ADDRESSED_UNIT/u);
      assert.doesNotMatch(input.prompt, /UNIT_FACTS|CANONICAL_PROMPT|OWNER_COMPARISON_SET|VALIDATOR_RESULTS/u,
        "The final cold read must receive rendered prose only, never context that can rescue it.");
    }
    const unitId = /"unitId":\s*"([^"]+)"/u.exec(input.prompt)?.[1] ?? "fixture-unit";
    const uniqueDraft = fixtureUnitDraft(unitId);
    const payloadMatch = /REPORT_GENERATION_PAYLOAD\n([\s\S]*?)\n\nReturn one report unit/u.exec(input.prompt);
    const keyDateRequirements = payloadMatch
      ? (JSON.parse(payloadMatch[1]).keyDateRequirements ?? [])
      : [];
    uniqueDraft.keyDates = keyDateRequirements.map((event, index) => ({
      eventId: event.eventId,
      title: `Event ${index + 1} ${unitId}`,
      sentence: `A unique supported consequence belongs to event ${index + 1} in ${unitId}.`
    }));
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
  usage: { inputTokens: 1, outputTokens: 1, totalTokens: 2 }, model: "gpt-5.6-terra", promptVersion: "FIXTURE_ONLY_JUDGE_V1"
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
    assert.equal(providerMock.count(), reportCallEstimate("12_months").cleanPathCalls, "The comp mock must traverse draft, critique, and judge for written 12-month units while assembling key dates without provider calls.");
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

const candidatePreventionStore = createMemoryStore();
const candidatePreventionReport = {
  id: "candidate-prevention-report", user_id: "user-1", subject_id: null,
  report_domain: "general", report_horizon: "1_month",
  period_start: frozen.startsAt.slice(0, 10), period_end: factsForHorizon("1_month").endsAt.slice(0, 10),
  facts: {}, facts_engine: "pending", facts_hash: null, fulfillment_status: "queued", prompt_versions: {}, token_count: 0,
  attempt_counts: { validator: 0, judge: 0 }, failure_history: [], status: "draft"
};
candidatePreventionStore.reports.set(candidatePreventionReport.id, candidatePreventionReport);
candidatePreventionStore.entitlements.set("candidate-prevention-ent", {
  id: "candidate-prevention-ent", user_id: "user-1", status: "active", source: "comp",
  product_key: "general_1m", period_start: candidatePreventionReport.period_start,
  period_end: candidatePreventionReport.period_end
});
const candidateBaseModel = modelCallWithCrash();
const candidateDraftPrompts = [];
const candidateModel = async (input) => {
  if (input.schemaName === "report_unit_draft") candidateDraftPrompts.push(input.prompt);
  return candidateBaseModel(input);
};
await processReportFulfillmentJob({
  job: authorizedJob({
    id: "candidate-prevention-job", report_id: candidatePreventionReport.id,
    entitlement_id: "candidate-prevention-ent", state: "running", step: "calculating", attempt: 1
  }),
  store: candidatePreventionStore,
  calculateFacts,
  callModel: candidateModel,
  judgeCall,
  promptMode: "naturalness_candidate"
});
assert.ok(candidateDraftPrompts.length >= 2);
assert.match(candidateDraftPrompts[0], /EARLIER_PERSISTED_UNITS\n\[\]/u,
  "The first candidate unit must begin with no invented prior-unit context.");
assert.ok(candidateDraftPrompts[1].includes(fixtureUnitDraft("overview").body),
  "The second candidate unit must receive the first unit's exact persisted text before its draft call.");
assert.match(candidateDraftPrompts[1], /PRIOR_UNIT_REPETITION_PREVENTION/u);
assert.match(candidateDraftPrompts[1], /NATURALNESS_BEFORE_AFTER_EXEMPLAR_PACKET/u);
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
  continuationPolicy: { deadlineAtMs: 400_000, maxNewUnits: 1, now: () => 120_000 }
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

const strandedStore = createMemoryStore();
const strandedReport = {
  ...structuredClone(deadlineReport),
  id: "8b3e266e-286d-4ea7-a008-f60776e6b791",
  user_id: "97965306-21fd-481a-8bf2-7d271ab76c8b",
  failure_history: [
    { at: "2026-08-11T17:04:07.785Z", stage: "calculating", values: "Merged replacement scope is outside 'body'." },
    { at: "2026-08-11T17:06:41.995Z", stage: "writing", values: "Cold read returned interpretive_gap for a unit where interpretive movement is not applicable." },
    { at: "2026-08-11T17:12:50.755Z", stage: "writing", values: "Merged replacement scope is outside 'body; paragraph 0'." },
    { at: "2026-08-11T17:17:46.130Z", stage: "writing", values: "Replacement location 'summary; paragraph 0' is not present." },
    { at: "2026-08-11T17:23:16.619Z", stage: "writing", values: "Replacement location 'body; paragraph 0' is not present." }
  ]
};
const strandedFailureHistory = structuredClone(strandedReport.failure_history);
const strandedJob = {
  ...authorizedJob({
    id: "1b3bcbda-cb44-4cab-ae2c-e59c81c52e8f",
    report_id: strandedReport.id,
    entitlement_id: "1b3bcbda-entitlement",
    state: "running",
    step: "writing",
    attempt: 1,
    locked_at: "2026-08-11T21:20:27.651752Z",
    locked_by: "report-worker-4-1786483227141",
    lease_expires_at: "2026-08-11T21:26:57.651752Z"
  }),
  model_call_count: 31,
  authorization_call_count: 31
};
strandedStore.reports.set(strandedReport.id, strandedReport);
strandedStore.entitlements.set(strandedJob.entitlement_id, {
  id: strandedJob.entitlement_id,
  user_id: strandedReport.user_id,
  status: "active",
  product_key: "general_1m"
});
strandedStore.jobs.set(strandedJob.id, structuredClone(strandedJob));
strandedStore.facts.set(`timings:${strandedJob.id}`, [{
  schema_name: "report_unit_draft",
  created_at: "2026-08-11T21:21:00.000Z",
  completed_at: "2026-08-11T21:23:00.000Z"
}]);
strandedStore.claimJobs = async () => [structuredClone(strandedStore.jobs.get(strandedJob.id))];
let strandedProviderRequests = 0;
const strandedModel = async (input) => {
  const attempt = { provider: input.provider, model: input.model, schemaName: input.schemaName };
  await input.beforeProviderCall?.(attempt);
  strandedProviderRequests += 1;
  throw new Error("FIXTURE_ONLY_PROVIDER_MUST_NOT_RUN");
};
let strandedClockReads = 0;
const strandedResult = await runReportFulfillmentBatch({
  workerId: "report-worker-4-1786483227141",
  store: strandedStore,
  calculateFacts,
  callModel: strandedModel,
  judgeCall,
  continuationPolicy: {
    deadlineAtMs: 240_000,
    runtimeDeadlineAtMs: 300_000,
    maxNewUnits: 1,
    now: () => strandedClockReads++ === 0 ? 0 : 274_000
  }
});
assert.equal(strandedProviderRequests, 0, "The exact call-32 stranding must be prevented before a provider request.");
assert.equal(strandedStore.facts.get(`calls:${strandedJob.id}`), undefined, "A denied call must not consume a ledger authorization.");
assert.deepEqual(strandedResult.processed[0].result.deadlineAdmission, {
  schemaName: "report_unit_draft",
  remainingMs: 26_000,
  estimatedCallMs: 120_000,
  safetyMarginMs: 90_000
});
assert.deepEqual({
  state: strandedStore.jobs.get(strandedJob.id).state,
  step: strandedStore.jobs.get(strandedJob.id).step,
  lockedAt: strandedStore.jobs.get(strandedJob.id).locked_at,
  lockedBy: strandedStore.jobs.get(strandedJob.id).locked_by,
  leaseExpiresAt: strandedStore.jobs.get(strandedJob.id).lease_expires_at
}, {
  state: "queued",
  step: "writing",
  lockedAt: null,
  lockedBy: null,
  leaseExpiresAt: null
}, "A denied call must persist and immediately requeue without entering the retry path.");
assert.deepEqual(strandedStore.reports.get(strandedReport.id).failure_history, strandedFailureHistory,
  "Deadline admission is continuation control, not a report failure.");

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
  continuationPolicy: { deadlineAtMs: 400_000, maxNewUnits: 1, now: () => 120_000 }
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
assert.equal(resumeCall.count(), 6, "Resume must skip the completed unit, run the two remaining writer chains, assemble key dates deterministically, and proceed to review without a report-level model call.");

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
      body: unitId === "key-dates" ? "" : (bodyByUnit[unitId] ?? `A distinct body consequence belongs to marker ${marker}.`),
      action: `A distinct action belongs to marker ${marker}.`,
      timing: `A distinct timing note belongs to marker ${marker}.`,
      sections: unitId === "key-dates" ? [{
        heading: "FIXTURE KEY DATES",
        body: "FEB 18 · FIXTURE TITLE · A supported event may require an answer. · FIXTURE attribution."
      }] : []
    }, {
      fulfillmentPassed: true,
      ...(unitId === "key-dates" ? { deterministicAssembly: { schema: "report-key-dates-assembly.v4" } } : {}),
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
const warningOnlyBody = "An application may begin. The application may need revision. An application may receive an answer. Another application may require a deadline.";
await seedAssemblyUnits(structuralStore, structuralReport, {
  overview: repeatedClose,
  "what-matters-most": repeatedClose,
  "domain:main": warningOnlyBody
});
for (const unitId of ["overview", "what-matters-most", "domain:main"]) {
  const row = structuralStore.units.get(`structural-report:${unitId}`);
  row.source_snapshot = {
    ...row.source_snapshot,
    fulfillmentPassed: false,
    assemblyValidation: {
      passed: false,
      issues: [{ code: "report_modal_budget", severity: "error", unitId, location: "body", quote: row.body }]
    }
  };
}
const structuralModel = modelCallWithCrash();
await processReportFulfillmentJob({
  job: authorizedJob({ id: "structural-job", report_id: structuralReport.id, entitlement_id: "structural-ent", state: "running", step: "validating", attempt: 1 }),
  store: structuralStore, calculateFacts, callModel: structuralModel, judgeCall
});
assert.equal(structuralModel.count(), 0, "Zero assembly errors must proceed to needs_review without any report-level model call.");
assert.equal(structuralStore.units.get("structural-report:overview").source_snapshot.fulfillmentPassed, true);
assert.equal(structuralStore.units.get("structural-report:what-matters-most").source_snapshot.fulfillmentPassed, true);
assert.equal(structuralStore.units.get("structural-report:what-matters-most").body, "",
  "The later exact sentence must be mechanically removed without a writer call.");
assert.equal(structuralStore.reports.get(structuralReport.id).fulfillment_status, "needs_review");
const structuralAssemblyReview = structuralStore.reports.get(structuralReport.id).validator_results.find((entry) => entry.unitId === "assembled-report");
assert.equal(structuralAssemblyReview.mechanicalRemovals.length, 1);
assert.ok(structuralAssemblyReview.warnings.some((issue) => issue.code === "report_lexical_budget"),
  "Warning-severity assembly findings must remain attached to the needs_review packet without becoming model work items.");

const coherenceStore = createMemoryStore();
const coherenceReport = assemblyReadyReport("coherence-report");
coherenceStore.reports.set(coherenceReport.id, coherenceReport);
coherenceStore.entitlements.set("coherence-ent", { id: "coherence-ent", user_id: coherenceReport.user_id, status: "active", product_key: "general_1m" });
await seedAssemblyUnits(coherenceStore, coherenceReport, {
  "domain:main": "The change may be your decision, but it does not have to begin as a preference.  Different hours, fewer responsibilities, or more notice may become necessary."
});
let coherenceCalls = 0;
const coherenceModel = async (input) => {
  coherenceCalls += 1;
  assert.equal(input.schemaName, "report_unit_revision_spans");
  assert.match(input.prompt, /internal_whitespace/u);
  const defectId = /"id":"([^"]*assembly-coherence[^"]*)"/u.exec(input.prompt)?.[1];
  const result = {
    value: { replacements: [{
      defect_id: defectId, location: "body", scope_start: 0, scope_end: 1,
      replacement: "The change may be your decision, but it does not have to begin as a preference. Different hours, fewer responsibilities, or more notice may become necessary because the original arrangement no longer fits."
    }] },
    model: input.model, provider: input.provider,
    usage: { inputTokens: 2, outputTokens: 2, totalTokens: 4 }
  };
  await input.beforeProviderCall?.({ provider: input.provider, model: input.model, schemaName: input.schemaName });
  await input.afterProviderCall?.({ provider: input.provider, model: input.model, schemaName: input.schemaName }, result);
  return result;
};
const coherenceJob = authorizedJob({ id: "coherence-job", report_id: coherenceReport.id, entitlement_id: "coherence-ent", state: "running", step: "validating", attempt: 1 });
const coherenceResult = await processReportFulfillmentJob({
  job: coherenceJob, store: coherenceStore, calculateFacts, callModel: coherenceModel, judgeCall
});
assert.equal(coherenceResult.status, "needs_review");
assert.equal(coherenceCalls, 0, "A whitespace-only post-dedup seam must be repaired mechanically without a billed call.");
assert.doesNotMatch(coherenceStore.units.get("coherence-report:domain:main").body, /[ \t]{2,}/u);
assert.equal(coherenceStore.units.get("coherence-report:domain:main").source_snapshot.assemblyValidation.mechanicalCoherenceRepairs.length, 1);

const seamStore = createMemoryStore();
const seamReport = assemblyReadyReport("bounded-seam-report");
seamStore.reports.set(seamReport.id, seamReport);
seamStore.entitlements.set("bounded-seam-ent", { id: "bounded-seam-ent", user_id: seamReport.user_id, status: "active", product_key: "general_1m" });
const repeatedInteriorSentence = "The repeated sentence is removed from the later unit.";
await seedAssemblyUnits(seamStore, seamReport, {
  overview: repeatedInteriorSentence,
  "domain:main": `The paragraph begins with a distinct consequence. ${repeatedInteriorSentence} The paragraph ends with another distinct consequence.`
});
let seamCalls = 0;
const seamModel = async (input) => {
  seamCalls += 1;
  assert.equal(input.schemaName, "report_unit_revision_spans");
  assert.match(input.prompt, /interior_sentence_removed/u);
  const defectId = /"id":"([^"]*assembly-coherence[^"]*)"/u.exec(input.prompt)?.[1];
  const result = {
    value: { replacements: [{
      defect_id: defectId, location: "body", scope_start: 0, scope_end: 1,
      replacement: "The paragraph begins with a distinct consequence. The paragraph ends with another distinct consequence, so the remaining thought still reads continuously."
    }] },
    model: input.model, provider: input.provider,
    usage: { inputTokens: 2, outputTokens: 2, totalTokens: 4 }
  };
  await input.beforeProviderCall?.({ provider: input.provider, model: input.model, schemaName: input.schemaName });
  await input.afterProviderCall?.({ provider: input.provider, model: input.model, schemaName: input.schemaName }, result);
  return result;
};
const seamJob = authorizedJob({ id: "bounded-seam-job", report_id: seamReport.id, entitlement_id: "bounded-seam-ent", state: "running", step: "validating", attempt: 1 });
const seamRepairResult = await processReportFulfillmentJob({
  job: seamJob, store: seamStore, calculateFacts, callModel: seamModel, judgeCall
});
assert.equal(seamRepairResult.status, "queued", "A bounded dedup-seam splice persists and requeues before final assembly.");
assert.equal(seamCalls, 1, "Interior-sentence dedup damage permits exactly one bounded seam-repair call.");
const seamRepairRecord = seamStore.units.get("bounded-seam-report:domain:main").source_snapshot.assemblyCoherenceRepairs.at(-1);
assert.equal(seamRepairRecord.repairClass, "bounded_dedup_seam_splice");
assert.equal(seamRepairRecord.unitRegeneration, false, "A seam splice must be recorded distinctly from unit regeneration.");
assert.equal(seamRepairRecord.boundedCallCount, 1);
const seamResumeModel = modelCallWithCrash();
const seamComplete = await processReportFulfillmentJob({
  job: { ...seamJob, state: "running", step: "writing", attempt: 2 },
  store: seamStore, calculateFacts, callModel: seamResumeModel, judgeCall
});
assert.equal(seamComplete.status, "needs_review");
assert.equal(seamResumeModel.count(), 0, "A persisted seam splice must not reopen any passing unit on resume.");

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
assert.deepEqual(cachedOverview.sourceSnapshot.tokenAccounting, {
  acceptedTokens: 8,
  totalTokens: 8,
  retryTokens: 0,
  estimatedUsd: 0.000119,
  acceptedEstimatedUsd: 0.000119,
  retryEstimatedUsd: 0
}, "Each passing unit must preserve accepted-work tokens and retry cost separately for owner review.");

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
assert.equal(secondPersistenceModel.count(), 6, "The retry must persist cached overview work, generate only two remaining written units, assemble key dates without calls, and proceed to review without a report-level model call.");
assert.equal(firstPersistenceModel.count() + secondPersistenceModel.count(), 9, "Infrastructure retry must not add calls above the clean three-writer-unit path.");
assert.equal(persistenceJudgeCalls, 3, "Infrastructure retry must not re-bill the cached overview judge or judge deterministic key dates.");
assert.deepEqual(persistenceStore.jobs.get(persistenceJob.id).passing_unit_cache, {}, "A cached unit clears only after its write and report accounting succeed.");
assert.deepEqual(persistenceStore.units.get("persistence-report:overview").source_snapshot.judge.scores, passingJudgeScores);
assert.equal(persistenceStore.units.get("persistence-report:overview").source_snapshot.writerReviews[0].coldCritique.result, "no_defects",
  "Persisted review evidence must include the context-free closing pass.");

const chainCheckpointStore = createMemoryStore();
const chainCheckpointReport = {
  ...structuredClone(resumeReport),
  id: "8b3e266e-286d-4ea7-a008-f60776e6b791",
  user_id: "checkpoint-user",
  fulfillment_status: "queued",
  failure_history: []
};
const chainCheckpointJob = authorizedJob({
  id: "domain-main-checkpoint-job",
  report_id: chainCheckpointReport.id,
  entitlement_id: "domain-main-checkpoint-ent",
  state: "running",
  step: "writing",
  attempt: 1,
  passing_unit_cache: {}
});
chainCheckpointStore.reports.set(chainCheckpointReport.id, chainCheckpointReport);
chainCheckpointStore.entitlements.set(chainCheckpointJob.entitlement_id, {
  id: chainCheckpointJob.entitlement_id,
  user_id: chainCheckpointReport.user_id,
  status: "active",
  product_key: "general_1m"
});
chainCheckpointStore.jobs.set(chainCheckpointJob.id, structuredClone(chainCheckpointJob));
chainCheckpointStore.claimJobs = async () => [structuredClone(chainCheckpointJob)];
const interruptedChainModel = modelCallWithCrash(3);
const interruptedChainBatch = await runReportFulfillmentBatch({
  workerId: "checkpoint-worker-1",
  store: chainCheckpointStore,
  calculateFacts,
  callModel: interruptedChainModel,
  judgeCall
});
assert.equal(interruptedChainBatch.processed[0].retryable, true);
assert.equal(interruptedChainModel.count(), 3, "The first worker reaches cold read after completing draft and critique.");
const durableChainCheckpoint = chainCheckpointStore.jobs.get(chainCheckpointJob.id).passing_unit_cache.__writer_chain_checkpoint;
assert.equal(durableChainCheckpoint.schema, "report-writer-chain-checkpoint.v1");
assert.equal(durableChainCheckpoint.unitId, "overview");
assert.equal(durableChainCheckpoint.completedStage, "revision");
assert.deepEqual(durableChainCheckpoint.calls.map((call) => call.stage), ["draft", "critique"]);

const resumedChainModel = modelCallWithCrash();
chainCheckpointStore.claimJobs = async () => [{
  ...structuredClone(chainCheckpointJob),
  ...structuredClone(chainCheckpointStore.jobs.get(chainCheckpointJob.id)),
  state: "running",
  attempt: 2
}];
const resumedChainBatch = await runReportFulfillmentBatch({
  workerId: "checkpoint-worker-2",
  store: chainCheckpointStore,
  calculateFacts,
  callModel: resumedChainModel,
  judgeCall
});
assert.equal(resumedChainBatch.processed[0].result.status, "needs_review");
assert.equal(resumedChainModel.count(), 7,
  "The resumed overview starts at cold read, then only the other two writer chains are billed; key dates remain deterministic.");
assert.deepEqual(chainCheckpointStore.jobs.get(chainCheckpointJob.id).passing_unit_cache, {},
  "The in-progress checkpoint clears only after the resumed unit passes and persists.");
assert.deepEqual(
  chainCheckpointStore.units.get(`${chainCheckpointReport.id}:overview`).source_snapshot.writerReviews[0].critique,
  durableChainCheckpoint.critique,
  "The exact persisted critique survives the worker boundary as review evidence."
);

const judgeRetryCheckpointStore = createMemoryStore();
const judgeRetryCheckpointReport = {
  ...structuredClone(resumeReport),
  id: "judge-retry-checkpoint-report",
  user_id: "judge-retry-checkpoint-user",
  facts: factsForHorizon("1_month"),
  facts_engine: "FIXTURE_ONLY_ENGINE",
  facts_hash: "FIXTURE_ONLY_FACTS_HASH",
  fulfillment_status: "writing",
  failure_history: []
};
const judgeRetryDraft = fixtureUnitDraft("overview");
const judgeRetryCheckpoint = {
  schema: "report-writer-chain-checkpoint.v1",
  chainKey: "FIXTURE_ONLY_JUDGE_RETRY_CHAIN_KEY",
  unitId: "overview",
  completedStage: "cold_revision",
  draft: judgeRetryDraft,
  critique: {
    result: "no_defects",
    applicability: { interpretive_movement: "not_applicable", reason: "FIXTURE_ONLY" },
    defects: []
  },
  revised: judgeRetryDraft,
  coldCritique: {
    result: "no_defects",
    applicability: { interpretive_movement: "not_applicable", reason: "FIXTURE_ONLY" },
    defects: []
  },
  calls: [],
  promptVersion: "FIXTURE_ONLY_CRITIQUE_V1"
};
const judgeRetryCheckpointJob = authorizedJob({
  id: "judge-retry-checkpoint-job",
  report_id: judgeRetryCheckpointReport.id,
  entitlement_id: "judge-retry-checkpoint-ent",
  state: "running",
  step: "writing",
  attempt: 2,
  passing_unit_cache: { __writer_chain_checkpoint: judgeRetryCheckpoint }
});
judgeRetryCheckpointStore.reports.set(judgeRetryCheckpointReport.id, judgeRetryCheckpointReport);
judgeRetryCheckpointStore.entitlements.set(judgeRetryCheckpointJob.entitlement_id, {
  id: judgeRetryCheckpointJob.entitlement_id,
  user_id: judgeRetryCheckpointReport.user_id,
  status: "active",
  product_key: "general_1m"
});
judgeRetryCheckpointStore.jobs.set(judgeRetryCheckpointJob.id, structuredClone(judgeRetryCheckpointJob));
const judgeRetryResumeModel = modelCallWithCrash();
const judgeRetryResume = await processReportFulfillmentJob({
  job: structuredClone(judgeRetryCheckpointJob),
  store: judgeRetryCheckpointStore,
  calculateFacts,
  callModel: judgeRetryResumeModel,
  judgeCall
});
assert.equal(judgeRetryResume.status, "needs_review");
assert.equal(judgeRetryResumeModel.count(), 6,
  "A retry chain checkpoint with a judge-derived key must resume at judging; only the other two writer chains are billed.");
assert.deepEqual(judgeRetryCheckpointStore.units.get(`${judgeRetryCheckpointReport.id}:overview`).body, judgeRetryDraft.body,
  "The completed judge-retry draft must persist byte-identically without another draft call.");

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
for (const actionName of ["grant_comp", "fresh_generation", "authorize_generation", "revoke_comp", "set_lifetime_token_budget"]) assert.ok(adminSource.includes(`body.action === "${actionName}"`));
assert.ok(adminSource.includes("token_budget_lifetime"), "The owner-only admin endpoint must expose the adjustable lifetime token backstop.");
assert.ok(adminSource.includes("tokenBudget: body.tokenBudget"), "Owner authorization must accept an explicit authorization-scoped token ceiling.");
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

console.log("Report fulfillment passed: 16-key free-test catalog, Stripe fail-closed mode, direct comp grant/revoke, per-call authorization, observed-duration deadline admission, deadline-aware one-unit worker continuation, durable per-step writer-chain checkpoints, Production-shaped unit upsert, durable passing-unit cache, persistence backoff without re-billing, mocked generation/judge/manual-release/log-only-delivery E2E, shared facts, crash resume, retry queue, and no-edit admin contract.");
