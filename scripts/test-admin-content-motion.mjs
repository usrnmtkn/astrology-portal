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
  }
];

assert.equal(contentMotion(rows[0]), "retrograde");
assert.equal(contentMotion(rows[1]), "direct");
assert.equal(contentMotion(rows[2]), "retrograde");
assert.equal(contentMotion(rows[3]), "unspecified");
assert.deepEqual([...contentDestinations(rows[0])], ["sky"]);
assert.deepEqual([...contentDestinations(rows[2])], ["sky", "calendar"]);
assert.equal(sortPlacementRows(rows, "retrograde-first")[0].headline, "Mercury in Virgo");
assert.equal(sortPlacementRows(rows, "direct-first")[0].headline, "Venus in Libra");
assert.deepEqual(sortPlacementRows(rows, "title-asc").map((row) => row.headline), [
  "Mars in Aries",
  "Mercury in Virgo",
  "Saturn stations retrograde",
  "Venus in Libra"
]);
assert.equal(sortPlacementRows(rows, "updated-desc")[0].headline, "Venus in Libra");

console.log("Content Studio classifies and sorts direct, retrograde, and Calendar placement rows from structured facts and canonical keys.");
