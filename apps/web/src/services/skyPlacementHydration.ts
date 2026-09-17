import { loadSkyPlacementFallbackArchitectureV3Bundle } from "../content/fallbackArchitectureV3Runtime";
import { loadFallbackArchitectureV3DashboardBundle, loadFallbackArchitectureV3SkyPlacementDashboardBundle } from "./generatedContent";
import { contentPublicationsResolved, refreshContentPublications } from "./contentPublications";
import { missingSkyPlacementPublications, skyPlacementPublicationIdentity } from "./skyPlacementPublicationGuard";

export { missingSkyPlacementPublications, skyPlacementPublicationIdentity };

/** Prepare first, commit in the caller only when all source planes are complete.
 * A fulfilled bundled import alone cannot prove that the owner has no override.
 * Uses existing source caches, never another independently selected prose cache.
 */
export async function prepareSkyPlacementSources() {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const prepare = async () => {
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
