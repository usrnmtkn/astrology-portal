import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { createServer } from "vite";

const require = createRequire(import.meta.url);
const {
  buildAspectPatternInterpretationContexts,
  detectPatterns,
  rankAspectPatterns,
  resolveAspectPatternCopies
} = require("../packages/astro-knowledge/engine/aspect-patterns/index.js");
const realFixtures = require("../packages/astro-knowledge/engine/aspect-patterns/fixtures/real/index.js");

function rankingContextFor(fixture) {
  return {
    planets: fixture.input.planets,
    ...(fixture.input.angles ?? {})
  };
}

function outputFor(fixture) {
  const detection = detectPatterns({
    planets: fixture.input.planets,
    aspects: fixture.input.aspects
  });
  return {
    ...detection,
    ranking: rankAspectPatterns(detection, rankingContextFor(fixture))
  };
}

function contextsFor(fixture, output = outputFor(fixture)) {
  return buildAspectPatternInterpretationContexts(output, rankingContextFor(fixture));
}

function expectedFrom(output) {
  return {
    patternIds: output.patterns.map((pattern) => pattern.id),
    patternTypes: output.patterns.map((pattern) => ({ id: pattern.id, type: pattern.type })),
    members: Object.fromEntries(output.patterns.map((pattern) => [pattern.id, pattern.planets])),
    sourceAspectIds: Object.fromEntries(output.patterns.map((pattern) => [pattern.id, pattern.sourceAspectIds])),
    roles: Object.fromEntries(output.patterns.map((pattern) => [pattern.id, pattern.roles])),
    derivedPoints: Object.fromEntries(output.patterns.map((pattern) => [pattern.id, pattern.derivedPoints])),
    confidence: Object.fromEntries(output.patterns.map((pattern) => [pattern.id, pattern.geometry.confidence])),
    warnings: {
      diagnostics: output.diagnostics.warnings,
      byPattern: Object.fromEntries(output.patterns.map((pattern) => [pattern.id, pattern.geometry.warnings]))
    },
    relationships: output.relationships,
    rankingRecords: output.ranking.rankings,
    displayOrder: output.ranking.displayOrder,
    diagnostics: output.diagnostics
  };
}

function reversedFixture(fixture) {
  return {
    ...fixture,
    input: {
      ...fixture.input,
      planets: fixture.input.planets.slice().reverse(),
      aspects: fixture.input.aspects.slice().reverse().map((aspect) => ({
        ...aspect,
        pointA: aspect.pointB,
        pointB: aspect.pointA
      }))
    }
  };
}

function patternTypes(fixture) {
  return fixture.expected.patternTypes.map((pattern) => pattern.type);
}

function assertFixtureStable(id, fixture) {
  const output = outputFor(fixture);
  const projected = expectedFrom(output);

  assert.equal(JSON.stringify(projected), JSON.stringify(fixture.expected), `${id} expected output changed`);
  assert.deepEqual(projected.patternIds, fixture.expected.patternIds, `${id} pattern IDs changed`);
  assert.deepEqual(projected.patternTypes, fixture.expected.patternTypes, `${id} canonical pattern order changed`);
  assert.deepEqual(projected.displayOrder, fixture.expected.displayOrder, `${id} display order changed`);
  assert.deepEqual(projected.derivedPoints, fixture.expected.derivedPoints, `${id} derived points changed`);
  assert.deepEqual(projected.relationships, fixture.expected.relationships, `${id} relationships changed`);
  assert.deepEqual(projected.rankingRecords, fixture.expected.rankingRecords, `${id} ranking records changed`);
  const contexts = contextsFor(fixture, output);
  const copies = resolveAspectPatternCopies(contexts);
  assert.equal(contexts.length, projected.rankingRecords.length, `${id} context count changed`);
  assert.deepEqual(contexts.map((context) => context.patternId), projected.displayOrder, `${id} context order changed`);
  assert.equal(JSON.stringify(contextsFor(fixture, output)), JSON.stringify(contexts), `${id} contexts are not deterministic`);
  assert.equal(copies.length, contexts.length, `${id} copy count changed`);
  assert.equal(JSON.stringify(resolveAspectPatternCopies(contexts)), JSON.stringify(copies), `${id} copy resolution is not deterministic`);
  assert.ok(copies.every((copy) => copy.content.headline && copy.content.overview), `${id} copy output must be readable`);

  const reversedOutput = outputFor(reversedFixture(fixture));
  assert.equal(JSON.stringify(expectedFrom(reversedOutput)), JSON.stringify(projected), `${id} reversed input order changed output`);
  assert.equal(JSON.stringify(contextsFor(reversedFixture(fixture), reversedOutput)), JSON.stringify(contexts), `${id} reversed input order changed contexts`);
  assert.equal(JSON.stringify(resolveAspectPatternCopies(contextsFor(reversedFixture(fixture), reversedOutput))), JSON.stringify(copies), `${id} reversed input order changed copy`);

  const patternIds = new Set(projected.patternIds);
  for (const relationship of projected.relationships) {
    assert.ok(patternIds.has(relationship.parentPatternId), `${id} relationship has invalid parent`);
    assert.ok(patternIds.has(relationship.childPatternId), `${id} relationship has invalid child`);
  }

  for (const relationship of projected.relationships.filter((item) => item.relationship === "contains")) {
    assert.ok(patternIds.has(relationship.childPatternId), `${id} lost contained component pattern`);
  }
}

