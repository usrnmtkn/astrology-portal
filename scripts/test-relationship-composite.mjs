import assert from "node:assert/strict";
import {
  relationshipCompositeSky,
  relationshipMidpointLongitude
} from "../apps/web/src/services/chartMath.ts";

function position(planet, longitude, glyph) {
  const signs = [
    "Aries",
    "Taurus",
    "Gemini",
    "Cancer",
    "Leo",
    "Virgo",
    "Libra",
    "Scorpio",
    "Sagittarius",
    "Capricorn",
    "Aquarius",
    "Pisces"
  ];
  const normalized = ((longitude % 360) + 360) % 360;
  const sign = signs[Math.floor(normalized / 30)];

  return {
    planet,
    glyph,
    sign,
    signGlyph: "",
    degree: normalized % 30,
    house: 1,
    motion: "direct"
  };
}

function sky({ ascendantLongitude, midheavenLongitude, positions }) {
  return {
    location: {
      label: "Test location",
      latitude: 0,
      longitude: 0,
      timeZone: "UTC"
    },
    generatedAt: "2026-08-01T12:00:00.000Z",
    ascendant: "Aries",
    ascendantLongitude,
    midheaven: "Cancer",
    midheavenLongitude,
    moonPhase: "Waxing",
    dominantElement: "Fire",
    positions,
    aspects: []
  };
}

assert.equal(relationshipMidpointLongitude(350, 10), 0, "Midpoints must cross 0° by the shortest arc.");
assert.equal(relationshipMidpointLongitude(10, 350), 0, "Shortest-arc midpoints must be symmetric across 0°.");
assert.equal(relationshipMidpointLongitude(10, 190), 100, "Exact oppositions must preserve the existing forward midpoint.");

const profileSky = sky({
  ascendantLongitude: 350,
  midheavenLongitude: 80,
  positions: [
    position("Sun", 350, "☉"),
    position("Moon", 80, "☽"),
    position("Mercury", 170, "☿"),
    position("North Node", 25, "☊")
  ]
});
const friendSky = sky({
  ascendantLongitude: 10,
  midheavenLongitude: 100,
  positions: [
    position("Sun", 10, "☉"),
    position("Moon", 100, "☽"),
    position("Mercury", 190, "☿"),
    position("North Node", 35, "☊")
  ]
});
const composite = relationshipCompositeSky(profileSky, { natalChart: friendSky });

assert.ok(composite, "Complete natal charts must produce a relationship composite.");
assert.equal(composite.ascendantLongitude, 0);
assert.equal(composite.ascendant, "Aries");
assert.equal(composite.midheavenLongitude, 90);
assert.equal(composite.midheaven, "Cancer");
assert.deepEqual(
  composite.positions.map(({ planet, sign, degree, house }) => ({ planet, sign, degree, house })),
  [
    { planet: "Sun", sign: "Aries", degree: 0, house: 1 },
    { planet: "Moon", sign: "Cancer", degree: 0, house: 4 },
    { planet: "Mercury", sign: "Libra", degree: 0, house: 7 }
  ],
  "Composite positions must retain midpoint signs, degrees, houses, and node exclusion."
);
assert.deepEqual(
  composite.aspects.map(({ from, type, to, orb }) => ({ from, type, to, orb })),
  [
    { from: "Sun", type: "square", to: "Moon", orb: 0 },
    { from: "Sun", type: "opposition", to: "Mercury", orb: 0 },
    { from: "Moon", type: "square", to: "Mercury", orb: 0 }
  ],
  "Composite aspects must retain the existing major-aspect order and orbs."
);
assert.equal(composite.dominantElement, "Fire", "Element ties must preserve Fire-first legacy ordering.");
assert.equal(relationshipCompositeSky(null, { natalChart: friendSky }), null);
assert.equal(relationshipCompositeSky(profileSky, { natalChart: null }), null);

console.log("Relationship composite calculation tests passed.");
