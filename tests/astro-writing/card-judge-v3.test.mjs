#!/usr/bin/env node

import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import {
  CARD_JUDGE_V3_ARTIFACT_PATH,
  CARD_JUDGE_V3_AUTHORIZATION_ENV,
  CARD_JUDGE_V3_AUTHORIZATION_TOKEN,
  CARD_JUDGE_V3_CALL_BUDGET,
  CARD_JUDGE_V3_CATEGORIES,
  CARD_JUDGE_V3_CATEGORY_CONFIG,
  CARD_JUDGE_V3_LOCATIONS,
  CARD_JUDGE_V3_SCHEMA,
  assertCardJudgeV3LiveAuthorization,
  buildCardJudgeV3Packet,
  cardJudgeV3PacketPrompt,
  cardJudgeV3Verdict,
  evaluateCardJudgeV3
} from "../../src/astro-writing/cardJudgeV3.mjs";
import { cardJudgeV3PacketContextHash, loadCardJudgeV3FixtureSet } from "../../scripts/card-judge-v3-fixtures.mjs";
import openAIResponses from "../../src/astro-writing/openAIResponses.cjs";

const read = (sourcePath) => fs.readFileSync(sourcePath, "utf8");
const sha256 = (value) => crypto.createHash("sha256").update(value).digest("hex");
const ruling = read("tldr-astro-phrasebank/TLDR-REGISTER-PER-SURFACE-RULING-OWNER.md");
const rubric = read("tldr-astro-phrasebank/TLDR-CARD-JUDGE-RUBRIC-V3-DRAFT.md");
const readme = read("packages/astro-knowledge/review/writing-harness-v3/README.md");
const runner = read("scripts/run-astro-writing-live-reviewer-eval-v3.mjs");
const implementationReport = read("packages/astro-knowledge/review/writing-harness-v3/implementation-report.md");

assert.equal(sha256(ruling), "db48c5b42df2afee30faea6141a3417ca1e1d69fc3110586281bdd79e72d29e2", "Surface ruling must remain byte-for-byte owner supplied.");
assert.match(ruling, /DRAFT FOR OWNER APPROVAL[\s\S]*`needs_review`/u);
assert.match(ruling, /A card grader loads card rules and card exemplars; a report grader loads report rules and report exemplars\./u);
assert.match(rubric, /^\*\*Surface:\*\* `card`$/mu);
assert.match(rubric, /^\*\*Owner approved:\*\* `false`$/mu);
assert.match(rubric, /^\*\*Active in production:\*\* `false`$/mu);
assert.match(rubric, /^\*\*Promotion authorized:\*\* `false`$/mu);
assert.match(readme, /Every billed run requires a separate, explicit owner authorization naming the call budget\./u);
assert.match(readme, /Low reasoning is the documented suspect/u);
assert.match(implementationReport, /These are configured contracts only\. No live results exist and no model calls were made\./u);
assert.match(implementationReport, /Owner-pending items/u);
assert.match(openAIResponses.instructionsForRole("CARD_REVIEWER_V3"), /findings only[\s\S]*Never return a verdict/u);

assert.deepEqual(CARD_JUDGE_V3_CATEGORIES, [
  "astrology_integrity",
  "shared_ban",
  "specificity_ceiling",
  "house_bleed",
  "stock_trope",
  "example_proves_astrology",
  "metaphor_requires_translation",
  "tagline_stands_alone",
  "owner_voice_drift"
]);
assert.equal(CARD_JUDGE_V3_CATEGORY_CONFIG.astrology_integrity.action, "FAIL");
assert.equal(CARD_JUDGE_V3_CATEGORY_CONFIG.shared_ban.action, "FAIL");
assert.equal(CARD_JUDGE_V3_CATEGORY_CONFIG.specificity_ceiling.action, "FAIL");
for (const category of CARD_JUDGE_V3_CATEGORIES.slice(3)) assert.equal(CARD_JUDGE_V3_CATEGORY_CONFIG[category].action, "REVISE");
assert.deepEqual(CARD_JUDGE_V3_SCHEMA.required, ["findings"]);
assert.ok(!Object.hasOwn(CARD_JUDGE_V3_SCHEMA.properties, "verdict"));
assert.equal(cardJudgeV3Verdict([]), "PASS");
assert.equal(cardJudgeV3Verdict([{ category: "house_bleed" }]), "REVISE");
assert.equal(cardJudgeV3Verdict([{ category: "stock_trope" }, { category: "shared_ban" }]), "FAIL");

