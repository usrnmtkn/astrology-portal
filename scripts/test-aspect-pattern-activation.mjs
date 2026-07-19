import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import { createServer } from "vite";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const require = createRequire(import.meta.url);
const {
  buildAspectPatternActivationInterpretationContexts,
  buildAspectPatternInterpretationContexts,
  buildPatternActivations,
  detectPatterns,
  rankAspectPatterns
} = require("../packages/astro-knowledge/engine/aspect-patterns/index.js");
const { fixtures } = require("../packages/astro-knowledge/engine/aspect-patterns/fixtures.js");

const calculatedFor = "2026-07-19T12:00:00.000Z";

function rankedDetection(fixture, context = {}) {
  const detection = detectPatterns(fixture);
  const ranked = {
    ...detection,
    ranking: rankAspectPatterns(detection, {
      planets: fixture.planets,
      ascendantSign: "aries",
      ...context
    })
  };
  return {
    ...ranked,
    interpretationContexts: buildAspectPatternInterpretationContexts(ranked, {
      planets: fixture.planets,
      ascendantSign: "aries",
      ascendantLongitude: 0,
      midheavenLongitude: 270,
      ...context
    })
  };
}

function transit(overrides = {}) {
  return {
    id: "transit.mars.square.moon",
    movingBody: "mars",
    targetNatalPlanet: "moon",
    aspectType: "square",
    orb: 0.5,
    applying: true,
    exactAt: "2026-07-19T18:00:00.000Z",
    ...overrides
  };
}

function activationOutput(fixture, transitAspects, context = {}) {
  return buildPatternActivations(rankedDetection(fixture, context), transitAspects, { calculatedFor });
}

function patternIdsOfType(detection, type) {
  return detection.patterns.filter((pattern) => pattern.type === type).map((pattern) => pattern.id).sort();
}

{
  const output = activationOutput(fixtures.t_square, [transit({ targetNatalPlanet: "mars" })]);
  assert.equal(output.policyId, "aspect_pattern_activation_v1");
  assert.equal(output.calculatedFor, calculatedFor);
  assert.equal(output.activations.length, 1, "A transit to a pattern member should create one activation.");
  assert.equal(output.activations[0].trigger.targetNatalPlanet, "mars");
  assert.ok(output.activations[0].trigger.targetRoles.includes("apex"));
  assert.ok(output.activations[0].reasons.some((reason) => reason.code === "targets_apex"));
  assert.equal(output.currentDisplayOrder.length, 1);
}

{
  const detection = rankedDetection(fixtures.t_square);
  const activation = buildPatternActivations(detection, [
    transit({ id: "transit.saturn.square.mars", movingBody: "saturn", targetNatalPlanet: "mars", aspectType: "square", orb: 0.8, applying: false }),
    transit({ id: "transit.mars.square.mars", movingBody: "mars", targetNatalPlanet: "mars", aspectType: "square", orb: 0.2, applying: true })
  ], { calculatedFor });
  const contexts = buildAspectPatternActivationInterpretationContexts({ ...detection, activation });
  assert.equal(contexts.length, 1, "Multiple hits to one pattern should aggregate into one context.");
  assert.equal(contexts[0].triggers.length, 2);
  assert.equal(contexts[0].primaryTrigger.activationId.includes("mars.square.mars"), true);
  assert.equal(contexts[0].primaryTrigger.selectionReason, "highest_activation_score");
  assert.deepEqual(contexts[0].activationSummary.movingBodies, ["mars", "saturn"]);
  assert.equal(contexts[0].activationSummary.timingState, "mixed");
  assert.equal(contexts[0].copyInstructions.allowedCertainty, "qualified");
  assert.ok(contexts[0].provenance.activationContextBuilderVersion);
  assert.doesNotMatch(JSON.stringify(contexts), /\b(headline|overview|paragraph|reader|phrasebank)\b/i);
}

{
  const detection = rankedDetection(fixtures.t_square);
  const base = buildPatternActivations(detection, [
    transit({ id: "transit.tie.a", movingBody: "venus", targetNatalPlanet: "mars", aspectType: "square", orb: 1, applying: true }),
    transit({ id: "transit.tie.b", movingBody: "mars", targetNatalPlanet: "mars", aspectType: "square", orb: 1, applying: false })
  ], { calculatedFor });
  const activation = {
    ...base,
    activations: base.activations.map((item) => ({
      ...item,
      score: { ...item.score, total: 10 }
    }))
  };
  const contexts = buildAspectPatternActivationInterpretationContexts({ ...detection, activation });
  assert.equal(contexts[0].primaryTrigger.selectionReason, "applying_over_separating");
}

