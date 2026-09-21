import assert from "node:assert/strict";
import {
  daySeasonStart,
  daySurfaceEvents,
  isExactQuarterMoonDay,
  isMajorCalendarEvent,
  isMonthAgendaDay,
  isSpanningRetrogradeEvent,
  monthAgendaEvents,
  monthCellDisplay,
  monthCellDisplayEvents,
  monthCellMarks,
  moonIngressEvent,
  moonPhaseEmoji,
  seasonLongTransits,
  weekAgendaEvents,
  weekStripDots
} from "../apps/web/src/features/calendar/calendarSurfaceEvents.ts";

function event(partial) {
  return {
    startsAt: `${partial.dateKey}T12:00:00.000Z`,
    glyph: "☉",
    primary: true,
    ...partial
  };
}

function day(partial) {
  return {
    date: `${partial.dateKey}T12:00:00.000Z`,
    inMonth: true,
    moonSignGlyph: "",
    moonPhase: "Waxing Crescent",
    illumination: 40,
    activeAspects: [],
    ...partial
  };
}

const ingress = event({
  id: "mercury-libra",
  type: "ingress",
  title: "Mercury enters Libra",
  dateKey: "2026-09-10",
  planet: "Mercury",
  toSign: "Libra",
  sign: "Libra"
});
const station = event({
  id: "uranus-station",
  type: "station",
  title: "Uranus stations retrograde",
  dateKey: "2026-09-10",
  planet: "Uranus",
  sign: "Gemini",
  direction: "retrograde",
  phase: "station-retrograde"
});
const aspect = event({
  id: "sun-square-lilith",
  type: "aspect",
  title: "Sun square Lilith",
  dateKey: "2026-09-20",
  planets: ["Sun", "Lilith"],
  aspect: "square",
  fromSign: "Virgo",
  toSign: "Sagittarius"
});
const moonAspect = event({
  id: "moon-trine-sun",
  type: "aspect",
  title: "Moon trine Sun",
  dateKey: "2026-09-20",
  primary: false,
  planets: ["Moon", "Sun"],
  aspect: "trine"
});
const spanningRx = event({
  id: "saturn-rx",
  type: "station",
  title: "Saturn retrograde",
  dateKey: "2026-09-20",
  primary: false,
  planet: "Saturn",
  sign: "Aries",
  direction: "retrograde",
  phase: "retrograde-passage",
  endsAt: "2026-12-10T00:00:00.000Z"
});
const lunation = event({
  id: "new-moon",
  type: "lunation",
  title: "New Moon in Virgo",
  dateKey: "2026-09-10",
  sign: "Virgo"
});

assert.equal(isSpanningRetrogradeEvent(spanningRx), true);
assert.equal(isSpanningRetrogradeEvent(station), false);
assert.equal(isMajorCalendarEvent(aspect), false);
assert.equal(isMajorCalendarEvent(ingress), true);
assert.equal(isMajorCalendarEvent(lunation), true);
assert.equal(isMajorCalendarEvent(spanningRx), false);

const selected = day({
  dateKey: "2026-09-20",
  moonSign: "Capricorn",
  events: [aspect, moonAspect, spanningRx]
});
const previous = day({
  dateKey: "2026-09-19",
  moonSign: "Sagittarius",
  events: [],
  voidOfCourse: {
    remainingLabel: "",
    until: "2026-09-20T01:54:00.000Z",
    nextSign: "Capricorn"
  }
});

const surface = daySurfaceEvents(selected, previous);
assert.equal(surface.some((item) => item.id === aspect.id), true);
assert.equal(surface.some((item) => item.id === moonAspect.id), true);
assert.equal(surface.some((item) => item.id === spanningRx.id), false);
const moonIngress = moonIngressEvent(selected, previous);
assert.ok(moonIngress);
assert.equal(moonIngress.title, "Moon enters Capricorn");
assert.equal(moonIngress.startsAt, "2026-09-20T01:54:00.000Z");
assert.equal(surface.some((item) => item.id === moonIngress.id), true);

