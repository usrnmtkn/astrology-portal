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
const loveConnectionPrompt = fs.readFileSync(
  new URL("../tldr-astro-phrasebank/TLDR-LOVE-CONNECTION-DEEPDIVE-GENERATION-PROMPT-OWNER.md", import.meta.url),
  "utf8"
);
const loveConnectionReference = fs.readFileSync(
  new URL("../artifacts/marie-satori-love-connection-2026-owner-v1.md", import.meta.url),
  "utf8"
);
const generatorSource = fs.readFileSync(new URL("../api/_lib/report-generation.ts", import.meta.url), "utf8");
const endpointSource = fs.readFileSync(new URL("../api/generate-user-content.ts", import.meta.url), "utf8");
const webServiceSource = fs.readFileSync(new URL("../apps/web/src/services/userGeneratedContent.ts", import.meta.url), "utf8");
const migrationSource = fs.readFileSync(
  new URL("../apps/web/supabase/migrations/20260809130000_report_domains.sql", import.meta.url),
  "utf8"
);
const loveDomainMigrationSource = fs.readFileSync(
  new URL("../apps/web/supabase/migrations/20260809140000_love_connection_report_domain.sql", import.meta.url),
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
assert.match(loveDomainMigrationSource, /report_domain in \('general', 'work_money', 'love_connection'\)/u);

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
assert.equal(workMoneyPayload.domainRelevanceModel.length, 3);
assert.ok(workMoneyPayload.domainRelevanceModel.every((tier) => (
  tier.rules.length && tier.rules.every((rule) => rule.inspectionNotes.length && rule.doNotAssume.length)
)));
assert.ok(workMoneyPayload.factorSelection.every((item) => item.inspectionNotes.length && item.doNotAssume.length));
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

const loveConnectionPayload = assembleReportGenerationPayload({
  reportId: "00000000-0000-0000-0000-000000000119",
  reportDomain: "love_connection",
  reportHorizon: "12_months",
  unitId: "summer",
  frozenFacts: facts
});
assert.equal(loveConnectionPayload.canonicalOwnerPrompt.text, loveConnectionPrompt);
assert.equal(loveConnectionPayload.voiceEvidence[0].text, loveConnectionReference);
assert.equal(loveConnectionPayload.generationStandard, null);
assert.deepEqual(loveConnectionPayload.domainRelevanceModel.map((tier) => tier.id), [
  "direct_love_connection",
  "condition_changers",
  "slow_planet_relationship_conditions"
]);
assert.ok(loveConnectionPayload.domainRelevanceModel.every((tier) => (
  tier.rules.length && tier.rules.every((rule) => rule.inspectionNotes.length && rule.doNotAssume.length)
)));
for (const factorId of [
  "sr-overlay-ascendant-house-5",
  "lunar-eclipse-2026-03-03-saturn",
  "uranus-square-sun",
  "jupiter-square-moon",
  "jupiter-opposition-mars",
  "lunar-eclipse-2026-08-28-mercury",
  "solar-eclipse-2027-02-06-midheaven"
]) {
  assert.ok(loveConnectionPayload.factors.some((factor) => factor.id === factorId), `${factorId} must pass Love & Connection inspection.`);
}
assert.ok(loveConnectionPayload.factorSelection.every((item) => (
  item.tierId && item.matchedRuleIds.length && item.inspectionNotes.length && item.doNotAssume.length
)));
const uranusInspection = loveConnectionPayload.factorSelection.find((item) => item.factorId === "uranus-square-sun");
assert.ok(uranusInspection?.matchedRuleIds.includes("uranus_conditions"));
assert.ok(uranusInspection?.doNotAssume.includes("breakup"));
const loveManifestationContext = JSON.stringify(loveConnectionPayload.manifestationSets).toLowerCase();
assert.doesNotMatch(loveManifestationContext, /\b(?:application|proposal|publishing|newsletter)\b/u);
assert.doesNotMatch(loveConnectionPayload.voiceEvidence[0].text, /\b(?:soulmate|twin flame|divine union|your person)\b/iu);
assert.doesNotMatch(loveConnectionPayload.voiceEvidence[0].text, /—|\bwhether\b/iu);
assert.doesNotMatch(generatorSource, /reportDomain === "love_connection"/u);
const marsFactor = loveConnectionPayload.factors.find((factor) => factor.id === "jupiter-opposition-mars");
const midheavenInspection = loveConnectionPayload.factorSelection.find((item) => (
  item.factorId === "solar-eclipse-2027-02-06-midheaven"
));
const domainDisagreement = {
  mar3RelationshipConsequences: loveConnectionPayload.factorSelection.find((item) => (
    item.factorId === "lunar-eclipse-2026-03-03-saturn"
  ))?.bridgeConsequences,
  marsSpineExactDates: marsFactor?.source.passes.map((pass) => pass.exactAt.slice(0, 10)),
  marsSpinePresentInLoveReference: [
    /October 20, and what you want may conflict/u.test(loveConnectionReference),
    /On February 5, Jupiter retrograde opposes your natal Mars/u.test(loveConnectionReference)
  ],
  workReferenceHasApplicationMaterial: /\bapplication\b/iu.test(workMoneyReference),
  loveReferenceHasApplicationMaterial: /\bapplication\b/iu.test(loveConnectionReference),
  workReferenceHasMoneySection: /^## Money$/mu.test(workMoneyReference),
  loveReferenceHasMoneySection: /^## Money$/mu.test(loveConnectionReference),
  feb6RelationshipContext: midheavenInspection?.inspectionNotes.filter((note) => (
    ["availability", "travel", "location", "money", "schedule"].includes(note)
  )),
  feb6ContextPresentInLoveReference: /FEB 6 · Work changes the relationship context/u.test(loveConnectionReference)
};
assert.deepEqual({
  unit: loveConnectionPayload.unit,
  factorIds: loveConnectionPayload.factors.map((factor) => factor.id),
  tierIds: [...new Set(loveConnectionPayload.factorSelection.map((item) => item.tierId))],
  ascendantInspection: loveConnectionPayload.factorSelection.find((item) => (
    item.factorId === "sr-overlay-ascendant-house-5"
  )),
  homeInspection: loveConnectionPayload.factorSelection.find((item) => (
    item.factorId === "lunar-eclipse-2026-03-03-saturn"
  )),
  domainDisagreement,
  voiceEvidenceSource: loveConnectionPayload.voiceEvidence[0].sourcePath
}, snapshots.love_connection_12_months);

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
}, workMoneyPayload).some((issue) => issue.code === "deep_dive_key_date_format"));
assert.ok(validateReportDraft({
  sections: [{
    heading: "KEY DATES",
    body: "FIXTURE_ONLY_DATE · WORK · FIXTURE_ONLY_TITLE · FIXTURE_ONLY_SENTENCE. · FIXTURE_ONLY_ATTRIBUTION"
  }]
}, workMoneyPayload).some((issue) => issue.code === "deep_dive_key_date_format"));
assert.ok(!validateReportDraft({
  sections: [{
    heading: "KEY DATES",
    body: "FIXTURE_ONLY_DATE · WORK · FIXTURE_ONLY_TITLE · FIXTURE_ONLY_SENTENCE. · FIXTURE_ONLY_ATTRIBUTION"
  }]
}, payload).some((issue) => issue.code === "deep_dive_key_date_format"));

