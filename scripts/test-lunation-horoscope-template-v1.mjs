import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  compileLunationHoroscopePacket,
  LunationGovernanceError,
  LunationSourceGapError
} from "../packages/astro-knowledge/scripts/compile-lunation-horoscope-packet.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const contract = JSON.parse(fs.readFileSync(path.join(root, "packages/astro-knowledge/voice/tldr-astro/lunation-horoscope-templates-v1.json"), "utf8"));

const base = {
  eventType: "new-moon",
  exactAt: "2026-09-11T03:26:00-04:00",
  degree: 18.25,
  eventSign: "virgo",
  risingSign: "aries",
  moonHouse: 6,
  houseDomains: ["work", "health", "daily routines"],
  ruler: { body: "mercury", sign: "libra", house: 7, retrograde: false },
  aspects: [
    {
      body: "saturn",
      aspect: "opposition",
      exactAt: "2026-09-11T05:04:00-04:00",
      bodySign: "pisces",
      bodyHouse: 12,
      lunationHouse: 6
    }
  ],
  aspectsComplete: true,
  outerPlanetPlacements: [
    { body: "uranus", sign: "gemini", house: 3, active: true },
    { body: "neptune", sign: "aries", house: 1, active: true },
    { body: "pluto", sign: "aquarius", house: 11, active: true }
  ],
  outerPlanetPlacementsComplete: true
};

function expectSourceGap(mutator, pattern) {
  const input = structuredClone(base);
  mutator(input);
  assert.throws(() => compileLunationHoroscopePacket(input), (error) => {
    assert.ok(error instanceof LunationSourceGapError);
    assert.match(error.message, pattern);
    return true;
  });
}

assert.equal(contract.editorialStatus, "owner_calibration_resolved");
assert.equal(contract.calibrationResolvedAt, "2026-08-11");
assert.equal(contract.runtimeEligible, false);
assert.equal(contract.generationAuthorized, false);
assert.equal(contract.servingAuthorized, false);
const matchingNewMoonAnchor = contract.sharedSpine.find((item) => item.id === "matching_new_moon_anchor");
assert.deepEqual(matchingNewMoonAnchor.requiredFor, ["full-moon"]);
assert.equal(
  matchingNewMoonAnchor.template,
  "Six months ago, consciously or not, this lunar cycle began with the New Moon in {{matchingNewMoonSign}} on {{matchingNewMoonDate}}."
);
assert.equal(matchingNewMoonAnchor.dateFormat.sameCalendarYear, "MMMM d");
assert.equal(matchingNewMoonAnchor.dateFormat.differentCalendarYear, "MMMM d, yyyy");
assert.deepEqual(contract.factGate.fullMoon, ["matchingNewMoon.exactAt", "matchingNewMoon.sign"]);

const newMoon = compileLunationHoroscopePacket(base);
assert.equal(newMoon.event.eventType, "new-moon");
assert.equal(newMoon.writingPlan.axisNamingAllowed, false);
assert.equal(newMoon.writingPlan.revealBeat, false);
assert.equal(newMoon.writingPlan.sixMonthArc, false);
assert.equal(newMoon.writingPlan.lunarCycleArc, true);
assert.equal(newMoon.writingPlan.arcPolicy, "name_lunar_cycle");
assert.deepEqual(newMoon.governance.unresolvedQuestions, []);
assert.equal(newMoon.writingPlan.aspectAttribution.length, 1);
assert.equal(newMoon.writingPlan.aspectAttribution[0].fact.body, "saturn");

const fullMoon = compileLunationHoroscopePacket({
  ...structuredClone(base),
  eventType: "full-moon",
  eventSign: "taurus",
  moonHouse: 2,
  houseDomains: ["money", "possessions", "self-worth"],
  sunSign: "scorpio",
  sunHouse: 8,
  ruler: { body: "venus", sign: "libra", house: 7, retrograde: false },
  matchingNewMoon: { exactAt: "2026-05-16T16:01:00-04:00", sign: "taurus" }
});
assert.equal(fullMoon.writingPlan.axisNamingAllowed, true);
assert.equal(fullMoon.writingPlan.revealBeat, false);
assert.equal(fullMoon.writingPlan.sixMonthArc, true);
assert.equal(fullMoon.writingPlan.arcPolicy, "required_matching_new_moon_anchor");
assert.equal(fullMoon.writingPlan.matchingNewMoonClaimAllowed, true);
assert.equal(fullMoon.writingPlan.matchingNewMoonAnchorRequired, true);
assert.equal(fullMoon.event.matchingNewMoon.dateLabel, "May 16");
assert.equal(fullMoon.event.matchingNewMoon.includeYear, false);
assert.equal(
  fullMoon.event.matchingNewMoon.anchor,
  "Six months ago, consciously or not, this lunar cycle began with the New Moon in Taurus on May 16."
);
assert.equal(fullMoon.writingPlan.closePolicy, "match_full_moon_theme");
assert.deepEqual(fullMoon.governance.unresolvedQuestions, []);

