import calendarRows from "./fallbackArchitectureV3/bundled-calendar-rows-v3.json";
import type { FallbackArchitectureV3Bundle } from "./fallbackArchitectureV3Runtime";

export const calendarFallbackArchitectureV3Bundle: FallbackArchitectureV3Bundle = {
  transitLib: { authoredCards: calendarRows.authoredCards },
  templatesFile: { templates: [] },
  rowsFile: { hookRows: calendarRows.hookRows, vocabularyRows: [] }
};
