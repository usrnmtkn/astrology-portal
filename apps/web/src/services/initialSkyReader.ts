import type { PlanetPosition, SkySnapshot } from "../types";
import type { GeneratedContentRow } from "./generatedContent";
import { skyNodeDisplayPositions } from "../features/sky/skyHelpers";
import { contentPublicationGeneration, contentPublicationRecords, publicationAllowsContent } from "../content/contentPublicationState";
import { isSkyListPublicationKey } from "../content/skyListPublicationScope";
import { canonicalPublicationLedger, publicationLedgerTag, publicationLedgerTagMatches } from "./publicationLedgerTransport";

export type InitialReaderPreviewContext = {
  displayPositions: PlanetPosition[]; aspects: SkySnapshot["aspects"]; generatedAt: string;
  locationLatitude?: number | null; moonEvent?: SkySnapshot["moonEvent"] | null;
};
type InitialReader = {
  schema: "tldr-initial-sky-reader/v1";
  previews: Array<{ planet: string; body: string }>;
  publications: ReturnType<typeof canonicalPublicationLedger>;
  publicationTag: string; sources: GeneratedContentRow[]; digest: string;
};
let stored: { value: InitialReader; key: string; context: string; receivedAt: number; ledger: string } | null = null;
let pending: Promise<unknown> | null = null;
let checkedGeneration = -1;
let currentLedgerMatches = false;
let contextMemo: InitialReaderPreviewContext | null = null;
let contextMemoKey = "";

export function initialSkyReaderKey(sky: SkySnapshot) {
  return JSON.stringify([sky.generatedAt, sky.location.latitude, sky.location.longitude, sky.location.timeZone || "UTC"]);
}
function contextKey(context: InitialReaderPreviewContext) {
  if (contextMemo?.displayPositions !== context.displayPositions || contextMemo?.aspects !== context.aspects
    || contextMemo?.generatedAt !== context.generatedAt || contextMemo?.locationLatitude !== context.locationLatitude
    || contextMemo?.moonEvent !== context.moonEvent) {
    contextMemo = context;
    contextMemoKey = JSON.stringify([context.displayPositions, context.aspects, context.generatedAt,
      context.locationLatitude ?? null, context.moonEvent ?? null]);
  }
  return contextMemoKey;
}
export function trackInitialSkyReaderRequest(request: Promise<unknown>) {
  pending = request;
  void request.catch(() => {}).finally(() => { if (pending === request) pending = null; });
}
export function pendingInitialSkyReaderRequest() { return pending; }

/** The response is produced by the same governed App renderer. Bind every
 * displayed character and projected source to the exact verified Sky response.
 * Invalid optimizations leave the normal source loader in charge.
 */
export async function acceptInitialSkyReader(sky: SkySnapshot, input: unknown) {
  if (!input || typeof input !== "object") return false;
  try {
    const value = input as InitialReader;
    const planets = new Set(skyNodeDisplayPositions(sky.positions).map(row => row.planet));
    if (value.schema !== "tldr-initial-sky-reader/v1" || !Array.isArray(value.previews)
      || value.previews.length !== 14 || new Set(value.previews.map(row => row.planet)).size !== 14
      || value.previews.some(row => !planets.has(row.planet) || typeof row.body !== "string" || !row.body.trim())
      || !Array.isArray(value.sources) || value.sources.some(row => !row || typeof row.content_key !== "string")
      || typeof value.digest !== "string") return false;
    const publications = canonicalPublicationLedger(value.publications);
    if (!publications.every(row => isSkyListPublicationKey(row.content_key))
      || !publicationLedgerTagMatches(value.publicationTag, await publicationLedgerTag(publications))) return false;
    const bytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(JSON.stringify([sky, value.previews, publications, value.sources])));
    const digest = Array.from(new Uint8Array(bytes), byte => byte.toString(16).padStart(2, "0")).join("");
    if (digest !== value.digest) return false;
    stored = { value: { ...value, publications }, key: initialSkyReaderKey(sky), receivedAt: performance.now(),
      ledger: JSON.stringify(publications), context: contextKey({ displayPositions: skyNodeDisplayPositions(sky.positions),
        aspects: sky.aspects, generatedAt: sky.generatedAt, locationLatitude: sky.location.latitude, moonEvent: sky.moonEvent }) };
    checkedGeneration = -1;
    return true;
  } catch { return false; }
}
/** Available only to the publication owner after digest/schema validation. */
export function initialSkyReaderPublications() { return stored?.value.publications; }
export function initialSkyReaderAvailable(key?: string) {
  if (!stored || key !== undefined && stored.key !== key) return false;
  if (checkedGeneration !== contentPublicationGeneration) {
    currentLedgerMatches = stored.ledger === JSON.stringify(canonicalPublicationLedger(contentPublicationRecords().filter(row => isSkyListPublicationKey(row.content_key))));
    checkedGeneration = contentPublicationGeneration;
  }
  return currentLedgerMatches;
}
export function initialSkyReaderPreview(planet: string, context: InitialReaderPreviewContext) {
  if (!initialSkyReaderAvailable() || stored!.context !== contextKey(context)) return null;
  return stored!.value.previews.find(row => row.planet === planet)?.body ?? null;
}

/** Reuse only complete projected sources covered by the current scoped proof.
 * Full inventories, selected partitions, revisions and article readiness never
 * come from this cache. A missing/newer live row follows the ordinary API path.
 */
export function initialSkyReaderRows(query: { keys?: string[]; surfaces?: string[]; vocabularyOnly?: boolean; provider?: string; ids?: string[]; prefix?: string; latestVersion?: boolean; horoscope?: unknown; targetDate?: string }) {
  if (!initialSkyReaderAvailable() || performance.now() - stored!.receivedAt > 5000
    || query.provider || query.ids || query.prefix || query.latestVersion || query.horoscope || query.targetDate) return undefined;
  let matches: (key: string) => boolean;
  if (query.keys?.length) {
    if (!query.keys.every(isSkyListPublicationKey)) return undefined;
    const keys = new Set(query.keys); matches = key => keys.has(key);
  } else if (query.vocabularyOnly && query.surfaces?.length === 1 && query.surfaces[0] === "modifier") {
    matches = key => /^(?:fallback-vocab\/|cc\/(?:planet|sign)\/)/u.test(key);
  } else return undefined;
  const rows = stored!.value.sources.filter(row => matches(row.content_key));
  const required = stored!.value.publications.filter(row => matches(row.content_key) && row.state === "live" && row.row_id);
  if (required.some(publication => !rows.some(row => row.content_key === publication.content_key && row.id === publication.row_id
    && publicationAllowsContent(row.content_key, row.id, row.updated_at, row.target_date)))) return undefined;
  return rows.filter(row => publicationAllowsContent(row.content_key, row.id, row.updated_at, row.target_date));
}
