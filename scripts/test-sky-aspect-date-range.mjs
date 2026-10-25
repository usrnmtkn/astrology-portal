import assert from "node:assert/strict";
import { skyAspectDateRange, localDateParts } from "../apps/web/src/services/skyAspectTiming.ts";
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
// Reused formatter objects must never reuse a date, another selected zone, or
// an invalid-zone result. Compare repeated/DST dates with fresh native output.
for(const zone of ['America/New_York','Asia/Tokyo','UTC',...Intl.supportedValuesOf('timeZone').slice(0,36),'America/New_York','invalid-zone',undefined]){
  for(const instant of ['2026-10-23T23:30:00Z','2026-11-01T06:30:00Z','2027-01-01T00:30:00Z']){
    const date=new Date(instant),timeZone=zone==='invalid-zone'?undefined:zone;
    const expected=Object.fromEntries(new Intl.DateTimeFormat('en-US',{year:'numeric',month:'numeric',day:'numeric',timeZone}).formatToParts(date).map(part=>[part.type,part.value]));
    assert.deepEqual(localDateParts(date,zone),expected);
  }
}
console.log("Aspect dates: same day, month, cross-month, cross-year, and local timezone passed.");
