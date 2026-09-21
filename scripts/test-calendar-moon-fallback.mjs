import assert from "node:assert/strict";
import { calendarMoonCycleFactsForDays } from "../apps/web/src/features/calendar/calendarMoonCycle.ts";
import { resolveCalendarMoonFallback } from "../apps/web/src/features/calendar/calendarMoonFallback.ts";
import {
  calendarFirstQuarterCopy,
  calendarWaxingCrescentAfterNewMoonCopy,
  calendarWaxingCrescentCopy
} from "../apps/web/src/features/calendar/calendarMoonPhaseCopy.ts";
import { calendarSeasonTransitionDailySkySentence, calendarSeasonTransitionFactsFromSun, calendarSeasonTransitionForPair, calendarSeasonTransitionForSurface, calendarSeasonTransitionVariantIndex, calendarSeasonTransitionWhen } from "../apps/web/src/features/calendar/calendarSeasonTransitions.ts";

const days = ["11", "12", "13", "14", "15", "16", "17"].map((day) => ({
  date: `2027-01-${day}T00:00:00.000Z`,
  dateKey: `2027-01-${day}`,
  inMonth: true,
  moonSign: "Scorpio",
  moonSignGlyph: "♏",
  moonPhase: "Waxing Crescent",
  illumination: 20,
  activeAspects: [],
  events: []
}));

const authored = { body: "Scorpio passage one.", contentKey: "authored/calendar-weekly-moon/scorpio" };
const factsByDate = calendarMoonCycleFactsForDays(days, [], "UTC");
const monday = factsByDate.get("2027-01-11");
const tuesday = factsByDate.get("2027-01-12");
const wednesday = factsByDate.get("2027-01-13");
assert.equal(monday?.moonVisitDayIndex, 1);
assert.equal(tuesday?.moonVisitDayIndex, 2);
assert.equal(wednesday?.moonVisitDayIndex, 3);

assert.equal(
  resolveCalendarMoonFallback(monday, { unusedAuthored: authored })?.kind,
  "authored"
);
assert.equal(
  resolveCalendarMoonFallback(tuesday, { unusedAuthored: authored, authoredUsedThisVisit: true })?.kind,
  "moonContinuation",
  "A leftover full write-up is not used after one was already surfaced this visit"
);
assert.match(
  resolveCalendarMoonFallback(monday, { authoredUsedThisVisit: true })?.body ?? "",
  /The Moon spends the day in Scorpio/
);
assert.doesNotMatch(
  resolveCalendarMoonFallback(monday, { authoredUsedThisVisit: true })?.body ?? "",
  /another day/
);
assert.equal(
  resolveCalendarMoonFallback({ ...wednesday, isLastFullDayInMoonSign: true, nextMoonSign: "Sagittarius" }, { unusedAuthored: authored })?.kind,
  "lastFullDayInMoonSign",
  "Last full day in the sign is newer than another sign write-up"
);
assert.equal(
  resolveCalendarMoonFallback({
    ...wednesday,
    moonChangesSignToday: true,
    nextMoonSign: "Sagittarius",
    nextMoonSignEntryTime: "12:41 PM EDT",
    moonSignExitHour: 12
  }, { unusedAuthored: authored })?.kind,
  "moonChangesLaterToday",
  "A sign-change day prefers the ingress template over an unused write-up"
);
assert.equal(
  resolveCalendarMoonFallback(wednesday, {})?.body,
  `The Moon remains in Scorpio today. If the same issue keeps returning, there may be something underneath it that has not been said plainly yet. ${calendarWaxingCrescentCopy}`
);

const eclipseDay = resolveCalendarMoonFallback({
  ...wednesday,
  daysSincePreviousEclipse: 1,
  previousEclipseType: "lunar eclipse"
}, {});
assert.match(eclipseDay?.body ?? "", /The Moon remains in Scorpio today\./);
assert.match(eclipseDay?.body ?? "", /The eclipse was yesterday\./);
assert.doesNotMatch(eclipseDay?.body ?? "", /lunar eclipse was yesterday/);

