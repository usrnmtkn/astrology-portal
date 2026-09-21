import { PLANET_GLYPHS, SIGN_GLYPHS, normalizeGlyphKey } from "../../components/charts/chartAssets";
import type { LunarCalendarDay, LunarCalendarEvent } from "../../services/ephemeris";
import type { PlanetPosition } from "../../types";
import { isHandoffKeyEvent } from "./calendarHandoff";

export const SLOW_TRANSIT_PLANETS = [
  "Jupiter",
  "Saturn",
  "Uranus",
  "Neptune",
  "Pluto",
  "Chiron",
  "Lilith"
] as const;

const WEEK_STRIP_DOT_LIMIT = 3;

export function isSpanningRetrogradeEvent(event: LunarCalendarEvent) {
  const title = event.title.toLowerCase();
  return event.type === "station" && title.includes("retrograde") && !title.includes("stations");
}

export function isExactCalendarDayEvent(event: LunarCalendarEvent, dateKey: string) {
  return event.dateKey === dateKey && !isSpanningRetrogradeEvent(event);
}

function eventRank(event: LunarCalendarEvent) {
  if (event.type === "ingress" && event.planet === "Sun") return 0;
  if (event.type === "lunation" || event.eclipseType) return 1;
  if (isHandoffKeyEvent(event, event.dateKey)) return 2;
  if (event.type === "station") return 3;
  if (event.type === "ingress" && event.planet !== "Moon") return 4;
  if (event.type === "ingress") return 5;
  if (event.type === "aspect") return 6;
  return 7;
}

export function moonIngressEvent(
  day: LunarCalendarDay,
  _previousDay?: LunarCalendarDay | null
): LunarCalendarEvent | null {
  // Noon sign samples cannot identify an ingress day: afternoon entries can
  // leave consecutive days with the same sampled sign. Use the computed event.
  return day.events.find((event) => event.type === "ingress"
    && event.planet === "Moon" && event.dateKey === day.dateKey) ?? null;
}

export function daySurfaceEvents(
  day: LunarCalendarDay,
  previousDay?: LunarCalendarDay | null
) {
  const moonIngress = moonIngressEvent(day, previousDay);
  const byId = new Map<string, LunarCalendarEvent>();

  for (const event of day.events) {
    if (isExactCalendarDayEvent(event, day.dateKey)) {
      byId.set(event.id, event);
    }
  }

  if (moonIngress) {
    byId.set(moonIngress.id, moonIngress);
  }

  return [...byId.values()].sort((left, right) => {
    const rankDifference = eventRank(left) - eventRank(right);
    if (rankDifference !== 0) return rankDifference;
    return new Date(left.startsAt).getTime() - new Date(right.startsAt).getTime();
  });
}

export function isMajorCalendarEvent(event: LunarCalendarEvent) {
  if (isSpanningRetrogradeEvent(event)) return false;
  if (event.type === "lunation") return true;
  if (event.type === "station") return true;
  if (event.type === "ingress" && event.planet !== "Moon") return true;
  return false;
}

export function majorRangeEvents(days: LunarCalendarDay[]) {
  const dates = new Set(days.map((day) => day.dateKey));
  const events = new Map<string, LunarCalendarEvent>();

  for (const day of days) {
    for (const event of day.events) {
      if (!isMajorCalendarEvent(event) || !dates.has(event.dateKey)) continue;
      const identity = [
        event.type,
        event.planet ?? "",
        event.planets?.join("-") ?? "",
        event.sign ?? "",
        event.toSign ?? "",
        event.direction ?? "",
        event.startsAt
      ].join("|");
      if (!events.has(identity)) events.set(identity, event);
    }
  }

  return [...events.values()].sort((left, right) => (
    new Date(left.startsAt).getTime() - new Date(right.startsAt).getTime()
  ));
}

export const MONTH_CELL_CHIP_LIMIT = 4;
export const MONTH_CELL_DOT_LIMIT = 0;

export function isSunIngressEvent(event: LunarCalendarEvent) {
  return event.type === "ingress" && event.planet === "Sun";
}

export function isMonthChipEvent(event: LunarCalendarEvent) {
  if (isSpanningRetrogradeEvent(event)) return false;
  if (isSunIngressEvent(event)) return false;
  if (event.type === "lunation" || event.eclipseType) return true;
  if (isHandoffKeyEvent(event, event.dateKey)) return true;
  if (event.type === "ingress" && event.planet !== "Moon") return true;
  if (event.type === "station") return true;
  if (event.type === "aspect") return true;
  return false;
}

