import bundledEmptyHouseRowsV3 from "./fallbackArchitectureV3/bundled-empty-house-rows-v3.json";
import type {
  FallbackArchitectureV3Bundle,
  HookRow
} from "./fallbackArchitectureV3Runtime";

export const emptyHouseFallbackArchitectureV3Bundle: FallbackArchitectureV3Bundle = {
  transitLib: {
    authoredCards: []
  },
  templatesFile: {
    templates: []
  },
  rowsFile: {
    hookRows: bundledEmptyHouseRowsV3.hookRows as HookRow[],
    vocabularyRows: []
  }
};
