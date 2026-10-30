import { lunationHoroscopeIdentities } from "../../../../src/shared/lunationHoroscopeIdentities";
import { datedLunationContentKey, lunationReaderContentKeys } from "./lunationArticleIdentity";
import { resolveLunationReaderSource } from "./lunationReaderSource";
import { articleHoroscopeSection } from "./skyArticleHoroscopes.mjs";
import { resolveCmsSurfaceOverride, type CmsGeneratedContentMap } from "./cmsSurfaceOverrides";
import { publicationAllowsContent } from "./contentPublicationState";
import { fallbackArchitectureV3AuthoredContentForKey } from "../services/generatedContent";
import { loadSkyDetailContent } from "../services/skyDetailContent";
import { getAstrodienstSkyOffMainThread, getLunarCalendarRangeEventsOffMainThread } from "../services/skyCalculationClient";
import type { LocationInput, SkySnapshot } from "../types";

type Event = Parameters<typeof datedLunationContentKey>[0];

function identities(event: Event) {
  if (event.eclipseType) return [];
  const key = datedLunationContentKey(event);
  return key ? lunationHoroscopeIdentities(key.split("/")[3], event.sign ?? "") : [];
}

export function lunationArticleHoroscopeKeys(event: Event) {
  return identities(event).map(entry => entry.contentKey);
}

export function lunationArticleContentKeys(event: Event) {
  return [...lunationReaderContentKeys(event), ...lunationArticleHoroscopeKeys(event)];
}

export function lunationArticleSnapshotKeys(sky: Pick<SkySnapshot, "moonEvent">, event?: Event) {
  const moon = sky.moonEvent;
  const selected = event ?? (moon ? { startsAt: moon.occursAt, sign: moon.sign,
    title: moon.name, eclipseType: moon.eclipseType } : null);
  return selected ? lunationArticleContentKeys(selected) : [];
}

export function lunationAspectCandidates(aspects: SkySnapshot["aspects"]) {
  const orb = (aspect: SkySnapshot["aspects"][number]) => typeof aspect.separation === 'number' && typeof aspect.exactAngle === 'number'
    ? Math.abs(aspect.separation - aspect.exactAngle) : aspect.orb;
  return aspects.filter(aspect => [aspect.from, aspect.to].some(planet => planet === 'Moon' || planet === 'Sun'))
    .sort((first, second) => orb(first) - orb(second)
      || Number(second.from === 'Moon' || second.to === 'Moon') - Number(first.from === 'Moon' || first.to === 'Moon'));
}

/** Dated lunar calculations and source selection load only with the article. */
export async function loadDatedLunationArticle(location: LocationInput, datePart: string, sign: string,
  existing: Parameters<typeof loadSkyDetailContent>[1], load: Parameters<typeof loadSkyDetailContent>[3],
  matches: (value: string, routePart: string) => boolean) {
  const date = new Date(`${datePart}T00:00:00Z`);
  if (!Number.isFinite(+date)) return null;
  const events = await getLunarCalendarRangeEventsOffMainThread(location, date, new Date(+date + 86400000));
  const event = events.find(item => item.type === 'lunation' && item.primary
    && item.startsAt.slice(0, 10) === datePart && matches(item.sign ?? '', sign));
  if (!event) return null;
  const eventSky = await getAstrodienstSkyOffMainThread(location, new Date(event.startsAt),
    { includeTransitWindows: true, transitWindowPlanets: [] });
  const content = await loadSkyDetailContent(eventSky, existing, lunationArticleContentKeys(event), load);
  return { event, eventSky, content };
}

export function resolveLunationArticleHoroscopes(event: Event, content: CmsGeneratedContentMap) {
  const source = resolveLunationReaderSource(event, content);
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

export function lunationArticleHoroscopeCards(event: Event, content: CmsGeneratedContentMap) {
  return resolveLunationArticleHoroscopes(event, content).map(entry => ({ ...entry,
    risingSign: entry.risingSign.charAt(0).toUpperCase() + entry.risingSign.slice(1) }));
}
