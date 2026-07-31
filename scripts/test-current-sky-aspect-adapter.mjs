import assert from "node:assert/strict";
import { calculateSkyAspects } from "@tldr/astro-knowledge/sky-aspect-engine";
import { currentSkyFacts } from "../api/_lib/current-sky.ts";

const requestedAt = new Date("2026-07-31T19:02:48.000Z");
let requestBody;

globalThis.fetch = async (_url, options) => {
  requestBody = JSON.parse(options.body);

  return new Response(JSON.stringify({
    generatedAt: requestedAt.toISOString(),
    ascendant: "Scorpio",
    midheaven: "Virgo",
    moonPhase: "Waning Gibbous",
    positions: [
      { planet: "Sun", glyph: "☉", longitude: 0, speed: 1, sign: "Aries", signGlyph: "♈", degreeDecimal: 0, house: 6, motion: "direct" },
      { planet: "Moon", glyph: "☽", longitude: 7, speed: 13, sign: "Aries", signGlyph: "♈", degreeDecimal: 7, house: 6, motion: "direct" },
      { planet: "North Node", glyph: "☊", longitude: 180, speed: -0.05, sign: "Libra", signGlyph: "♎", degreeDecimal: 0, house: 12, motion: "retrograde" },
      { planet: "Mercury", glyph: "☿", longitude: 60, speed: 1, sign: "Gemini", signGlyph: "♊", degreeDecimal: 0, house: 8, motion: "direct" },
      { planet: "Venus", glyph: "♀", longitude: 150, speed: 1, sign: "Virgo", signGlyph: "♍", degreeDecimal: 0, house: 11, motion: "direct" }
    ],
    aspects: [
      { from: "Sun", to: "Moon", type: "conjunction", orb: 7 }
    ]
  }), {
    status: 200,
    headers: { "content-type": "application/json" }
  });
};

const sky = await currentSkyFacts(requestedAt);

assert.equal(requestBody.datetime.utc, requestedAt.toISOString(), "The writer must request the reader's exact instant, not fixed noon.");
assert.equal(requestBody.datetime.time, undefined);
assert.ok(sky.positions.some(({ planet, longitude }) => planet === "South Node" && longitude === 0));
assert.ok(sky.aspects.some(({ from, type, to }) => from === "Sun" && type === "quincunx" && to === "Venus"));
assert.ok(!sky.aspects.some(({ from, type, to }) => from === "Sun" && type === "conjunction" && to === "Moon"), "The wider Cloud Run aspect must not leak into the canonical reader matrix.");

assert.deepEqual(
  sky.aspects.map(({ id, from, type, to, orb, applying }) => ({ id, from, type, to, orb, applying })),
  calculateSkyAspects(sky.positions).map(({ id, from, type, to, orb, applying }) => ({ id, from, type, to, orb, applying })),
  "The content adapter and reader engine must return the same aspect matrix."
);

console.log("Current-sky adapter uses the canonical aspect matrix and exact instant.");
