import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import { createServer } from "vite";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const require = createRequire(import.meta.url);
const {
  GOVERNED_ACTIVATION_COPY_RECORDS,
  buildAspectPatternActivationInterpretationContexts,
  buildAspectPatternInterpretationContexts,
  buildPatternActivations,
  detectPatterns,
  rankAspectPatterns,
  resolveAspectPatternActivationCopies,
  resolveAspectPatternActivationCopy,
  validateAspectPatternActivationCopyRecord
} = require("../packages/astro-knowledge/engine/aspect-patterns/index.js");
const { fixtures } = require("../packages/astro-knowledge/engine/aspect-patterns/fixtures.js");

const calculatedFor = "2026-07-19T12:00:00.000Z";
const goldenDir = path.join(repoRoot, "packages/astro-knowledge/engine/aspect-patterns/fixtures/activation/copy");
const updateGoldens = process.env.UPDATE_ACTIVATION_COPY_GOLDENS === "1";

function rankedDetection(fixture) {
  const detection = detectPatterns(fixture);
  const rankingContext = {
    planets: fixture.planets,
    ascendantSign: "aries",
    ascendantLongitude: 0,
    midheavenLongitude: 270
  };
  const ranked = {
    ...detection,
    ranking: rankAspectPatterns(detection, rankingContext)
  };
  return {
    ...ranked,
    interpretationContexts: buildAspectPatternInterpretationContexts(ranked, rankingContext)
  };
}

function contextsFor(fixture, transitAspects) {
  const detection = rankedDetection(fixture);
  const activation = buildPatternActivations(detection, transitAspects, { calculatedFor });
  return buildAspectPatternActivationInterpretationContexts({ ...detection, activation });
}

function copyText(copy) {
  return [
    copy.content.eyebrow,
    copy.content.headline,
    copy.content.overview,
    ...copy.content.sections.map((section) => section.body)
  ].filter(Boolean).join(" ");
}

function resolveFallbackActivationCopy(context, options = {}) {
  return resolveAspectPatternActivationCopy(context, { ...options, authoredRecords: [] });
}

function resolveFallbackActivationCopies(contexts, options = {}) {
  return resolveAspectPatternActivationCopies(contexts, { ...options, authoredRecords: [] });
}

function assertNoLeakage(copy) {
  const text = copyText(copy);
  assert.doesNotMatch(text, /\b(activationId|sourceAspectId|reason code|policy|builder|score|rank|currentDisplayPriority|sharedPlanetFanout|fan-out|target role|source aspect|warning code|geometry confidence)\b/i);
  assert.doesNotMatch(text, /\b(will happen|guarantee|guaranteed|forces?|causes?|crisis)\b/i);
}

function fixtureWithOrbs(fixture, orbForAspect) {
  return {
    planets: fixture.planets,
    aspects: fixture.aspects.map((aspect) => ({
      ...aspect,
      orb: orbForAspect(aspect)
    }))
  };
}

function roleForSnapshot(trigger) {
  const role = trigger?.targetRoles?.[0] || "pattern_member";
  if (role === "spine") return "resource_planet";
  return role;
}

function selectContext(fixture, transitAspects, patternType) {
  const contexts = contextsFor(fixture, transitAspects);
  const context = patternType ? contexts.find((candidate) => candidate.patternType === patternType) : contexts[0];
  assert.ok(context, `Missing activation context for ${patternType || "first pattern"}`);
  return context;
}

function activationContextId(context) {
  return `activation-context:${context.calculatedFor}:${context.patternId}`;
}

