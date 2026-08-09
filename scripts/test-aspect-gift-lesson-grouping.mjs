import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import {
  aspectGiftOrLesson,
  groupAspectsByGiftLesson
} from "../apps/web/src/services/aspectGiftLesson.ts";

assert.equal(aspectGiftOrLesson("trine"), "gifts");
assert.equal(aspectGiftOrLesson("SEXTILE"), "gifts");
assert.equal(aspectGiftOrLesson("conjunction"), "lessons");
assert.equal(aspectGiftOrLesson("square"), "lessons");
assert.equal(aspectGiftOrLesson("opposition"), "lessons");

const groups = groupAspectsByGiftLesson(
  [
    { id: "square-wide", aspect: "square", orb: 4.2 },
    { id: "trine-wide", aspect: "trine", orb: 3.1 },
    { id: "conjunction-tight", aspect: "conjunction", orb: 0.2 },
    { id: "sextile-tight", aspect: "sextile", orb: 0.8 }
  ],
  (aspect) => aspect.aspect,
  (aspect) => aspect.orb
);

assert.deepEqual(groups.map((group) => group.label), ["Gifts", "Lessons"]);
assert.deepEqual(groups[0].aspects.map((aspect) => aspect.id), ["sextile-tight", "trine-wide"]);
assert.deepEqual(groups[1].aspects.map((aspect) => aspect.id), ["conjunction-tight", "square-wide"]);
assert.equal(groupAspectsByGiftLesson(
  [{ aspect: "trine", orb: 1 }],
  (aspect) => aspect.aspect,
  (aspect) => aspect.orb
).length, 1);

const appSource = await readFile(new URL("../apps/web/src/App.tsx", import.meta.url), "utf8");
const manualChartsPanelSource = await readFile(
  new URL("../apps/web/src/features/friends/ManualChartsPanel.tsx", import.meta.url),
  "utf8"
);
const friendChartModelSource = await readFile(
  new URL("../apps/web/src/features/friends/friendChartModel.ts", import.meta.url),
  "utf8"
);
const youPageSource = await readFile(new URL("../apps/web/src/features/you/YouPage.tsx", import.meta.url), "utf8");

assert.match(manualChartsPanelSource, /selectedSynastryAspectGroups[\s\S]{0,240}?groupAspectsByGiftLesson/);
assert.match(manualChartsPanelSource, /selectedCompositeAspectGroups[\s\S]{0,240}?groupAspectsByGiftLesson/);
assert.match(friendChartModelSource, /groupFriendNatalAspects[\s\S]*?return groupAspectsByGiftLesson/);
assert.match(appSource, /function ActiveAspects[\s\S]*?groupAspectsByGiftLesson/);
assert.match(youPageSource, /natalAspectGroups\.map/);

console.log("Aspect gift/lesson grouping contract passed.");