const { manifest, gold, negatives, cases } = loadCardJudgeV3FixtureSet();
assert.equal(manifest.status, "needs_review");
assert.equal(manifest.ownerApproved, false);
assert.equal(manifest.promotionAuthorized, false);
assert.deepEqual(manifest.proposedLiveRun, {
  calls: 20,
  goldCalls: 12,
  negativeCalls: 8,
  retries: 0,
  model: "gpt-5.6-terra",
  reasoningEffort: "high"
});
assert.equal(gold.length, 12);
assert.equal(negatives.length, 8);
assert.equal(cases.length, CARD_JUDGE_V3_CALL_BUDGET);
assert.equal(cases.filter((fixture) => fixture.kind === "gold").length, 12);
assert.equal(cases.filter((fixture) => fixture.kind === "negative").length, 8);

for (const fixture of cases) {
  assert.equal(fixture.packet.surface, "card");
  assert.equal(fixture.packet.ownerComparisonSet.length, 3);
  assert.ok(fixture.packet.ownerComparisonSet.every((entry) => entry.surface === "card" && entry.status === "owner-locked"));
  assert.ok(fixture.packet.ownerComparisonSet.every((entry) => entry.provenance.sourceType === "owner_authored_final"));
  assert.deepEqual(fixture.packet.locationContract.allowedLocations, [...CARD_JUDGE_V3_LOCATIONS]);
  assert.ok(fixture.packet.labeledNegativeExamples.every((entry) => entry.eligiblePositiveEvidence === false));
  for (const location of CARD_JUDGE_V3_LOCATIONS) assert.ok(fixture.packet.completeCard.includes(location));
  assert.equal(fixture.expectedVerdict, fixture.kind === "gold" ? "PASS" : "REVISE");
}

for (const pair of manifest.pairs) {
  const positive = cases.find((fixture) => fixture.fixtureId === pair.positiveFixtureId);
  const negative = cases.find((fixture) => fixture.fixtureId === pair.negativeFixtureId);
  assert.ok(positive && negative, `${pair.id} must materialize both variants.`);
  assert.equal(cardJudgeV3PacketContextHash(positive.packet), cardJudgeV3PacketContextHash(negative.packet), `${pair.id} variants must share an identical non-candidate packet.`);
  const positiveBlocks = positive.packet.completeCard.split(/\n\n/u);
  const negativeBlocks = negative.packet.completeCard.split(/\n\n/u);
  assert.equal(positiveBlocks.length, 4);
  assert.equal(negativeBlocks.length, 4);
  const changed = positiveBlocks.flatMap((value, index) => value === negativeBlocks[index] ? [] : [index]);
  assert.deepEqual(changed, [["tagline", "hook", "lived", "turn"].indexOf(pair.replacementField)], `${pair.id} must change only its named field.`);
  assert.deepEqual(positive.packet.ownerComparisonSet.map((item) => item.evidenceId), pair.comparisonSet);
  assert.deepEqual(negative.packet.ownerComparisonSet.map((item) => item.evidenceId), pair.comparisonSet);
}

const example = cases.find((fixture) => fixture.fixtureId === "gold-lilith-aries-v5");
const eligibleEvidenceId = example.packet.ownerComparisonSet[0].evidenceId;
assert.equal(evaluateCardJudgeV3({ packet: example.packet, modelOutput: { findings: [] } }).verdict, "PASS");
assert.equal(evaluateCardJudgeV3({
  packet: example.packet,
  modelOutput: { findings: [{
    category: "owner_voice_drift",
    location: CARD_JUDGE_V3_LOCATIONS[2],
    finding: "The line becomes generic category-list abstraction beside the supplied cards.",
    evidence_ids: [eligibleEvidenceId]
  }] }
}).verdict, "REVISE");
assert.throws(() => evaluateCardJudgeV3({
  packet: example.packet,
  modelOutput: { findings: [{ category: "owner_voice_drift", location: CARD_JUDGE_V3_LOCATIONS[2], finding: "Unsupported.", evidence_ids: [] }] }
}), /requires eligible comparison evidence/u);
assert.throws(() => evaluateCardJudgeV3({ packet: example.packet, modelOutput: { verdict: "PASS", findings: [] } }), /must not contain verdict/u);
assert.throws(() => evaluateCardJudgeV3({
  packet: example.packet,
  modelOutput: { findings: [{ category: "stock_trope", location: "lived", finding: "Bad location.", evidence_ids: [] }] }
}), /unsupplied location/u);