function activationCopySnapshot(fixtureCase) {
  const context = selectContext(fixtureCase.fixture, fixtureCase.transitAspects, fixtureCase.patternType);
  const records = fixtureCase.contentLevel === "emergency_fallback"
    ? GOVERNED_ACTIVATION_COPY_RECORDS.filter((record) => record.contentLevel === "emergency_fallback")
    : undefined;
  const copy = resolveAspectPatternActivationCopy(context, records ? { records, authoredRecords: [] } : { authoredRecords: [] });
  const primaryTrigger = context.triggers.find((trigger) => trigger.activationId === context.primaryTrigger.activationId) || context.triggers[0];
  return {
    fixtureId: fixtureCase.id,
    activationContextId: activationContextId(context),
    patternId: context.patternId,
    patternType: context.patternType,
    primaryTrigger: {
      movingBody: primaryTrigger.movingBody,
      targetNatalPlanet: primaryTrigger.targetNatalPlanet,
      aspectType: primaryTrigger.aspectType,
      orb: primaryTrigger.orb,
      applying: primaryTrigger.applying,
      targetRole: roleForSnapshot(primaryTrigger)
    },
    triggerCount: copy.triggerSummary.triggerCount,
    targetRole: roleForSnapshot(primaryTrigger),
    timingState: copy.triggerSummary.timingState,
    natalConfidence: context.natalPattern?.confidence || "exact",
    triggerMode: fixtureCase.triggerMode,
    selectedContentLevel: copy.source.contentLevel,
    templateId: copy.diagnostics.templateId,
    resolverVersion: copy.source.resolverVersion,
    resolvedCopy: copy,
    missingSlots: copy.diagnostics.missingSlots,
    skippedSections: copy.diagnostics.skippedSections,
    validationWarnings: copy.diagnostics.validationWarnings
  };
}

const wideYodFixture = fixtureWithOrbs(fixtures.yod, (aspect) => aspect.type === "sextile" ? 3.8 : 2.4);
const partialYodFixture = fixtureWithOrbs(fixtures.yod, (aspect) => aspect.type === "sextile" ? 3.8 : 3.4);

