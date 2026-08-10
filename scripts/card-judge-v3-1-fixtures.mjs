import fs from "node:fs";
import { buildCardJudgeV3Packet, cardJudgeV3CardHash } from "../src/astro-writing/cardJudgeV3.mjs";

export const CARD_JUDGE_V3_1_MANIFEST_PATH = "packages/astro-knowledge/review/writing-harness-v3/card-judge-v3-1-fixture-contracts.json";
export const CARD_JUDGE_V3_1_GOLD_PATH = "data/writing/owner-approved-examples.jsonl";
export const CARD_JUDGE_V3_1_NEGATIVE_PATH = "data/writing/negative-regression-fixtures.jsonl";
export const CARD_JUDGE_V3_1_PACKET_VERSION = "card-writing-judge-rubric-v3.1-draft";

const LABELED_NEGATIVE_EXAMPLES = Object.freeze([
  Object.freeze({
    evidenceId: "must-flag-neg-aries-dishes",
    label: "MUST-FLAG stock_trope/example_proves_astrology boundary",
    eligiblePositiveEvidence: false,
    text: "Someone's temper is shorter than usual, and it is not really about the dishes."
  }),
  Object.freeze({
    evidenceId: "must-flag-neg-pisces-well",
    label: "MUST-FLAG metaphor_requires_translation boundary",
    eligiblePositiveEvidence: false,
    text: "Some people will drain a well dry and then blame it for being empty."
  }),
  Object.freeze({
    evidenceId: "must-flag-neg-taurus-tagline",
    label: "MUST-FLAG tagline_stands_alone boundary",
    eligiblePositiveEvidence: false,
    text: "The bargain ends."
  })
]);

function jsonl(sourcePath) {
  return fs.readFileSync(sourcePath, "utf8").trim().split(/\r?\n/u).filter(Boolean).map(JSON.parse);
}

function completeCard(fixture) {
  return Object.fromEntries(["tagline", "hook", "lived", "turn"].map((field) => [field, fixture[field]]));
}

function comparisonEvidence(fixture) {
  const card = completeCard(fixture);
  return {
    evidenceId: fixture.fixture_id,
    surface: "card",
    status: fixture.status,
    functions: ["hook", "development", "turn"],
    provenance: {
      sourcePath: CARD_JUDGE_V3_1_GOLD_PATH,
      sourceType: "owner_authored_final",
      sourceSha256: cardJudgeV3CardHash(card)
    },
    card
  };
}

function meaningPlan(fixture) {
  return {
    content_type: fixture.content_family,
    object: fixture.astrology_context.object,
    sign: fixture.astrology_context.sign,
    house: null,
    event_type: "placement",
    object_function: ["brings buried, rejected, or defended wants and refusals into view"],
    sign_mechanics: [fixture.hook],
    core_tension: fixture.tagline,
    observable_behaviors: [fixture.hook, fixture.lived],
    possible_consequences: [fixture.turn],
    do_not_assume: ["a house, motive, biography, diagnosis, outcome, or relationship status not supplied by governed facts"]
  };
}

export function loadCardJudgeV31FixtureSet() {
  const manifestText = fs.readFileSync(CARD_JUDGE_V3_1_MANIFEST_PATH, "utf8");
  const manifest = JSON.parse(manifestText);
  const gold = jsonl(CARD_JUDGE_V3_1_GOLD_PATH);
  const negatives = jsonl(CARD_JUDGE_V3_1_NEGATIVE_PATH);
  const goldById = new Map(gold.map((fixture) => [fixture.fixture_id, fixture]));
  const negativeById = new Map(negatives.map((fixture) => [fixture.fixture_id, fixture]));
  const pairByPositive = new Map(manifest.pairs.map((pair) => [pair.positiveFixtureId, pair]));
  const rulingByFixture = new Map(manifest.goldFindingRulings.map((ruling) => [ruling.fixtureId, ruling]));
  const defaultComparisonIds = (fixtureId) => gold.filter((fixture) => fixture.fixture_id !== fixtureId).slice(0, 3).map((fixture) => fixture.fixture_id);

  function packetFor({ fixture, candidate, comparisonIds }) {
    const packet = buildCardJudgeV3Packet({
      candidateEvidenceId: fixture.fixture_id,
      candidate,
      astrologyFacts: fixture.astrology_context,
      meaningPlan: meaningPlan(fixture),
      ownerComparisonSet: comparisonIds.map((id) => comparisonEvidence(goldById.get(id))),
      targetFunctions: ["hook", "development", "turn"],
      labeledNegativeExamples: LABELED_NEGATIVE_EXAMPLES,
      validatorResults: { calibrationOnly: true, deterministicIssues: [], findings: [] }
    });
    return { ...packet, version: CARD_JUDGE_V3_1_PACKET_VERSION };
  }

  const cases = [];
  for (const fixture of gold) {
    const pair = pairByPositive.get(fixture.fixture_id);
    const ruling = rulingByFixture.get(fixture.fixture_id);
    const comparisonIds = ruling?.comparisonSet ?? pair?.comparisonSet ?? defaultComparisonIds(fixture.fixture_id);
    cases.push({
      fixtureId: fixture.fixture_id,
      kind: "gold",
      pairId: pair?.id ?? null,
      expectedVerdict: "PASS",
      contract: { prohibitedRecurrence: ruling?.prohibitedRecurrence ?? null },
      packet: packetFor({ fixture, candidate: completeCard(fixture), comparisonIds })
    });
  }

  for (const pair of manifest.pairs) {
    const positive = goldById.get(pair.positiveFixtureId);
    const negative = negativeById.get(pair.negativeFixtureId);
    if (!positive || !negative) throw new Error(`${pair.id} references a missing fixture.`);
    const candidate = { ...completeCard(positive), [pair.replacementField]: negative.bad_text };
    cases.push({
      fixtureId: negative.fixture_id,
      kind: "negative",
      pairId: pair.id,
      expectedVerdict: pair.verdict,
      contract: {
        requiredPrimary: pair.required_primary,
        allowedPrimaryAlternates: pair.allowed_primary_alternates,
        forbiddenEscalations: pair.forbidden_escalations
      },
      replacementField: pair.replacementField,
      packet: packetFor({ fixture: { ...positive, fixture_id: negative.fixture_id }, candidate, comparisonIds: pair.comparisonSet })
    });
  }

  return { manifest, manifestText, gold, negatives, cases };
}

export function evaluateCardJudgeV31Contract({ fixture, verdict, categories }) {
  if (!fixture || !Array.isArray(categories)) throw new Error("V3.1 contract evaluation requires a fixture and ordered categories.");
  if (fixture.kind === "gold") {
    const prohibited = fixture.contract.prohibitedRecurrence;
    return {
      passed: verdict === "PASS" && categories.length === 0 && (!prohibited || !categories.includes(prohibited)),
      expectedVerdict: "PASS",
      prohibitedRecurrence: prohibited
    };
  }

  const acceptedPrimary = new Set([fixture.contract.requiredPrimary, ...fixture.contract.allowedPrimaryAlternates]);
  const forbiddenPresent = fixture.contract.forbiddenEscalations.filter((category) => categories.includes(category));
  const primary = categories[0] ?? null;
  return {
    passed: verdict === fixture.expectedVerdict
      && categories.length === 1
      && acceptedPrimary.has(primary)
      && forbiddenPresent.length === 0,
    expectedVerdict: fixture.expectedVerdict,
    primary,
    acceptedPrimary: [...acceptedPrimary],
    forbiddenPresent,
    collisionFree: categories.length === 1
  };
}
