import assert from "node:assert/strict";
import {
  contentDestinations,
  contentMotion,
  sortPlacementRows
} from "../apps/admin/src/contentMotion.ts";

const rows = [
  {
    content_key: "sky/placement/mercury/virgo",
    facts: { placement: { isRetrograde: true } },
    headline: "Mercury in Virgo",
    updated_at: "2026-08-31T12:00:00.000Z"
  },
  {
    content_key: "sky/placement/venus/libra",
    facts: { is_retrograde: false },
    headline: "Venus in Libra",
    updated_at: "2026-09-01T12:00:00.000Z"
  },
  {
    content_key: "sky/station/saturn/retrograde",
    headline: "Saturn stations retrograde",
    surface: "sky",
    updated_at: "2026-08-30T12:00:00.000Z"
  },
  {
    content_key: "sky/placement/mars/aries",
    headline: "Mars in Aries",
    updated_at: "2026-08-29T12:00:00.000Z"
  },
  {
    content_key: "sky-placement/article/sun/aries",
    headline: "Sun in Aries",
    updated_at: "2026-08-28T12:00:00.000Z"
  },
  {
    content_key: "authored/sky-lunation-macro/full-moon/aries",
    headline: "Full Moon in Aries",
    updated_at: "2026-08-27T12:00:00.000Z"
  }
];

assert.equal(contentMotion(rows[0]), "retrograde");
assert.equal(contentMotion(rows[1]), "direct");
assert.equal(contentMotion(rows[2]), "retrograde");
assert.equal(contentMotion(rows[3]), "direct");
assert.equal(contentMotion(rows[4]), "direct");
assert.equal(contentMotion(rows[5]), "unspecified");
assert.deepEqual([...contentDestinations(rows[0])], ["sky"]);
assert.deepEqual([...contentDestinations(rows[2])], ["sky", "calendar"]);
assert.equal(sortPlacementRows(rows, "retrograde-first")[0].headline, "Mercury in Virgo");
assert.equal(sortPlacementRows(rows, "direct-first")[0].headline, "Mars in Aries");
assert.deepEqual(sortPlacementRows(rows, "title-asc").map((row) => row.headline), [
  "Full Moon in Aries",
  "Mars in Aries",
  "Mercury in Virgo",
  "Saturn stations retrograde",
  "Sun in Aries",
  "Venus in Libra"
]);
assert.equal(sortPlacementRows(rows, "updated-desc")[0].headline, "Venus in Libra");

console.log("Content Studio classifies canonical placement articles as direct baseline copy while preserving explicit retrograde and motion-unspecified rows.");
