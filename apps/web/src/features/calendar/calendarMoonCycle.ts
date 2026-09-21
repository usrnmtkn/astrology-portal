import type { LunarCalendarDay, LunarCalendarEvent } from "../../services/ephemeris";

export type CalendarLunationKind = "new-moon" | "full-moon";
export type CalendarEclipseKind = "solar eclipse" | "lunar eclipse";
export type CalendarQuarterKind = "first-quarter" | "last-quarter";

export type CalendarMoonCycleFacts = {
  dateKey: string;
  date: string;
  dayOfWeek: string;
  moonSign: string;
  moonPhase: string;
  moonVisitId: string;
  moonSignDayIndex: number;
  moonVisitDayIndex: number;
  moonSignEntryDate: string;
  moonSignEntryTime: string;
  moonSignExitDate: string;
  moonSignExitTime: string;
  nextMoonSign: string;
  nextMoonSignEntryDate: string;
  nextMoonSignEntryTime: string;
  moonSignExitHour: number | null;
  moonChangesSignToday: boolean;
  isFirstFullDayInMoonSign: boolean;
  isLastFullDayInMoonSign: boolean;
  isLastFullWeekendOfSeason: boolean;
  exactNewMoon: boolean;
  exactFullMoon: boolean;
  exactSolarEclipse: boolean;
  exactLunarEclipse: boolean;
  exactFirstQuarter: boolean;
  exactLastQuarter: boolean;
  previousLunationType: CalendarLunationKind | "";
  previousLunationSign: string;
  previousLunationDate: string;
  daysSincePreviousLunation: number | null;
  nextLunationType: CalendarLunationKind | "";
  nextLunationSign: string;
  nextLunationDate: string;
  daysUntilNextLunation: number | null;
  previousEclipseType: CalendarEclipseKind | "";
  previousEclipseSign: string;
  previousEclipseDate: string;
  daysSincePreviousEclipse: number | null;
  nextEclipseType: CalendarEclipseKind | "";
  nextEclipseSign: string;
  nextEclipseDate: string;
  daysUntilNextEclipse: number | null;
  sunSign: string;
  seasonName: string;
  seasonEndDate: string;
  nextSunSign: string;
  nextSeasonName: string;
  daysUntilSeasonEnd: number | null;
  isFirstFullDayOfSeason: boolean;
};

export function calendarDateKeyDistance(fromKey: string, toKey: string) {
  const from = Date.parse(`${fromKey}T00:00:00.000Z`);
  const to = Date.parse(`${toKey}T00:00:00.000Z`);
  if (!Number.isFinite(from) || !Number.isFinite(to)) return null;
  return Math.round((to - from) / 86_400_000);
}

function isPrincipalLunation(event: LunarCalendarEvent) {
  if (event.type !== "lunation") return false;
  if (event.eclipseType) return true;
  return event.primary !== false && (/new moon/i.test(event.title) || /full moon/i.test(event.title));
}

function lunationKind(event: LunarCalendarEvent): CalendarLunationKind | "" {
  if (event.eclipseType === "solar" || /new moon/i.test(event.title)) return "new-moon";
  if (event.eclipseType === "lunar" || /full moon/i.test(event.title)) return "full-moon";
  return "";
}

function eclipseKind(event: LunarCalendarEvent): CalendarEclipseKind | "" {
  if (event.eclipseType === "solar") return "solar eclipse";
  if (event.eclipseType === "lunar") return "lunar eclipse";
  return "";
}

function quarterKind(event: LunarCalendarEvent): CalendarQuarterKind | "" {
  if (/first quarter/i.test(event.title)) return "first-quarter";
  if (/last quarter|third quarter/i.test(event.title)) return "last-quarter";
  return "";
}

function uniqueEvents(events: LunarCalendarEvent[]) {
  const byId = new Map<string, LunarCalendarEvent>();
  for (const event of events) byId.set(event.id, event);
  return [...byId.values()].sort((a, b) => a.startsAt.localeCompare(b.startsAt));
}

function formatDate(value: string, timeZone: string) {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "";
  return new Intl.DateTimeFormat("en-US", { month: "long", day: "numeric", timeZone }).format(date);
}

function formatTime(value: string, timeZone: string) {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "";
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
    timeZone
  }).format(date);
}

