import {
  loadDeferredFallbackArchitectureV3Bundle, loadFallbackArchitectureV3BundledCoreManifest,
  type FallbackArchitectureV3Bundle
} from "../content/fallbackArchitectureV3Runtime";
import { contentPublicationRecords, publicationAllowsContent, publicationTimestamp } from "../content/contentPublicationState";
import { contentPublicationsAvailableOnline, contentPublicationsResolved, refreshContentPublications } from "./contentPublications";
import { packageFallbackArchitectureV3CoreRows } from "./fallbackArchitectureV3CorePackaging";
import { loadContentStudioLastKnownGoodRows } from "./generatedContent";
import { loadReaderRows } from "./readerContentClient";

// Source families, not candidate precedence: the shared renderer still selects
// exact/situation/family/return copy and the correct audience. Include its house,
// point, timing and template dependencies for every personal-transit surface.
export function isPersonalTransitSource(key: string) {
  return /^(?:authored\/(?:transit-|point-explainer\/)|fallback-hook\/(?:transit-|fog-note|natal-core)|fallback-template\/transit\.|fallback-vocab\/)/u.test(key);
}

export function personalTransitPublicationIdentity() {
  return JSON.stringify(contentPublicationRecords().filter(row => isPersonalTransitSource(row.content_key))
    .map(row => [row.content_key, row.state, row.revision, row.row_id,
      row.row_updated_at ? publicationTimestamp(row.row_updated_at) : null])
    .sort((a, b) => String(a[0]).localeCompare(String(b[0]))));
}

export function missingPersonalTransitPublications(bundle: FallbackArchitectureV3Bundle | null) {
  const rows = new Map([
    ...(bundle?.transitLib.authoredCards ?? []), ...(bundle?.rowsFile.hookRows ?? []),
    ...(bundle?.rowsFile.vocabularyRows ?? []), ...(bundle?.templatesFile.templates ?? [])
  ].map(row => [row.contentKey, row]));
  return contentPublicationRecords().filter(publication => {
    if (!isPersonalTransitSource(publication.content_key) || publication.state !== "live" || !publication.row_id) return false;
    const row = rows.get(publication.content_key);
    return !row || !publicationAllowsContent(publication.content_key,
      typeof row.publicationRowId === "string" ? row.publicationRowId : null,
      typeof row.publicationRowUpdatedAt === "string" ? row.publicationRowUpdatedAt : null);
  }).map(row => row.content_key);
}

type PreparedSources = { bundle: FallbackArchitectureV3Bundle | null; identity: string };
let prepared: PreparedSources | null = null;
let pending: Promise<PreparedSources> | null = null;

async function prepareSources(signal: AbortSignal): Promise<PreparedSources> {
  await Promise.all([loadDeferredFallbackArchitectureV3Bundle(), refreshContentPublications()]);
  if (contentPublicationsResolved() && prepared?.identity === personalTransitPublicationIdentity()) return prepared;
  const offlineRows = !contentPublicationsAvailableOnline() ? await loadContentStudioLastKnownGoodRows() : null;
  if (!contentPublicationsResolved()) throw new Error("Transit publication state is unavailable.");
  const manifest = await loadFallbackArchitectureV3BundledCoreManifest();
  for (let attempt = 0; attempt < 2; attempt++) {
    const identity = personalTransitPublicationIdentity();
    if (prepared?.identity === identity) return prepared;
    const keys = contentPublicationRecords().filter(row => isPersonalTransitSource(row.content_key)
      && row.state === "live" && row.row_id).map(row => row.content_key);
    // Use the public reader projection and its existing pagination/publication
    // checks. No private Studio records or new independent prose cache.
    const batches = Array.from({ length: Math.ceil(keys.length / 200) }, (_, i) => keys.slice(i * 200, (i + 1) * 200));
    const rows = offlineRows ?? (await Promise.all(batches.map(async keys => {
      const { data, error } = await loadReaderRows({ keys }, signal);
      if (error) throw new Error("The published transit readings could not load.");
      return data ?? [];
    }))).flat();
    signal.throwIfAborted();
    if (identity !== personalTransitPublicationIdentity()) continue;
    const bundle = packageFallbackArchitectureV3CoreRows(rows.filter(row => isPersonalTransitSource(row.content_key)), manifest);
    if (missingPersonalTransitPublications(bundle).length) throw new Error("Some published transit readings did not load.");
    prepared = { bundle, identity };
    return prepared;
  }
  throw new Error("Transit publications changed during loading. Please retry.");
}

/** A local import alone is not readiness once a live publication owns a key. */
export function preparePersonalTransitSources() {
  if (!pending) {
    let timer: ReturnType<typeof setTimeout>;
    const controller = new AbortController();
    pending = Promise.race([prepareSources(controller.signal), new Promise<never>((_, reject) => {
      timer = setTimeout(() => {
        controller.abort();
        reject(new Error("Transit readings timed out. Please retry."));
      }, 20_000);
    })]).finally(() => { clearTimeout(timer); controller.abort(); pending = null; });
  }
  return pending;
}
