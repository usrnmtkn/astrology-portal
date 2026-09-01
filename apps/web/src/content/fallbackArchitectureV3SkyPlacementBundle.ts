import bundledSkyPlacementRowsV3 from "./fallbackArchitectureV3/bundled-sky-placement-rows-v3.json";
import bundledSkyPlacementHouseRowsV3 from "./fallbackArchitectureV3/bundled-sky-placement-house-rows-v3.json";
import bundledSkyPlacementManifestV3 from "./fallbackArchitectureV3/bundled-sky-placement-manifest-v3.json";
import skyV4CanonicalCorpusUrl from "./fallbackArchitectureV3/authored-inputs/sky-v4-canonical-content-studio-stage-v1.json?url";
// @ts-ignore The governed resolver is shared ESM; its reader input is narrowed at this bundle boundary.
import { renderSkyV4ReaderRoute } from "./fallbackArchitectureV3/resolver/skyPlacementV4Canonical.mjs";
import { applySkyV4ContinuousCorpusFix } from "../features/sky/skyV4ContinuousCorpusFix";
import { applySkyV4PlacementLunarContext } from "../features/sky/skyV4PlacementLunarContext";
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
  // Vite resolves `?url` to an on-demand asset URL in the reader build. The
  // Node/esbuild parity harness resolves the same import to the parsed JSON
  // module. Support both representations so verification exercises the same
  // deferred boundary without teaching production to accept a thin fallback.
  const importedCorpus = skyV4CanonicalCorpusUrl as unknown;
  let corpus: unknown;
  if (typeof importedCorpus === "string") {
    const response = await fetch(importedCorpus);
    if (!response.ok) {
      throw new Error(`SKY_V4_SOURCE_GAP: canonical reader package returned ${response.status}.`);
    }
    corpus = await response.json();
  } else {
    corpus = (importedCorpus as { default?: unknown })?.default ?? importedCorpus;
  }

  const servingCorpus = applySkyV4ContinuousCorpusFix(corpus);
  return (input: Record<string, unknown>) => applySkyV4PlacementLunarContext(
    renderSkyV4ReaderRoute(servingCorpus, input),
    input,
    servingCorpus
  );
}
