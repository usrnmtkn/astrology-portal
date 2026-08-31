import bundledSkyPlacementRowsV3 from "./fallbackArchitectureV3/bundled-sky-placement-rows-v3.json";
import bundledSkyPlacementHouseRowsV3 from "./fallbackArchitectureV3/bundled-sky-placement-house-rows-v3.json";
import bundledSkyPlacementManifestV3 from "./fallbackArchitectureV3/bundled-sky-placement-manifest-v3.json";
import skyV4CanonicalCorpusUrl from "./fallbackArchitectureV3/authored-inputs/sky-v4-canonical-content-studio-stage-v1.json?url";
// @ts-ignore The governed resolver is shared ESM; its reader input is narrowed at this bundle boundary.
import { renderSkyV4ReaderRoute } from "./fallbackArchitectureV3/resolver/skyPlacementV4Canonical.mjs";
import type {
  FallbackArchitectureV3Bundle,
  FallbackArchitectureV3PackageManifest,
  HookRow
} from "./fallbackArchitectureV3Runtime";

export const skyPlacementFallbackArchitectureV3Bundle: FallbackArchitectureV3Bundle = {
  transitLib: { authoredCards: [] },
  templatesFile: { templates: [] },
  rowsFile: {
    hookRows: [
      ...bundledSkyPlacementRowsV3.hookRows,
      ...bundledSkyPlacementHouseRowsV3.hookRows
    ] as HookRow[],
    vocabularyRows: []
  },
  packageManifest: bundledSkyPlacementManifestV3 as FallbackArchitectureV3PackageManifest
};

export const skyPlacementFallbackArchitectureV3Manifest =
  bundledSkyPlacementManifestV3 as FallbackArchitectureV3PackageManifest;

export async function loadCanonicalSkyV4ReaderRoute() {
  const response = await fetch(skyV4CanonicalCorpusUrl);
  if (!response.ok) {
    throw new Error(`SKY_V4_SOURCE_GAP: canonical reader package returned ${response.status}.`);
  }
  const corpus = await response.json();
  return (input: Record<string, unknown>) => renderSkyV4ReaderRoute(corpus, input);
}
