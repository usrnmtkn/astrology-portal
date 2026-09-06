import assert from "node:assert/strict";
import fs from "node:fs";
import { chartBirthTimeIsKnown } from "../apps/web/src/services/chartProfile.ts";
import {
  natalSnapshotBirthTimeIsKnown,
  natalSnapshotWithBirthTimeReliability
} from "../apps/web/src/services/birthTimeReliability.ts";
import { buildFriendTransitsBrief } from "../apps/web/src/features/friends/friendTransitsBrief.ts";
import type { SkySnapshot } from "../apps/web/src/types.ts";

const snapshot = {
  location: { label: "Test", latitude: 40, longitude: -74, timeZone: "America/New_York" },
  generatedAt: "2026-09-06T12:00:00.000Z",
  ascendant: "Aries",
  ascendantLongitude: 12,
  midheaven: "Capricorn",
  midheavenLongitude: 282,
  houseCusps: [{ house: 1, longitude: 0, sign: "Aries", degree: 0, houseSystem: "whole_sign" }],
  moonPhase: "Waxing",
  dominantElement: "Fire",
  positions: [
    { planet: "Sun", glyph: "☉", sign: "Virgo", signGlyph: "♍", degree: 10, house: 6, motion: "direct", theme: "identity" },
    { planet: "Ascendant", glyph: "↑", sign: "Aries", signGlyph: "♈", degree: 12, house: 1, motion: "direct", theme: "angle" }
  ],
  aspects: [
    { from: "Sun", to: "Moon", type: "trine", orb: 1 },
    { from: "Sun", to: "Ascendant", type: "square", orb: 1 },
    { from: "Midheaven", to: "Sun", type: "trine", orb: 1 }
  ]
} as SkySnapshot;

assert.equal(chartBirthTimeIsKnown({ birthTime: "8:24 AM" }), true);
assert.equal(chartBirthTimeIsKnown({ birthTime: "Time unknown" }), false);
assert.equal(chartBirthTimeIsKnown({ birthTime: "12:00", birthTimeUnknown: true }), false);
assert.equal(chartBirthTimeIsKnown({ birthTime: "" }), false);

const unknown = natalSnapshotWithBirthTimeReliability(snapshot, false)!;
assert.equal(unknown.birthTimeKnown, false);
assert.equal(unknown.ascendant, "");
assert.equal(unknown.ascendantLongitude, undefined);
assert.equal(unknown.midheaven, "");
assert.equal(unknown.midheavenLongitude, undefined);
assert.equal(unknown.houseCusps, undefined);
assert.deepEqual(unknown.positions.map((position) => [position.planet, position.house]), [["Sun", 0]]);
assert.deepEqual(unknown.aspects.map((aspect) => `${aspect.from}:${aspect.to}`), ["Sun:Moon"]);
assert.equal(natalSnapshotBirthTimeIsKnown(unknown), false);

const known = natalSnapshotWithBirthTimeReliability(snapshot, true)!;
assert.equal(known.birthTimeKnown, true);
assert.equal(known.ascendantLongitude, 12);
assert.equal(known.midheavenLongitude, 282);
assert.equal(known.houseCusps?.length, 1);
assert.equal(known.aspects.length, 3);

const personalTransit = {
  id: "saturn-square-sun",
  title: "Saturn squares Sun",
  durationLabel: "Long-term",
  rangeLabel: "September 1 - October 1",
  timingLabel: "Active now",
  summary: "A governed Friends transit summary.",
  orb: "1° 00'",
  detailAvailable: true,
  evidence: {
    transitPlanet: "Saturn",
    transitSign: "Aries",
    aspect: "square",
    natalPoint: "Sun",
    natalSign: "Cancer",
    natalHouse: 0,
    direction: "applying" as const,
    timingBonuses: [],
    contentKeys: ["transit-natal/saturn/square/sun"]
  }
};
const houseTransit = {
  id: "saturn-house-10",
  contentKey: "transit-house/saturn/10",
  transitPlanet: "Saturn",
  title: "Saturn through their 10th house",
  durationLabel: "Long-term",
  timingRange: "September 1 - October 1",
  rowSummary: "A governed house transit summary.",
  termLabel: "Long-term",
  keywords: ["career"],
  house: 10,
  houseLabel: "10th house",
  detailAvailable: true
};
const dailyForecast = {
  headline: "A governed daily headline.",
  body: "A governed daily body.",
  moonContext: {
    sign: "Leo",
    houseLabel: "5th house",
    topic: "creativity"
  }
};

