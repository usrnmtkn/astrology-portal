import bundledSkyPlacementRowsV3 from "./fallbackArchitectureV3/bundled-sky-placement-rows-v3.json";
import bundledSkyPlacementHouseRowsV3 from "./fallbackArchitectureV3/bundled-sky-placement-house-rows-v3.json";
import bundledSkyPlacementManifestV3 from "./fallbackArchitectureV3/bundled-sky-placement-manifest-v3.json";
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
