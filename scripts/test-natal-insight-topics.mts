import assert from "node:assert/strict";
import { natalInsightPlacements, natalInsightTopics } from "../apps/web/src/services/natalInsightTopics.ts";

// Synthetic Scorpio-rising chart: the MC deliberately sits in the ninth
// whole-sign house, so career navigation must retain both MC and tenth-house facts.
const placements = [
  { planet: "Sun", sign: "Leo", house: 10 },
  { planet: "Moon", sign: "Aquarius", house: 4 },
  { planet: "Ascendant", sign: "Scorpio", house: 1 },
  { planet: "Mercury", sign: "Virgo", house: 11 },
  { planet: "Venus", sign: "Pisces", house: 5 },
  { planet: "Mars", sign: "Aries", house: 6 },
  { planet: "Jupiter", sign: "Sagittarius", house: 2 },
  { planet: "Saturn", sign: "Capricorn", house: 3 },
  { planet: "Neptune", sign: "Pisces", house: 5 },
  { planet: "Pluto", sign: "Scorpio", house: 1 },
  { planet: "Midheaven", sign: "Cancer", house: 9 }
];
const select = (id: string, known = true, ascendant = "Scorpio", rows = placements) => {
  const topic = natalInsightTopics.find((item) => item.id === id)!;
  return natalInsightPlacements(topic, rows, ascendant, known).map((row) => row.planet);
};

assert.deepEqual(select("approach"), ["Sun", "Ascendant", "Mars"], "Use traditional chart ruler, not Pluto");
assert.deepEqual(select("home-belonging"), ["Saturn", "Moon"], "Include the fourth-house ruler even outside that house");
assert.deepEqual(select("creativity-pleasure"), ["Venus", "Jupiter", "Neptune"], "Include occupants and traditional ruler without repeating Venus");
assert.deepEqual(select("work-direction"), ["Midheaven", "Jupiter", "Mars", "Sun"], "MC must not replace tenth-house facts; shared occupants/rulers appear once");
assert.deepEqual(select("emotional-needs"), ["Moon", "Sun"]);
for (const id of ["home-belonging", "money-resources", "work-direction"]) {
  assert.deepEqual(select(id, false), [], `${id}: ignore cached houses and angles with unknown time`);
  assert.deepEqual(select(id, true, "Pending"), [], `${id}: ignore unresolved ascendant`);
}
assert.deepEqual(select("approach", false), ["Sun"]);
assert.deepEqual(select("style-expression", false), ["Venus", "Moon"]);
assert.deepEqual(select("emotional-needs", true, "Scorpio", placements.map((row) => row.planet === "Moon" ? { ...row, sign: "Pending" } : row)), ["Sun"]);
assert.deepEqual(select("approach", true, "Scorpio", []), []);
console.log("Natal insight topics: chart rulers, house occupants, MC separation, deduplication and unknown-time boundaries passed.");

const { natalInsightFacts, natalInsightReadingKey } = await import("../apps/web/src/services/natalInsightReading.ts");
const sky: any = { positions: placements.map(p => ({ ...p, degree: 12, motion: "direct" })),
  aspects: [{ from: "Moon", to: "Saturn", type: "square", orb: 1.5 }],
  ascendant: "Scorpio", ascendantLongitude: 225, midheavenLongitude: 115, birthTimeKnown: true };
const emotional = natalInsightFacts("emotional-needs", sky, true);
assert.equal(emotional.aspects.length, 1, "Keep relevant contacts even when the other planet is outside the topic's primary planets");
const key = await natalInsightReadingKey("emotional-needs", sky, true, "you");
const changedSky = structuredClone(sky); changedSky.positions.find(p => p.planet === "Moon").sign = "Pisces";
assert.notEqual(key, await natalInsightReadingKey("emotional-needs", changedSky, true, "you"));
assert.notEqual(key, await natalInsightReadingKey("emotional-needs", sky, true, "friend"));
assert.notEqual(key, await natalInsightReadingKey("emotional-needs", sky, false, "you"));
const unknown = natalInsightFacts("work-direction", sky, false);
assert.deepEqual(unknown.placements, []); assert.deepEqual(unknown.houses, []);
console.log("Private topic identity: chart changes, audience separation, relevant aspects and unknown birth time passed.");
assert.equal(emotional.aspectPartners[0].planet, "Saturn", "Aspect partners retain their computed placements for interpretation");
const partnerChanged = structuredClone(sky); partnerChanged.positions.find(p => p.planet === "Saturn").sign = "Aquarius";
assert.notEqual(key, await natalInsightReadingKey("emotional-needs", partnerChanged, true, "you"), "A changed aspect partner cannot reuse old chart prose");
const withAngle = { ...sky, aspects: [...sky.aspects, { from: "Moon", to: "Ascendant", type: "square", orb: 2 }] };
assert.equal(natalInsightFacts("emotional-needs", withAngle, false).aspects.length, 1, "Unknown birth time excludes angle aspects even when cached");