const unknownTimeBrief = buildFriendTransitsBrief({
  friendName: "Friend",
  dateLabel: "September 6",
  personalTransitGroups: [{ key: "short", label: "Short-term themes", transits: [personalTransit] }],
  bondTransits: [],
  houseTransits: [houseTransit],
  dailyForecast,
  dailyDoItems: [],
  dailyDontItems: [],
  patternItems: [],
  birthTimeKnown: false
});
assert.equal(
  unknownTimeBrief.primaryThemes[0]?.evidence.natalHouse,
  undefined,
  "Unknown-time sentinel house 0 must not enter the Friends synthesis brief."
);
assert.deepEqual(
  unknownTimeBrief.houseContext,
  [],
  "Unknown-time Friends synthesis must not receive house-context cards."
);
assert.equal(unknownTimeBrief.counts.houseContext, 0);
assert.equal(unknownTimeBrief.daily?.forecast?.moonContext.houseLabel, null);
assert.equal(unknownTimeBrief.daily?.forecast?.moonContext.topic, null);

const knownTimeBrief = buildFriendTransitsBrief({
  friendName: "Friend",
  dateLabel: "September 6",
  personalTransitGroups: [{
    key: "short",
    label: "Short-term themes",
    transits: [{
      ...personalTransit,
      evidence: { ...personalTransit.evidence, natalHouse: 6 }
    }]
  }],
  bondTransits: [],
  houseTransits: [houseTransit],
  dailyForecast,
  dailyDoItems: [],
  dailyDontItems: [],
  patternItems: [],
  birthTimeKnown: true
});
assert.equal(knownTimeBrief.primaryThemes[0]?.evidence.natalHouse, 6);
assert.equal(knownTimeBrief.houseContext[0]?.house, 10);
assert.equal(knownTimeBrief.daily?.forecast?.moonContext.houseLabel, "5th house");
assert.equal(knownTimeBrief.daily?.forecast?.moonContext.topic, "creativity");

const knownTimeHouseOnlyBrief = buildFriendTransitsBrief({
  friendName: "Friend",
  dateLabel: "September 6",
  personalTransitGroups: [],
  bondTransits: [],
  houseTransits: [houseTransit],
  dailyForecast: null,
  dailyDoItems: [],
  dailyDontItems: [],
  patternItems: [],
  birthTimeKnown: true
});
assert.equal(
  knownTimeHouseOnlyBrief.houseContext[0]?.house,
  10,
  "Known-time house context must remain available even when there are no personal transits that day."
);

const inferredKnownTimeHouseOnlyBrief = buildFriendTransitsBrief({
  friendName: "Friend",
  dateLabel: "September 6",
  personalTransitGroups: [],
  bondTransits: [],
  houseTransits: [houseTransit],
  dailyForecast: null,
  dailyDoItems: [],
  dailyDontItems: [],
  patternItems: []
});
assert.equal(
  inferredKnownTimeHouseOnlyBrief.houseContext[0]?.house,
  10,
  "Already-sanitized production house cards must not be hidden merely because personal transits are absent."
);

const inferredUnknownTimeBrief = buildFriendTransitsBrief({
  friendName: "Friend",
  dateLabel: "September 6",
  personalTransitGroups: [{ key: "short", label: "Short-term themes", transits: [personalTransit] }],
  bondTransits: [],
  houseTransits: [],
  dailyForecast: {
    ...dailyForecast,
    moonContext: {
      ...dailyForecast.moonContext,
      houseLabel: null,
      topic: null
    }
  },
  dailyDoItems: [],
  dailyDontItems: [],
  patternItems: []
});
assert.equal(
  inferredUnknownTimeBrief.primaryThemes[0]?.evidence.natalHouse,
  undefined,
  "Production inference must drop sentinel house 0 when unknown-time upstream data is already sanitized."
);
assert.deepEqual(
  inferredUnknownTimeBrief.houseContext,
  [],
  "Production inference must not invent house context from an unknown-time brief."
);
assert.equal(inferredUnknownTimeBrief.daily?.forecast?.moonContext.houseLabel, null);
assert.equal(inferredUnknownTimeBrief.daily?.forecast?.moonContext.topic, null);

