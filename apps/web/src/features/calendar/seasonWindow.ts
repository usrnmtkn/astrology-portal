import type { LunarCalendarEvent } from "../../services/ephemeris";

export type SeasonWindow = { sign: string; start: string; end: string; startsAt: string; endsAt: string };

function sunIngressEvents(events: LunarCalendarEvent[]) {
  return events
    .filter((event) => event.type === "ingress"
      && event.planet === "Sun"
      && Boolean(event.toSign ?? event.sign))
    .sort((first, second) => new Date(first.startsAt).getTime() - new Date(second.startsAt).getTime());
}

function currentAndNextIngress(dateKey: string, events: LunarCalendarEvent[], asOf?: string) {
  const ingresses = sunIngressEvents(events);
  const instant = asOf === undefined ? null : Date.parse(asOf);
  let current: LunarCalendarEvent | undefined;
  let next: LunarCalendarEvent | undefined;

  for (const event of ingresses) {
    if (instant === null ? event.dateKey <= dateKey : Date.parse(event.startsAt) <= instant) {
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

// Only calculated ingresses may identify a season. Missing facts remain absent;
// a conventional date table is not an ephemeris or a time-zone conversion.
// Day-based editorial arcs may use the ingress date. Current-season labels must
// supply the same instant as their Sky snapshot, including on the ingress day.
export function sunIngressSeasonSign(dateKey: string, events: LunarCalendarEvent[], asOf?: string): string | null {
  const { current } = currentAndNextIngress(dateKey, events, asOf);
  return current ? ingressSign(current) : null;
}

export function sunIngressSeasonWindow(dateKey: string, events: LunarCalendarEvent[], asOf?: string): SeasonWindow | null {
  const { current, next } = currentAndNextIngress(dateKey, events, asOf);
  if (!current || !next) return null;
  return {
    sign: ingressSign(current),
    start: current.dateKey,
    end: next.dateKey,
    startsAt: current.startsAt,
    endsAt: next.startsAt
  };
}
