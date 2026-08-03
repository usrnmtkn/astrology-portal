import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import {
  isDisplayableNatalAspect,
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

const appSource = await readFile(new URL("../apps/web/src/App.tsx", import.meta.url), "utf8");
const friendChartModelSource = await readFile(
  new URL("../apps/web/src/features/friends/friendChartModel.ts", import.meta.url),
  "utf8"
);

assert.match(
  appSource,
  /uniqueDisplayableNatalAspects as uniqueNatalAspectRows/u,
  "The shared natal row pipeline must apply the display predicate."
);
assert.match(
  friendChartModelSource,
  /function groupFriendNatalAspects[\s\S]*?uniqueDisplayableNatalAspects\(aspects\)/u,
  "Friend natal aspect grouping must flow through the filtered natal row pipeline."
);

console.log("Natal aspect display filter contract passed.");
