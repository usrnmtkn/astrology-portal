export const chaldeanOrder = ['Saturn', 'Jupiter', 'Mars', 'Sun', 'Venus', 'Mercury', 'Moon'] as const;
export type HourRuler = typeof chaldeanOrder[number];
export type CalendarPlanetaryHour = { ruler: HourRuler; start: string; end: string; period: 'day' | 'night'; planetaryDate: string };
export type CalendarPlanetaryDay = { locationLabel: string; hours: CalendarPlanetaryHour[] };
const weekdayRulers: HourRuler[] = ['Sun', 'Moon', 'Mars', 'Mercury', 'Jupiter', 'Venus', 'Saturn'];

/** Twelve unequal daylight hours, followed by twelve unequal night hours.
 * The weekday ruler begins at sunrise, not civil midnight. */
export function planetaryHourCycle(date: string, sunrise: string | null, sunset: string | null, nextSunrise: string | null): CalendarPlanetaryHour[] {
  if (!sunrise || !sunset || !nextSunrise) return [];
  const rise = Date.parse(sunrise), set = Date.parse(sunset), next = Date.parse(nextSunrise);
  if (!(rise < set && set < next)) return [];
  const ruler = weekdayRulers[new Date(`${date}T12:00:00Z`).getUTCDay()];
  const offset = chaldeanOrder.indexOf(ruler);
  return Array.from({ length: 24 }, (_, index) => {
    const night = index >= 12, start = night ? set : rise, end = night ? next : set, slot = index % 12;
    return { ruler: chaldeanOrder[(offset + index) % 7], start: new Date(Math.round(start + (end - start) * slot / 12)).toISOString(),
      end: new Date(Math.round(start + (end - start) * (slot + 1) / 12)).toISOString(), period: night ? 'night' : 'day', planetaryDate: date };
  });
}

/** Retain the previous planetary day's predawn hours and bound activity
 * windows to the selected civil date, including DST days. */
export function planetaryHoursInCivilDay(cycles: CalendarPlanetaryHour[], start: Date, end: Date) {
  return cycles.filter(hour => Date.parse(hour.start) < end.getTime() && Date.parse(hour.end) > start.getTime())
    .map(hour => ({ ...hour, start: new Date(Math.max(Date.parse(hour.start), start.getTime())).toISOString(),
      end: new Date(Math.min(Date.parse(hour.end), end.getTime())).toISOString() }))
    .sort((a, b) => a.start.localeCompare(b.start));
}
