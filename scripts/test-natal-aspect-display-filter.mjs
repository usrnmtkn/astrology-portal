import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import {
  completeNatalAspectsForPlacement,
  isDisplayableNatalAspect,
  natalAspectCounterpartGroup,
  uniqueDisplayableNatalAspects
} from "../apps/web/src/services/natalAspectDisplay.ts";

const aspect = (from, type, to) => ({ from, type, to });

assert.equal(isDisplayableNatalAspect(aspect("Mercury", "quincunx", "Uranus")), false);
assert.equal(isDisplayableNatalAspect(aspect("Jupiter", "INCONJUNCT", "Mars")), false);
assert.equal(isDisplayableNatalAspect(aspect("North Node", "opposition", "South Node")), false);
assert.equal(isDisplayableNatalAspect(aspect("South Node", "opposition", "North Node")), false);
assert.equal(isDisplayableNatalAspect(aspect("True Node", "opposition", "South Node")), false);
assert.equal(isDisplayableNatalAspect(aspect("South Node", "opposition", "True Node")), false);

assert.equal(isDisplayableNatalAspect(aspect("Mercury", "trine", "Uranus")), true);
assert.equal(isDisplayableNatalAspect(aspect("North Node", "opposition", "Mars")), true);
assert.equal(isDisplayableNatalAspect(aspect("Sun", "opposition", "South Node")), true);

const uniqueAspects = uniqueDisplayableNatalAspects([
  { ...aspect("Mercury", "trine", "Uranus"), orb: 1 },
  { ...aspect("Uranus", "trine", "Mercury"), orb: 2 },
  { ...aspect("Sun", "square", "Moon"), orb: 3 },
  { ...aspect("Mars", "quincunx", "Saturn"), orb: 1 }
]);

assert.deepEqual(
  uniqueAspects.map(({ from, type, to }) => [from, type, to]),
  [
    ["Mercury", "trine", "Uranus"],
    ["Sun", "square", "Moon"]
  ]
);

const placementAspects = completeNatalAspectsForPlacement([
  { ...aspect("Moon", "sextile", "Saturn"), orb: 1.4 },
  { ...aspect("Moon", "square", "Midheaven"), orb: 3.8 },
  { ...aspect("Moon", "trine", "Mercury"), orb: 5.7 },
  { ...aspect("Moon", "sextile", "North Node"), orb: 4.8 },
  { ...aspect("Moon", "conjunction", "Uranus"), orb: 8.2 },
  { ...aspect("Moon", "square", "Mars"), orb: 10 },
  { ...aspect("Moon", "square", "Jupiter"), orb: 11.8 },
  { ...aspect("Moon", "quincunx", "Ascendant"), orb: 1.7 }
], "Moon");

assert.deepEqual(
  placementAspects.map(({ from, type, to }) => [from, type, to]),
  [
    ["Moon", "sextile", "Saturn"],
    ["Moon", "square", "Midheaven"],
    ["Moon", "sextile", "North Node"],
    ["Moon", "trine", "Mercury"],
    ["Moon", "conjunction", "Uranus"],
    ["Moon", "square", "Mars"],
    ["Moon", "square", "Jupiter"]
  ],
  "Natal placement details must retain every displayable aspect, without an arbitrary row cap."
);
assert.equal(natalAspectCounterpartGroup(placementAspects[0], "Moon"), "planets");
assert.equal(natalAspectCounterpartGroup(placementAspects[1], "Moon"), "points");
assert.equal(natalAspectCounterpartGroup(placementAspects[2], "Moon"), "points");

const appSource = await readFile(new URL("../apps/web/src/App.tsx", import.meta.url), "utf8");
const friendChartModelSource = await readFile(
  new URL("../apps/web/src/features/friends/friendChartModel.ts", import.meta.url),
  "utf8"
);
const wheelSource = await readFile(
  new URL("../apps/web/src/components/charts/Wheels.tsx", import.meta.url),
  "utf8"
);

assert.match(
  appSource,
  /uniqueDisplayableNatalAspects as uniqueNatalAspectRows/u,
  "The shared natal row pipeline must apply the display predicate."
);
assert.match(
  appSource,
  /completeNatalAspectsForPlacement\(aspects, pointName\)/u,
  "Natal placement details must use the complete, uncapped aspect inventory."
);
assert.doesNotMatch(
  appSource,
  /slice\(0, mode === "sky" \? 2 : 4\)/u,
  "The historical four-aspect natal placement cap must never return."
);
assert.doesNotMatch(
  appSource,
  /const natalAspectRows =[^;]+slice\(0, 8\)/su,
  "The main You natal chart must not truncate its aspect inventory."
);
assert.match(
  appSource,
  /grouping: "counterpart"/u,
  "Natal placement details must keep planetary aspects separate from angles and points."
);
assert.match(
  friendChartModelSource,
  /function groupFriendNatalAspects[\s\S]*?uniqueDisplayableNatalAspects\(aspects\)/u,
  "Friend natal aspect grouping must flow through the filtered natal row pipeline."
);
assert.doesNotMatch(
  wheelSource,
  /const visibleAspects = activeAspects\.slice\(0, 4\)/u,
  "Natal chart wheel details must not hide aspect labels behind a four-row tooltip cap."
);

console.log("Natal aspect display filter contract passed.");