const failPacket = { ...example.packet, validatorResults: { findings: [{
  category: "shared_ban",
  location: CARD_JUDGE_V3_LOCATIONS[1],
  finding: "Deterministic em-dash violation.",
  evidence_ids: []
}] } };
assert.equal(evaluateCardJudgeV3({ packet: failPacket, modelOutput: { findings: [] } }).verdict, "FAIL");

const baselineWrongVerdictCases = new Map([
  ["neg-capricorn-career", "house_bleed"],
  ["neg-sagittarius-9th", "house_bleed"],
  ["neg-taurus-tagline", "tagline_stands_alone"],
  ["neg-virgo-clinical", "stock_trope"]
]);
for (const [fixtureId, category] of baselineWrongVerdictCases) {
  const fixture = cases.find((item) => item.fixtureId === fixtureId);
  assert.equal(cardJudgeV3Verdict([{ category }]), "REVISE", `${fixtureId} verdict must come from config, not the model.`);
  assert.equal(fixture.expectedVerdict, "REVISE");
}

const selfComparison = example.packet.ownerComparisonSet[0];
assert.throws(() => buildCardJudgeV3Packet({
  candidateEvidenceId: selfComparison.evidenceId,
  candidate: selfComparison.card,
  astrologyFacts: example.packet.astrologyFacts,
  meaningPlan: example.packet.meaningPlan,
  ownerComparisonSet: example.packet.ownerComparisonSet,
  targetFunctions: example.packet.targetFunctions,
  labeledNegativeExamples: example.packet.labeledNegativeExamples,
  validatorResults: example.packet.validatorResults
}), /forbidden from its own comparison set/u);
assert.throws(() => buildCardJudgeV3Packet({
  candidateEvidenceId: "candidate",
  candidate: { tagline: "A", hook: "B", lived: "C", turn: "D" },
  astrologyFacts: {},
  meaningPlan: {},
  ownerComparisonSet: example.packet.ownerComparisonSet.map((item, index) => index === 0 ? { ...item, surface: "report" } : item),
  targetFunctions: ["hook"],
  labeledNegativeExamples: example.packet.labeledNegativeExamples,
  validatorResults: {}
}), /Cross-surface comparison evidence/u);
assert.match(cardJudgeV3PacketPrompt(rubric, example.packet), /SURFACE[\s\S]*COMPLETE_CARD[\s\S]*ASTROLOGY_FACTS[\s\S]*OWNER_COMPARISON_SET[\s\S]*LABELED_NEGATIVE_EXAMPLES[\s\S]*VALIDATOR_RESULTS/u);

assert.throws(() => assertCardJudgeV3LiveAuthorization({ env: {}, artifactExists: false }), /No billed call was made/u);
assert.deepEqual(assertCardJudgeV3LiveAuthorization({ env: { [CARD_JUDGE_V3_AUTHORIZATION_ENV]: CARD_JUDGE_V3_AUTHORIZATION_TOKEN }, artifactExists: false }), {
  authorizedCalls: 20,
  retriesAuthorized: 0
});
assert.throws(() => assertCardJudgeV3LiveAuthorization({
  env: { [CARD_JUDGE_V3_AUTHORIZATION_ENV]: CARD_JUDGE_V3_AUTHORIZATION_TOKEN },
  artifactExists: true
}), /already been consumed/u);
assert.match(runner, /reasoning: \{ effort: manifest\.proposedLiveRun\.reasoningEffort \}/u);
assert.match(runner, /Generic CLI authorization is forbidden/u);
assert.match(runner, /CARD_JUDGE_V3_ARTIFACT_PATH/u);
assert.match(runner, /callOpenAIResponses/u);
assert.ok(!runner.includes("api.openai.com/v1/responses"));
assert.equal(CARD_JUDGE_V3_ARTIFACT_PATH, "packages/astro-knowledge/review/writing-harness-v3/card-judge-v3-live-evaluation-run-1.json");

for (const id of ["aries", "taurus", "gemini", "leo", "virgo", "capricorn", "aquarius"]) {
  assert.match(rubric, new RegExp(`gold-lilith-${id}-v5`, "u"), `${id} run-one false positive must be a do-not-flag control.`);
}

console.log(JSON.stringify({
  status: "PASS",
  surface: "card",
  categories: CARD_JUDGE_V3_CATEGORIES.length,
  goldContracts: 12,
  pairedNegativeContracts: 8,
  liveCallsMade: 0,
  ownerApproved: false,
  promotionAuthorized: false
}, null, 2));
