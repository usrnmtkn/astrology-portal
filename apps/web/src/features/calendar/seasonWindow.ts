import type { LunarCalendarEvent } from "../../services/ephemeris";

export type SeasonWindow = { sign: string; start: string; end: string; startsAt: string; endsAt: string };

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

// Only calculated ingresses may identify a season. Missing facts remain absent;
// a conventional date table is not an ephemeris or a time-zone conversion.
export function sunIngressSeasonSign(dateKey: string, events: LunarCalendarEvent[]): string | null {
  const { current } = currentAndNextIngress(dateKey, events);
  return current ? ingressSign(current) : null;
}

export function sunIngressSeasonWindow(dateKey: string, events: LunarCalendarEvent[]): SeasonWindow | null {
  const { current, next } = currentAndNextIngress(dateKey, events);
  if (!current || !next) return null;
  return {
    sign: ingressSign(current),
    start: current.dateKey,
    end: next.dateKey,
    startsAt: current.startsAt,
    endsAt: next.startsAt
  };
}
