import assert from "node:assert/strict";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const {
  buildAspectPatternInterpretationContexts,
  detectPatterns,
  rankAspectPatterns,
  resolveAspectPatternCopy
} = require("../packages/astro-knowledge/engine/aspect-patterns/index.js");
const { fixtures } = require("../packages/astro-knowledge/engine/aspect-patterns/fixtures.js");
const realFixtures = require("../packages/astro-knowledge/engine/aspect-patterns/fixtures/real/index.js");
const copyFixtures = require("../packages/astro-knowledge/engine/aspect-patterns/fixtures/copy/index.js");

function rankedDetection(fixture, context = {}) {
  const detection = detectPatterns(fixture);
  detection.ranking = rankAspectPatterns(detection, {
    planets: fixture.planets,
    ascendantSign: "aries",
    ascendantLongitude: 0,
    midheavenLongitude: 270,
    ...context
  });
  return detection;
}

function contextsFor(fixture, context = {}) {
  return buildAspectPatternInterpretationContexts(rankedDetection(fixture, context), {
    planets: fixture.planets,
    ascendantSign: "aries",
    ascendantLongitude: 0,
    midheavenLongitude: 270,
    ...context
  });
}

function oneContext(fixture, type, context = {}) {
  const found = contextsFor(fixture, context).find((item) => item.patternType === type);
  assert.ok(found, `Missing ${type} context`);
  return found;
}

function cloned(value) {
  return JSON.parse(JSON.stringify(value));
}

function withPointHouse(context, pointType, house) {
  const copy = cloned(context);
  for (const point of copy.derivedPoints || []) {
    if (point.type === pointType) point.house = house;
  }
  if (pointType === "empty_leg" && copy.roles?.emptyLeg) copy.roles.emptyLeg.house = house;
  if (pointType === "fallout_point" && copy.roles?.falloutPoint) copy.roles.falloutPoint.house = house;
  return copy;
}

function emergencyContext(type) {
  return {
    version: "1.0.0",
    patternId: `editorial-emergency:${type}`,
    patternType: type,
    display: { rank: 1, isPrimary: true, isContained: false, parentPatternIds: [], childPatternIds: [] },
    members: [
      { planet: "sun", sign: "aries", longitude: 0, roles: [], isLuminary: true, isPersonalPlanet: false },
      { planet: "moon", sign: "leo", longitude: 120, roles: [], isLuminary: true, isPersonalPlanet: false },
      { planet: "mars", sign: "sagittarius", longitude: 240, roles: [], isLuminary: false, isPersonalPlanet: true }
    ],
    geometry: { confidence: "partial", maximumOrb: 0, averageOrb: 0, warnings: ["editorial_emergency_fixture"], sourceAspectIds: [] },
    roles: { type },
    derivedPoints: [],
    ranking: { geometry: 0, natalProminence: 0, structuralContext: 0, baseDisplayPriority: 0, reasons: [] },
    copyInstructions: { primaryJob: "Use only confirmed pattern facts.", supportingJobs: [], avoidClaims: [], allowedCertainty: "qualified" },
    provenance: {
      detectorVersion: "aspect_pattern_detector_v1",
      orbPolicyId: "natal_aspect_patterns_v1",
      rankingPolicyId: "natal_pattern_ranking_v1",
      contextBuilderVersion: "aspect_pattern_interpretation_context_v1"
    }
  };
}

const contextBuilders = {
  "t-square-strong-sign-only": () => oneContext(fixtures.t_square, "t_square"),
  "t-square-strong-with-house": () => withPointHouse(oneContext(fixtures.t_square, "t_square"), "empty_leg", 6),
  "t-square-partial-sign-only": () => oneContext(fixtures.partial_t_square, "t_square"),
  "grand-square-strong": () => oneContext(fixtures.grand_square, "grand_square"),
  "grand-square-contained-t-square": () => contextsFor(fixtures.grand_square).find((context) => context.patternType === "t_square" && context.display.isContained),
  "grand-trine-strong": () => oneContext(fixtures.grand_trine, "grand_trine"),
  "grand-trine-multiple-real": () => contextsFor(realFixtures["grand-trine-a"].input).find((context) => context.patternType === "grand_trine"),
  "kite-strong": () => oneContext(fixtures.kite, "kite"),
  "kite-contained-grand-trine": () => oneContext(fixtures.kite, "grand_trine"),
  "yod-strong-sign-only": () => oneContext(fixtures.yod, "yod"),
  "yod-strong-with-house": () => withPointHouse(oneContext(fixtures.yod, "yod"), "fallout_point", 8),
  "yod-wide-real-sign-only": () => contextsFor(realFixtures["yod-wide-a"].input).find((context) => context.patternType === "yod"),
  "mystic-rectangle-strong": () => oneContext(fixtures.mystic_rectangle, "mystic_rectangle"),
  "emergency-t_square": () => emergencyContext("t_square"),
  "emergency-grand_square": () => emergencyContext("grand_square"),
  "emergency-grand_trine": () => emergencyContext("grand_trine"),
  "emergency-kite": () => emergencyContext("kite"),
  "emergency-yod": () => emergencyContext("yod"),
  "emergency-mystic_rectangle": () => emergencyContext("mystic_rectangle")
};