function weekdayName(value: string, timeZone: string) {
  return new Intl.DateTimeFormat("en-US", { weekday: "long", timeZone }).format(new Date(value));
}

function localHour(value: string, timeZone: string) {
  try {
    const hour = new Intl.DateTimeFormat("en-US", {
      hour: "numeric",
      hourCycle: "h23",
      timeZone
    }).formatToParts(new Date(value)).find((part) => part.type === "hour")?.value;
    return hour == null ? null : Number(hour);
  } catch {
    return null;
  }
}

export function calendarMoonCycleFactsForDays(
  days: LunarCalendarDay[],
  events: LunarCalendarEvent[],
  timeZone: string
): Map<string, CalendarMoonCycleFacts> {
  const allEvents = uniqueEvents([
    ...events,
    ...days.flatMap((day) => day.events)
  ]);
  const lunations = allEvents.filter(isPrincipalLunation);
  const eclipses = lunations.filter((event) => event.eclipseType);
  const quarters = allEvents.filter((event) => event.type === "lunation" && quarterKind(event));
  const moonIngresses = allEvents.filter((event) => event.type === "ingress" && event.planet === "Moon");
  const sunIngresses = allEvents.filter((event) => event.type === "ingress" && event.planet === "Sun")
    .sort((a, b) => a.startsAt.localeCompare(b.startsAt));
  const facts = new Map<string, CalendarMoonCycleFacts>();

  for (let index = 0; index < days.length; index += 1) {
    const day = days[index];
    // Ingress timestamps, not differences between noon samples, define the
    // day's transition. This also works at either end of the visible range.
    const todayIngress = moonIngresses.find((event) => event.dateKey === day.dateKey);
    const signChangesToday = Boolean(todayIngress);
    const departingSign = todayIngress?.fromSign ?? day.moonSign;
    const entry = [...moonIngresses].reverse().find((event) => (
      (event.toSign ?? event.sign) === departingSign
      && event.startsAt <= day.date
    ));
    const exit = todayIngress ?? moonIngresses.find((event) => (
      event.fromSign === departingSign && event.startsAt > day.date
    ));
    const arrivingSign = exit?.toSign ?? exit?.sign ?? "";
    const signChangesTomorrow = Boolean(exit && calendarDateKeyDistance(day.dateKey, exit.dateKey) === 1);
    let inferredIndex = 1;
    let visitStartKey = day.dateKey;
    if (entry?.dateKey) {
      inferredIndex = Math.max(1, (calendarDateKeyDistance(entry.dateKey, day.dateKey) ?? 0) + 1);
      visitStartKey = entry.dateKey;
    } else {
      for (let previous = index - 1; previous >= 0 && days[previous].moonSign === departingSign; previous -= 1) {
        inferredIndex += 1;
        visitStartKey = days[previous].dateKey;
      }
    }
    const todayLunations = lunations.filter((event) => event.dateKey === day.dateKey);
    const todayQuarters = quarters.filter((event) => event.dateKey === day.dateKey);
    const previousLunation = [...lunations].reverse().find((event) => event.dateKey < day.dateKey);
    const nextLunation = lunations.find((event) => event.dateKey > day.dateKey);
    const previousEclipse = [...eclipses].reverse().find((event) => event.dateKey < day.dateKey);
    const nextEclipse = eclipses.find((event) => event.dateKey > day.dateKey);
    const nextSunIngress = sunIngresses.find((event) => event.startsAt > day.date);
    const previousSunIngress = [...sunIngresses].reverse().find((event) => event.startsAt <= `${day.dateKey}T23:59:59.999Z`);
    const sunSign = previousSunIngress?.toSign ?? previousSunIngress?.sign ?? "";
    const nextSunSign = nextSunIngress?.toSign ?? nextSunIngress?.sign ?? "";
    const daysUntilSeasonEnd = nextSunIngress?.dateKey
      ? calendarDateKeyDistance(day.dateKey, nextSunIngress.dateKey)
      : null;
    const daysSinceSeasonStart = previousSunIngress?.dateKey
      ? calendarDateKeyDistance(previousSunIngress.dateKey, day.dateKey)
      : null;
    const dayOfWeek = weekdayName(day.date, timeZone);
    const isLastFullWeekendOfSeason = Boolean(
      daysUntilSeasonEnd != null
      && (
        (dayOfWeek === "Saturday" && daysUntilSeasonEnd >= 2 && daysUntilSeasonEnd <= 8)
        || (dayOfWeek === "Sunday" && daysUntilSeasonEnd >= 1 && daysUntilSeasonEnd <= 7)
      )
    );

    facts.set(day.dateKey, {
      dateKey: day.dateKey,
      date: day.date,
      dayOfWeek,
      moonSign: departingSign,
      moonPhase: day.moonPhase,
      moonVisitId: `moon-${departingSign.toLowerCase()}-${visitStartKey}${entry ? "" : "-open"}`,
      moonSignDayIndex: inferredIndex,
      moonVisitDayIndex: inferredIndex,
      moonSignEntryDate: entry ? formatDate(entry.startsAt, timeZone) : "",
      moonSignEntryTime: entry ? formatTime(entry.startsAt, timeZone) : "",
      moonSignExitDate: exit ? formatDate(exit.startsAt, timeZone) : "",
      moonSignExitTime: exit ? formatTime(exit.startsAt, timeZone) : "",
      nextMoonSign: arrivingSign || exit?.toSign || exit?.sign || "",
      nextMoonSignEntryDate: exit ? formatDate(exit.startsAt, timeZone) : "",
      nextMoonSignEntryTime: exit ? formatTime(exit.startsAt, timeZone) : "",
      moonSignExitHour: exit ? localHour(exit.startsAt, timeZone) : null,
      moonChangesSignToday: signChangesToday,
      isFirstFullDayInMoonSign: Boolean(!signChangesToday && entry && calendarDateKeyDistance(entry.dateKey, day.dateKey) === 1),
      isLastFullDayInMoonSign: signChangesTomorrow && !signChangesToday,
      isLastFullWeekendOfSeason,
      exactNewMoon: todayLunations.some((event) => lunationKind(event) === "new-moon" && !event.eclipseType),
      exactFullMoon: todayLunations.some((event) => lunationKind(event) === "full-moon" && !event.eclipseType),
      exactSolarEclipse: todayLunations.some((event) => event.eclipseType === "solar"),
      exactLunarEclipse: todayLunations.some((event) => event.eclipseType === "lunar"),
      exactFirstQuarter: todayQuarters.some((event) => quarterKind(event) === "first-quarter"),
      exactLastQuarter: todayQuarters.some((event) => quarterKind(event) === "last-quarter"),
      previousLunationType: previousLunation ? lunationKind(previousLunation) : "",
      previousLunationSign: previousLunation?.sign ?? "",
      previousLunationDate: previousLunation ? formatDate(previousLunation.startsAt, timeZone) : "",
      daysSincePreviousLunation: previousLunation?.dateKey
        ? calendarDateKeyDistance(previousLunation.dateKey, day.dateKey)
        : null,
      nextLunationType: nextLunation ? lunationKind(nextLunation) : "",
      nextLunationSign: nextLunation?.sign ?? "",
      nextLunationDate: nextLunation ? formatDate(nextLunation.startsAt, timeZone) : "",
      daysUntilNextLunation: nextLunation?.dateKey
        ? calendarDateKeyDistance(day.dateKey, nextLunation.dateKey)
        : null,
      previousEclipseType: previousEclipse ? eclipseKind(previousEclipse) : "",
      previousEclipseSign: previousEclipse?.sign ?? "",
      previousEclipseDate: previousEclipse ? formatDate(previousEclipse.startsAt, timeZone) : "",
      daysSincePreviousEclipse: previousEclipse?.dateKey
        ? calendarDateKeyDistance(previousEclipse.dateKey, day.dateKey)
        : null,
      nextEclipseType: nextEclipse ? eclipseKind(nextEclipse) : "",
      nextEclipseSign: nextEclipse?.sign ?? "",
      nextEclipseDate: nextEclipse ? formatDate(nextEclipse.startsAt, timeZone) : "",
      daysUntilNextEclipse: nextEclipse?.dateKey
        ? calendarDateKeyDistance(day.dateKey, nextEclipse.dateKey)
        : null,
      sunSign,
      seasonName: sunSign,
      seasonEndDate: nextSunIngress ? formatDate(nextSunIngress.startsAt, timeZone) : "",
      nextSunSign,
      nextSeasonName: nextSunSign,
      daysUntilSeasonEnd,
      isFirstFullDayOfSeason: daysSinceSeasonStart === 1
    });
  }

  return facts;
}