const goldenCases = [
  {
    id: "t-square-apex-applying",
    patternType: "t_square",
    fixture: fixtures.t_square,
    transitAspects: [{ id: "transit.mars.square.mars", movingBody: "mars", targetNatalPlanet: "mars", aspectType: "square", orb: 0.2, applying: true }],
    triggerMode: "single"
  },
  {
    id: "t-square-opposition-separating",
    patternType: "t_square",
    fixture: fixtures.t_square,
    transitAspects: [{ id: "transit.saturn.opposition.sun", movingBody: "saturn", targetNatalPlanet: "sun", aspectType: "opposition", orb: 1.2, applying: false }],
    triggerMode: "single"
  },
  {
    id: "grand-square-shared-planet",
    patternType: "grand_square",
    fixture: fixtures.grand_square,
    transitAspects: [{ id: "transit.saturn.square.moon", movingBody: "saturn", targetNatalPlanet: "moon", aspectType: "square", orb: 0.5, applying: true }],
    triggerMode: "shared_planet"
  },
  {
    id: "grand-trine-separating",
    patternType: "grand_trine",
    fixture: fixtures.grand_trine,
    transitAspects: [{ id: "transit.venus.trine.moon", movingBody: "venus", targetNatalPlanet: "moon", aspectType: "trine", orb: 1.1, applying: false }],
    triggerMode: "single"
  },
  {
    id: "kite-focal-applying",
    patternType: "kite",
    fixture: fixtures.kite,
    transitAspects: [{ id: "transit.moon.opposition.saturn", movingBody: "moon", targetNatalPlanet: "saturn", aspectType: "opposition", orb: 0.4, applying: true }],
    triggerMode: "single"
  },
  {
    id: "kite-resource-separating",
    patternType: "kite",
    fixture: fixtures.kite,
    transitAspects: [{ id: "transit.sun.trine.mars", movingBody: "sun", targetNatalPlanet: "mars", aspectType: "trine", orb: 1, applying: false }],
    triggerMode: "single"
  },
  {
    id: "yod-apex-applying",
    patternType: "yod",
    fixture: fixtures.yod,
    transitAspects: [{ id: "transit.sun.quincunx.saturn", movingBody: "sun", targetNatalPlanet: "saturn", aspectType: "quincunx", orb: 0.6, applying: true }],
    triggerMode: "single"
  },
  {
    id: "mystic-rectangle-member-separating",
    patternType: "mystic_rectangle",
    fixture: fixtures.mystic_rectangle,
    transitAspects: [{ id: "transit.mercury.sextile.moon", movingBody: "mercury", targetNatalPlanet: "moon", aspectType: "sextile", orb: 2.2, applying: false }],
    triggerMode: "single"
  },
  {
    id: "t-square-multi-trigger-mixed",
    patternType: "t_square",
    fixture: fixtures.t_square,
    transitAspects: [
      { id: "transit.mars.square.mars", movingBody: "mars", targetNatalPlanet: "mars", aspectType: "square", orb: 0.2, applying: true },
      { id: "transit.jupiter.trine.sun", movingBody: "jupiter", targetNatalPlanet: "sun", aspectType: "trine", orb: 1.5, applying: false }
    ],
    triggerMode: "multiple"
  },
  {
    id: "t-square-exact",
    patternType: "t_square",
    fixture: fixtures.t_square,
    transitAspects: [{ id: "transit.exact", movingBody: "mars", targetNatalPlanet: "mars", aspectType: "square", orb: 0, applying: true }],
    triggerMode: "single"
  },
  {
    id: "t-square-applying",
    patternType: "t_square",
    fixture: fixtures.t_square,
    transitAspects: [{ id: "transit.applying", movingBody: "mars", targetNatalPlanet: "mars", aspectType: "square", orb: 1, applying: true }],
    triggerMode: "single"
  },
  {
    id: "t-square-separating",
    patternType: "t_square",
    fixture: fixtures.t_square,
    transitAspects: [{ id: "transit.separating", movingBody: "mars", targetNatalPlanet: "mars", aspectType: "square", orb: 1, applying: false }],
    triggerMode: "single"
  },
  {
    id: "wide-yod-apex",
    patternType: "yod",
    fixture: wideYodFixture,
    transitAspects: [{ id: "transit.sun.quincunx.saturn", movingBody: "sun", targetNatalPlanet: "saturn", aspectType: "quincunx", orb: 0.6, applying: true }],
    triggerMode: "single"
  },
  {
    id: "partial-yod-apex",
    patternType: "yod",
    fixture: partialYodFixture,
    transitAspects: [{ id: "transit.sun.quincunx.saturn", movingBody: "sun", targetNatalPlanet: "saturn", aspectType: "quincunx", orb: 0.6, applying: true }],
    triggerMode: "single"
  },
  ...["t_square", "grand_square", "grand_trine", "kite", "yod", "mystic_rectangle"].map((patternType) => ({
    id: `emergency-${patternType}`,
    patternType,
    fixture: {
      t_square: fixtures.t_square,
      grand_square: fixtures.grand_square,
      grand_trine: fixtures.grand_trine,
      kite: fixtures.kite,
      yod: fixtures.yod,
      mystic_rectangle: fixtures.mystic_rectangle
    }[patternType],
    transitAspects: {
      t_square: [{ id: "transit.mars.square.mars", movingBody: "mars", targetNatalPlanet: "mars", aspectType: "square", orb: 0.2, applying: true }],
      grand_square: [{ id: "transit.saturn.square.moon", movingBody: "saturn", targetNatalPlanet: "moon", aspectType: "square", orb: 0.5, applying: true }],
      grand_trine: [{ id: "transit.venus.trine.moon", movingBody: "venus", targetNatalPlanet: "moon", aspectType: "trine", orb: 1.1, applying: false }],
      kite: [{ id: "transit.sun.trine.mars", movingBody: "sun", targetNatalPlanet: "mars", aspectType: "trine", orb: 1, applying: false }],
      yod: [{ id: "transit.sun.quincunx.saturn", movingBody: "sun", targetNatalPlanet: "saturn", aspectType: "quincunx", orb: 0.6, applying: true }],
      mystic_rectangle: [{ id: "transit.mercury.sextile.moon", movingBody: "mercury", targetNatalPlanet: "moon", aspectType: "sextile", orb: 2.2, applying: false }]
    }[patternType],
    triggerMode: "single",
    contentLevel: "emergency_fallback"
  }))
];

const fixturesByType = {
  t_square: contextsFor(fixtures.t_square, [{ id: "transit.mars.square.mars", movingBody: "mars", targetNatalPlanet: "mars", aspectType: "square", orb: 0.2, applying: true }])[0],
  grand_square: contextsFor(fixtures.grand_square, [{ id: "transit.saturn.square.moon", movingBody: "saturn", targetNatalPlanet: "moon", aspectType: "square", orb: 0.5, applying: true }])[0],
  grand_trine: contextsFor(fixtures.grand_trine, [{ id: "transit.venus.trine.moon", movingBody: "venus", targetNatalPlanet: "moon", aspectType: "trine", orb: 1.1, applying: false }])[0],
  kite: contextsFor(fixtures.kite, [{ id: "transit.sun.trine.mars", movingBody: "sun", targetNatalPlanet: "mars", aspectType: "trine", orb: 1, applying: false }])[0],
  yod: contextsFor(fixtures.yod, [{ id: "transit.sun.quincunx.saturn", movingBody: "sun", targetNatalPlanet: "saturn", aspectType: "quincunx", orb: 0.6, applying: true }])[0],
  mystic_rectangle: contextsFor(fixtures.mystic_rectangle, [{ id: "transit.mercury.sextile.moon", movingBody: "mercury", targetNatalPlanet: "moon", aspectType: "sextile", orb: 2.2, applying: false }])[0]
};

