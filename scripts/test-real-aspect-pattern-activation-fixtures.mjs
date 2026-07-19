import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { createServer } from "vite";

const require = createRequire(import.meta.url);
const {
  buildAspectPatternActivationInterpretationContexts,
  buildAspectPatternInterpretationContexts,
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
  const interpretationContexts = buildAspectPatternInterpretationContexts(rankedDetection, {
    planets: natalFixture.input.planets,
    ...(natalFixture.input.angles ?? {})
  });
  const activation = buildPatternActivations(
    { ...rankedDetection, interpretationContexts },
    fixtureCase.transitToNatalAspects,
    { calculatedFor: fixtureCase.calculatedFor }
  );
  return {
    natalFixture,
    detection,
    rankedDetection: { ...rankedDetection, interpretationContexts },
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
  const activationContexts = buildAspectPatternActivationInterpretationContexts({ ...rankedDetection, activation });

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
  assert.equal(activationContexts.length, new Set(activation.activations.map((item) => item.patternId)).size, `${fixtureCase.id} should emit one context per activated pattern`);
  assert.equal(JSON.stringify(rankedDetection), before, `${fixtureCase.id} context builder mutated natal contexts or ranking`);
  assert.doesNotMatch(JSON.stringify(activationContexts), /\b(headline|overview|paragraph|reader|phrasebank)\b/i, `${fixtureCase.id} context generated prose`);
  for (const context of activationContexts) {
    assert.ok(context.provenance.activationContextBuilderVersion, `${fixtureCase.id} context missing provenance`);
    assert.equal(context.copyInstructions.allowedCertainty, "qualified");
    assert.ok(context.triggers.length > 0);
  }

  const reversedActivation = buildPatternActivations(
    rankedDetection,
    fixtureCase.transitToNatalAspects.slice().reverse(),
    { calculatedFor: fixtureCase.calculatedFor }
  );
  assert.equal(JSON.stringify(reversedActivation), JSON.stringify(activation), `${fixtureCase.id} reversed transit order changed output`);
  assert.equal(
    JSON.stringify(buildAspectPatternActivationInterpretationContexts({ ...rankedDetection, activation: reversedActivation })),
    JSON.stringify(activationContexts),
    `${fixtureCase.id} reversed activation order changed contexts`
  );

  for (const activationRecord of activation.activations) {
    assert.ok(detection.patterns.some((pattern) => pattern.id === activationRecord.patternId), `${fixtureCase.id} activated unknown pattern`);
    assert.ok(activationRecord.trigger.sourceAspectId, `${fixtureCase.id} lost source aspect id`);
    assert.equal(typeof activationRecord.trigger.applying, "boolean", `${fixtureCase.id} lost applying/separating state`);
  }
}

{
  const grandSquareCase = realActivationFixtures.cases.find((item) => item.id === "transit-to-grand-square-member-repeated");
  const { activation } = outputForCase(grandSquareCase);
  const { rankedDetection } = outputForCase(grandSquareCase);
  const contexts = buildAspectPatternActivationInterpretationContexts({ ...rankedDetection, activation });
  assert.equal(grandSquareCase.classification, "EXPECTED_OVERLAP");
  assert.equal(activation.activations.length, grandSquareCase.expected.activatedPatternIds.length, "Shared Moon transit must fan out to every containing Grand Square/T-square pattern");
  assert.ok(activation.activations.some((item) => item.patternId.includes("grand_square")));
  assert.ok(activation.activations.some((item) => item.patternId.includes("t_square")));
  assert.equal(contexts.length, activation.activations.length);
  assert.ok(contexts.every((context) => context.activationSummary.sharedPlanetFanout));
}

{
  const kiteCase = realActivationFixtures.cases.find((item) => item.id === "transit-to-kite-resource-planet");
  const { activation } = outputForCase(kiteCase);
  const { rankedDetection } = outputForCase(kiteCase);
  const contexts = buildAspectPatternActivationInterpretationContexts({ ...rankedDetection, activation });
  assert.equal(kiteCase.classification, "EXPECTED_OVERLAP");
  assert.deepEqual(activation.activations.map((item) => item.patternId), [kiteGrandTrinePatternId(), kitePatternId()]);
  assert.deepEqual(contexts.map((context) => context.patternId), [kitePatternId(), kiteGrandTrinePatternId()]);
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
  const direct = aspectPatternsFromSkySnapshot(sky, { includeActivation: true, includeActivationContexts: true, calculatedFor: apiCase.calculatedFor });
  const apiBody = buildAstrologyFactsApiResponse(sky, true, false, true, true).body;
  const absent = buildAstrologyFactsApiResponse(sky, true, false, false).body;
  const activationWithoutContexts = buildAstrologyFactsApiResponse(sky, true, false, true, false).body;
  const noPatterns = buildAstrologyFactsApiResponse(sky, false, false, true).body;

  assert.deepEqual(apiBody.sky.aspectPatterns.activation, direct.activation, "API activation output must match direct helper output");
  assert.equal(apiBody.aspectPatterns, apiBody.sky.aspectPatterns, "Top-level alias must match canonical sky.aspectPatterns object");
  assert.ok(apiBody.sky.aspectPatterns.activation.interpretationContexts, "API should expose activation contexts with the third flag");
  assert.equal("activation" in absent.sky.aspectPatterns, false, "Activation must remain absent without activation flag");
  assert.equal("interpretationContexts" in activationWithoutContexts.sky.aspectPatterns.activation, false, "Activation contexts must remain absent without context flag");
  assert.equal("aspectPatterns" in noPatterns.sky, false, "Activation flag alone must not add aspectPatterns");
} finally {
  await vite.close();
}

console.log("Real aspect-pattern activation fixture tests passed.");