function titlePart(value) {
  return String(value)
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function skySnapshotFromFixture(fixture) {
  const angles = fixture.input.angles ?? {};
  return {
    location: {
      label: "De-identified fixture",
      latitude: 0,
      longitude: 0,
      timeZone: "UTC"
    },
    generatedAt: "2000-01-01T00:00:00.000Z",
    ascendant: angles.ascendantSign ? titlePart(angles.ascendantSign) : undefined,
    ascendantLongitude: angles.ascendantLongitude,
    midheaven: "Capricorn",
    midheavenLongitude: angles.midheavenLongitude,
    moonPhase: "Fixture",
    dominantElement: "Fire",
    positions: fixture.input.planets.map((planet) => ({
      planet: titlePart(planet.id),
      glyph: "",
      longitude: planet.longitude,
      latitude: 0,
      sign: titlePart(planet.sign),
      signGlyph: "",
      degree: planet.longitude % 30,
      motion: "direct"
    })),
    aspects: fixture.input.aspects.map((aspect) => ({
      id: aspect.id,
      bodyA: titlePart(aspect.pointA),
      bodyB: titlePart(aspect.pointB),
      from: titlePart(aspect.pointA),
      to: titlePart(aspect.pointB),
      type: aspect.type,
      exactAngle: aspect.exactAngle,
      separation: aspect.separation,
      orb: aspect.orb,
      applying: aspect.applying
    }))
  };
}

for (const [id, fixture] of Object.entries(realFixtures)) {
  assertFixtureStable(id, fixture);
}

assert.equal(realFixtures["no-pattern-a"].expected.patternIds.length, 0);
assert.deepEqual(patternTypes(realFixtures["isolated-t-square-a"]), ["t_square"]);
assert.ok(patternTypes(realFixtures["grand-square-a"]).includes("grand_square"));
assert.ok(patternTypes(realFixtures["grand-square-a"]).filter((type) => type === "t_square").length >= 4);
assert.ok(patternTypes(realFixtures["grand-trine-a"]).filter((type) => type === "grand_trine").length > 1);
assert.ok(patternTypes(realFixtures["kite-a"]).includes("kite"));
assert.ok(patternTypes(realFixtures["kite-a"]).includes("grand_trine"));
assert.ok(patternTypes(realFixtures["yod-wide-a"]).includes("yod"));
assert.ok(Object.values(realFixtures["yod-wide-a"].expected.confidence).includes("wide"));
assert.ok(patternTypes(realFixtures["mystic-rectangle-a"]).includes("mystic_rectangle"));
assert.ok(realFixtures["overlap-grand-square-a"].expected.patternIds.length >= 4);

const unknownBirthTime = realFixtures["unknown-birth-time-a"];
assert.equal(unknownBirthTime.input.angles, undefined);
assert.equal(
  JSON.stringify(detectPatterns(unknownBirthTime.input)),
  JSON.stringify(detectPatterns({ ...unknownBirthTime.input, angles: { ascendantLongitude: 99, midheavenLongitude: 12 } })),
  "Missing birth-time metadata must not alter geometry"
);

const vite = await createServer({
  root: process.cwd(),
  server: { middlewareMode: true, hmr: false },
  appType: "custom",
  logLevel: "error"
});

try {
  const { aspectPatternsFromSkySnapshot } = await vite.ssrLoadModule("/api/_lib/aspect-patterns.ts");
  for (const [id, fixture] of Object.entries(realFixtures)) {
    const apiOutput = aspectPatternsFromSkySnapshot(skySnapshotFromFixture(fixture));
    assert.equal(JSON.stringify(expectedFrom(apiOutput)), JSON.stringify(fixture.expected), `${id} API diagnostics diverged from direct engine`);
    assert.equal(JSON.stringify(apiOutput.interpretationContexts), JSON.stringify(contextsFor(fixture)), `${id} API interpretation contexts diverged from direct engine`);
    const apiOutputWithCopy = aspectPatternsFromSkySnapshot(skySnapshotFromFixture(fixture), { includeCopy: true });
    assert.equal(JSON.stringify(apiOutputWithCopy.resolvedCopy), JSON.stringify(resolveAspectPatternCopies(contextsFor(fixture))), `${id} API copy diverged from direct resolver`);
  }
} finally {
  await vite.close();
}

console.log("Real aspect-pattern fixture regression tests passed.");
