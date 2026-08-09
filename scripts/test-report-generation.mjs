import assert from "node:assert/strict";
import fs from "node:fs";
import {
  assembleReportGenerationPayload,
  reportFactors,
  reportPromptFromPayload,
  resolveManifestationSets,
  selectReportFactors,
  validateReportDraft
} from "../api/_lib/report-generation.ts";

const facts = JSON.parse(fs.readFileSync(new URL("./fixtures/marie-report-frozen-facts.json", import.meta.url), "utf8"));
const snapshots = JSON.parse(fs.readFileSync(new URL("./fixtures/report-generation-dry-run-snapshots.json", import.meta.url), "utf8"));
const canonicalPrompt = fs.readFileSync(
  new URL("../tldr-astro-phrasebank/TLDR-REPORT-HORIZONS-GENERATION-PROMPT-OWNER.md", import.meta.url),
  "utf8"
);
const workMoneyPrompt = fs.readFileSync(
  new URL("../tldr-astro-phrasebank/TLDR-WORK-MONEY-DEEPDIVE-GENERATION-PROMPT-OWNER.md", import.meta.url),
  "utf8"
);
const workMoneyReference = fs.readFileSync(
  new URL("../artifacts/marie-satori-work-money-2026-owner-v1.md", import.meta.url),
  "utf8"
);
const endpointSource = fs.readFileSync(new URL("../api/generate-user-content.ts", import.meta.url), "utf8");
const webServiceSource = fs.readFileSync(new URL("../apps/web/src/services/userGeneratedContent.ts", import.meta.url), "utf8");
const migrationSource = fs.readFileSync(
  new URL("../apps/web/supabase/migrations/20260809130000_report_domains.sql", import.meta.url),
  "utf8"
);
const cases = [
  ["1_month", "overview"],
  ["4_months", "development:1"],
  ["6_months", "phase-1"],
  ["12_months", "summer"]
];
const endByHorizon = {
  "1_month": "2026-03-18T01:59:11Z",
  "4_months": "2026-06-18T01:59:11Z",
  "6_months": "2026-08-18T01:59:11Z",
  "12_months": facts.endsAt
};

function factsForHorizon(reportHorizon) {
  const result = structuredClone(facts);
  result.reportHorizon = reportHorizon;
  result.endsAt = endByHorizon[reportHorizon];
  result.slowTransitArcs = result.slowTransitArcs.flatMap((arc) => {
    const passes = arc.passes.filter((reportPass) => reportPass.exactAt <= result.endsAt);
    return passes.length ? [{ ...arc, passes }] : [];
  });
  result.lunarEvents = result.lunarEvents.filter((event) => event.occursAt <= result.endsAt);
  if (reportHorizon !== "12_months") delete result.solarReturn;
  return result;
}

const payloads = new Map();
for (const [reportHorizon, unitId] of cases) {
  const horizonFacts = factsForHorizon(reportHorizon);
  const payload = assembleReportGenerationPayload({
    reportId: "00000000-0000-0000-0000-000000000117",
    reportDomain: "general",
    reportHorizon,
    unitId,
    frozenFacts: horizonFacts
  });
  payloads.set(reportHorizon, payload);
  assert.equal(payload.canonicalOwnerPrompt.text, canonicalPrompt);
  assert.equal(payload.reportDomain, "general");
  assert.deepEqual(payload.frozenFacts, horizonFacts);
  assert.deepEqual({
    unit: payload.unit,
    factorCount: payload.factors.length,
    resolvedCount: payload.manifestationSets.length,
    sourceGapCount: payload.sourceGaps.length
  }, snapshots[reportHorizon]);
  assert.equal(payload.outputGovernance.status, "DRAFT");
  assert.equal(payload.outputGovernance.review_status, "needs_review");
  assert.equal(payload.outputGovernance.promotionAllowed, false);
  assert.equal(payload.voiceEvidence[0].sourceType, "owner_authored_final");
  assert.ok(reportPromptFromPayload(payload).startsWith(canonicalPrompt));
}

