import assert from "node:assert/strict";
import {
  preferredWeeklyGuidanceSource,
  resolveWeeklyDayRole,
  weeklyEventDescriptionFitsDateContext,
  weeklyFallbackGuidanceSource,
  weeklyMoonRoleOffset
} from "../apps/web/src/features/calendar/weeklyDayRole.ts";

function event(type, overrides = {}) {
  return {
    id: `${type}-${overrides.title ?? "event"}`,
    type,
    title: overrides.title ?? type,
    startsAt: "2026-07-29T12:00:00.000Z",
    dateKey: "2026-07-29",
    glyph: "",
    primary: true,
    ...overrides
  };
}

function day(dateKey, moonSign, events = []) {
  return {
    date: `${dateKey}T12:00:00.000Z`,
    dateKey,
    inMonth: true,
    moonSign,
    moonSignGlyph: "",
    moonPhase: "Waxing Crescent",
    illumination: 25,
    activeAspects: [],
    events
  };
}

const previousDay = day("2026-07-28", "Capricorn");
const selectedDay = day("2026-07-29", "Aquarius");
const base = {
  day: selectedDay,
  previousDay,
  significantEvents: [],
  previousSignificantEvents: [],
  nextSignificantEvents: [],
  isLastDay: false
};

assert.equal(resolveWeeklyDayRole({
  ...base,
  significantEvents: [event("lunation", { title: "Full Moon in Aquarius" })]
}), "lunation");

assert.equal(resolveWeeklyDayRole({
  ...base,
  significantEvents: [event("station", { title: "Mercury stations direct" })]
}), "station");

assert.equal(resolveWeeklyDayRole({
  ...base,
  significantEvents: [event("ingress", { planet: "Sun", title: "Sun enters Leo" })]
}), "season-opening");

assert.equal(resolveWeeklyDayRole({
  ...base,
  significantEvents: [event("aspect", { title: "Venus square Mars" })]
}), "major-event");

assert.equal(resolveWeeklyDayRole({
  ...base,
  previousSignificantEvents: [
    event("aspect", { title: "Jupiter cazimi" }),
    event("lunation", { title: "Full Moon in Aquarius" })
  ]
}), "integration");

assert.equal(resolveWeeklyDayRole({
  ...base,
  nextSignificantEvents: [event("lunation", { title: "New Moon in Leo" })]
}), "preparation");

assert.equal(resolveWeeklyDayRole(base), "moon-ingress");

assert.equal(resolveWeeklyDayRole({
  ...base,
  day: day("2026-07-29", "Capricorn"),
  isLastDay: true
}), "weekly-handoff");

assert.equal(resolveWeeklyDayRole({
  ...base,
  day: day("2026-07-29", "Capricorn")
}), "full-day-moon");

assert.equal(preferredWeeklyGuidanceSource("integration"), "phase");
assert.equal(preferredWeeklyGuidanceSource("preparation"), "phase");
assert.equal(preferredWeeklyGuidanceSource("station"), "event");
assert.equal(preferredWeeklyGuidanceSource("moon-ingress"), "moon");
assert.equal(
  weeklyFallbackGuidanceSource("integration", false),
  "moon",
  "An event-hidden Moon write-up gets the first quiet day in its sign stretch"
);
assert.equal(
  weeklyFallbackGuidanceSource("integration", true),
  "phase",
  "Integration guidance can use the phase after Moon guidance has surfaced"
);
assert.equal(
  weeklyFallbackGuidanceSource("lunation", false),
  "phase",
  "An exact lunation keeps phase guidance as its safe fallback"
);
assert.equal(weeklyMoonRoleOffset("moon-ingress"), 0);
assert.equal(weeklyMoonRoleOffset("full-day-moon"), 1);
assert.equal(weeklyMoonRoleOffset("weekly-handoff"), 2);
assert.equal(weeklyEventDescriptionFitsDateContext("Today, the Sun is trine Neptune."), false);
assert.equal(weeklyEventDescriptionFitsDateContext("On Monday, the Sun is trine Neptune."), true);

console.log("Calendar weekly day-role selection passed.");
