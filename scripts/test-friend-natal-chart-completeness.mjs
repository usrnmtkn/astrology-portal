import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { SKY_BODY_ORDER } from "../apps/web/src/astrologyConfig.ts";
import {
  natalChartHasCompletePlacements,
  natalChartPlacementCompleteness
} from "../apps/web/src/services/natalChartCompleteness.ts";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const manualChartsSource = fs.readFileSync(
  path.join(repoRoot, "apps/web/src/services/manualCharts.ts"),
  "utf8"
);
const controllerSource = fs.readFileSync(
  path.join(repoRoot, "apps/web/src/features/friends/useManualChartsController.ts"),
  "utf8"
);
const panelSource = fs.readFileSync(
  path.join(repoRoot, "apps/web/src/features/friends/ManualChartsPanel.tsx"),
  "utf8"
);
const natalTabSource = fs.readFileSync(
  path.join(repoRoot, "apps/web/src/features/friends/FriendNatalTab.tsx"),
  "utf8"
);

function position(planet, index) {
  return {
    planet,
    glyph: "",
    longitude: index * 20,
    sign: "Aries",
    signGlyph: "♈",
    degree: index,
    house: 1,
    motion: "direct"
  };
}

function snapshot(placements, angles = true) {
  return {
    ascendant: "Aries",
    ascendantLongitude: angles ? 0 : undefined,
    midheaven: "Capricorn",
    midheavenLongitude: angles ? 270 : undefined,
    positions: placements.map(position),
    aspects: []
  };
}

const legacyPlacements = SKY_BODY_ORDER.filter(
  (placement) => !["Chiron", "Lilith", "South Node"].includes(placement)
);
const legacyResult = natalChartPlacementCompleteness(snapshot(legacyPlacements), false);

assert.equal(legacyResult.complete, false);
assert.equal(legacyResult.expectedPlacementCount, 16);
assert.deepEqual(
  legacyResult.missingPlacements,
  ["Chiron", "Lilith", "South Node"],
  "A legacy 11-body Friend snapshot must fail closed on the three missing placements."
);

assert.equal(
  natalChartHasCompletePlacements(snapshot(SKY_BODY_ORDER), false),
  true,
  "A known-time Friend chart with all 14 bodies and both angles must be reader-ready."
);
assert.equal(
  natalChartHasCompletePlacements(snapshot(SKY_BODY_ORDER, false), false),
  false,
  "A known-time Friend chart must not render without Ascendant and Midheaven."
);
assert.equal(
  natalChartHasCompletePlacements(snapshot(SKY_BODY_ORDER, false), true),
  true,
  "An unknown-time chart requires every body but must not invent timed angles."
);

assert.match(
  manualChartsSource,
  /!natalChartHasCompletePlacements\(chart\.natalChart, chart\.birthTimeUnknown\)/,
  "The saved-chart repair rule must validate canonical placement completeness."
);
assert.doesNotMatch(
  controllerSource,
  /if \(chart\.natalChart && chart\.birthLocation\.timeZone === birthLocation\.timeZone\) \{\s*return null;/,
  "The repair worker must not skip an incomplete snapshot merely because its timezone is unchanged."
);
assert.match(
  panelSource,
  /natalSky=\{selectedFriendReadyNatalChart\}/,
  "The Friend chart rail must receive only a complete natal snapshot."
);
assert.match(
  panelSource,
  /const selectedFriendHasChartRail = friendProfileTab === "natal"\s*\? Boolean\(selectedFriendReadyNatalChart\)/,
  "An incomplete Friend snapshot must not mount the chart rail."
);
assert.match(
  panelSource,
  /isNatalChartRepairing=\{selectedFriendNatalChartRepairing\}/,
  "The Friend natal reader must receive the fail-closed repair state."
);
assert.match(
  panelSource,
  /!selectedFriendNatalChartComplete\s*&& manualChartNeedsNatalRepair\(selectedChart\)/,
  "A saved chart with no snapshot yet must stay behind the completion state while repair runs."
);
assert.ok(
  natalTabSource.indexOf("if (isNatalChartRepairing)") < natalTabSource.indexOf("Big three"),
  "The repair state must return before any partial Friend placements are rendered."
);

console.log(JSON.stringify({
  status: "PASS",
  surface: "Friend natal chart completeness",
  expectedKnownTimePlacements: 16,
  guardedLegacyMissingPlacements: legacyResult.missingPlacements
}, null, 2));