for (const phrase of ["soulmate", "twin flame", "divine union", "your person"]) {
  assert.ok(validateReportDraft(
    { body: `FIXTURE_ONLY ${phrase}.` },
    loveConnectionPayload
  ).some((issue) => issue.code === "love_banned_vocabulary" && issue.severity === "error"));
}
assert.ok(!validateReportDraft(
  { body: "FIXTURE_ONLY soulmate." },
  workMoneyPayload
).some((issue) => issue.code === "love_banned_vocabulary"));

const statusBranches = {
  body: "If you are single, FIXTURE_ONLY. If you are partnered, FIXTURE_ONLY. If you are dating, FIXTURE_ONLY."
};
assert.ok(validateReportDraft(statusBranches, loveConnectionPayload)
  .some((issue) => issue.code === "status_branching" && issue.severity === "warning"));
assert.ok(!validateReportDraft(statusBranches, workMoneyPayload)
  .some((issue) => issue.code === "status_branching"));

for (const term of ["dysfunction", "infidelity", "pregnancy", "fertility"]) {
  assert.ok(validateReportDraft(
    { body: `FIXTURE_ONLY ${term}.` },
    loveConnectionPayload
  ).some((issue) => issue.code === "sex_invention" && issue.severity === "error"));
}
assert.ok(!validateReportDraft(
  { body: "Do not assume fertility." },
  loveConnectionPayload
).some((issue) => issue.code === "sex_invention"));
assert.ok(validateReportDraft(isolatedDraft, loveConnectionPayload)
  .some((issue) => issue.code === "isolated_one_liners" && issue.severity === "warning"));
assert.ok(validateReportDraft({
  sections: [{
    heading: "KEY DATES",
    body: "FIXTURE_ONLY_DATE · LOVE · FIXTURE_ONLY_TITLE · FIXTURE_ONLY_SENTENCE. · FIXTURE_ONLY_ATTRIBUTION"
  }]
}, loveConnectionPayload).some((issue) => issue.code === "deep_dive_key_date_format"));

console.log("Report generation passed: three domains, tiered selection, return dedupe, and domain validators.");
