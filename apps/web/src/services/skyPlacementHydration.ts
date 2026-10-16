import { loadSkyPlacementFallbackArchitectureV3Bundle } from "../content/fallbackArchitectureV3Runtime";
import { loadContentStudioLastKnownGoodRows, loadFallbackArchitectureV3DashboardBundle, loadFallbackArchitectureV3SkyPlacementDashboardBundle, prefetchColdSkyArticleRows, prefetchColdSkyPlacementRows } from "./generatedContent";
import { contentPublicationsAvailableOnline, contentPublicationsResolved, refreshContentPublications } from "./contentPublications";
import { missingSkyPlacementPublications, skyPlacementPublicationIdentity } from "./skyPlacementPublicationGuard";

export { missingSkyPlacementPublications, skyPlacementPublicationIdentity };

/** Prepare first, commit in the caller only when all source planes are complete.
 * A fulfilled bundled import alone cannot prove that the owner has no override.
 * Uses existing source caches, never another independently selected prose cache.
 */
type SourcePreparation = {
  publications: Promise<void>;
  selected?: ReturnType<typeof prefetchColdSkyPlacementRows>;
  request?: ReturnType<typeof prepareSources>;
};
async function prepareSources(selection: string | undefined, entry: SourcePreparation) {
  let timer: ReturnType<typeof setTimeout> | undefined;
  let earlyRead: ReturnType<typeof prefetchColdSkyArticleRows>;
  const prepare = async () => {
    const bundled = loadSkyPlacementFallbackArchitectureV3Bundle(!selection || selection.startsWith('article:'));
    void bundled.catch(() => { /* Joined below, including its failure. */ });
    const publications = entry.publications;
    if (selection?.startsWith("article:")) earlyRead = prefetchColdSkyArticleRows(publications);
    await publications;
    // Live readers already resolve current rows below. The full offline snapshot
    // is a recovery source, not a prerequisite download for every Sky visit.
    if (!contentPublicationsAvailableOnline()) {
      earlyRead?.discard();
      earlyRead = undefined;
      entry.selected?.discard();
      entry.selected = undefined;
      await loadContentStudioLastKnownGoodRows();
    }
    if (!contentPublicationsResolved()) throw new Error("Sky publication state is unavailable.");
    for (let attempt = 0; attempt < 2; attempt++) {
      const identity = skyPlacementPublicationIdentity();
      const [coreBundle, placementBundle] = await Promise.all([
        loadFallbackArchitectureV3DashboardBundle(selection?.startsWith('article:') ? "sky-article" : selection ? "sky-list" : "sky", attempt === 0 ? earlyRead : undefined),
        loadFallbackArchitectureV3SkyPlacementDashboardBundle(selection, attempt === 0 ? entry.selected : undefined),
        bundled
      ]);
      // A failed live row request can install the offline ledger. Resolve both
      // planes against that identity before committing either to the reader.
      if (identity !== skyPlacementPublicationIdentity()) continue;
      const missing = missingSkyPlacementPublications([coreBundle, placementBundle]);
      if (missing.length) throw new Error(`Current Sky publications did not load: ${missing.join(", ")}`);
      return { coreBundle, placementBundle, identity };
    }
    throw new Error("Sky publications changed during loading.");
  };
  try {
    return await Promise.race([prepare(), new Promise<never>((_, reject) => {
      timer = setTimeout(() => reject(new Error("Sky placement content timed out. Please retry.")), 20_000);
    })]);
  } finally {
    clearTimeout(timer);
    earlyRead?.discard();
    entry.selected?.discard();
  }
}

const pending = new Map<string, SourcePreparation>();
/** Late guest confirmation attaches to the same source preparation. It cannot
 * restart the ledger, astronomy, or a claimed selected-row transport. */
export function prepareSkyPlacementSources(selection?: string) {
  const key = selection ?? "all";
  let entry = pending.get(key);
  if (!entry) {
    entry = { publications: refreshContentPublications() };
    pending.set(key, entry);
  }
  return entry.request ??= prepareSources(selection, entry).finally(() => pending.delete(key));
}

/** Auth confirmation may add transport only while the original source request
 * is pending. It must not restart a settled member or warm source load. */
export function prefetchColdSkyPlacementSources(selection?: string) {
  const entry = selection ? pending.get(selection) : undefined;
  if (entry && selection && !entry.selected) {
    entry.selected = prefetchColdSkyPlacementRows(selection, entry.publications);
  }
}
