import bundledHouseRows from "./fallbackArchitectureV3/bundled-sky-placement-house-rows-v3.json";
import ownerPassages from "./fallbackArchitectureV3/authored-inputs/owner-authored-sky-placement-house-passages-v1.json";
// @ts-ignore Shared ESM guard preserves complete, exact owner-authored 12-house sets.
import { filterMixedDepthSkyPlacementHouseRows } from "./fallbackArchitectureV3/skyPlacementHouseSetGuard.mjs";
import type { FallbackArchitectureV3Bundle, HookRow } from "./fallbackArchitectureV3Runtime";

export const skyPlacementHouseBundle: FallbackArchitectureV3Bundle = {
  transitLib: { authoredCards: [] },
  templatesFile: { templates: [] },
  rowsFile: {
    hookRows: filterMixedDepthSkyPlacementHouseRows(bundledHouseRows.hookRows, ownerPassages.rows) as HookRow[],
    vocabularyRows: []
  }
};
