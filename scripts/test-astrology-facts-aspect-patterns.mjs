import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import { createServer } from "vite";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const require = createRequire(import.meta.url);
const { fixtures } = require("../packages/astro-knowledge/engine/aspect-patterns/fixtures.js");

function titlePart(value) {
  return String(value)
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function snapshotFromFixture(fixture) {
  return {
    location: {
      label: "Fixture",
      latitude: 0,
      longitude: 0,
      timeZone: "UTC"
    },
    generatedAt: "2026-07-19T12:00:00.000Z",
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
    }))
  };
}

function patternsOf(result, type) {
  return result.patterns.filter((pattern) => pattern.type === type);
}

function onePattern(result, type) {
  const matches = patternsOf(result, type);
  assert.equal(matches.length, 1, `Expected one ${type}`);
  return matches[0];
}

function reversedSnapshotFromFixture(fixture) {
  const snapshot = snapshotFromFixture(fixture);
  return {
    ...snapshot,
    positions: snapshot.positions.slice().reverse(),
    aspects: snapshot.aspects.slice().reverse().map((aspect) => ({
      ...aspect,
      bodyA: aspect.bodyB,
      bodyB: aspect.bodyA,
      from: aspect.to,
      to: aspect.from
    }))
  };
}

function normalizeDegrees(degrees) {
  return ((degrees % 360) + 360) % 360;
}

function rawLongitudeDifference(positionA, positionB) {
  return Math.abs(normalizeDegrees(positionA.longitude - positionB.longitude));
}

const vite = await createServer({
  root: repoRoot,
  server: { middlewareMode: true, hmr: false },
  appType: "custom",
  logLevel: "error"
});

