import type { SkySnapshot, LocationInput } from '../../types';
import type { CmsGeneratedContentMap } from '../../../../apps/web/src/content/cmsSurfaceOverrides';
import { skyDailySummaryParts } from '../../../../apps/web/src/content/skyDailySummary';
import { skySunTransition } from '../../../../apps/web/src/content/skySunTransition';
import type { LunarCalendarEvent } from '../../../../apps/web/src/services/ephemeris';

export function calendarSkyForDay(sky: SkySnapshot | null | undefined, dateKey: string, location: LocationInput) {
  if (!sky || sky.location.latitude !== location.latitude || sky.location.longitude !== location.longitude
    || (sky.location.timeZone || 'UTC') !== (location.timeZone || 'UTC') || !Number.isFinite(Date.parse(sky.generatedAt))) return null;
  const actualDate = new Intl.DateTimeFormat('en-CA', {
    timeZone: location.timeZone || 'UTC', year: 'numeric', month: '2-digit', day: '2-digit'
  }).format(new Date(sky.generatedAt));
  return actualDate === dateKey ? sky : null;
}

export function calendarSunSummary(sky: SkySnapshot | null, content?: CmsGeneratedContentMap, events: LunarCalendarEvent[] = sky?.dailyEvents ?? []) {
  const sun = sky?.positions.find(position => position.planet === 'Sun');
  return sun ? skyDailySummaryParts({ sun, moonIsVoid: false,
    retrogradePlanets: sky?.positions.filter(p => p.motion === "retrograde").map(p => p.planet),
    sunTransition: skySunTransition(events, sky?.generatedAt, sky?.location.timeZone) }, content, { openingOnly: true }) : [];
}