export function isMoonAspectEvent(event: LunarCalendarEvent) {
  return event.type === "aspect" && Boolean(event.planets?.includes("Moon"));
}

export function isMonthAspectChipEvent(event: LunarCalendarEvent) {
  return event.type === "aspect" && !isHandoffKeyEvent(event, event.dateKey);
}

export function monthCellMarks(events: LunarCalendarEvent[]) {
  return {
    chips: events.filter(isMonthChipEvent),
    dots: [] as LunarCalendarEvent[]
  };
}

function monthChipRank(event: LunarCalendarEvent) {
  if (isHandoffKeyEvent(event, event.dateKey)) return 0;
  if (event.type === "lunation" || event.eclipseType) return 1;
  if (event.type === "station") return 2;
  if (event.type === "ingress") return 3;
  if (event.type === "aspect" && !isMoonAspectEvent(event)) return 4;
  if (event.type === "aspect") return 5;
  return 6;
}

function sortCalendarMarks(events: LunarCalendarEvent[]) {
  return [...events].sort((left, right) => {
    const rankDifference = monthChipRank(left) - monthChipRank(right);
    if (rankDifference !== 0) return rankDifference;
    return new Date(left.startsAt).getTime() - new Date(right.startsAt).getTime();
  });
}

export function monthCellDisplay(events: LunarCalendarEvent[]) {
  const marks = monthCellMarks(events);
  const chips = sortCalendarMarks(marks.chips).slice(0, MONTH_CELL_CHIP_LIMIT);
  const dots = sortCalendarMarks(marks.dots).slice(0, MONTH_CELL_DOT_LIMIT);
  return {
    chips,
    dots,
    overflow: Math.max(0, marks.chips.length + marks.dots.length - chips.length - dots.length)
  };
}

export function monthCellDisplayEvents(events: LunarCalendarEvent[]) {
  const display = monthCellDisplay(events);
  return [...display.chips, ...display.dots];
}

export function moonPhaseEmoji(phase: string) {
  const normalized = phase.toLowerCase();
  if (normalized.includes("new moon")) return "🌑";
  if (normalized.includes("waxing crescent")) return "🌒";
  if (normalized.includes("first quarter")) return "🌓";
  if (normalized.includes("waxing gibbous")) return "🌔";
  if (normalized.includes("full moon")) return "🌕";
  if (normalized.includes("waning gibbous")) return "🌖";
  if (normalized.includes("last quarter") || normalized.includes("third quarter")) return "🌗";
  if (normalized.includes("waning crescent")) return "🌘";
  return "🌑";
}

export function isEclipseDay(day: LunarCalendarDay) {
  return day.events.some((event) => Boolean(event.eclipseType) || /eclipse/i.test(event.title));
}

export function isLunarReturnDay(
  day: LunarCalendarDay,
  previousDay: LunarCalendarDay | null | undefined,
  natalMoonSign?: string | null
) {
  if (!natalMoonSign) return false;
  const ingress = moonIngressEvent(day, previousDay);
  return Boolean(ingress && (ingress.toSign ?? day.moonSign) === natalMoonSign);
}

export function calendarMarkTone(event: LunarCalendarEvent): "key" | "rx" | "season" | "ingress" | "aspect" {
  if (isHandoffKeyEvent(event, event.dateKey)) return "key";
  if (event.type === "station" || /rx\b/i.test(event.title)) return "rx";
  if (isSunIngressEvent(event)) return "season";
  if (event.type === "ingress") return "ingress";
  return "aspect";
}

export function daySeasonStart(day: LunarCalendarDay) {
  return day.events.find((event) => isSunIngressEvent(event) && event.dateKey === day.dateKey) ?? null;
}

export function isMonthAgendaEvent(event: LunarCalendarEvent) {
  return isMajorCalendarEvent(event) && !isSunIngressEvent(event) && !isSpanningRetrogradeEvent(event);
}

export function isQuarterMoonLabel(phase: string) {
  return /quarter/i.test(phase);
}

export function isExactQuarterMoonDay(day: LunarCalendarDay) {
  return day.events.some((event) => (
    event.type === "lunation"
    && /^(First|Last) Quarter/i.test(event.title)
    && (!event.dateKey || event.dateKey === day.dateKey)
  ));
}

