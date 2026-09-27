import assert from "node:assert/strict";
import { test } from "node:test";
import {
  SLOW_CONJUNCTIONS,
  axisDignityPattern,
  dayRulerFor,
  dispositorChain,
  ingressReasoningFacts,
  ingressRulerReading,
  lunationReasoningFacts,
  mutualReceptions,
  wholeSignAspect
} from "../apps/web/src/services/skyEventReasoningFacts.mjs";

// Aries Full Moon, 2026-09-26 16:49 UTC (12:49 EDT). Longitudes from Swiss
// Ephemeris (swisseph-wasm 0.0.5). Lilith is True Lilith, as the app calculates it.
const occursAt = "2026-09-26T16:49:00.000Z";
const at = (planet, longitude, extra = {}) => {
  const signs = ["Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo", "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces"];
  return { planet, longitude, sign: signs[Math.floor(longitude / 30)], degree: longitude % 30, motion: "direct", ...extra };
};
const ariesFullMoon = [
  at("Sun", 183.62),
  at("Moon", 3.619),
  at("Mercury", 204.802),
  at("Venus", 217.68),
  at("Mars", 119.165, { transitStart: "2026-08-11T12:00:00.000Z", transitEnd: "2026-09-28T02:49:00.000Z" }),
  at("Jupiter", 138.809),
  at("Saturn", 11.913, { motion: "retrograde" }),
  at("Uranus", 65.59, { motion: "retrograde" }),
  at("Neptune", 2.981, { motion: "retrograde" }),
  at("Pluto", 303.157, { motion: "retrograde" }),
  at("North Node", 329.525, { motion: "retrograde" }),
  at("Lilith", 252.723, { motion: "retrograde" })
];
const facts = lunationReasoningFacts({
  positions: ariesFullMoon,
  moonEvent: { name: "Full Moon", sign: "Aries", occursAt },
  occursAt
});

test("the conjunction table is sorted cleanly and every pass is a real longitude", () => {
  for (const cycle of SLOW_CONJUNCTIONS) {
    assert.equal(cycle.pair.length, 2);
    for (const [date, longitude] of cycle.passes) {
      assert.match(date, /^\d{4}-\d{2}-\d{2}$/u);
      assert(longitude >= 0 && longitude < 360);
    }
  }
});

test("day ruler follows the local weekday", () => {
  assert.deepEqual(dayRulerFor(occursAt), { weekday: "Saturday", ruler: "Saturn", timeZone: "America/New_York" });
  assert.equal(dayRulerFor("2026-09-27T03:00:00.000Z").weekday, "Saturday");
  assert.equal(dayRulerFor("2026-09-27T03:00:00.000Z", "UTC").weekday, "Sunday");
});

test("whole-sign aspects include aversion", () => {
  assert.equal(wholeSignAspect("Aries", "Cancer"), "square");
  assert.equal(wholeSignAspect("Leo", "Libra"), "sextile");
  assert.equal(wholeSignAspect("Aries", "Taurus"), "aversion");
});

test("sky anchor: the Moon sits between Neptune and Saturn", () => {
  assert.equal(facts.status, "complete");
  assert.equal(facts.event.kind, "full-moon");
  assert.equal(facts.event.moon, "3°37' Aries");
  assert.deepEqual(facts.skyAnchor.moonBetween, ["Neptune", "Saturn"]);
  assert.deepEqual(facts.skyAnchor.bodiesInLunation.map((row) => row.planet), ["Neptune", "Saturn"]);
});

test("cycle anchor: the February 2026 Saturn-Neptune conjunction is the seed", () => {
  const [seed] = facts.cycleAnchor.seedConjunctions;
  assert.deepEqual(seed.pair, ["Saturn", "Neptune"]);
  assert.equal(seed.seedDate, "2026-02-20");
  assert.equal(seed.seedDegree, "0°45' Aries");
  assert.deepEqual(seed.planetsStillInEventSign, ["Saturn", "Neptune"]);
  assert.deepEqual(seed.currentMotion, { Saturn: "retrograde", Neptune: "retrograde" });
  // Older cycles of a pair never compete with the latest one, and a pair with
  // one planet in the sign (Jupiter-Saturn 2020) is not this ground's seed.
  assert.equal(facts.cycleAnchor.seedConjunctions.length, 1);
});

test("axis: Sun and Saturn swap exaltation and fall, and both are on the axis", () => {
  assert.deepEqual(facts.axis.exaltationFallSwap.planets, ["Sun", "Saturn"]);
  assert.equal(facts.axis.exaltationFallSwap.bothOnAxisNow, true);
  assert.deepEqual(axisDignityPattern("Cancer", "Capricorn", []).exaltationFallSwap.planets, ["Mars", "Jupiter"]);
});

