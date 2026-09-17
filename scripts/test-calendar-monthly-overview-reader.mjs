import assert from "node:assert/strict";
import { calendarMonthlyEditorialPattern } from "../apps/admin/src/skyForecastTemplates.ts";
import { CALENDAR_MONTHLY_OVERVIEW_KEY, resolveCalendarMonthlyOverview } from "../apps/web/src/features/calendar/monthlyOverview.ts";

const timeZone = "America/New_York";
const days = Array.from({ length: 30 }, (_, index) => ({
  date: `2026-09-${String(index + 1).padStart(2, "0")}T12:00:00.000Z`,
  dateKey: `2026-09-${String(index + 1).padStart(2, "0")}`,
  inMonth: true,
  moonSign: "Virgo",
  moonSignGlyph: "♍",
  moonPhase: "Waxing",
  illumination: 40,
  activeAspects: [],
  events: []
}));
const calendar = {
  month: "2026-09",
  timeZone,
  location: { label: "New York", latitude: 40.7, longitude: -74, timeZone },
  days,
  events: [
    { id: "nm", type: "lunation", title: "New Moon in Virgo", startsAt: "2026-09-07T16:00:00.000Z", dateKey: "2026-09-07", glyph: "●", primary: true, sign: "Virgo" },
    { id: "fm", type: "lunation", title: "Full Moon Lunar Eclipse in Pisces", startsAt: "2026-09-21T16:00:00.000Z", dateKey: "2026-09-21", glyph: "○", primary: true, sign: "Pisces", eclipseType: "lunar" },
    { id: "leo", type: "ingress", title: "Sun enters Leo", startsAt: "2026-07-22T12:00:00.000Z", dateKey: "2026-07-22", glyph: "☉", primary: true, planet: "Sun", toSign: "Leo" },
    { id: "virgo", type: "ingress", title: "Sun enters Virgo", startsAt: "2026-08-22T12:00:00.000Z", dateKey: "2026-08-22", glyph: "☉", primary: true, planet: "Sun", toSign: "Virgo" },
    { id: "libra", type: "ingress", title: "Sun enters Libra", startsAt: "2026-09-22T16:00:00.000Z", dateKey: "2026-09-22", glyph: "☉", primary: true, planet: "Sun", toSign: "Libra" },
    { id: "scorpio", type: "ingress", title: "Sun enters Scorpio", startsAt: "2026-10-23T12:00:00.000Z", dateKey: "2026-10-23", glyph: "☉", primary: true, planet: "Sun", toSign: "Scorpio" }
  ]
};

assert.equal(resolveCalendarMonthlyOverview(calendar), null, "No published template means no reader overview.");

const emptyTemplate = new Map([[CALENDAR_MONTHLY_OVERVIEW_KEY, {
  id: "monthly", contentKey: CALENDAR_MONTHLY_OVERVIEW_KEY, surface: "calendar", mode: "template",
  eventType: null, targetDate: null, headline: null, summary: null,
  body: calendarMonthlyEditorialPattern(), sections: {}, model: null, updatedAt: "2026-09-16T00:00:00.000Z", status: "LIVE"
}]]);
assert.equal(resolveCalendarMonthlyOverview(calendar, emptyTemplate), null, "An unpublished empty editorial pattern does not invent month copy.");

const generatedContent = new Map([[CALENDAR_MONTHLY_OVERVIEW_KEY, {
  id: "monthly", contentKey: CALENDAR_MONTHLY_OVERVIEW_KEY, surface: "calendar", mode: "template",
  eventType: null, targetDate: null, headline: null, summary: null,
  body: calendarMonthlyEditorialPattern(),
  sections: {
    calendarOverview: {
      seasonOpening: "From {{entryDate}} to {{exitDate}}, the Sun moves through {{signTitle}}.",
      newMoonOverview: "The New Moon in {{signTitle}} on {{eventDate}}.",
      fullMoonOverview: "The Full Moon in {{signTitle}}{{#hasLunarEclipse}} eclipse{{/hasLunarEclipse}}.",
      seasonOverview: "The Sun enters {{signTitle}}."
    }
  },
  model: null, updatedAt: "2026-09-16T00:00:00.000Z", status: "LIVE"
}]]);
const overview = resolveCalendarMonthlyOverview(calendar, generatedContent);
assert.ok(overview);
assert.equal(overview.contentKey, CALENDAR_MONTHLY_OVERVIEW_KEY);
const text = overview.paragraphs.join("\n");
assert.match(text, /Virgo/);
assert.match(text, /Libra/);
assert.match(text, /Pisces/);
assert.match(text, /eclipse/);
assert.equal(/Cancer/.test(text), false);
assert.equal(overview.paragraphs.some(paragraph => paragraph.includes("{{")), false, "Unresolved tokens must not reach the Calendar month page.");

console.log("PASS: Calendar month page renders published monthly overview with per-passage calculated context and hides empty templates.");