try {
  const { aspectPatternsFromSkySnapshot } = await vite.ssrLoadModule("/api/_lib/aspect-patterns.ts");
  const { buildAstrologyFactsApiResponse } = await vite.ssrLoadModule("/api/astrology-facts.ts");
  const { defaultLocation, getAstrodienstSky } = await vite.ssrLoadModule("/apps/web/src/services/ephemeris.ts");

  const absent = buildAstrologyFactsApiResponse(snapshotFromFixture(fixtures.grand_square), false).body;
  assert.equal("aspectPatterns" in absent, false);
  assert.equal("aspectPatterns" in absent.sky, false);

  const copyWithoutPatterns = buildAstrologyFactsApiResponse(snapshotFromFixture(fixtures.grand_square), false, true).body;
  assert.equal("aspectPatterns" in copyWithoutPatterns, false);
  assert.equal("aspectPatterns" in copyWithoutPatterns.sky, false);

  const present = buildAstrologyFactsApiResponse(snapshotFromFixture(fixtures.grand_square), true).body;
  assert.ok(present.aspectPatterns);
  assert.ok(present.sky.aspectPatterns);
  assert.equal(present.aspectPatterns, present.sky.aspectPatterns);
  assert.deepEqual(present.aspectPatterns, present.sky.aspectPatterns);
  assert.ok(present.sky.aspectPatterns.ranking);
  assert.ok(present.sky.aspectPatterns.interpretationContexts);
  assert.equal("resolvedCopy" in present.sky.aspectPatterns, false);

  const presentWithCopy = buildAstrologyFactsApiResponse(snapshotFromFixture(fixtures.grand_square), true, true).body;
  assert.ok(presentWithCopy.sky.aspectPatterns.resolvedCopy);
  assert.equal(
    presentWithCopy.sky.aspectPatterns.resolvedCopy.length,
    1,
    "A Grand Cross must serve one top-level copy record rather than duplicate its four contained T-squares."
  );
  assert.equal(presentWithCopy.sky.aspectPatterns.resolvedCopy[0].patternType, "grand_square");
  assert.equal(presentWithCopy.sky.aspectPatterns.resolvedCopy[0].source.resolverVersion, "v3");

  const result = present.sky.aspectPatterns;
  const grandSquares = patternsOf(result, "grand_square");
  const tSquares = patternsOf(result, "t_square");
  const grandSquare = grandSquares[0];

  assert.equal(result.orbPolicyId, "natal_aspect_patterns_v1");
  assert.equal(grandSquares.length, 1);
  assert.equal(tSquares.length, 4);
  assert.equal(result.ranking.rankings.length, result.patterns.length);
  assert.equal(result.interpretationContexts.length, result.ranking.rankings.length);
  assert.deepEqual(result.interpretationContexts.map((context) => context.patternId), result.ranking.displayOrder);
  assert.equal(new Set(result.ranking.displayOrder).size, result.patterns.length);
  assert.equal(result.ranking.displayOrder[0], grandSquare.id);
  assert.ok(grandSquare.sourceAspectIds.every((id) => id.startsWith("snapshot.aspect.")));
  assert.equal(result.interpretationContexts.find((context) => context.patternId === grandSquare.id).roles.apex, undefined);

  for (const tSquare of tSquares) {
    assert.ok(result.relationships.some((relationship) => (
      relationship.parentPatternId === grandSquare.id
      && relationship.childPatternId === tSquare.id
      && relationship.relationship === "contains"
    )));
  }

  const kiteResult = aspectPatternsFromSkySnapshot(snapshotFromFixture(fixtures.kite));
  const kite = onePattern(kiteResult, "kite");
  const kiteGrandTrine = onePattern(kiteResult, "grand_trine");
  assert.ok(kiteResult.ranking.displayOrder.indexOf(kite.id) < kiteResult.ranking.displayOrder.indexOf(kiteGrandTrine.id));
  assert.ok(kiteResult.interpretationContexts.find((context) => context.patternId === kite.id).display.childPatternIds.includes(kiteGrandTrine.id));

  const yodSnapshot = snapshotFromFixture(fixtures.yod);
  assert.equal(yodSnapshot.aspects.filter((aspect) => aspect.type === "quincunx").length, 2);
  const yodResult = aspectPatternsFromSkySnapshot(yodSnapshot);
  const yod = onePattern(yodResult, "yod");
  assert.equal(yodResult.ranking.rankings.length, yodResult.patterns.length);
  assert.equal(yodResult.interpretationContexts.length, yodResult.ranking.rankings.length);
  assert.deepEqual(yod.roles.basePlanets, ["moon", "venus"]);
  assert.equal(yod.roles.apex, "saturn");
  assert.equal(yod.roles.falloutPoint.longitude, 30);
  assert.equal(yod.derivedPoints.find((point) => point.type === "fallout_point").longitude, 30);
  assert.ok(yodResult.interpretationContexts.find((context) => context.patternId === yod.id).derivedPoints.some((point) => point.type === "fallout_point"));

  const reversed = aspectPatternsFromSkySnapshot(reversedSnapshotFromFixture(fixtures.grand_square));

  assert.equal(JSON.stringify(reversed), JSON.stringify(result));

  const angleNode = aspectPatternsFromSkySnapshot(snapshotFromFixture(fixtures.angle_node_ignored));
  assert.equal(angleNode.patterns.length, 0);
  assert.ok(angleNode.diagnostics.skippedAspects.every((aspect) => aspect.reason === "non_planet_pattern_member"));

  const realSky = await getAstrodienstSky(defaultLocation, new Date("2026-01-01T12:00:00.000Z"));
  const realQuincunxes = realSky.aspects.filter((aspect) => aspect.type === "quincunx");
  assert.ok(realQuincunxes.length > 0, "Expected calculated sky snapshot to emit quincunx aspects");
  assert.ok(realQuincunxes.every((aspect) => aspect.exactAngle === 150));
  assert.ok(realQuincunxes.every((aspect) => aspect.id && aspect.bodyA && aspect.bodyB && aspect.from && aspect.to));

  const rawDirectionQuincunx = realQuincunxes.find((aspect) => {
    const positionA = realSky.positions.find((position) => position.planet === aspect.from);
    const positionB = realSky.positions.find((position) => position.planet === aspect.to);
    return positionA && positionB && rawLongitudeDifference(positionA, positionB) > 180;
  });
  assert.ok(rawDirectionQuincunx, "Expected a raw >180 degree pair normalized into a 150 degree quincunx");
  assert.ok(rawDirectionQuincunx.separation >= 147 && rawDirectionQuincunx.separation <= 153);
} finally {
  await vite.close();
}

console.log("Astrology facts aspect-pattern API helper tests passed.");