{
  if (updateGoldens) fs.mkdirSync(goldenDir, { recursive: true });
  const snapshots = goldenCases.map(activationCopySnapshot);
  for (const snapshot of snapshots) {
    const filePath = path.join(goldenDir, `${snapshot.fixtureId}.json`);
    const serialized = `${JSON.stringify(snapshot, null, 2)}\n`;
    if (updateGoldens) {
      fs.writeFileSync(filePath, serialized);
    } else {
      assert.equal(fs.readFileSync(filePath, "utf8"), serialized, `${snapshot.fixtureId} activation copy golden changed`);
    }
  }

  const approvedPatternTypes = new Set(snapshots.filter((snapshot) => snapshot.selectedContentLevel === "source_grounded_template").map((snapshot) => snapshot.patternType));
  assert.deepEqual([...approvedPatternTypes].sort(), ["grand_square", "grand_trine", "kite", "mystic_rectangle", "t_square", "yod"].sort());

  const tSquareApex = snapshots.find((snapshot) => snapshot.fixtureId === "t-square-apex-applying");
  const tSquareOpposition = snapshots.find((snapshot) => snapshot.fixtureId === "t-square-opposition-separating");
  assert.notEqual(JSON.stringify(tSquareApex.resolvedCopy.content), JSON.stringify(tSquareOpposition.resolvedCopy.content));

  const single = snapshots.find((snapshot) => snapshot.fixtureId === "t-square-apex-applying");
  const multi = snapshots.find((snapshot) => snapshot.fixtureId === "t-square-multi-trigger-mixed");
  assert.notEqual(JSON.stringify(single.resolvedCopy.content), JSON.stringify(multi.resolvedCopy.content));

  const timingBodies = new Map(snapshots
    .filter((snapshot) => ["t-square-exact", "t-square-applying", "t-square-separating", "t-square-multi-trigger-mixed"].includes(snapshot.fixtureId))
    .map((snapshot) => [snapshot.timingState, snapshot.resolvedCopy.content.sections.filter((section) => section.id === "timing").map((section) => section.body).join(" ")]));
  assert.equal(timingBodies.size, 4);
  assert.equal(new Set(timingBodies.values()).size, 4);

  const grandSquareText = copyText(snapshots.find((snapshot) => snapshot.fixtureId === "grand-square-shared-planet").resolvedCopy);
  const rectangleText = copyText(snapshots.find((snapshot) => snapshot.fixtureId === "mystic-rectangle-member-separating").resolvedCopy);
  assert.doesNotMatch(grandSquareText, /\bapex\b/i);
  assert.doesNotMatch(rectangleText, /\bapex\b/i);
  assert.doesNotMatch(grandSquareText, /equally active|equally intense|same intensity/i);

  const kiteText = copyText(snapshots.find((snapshot) => snapshot.fixtureId === "kite-focal-applying").resolvedCopy);
  assert.match(kiteText, /Grand Trine/);
  assert.match(kiteText, /opposition/);

  const yodText = copyText(snapshots.find((snapshot) => snapshot.fixtureId === "yod-apex-applying").resolvedCopy);
  assert.doesNotMatch(yodText, /\b(fate|destiny|Finger of God|chosen|calling|special mission|meant to happen|unavoidable|karmic|turning point)\b/i);

  assert.match(copyText(snapshots.find((snapshot) => snapshot.fixtureId === "wide-yod-apex").resolvedCopy), /wider natal pattern/i);
  assert.match(copyText(snapshots.find((snapshot) => snapshot.fixtureId === "partial-yod-apex").resolvedCopy), /partial natal pattern/i);

  for (const snapshot of snapshots) {
    assertNoLeakage(snapshot.resolvedCopy);
    if (snapshot.selectedContentLevel === "emergency_fallback") {
      assert.ok(snapshot.resolvedCopy.content.headline);
      assert.ok(snapshot.resolvedCopy.content.overview);
    }
  }
}

