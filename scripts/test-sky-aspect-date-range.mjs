import assert from "node:assert/strict";
import { skyAspectDateRange } from "../apps/web/src/services/skyAspectTiming.ts";
const aspect = { timing: { timeZone: "America/New_York" } };
const cases = [
  ["2026-09-08T08:00:00Z", "2026-09-08T18:00:00Z", "Sep 8, 2026"],
  ["2026-09-08T08:00:00Z", "2026-09-09T18:00:00Z", "Sep 8 - 9, 2026"],
  ["2026-09-30T08:00:00Z", "2026-10-01T18:00:00Z", "Sep 30 - Oct 1, 2026"],
  ["2026-12-31T08:00:00Z", "2027-01-01T18:00:00Z", "Dec 31, 2026 - Jan 1, 2027"],
  ["2026-09-09T01:00:00Z", "2026-09-09T03:00:00Z", "Sep 8, 2026"]
];
for (const [start, end, expected] of cases) {
  assert.equal(skyAspectDateRange(aspect, new Date(start), new Date(end)), expected);
}
console.log("Aspect dates: same day, month, cross-month, cross-year, and local timezone passed.");
