#!/usr/bin/env node
import assert from "node:assert/strict";

const { calendarLocalDateKey, calendarPhaseLabelForDay } = await import(
  "../apps/web/src/features/calendar/calendarPhaseLabel.ts"
);

function day(dateKey, illumination, events = []) {
  return { dateKey, illumination, events };
}

const waningQuarterWeek = [
  day("2026-08-03", 76),
  day("2026-08-04", 66),
  day("2026-08-05", 55, [{
    id: "last-quarter",
    type: "lunation",
    title: "Last Quarter Moon in Taurus",
    startsAt: "2026-08-06T02:21:00.000Z"
  }]),
  day("2026-08-06", 44),
  day("2026-08-07", 32)
];

assert.equal(
  calendarPhaseLabelForDay(waningQuarterWeek[1], waningQuarterWeek),
  "Waning Gibbous",
  "The broad phase before an exact Last Quarter must remain Waning Gibbous."
);
assert.equal(
  calendarPhaseLabelForDay(waningQuarterWeek[2], waningQuarterWeek),
  "Waning Gibbous",
  "The exact Last Quarter stays an event card instead of replacing the broad daily phase."
);
assert.equal(
  calendarPhaseLabelForDay(waningQuarterWeek[3], waningQuarterWeek),
  "Waning Crescent",
  "The broad phase after an exact Last Quarter must become Waning Crescent."
);

const newMoonDay = day("2026-08-12", 0, [{
  id: "new-moon",
  type: "lunation",
  title: "New Moon Solar Eclipse in Leo",
  startsAt: "2026-08-12T17:36:00.000Z"
}]);
assert.equal(
  calendarPhaseLabelForDay(newMoonDay, [newMoonDay]),
  "New Moon Solar Eclipse",
  "An exact principal lunation must retain its exact event label."
);

const monthBoundary = [
  day("2026-08-31", 70),
  day("2026-09-01", 61),
  day("2026-09-02", 50),
  day("2026-09-03", 39)
];
assert.equal(calendarPhaseLabelForDay(monthBoundary[1], monthBoundary), "Waning Gibbous");
assert.equal(calendarPhaseLabelForDay(monthBoundary[3], monthBoundary), "Waning Crescent");

const boundaryInstant = "2026-08-06T04:30:00.000Z";
assert.equal(calendarLocalDateKey(boundaryInstant, "America/New_York"), "2026-08-06");
assert.equal(calendarLocalDateKey(boundaryInstant, "America/Los_Angeles"), "2026-08-05");

console.log("Calendar phase labels passed: exact quarters, principal lunations, month boundary, and timezone boundary.");
