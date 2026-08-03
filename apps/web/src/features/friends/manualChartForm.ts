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

export const manualChartFormCopy: Record<ManualChartType, {
  title: string;
  editTitle: string;
  subtitle: string;
  editSubtitle: string;
  nameLabel: string;
  namePlaceholder: string;
  dateLabel: string;
  timeLabel: string;
  placeLabel: string;
  placePlaceholder: string;
  unknownTime: string;
  submit: string;
  savingSubmit: string;
  saveSubmit: string;
  requiredMessage: string;
  timeMessage: string;
}> = {
  person: {
    title: "Add chart",
    editTitle: "Edit chart",
    subtitle: "Enter birth details to save this chart.",
    editSubtitle: "Update birth details for this saved chart.",
    nameLabel: "Name",
    namePlaceholder: "Their name",
    dateLabel: "Birth date",
    timeLabel: "Birth time",
    placeLabel: "Birth place",
    placePlaceholder: "City, Country",
    unknownTime: "I don't know their birth time.",
    submit: "Add chart",
    savingSubmit: "Saving...",
    saveSubmit: "Save chart",
    requiredMessage: "Add a name, birth date, and birth place.",
    timeMessage: "Add a birth time, or mark it unknown."
  },
  event: {
    title: "Add event chart",
    editTitle: "Edit event chart",
    subtitle: "Enter the event details to save this chart.",
    editSubtitle: "Update event details for this saved chart.",
    nameLabel: "Event name",
    namePlaceholder: "Event name",
    dateLabel: "Event date",
    timeLabel: "Event time",
    placeLabel: "Event place",
    placePlaceholder: "City, Country",
    unknownTime: "I don't know the event time.",
    submit: "Add event chart",
    savingSubmit: "Saving...",
    saveSubmit: "Save event chart",
    requiredMessage: "Add an event name, event date, and event place.",
    timeMessage: "Add an event time, or mark it unknown."
  }
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
