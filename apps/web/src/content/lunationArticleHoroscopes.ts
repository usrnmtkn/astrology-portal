import { lunationHoroscopeIdentities } from "../../../../src/shared/lunationHoroscopeIdentities";
import { datedLunationContentKey, lunationReaderContentKeys } from "./lunationArticleIdentity";
import { resolveLunationReaderSource } from "./lunationReaderSource";
import { articleHoroscopeSection } from "./skyArticleHoroscopes.mjs";
import {moonHoroscopeKey} from '../../../../src/shared/datedMoonIdentity.mjs';
import { resolveCmsSurfaceOverride, type CmsGeneratedContentMap } from "./cmsSurfaceOverrides";
import { publicationAllowsContent } from "./contentPublicationState";
import { fallbackArchitectureV3AuthoredContentForKey } from "../services/generatedContent";
import { loadSkyDetailContent, skySnapshotAspectContentKeys } from "../services/skyDetailContent";
import { skyLunationAspectKeys } from './skyLunationAspectIdentity';
export { resolveSkyLunationAspectReading, resolveCalendarLunationAspectReading } from './skyLunationAspectReading';
import { getAstrodienstSkyOffMainThread, getLunarCalendarRangeEventsOffMainThread, getLunarCalendarWeekOffMainThread } from "../services/skyCalculationClient";
import type { LunarCalendarEvent } from '../services/ephemeris';
import type { LocationInput, SkySnapshot } from "../types";
import { lunationAspectReaderKeys } from './lunationAspectReading';
export { resolveLunationAspectReading } from './lunationAspectReading';
export { lunationAspectCandidates } from './lunationAspectCandidates';

type Event = Parameters<typeof datedLunationContentKey>[0];

export async function datedLunationAspectEvent(location: LocationInput, at: string, first: string, aspect: string, second: string) {
  const matches = (value: string, route: string) => value.toLowerCase().replace(/\s+/gu, '-') === route.toLowerCase();
  const { events } = await getLunarCalendarWeekOffMainThread(location, new Date(at));
  return events.find((event: LunarCalendarEvent) => event.type === 'aspect' && event.planets && event.lunationAspectKey
    && Math.abs(Date.parse(event.startsAt) - Date.parse(at)) <= 2000 && matches(event.aspect ?? '', aspect)
    && (matches(event.planets[0], first) && matches(event.planets[1], second)
      || matches(event.planets[1], first) && matches(event.planets[0], second)));
}

function identities(event: Event) {
  if (event.eclipseType) return [];
  const key = datedLunationContentKey(event);
  return key ? lunationHoroscopeIdentities(key.split("/")[3], event.sign ?? "") : [];
}

export function lunationArticleHoroscopeKeys(event: Event) {
  return identities(event).map(entry => entry.contentKey);
}

export function lunationArticleContentKeys(event: Event) {
  return [...lunationReaderContentKeys(event), ...[moonHoroscopeKey(event)].filter(Boolean), ...lunationArticleHoroscopeKeys(event)];
}

export function lunationArticleSnapshotKeys(sky: Pick<SkySnapshot, "moonEvent"> & Partial<Pick<SkySnapshot, 'aspects' | 'positions' | 'generatedAt'>>, event?: Event) {
  const moon = sky.moonEvent;
  const selected = event ?? (moon ? { startsAt: moon.occursAt, sign: moon.sign,
    title: moon.name, eclipseType: moon.eclipseType } : null);
  return selected ? [...lunationArticleContentKeys(selected), ...(sky.aspects && sky.positions
    ? [...lunationAspectReaderKeys(selected, {aspects: sky.aspects, positions: sky.positions}),
      ...skyLunationAspectKeys(selected, { aspects: sky.aspects, positions: sky.positions }),
      ...skySnapshotAspectContentKeys({ ...sky, generatedAt: sky.generatedAt ?? selected.startsAt, aspects: sky.aspects.filter(aspect =>
        [aspect.from, aspect.to].some(point => point === 'Sun' || point === 'Moon')) } as SkySnapshot)] : [])] : [];
}

/** Dated lunar calculations and source selection load only with the article. */
export async function loadDatedLunationArticle(location: LocationInput, datePart: string, sign: string,
  existing: Parameters<typeof loadSkyDetailContent>[1], load: Parameters<typeof loadSkyDetailContent>[3],
  matches: (value: string, routePart: string) => boolean) {
  const date = new Date(`${datePart}T00:00:00Z`);
  if (!Number.isFinite(+date)) return null;
  const events = await getLunarCalendarRangeEventsOffMainThread(location, date, new Date(+date + 86400000));
  const event = events.find(item => item.type === 'lunation'
    && item.startsAt.slice(0, 10) === datePart && matches(item.sign ?? '', sign));
  if (!event) return null;
  const eventSky = await getAstrodienstSkyOffMainThread(location, new Date(event.startsAt),
    { includeTransitWindows: true, transitWindowPlanets: [] });
  const content = await loadSkyDetailContent(eventSky, existing, lunationArticleSnapshotKeys(eventSky, event), load, []);
  return { event, eventSky, content };
}

export function resolveLunationArticleHoroscopes(event: Event, content: CmsGeneratedContentMap, timeZone?: string) {
  const datedKey=moonHoroscopeKey(event);
  const dated=datedKey?resolveCmsSurfaceOverride(content,[datedKey]):null;
  if(dated){
    if(!dated.body)return [];
    const section=articleHoroscopeSection(content.get(datedKey)?.sections);
    return section?.passages.map(({risingSign,house,body})=>({risingSign,house,body,contentKey:datedKey}))??[];
  }
  const source = resolveLunationReaderSource(event, content, timeZone);
  const saved = source?.body ? content.get(source.contentKey) : null;
  const explicit = articleHoroscopeSection(saved?.sections);
  if (explicit?.passages.length) {
    return explicit.passages.map(({ risingSign, house, body }) => ({ risingSign, house, body, contentKey: saved!.contentKey }));
  }
  return identities(event).flatMap(identity => {
    const published = resolveCmsSurfaceOverride(content, [identity.contentKey]);
    const fallback = !published && publicationAllowsContent(identity.contentKey)
      ? fallbackArchitectureV3AuthoredContentForKey(identity.contentKey) : null;
    const body = published?.body ?? fallback?.body;
    return body ? [{ ...identity, body }] : [];
  });
}

export function lunationArticleHoroscopeCards(event: Event, content: CmsGeneratedContentMap, timeZone?: string) {
  return resolveLunationArticleHoroscopes(event, content, timeZone).map(entry => ({ ...entry,
    risingSign: entry.risingSign.charAt(0).toUpperCase() + entry.risingSign.slice(1) }));
}
