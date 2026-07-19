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

const vite = await createServer({
  root: repoRoot,
  server: { middlewareMode: true, hmr: false },
  appType: "custom",
  logLevel: "error"
});

try {
  const { aspectPatternsFromSkySnapshot } = await vite.ssrLoadModule("/api/_lib/aspect-patterns.ts");
  const result = aspectPatternsFromSkySnapshot(snapshotFromFixture(fixtures.grand_square));
  const grandSquares = result.patterns.filter((pattern) => pattern.type === "grand_square");
  const tSquares = result.patterns.filter((pattern) => pattern.type === "t_square");
  const grandSquare = grandSquares[0];

  assert.equal(result.orbPolicyId, "natal_aspect_patterns_v1");
  assert.equal(grandSquares.length, 1);
  assert.equal(tSquares.length, 4);
  assert.ok(grandSquare.sourceAspectIds.every((id) => id.startsWith("snapshot.aspect.")));

  for (const tSquare of tSquares) {
    assert.ok(result.relationships.some((relationship) => (
      relationship.parentPatternId === grandSquare.id
      && relationship.childPatternId === tSquare.id
      && relationship.relationship === "contains"
    )));
  }

  const reversed = aspectPatternsFromSkySnapshot({
    ...snapshotFromFixture(fixtures.grand_square),
    positions: snapshotFromFixture(fixtures.grand_square).positions.slice().reverse(),
    aspects: snapshotFromFixture(fixtures.grand_square).aspects.slice().reverse().map((aspect) => ({
      ...aspect,
      from: aspect.to,
      to: aspect.from
    }))
  });

  assert.equal(JSON.stringify(reversed), JSON.stringify(result));
} finally {
  await vite.close();
}

console.log("Astrology facts aspect-pattern API helper tests passed.");
