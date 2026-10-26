import type { LunarCalendarEvent } from '../../../../apps/web/src/services/ephemeris.js';
import { calendarLocalDateKey } from './calendarPhaseLabel.js';
import type { CalendarPlanetaryDay, HourRuler } from './calendarPlanetaryHours.js';

// These planets select complete Sky context, not favorable hours. Hour
// associations have their own narrower, source-backed task scopes below.
export const calendarActivities = [
  { id: 'love', label: 'Love', planets: ['Venus'] },
  { id: 'work', label: 'Work', planets: ['Mercury', 'Mars', 'Saturn', 'Jupiter'] },
  { id: 'creativity', label: 'Creativity', planets: ['Venus', 'Sun', 'Mercury'] },
  { id: 'rest', label: 'Rest', planets: ['Moon'] }
] as const;
export type CalendarActivity = typeof calendarActivities[number]['id'];
/** Task affinities, not a full election or an all-purpose good-hour verdict.
 * Evidence and exclusions: docs/qa/calendar-planetary-hours-source-audit.md.
 * Rest here means leisure; the reviewed texts do not establish Moon hours
 * as sleep/recovery windows. Keep that claim out of both the app and ICS. */
export const calendarActivityHourRules = [
  { activity: 'love', ruler: 'Venus', focus: 'Courtship', source: 'coley-venus' },
  { activity: 'work', ruler: 'Mercury', focus: 'Writing and trade', source: 'coley-mercury' },
  { activity: 'work', ruler: 'Jupiter', focus: 'Patrons and finance', source: 'coley-jupiter' },
  { activity: 'work', ruler: 'Saturn', focus: 'Property and land', source: 'coley-saturn' },
  { activity: 'creativity', ruler: 'Venus', focus: 'Art and music', source: 'venus-creative-affinity' },
  { activity: 'creativity', ruler: 'Mercury', focus: 'Writing', source: 'mercury-creative-affinity' },
  { activity: 'rest', ruler: 'Venus', focus: 'Leisure', source: 'coley-venus' }
] as const satisfies ReadonlyArray<{ activity: CalendarActivity; ruler: HourRuler; focus: string; source: string }>;
export type CalendarActivityReading = { activities: CalendarActivity[]; labels: string[];
  event: Pick<LunarCalendarEvent, 'id' | 'title'> & Partial<Pick<LunarCalendarEvent, 'startsAt' | 'endsAt'>>; body: string };

/** Select complete eligible readings, never a lucky-day score or rewritten
 * excerpt. Difficult and supportive contacts both belong in daily planning.
 * Shared sources appear once with all their activity labels. */
export function calendarActivityGuidance(date: string, events: LunarCalendarEvent[], bodyFor: (event: LunarCalendarEvent) => string,
  timeZone = 'UTC', lunarContext?: { id: string; title: string; body: string }) {
  const candidates = events.filter(event => event.dateKey === date && event.type !== 'void'
    && event.phase !== 'retrograde-passage');
  const voids = events.filter(event => event.type === 'void' && event.dateKey <= date
    && event.endsAt && calendarLocalDateKey(new Date(Date.parse(event.endsAt) - 1).toISOString(), timeZone) >= date);
  const readings = new Map<string, CalendarActivityReading>();
  const bodies = new Map<string, string>();
  const body = (event: LunarCalendarEvent) => {
    if (!bodies.has(event.id)) bodies.set(event.id, bodyFor(event));
    return bodies.get(event.id)!;
  };
  for (const activity of calendarActivities) {
    const matching = candidates.filter(event => (event.planets ?? [event.planet]).some(planet => activity.planets.some(name => name === planet)))
      .sort((a, b) => Number(b.type === 'aspect') - Number(a.type === 'aspect')
        || Number(b.primary) - Number(a.primary) || a.startsAt.localeCompare(b.startsAt));
    // Lunar context is shared when there is no eligible activity-specific
    // reading. It supplies context, never an unsupported favorable verdict.
    const pool = activity.id === 'rest' ? [...voids, ...matching] : matching;
    const first = pool.find(event => body(event).trim());
    const selected = activity.id === 'rest' && voids.some(event => body(event).trim())
      ? voids.filter(event => body(event).trim()) : first ? [first] : [];
    if (!selected.length) {
      if (lunarContext?.body) {
        const existing = readings.get(lunarContext.id);
        if (existing) { existing.activities.push(activity.id); existing.labels.push(activity.label); }
        else readings.set(lunarContext.id, { activities: [activity.id], labels: [activity.label], event: lunarContext, body: lunarContext.body });
      }
      continue;
    }
    for (const event of selected) {
      const existing = readings.get(event.id);
      if (existing) { existing.activities.push(activity.id); existing.labels.push(activity.label); }
      else readings.set(event.id, { activities: [activity.id], labels: [activity.label], event, body: body(event) });
    }
  }
  return [...readings.values()];
}

export function calendarActivityBody(readings: CalendarActivityReading[], timeZone = 'UTC', planetaryDay?: CalendarPlanetaryDay) {
  const formatter = new Intl.DateTimeFormat('en-US', { timeZone,
    month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', timeZoneName: 'short' });
  const time = (at: string) => formatter.format(new Date(at));
  const hours = calendarActivities.map(activity => {
    const windows = calendarActivityHourRules.filter(rule => rule.activity === activity.id).map(rule => {
      const matches = planetaryDay?.hours.filter(hour => hour.ruler === rule.ruler) ?? [];
      return `${rule.focus} · ${rule.ruler} hours${matches.length ? `: ${matches.map(hour => `${time(hour.start)} – ${time(hour.end)}`).join('; ')}` : ' · unavailable'}`;
    });
    return `**${activity.label}**\n\n${windows.join('\n\n')}`;
  }).join('\n\n');
  const context = readings.map(reading => {
    const timing = reading.event.startsAt ? ` · ${time(reading.event.startsAt)}${reading.event.endsAt ? ` – ${time(reading.event.endsAt)}` : ''}` : '';
    return `${reading.event.title}${timing}\n\n${reading.body}`;
  }).join('\n\n');
  return [`Planetary hours · ${planetaryDay?.locationLabel || 'Location unavailable'} · ${timeZone}`, hours,
    context && `**Sky context**\n\n${context}`].filter(Boolean).join('\n\n');
}
