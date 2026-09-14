import { contentPublicationRecords, publicationAllowsContent, publicationTimestamp } from "../content/contentPublicationState";
import type { FallbackArchitectureV3Bundle } from "../content/fallbackArchitectureV3Runtime";
import { contentPublicationsResolved, refreshContentPublications } from "./contentPublications";

const isSkySource = (key: string) => /^sky-(?:placement|context|lunation|nodes|lilith|v4)\//u.test(key)
  || /^fallback-hook\/sky-/u.test(key) || key.startsWith("house-horoscope-core/");

/** Astronomy ticks and unrelated editorial saves do not change prose identity. */
export function skyPlacementPublicationIdentity() {
  return JSON.stringify(contentPublicationRecords().filter(row => isSkySource(row.content_key))
    .map(row => [row.content_key, row.state, row.revision, row.row_id,
      row.row_updated_at ? publicationTimestamp(row.row_updated_at) : null])
    .sort((a, b) => String(a[0]).localeCompare(String(b[0]))));
}

export function missingSkyPlacementPublications(bundles: Array<FallbackArchitectureV3Bundle | null>) {
  const rows = new Map(bundles.flatMap(bundle => [
    ...(bundle?.transitLib.authoredCards ?? []), ...(bundle?.rowsFile.hookRows ?? []),
    ...(bundle?.rowsFile.vocabularyRows ?? []), ...(bundle?.templatesFile.templates ?? [])
  ]).map(row => [row.contentKey, row]));
  return contentPublicationRecords().filter(publication => {
    if (!isSkySource(publication.content_key) || publication.state !== "live" || !publication.row_id) return false;
    const row = rows.get(publication.content_key);
    return !row || !publicationAllowsContent(publication.content_key,
      row.publicationRowId as string | undefined, row.publicationRowUpdatedAt as string | undefined);
  }).map(row => row.content_key);
}

/** Prepare first, commit in the caller only when all source planes are complete.
 * A fulfilled bundled import alone cannot prove that the owner has no override.
 * Uses existing source caches, never another independently selected prose cache.
 */
export async function prepareSkyPlacementSources() {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const prepare = async () => {
    const [{ loadSkyPlacementFallbackArchitectureV3Bundle }, {
      loadFallbackArchitectureV3DashboardBundle, loadFallbackArchitectureV3SkyPlacementDashboardBundle
    }] = await Promise.all([import("../content/fallbackArchitectureV3Runtime"), import("./generatedContent")]);
    await refreshContentPublications();
    if (!contentPublicationsResolved()) throw new Error("Sky publication state is unavailable.");
    const identity = skyPlacementPublicationIdentity();
    const [, coreBundle, placementBundle] = await Promise.all([
      loadSkyPlacementFallbackArchitectureV3Bundle(),
      loadFallbackArchitectureV3DashboardBundle(),
      loadFallbackArchitectureV3SkyPlacementDashboardBundle()
    ]);
    if (identity !== skyPlacementPublicationIdentity()) throw new Error("Sky publications changed during loading.");
    const missing = missingSkyPlacementPublications([coreBundle, placementBundle]);
    if (missing.length) throw new Error(`Current Sky publications did not load: ${missing.join(", ")}`);
    return { coreBundle, placementBundle, identity };
  };
  try {
    return await Promise.race([prepare(), new Promise<never>((_, reject) => {
      timer = setTimeout(() => reject(new Error("Sky placement content timed out. Please retry.")), 20_000);
    })]);
  } finally {
    clearTimeout(timer);
  }
}
