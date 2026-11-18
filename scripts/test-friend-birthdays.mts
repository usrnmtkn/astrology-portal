import assert from "node:assert/strict";
import { upcomingFriendBirthdays } from "../apps/web/src/features/friends/friendBirthdays.ts";
import type { ManualChart } from "../apps/web/src/services/manualCharts.ts";

const chart = (id: string, birthDate: string, chartType = "person") => ({ id, birthDate, chartType }) as ManualChart;
const dates = (charts: ManualChart[], now: string, zone = "America/New_York") => upcomingFriendBirthdays(charts, now, zone).map(({ chart, date }) => [chart.id, date]);
assert.deepEqual(dates([
  chart("january", "1990-01-01"), chart("tomorrow", "1990-12-31"), chart("today", "1990-12-30"),
  chart("event", "1990-12-30", "event"), chart("shared-private", ""), chart("invalid", "1990-02-30"),
  chart("future-birth", "2090-12-30"), chart("malformed", "12-30")
], "2026-12-31T02:00:00Z"), [["today", "2026-12-30"], ["tomorrow", "2026-12-31"], ["january", "2027-01-01"]]);
assert.deepEqual(dates([chart("leap", "2000-02-29")], "2026-03-01T12:00:00Z"), [["leap", "2028-02-29"]]);
assert.deepEqual(dates([chart("leap", "2000-02-29")], "2028-02-29T12:00:00Z"), [["leap", "2028-02-29"]]);
assert.deepEqual(dates([chart("leap", "2000-02-29")], "2028-03-01T12:00:00Z"), [["leap", "2032-02-29"]]);
const midnight = [chart("a", "1990-01-01"), chart("b", "1990-12-31")];
assert.deepEqual(dates(midnight, "2027-01-01T01:00:00Z"), [["b", "2026-12-31"], ["a", "2027-01-01"]]);
assert.deepEqual(dates(midnight, "2027-01-01T01:00:00Z", "Pacific/Kiritimati"), [["a", "2027-01-01"], ["b", "2027-12-31"]]);
assert.deepEqual(dates([chart("b", "1990-11-01"), chart("a", "1990-11-01")], "2026-11-01T16:00:00Z"), [["a", "2026-11-01"], ["b", "2026-11-01"]]);
assert.deepEqual(dates([], "2026-10-13T16:00:00Z"), []);
console.log("PASS: saved-person birthdays, invalid/private exclusion, selected-zone midnight, year rollover, leap days and deterministic ordering.");