// Browser-connected services are validated as integration contracts here; the full
// TypeScript build below validates their actual module graph under the Vite environment.
const manualCharts = fs.readFileSync("apps/web/src/services/manualCharts.ts", "utf8");
assert.match(manualCharts, /export function manualChartHasReliableBirthTime\(chart: ManualChart\)/u);
assert.match(manualCharts, /typeof chart\.natalChart\?\.birthTimeKnown === "boolean"/u);
assert.match(manualCharts, /return chart\.natalChart\.birthTimeKnown/u);
assert.match(manualCharts, /natalSnapshotWithBirthTimeReliability\(row\.natal_chart, birthTimeKnown\)/u);
assert.match(manualCharts, /natalSnapshotWithBirthTimeReliability\(input\.natalChart, birthTimeKnown\)/u);
assert.match(manualCharts, /manualChartNeedsBirthTime\(chart: ManualChart\)[\s\S]*!manualChartHasReliableBirthTime\(chart\)/u);

const socialFriends = fs.readFileSync("apps/web/src/services/socialFriends.ts", "utf8");
assert.match(socialFriends, /natalSnapshotBirthTimeIsKnown\(friend\.natalChart\)/u);
assert.match(socialFriends, /natalSnapshotWithBirthTimeReliability\(friend\.natalChart, birthTimeKnown\)/u);
assert.match(socialFriends, /birthTime: null,\n    birthTimeUnknown: !birthTimeKnown,/u);
assert.match(socialFriends, /friendSafeNatalChart\(natalChart, birthTimeKnown\)/u);
assert.doesNotMatch(
  socialFriends,
  /birthTime: "12:00",\n    birthTimeUnknown: false,/u,
  "Connected Friends must never fabricate a known noon birth time."
);

// Keep the already-live manual-chart guard as a second line of defense on top of
// the broader persistence/reader reliability contract.
const manualController = fs.readFileSync("apps/web/src/features/friends/useManualChartsController.ts", "utf8");
assert.match(manualController, /natalChartWithReliableAngleLongitudes/u);
assert.match(manualController, /manualChartsWithReliableAngleLongitudes/u);
assert.match(manualController, /const reliableCachedCharts = manualChartsWithReliableAngleLongitudes\(cachedCharts\)/u);
assert.match(manualController, /storedNatalChart,[\s\S]*chart\.birthTimeUnknown/u);
assert.match(manualController, /storedNatalChart,[\s\S]*form\.birthTimeUnknown/u);

const app = fs.readFileSync("apps/web/src/App.tsx", "utf8");
assert.match(app, /function natalTransitTargets\(natalSky: SkySnapshot, birthTimeKnown = false\)/u);
assert.match(app, /if \(!birthTimeKnown \|\| typeof natalSky\.ascendantLongitude !== "number"\)/u);
assert.match(app, /const birthTimeKnown = manualChartHasReliableBirthTime\(chart\)/u);
assert.match(app, /natalTransitTargets\(chart\.natalChart, birthTimeKnown\)/u);
assert.match(app, /!unknownBirthTime && typeof natalSky\?\.ascendantLongitude === "number"/u);
assert.match(app, /!unknownBirthTime && typeof natalSky\?\.midheavenLongitude === "number"/u);
assert.match(app, /if \(!birthTimeKnown\) \{[\s\S]*profectedHouse: null[\s\S]*chartRuler: undefined/u);
assert.match(app, /natalSnapshotWithBirthTimeReliability\(cachedNatalSky, !unknownBirthTime\)/u);
assert.match(app, /writeCachedSkySnapshot\(natalCacheKey, reliableCachedNatalSky\)/u);

const friendNatal = fs.readFileSync("apps/web/src/features/friends/FriendNatalTab.tsx", "utf8");
assert.match(friendNatal, /visibleBigThreeRows = birthTimeUnknown[\s\S]*unreliableAngleLabels/u);
assert.match(friendNatal, /visiblePlacementRows = birthTimeUnknown[\s\S]*unreliableAngleLabels/u);
assert.match(friendNatal, /visibleEmptyHouseRows = birthTimeUnknown \? \[\] : emptyHouseRows/u);

console.log("Birth-time angle reliability contract passed.");
