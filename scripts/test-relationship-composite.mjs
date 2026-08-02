import assert from "node:assert/strict";
import {
  comparisonPointsFromSky,
  relationshipCompositeSky,
  relationshipMidpointLongitude,
  synastryAspectOrbLimit,
  synastryContactScore,
  synastryContactSignalTier,
  synastryWheelAspectLines
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

assert.equal(synastryAspectOrbLimit("conjunction", "Sun", "Moon"), 4.5);
assert.equal(synastryAspectOrbLimit("conjunction", "Sun", "Jupiter"), 4);
assert.equal(synastryAspectOrbLimit("conjunction", "Jupiter", "Saturn"), 2);
assert.equal(synastryAspectOrbLimit("conjunction", "Jupiter", "Jupiter"), 1.25);
assert.equal(synastryContactSignalTier("Sun", "Jupiter"), "primary");
assert.equal(synastryContactSignalTier("Saturn", "Jupiter"), "secondary");
assert.equal(synastryContactSignalTier("Jupiter", "Jupiter"), "background");
assert.ok(
  synastryContactScore("Sun", "Moon", "conjunction", 0.5)
    > synastryContactScore("Jupiter", "Jupiter", "conjunction", 0.5),
  "Personal contacts must outrank same-planet generational contacts."
);

const synastryProfileSky = sky({
  positions: [position("Sun", 0, "☉"), position("Jupiter", 0, "♃")]
});
const synastryFriendSky = sky({
  positions: [position("Sun", 4.4, "☉"), position("Jupiter", 1.5, "♃")]
});
const comparisonPoints = comparisonPointsFromSky(synastryProfileSky);
const wheelLines = synastryWheelAspectLines(synastryProfileSky, {
  id: "friend-1",
  natalChart: synastryFriendSky
});

assert.deepEqual(comparisonPoints.map((point) => point.name), ["Sun", "Jupiter"]);
assert.ok(
  wheelLines.some((line) => (
    line.fromPointId === "outer:Sun"
      && line.toPointId === "inner:Sun"
      && Math.abs(line.orb - 4.4) < 0.000001
  )),
  "The wheel must retain its wider personal-point display orb."
);
assert.ok(
  !wheelLines.some((line) => line.fromPointId === "outer:Jupiter" && line.toPointId === "inner:Jupiter"),
  "Same-planet generational contacts outside 1.25° must stay off the wheel."
);

console.log("Relationship composite calculation tests passed.");
