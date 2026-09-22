import type { LunarCalendarEvent } from '../services/ephemeris';

export type SunTransition = {
  id: string;
  fromSign: string;
  toSign: string;
  time: string;
  phase: 'before' | 'after';
};

/** A civil-day transition is distinct from the Sun's placement at this instant. */
export function skySunTransition(events: LunarCalendarEvent[], asOf?: string, timeZone = 'UTC'): SunTransition | undefined {
  const reference = Date.parse(asOf ?? '');
  if (!Number.isFinite(reference)) return;
  const day = new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' });
  const event = events.find(event => event.type === 'ingress' && event.planet === 'Sun'
    && event.fromSign && (event.toSign || event.sign) && Number.isFinite(Date.parse(event.startsAt))
    && day.format(new Date(event.startsAt)) === day.format(reference));
  if (!event) return;
  return {
    id: event.id, fromSign: event.fromSign!, toSign: (event.toSign || event.sign)!,
    time: new Intl.DateTimeFormat('en-US', { timeZone, hour: 'numeric', minute: '2-digit', timeZoneName: 'short' }).format(new Date(event.startsAt)),
    phase: reference < Date.parse(event.startsAt) ? 'before' : 'after'
  };
}
