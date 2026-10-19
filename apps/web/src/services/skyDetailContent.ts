import {lunationReaderContentKeys} from '../content/lunationReaderSource';
import { contentPublication, publicationAllowsContent, publicationRestoresBaseline } from "../content/contentPublicationState";
import { SKY_PLACEMENT_ASPECT_TARGETS, transitAspectDefinitions } from "../astrologyConfig";
import { contentPublicationsAvailableOnline } from "./contentPublications";
import type { SkySnapshot } from "../types";
import type { LiveGeneratedContent } from "./generatedContent";
import { contentStudioExactSkyAspectKeys, skyAspectGeneratedContentKeys } from "./skyAspectContent";

/** Candidates are transport only: actual calculated events still choose copy.
 * An oversized candidate set disables preparation rather than truncating it. */
export function coldSkyPlacementAspectKeys(planet: string, existing: Map<string, LiveGeneratedContent>, beforeLedger = false) {
  const retained = eligibleSkyDetailContent(existing);
  const keys = [...new Set(SKY_PLACEMENT_ASPECT_TARGETS.flatMap(other => transitAspectDefinitions.flatMap(aspect =>
    contentStudioExactSkyAspectKeys(planet, aspect.type, other))))].filter(key => {
      const publication = contentPublication(key);
      return (beforeLedger || publication?.state === "live" && publication.row_id) && !retained.has(key);
    });
  return keys.length <= 50 ? keys : [];
}

export type ColdSkyAspectRead = { ingress: Promise<Map<string, LiveGeneratedContent>>; handoff: () => {
  completed: Map<string, LiveGeneratedContent>; rows: Promise<Map<string, LiveGeneratedContent>>; finish: () => void
} | undefined; discard: () => void };
export function prefetchSkyPlacementAspectContent(planet: string, existing: Map<string, LiveGeneratedContent>,
  publications: Promise<void>, snapshot: Promise<SkySnapshot>,
  load: (keys: string[], publications: Promise<void>) => { rows: Promise<Map<string, LiveGeneratedContent>>; discard: () => void; detach: () => void },
  loadIngress?: () => Promise<Map<string, LiveGeneratedContent>>) {
  let calculated = false, discarded = false, transferred = false;
  void snapshot.then(() => { calculated = true; }, () => { calculated = true; });
  let staged: ReturnType<typeof load> | undefined;
  let completedRows: Map<string, LiveGeneratedContent> | undefined;
  const read: ColdSkyAspectRead = {
    ingress: publications.then(() => !discarded && !calculated && contentPublicationsAvailableOnline() && loadIngress
      ? loadIngress() : new Map<string, LiveGeneratedContent>()).catch(() => new Map<string, LiveGeneratedContent>()),
    handoff: () => {
    if (transferred || discarded) return;
    transferred = true;
    const completed = new Map(completedRows);
    completedRows = undefined;
    // The article owns this private, bounded read until either contender wins.
    // Finishing withdraws admission without aborting another required read.
    return { completed, rows: staged?.rows ?? Promise.resolve(new Map()), finish: () => staged?.detach() };
  }, discard: () => { discarded = true; if (transferred) staged?.detach(); else staged?.discard(); } };
  // Give an already fulfilled calculation a chance to use its normal exact
  // request. Otherwise stage canonical candidates, never invented facts.
  void Promise.resolve().then(() => {
    if (discarded || transferred || calculated || typeof navigator !== "undefined" && navigator.onLine === false) return;
    const keys = coldSkyPlacementAspectKeys(planet, existing, !contentPublicationsAvailableOnline());
    if (keys.length) {
      staged = load(keys, publications);
      void staged.rows.then(rows => { if (!transferred && !discarded) completedRows = rows; }, () => {});
    }
  }).catch(() => { staged?.discard(); });
  return read;
}

function routePartMatches(value: string, routePart: string) {
  return value.trim().toLowerCase().replace(/\s+/g, "-") === routePart.trim().toLowerCase().replace(/\s+/g, "-");
}

/** Request writing for the same facts that the detail renders, including event-time signs. */
export function skySnapshotAspectContentKeys(snapshot: SkySnapshot) {
  return Array.from(new Set(snapshot.aspects.flatMap(aspect => {
    const firstSign = aspect.fromSign ?? snapshot.positions.find(position => position.planet === aspect.from)?.sign;
    const secondSign = aspect.toSign ?? snapshot.positions.find(position => position.planet === aspect.to)?.sign;
    if (!firstSign || !secondSign) return [];
    return skyAspectGeneratedContentKeys({
      first: aspect.from, second: aspect.to, aspect: aspect.type,
      firstSign, secondSign, targetDate: snapshot.generatedAt.slice(0, 10)
    });
  })));
}

/** Keys the opened aspect article must resolve. Other current-sky aspects stay optional related copy. */
export function skyDetailRequiredAspectKeys(snapshot: SkySnapshot, from?: string, aspect?: string, to?: string) {
  if (!from || !aspect || !to) return [];
  const matching = snapshot.aspects.filter(item => routePartMatches(item.type, aspect) && (
    routePartMatches(item.from, from) && routePartMatches(item.to, to)
    || routePartMatches(item.from, to) && routePartMatches(item.to, from)
  ));
  if (!matching.length) return [];
  return skySnapshotAspectContentKeys({ ...snapshot, aspects: matching });
}

export function eligibleSkyDetailContent(existing: Map<string, LiveGeneratedContent>) {
  return new Map([...existing].filter(([, row]) =>
    publicationAllowsContent(row.contentKey, row.id, row.updatedAt, row.targetDate)));
}

export async function loadSkyDetailContent(
  snapshot: SkySnapshot,
  existing: Map<string, LiveGeneratedContent>,
  extraKeys: string[],
  load: (keys: string[]) => Promise<Map<string, LiveGeneratedContent>>,
  relatedKeys?: string[]
) {
  const keys = Array.from(new Set([...(relatedKeys ?? [...skySnapshotAspectContentKeys(snapshot), ...(snapshot.moonEvent ? lunationReaderContentKeys({startsAt:snapshot.moonEvent.occursAt,sign:snapshot.moonEvent.sign,title:snapshot.moonEvent.name}) : [])]), ...extraKeys]));
  const retained = eligibleSkyDetailContent(existing);
  const missing = keys.filter(key => !retained.has(key));
  const complete = (content: Map<string, LiveGeneratedContent>) => {
    const unresolved = extraKeys.filter(key => {
      const publication = contentPublication(key);
      if (publication?.state !== "live" || publicationRestoresBaseline(publication)) return false;
      const row = content.get(key);
      return !row || !publicationAllowsContent(key, row.id, row.updatedAt, row.targetDate);
    });
    if (unresolved.length) throw new Error("The current article publication could not load.");
    return content;
  };
  if (!missing.length) return complete(retained.size === existing.size ? existing : retained);
  try {
    const incoming = await load(missing);
    return complete(new Map([...retained, ...incoming]));
  } catch (error) {
    // Local approved sources may have finished loading during this request.
    // Let the reader recompose them with only still-eligible cached rows.
    console.warn("Sky detail content refresh failed; retaining eligible cached content.", error);
    return complete(retained);
  }
}