const crossYearFullMoon = compileLunationHoroscopePacket({
  ...structuredClone(base),
  eventType: "full-moon",
  exactAt: "2026-01-03T05:02:00-05:00",
  eventSign: "cancer",
  moonHouse: 4,
  houseDomains: ["home", "family", "private life"],
  sunSign: "capricorn",
  sunHouse: 10,
  ruler: { body: "moon", sign: "cancer", house: 4, retrograde: false },
  matchingNewMoon: { exactAt: "2025-06-25T06:31:00-04:00", sign: "cancer" }
});
assert.equal(crossYearFullMoon.event.matchingNewMoon.dateLabel, "June 25, 2025");
assert.equal(crossYearFullMoon.event.matchingNewMoon.includeYear, true);
assert.equal(
  crossYearFullMoon.event.matchingNewMoon.anchor,
  "Six months ago, consciously or not, this lunar cycle began with the New Moon in Cancer on June 25, 2025."
);

const solar = compileLunationHoroscopePacket({ ...structuredClone(base), eventType: "eclipse-solar" });
assert.equal(solar.writingPlan.sixMonthArc, true);
assert.equal(solar.writingPlan.revealBeat, true);
assert.equal(solar.writingPlan.collapseFirst, false);
assert.equal(solar.writingPlan.desireTestPolicy, "excluded_event_itself_governs");
assert.equal(solar.writingPlan.eventAgencyPolicy, "describe_event_itself");
assert.equal(solar.writingPlan.readerChoiceImplied, false);
assert.ok(!solar.writingPlan.movements.includes("desire_test"));
assert.deepEqual(solar.governance.unresolvedQuestions, []);

const lunar = compileLunationHoroscopePacket({
  ...structuredClone(base),
  eventType: "eclipse-lunar",
  eventSign: "virgo",
  moonHouse: 6,
  sunSign: "pisces",
  sunHouse: 12,
  ruler: { body: "mercury", sign: "libra", house: 7, retrograde: false }
});
assert.equal(lunar.writingPlan.sixMonthArc, true);
assert.equal(lunar.writingPlan.revealBeat, true);
assert.equal(lunar.writingPlan.collapseFirst, true);
assert.equal(lunar.writingPlan.closePolicy, "sharp");
assert.deepEqual(lunar.governance.unresolvedQuestions, []);

expectSourceGap((input) => { delete input.exactAt; }, /exactAt/);
expectSourceGap((input) => { input.degree = 31; }, /degree/);
expectSourceGap((input) => { delete input.moonHouse; }, /moonHouse/);
expectSourceGap((input) => { input.aspectsComplete = false; }, /aspectsComplete/);
expectSourceGap((input) => { delete input.aspects[0].exactAt; }, /aspects\[0\]\.exactAt/);
expectSourceGap((input) => { input.outerPlanetPlacementsComplete = false; }, /outerPlanetPlacementsComplete/);

assert.throws(
  () => compileLunationHoroscopePacket({
    ...structuredClone(base),
    eventType: "full-moon",
    eventSign: "taurus",
    moonHouse: 2,
    houseDomains: ["money", "possessions", "self-worth"],
    sunSign: "scorpio",
    sunHouse: 8,
    ruler: { body: "venus", sign: "libra", house: 7, retrograde: false }
  }),
  (error) => error instanceof LunationSourceGapError && /matchingNewMoon is required/.test(error.message)
);
assert.throws(
  () => compileLunationHoroscopePacket({
    ...structuredClone(base),
    eventType: "full-moon",
    eventSign: "taurus",
    moonHouse: 2,
    houseDomains: ["money", "possessions", "self-worth"],
    sunSign: "scorpio",
    sunHouse: 8,
    ruler: { body: "venus", sign: "libra", house: 7, retrograde: false },
    matchingNewMoon: { exactAt: "2026-05-16T16:01:00-04:00", sign: "aries" }
  }),
  (error) => error instanceof LunationSourceGapError && /must match the Full Moon sign/.test(error.message)
);
assert.throws(
  () => compileLunationHoroscopePacket({
    ...structuredClone(base),
    eventType: "full-moon",
    eventSign: "taurus",
    moonHouse: 2,
    houseDomains: ["money", "possessions", "self-worth"],
    sunSign: "scorpio",
    sunHouse: 8,
    ruler: { body: "venus", sign: "libra", house: 7, retrograde: false },
    matchingNewMoon: { exactAt: "2026-10-16T16:01:00-04:00", sign: "taurus" }
  }),
  (error) => error instanceof LunationSourceGapError && /must precede the Full Moon/.test(error.message)
);

assert.throws(
  () => compileLunationHoroscopePacket(base, { forGeneration: true }),
  (error) => error instanceof LunationGovernanceError && /not approved for generation/.test(error.message)
);

const runtimeFiles = [
  "apps/web/src/content/fallbackArchitectureV3/resolver/renderTransitSynastry.mjs",
  "apps/web/src/content/fallbackArchitectureV3/resolver/renderTransitSynastry.browser.ts",
  "apps/web/src/content/fallbackArchitectureV3/source-rows/fallback-source-rows-v3.json"
];
for (const file of runtimeFiles) {
  assert.ok(!fs.readFileSync(path.join(root, file), "utf8").includes(contract.contractId), `${file} must not wire the pending contract`);
}

console.log("lunation horoscope template V1: PASS");
