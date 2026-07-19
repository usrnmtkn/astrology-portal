import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { createServer } from "vite";

const require = createRequire(import.meta.url);
const {
  buildPatternActivations,
  detectPatterns,
  rankAspectPatterns
} = require("../packages/astro-knowledge/engine/aspect-patterns/index.js");
const realNatalFixtures = require("../packages/astro-knowledge/engine/aspect-patterns/fixtures/real/index.js");
const realActivationFixtures = require("../packages/astro-knowledge/engine/aspect-patterns/fixtures/activation/real/index.js");

function outputForCase(fixtureCase) {
  const natalFixture = realNatalFixtures[fixtureCase.fixtureId];
  assert.ok(natalFixture, `${fixtureCase.id} references unknown natal fixture ${fixtureCase.fixtureId}`);
  const detection = detectPatterns({
    planets: natalFixture.input.planets,
    aspects: natalFixture.input.aspects
  });
  const ranking = rankAspectPatterns(detection, {
    planets: natalFixture.input.planets,
    ...(natalFixture.input.angles ?? {})
  });
  const rankedDetection = {
    ...detection,
    ranking
  };
  const activation = buildPatternActivations(
    rankedDetection,
    fixtureCase.transitToNatalAspects,
    { calculatedFor: fixtureCase.calculatedFor }
  );
  return {
    natalFixture,
    detection,
    rankedDetection,
    activation
  };
}

function activationProjection(activation, natalDisplayOrder) {
  return {
    activationIds: activation.activations.map((item) => item.id),
    activatedPatternIds: activation.activations.map((item) => item.patternId),
    triggerRoles: Object.fromEntries(activation.activations.map((item) => [item.id, item.trigger.targetRoles])),
    triggers: Object.fromEntries(activation.activations.map((item) => [item.id, {
      movingBody: item.trigger.movingBody,
      targetNatalPlanet: item.trigger.targetNatalPlanet,
      aspectType: item.trigger.aspectType,
      exactAt: item.trigger.exactAt ?? null,
      sourceAspectId: item.trigger.sourceAspectId
    }])),
    reasonCodes: Object.fromEntries(activation.activations.map((item) => [item.id, item.reasons.map((reason) => reason.code)])),
    scores: Object.fromEntries(activation.activations.map((item) => [item.id, item.score])),
    natalDisplayOrder,
    currentDisplayOrder: activation.currentDisplayOrder
  };
}