test("receptions: Moon-Mars by domicile, Sun-Saturn by exaltation", () => {
  const pairs = facts.receptions.map((row) => `${row.planets.join("-")}:${row.by}`);
  assert(pairs.includes("Moon-Mars:domicile"));
  assert(pairs.includes("Sun-Saturn:exaltation"));
  assert.equal(facts.receptions.find((row) => row.by === "domicile").wholeSignAspect, "square");
});

test("lights and rulers carry their dignity", () => {
  assert.deepEqual(facts.lights.sun.dignities, ["fall"]);
  assert.equal(facts.lights.moonRuler.planet, "Mars");
  assert.deepEqual(facts.lights.moonRuler.dignities, ["fall"]);
  assert.equal(facts.lights.moonRuler.seesMoon, "square");
  assert.equal(facts.lights.sunRuler.planet, "Venus");
  assert.deepEqual(facts.lights.sunRuler.dignities, ["detriment"]);
  assert.deepEqual(facts.lights.moonDispositorChain, { chain: ["Moon", "Mars"], ends: "loop", loop: ["Moon", "Mars"] });
  assert.deepEqual(facts.lights.sunDispositorChain.chain, ["Sun", "Venus", "Mars", "Moon"]);
});

test("ingress window: Mars enters Leo, read through the Sun in fall", () => {
  const [mars] = facts.ingressesInWindow;
  assert.equal(mars.planet, "Mars");
  assert.equal(mars.sign, "Leo");
  assert.equal(mars.hoursFromEvent, 34);
  assert.equal(mars.reading.ruler, "Sun");
  assert.deepEqual(mars.reading.rulerCondition.dignities, ["fall"]);
  assert.equal(mars.reading.rulerSeesSign, "sextile");
});

test("governing planet: Saturn carries the most threads", () => {
  assert.equal(facts.governingPlanet.planet, "Saturn");
  assert(facts.governingPlanet.reasons.includes("rules the day of the event"));
  assert(facts.governingPlanet.reasons.includes("sits in the lunation"));
  assert(facts.governingPlanetRanking.every((row) => !["Neptune", "Uranus", "Pluto"].includes(row.planet)));
});

test("an ingress is read through its new sign's ruler and that ruler's condition", () => {
  const rows = ariesFullMoon.map((row) => ({ ...row }));
  const lilith = ingressRulerReading("Lilith", "Capricorn", rows.map((row) => ({ ...row, sign: row.sign })));
  assert.equal(lilith.ruler, "Saturn");
  assert.equal(lilith.rulerCondition.sign, "Aries");
  assert.deepEqual(lilith.rulerCondition.dignities, ["fall"]);
  assert.equal(lilith.rulerSeesSign, "square");
  assert.deepEqual(lilith.receivedBy, [{ planet: "Saturn", by: "domicile" }, { planet: "Mars", by: "exaltation" }]);

  const marsLeo = ingressReasoningFacts({ positions: ariesFullMoon, planet: "Mars", sign: "Leo", occursAt: "2026-09-28T02:49:00.000Z" });
  assert.equal(marsLeo.status, "complete");
  assert.equal(marsLeo.event.weekday, "Sunday");
  assert.equal(marsLeo.rulerReading.ruler, "Sun");
  assert.equal(marsLeo.rulerReading.mutualReceptionWithRuler, false);
  assert.deepEqual(marsLeo.rulerReading.planetDignityInSign, []);
});

test("self-ruled ingress and chains that end in domicile", () => {
  const rows = [at("Mars", 5), at("Sun", 100)];
  assert.equal(ingressRulerReading("Mars", "Aries", rows).rulerIsSelf, true);
  assert.deepEqual(dispositorChain("Sun", rows), { chain: ["Sun"], ends: "missing", endPlanet: "Moon" });
  assert.deepEqual(dispositorChain("Mars", rows), { chain: ["Mars"], ends: "domicile", endPlanet: "Mars" });
  assert.deepEqual(mutualReceptions(rows), []);
});

test("incomplete input fails closed", () => {
  assert.equal(lunationReasoningFacts({ positions: [], moonEvent: { name: "Full Moon" }, occursAt }).status, "incomplete");
  assert.equal(lunationReasoningFacts({ positions: ariesFullMoon, moonEvent: { name: "Quarter" }, occursAt }).status, "incomplete");
});
