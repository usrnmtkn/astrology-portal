import bundledDeferredCoreRowsV3 from "./fallbackArchitectureV3/bundled-deferred-core-rows-v3.json";
import calendarRows from "./fallbackArchitectureV3/bundled-calendar-rows-v3.json";
import bundledSharedPlacementRowsV3 from "./fallbackArchitectureV3/bundled-shared-placement-rows-v3.json";
import bundledTransitCoreAuthoredCardsV3 from "./fallbackArchitectureV3/bundled-transit-core-authored-cards-v3.json";
import type {
  AuthoredCard,
  FallbackArchitectureV3Bundle,
  HookRow,
  RowsFile
} from "./fallbackArchitectureV3Runtime";

export const deferredFallbackArchitectureV3Bundle: FallbackArchitectureV3Bundle = {
  transitLib: {
    authoredCards: [...bundledTransitCoreAuthoredCardsV3.authoredCards, ...calendarRows.authoredCards] as AuthoredCard[]
  },
  templatesFile: {
    templates: []
  },
  rowsFile: {
    hookRows: [
      ...(bundledDeferredCoreRowsV3.hookRows as HookRow[]),
      ...(calendarRows.hookRows as HookRow[]),
      ...(bundledSharedPlacementRowsV3.hookRows as HookRow[])
    ],
    vocabularyRows: bundledDeferredCoreRowsV3.vocabularyRows,
    dailyGlanceVariants: bundledDeferredCoreRowsV3.dailyGlanceVariants as unknown as RowsFile["dailyGlanceVariants"]
  }
};