{
  const copies = resolveFallbackActivationCopies(Object.values(fixturesByType));
  assert.equal(copies.length, 6);
  for (const copy of copies) {
    assert.ok(copy.content.headline);
    assert.ok(copy.content.overview);
    assert.ok(copy.content.sections.length >= 4);
    assert.equal(copy.source.resolverVersion, "aspect_pattern_activation_copy_resolver_v1");
    assert.equal(copy.source.contentLevel, "source_grounded_template");
    assertNoLeakage(copy);
  }
}

{
  const context = contextsFor(fixtures.t_square, [
    { id: "transit.mars.square.mars", movingBody: "mars", targetNatalPlanet: "mars", aspectType: "square", orb: 0.2, applying: true },
    { id: "transit.jupiter.trine.sun", movingBody: "jupiter", targetNatalPlanet: "sun", aspectType: "trine", orb: 1.5, applying: false }
  ])[0];
  const copy = resolveFallbackActivationCopy(context);
  assert.equal(copy.triggerSummary.triggerCount, 2);
  assert.equal(copy.triggerSummary.primaryActivationId, context.primaryTrigger.activationId);
  assert.equal(copy.patternId, context.patternId);
  assert.equal(resolveAspectPatternActivationCopies([context]).length, 1);
}

{
  const tSquareApex = fixturesByType.t_square;
  const tSquareOpposition = contextsFor(fixtures.t_square, [
    { id: "transit.saturn.opposition.sun", movingBody: "saturn", targetNatalPlanet: "sun", aspectType: "opposition", orb: 1.2, applying: false }
  ])[0];
  const apexText = copyText(resolveFallbackActivationCopy(tSquareApex));
  const oppositionText = copyText(resolveFallbackActivationCopy(tSquareOpposition));
  assert.notEqual(apexText, oppositionText);
  assert.match(apexText, /apex|action point/i);
  assert.match(oppositionText, /opposition member/i);
}

{
  const grandSquareText = copyText(resolveFallbackActivationCopy(fixturesByType.grand_square));
  const rectangleText = copyText(resolveFallbackActivationCopy(fixturesByType.mystic_rectangle));
  assert.doesNotMatch(grandSquareText, /\bapex\b/i);
  assert.doesNotMatch(rectangleText, /\bapex\b/i);
}

{
  const kiteText = copyText(resolveFallbackActivationCopy(fixturesByType.kite));
  assert.match(kiteText, /Grand Trine/i);
  assert.match(kiteText, /opposition/i);
  assert.doesNotMatch(kiteText, /T-square apex/i);
}

{
  const yodText = copyText(resolveFallbackActivationCopy(fixturesByType.yod));
  assert.doesNotMatch(yodText, /\b(fate|destiny|Finger of God|chosen|calling|special mission|meant to happen|unavoidable|karmic test|turning point)\b/i);
}

{
  const fanoutText = copyText(resolveFallbackActivationCopy(fixturesByType.grand_square));
  assert.match(fanoutText, /without being equally loud/i);
  assert.doesNotMatch(fanoutText, /equally active|equally intense/i);
}

{
  const wideContext = contextsFor(fixtures.wide_grand_trine, [
    { id: "transit.venus.trine.moon", movingBody: "venus", targetNatalPlanet: "moon", aspectType: "trine", orb: 1, applying: true }
  ])[0];
  const partialContext = contextsFor(fixtures.partial_t_square, [
    { id: "transit.mars.square.mars", movingBody: "mars", targetNatalPlanet: "mars", aspectType: "square", orb: 1, applying: true }
  ])[0];
  assert.match(copyText(resolveFallbackActivationCopy(wideContext)), /less consistent or less obvious/i);
  assert.match(copyText(resolveFallbackActivationCopy(partialContext)), /less consistent or less obvious/i);
}

