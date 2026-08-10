import fs from "node:fs";
import crypto from "node:crypto";
import { cardJudgeV3CardHash } from "../src/astro-writing/cardJudgeV3.mjs";
import {
  CARD_JUDGE_V3_1_VERSION,
  buildCardJudgeV31Packet,
  validateCardJudgeV31HouseBleed
} from "../src/astro-writing/cardJudgeV31.mjs";

export const CARD_JUDGE_V3_1_MANIFEST_PATH = "packages/astro-knowledge/review/writing-harness-v3/card-judge-v3-1-fixture-contracts.json";
export const CARD_JUDGE_V3_1_GOLD_PATH = "data/writing/owner-approved-examples.jsonl";
export const CARD_JUDGE_V3_1_NEGATIVE_PATH = "data/writing/negative-regression-fixtures.jsonl";
export const CARD_JUDGE_V3_1_MECHANISM_PATH = "packages/astro-knowledge/review/writing-harness-v3/card-judge-v3-1-mechanism-records.json";
export const CARD_JUDGE_V3_1_PACKET_VERSION = CARD_JUDGE_V3_1_VERSION;

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

function comparisonEvidence(fixture, mechanismRecord) {
  const card = completeCard(fixture);
  return {
    evidenceId: fixture.fixture_id,
    surface: "card",
    status: fixture.status,
    interiority: mechanismRecord.interiority,
    functions: ["hook", "development", "turn"],
    provenance: {
      sourcePath: CARD_JUDGE_V3_1_GOLD_PATH,
      sourceType: "owner_authored_final",
      sourceSha256: cardJudgeV3CardHash(card)
    },
    card
  };
}

function meaningPlan(fixture, mechanismRecord) {
  const element = (id) => mechanismRecord.elements.find((item) => item.id === id)?.text;
  return {
    content_type: fixture.content_family,
    object: fixture.astrology_context.object,
    sign: fixture.astrology_context.sign,
    house: null,
    event_type: "placement",
    object_function: [element("core_theme_wound")],
    sign_mechanics: [element("manifestation_space.body")],
    core_tension: fixture.tagline,
    observable_behaviors: [fixture.hook, fixture.lived],
    possible_consequences: [fixture.turn],
    do_not_assume: mechanismRecord.doNotAssume
  };
}