assert.equal(
  resolveCalendarMoonFallback({
    ...tuesday,
    daysSincePreviousLunation: 1,
    previousLunationType: "new-moon"
  }, { unusedAuthored: authored })?.kind,
  "authored",
  "The day after a New Moon article still takes the first unused Moon-sign write-up"
);
const waxingCrescentPhase = {
  body: calendarWaxingCrescentCopy,
  contentKey: "fallback-hook/moon-phase/waxing-crescent"
};
assert.match(
  resolveCalendarMoonFallback(tuesday, {
    unusedAuthored: authored,
    authoredUsedThisVisit: true,
    authoredPhaseCopy: waxingCrescentPhase
  })?.body ?? "",
  /Take one small step toward something you've been planning/,
  "A leftover day keeps the today template and incorporates the authored lunar phase"
);
assert.doesNotMatch(
  resolveCalendarMoonFallback(tuesday, {
    unusedAuthored: authored,
    authoredUsedThisVisit: true,
    authoredPhaseCopy: waxingCrescentPhase
  })?.body ?? "",
  /seed tests the soil|first visible action on what you planted/
);
assert.equal(
  resolveCalendarMoonFallback({ ...wednesday, exactFirstQuarter: true }, {
    unusedAuthored: authored,
    authoredPhaseCopy: { body: "First resistance arrives right on schedule. Adjust the plan, not the intention.", contentKey: "fallback-hook/moon-phase/first-quarter" }
  })?.body,
  calendarFirstQuarterCopy,
  "First Quarter leftover names the New Moon so intention has a referent"
);
assert.match(
  resolveCalendarMoonFallback({ ...wednesday, exactFirstQuarter: true })?.body ?? "",
  /about a week after the New Moon/
);
assert.doesNotMatch(
  resolveCalendarMoonFallback({ ...wednesday, exactFirstQuarter: true })?.body ?? "",
  /First resistance arrives/
);
assert.equal(
  resolveCalendarMoonFallback({ ...wednesday, exactFirstQuarter: true }, { unusedAuthored: authored })?.kind,
  "moonPhaseContinuation",
  "A quarter day prefers authored lunar-phase copy over an unused sign write-up"
);
assert.match(
  resolveCalendarMoonFallback({ ...wednesday, exactNewMoon: true }, { unusedAuthored: authored })?.body ?? "",
  /The cycle opens in Scorpio/,
  "An exact lunation day uses the authored phase when the lunation article is missing"
);
assert.equal(
  resolveCalendarMoonFallback({ ...wednesday, exactNewMoon: true }, {
    exactLunationCopy: { body: "New Moon article.", contentKey: "authored/sky-lunation-macro/new-moon/scorpio" }
  })?.kind,
  "exact-lunation"
);

const afterNewMoon = resolveCalendarMoonFallback({
  ...wednesday,
  daysSincePreviousLunation: 3,
  previousLunationType: "new-moon"
}, {});
assert.match(afterNewMoon?.body ?? "", /The Moon remains in Scorpio today\./);
assert.match(afterNewMoon?.body ?? "", /The New Moon was three days ago\./);
assert.equal(afterNewMoon?.contextKind, "afterNewMoon");

