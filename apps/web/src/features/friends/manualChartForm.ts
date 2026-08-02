import type { LocationInput } from "../../types";
import type { ManualChart, ManualChartType } from "../../services/manualCharts";
import {
  defaultPronounChoice,
  normalizePronounChoice,
  type PronounChoice
} from "../../services/personReferences";
import { normalizeRelationshipContextKey } from "../../services/relationshipContext";
import { displayTimeToTwentyFourHour } from "../../services/chartTime";

export type ManualChartForm = {
  chartType: ManualChartType;
  displayName: string;
  pronouns: PronounChoice;
  relationshipType: string;
  birthDate: string;
  birthTime: string;
  birthTimeUnknown: boolean;
  birthPlace: string;
  birthLocation: LocationInput | null;
};

export const defaultManualChartForm: ManualChartForm = {
  chartType: "person",
  displayName: "",
  pronouns: defaultPronounChoice,
  relationshipType: "friend",
  birthDate: "",
  birthTime: "12:00",
  birthTimeUnknown: false,
  birthPlace: "",
  birthLocation: null
};

export function manualChartFormFromChart(chart?: ManualChart | null): ManualChartForm {
  if (!chart) {
    return defaultManualChartForm;
  }

  return {
    chartType: chart.chartType ?? (chart.relationshipType === "event" ? "event" : "person"),
    displayName: chart.displayName,
    pronouns: normalizePronounChoice(chart.pronouns),
    relationshipType: normalizeRelationshipContextKey(chart.relationshipType),
    birthDate: chart.birthDate,
    birthTime: displayTimeToTwentyFourHour(chart.birthTime),
    birthTimeUnknown: chart.birthTimeUnknown,
    birthPlace: chart.birthPlace,
    birthLocation: chart.birthLocation
  };
}
