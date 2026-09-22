import { loadSkyPlacementFallbackArchitectureV3Bundle } from "../content/fallbackArchitectureV3Runtime";
import { loadContentStudioLastKnownGoodRows, loadFallbackArchitectureV3DashboardBundle, loadFallbackArchitectureV3SkyPlacementDashboardBundle } from "./generatedContent";
import { contentPublicationsAvailableOnline, contentPublicationsResolved, refreshContentPublications } from "./contentPublications";
import { missingSkyPlacementPublications, skyPlacementPublicationIdentity } from "./skyPlacementPublicationGuard";

export { missingSkyPlacementPublications, skyPlacementPublicationIdentity };

/** Prepare first, commit in the caller only when all source planes are complete.
 * A fulfilled bundled import alone cannot prove that the owner has no override.
 * Uses existing source caches, never another independently selected prose cache.
 */
async function prepareSources(selection?: string) {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const prepare = async () => {
    const bundled = loadSkyPlacementFallbackArchitectureV3Bundle();
    void bundled.catch(() => { /* Joined below, including its failure. */ });
    await refreshContentPublications();
    // Live readers already resolve current rows below. The full offline snapshot
    // is a recovery source, not a prerequisite download for every Sky visit.
    if (!contentPublicationsAvailableOnline()) await loadContentStudioLastKnownGoodRows();
    if (!contentPublicationsResolved()) throw new Error("Sky publication state is unavailable.");
    for (let attempt = 0; attempt < 2; attempt++) {
      const identity = skyPlacementPublicationIdentity();
      const [coreBundle, placementBundle] = await Promise.all([
        loadFallbackArchitectureV3DashboardBundle(selection ? "sky-list" : "sky"),
        loadFallbackArchitectureV3SkyPlacementDashboardBundle(selection),
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
  }
}

const pending = new Map<string, ReturnType<typeof prepareSources>>();
/** The initial ledger install reruns subscribers; share its in-flight source
 * reads instead of downloading and packaging the same inventory twice. */
export function prepareSkyPlacementSources(selection?: string) {
  const key = selection ?? "all";
  let request = pending.get(key);
  if (!request) {
    request = prepareSources(selection).finally(() => pending.delete(key));
    pending.set(key, request);
  }
  return request;
}