const busy = day({
  dateKey: "2026-09-10",
  moonSign: "Virgo",
  events: [lunation, ingress, station, aspect, event({
    id: "venus-scorpio",
    type: "ingress",
    title: "Venus enters Scorpio",
    dateKey: "2026-09-10",
    planet: "Venus",
    toSign: "Scorpio"
  })]
});
const marks = monthCellMarks(busy.events);
assert.equal(marks.chips.length, 5);
assert.equal(marks.dots.length, 0);
const display = monthCellDisplay(busy.events);
assert.equal(display.chips.length, 4);
assert.equal(display.dots.length, 0);
assert.equal(display.overflow, 1);
assert.equal(monthCellDisplayEvents([lunation, aspect]).map((item) => item.type).join(","), "lunation,aspect");
assert.equal(monthCellMarks([moonAspect]).chips.length, 1);
assert.equal(monthCellMarks([moonAspect]).dots.length, 0);
assert.equal(monthCellDisplayEvents([moonAspect]).map((item) => item.id).join(","), moonAspect.id);
assert.equal(
  monthCellDisplayEvents([moonAspect, aspect]).map((item) => item.id).join(","),
  `${aspect.id},${moonAspect.id}`
);
assert.equal(weekStripDots(busy.events).length, 3);
assert.equal(moonPhaseEmoji("Waxing Gibbous"), "🌔");
assert.equal(moonPhaseEmoji("New Moon"), "🌑");
assert.equal(daySeasonStart(busy), null);
const seasonDay = day({
  dateKey: "2026-09-22",
  moonSign: "Virgo",
  events: [event({
    id: "sun-libra",
    type: "ingress",
    title: "Sun enters Libra",
    dateKey: "2026-09-22",
    planet: "Sun",
    toSign: "Libra"
  })]
});
assert.equal(daySeasonStart(seasonDay)?.planet, "Sun");
assert.equal(monthCellMarks(seasonDay.events).chips.length, 0);

const transits = seasonLongTransits({
  dateKey: "2026-09-20",
  dayEvents: [spanningRx],
  rangeEvents: [spanningRx, event({
    id: "jupiter-leo",
    type: "ingress",
    title: "Jupiter enters Leo",
    dateKey: "2026-06-29",
    planet: "Jupiter",
    toSign: "Leo",
    sign: "Leo"
  })],
  skyPositions: [
    { planet: "Jupiter", glyph: "♃", sign: "Leo", signGlyph: "♌", degree: 1, house: 1, motion: "direct" },
    { planet: "Saturn", glyph: "♄", sign: "Aries", signGlyph: "♈", degree: 1, house: 1, motion: "retrograde", retrogradeEnd: "2026-12-10T00:00:00.000Z" }
  ]
});
assert.equal(transits.find((row) => row.planet === "Jupiter")?.title, "Jupiter in Leo");
assert.equal(transits.find((row) => row.planet === "Jupiter")?.retrograde, false);
assert.equal(transits.find((row) => row.planet === "Saturn")?.title, "Saturn Rx in Aries");
assert.equal(transits.find((row) => row.planet === "Saturn")?.retrograde, true);
assert.equal(transits.find((row) => row.planet === "Saturn")?.glyph, "♄♈");

assert.equal(isMonthAgendaDay(busy, "New Moon"), true);
assert.equal(isMonthAgendaDay(selected, "Waning Crescent"), false);
assert.equal(isMonthAgendaDay(seasonDay, "Waning Crescent"), true);
assert.equal(isMonthAgendaDay(day({
  dateKey: "2026-09-14",
  moonSign: "Sagittarius",
  events: []
}), "Last Quarter"), true);
assert.equal(isExactQuarterMoonDay(day({
  dateKey: "2026-09-04",
  moonSign: "Gemini",
  moonPhase: "Waning Crescent",
  events: [event({
    id: "last-quarter",
    type: "lunation",
    title: "Last Quarter Moon in Gemini",
    dateKey: "2026-09-04"
  })]
})), true);
assert.equal(isExactQuarterMoonDay(day({
  dateKey: "2026-09-05",
  moonSign: "Gemini",
  moonPhase: "Waning Crescent",
  events: []
})), false);
assert.equal(monthAgendaEvents(busy).some((item) => item.id === lunation.id), true);
assert.equal(monthAgendaEvents(busy).some((item) => item.type === "aspect"), false);
assert.equal(weekAgendaEvents(selected, previous).some((item) => item.type === "aspect"), true);
assert.equal(weekAgendaEvents(selected, previous).some((item) => item.planet === "Moon"), true);

console.log("calendar surface events: ok");
