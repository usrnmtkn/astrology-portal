import assert from "node:assert/strict";

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

console.log("Aspect gift/lesson grouping contract passed.");