function copyText(copy) {
  return [
    copy.content.eyebrow,
    copy.content.headline,
    copy.content.overview,
    ...copy.content.sections.map((section) => section.body)
  ].filter(Boolean).join(" ");
}

for (const [id, fixture] of Object.entries(copyFixtures)) {
  const context = contextBuilders[id]?.();
  assert.ok(context, `Missing context builder for ${id}`);
  const resolved = resolveAspectPatternCopy(context, { authoredRecords: [], useLegacyResolver: true });
  const expected = cloned(fixture.resolvedCopy);
  expected.source.resolverVersion = "v3";
  if (context.patternType === "grand_square") {
    expected.content.eyebrow = expected.content.eyebrow.replace("Grand Square", "Grand Cross");
    expected.content.headline = expected.content.headline.replace("Grand Square", "Grand Cross");
    expected.content.overview = expected.content.overview.replace("Grand Square", "Grand Cross");
  }
  assert.equal(JSON.stringify(resolved), JSON.stringify(expected), `${id} legacy golden copy changed`);
  assert.equal(JSON.stringify(resolveAspectPatternCopy(context, { authoredRecords: [], useLegacyResolver: true })), JSON.stringify(resolved), `${id} copy resolution is not deterministic`);
  assert.equal(fixture.contextId, context.patternId);
  assert.equal(fixture.patternType, context.patternType);
  assert.equal(fixture.confidence, context.geometry.confidence);
  assert.equal(fixture.contentLevel, resolved.source.contentLevel);
  assert.equal(fixture.templateId, resolved.diagnostics.templateId);
  assert.ok(resolved.content.headline);
  assert.ok(resolved.content.overview);
}

assert.match(copyText(copyFixtures["t-square-strong-sign-only"].resolvedCopy), /Mars is the action point/i);
assert.match(copyText(copyFixtures["t-square-strong-sign-only"].resolvedCopy), /empty leg is a reference point/i);
assert.match(copyText(copyFixtures["t-square-strong-with-house"].resolvedCopy), /6th house/i);
assert.doesNotMatch(copyText(copyFixtures["t-square-strong-sign-only"].resolvedCopy), /\bundefined\b/i);

assert.doesNotMatch(copyText(copyFixtures["grand-square-strong"].resolvedCopy), /\bapex\b/i);
assert.doesNotMatch(copyText(copyFixtures["mystic-rectangle-strong"].resolvedCopy), /\bapex\b/i);
assert.match(copyText(copyFixtures["kite-strong"].resolvedCopy), /Grand Trine/i);
assert.match(copyText(copyFixtures["kite-strong"].resolvedCopy), /opposition/i);
assert.match(copyText(copyFixtures["yod-wide-real-sign-only"].resolvedCopy), /\bwide\b/i);
assert.match(copyText(copyFixtures["yod-wide-real-sign-only"].resolvedCopy), /\bmay\b|keep the wording flexible/i);
assert.doesNotMatch(copyText(copyFixtures["yod-strong-sign-only"].resolvedCopy), /\b(Finger of God|fate|destiny|chosen|special mission|unavoidable calling)\b/i);

for (const [id, fixture] of Object.entries(copyFixtures)) {
  const text = copyText(fixture.resolvedCopy);
  assert.doesNotMatch(text, /\b(structural context|geometry confidence|derived point|resource planet|element consistency|harmonic consistency|source aspect|ranking reason|display priority|sourceAspectIds|baseDisplayPriority|structuralContext)\b/i, `${id} leaked internal language`);
  if (id.startsWith("emergency-")) {
    assert.equal(fixture.contentLevel, "emergency_fallback");
    assert.match(text, /temporary note|temporary copy/i);
  }
}

console.log("Aspect-pattern golden copy fixture tests passed.");
