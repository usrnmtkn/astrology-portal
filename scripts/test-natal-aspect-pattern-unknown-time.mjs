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

function copyTexts(resolvedCopy) {
  return resolvedCopy.flatMap((copy) => [
    copy.content.eyebrow ?? "",
    copy.content.headline,
    copy.content.overview,
    ...copy.content.sections.map((section) => section.body)
  ]);
}

function withoutHouseFields(value) {
  return JSON.parse(JSON.stringify(value, (key, fieldValue) => (
    key === "house" ? undefined : fieldValue
  )));
}

const vite = await createServer({
  root: repoRoot,
  server: { middlewareMode: true, hmr: false },
  appType: "custom",
  logLevel: "error"
});

try {
  const { aspectPatternsFromSkySnapshot } = await vite.ssrLoadModule("/api/_lib/aspect-patterns.ts");
  const { buildAstrologyFactsApiResponse, default: handler } = await vite.ssrLoadModule("/api/astrology-facts.ts");

  // Keep this test deterministic and offline: without persistence env the
  // handler serves code-backed authored records instead of querying Supabase.
  delete process.env.SUPABASE_URL;
  delete process.env.VITE_SUPABASE_URL;
  delete process.env.SUPABASE_SERVICE_ROLE_KEY;

  for (const fixtureName of ["grand_square", "kite", "yod", "mystic_rectangle"]) {
    const snapshot = snapshotFromFixture(fixtures[fixtureName]);
    const known = aspectPatternsFromSkySnapshot(snapshot, { includeCopy: true, timeKnown: true });
    const unknown = aspectPatternsFromSkySnapshot(snapshot, { includeCopy: true, timeKnown: false });

    // Planetary geometry must be identical: unknown birth time only removes
    // house-derived context, it never changes what was detected.
    assert.deepEqual(
      withoutHouseFields(unknown.patterns),
      withoutHouseFields(known.patterns),
      `${fixtureName}: unknown birth time must not change detected pattern geometry.`
    );
    assert.equal(
      unknown.interpretationContexts.length,
      known.interpretationContexts.length,
      `${fixtureName}: unknown birth time must not drop interpretation contexts.`
    );

    // The known-time run proves the flag is doing something: fixture positions
    // carry houses, so members must include them when the time is known.
    assert.ok(
      known.interpretationContexts.some((context) => context.members.some((member) => typeof member.house === "number")),
      `${fixtureName}: known-time contexts should carry member houses from the snapshot.`
    );

    for (const context of unknown.interpretationContexts) {
      for (const member of context.members) {
        assert.equal(member.house, undefined, `${fixtureName}: unknown birth time must strip member houses.`);
        assert.equal(member.angularProximity, undefined, `${fixtureName}: unknown birth time must strip angular proximity.`);
        assert.notEqual(member.isChartRuler, true, `${fixtureName}: unknown birth time must not mark a chart ruler.`);
      }
    }

    for (const ranking of unknown.ranking.rankings) {
      for (const reason of ranking.reasons ?? []) {
        assert.doesNotMatch(
          String(reason.code ?? ""),
          /angular|chart_ruler/,
          `${fixtureName}: unknown birth time must remove angle-based ranking reasons.`
        );
      }
    }

    const texts = copyTexts(unknown.resolvedCopy);
    assert.ok(texts.length > 0, `${fixtureName}: unknown-time charts must still resolve governed copy.`);
    for (const text of texts) {
      assert.doesNotMatch(text, /\bhouse\b/i, `${fixtureName}: unknown-time copy must be sign-only and never mention houses.`);
      assert.doesNotMatch(text, /\{\{/, `${fixtureName}: unknown-time copy must not leak unresolved slots.`);
      assert.doesNotMatch(text, /ascendant|midheaven|rising sign/i, `${fixtureName}: unknown-time copy must not reference fabricated angles.`);
    }
  }

  // buildAstrologyFactsApiResponse must honor the positional timeKnown flag.
  const responseUnknown = buildAstrologyFactsApiResponse(
    snapshotFromFixture(fixtures.grand_square),
    true,
    true,
    false,
    false,
    false,
    undefined,
    undefined,
    false
  ).body;
  assert.ok(responseUnknown.sky.aspectPatterns.resolvedCopy.length > 0);
  for (const context of responseUnknown.sky.aspectPatterns.interpretationContexts) {
    for (const member of context.members) {
      assert.equal(member.house, undefined, "API response for unknown-time charts must not include member houses.");
      assert.equal(member.angularProximity, undefined, "API response for unknown-time charts must not include angular proximity.");
    }
  }

  // End to end through the HTTP handler: timeKnown=false in the query must
  // strip houses and angles from every interpretation context served.
  const requestUrl = "/api/astrology-facts?lat=40.7&lon=-74&label=Test&date=1990-04-12T16:20:00.000Z&timeZone=America/New_York&includeAspectPatterns=true&includeAspectPatternCopy=true&timeKnown=false";
  const chunks = [];
  const res = {
    statusCode: 0,
    setHeader() {},
    end(payload) {
      chunks.push(payload);
    }
  };
  await handler({ method: "GET", url: requestUrl }, res);
  assert.equal(res.statusCode, 200, "Unknown-time aspect-pattern request must succeed.");
  const body = JSON.parse(chunks.join(""));
  assert.equal(body.ok, true);
  assert.ok(body.sky.aspectPatterns, "Handler must still calculate aspect patterns for unknown-time charts.");
  assert.ok(Array.isArray(body.sky.aspectPatterns.resolvedCopy), "Handler must resolve governed copy for unknown-time charts.");
  for (const context of body.sky.aspectPatterns.interpretationContexts) {
    for (const member of context.members) {
      assert.equal(member.house, undefined, "Handler unknown-time contexts must not include member houses.");
      assert.equal(member.angularProximity, undefined, "Handler unknown-time contexts must not include angular proximity.");
      assert.notEqual(member.isChartRuler, true, "Handler unknown-time contexts must not mark a chart ruler.");
    }
  }
  for (const copy of body.sky.aspectPatterns.resolvedCopy) {
    for (const text of copyTexts([copy])) {
      assert.doesNotMatch(text, /\bhouse\b/i, "Handler unknown-time copy must be sign-only.");
    }
  }
} finally {
  await vite.close();
}

console.log("Natal aspect-pattern unknown-birth-time tests passed.");