export function isMonthAgendaDay(day: LunarCalendarDay, phaseLabel: string) {
  if (!day.inMonth) return false;
  if (daySeasonStart(day)) return true;
  if (isQuarterMoonLabel(phaseLabel)) return true;
  return day.events.some((event) => isMonthAgendaEvent(event) && event.dateKey === day.dateKey);
}

export function monthAgendaEvents(day: LunarCalendarDay) {
  return day.events
    .filter((event) => isMonthAgendaEvent(event) && event.dateKey === day.dateKey)
    .sort((left, right) => new Date(left.startsAt).getTime() - new Date(right.startsAt).getTime());
}

export function weekAgendaEvents(day: LunarCalendarDay, previousDay?: LunarCalendarDay | null) {
  return daySurfaceEvents(day, previousDay).filter((event) => !isSunIngressEvent(event));
}

export function weekStripDots(events: LunarCalendarEvent[]) {
  return sortCalendarMarks(events.filter((event) => (
    isMonthChipEvent(event) && event.type !== "lunation" && !event.eclipseType
  ))).slice(0, WEEK_STRIP_DOT_LIMIT);
}

export type SeasonLongTransitRow = {
  id: string;
  planet: string;
  sign: string;
  glyph: string;
  title: string;
  retrograde: boolean;
  endsAt?: string;
  event?: LunarCalendarEvent;
};

function planetGlyph(planet: string) {
  return PLANET_GLYPHS[normalizeGlyphKey(planet)] ?? "";
}

function signGlyph(sign: string) {
  return SIGN_GLYPHS[normalizeGlyphKey(sign)] ?? "";
}

function lastIngressBefore(
  planet: string,
  dateKey: string,
  rangeEvents: LunarCalendarEvent[]
) {
  return rangeEvents
    .filter((event) => (
      event.type === "ingress"
      && event.planet === planet
      && event.dateKey <= dateKey
    ))
    .sort((left, right) => left.startsAt.localeCompare(right.startsAt))
    .at(-1) ?? null;
}

function nextStationAfter(
  planet: string,
  dateKey: string,
  rangeEvents: LunarCalendarEvent[]
) {
  return rangeEvents
    .filter((event) => (
      event.type === "station"
      && event.planet === planet
      && !isSpanningRetrogradeEvent(event)
      && event.dateKey > dateKey
    ))
    .sort((left, right) => left.startsAt.localeCompare(right.startsAt))[0] ?? null;
}

export function seasonLongTransits({
  dateKey,
  dayEvents,
  rangeEvents,
  skyPositions
}: {
  dateKey: string;
  dayEvents: LunarCalendarEvent[];
  rangeEvents: LunarCalendarEvent[];
  skyPositions?: PlanetPosition[] | null;
}): SeasonLongTransitRow[] {
  const rows: SeasonLongTransitRow[] = [];

  for (const planet of SLOW_TRANSIT_PLANETS) {
    const sky = skyPositions?.find((position) => position.planet === planet);
    const retrograde = dayEvents.find((event) => (
      isSpanningRetrogradeEvent(event) && event.planet === planet
    ));
    const ingress = lastIngressBefore(planet, dateKey, rangeEvents);
    const sign = sky?.sign ?? retrograde?.sign ?? ingress?.toSign ?? ingress?.sign;
    if (!sign) continue;

    const nextStation = nextStationAfter(planet, dateKey, rangeEvents);
    const retrogradeMotion = sky ? sky.motion === "retrograde" : Boolean(retrograde);
    const rawEndsAt = retrogradeMotion
      ? sky?.retrogradeEnd ?? retrograde?.endsAt ?? nextStation?.startsAt
      : nextStation?.startsAt ?? sky?.transitEnd ?? undefined;
    const endsAt = rawEndsAt && rawEndsAt.slice(0, 10) >= dateKey ? rawEndsAt : nextStation?.startsAt;

    rows.push({
      id: `season-transit-${normalizeGlyphKey(planet)}-${dateKey}`,
      planet,
      sign,
      glyph: `${planetGlyph(planet)}${signGlyph(sign)}`,
      title: `${planet}${retrogradeMotion ? " Rx" : ""} in ${sign}`,
      retrograde: retrogradeMotion,
      endsAt: endsAt ?? undefined,
      event: nextStation ?? ingress ?? retrograde ?? undefined
    });
  }

  return rows;
}