assert.ok(!payloads.get("1_month").unit.allowedUnitIds.some((id) => id.includes("winter") || id === "spring"));
assert.ok(payloads.get("12_months").unit.allowedUnitIds.includes("summer"));
assert.throws(() => assembleReportGenerationPayload({
  reportId: "fixture-mismatch",
  reportDomain: "general",
  reportHorizon: "1_month",
  unitId: "overview",
  frozenFacts: facts
}), /does not match/u);
assert.match(endpointSource, /\| "report_unit"/u);
assert.match(webServiceSource, /\| "report_unit"/u);
assert.ok(endpointSource.indexOf("input.dryRun") < endpointSource.indexOf("generateContent(generationInput"));
assert.match(endpointSource, /`report:\$\{report\.id\}:\$\{input\.unitId\}`/u);
assert.match(migrationSource, /report_domain in \('general', 'work_money'\)/u);
assert.match(migrationSource, /report_horizon in \('1_month', '4_months', '6_months', '12_months'\)/u);

const workMoneyPayload = assembleReportGenerationPayload({
  reportId: "00000000-0000-0000-0000-000000000118",
  reportDomain: "work_money",
  reportHorizon: "12_months",
  unitId: "summer",
  frozenFacts: facts
});
assert.equal(workMoneyPayload.canonicalOwnerPrompt.text, workMoneyPrompt);
assert.equal(workMoneyPayload.voiceEvidence[0].text, workMoneyReference);
assert.equal(workMoneyPayload.generationStandard, null);
assert.ok(workMoneyPayload.factors.some((factor) => factor.id === "lunar-eclipse-2026-03-03-saturn"));
assert.ok(workMoneyPayload.factorSelection.find((item) => (
  item.factorId === "lunar-eclipse-2026-03-03-saturn"
))?.bridgeConsequences.includes("commute"));
const workMoneySelectedContext = JSON.stringify({
  manifestationSets: workMoneyPayload.manifestationSets,
  voiceEvidence: workMoneyPayload.voiceEvidence
}).toLowerCase();
assert.doesNotMatch(workMoneySelectedContext, /\b(?:dating|spirituality)\b/u);
assert.match(payloads.get("12_months").voiceEvidence[0].text, /\bdating\b/iu);
assert.deepEqual({
  unit: workMoneyPayload.unit,
  factorIds: workMoneyPayload.factors.map((factor) => factor.id),
  resolvedCount: workMoneyPayload.manifestationSets.length,
  sourceGapCount: workMoneyPayload.sourceGaps.length,
  bridgeSelection: workMoneyPayload.factorSelection.find((item) => (
    item.factorId === "lunar-eclipse-2026-03-03-saturn"
  )),
  venusProjectedDomains: workMoneyPayload.manifestationSets.find((item) => (
    item.factor.id === "sr-overlay-venus-house-10"
  ))?.record.domain,
  voiceEvidenceSource: workMoneyPayload.voiceEvidence[0].sourcePath
}, snapshots.work_money_12_months);

const factors = reportFactors(facts);
assert.deepEqual(reportFactors({ reportWindow: facts }), factors);
assert.equal(factors.filter((factor) => factor.id === "jupiter-conjunction-jupiter").length, 1);
assert.equal(factors.find((factor) => factor.id === "jupiter-conjunction-jupiter").factorType, "return");
assert.ok(!factors.some((factor) => factor.id === "neptune-conjunction-neptune"));
for (const payload of payloads.values()) {
  assert.ok(!payload.sourceGaps.some((gap) => gap.requestedKey.includes("return/neptune")));
  assert.ok(!payload.sourceGaps.some((gap) => gap.factorId === "neptune-conjunction-neptune"));
}
const unsupported = resolveManifestationSets([{
  id: "fixture-only-source-gap",
  factorType: "slow-transit-to-natal",
  transitPlanet: "Saturn",
  natalPoint: "Venus",
  aspect: "square",
  house: 2,
  source: { fixture: true }
}]);
assert.equal(unsupported.resolved.length, 0);
assert.deepEqual(unsupported.gaps, [{
  factorId: "fixture-only-source-gap",
  requestedKey: "slow-transit-to-natal/saturn/square/venus/2",
  reason: "SOURCE_GAP"
}]);