{
  const exact = resolveFallbackActivationCopy(contextsFor(fixtures.t_square, [{ id: "transit.exact", movingBody: "mars", targetNatalPlanet: "mars", aspectType: "square", orb: 0, applying: true }])[0]);
  const applying = resolveFallbackActivationCopy(contextsFor(fixtures.t_square, [{ id: "transit.applying", movingBody: "mars", targetNatalPlanet: "mars", aspectType: "square", orb: 1, applying: true }])[0]);
  const separating = resolveFallbackActivationCopy(contextsFor(fixtures.t_square, [{ id: "transit.separating", movingBody: "mars", targetNatalPlanet: "mars", aspectType: "square", orb: 1, applying: false }])[0]);
  const mixed = resolveFallbackActivationCopy(contextsFor(fixtures.t_square, [
    { id: "transit.applying", movingBody: "mars", targetNatalPlanet: "mars", aspectType: "square", orb: 1, applying: true },
    { id: "transit.separating", movingBody: "jupiter", targetNatalPlanet: "sun", aspectType: "trine", orb: 1, applying: false }
  ])[0]);
  assert.match(copyText(exact), /closest contact/i);
  assert.match(copyText(applying), /still building/i);
  assert.match(copyText(separating), /closest contact has passed/i);
  assert.match(copyText(mixed), /not all at the same stage/i);
}

{
  const context = fixturesByType.t_square;
  const before = JSON.stringify(context);
  const first = resolveFallbackActivationCopy(context);
  const second = resolveFallbackActivationCopy(context);
  assert.equal(JSON.stringify(context), before);
  assert.equal(JSON.stringify(first), JSON.stringify(second));
  const reversed = { ...context, triggers: context.triggers.slice().reverse() };
  assert.equal(JSON.stringify(resolveFallbackActivationCopy(reversed)), JSON.stringify(first));
}

{
  const badRecord = {
    ...GOVERNED_ACTIVATION_COPY_RECORDS.find((record) => record.patternType === "t_square"),
    id: "bad-required-slot",
    content: {
      eyebrow: "{{pattern_name}}",
      headline: "{{not_allowed}}",
      overview: "Bad {{not_allowed}}",
      sections: [{ id: "current_emphasis", template: "Bad {{not_allowed}}", required: true }]
    }
  };
  const validation = validateAspectPatternActivationCopyRecord(badRecord, fixturesByType.t_square);
  assert.equal(validation.ok, false);
  assert.ok(validation.errors.some((error) => error.includes("unknown_required_slot")));
  const copy = resolveFallbackActivationCopy(fixturesByType.t_square, { records: [badRecord] });
  assert.notEqual(copy.source.recordId, "bad-required-slot");
}

{
  const emergencyRecords = GOVERNED_ACTIVATION_COPY_RECORDS.filter((record) => record.contentLevel === "emergency_fallback");
  for (const context of Object.values(fixturesByType)) {
    const copy = resolveAspectPatternActivationCopy(context, { records: emergencyRecords, authoredRecords: [] });
    assert.equal(copy.source.contentLevel, "emergency_fallback");
    assert.ok(copy.content.headline);
    assert.ok(copy.content.overview);
  }
}

assert.deepEqual(resolveFallbackActivationCopies([]), []);

function titlePart(value) {
  return String(value)
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function snapshotFromFixture(fixture, transitAspects) {
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
  const sky = snapshotFromFixture(fixtures.grand_square, [{ id: "transit.saturn.square.moon", movingBody: "saturn", targetNatalPlanet: "moon", aspectType: "square", orb: 0.5, applying: true }]);
  const absent = buildAstrologyFactsApiResponse(sky, true, false, true, true, false).body;
  const present = buildAstrologyFactsApiResponse(sky, true, false, true, true, true).body;
  assert.equal("resolvedCopy" in absent.sky.aspectPatterns.activation, false);
  assert.ok(present.sky.aspectPatterns.activation.resolvedCopy);
  assert.equal(present.sky.aspectPatterns.activation.resolvedCopy.length, present.sky.aspectPatterns.activation.interpretationContexts.length);
} finally {
  await vite.close();
}

const diagnostics = fs.readFileSync(path.join(repoRoot, "apps/admin/src/AspectPatternDiagnostics.tsx"), "utf8");
assert.match(diagnostics, /includeAspectPatternActivationCopy=true/);
assert.match(diagnostics, /Resolved activation copy/);
assert.doesNotMatch(diagnostics, /\bmethod:\s*"(POST|PUT|PATCH|DELETE)"/);

console.log("Aspect-pattern activation copy resolver tests passed.");
