import type { LunarCalendarEvent } from '../services/ephemeris';
import type { SkySnapshot } from '../types';
import { datedLunationContentKey } from './lunationArticleIdentity.js';
import { resolveCmsSurfaceOverride, type CmsGeneratedContentMap } from './cmsSurfaceOverrides.js';
import { publicationAllowsContent } from './contentPublicationState.js';
import { skyLunationAspectKey, lunationAspectPublicationKeys } from './skyLunationAspectIdentity.js';
type Event = Parameters<typeof datedLunationContentKey>[0];
type Aspect = SkySnapshot['aspects'][number];

function resolvePublishedReading(key: string | null | undefined, content: CmsGeneratedContentMap) {
  const row = key ? content.get(key) : undefined;
  return key ? resolveCmsSurfaceOverride(row && !publicationAllowsContent(key, row.id, row.updatedAt, row.targetDate) ? new Map() : content, [key]) : null;
}

export function resolveSkyLunationAspectReading(event: Event, aspect: Aspect, positions: SkySnapshot['positions'], content: CmsGeneratedContentMap) {
  return resolvePublishedReading(skyLunationAspectKey(event, aspect, positions), content);
}

export function resolveCalendarLunationAspectReading(event: LunarCalendarEvent, content: CmsGeneratedContentMap) {
  for (const key of lunationAspectPublicationKeys(event.lunationAspectKey)) {
    const reading = resolvePublishedReading(key, content);
    if (reading) return reading;
  }
  return null;
}
