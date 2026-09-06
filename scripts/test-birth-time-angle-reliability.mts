import assert from "node:assert/strict";
import fs from "node:fs";
import { chartBirthTimeIsKnown } from "../apps/web/src/services/chartProfile.ts";
import {
  natalSnapshotBirthTimeIsKnown,
  natalSnapshotWithBirthTimeReliability
} from "../apps/web/src/services/birthTimeReliability.ts";
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

const manualController = fs.readFileSync("apps/web/src/features/friends/useManualChartsController.ts", "utf8");
assert.match(manualController, /natalSnapshotWithBirthTimeReliability\(natalSky, timeKnown\)/u);
assert.match(manualController, /return reliableNatalSky/u);

const app = fs.readFileSync("apps/web/src/App.tsx", "utf8");
assert.match(app, /function natalTransitTargets\(natalSky: SkySnapshot, birthTimeKnown = false\)/u);
assert.match(app, /if \(!birthTimeKnown \|\| typeof natalSky\.ascendantLongitude !== "number"\)/u);
assert.match(app, /birthTimeKnown: manualChartHasReliableBirthTime\(chart\)/u);
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