function titlePart(value) {
  return String(value)
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function skySnapshotFromCase(fixtureCase) {
  const natalFixture = realNatalFixtures[fixtureCase.fixtureId];
  const angles = natalFixture.input.angles ?? {};
  return {
    location: {
      label: "De-identified activation fixture",
      latitude: 0,
      longitude: 0,
      timeZone: "UTC"
    },
    generatedAt: fixtureCase.calculatedFor,
    ascendant: angles.ascendantSign ? titlePart(angles.ascendantSign) : "Aries",
    ascendantLongitude: angles.ascendantLongitude,
    midheaven: "Capricorn",
    midheavenLongitude: angles.midheavenLongitude,
    moonPhase: "Fixture",
    dominantElement: "Fire",
    positions: natalFixture.input.planets.map((planet) => ({
      planet: titlePart(planet.id),
      glyph: "",
      longitude: planet.longitude,
      latitude: 0,
      sign: titlePart(planet.sign),
      signGlyph: "",
      degree: planet.longitude % 30,
      house: planet.house ?? 1,
      houseSystem: "whole_sign",
      motion: "direct"
    })),
    aspects: natalFixture.input.aspects.map((aspect) => ({
      id: aspect.id,
      bodyA: titlePart(aspect.pointA),
      bodyB: titlePart(aspect.pointB),
      from: titlePart(aspect.pointA),
      to: titlePart(aspect.pointB),
      type: aspect.type,
      exactAngle: aspect.exactAngle,
      separation: aspect.separation ?? aspect.exactAngle,
      orb: aspect.orb,
      applying: aspect.applying
    })),
    transitToNatalAspects: fixtureCase.transitToNatalAspects
  };
}

function assertNoDuplicateActivationIds(fixtureCase, activation) {
  const ids = activation.activations.map((item) => item.id);
  assert.equal(new Set(ids).size, ids.length, `${fixtureCase.id} produced duplicate activation IDs`);
}

function assertNoActivationProse(fixtureCase, activation) {
  const serialized = JSON.stringify(activation);
  assert.doesNotMatch(serialized, /\b(headline|overview|sections|reader|copy|prose|phrasebank)\b/i, `${fixtureCase.id} generated prose-facing fields`);
}

for (const fixtureCase of realActivationFixtures.cases) {
  const { detection, rankedDetection, activation } = outputForCase(fixtureCase);
  const before = JSON.stringify(rankedDetection);
  const expected = fixtureCase.expected;
  const projected = activationProjection(activation, rankedDetection.ranking.displayOrder);

  assert.deepEqual(
    fixtureCase.natalPatterns.map((pattern) => pattern.id).sort(),
    fixtureCase.natalPatterns.map((pattern) => pattern.id).slice().sort(),
    `${fixtureCase.id} fixture pattern summaries must be deterministic`
  );
  assert.deepEqual(projected.activationIds, expected.activationIds, `${fixtureCase.id} activation IDs changed`);
  assert.deepEqual(projected.activatedPatternIds, expected.activatedPatternIds, `${fixtureCase.id} activated pattern IDs changed`);
  assert.deepEqual(projected.triggerRoles, expected.triggerRoles, `${fixtureCase.id} trigger roles changed`);
  if (expected.triggers) {
    assert.deepEqual(projected.triggers, expected.triggers, `${fixtureCase.id} trigger facts changed`);
  }
  assert.deepEqual(projected.reasonCodes, expected.reasonCodes, `${fixtureCase.id} reason codes changed`);
  if (expected.scores) {
    assert.deepEqual(projected.scores, expected.scores, `${fixtureCase.id} score contributions changed`);
  }
  assert.deepEqual(projected.natalDisplayOrder, expected.natalDisplayOrder, `${fixtureCase.id} natal display order changed`);
  assert.deepEqual(projected.currentDisplayOrder, expected.currentDisplayOrder, `${fixtureCase.id} current display order changed`);
  assert.equal(JSON.stringify(rankedDetection), before, `${fixtureCase.id} activation mutated natal detection or ranking`);
  assertNoDuplicateActivationIds(fixtureCase, activation);
  assertNoActivationProse(fixtureCase, activation);

  const reversedActivation = buildPatternActivations(
    rankedDetection,
    fixtureCase.transitToNatalAspects.slice().reverse(),
    { calculatedFor: fixtureCase.calculatedFor }
  );
  assert.equal(JSON.stringify(reversedActivation), JSON.stringify(activation), `${fixtureCase.id} reversed transit order changed output`);

  for (const activationRecord of activation.activations) {
    assert.ok(detection.patterns.some((pattern) => pattern.id === activationRecord.patternId), `${fixtureCase.id} activated unknown pattern`);
    assert.ok(activationRecord.trigger.sourceAspectId, `${fixtureCase.id} lost source aspect id`);
    assert.equal(typeof activationRecord.trigger.applying, "boolean", `${fixtureCase.id} lost applying/separating state`);
  }
}

{
  const grandSquareCase = realActivationFixtures.cases.find((item) => item.id === "transit-to-grand-square-member-repeated");
  const { activation } = outputForCase(grandSquareCase);
  assert.equal(grandSquareCase.classification, "EXPECTED_OVERLAP");
  assert.equal(activation.activations.length, grandSquareCase.expected.activatedPatternIds.length, "Shared Moon transit must fan out to every containing Grand Square/T-square pattern");
  assert.ok(activation.activations.some((item) => item.patternId.includes("grand_square")));
  assert.ok(activation.activations.some((item) => item.patternId.includes("t_square")));
}

{
  const kiteCase = realActivationFixtures.cases.find((item) => item.id === "transit-to-kite-resource-planet");
  const { activation } = outputForCase(kiteCase);
  assert.equal(kiteCase.classification, "EXPECTED_OVERLAP");
  assert.deepEqual(activation.activations.map((item) => item.patternId), [kiteGrandTrinePatternId(), kitePatternId()]);
}

{
  const noMatch = realActivationFixtures.cases.find((item) => item.id === "no-matching-transit");
  const { activation } = outputForCase(noMatch);
  assert.equal(activation.activations.length, 0);
  assert.ok(Array.isArray(activation.currentRankings));
  assert.deepEqual(activation.currentDisplayOrder, noMatch.expected.currentDisplayOrder);
}

function kitePatternId() {
  return "aspect-pattern:kite:sun-moon-pluto:focal-uranus";
}

function kiteGrandTrinePatternId() {
  return "aspect-pattern:grand_trine:sun-moon-pluto";
}

const vite = await createServer({
  root: new URL("..", import.meta.url).pathname,
  server: { middlewareMode: true, hmr: false },
  appType: "custom",
  logLevel: "error"
});

try {
  const { aspectPatternsFromSkySnapshot } = await vite.ssrLoadModule("/api/_lib/aspect-patterns.ts");
  const { buildAstrologyFactsApiResponse } = await vite.ssrLoadModule("/api/astrology-facts.ts");
  const apiCase = realActivationFixtures.cases.find((item) => item.id === "transit-to-grand-square-member-repeated");
  const sky = skySnapshotFromCase(apiCase);
  const direct = aspectPatternsFromSkySnapshot(sky, { includeActivation: true, calculatedFor: apiCase.calculatedFor });
  const apiBody = buildAstrologyFactsApiResponse(sky, true, false, true).body;
  const absent = buildAstrologyFactsApiResponse(sky, true, false, false).body;
  const noPatterns = buildAstrologyFactsApiResponse(sky, false, false, true).body;

  assert.deepEqual(apiBody.sky.aspectPatterns.activation, direct.activation, "API activation output must match direct helper output");
  assert.equal(apiBody.aspectPatterns, apiBody.sky.aspectPatterns, "Top-level alias must match canonical sky.aspectPatterns object");
  assert.equal("activation" in absent.sky.aspectPatterns, false, "Activation must remain absent without activation flag");
  assert.equal("aspectPatterns" in noPatterns.sky, false, "Activation flag alone must not add aspectPatterns");
} finally {
  await vite.close();
}

console.log("Real aspect-pattern activation fixture tests passed.");
