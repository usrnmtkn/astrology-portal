import type { LunarCalendarEvent } from '../services/ephemeris';
import type { SkySnapshot } from '../types';
import { datedLunationContentKey } from './lunationArticleIdentity.js';
import { resolveCmsSurfaceOverride, type CmsGeneratedContentMap } from './cmsSurfaceOverrideRendering.js';
import { publicationAllowsContent, type ContentPublication } from './contentPublicationState.js';
import { skyLunationAspectKey, lunationAspectPublicationKeys } from './skyLunationAspectIdentity.js';
type Event = Parameters<typeof datedLunationContentKey>[0];
type Aspect = SkySnapshot['aspects'][number];

function resolvePublishedReading(key: string | null | undefined, content: CmsGeneratedContentMap, publications?: ReadonlyMap<string, ContentPublication>) {
  const row = key ? content.get(key) : undefined;
  return key ? resolveCmsSurfaceOverride(row && !publicationAllowsContent(key, row.id, row.updatedAt, row.targetDate, publications) ? new Map() : content, [key], {}, publications?.get.bind(publications)) : null;
}

export function resolveSkyLunationAspectReading(event: Event, aspect: Aspect, positions: SkySnapshot['positions'], content: CmsGeneratedContentMap) {
  return resolvePublishedReading(skyLunationAspectKey(event, aspect, positions), content);
}

export function resolveCalendarLunationAspectReading(event: LunarCalendarEvent, content: CmsGeneratedContentMap, publications?: ReadonlyMap<string, ContentPublication>) {
  for (const key of lunationAspectPublicationKeys(event.lunationAspectKey)) {
    const reading = resolvePublishedReading(key, content, publications);
    if (reading) return reading;
  }
  return null;
}