const lastMoonDay = resolveCalendarMoonFallback({
  ...wednesday,
  isLastFullDayInMoonSign: true,
  nextMoonSign: "Sagittarius",
  moonVisitDayIndex: 1,
  moonSignDayIndex: 1
}, {});
assert.match(lastMoonDay?.body ?? "", /The Moon spends the entire day in Scorpio before it enters Sagittarius tomorrow/);
assert.doesNotMatch(lastMoonDay?.body ?? "", /last full day/);
assert.match(lastMoonDay?.body ?? "", /If the same issue keeps returning/);
assert.match(lastMoonDay?.body ?? "", /Take one small step toward something you've been planning/);
assert.doesNotMatch(lastMoonDay?.body ?? "", /seed tests the soil|first visible action on what you planted/);
assert.match(
  resolveCalendarMoonFallback({
    ...wednesday,
    isLastFullDayInMoonSign: true,
    nextMoonSign: "Sagittarius",
    moonVisitDayIndex: 1,
    moonSignDayIndex: 1
  }, { authoredPhaseCopy: waxingCrescentPhase })?.body ?? "",
  /Take one small step toward something you've been planning/
);
assert.equal(
  resolveCalendarMoonFallback({
    ...wednesday,
    previousLunationType: "new-moon",
    daysSincePreviousLunation: 4
  }, {})?.body,
  `The Moon remains in Scorpio today. If the same issue keeps returning, there may be something underneath it that has not been said plainly yet. ${calendarWaxingCrescentAfterNewMoonCopy}`
);
assert.equal(
  resolveCalendarMoonFallback({
    ...wednesday,
    moonSign: "Sagittarius",
    isLastFullDayInMoonSign: true,
    nextMoonSign: "Capricorn",
    exactFirstQuarter: true
  }, { unusedAuthored: authored })?.body,
  "The Moon spends the entire day in Sagittarius before it enters Capricorn tomorrow. Notice which possibility still feels worth following. The First Quarter Moon arrives today, about a week after the New Moon, making this a useful time to revisit any intentions you set then. If following through is harder than you expected, adjust the approach before you abandon the intention."
);

const laterToday = resolveCalendarMoonFallback({
  ...wednesday,
  moonChangesSignToday: true,
  nextMoonSign: "Sagittarius",
  nextMoonSignEntryTime: "12:41 PM EDT",
  moonSignExitHour: 12
}, {});
assert.equal(
  laterToday?.body,
  "The Moon starts the day in Scorpio and enters Sagittarius at 12:41 PM EDT. Something that has been sitting under the surface may be harder to ignore early on. By afternoon, it can be easier to stop circling the same problem and decide what you want to do next."
);
assert.doesNotMatch(laterToday?.body ?? "", /mood may shift|from trust, privacy/);

const lateIngress = resolveCalendarMoonFallback({
  ...wednesday,
  moonChangesSignToday: true,
  nextMoonSign: "Sagittarius",
  nextMoonSignEntryTime: "9:10 PM EDT",
  moonSignExitHour: 21
}, {});
assert.match(lateIngress?.body ?? "", /You may notice the change more tomorrow than tonight/);
assert.doesNotMatch(lateIngress?.body ?? "", /After sitting with something long enough/);

assert.equal(calendarSeasonTransitionWhen(1, "September 22"), "in 1 day");
assert.equal(calendarSeasonTransitionWhen(2, "September 22"), "in 2 days");
assert.equal(calendarSeasonTransitionWhen(3, "September 22"), "in 3 days");
assert.equal(calendarSeasonTransitionWhen(4, "September 22"), "September 22");
assert.equal(
  calendarSeasonTransitionFactsFromSun({
    sunSign: "Virgo",
    transitEnd: "2026-09-22T16:00:00.000Z",
    asOf: "2026-09-19T11:00:00.000Z",
    timeZone: "America/New_York"
  })?.daysUntilSeasonEnd,
  3
);
const virgoToLibra = calendarSeasonTransitionForPair("Virgo", "Libra", "September 22");
assert.match(virgoToLibra, /Virgo season ends September 22, when the Sun enters Libra/);
assert.doesNotMatch(virgoToLibra, /\{\{date\}\}/);
assert.equal(calendarSeasonTransitionForPair("Virgo", "Libra", ""), "");
assert.match(
  calendarSeasonTransitionForPair("Virgo", "Libra", "in 3 days", null, 1),
  /Libra season begins in 3 days, when the Sun enters Libra/
);
assert.match(
  calendarSeasonTransitionForPair("Virgo", "Libra", "in 2 days", null, 2),
  /Libra season begins in 2 days, when the Sun enters Libra/
);
assert.match(
  calendarSeasonTransitionForPair("Virgo", "Libra", "in 1 day", null, 3),
  /After a month with the Sun in Virgo, the methods we've developed/
);
assert.match(
  calendarSeasonTransitionForPair("Virgo", "Libra", "in 2 days", null, 4),
  /recognizing what keeps daily life functioning/
);
assert.equal(calendarSeasonTransitionVariantIndex({ surface: "leftover", daysUntilSeasonEnd: 3, fromSign: "Virgo" }), 0);
assert.equal(calendarSeasonTransitionVariantIndex({ surface: "leftover", daysUntilSeasonEnd: 2, fromSign: "Virgo" }), 4);
assert.equal(calendarSeasonTransitionVariantIndex({ surface: "leftover", daysUntilSeasonEnd: 1, fromSign: "Virgo" }), 3);
assert.equal(calendarSeasonTransitionVariantIndex({ surface: "daily-sky", daysUntilSeasonEnd: 3 }), 1);
assert.equal(calendarSeasonTransitionVariantIndex({ surface: "daily-sky", daysUntilSeasonEnd: 2 }), 0);
assert.equal(calendarSeasonTransitionVariantIndex({ surface: "daily-sky", daysUntilSeasonEnd: 1 }), 2);
assert.match(
  calendarSeasonTransitionForSurface({
    fromSign: "Virgo",
    toSign: "Libra",
    date: "in 3 days",
    surface: "daily-sky",
    daysUntilSeasonEnd: 3
  }),
  /Libra season begins in 3 days, when the Sun enters Libra/
);
assert.equal(
  calendarSeasonTransitionDailySkySentence("Virgo", "Libra", 2, "September 22"),
  "Virgo season ends in 2 days, when the Sun enters Libra on September 22."
);
assert.equal(
  calendarSeasonTransitionDailySkySentence("Libra", "Scorpio", 2, "October 23"),
  "Libra season ends in 2 days, when the Sun enters Scorpio on October 23."
);
assert.equal(
  calendarSeasonTransitionDailySkySentence("Leo", "Virgo", 3, "September 22"),
  "Leo season ends in 3 days, when the Sun enters Virgo on September 22."
);
assert.doesNotMatch(
  calendarSeasonTransitionDailySkySentence("Virgo", "Libra", 2, "September 22"),
  /You can have an organized schedule|attention turns from the systems/
);

const lastSeasonWeekend = resolveCalendarMoonFallback({
  ...wednesday,
  seasonName: "Virgo",
  nextSunSign: "Libra",
  seasonEndDate: "September 22",
  daysUntilSeasonEnd: 3,
  isLastFullWeekendOfSeason: true
}, {});
assert.match(lastSeasonWeekend?.body ?? "", /Virgo season ends in 3 days, when the Sun enters Libra/);
assert.match(lastSeasonWeekend?.body ?? "", /how that work is divided between people/);
assert.doesNotMatch(lastSeasonWeekend?.body ?? "", /last full weekend of Virgo season/);
assert.equal(lastSeasonWeekend?.contextKind, "lastFullWeekendOfSeason");

const lastSeasonDay = resolveCalendarMoonFallback({
  ...wednesday,
  seasonName: "Virgo",
  nextSunSign: "Libra",
  seasonEndDate: "September 22",
  daysUntilSeasonEnd: 1
}, {});
assert.match(lastSeasonDay?.body ?? "", /Libra season begins in 1 day, when the Sun enters Libra/);
assert.match(lastSeasonDay?.body ?? "", /After a month with the Sun in Virgo, the methods we've developed/);
assert.doesNotMatch(lastSeasonDay?.body ?? "", /last full day of Virgo season/);

const twoDaysBeforeSeason = resolveCalendarMoonFallback({
  ...wednesday,
  seasonName: "Virgo",
  nextSunSign: "Libra",
  seasonEndDate: "September 22",
  daysUntilSeasonEnd: 2
}, {});
assert.match(twoDaysBeforeSeason?.body ?? "", /Libra season begins in 2 days, when the Sun enters Libra/);
assert.match(twoDaysBeforeSeason?.body ?? "", /recognizing what keeps daily life functioning/);
assert.doesNotMatch(twoDaysBeforeSeason?.body ?? "", /Virgo season ends/);

const laterSeasonWeekend = resolveCalendarMoonFallback({
  ...wednesday,
  seasonName: "Virgo",
  nextSunSign: "Libra",
  seasonEndDate: "September 22",
  daysUntilSeasonEnd: 6,
  isLastFullWeekendOfSeason: true
}, {});
assert.match(laterSeasonWeekend?.body ?? "", /Virgo season ends September 22, when the Sun enters Libra/);

const visitDays = ["14", "15", "16", "17"].map((day, index) => ({
  date: `2026-09-${day}T04:00:00.000Z`,
  dateKey: `2026-09-${day}`,
  inMonth: true,
  moonSign: index < 3 ? "Scorpio" : "Sagittarius",
  moonSignGlyph: index < 3 ? "♏" : "♐",
  moonPhase: "Waxing Crescent",
  illumination: 20,
  activeAspects: [],
  events: []
}));
const visitFacts = calendarMoonCycleFactsForDays(visitDays, [{
  id: "ingress-moon-2026-09-17",
  type: "ingress",
  title: "Moon enters Sagittarius",
  startsAt: "2026-09-17T16:41:00.000Z",
  dateKey: "2026-09-17",
  planet: "Moon",
  fromSign: "Scorpio",
  toSign: "Sagittarius",
  sign: "Sagittarius"
}], "America/New_York");
assert.equal(visitFacts.get("2026-09-15")?.isLastFullDayInMoonSign, false);
assert.equal(visitFacts.get("2026-09-16")?.isLastFullDayInMoonSign, true);
assert.equal(visitFacts.get("2026-09-16")?.moonChangesSignToday, false);
assert.equal(visitFacts.get("2026-09-17")?.moonChangesSignToday, true);
assert.equal(visitFacts.get("2026-09-17")?.moonSign, "Scorpio");
assert.equal(visitFacts.get("2026-09-17")?.nextMoonSign, "Sagittarius");

console.log("calendar moon fallback: moon sentence plus one context, pair transitions, no summary stacks");