function sha256(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function resolveMechanismRecords() {
  const sourceText = fs.readFileSync(CARD_JUDGE_V3_1_MECHANISM_PATH, "utf8");
  const dataset = JSON.parse(sourceText);
  const records = dataset.records.map((record) => {
    const doctrineText = fs.readFileSync(record.sourcePath, "utf8");
    if (sha256(doctrineText) !== record.sourceSha256) throw new Error(`${record.placementId} doctrine provenance hash drifted.`);
    const doctrine = JSON.parse(doctrineText);
    if (doctrine.id !== record.placementId || doctrine.key !== record.sign || doctrine.status !== "LIVE") {
      throw new Error(`${record.placementId} mechanism provenance does not resolve to the owner-reviewed LIVE row.`);
    }
    const profile = dataset.doNotAssumeProfiles[record.doNotAssumeProfile];
    if (!profile || !Array.isArray(profile.items) || profile.items.length === 0) throw new Error(`${record.placementId} omitted DO-NOT-ASSUME.`);
    const doctrineProvenance = (sourceField) => ({
      sourcePath: record.sourcePath,
      sourceSha256: record.sourceSha256,
      sourceField,
      sourceStatus: doctrine.status,
      ownerReviewedAt: "2026-07-28"
    });
    const elements = [
      { id: "core_theme_wound", kind: "core_theme_wound", text: doctrine[record.sourceFields.coreThemeWound], provenance: doctrineProvenance(record.sourceFields.coreThemeWound) },
      ...record.sourceFields.manifestationSpace.map((sourceField) => ({
        id: `manifestation_space.${sourceField}`,
        kind: "manifestation_space",
        text: doctrine[sourceField],
        provenance: doctrineProvenance(sourceField)
      })),
      {
        id: "interiority",
        kind: "interiority",
        text: record.interiority,
        provenance: { authority: "owner-ruling-and-row-derivation-2026-08-09", basis: record.interiorityBasis }
      },
      ...profile.items.map((text, index) => ({
        id: `do_not_assume.${index}`,
        kind: "do_not_assume",
        text,
        provenance: { authority: profile.authority }
      })),
      ...record.houseBleedNounBlacklist.terms.map((term) => ({
        id: `house_bleed_noun_blacklist.${term}`,
        kind: "house_bleed_noun_blacklist",
        text: term,
        provenance: { status: record.houseBleedNounBlacklist.status, ownerApproved: record.houseBleedNounBlacklist.ownerApproved }
      }))
    ];
    return {
      version: dataset.version,
      placementId: record.placementId,
      fixtureId: record.fixtureId,
      sign: record.sign,
      interiority: record.interiority,
      doNotAssume: [...profile.items],
      houseBleedNounBlacklist: record.houseBleedNounBlacklist,
      elements,
      provenance: { sourcePath: record.sourcePath, sourceSha256: record.sourceSha256, sourceStatus: doctrine.status }
    };
  });
  return { dataset, sourceText, records };
}

export function loadCardJudgeV31FixtureSet() {
  const manifestText = fs.readFileSync(CARD_JUDGE_V3_1_MANIFEST_PATH, "utf8");
  const manifest = JSON.parse(manifestText);
  const gold = jsonl(CARD_JUDGE_V3_1_GOLD_PATH);
  const negatives = jsonl(CARD_JUDGE_V3_1_NEGATIVE_PATH);
  const mechanisms = resolveMechanismRecords();
  const goldById = new Map(gold.map((fixture) => [fixture.fixture_id, fixture]));
  const negativeById = new Map(negatives.map((fixture) => [fixture.fixture_id, fixture]));
  const mechanismByFixture = new Map(mechanisms.records.map((record) => [record.fixtureId, record]));
  const pairByPositive = new Map(manifest.pairs.map((pair) => [pair.positiveFixtureId, pair]));
  const rulingByFixture = new Map(manifest.goldFindingRulings.map((ruling) => [ruling.fixtureId, ruling]));
  const defaultComparisonIds = (fixtureId) => {
    const interiority = mechanismByFixture.get(fixtureId)?.interiority;
    return gold
      .filter((fixture) => fixture.fixture_id !== fixtureId && mechanismByFixture.get(fixture.fixture_id)?.interiority === interiority)
      .slice(0, 3)
      .map((fixture) => fixture.fixture_id);
  };

  function packetFor({ fixture, candidate, comparisonIds, mechanismFixtureId }) {
    const mechanismRecord = mechanismByFixture.get(mechanismFixtureId);
    if (!mechanismRecord) throw new Error(`${fixture.fixture_id} omitted its mechanism record.`);
    const validatorResults = validateCardJudgeV31HouseBleed({ candidate, mechanismRecord });
    return buildCardJudgeV31Packet({
      candidateEvidenceId: fixture.fixture_id,
      candidate,
      astrologyFacts: fixture.astrology_context,
      meaningPlan: meaningPlan(fixture, mechanismRecord),
      mechanismRecord,
      ownerComparisonSet: comparisonIds.map((id) => comparisonEvidence(goldById.get(id), mechanismByFixture.get(id))),
      targetFunctions: ["hook", "development", "turn"],
      labeledNegativeExamples: LABELED_NEGATIVE_EXAMPLES,
      validatorResults: { calibrationOnly: true, deterministicIssues: [], findings: validatorResults.findings }
    });
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
      packet: packetFor({ fixture, candidate: completeCard(fixture), comparisonIds, mechanismFixtureId: fixture.fixture_id })
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
      packet: packetFor({
        fixture: { ...positive, fixture_id: negative.fixture_id },
        candidate,
        comparisonIds: pair.comparisonSet,
        mechanismFixtureId: pair.positiveFixtureId
      })
    });
  }

  return { manifest, manifestText, mechanisms, gold, negatives, cases };
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