const independentlySelected = selectReportFactors([
  {
    id: "fixture-only-dating-factor",
    factorType: "slow-transit-to-natal",
    transitPlanet: "Saturn",
    natalPoint: "FIXTURE_ONLY_POINT",
    aspect: "square",
    source: { domain: "dating" }
  },
  {
    id: "fixture-only-work-factor",
    factorType: "slow-transit-to-natal",
    transitPlanet: "Saturn",
    natalPoint: "FIXTURE_ONLY_POINT",
    aspect: "trine",
    source: { domain: "client contract scope" }
  }
], "work_money");
assert.deepEqual(independentlySelected.factors.map((factor) => factor.id), ["fixture-only-work-factor"]);
const independentlyResolved = resolveManifestationSets(
  independentlySelected.factors,
  "work_money",
  independentlySelected.selection
);
assert.deepEqual(independentlyResolved.gaps.map((gap) => gap.factorId), ["fixture-only-work-factor"]);

const payload = payloads.get("12_months");
const codes = (draft, options) => validateReportDraft(draft, payload, options).map((issue) => issue.code);
assert.ok(codes({ body: "FIXTURE_ONLY_A — FIXTURE_ONLY_B." }).includes("em_dash"));
assert.ok(codes({ body: "FIXTURE_ONLY whether FIXTURE_ONLY." }).includes("whether"));
assert.ok(codes({ body: "I think FIXTURE_ONLY." }).includes("astrologer_persona"));
assert.ok(codes({ body: "currently employed." }).includes("do_not_assume"));
assert.ok(codes({ body: "job application." }).includes("possibility_language"));
assert.ok(!codes({ body: "FIXTURE_ONLY may. job application." }).includes("possibility_language"));
assert.ok(codes({ body: "application application application application" }).includes("lexical_budget"));
assert.ok(codes({ body: "job application, client request, collaboration, contract, grant, project terms." }).includes("menu_size"));
assert.ok(codes({ body: "Saturn Return FIXTURE_ONLY." }).includes("saturn_return_non_return_year"));

assert.ok(validateReportDraft(
  { sections: [{ heading: "WORK", body: "" }] },
  payloads.get("1_month")
).some((issue) => issue.code === "empty_domain_section"));
assert.ok(validateReportDraft(
  { sections: [{ heading: "2026 IN REVIEW", body: "FIXTURE_ONLY_2027 2027." }] },
  payload
).some((issue) => issue.code === "next_year_in_current_review"));

assert.ok(validateReportDraft(
  { body: "FIXTURE_ONLY abundance." },
  workMoneyPayload
).some((issue) => issue.code === "money_abstraction" && issue.severity === "error"));
assert.ok(!validateReportDraft(
  { body: "FIXTURE_ONLY abundance means FIXTURE_ONLY rate and hours." },
  workMoneyPayload
).some((issue) => issue.code === "money_abstraction"));

const isolatedDraft = { body: "FIXTURE_ONLY_ONE.\n\nFIXTURE_ONLY_TWO?\n\nFIXTURE_ONLY_THREE." };
assert.ok(validateReportDraft(isolatedDraft, workMoneyPayload)
  .some((issue) => issue.code === "isolated_one_liners" && issue.severity === "warning"));
assert.ok(!validateReportDraft(isolatedDraft, payload)
  .some((issue) => issue.code === "isolated_one_liners"));

assert.ok(!validateReportDraft({
  sections: [{
    heading: "KEY DATES",
    body: "FIXTURE_ONLY_DATE · FIXTURE_ONLY_TITLE · FIXTURE_ONLY_SENTENCE. · FIXTURE_ONLY_ATTRIBUTION"
  }]
}, workMoneyPayload).some((issue) => issue.code === "work_money_key_date_format"));
assert.ok(validateReportDraft({
  sections: [{
    heading: "KEY DATES",
    body: "FIXTURE_ONLY_DATE · WORK · FIXTURE_ONLY_TITLE · FIXTURE_ONLY_SENTENCE. · FIXTURE_ONLY_ATTRIBUTION"
  }]
}, workMoneyPayload).some((issue) => issue.code === "work_money_key_date_format"));
assert.ok(!validateReportDraft({
  sections: [{
    heading: "KEY DATES",
    body: "FIXTURE_ONLY_DATE · WORK · FIXTURE_ONLY_TITLE · FIXTURE_ONLY_SENTENCE. · FIXTURE_ONLY_ATTRIBUTION"
  }]
}, payload).some((issue) => issue.code === "work_money_key_date_format"));

console.log("Report generation passed: General + Work & Money snapshots, independent selection, return dedupe, and validators.");