{
  const detection = rankedDetection(fixtures.t_square);
  const activation = buildPatternActivations(detection, [], { calculatedFor });
  assert.deepEqual(buildAspectPatternActivationInterpretationContexts({ ...detection, activation }), []);
}

{
  const detection = rankedDetection(fixtures.grand_square);
  const output = buildPatternActivations(detection, [transit()], { calculatedFor });
  const moonPatternIds = detection.patterns
    .filter((pattern) => pattern.planets.includes("moon"))
    .map((pattern) => pattern.id)
    .sort();
  assert.deepEqual(output.activations.map((activation) => activation.patternId).sort(), moonPatternIds);
  assert.ok(output.activations.every((activation) => activation.linkedPatternIds.length > 0));
  assert.equal(patternIdsOfType(detection, "grand_square").length, 1);
  assert.equal(patternIdsOfType(detection, "t_square").length, 4);
  assert.ok(output.activations.some((activation) => patternIdsOfType(detection, "grand_square").includes(activation.patternId)));
  assert.ok(output.activations.some((activation) => patternIdsOfType(detection, "t_square").includes(activation.patternId)));
}

{
  const detection = rankedDetection(fixtures.kite);
  const output = buildPatternActivations(detection, [transit({ id: "transit.sun.trine.mars", movingBody: "sun", targetNatalPlanet: "mars", aspectType: "trine" })], { calculatedFor });
  assert.equal(patternIdsOfType(detection, "kite").length, 1);
  assert.equal(patternIdsOfType(detection, "grand_trine").length, 1);
  assert.ok(output.activations.some((activation) => patternIdsOfType(detection, "kite").includes(activation.patternId)));
  assert.ok(output.activations.some((activation) => patternIdsOfType(detection, "grand_trine").includes(activation.patternId)));
}

{
  const detection = rankedDetection(fixtures.grand_square);
  const before = JSON.stringify(detection);
  const output = buildPatternActivations(detection, [transit()], { calculatedFor });
  assert.equal(JSON.stringify(detection), before, "Activation must not mutate natal detection, relationships, or base ranking.");
  assert.deepEqual(detection.ranking.displayOrder, rankedDetection(fixtures.grand_square).ranking.displayOrder);
  assert.notDeepEqual(output.currentDisplayOrder, []);
}

{
  const output = activationOutput(fixtures.t_square, [transit({ targetNatalPlanet: "jupiter" })]);
  assert.equal(output.activations.length, 0, "No matching transit should produce an empty activation result.");
  assert.equal(output.currentRankings.length, 1);
}

{
  const applying = activationOutput(fixtures.t_square, [transit({ id: "transit.mars.square.mars.applying", targetNatalPlanet: "mars", applying: true })]);
  const separating = activationOutput(fixtures.t_square, [transit({ id: "transit.mars.square.mars.separating", targetNatalPlanet: "mars", applying: false })]);
  assert.equal(applying.activations[0].trigger.applying, true);
  assert.equal(separating.activations[0].trigger.applying, false);
  assert.ok(applying.activations[0].score.applyingWeight > separating.activations[0].score.applyingWeight);
}

{
  const tight = activationOutput(fixtures.t_square, [transit({ id: "transit.tight", targetNatalPlanet: "mars", orb: 0.25 })]);
  const loose = activationOutput(fixtures.t_square, [transit({ id: "transit.loose", targetNatalPlanet: "mars", orb: 4 })]);
  assert.ok(tight.activations[0].score.exactnessWeight > loose.activations[0].score.exactnessWeight);
}

{
  const transits = [
    transit({ id: "transit.a", movingBody: "venus", targetNatalPlanet: "moon", aspectType: "opposition", orb: 1, applying: false }),
    transit({ id: "transit.b", movingBody: "saturn", targetNatalPlanet: "sun", aspectType: "square", orb: 0.75, applying: true })
  ];
  const first = activationOutput(fixtures.grand_square, transits);
  const second = activationOutput(fixtures.grand_square, transits.slice().reverse());
  assert.equal(JSON.stringify(second), JSON.stringify(first), "Reversing transit input order should not change activation output.");
}

