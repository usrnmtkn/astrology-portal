"use strict";

const assert = require("node:assert/strict");
const {
  buildAnnualTimingContext,
  bonificationMaltreatment,
  chironLifecycle,
  classifyEventSignals,
  conditionScore,
  effectiveOrb,
  eventConfidence,
  getLordOfYear,
  getProfectedHouse,
  getProfectedSign,
  isAspectActive,
  jupiterLifecycle,
  moonPhase,
  progressedLunationPhase,
  rankTransits,
  sameMomentAspectKey,
  shouldDisplayModernPoint,
  transitToNatalAspectKey
} = require("../engine/timing");

assert.equal(getProfectedHouse(0), 1);
assert.equal(getProfectedHouse(11), 12);
assert.equal(getProfectedHouse(12), 1);
assert.equal(getProfectedSign("scorpio", 0), "scorpio");
assert.equal(getProfectedSign("scorpio", 1), "sagittarius");
assert.equal(getLordOfYear("scorpio"), "mars");
assert.equal(getLordOfYear("aquarius"), "saturn");
assert.equal(getLordOfYear("pisces"), "jupiter");

const timing = buildAnnualTimingContext({
  birthDate: "1994-04-12",
  currentDate: "2026-06-02",
  ascendantSign: "scorpio",
  natalPlanets: [
    { planet: "venus", sign: "leo" },
    { planet: "mars", sign: "aquarius" }
  ]
});

assert.equal(timing.ageYears, 32);
assert.equal(timing.profectedHouse, 9);
assert.equal(timing.profectedSign, "cancer");
assert.equal(timing.lordOfYear, "moon");

const ranked = rankTransits(
  [
    {
      id: "saturn-opposition-venus",
      transitingPlanet: "saturn",
      natalTarget: "venus",
      aspect: "opposition",
      orbDegrees: 0.8,
      phase: "applying",
      touchesAngle: true
    },
    {
      id: "moon-trine-jupiter",
      transitingPlanet: "moon",
      natalTarget: "jupiter",
      aspect: "trine",
      orbDegrees: 1.2,
      phase: "separating"
    }
  ],
  timing
);

assert.equal(ranked[0].id, "saturn-opposition-venus");
assert.ok(ranked[0].score > ranked[1].score);

const chartRulerRanked = rankTransits([
  {
    id: "jupiter-trine-mars",
    transitingPlanet: "jupiter",
    natalTarget: "mars",
    aspect: "trine",
    orbDegrees: 1,
    phase: "applying"
  }
], { chartRuler: "mars" });
assert.ok(chartRulerRanked[0].factors.bonuses.includes("hits_chart_ruler"));

assert.equal(effectiveOrb("conjunction", "transit", ["sun", "venus"]), 3);
assert.deepEqual(isAspectActive({
  degreesA: 10,
  degreesB: 12,
  aspect: "conjunction",
  profile: "transit"
}).active, true);
assert.equal(sameMomentAspectKey("mercury", "sun", "trine"), null);
assert.equal(sameMomentAspectKey("mars", "sun", "trine"), "sun_mars_trine");
assert.equal(transitToNatalAspectKey("sun", "mercury", "trine"), "sun_mercury_trine");

const phase = moonPhase(190, 10);
assert.equal(phase.phase, "full");
assert.equal(phase.waning, false);

const condition = conditionScore({
  planet: "mars",
  sign: "capricorn",
  house: 10,
  chartSect: "night",
  planetDegrees: 100,
  sunDegrees: 220
});
assert.ok(condition.score > 0);
assert.equal(condition.angularity.type, "angular");
assert.equal(bonificationMaltreatment({
  planet: "jupiter",
  aspect: "trine"
}, "day").flags[0], "bonification");

const progressed = progressedLunationPhase(181, 0);
assert.equal(progressed.phase, "full");
assert.equal(progressed.nearPhaseBoundary, true);

assert.equal(jupiterLifecycle(36, 100, 100).exactCandidates[0].id, "return");
assert.equal(chironLifecycle(50, 100, 100).exactCandidates[0].id, "return");

assert.equal(shouldDisplayModernPoint({
  userEnabled: false,
  allowCallout: true,
  contactTarget: "moon",
  orbDegrees: 2
}).display, true);

assert.equal(eventConfidence(3), "high");
assert.equal(classifyEventSignals([
  { category: "career" },
  { category: "career" },
  { category: "home" }
])[0].category, "career");

console.log("Timing engine tests passed.");
