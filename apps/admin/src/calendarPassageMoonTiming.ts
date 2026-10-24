import type { CalendarPreviewCalculation } from './calendarPreviewCalculation';

/** Explain the existing start-of-day variable alongside the reader's noon sample. */
export function calendarPassageMoonTiming(calculation: CalendarPreviewCalculation | undefined, date: string, startingSign?: string) {
  const day = calculation?.days.find(day => day.dateKey === date);
  if (!day || !calculation || !startingSign) return null;
  const change = day.events.find(event => event.type === 'ingress' && event.planet === 'Moon');
  const next = change ?? [...calculation.events, ...(calculation.cycleEvents ?? [])]
    .filter(event => event.type === 'ingress' && event.planet === 'Moon' && event.startsAt > day.date)
    .sort((a, b) => a.startsAt.localeCompare(b.startsAt))[0];
  const changeText = next ? `${next.fromSign ?? startingSign} → ${next.toSign ?? next.sign} · ${new Intl.DateTimeFormat('en-US', {
    year: 'numeric', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', timeZoneName: 'short', timeZone: calculation.timeZone,
  }).format(new Date(next.startsAt))}` : undefined;
  return {
    startingSign, readerSign: day.moonSign,
    change: change ? changeText : 'No Moon sign change this local day.',
    nextChange: !change ? changeText : undefined,
    timeZone: calculation.timeZone,
  };
}
