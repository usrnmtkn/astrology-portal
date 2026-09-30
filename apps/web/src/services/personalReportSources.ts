import { installFallbackArchitectureV3Bundle, installPersonalTransitFallbackArchitectureV3Bundle } from "../content/fallbackArchitectureV3Runtime";
import { preparePersonalTransitSources } from "./personalTransitSources";
import { contentPublicationGeneration } from "../content/contentPublicationState";
import { contentPublicationsResolved, refreshContentPublications } from "./contentPublications";
import { loadFallbackArchitectureV3DashboardBundle } from "./generatedContent";

/** Explicit report intent waits for the published source overlay. The page can
 * paint earlier, but that earlier render must not freeze a thin report brief. */
export async function preparePersonalReportSources<T>(readCurrentSources: () => T): Promise<T> {
  await refreshContentPublications(true);
  if (!contentPublicationsResolved()) throw new Error("The report's source material could not load. Please try again.");
  for (let attempt = 0; attempt < 2; attempt++) {
    const generation = contentPublicationGeneration;
    const [bundle, transits] = await Promise.all([loadFallbackArchitectureV3DashboardBundle(), preparePersonalTransitSources()]);
    if (generation !== contentPublicationGeneration) continue;
    installFallbackArchitectureV3Bundle(bundle);
    installPersonalTransitFallbackArchitectureV3Bundle(transits.bundle);
    return readCurrentSources();
  }
  throw new Error("The report's source material changed while loading. Please try again.");
}
