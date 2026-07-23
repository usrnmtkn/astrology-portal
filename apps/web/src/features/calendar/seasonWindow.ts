import type { LunarCalendarEvent } from "../../services/ephemeris";

export type SeasonWindow = { sign: string; start: string; end: string };

const seasonStartDates: Array<{ sign: string; month: number; day: number }> = [
  { sign: "Capricorn", month: 1, day: 1 },
  { sign: "Aquarius", month: 1, day: 20 },
  { sign: "Pisces", month: 2, day: 19 },
  { sign: "Aries", month: 3, day: 20 },
  { sign: "Taurus", month: 4, day: 20 },
  { sign: "Gemini", month: 5, day: 21 },
  { sign: "Cancer", month: 6, day: 21 },
  { sign: "Leo", month: 7, day: 22 },
  { sign: "Virgo", month: 8, day: 23 },
  { sign: "Libra", month: 9, day: 23 },
  { sign: "Scorpio", month: 10, day: 23 },
  { sign: "Sagittarius", month: 11, day: 22 },
  { sign: "Capricorn", month: 12, day: 21 }
];

function dateKeyFromParts(year: number, month: number, day: number) {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function staticSeasonWindow(dateKey: string): SeasonWindow {
  const [year = 0, month = 1, day = 1] = dateKey.split("-").map(Number);
  const monthDayValue = month * 100 + day;
  let seasonIndex = -1;

  for (let index = seasonStartDates.length - 1; index >= 0; index -= 1) {
    const season = seasonStartDates[index];

    if (season && monthDayValue >= season.month * 100 + season.day) {
      seasonIndex = index;
      break;
    }
  }

  if (seasonIndex < 0) seasonIndex = seasonStartDates.length - 1;

  const season = seasonStartDates[seasonIndex] ?? seasonStartDates[0];
  const nextSeason = seasonStartDates[(seasonIndex + 1) % seasonStartDates.length] ?? seasonStartDates[1];
  const startsPreviousYear = season.month === 12 && month === 1;
  const startYear = startsPreviousYear ? year - 1 : year;
  const endYear = nextSeason.month < season.month || (season.month === 12 && nextSeason.month === 1)
    ? startYear + 1
    : startYear;

  return {
    sign: season.sign,
    start: dateKeyFromParts(startYear, season.month, season.day),
    end: dateKeyFromParts(endYear, nextSeason.month, nextSeason.day)
  };
}

function sunIngressEvents(events: LunarCalendarEvent[]) {
  return events
    .filter((event) => event.type === "ingress"
      && event.planet === "Sun"
      && Boolean(event.toSign ?? event.sign))
    .sort((first, second) => new Date(first.startsAt).getTime() - new Date(second.startsAt).getTime());
}

function currentAndNextIngress(dateKey: string, events: LunarCalendarEvent[]) {
  const ingresses = sunIngressEvents(events);
  let current: LunarCalendarEvent | undefined;
  let next: LunarCalendarEvent | undefined;

  for (const event of ingresses) {
    if (event.dateKey <= dateKey) {
      current = event;
    } else {
      next = event;
      break;
    }
  }

  return { current, next };
}

function ingressSign(event: LunarCalendarEvent) {
  return (event.toSign ?? event.sign) as string;
}

// Season sign derived from the most recent Sun ingress on or before dateKey.
// Only needs the current ingress, so it resolves even at the edge of the fetched
// event window. Falls back to the static calendar boundary when no preceding
// Sun ingress is available in the supplied event window.
export function sunIngressSeasonSign(dateKey: string, events: LunarCalendarEvent[]): string {
  const { current } = currentAndNextIngress(dateKey, events);

  return current ? ingressSign(current) : staticSeasonWindow(dateKey).sign;
}

// Full season window (sign + local start/end dateKeys) derived from the Sun
// ingress that opens the season and the one that closes it. Returns null when
// either bounding ingress is missing from the supplied events, the shared
// static calendar boundary supplies the complete fallback range.
export function sunIngressSeasonWindow(dateKey: string, events: LunarCalendarEvent[]): SeasonWindow {
  const { current, next } = currentAndNextIngress(dateKey, events);

  if (!current || !next) return staticSeasonWindow(dateKey);

  return {
    sign: ingressSign(current),
    start: current.dateKey,
    end: next.dateKey
  };
}