{
  const output = activationOutput(fixtures.t_square, [
    transit({ movingBody: "chiron" }),
    transit({ targetNatalPlanet: "north_node" }),
    { movingBody: "mars", targetNatalPlanet: "moon", aspectType: "square" },
    null
  ]);
  assert.equal(output.activations.length, 0, "Unknown bodies and malformed records should fail safely.");
}

{
  const withBirthTime = activationOutput(fixtures.t_square, [transit({ targetNatalPlanet: "mars" })], { ascendantLongitude: 0, midheavenLongitude: 270 });
  const withoutBirthTime = activationOutput(fixtures.t_square, [transit({ targetNatalPlanet: "mars" })]);
  assert.deepEqual(withoutBirthTime.activations, withBirthTime.activations, "Birth-time metadata must not affect activation geometry.");
}

{
  const output = activationOutput(fixtures.t_square, [transit({ targetNatalPlanet: "mars" })]);
  const serialized = JSON.stringify(output);
  assert.doesNotMatch(serialized, /headline|overview|sections|copy|prose|reader/i, "Activation output must not generate user-facing prose.");
}

function titlePart(value) {
  return String(value)
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function snapshotFromFixture(fixture, transitAspects = []) {
  return {
    location: { label: "Fixture", latitude: 0, longitude: 0, timeZone: "UTC" },
    generatedAt: calculatedFor,
    ascendant: "Aries",
    ascendantLongitude: 0,
    midheaven: "Capricorn",
    midheavenLongitude: 270,
    moonPhase: "Fixture",
    dominantElement: "Fire",
    positions: fixture.planets.map((planet) => ({
      planet: titlePart(planet.id),
      glyph: "",
      longitude: planet.longitude,
      latitude: 0,
      sign: titlePart(planet.sign),
      signGlyph: "",
      degree: planet.longitude % 30,
      house: 1,
      houseSystem: "whole_sign",
      motion: "direct"
    })),
    aspects: fixture.aspects.map((aspect) => ({
      id: aspect.id,
      bodyA: titlePart(aspect.pointA),
      bodyB: titlePart(aspect.pointB),
      from: titlePart(aspect.pointA),
      to: titlePart(aspect.pointB),
      type: aspect.type,
      exactAngle: aspect.exactAngle,
      separation: aspect.exactAngle,
      orb: aspect.orb,
      applying: false
    })),
    transitToNatalAspects: transitAspects
  };
}

const vite = await createServer({
  root: repoRoot,
  server: { middlewareMode: true, hmr: false },
  appType: "custom",
  logLevel: "error"
});

try {
  const { buildAstrologyFactsApiResponse } = await vite.ssrLoadModule("/api/astrology-facts.ts");
  const baseSky = snapshotFromFixture(fixtures.t_square, [transit({ targetNatalPlanet: "mars" })]);

  const absent = buildAstrologyFactsApiResponse(baseSky, true).body;
  assert.equal("activation" in absent.sky.aspectPatterns, false, "Activation must be absent without the activation flag.");

  const present = buildAstrologyFactsApiResponse(baseSky, true, false, true).body;
  assert.ok(present.sky.aspectPatterns.activation);
  assert.equal(present.aspectPatterns, present.sky.aspectPatterns);
  assert.equal(present.sky.aspectPatterns.activation.activations.length, 1);
  assert.equal("interpretationContexts" in present.sky.aspectPatterns.activation, false);
  const presentWithContexts = buildAstrologyFactsApiResponse(baseSky, true, false, true, true).body;
  assert.ok(presentWithContexts.sky.aspectPatterns.activation.interpretationContexts);
  assert.equal(presentWithContexts.sky.aspectPatterns.activation.interpretationContexts.length, 1);
  assert.equal(presentWithContexts.sky.aspectPatterns.activation.interpretationContexts[0].triggers.length, 1);
  assert.deepEqual(present.sky.aspectPatterns.ranking.displayOrder, absent.sky.aspectPatterns.ranking.displayOrder);

  const noPatterns = buildAstrologyFactsApiResponse(snapshotFromFixture(fixtures.invalid_near_pattern, [transit()]), true, false, true).body;
  assert.equal(noPatterns.sky.aspectPatterns.activation.activations.length, 0);
} finally {
  await vite.close();
}

console.log("Aspect pattern activation tests passed.");
