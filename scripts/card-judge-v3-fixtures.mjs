import fs from "node:fs";
import crypto from "node:crypto";
import { buildCardJudgeV3Packet, cardJudgeV3CardHash } from "../src/astro-writing/cardJudgeV3.mjs";

export const CARD_JUDGE_V3_MANIFEST_PATH = "packages/astro-knowledge/review/writing-harness-v3/card-judge-v3-paired-fixtures.json";
export const CARD_JUDGE_V3_GOLD_PATH = "data/writing/owner-approved-examples.jsonl";
export const CARD_JUDGE_V3_NEGATIVE_PATH = "data/writing/negative-regression-fixtures.jsonl";

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
      sourcePath: CARD_JUDGE_V3_GOLD_PATH,
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

export const CARD_JUDGE_V3_LABELED_NEGATIVE_EXAMPLES = Object.freeze([
  Object.freeze({
    evidenceId: "negative-control-untranslated-metaphor",
    label: "negative example only",
    eligiblePositiveEvidence: false,
    text: "The old wound becomes a doorway and the truth finally learns to breathe."
  }),
  Object.freeze({
    evidenceId: "negative-control-generic-category-list",
    label: "negative example only",
    eligiblePositiveEvidence: false,
    text: "Work, love, money, confidence, and belonging all come into focus."
  })
]);

export function loadCardJudgeV3FixtureSet() {
  const manifestText = fs.readFileSync(CARD_JUDGE_V3_MANIFEST_PATH, "utf8");
  const manifest = JSON.parse(manifestText);
  const gold = jsonl(CARD_JUDGE_V3_GOLD_PATH);
  const negatives = jsonl(CARD_JUDGE_V3_NEGATIVE_PATH);
  const goldById = new Map(gold.map((fixture) => [fixture.fixture_id, fixture]));
  const negativeById = new Map(negatives.map((fixture) => [fixture.fixture_id, fixture]));
  const pairByPositive = new Map(manifest.pairs.map((pair) => [pair.positiveFixtureId, pair]));
  const defaultComparisonIds = (fixtureId) => gold.filter((fixture) => fixture.fixture_id !== fixtureId).slice(0, 3).map((fixture) => fixture.fixture_id);

  function packetFor({ fixture, candidate, comparisonIds }) {
    return buildCardJudgeV3Packet({
      candidateEvidenceId: fixture.fixture_id,
      candidate,
      astrologyFacts: fixture.astrology_context,
      meaningPlan: meaningPlan(fixture),
      ownerComparisonSet: comparisonIds.map((id) => comparisonEvidence(goldById.get(id))),
      targetFunctions: ["hook", "development", "turn"],
      labeledNegativeExamples: CARD_JUDGE_V3_LABELED_NEGATIVE_EXAMPLES,
      validatorResults: { calibrationOnly: true, deterministicIssues: [], findings: [] }
    });
  }

  const cases = [];
  for (const fixture of gold) {
    const pair = pairByPositive.get(fixture.fixture_id);
    const comparisonIds = pair?.comparisonSet ?? defaultComparisonIds(fixture.fixture_id);
    cases.push({
      fixtureId: fixture.fixture_id,
      kind: "gold",
      pairId: pair?.id ?? null,
      expectedVerdict: "PASS",
      targetCategories: [],
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
      expectedVerdict: pair.configuredNegativeVerdict,
      targetCategories: pair.targetCategories,
      replacementField: pair.replacementField,
      packet: packetFor({ fixture: { ...positive, fixture_id: negative.fixture_id }, candidate, comparisonIds: pair.comparisonSet })
    });
  }
  return { manifest, manifestText, gold, negatives, cases };
}

export function cardJudgeV3PacketContextHash(packet) {
  const context = { ...packet, completeCard: "PAIR_CANDIDATE_OMITTED" };
  return crypto.createHash("sha256").update(JSON.stringify(context)).digest("hex");
}
