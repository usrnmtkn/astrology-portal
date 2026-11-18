import assert from "node:assert/strict";
import { articleTransitKeyDates } from "../apps/web/src/services/articleTransitDates";

const timing = {
  currentStart: "2026-11-13T15:33:00Z", currentEnd: "2026-11-13T23:41:00Z",
  engagementStart: "2026-11-13T15:33:00Z", engagementEnd: "2026-11-13T23:41:00Z",
  exactPasses: [{ exactAt: "2026-11-13T19:37:00Z" }]
};
const rows = articleTransitKeyDates(timing, "2026-11-13T17:00:00Z", "America/New_York");
assert.deepEqual(rows.map(row => [row.date, row.relative, row.label]), [
  ["Nov 13", "Today", "Current contact"], ["Nov 13", "Today", "Exact · Pass 1"], ["Nov 13", "Today", "Full transit series"]
]);
assert.equal(rows[0].current, true);
assert.equal(rows[1].detail, "2:37 PM EST");
assert.equal(rows[2].detail, "10:33 AM EST – 6:41 PM EST · one pass");
assert.equal(articleTransitKeyDates(timing, "2026-11-14T17:00:00Z", "America/New_York")[0].current, false);
assert.deepEqual(articleTransitKeyDates(null, "2026-11-13T17:00:00Z"), []);
const multiPass = articleTransitKeyDates({ ...timing, exactPasses: [...timing.exactPasses, { exactAt: "2026-12-04T19:37:00Z" }] }, "2026-11-13T17:00:00Z", "America/New_York");
assert.equal(multiPass[2].label, "Exact · Pass 2");
assert.match(multiPass[3].detail!, /2 passes$/u);
// The selected zone, rather than the host's civil date, controls midnight and DST.
const midnight = { ...timing, exactPasses: [{ exactAt: "2027-01-01T01:30:00Z" }] };
assert.equal(articleTransitKeyDates(midnight, "2027-01-01T17:00:00Z", "America/New_York")[1].date, "Dec 31, 2026");
const dst = { ...timing, currentStart: "2026-11-01T05:30:00Z", currentEnd: "2026-11-01T06:30:00Z" };
assert.equal(articleTransitKeyDates(dst, "2026-11-01T06:00:00Z", "America/New_York")[0].detail, "1:30 AM EDT – 1:30 AM EST");
console.log("Article transit dates passed: continuous contact, every exact pass, series, selected zone, midnight, year boundary and DST.");
