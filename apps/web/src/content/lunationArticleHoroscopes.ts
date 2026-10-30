import { lunationHoroscopeIdentities } from "../../../../src/shared/lunationHoroscopeIdentities";
import { datedLunationContentKey, lunationReaderContentKeys } from "./lunationArticleIdentity";
import { resolveLunationReaderSource } from "./lunationReaderSource";
import { articleHoroscopeSection } from "./skyArticleHoroscopes.mjs";
import { resolveCmsSurfaceOverride, type CmsGeneratedContentMap } from "./cmsSurfaceOverrides";
import { publicationAllowsContent } from "./contentPublicationState";
import { fallbackArchitectureV3AuthoredContentForKey } from "../services/generatedContent";

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
