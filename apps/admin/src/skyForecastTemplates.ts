/** Collective Sky writing references, separate from rising-sign horoscopes. */
export const skyForecastTemplates = {
  "daily-sky": {
    title: "Daily overview template",
    contentKey: "slot-template/calendar/daily-overview/v1",
    headline: "Calendar · Daily Overview",
    description: "Preview the Sun summary and a complete Moon-sign passage for the selected sky.",
    body: calendarOverviewPattern("daily-sky")
  },
  "weekly-sky": {
    title: "Weekly overview template",
    contentKey: "slot-template/calendar/weekly-overview/v1",
    headline: "Calendar · Weekly Overview",
    description: "Write the week’s main story, zodiac seasons, lunar cycle, planetary changes, daily passages, and closing.",
    body: calendarOverviewPattern("weekly-sky")
  },
  "monthly-sky": {
    title: "Monthly overview template",
    contentKey: "slot-template/calendar/monthly-overview/v1",
    headline: "Calendar · Monthly Overview",
    description: "Write the month’s main story, zodiac season transition, lunar cycle, planetary changes, and closing.",
    body: calendarOverviewPattern("monthly-sky")
  }
} as const;

export type SkyForecastPeriod = "daily-sky" | "weekly-sky" | "monthly-sky";

/** Explicit starter adoption is an editor action, never a saved-template migration. */
export function calendarOverviewPattern(period: SkyForecastPeriod) {
  if (period === "daily-sky") return "{{date}}\n\n{{sunSummary}}\n\n{{moonWriteup}}";
  const prefix = period === "weekly-sky" ? "weekly" : "monthly";
  const sections = [
    period === "weekly-sky" ? "{{weekRange}}" : "{{monthRange}}",
    `${prefix === "weekly" ? "Weekly" : "Monthly"} Overview\n{{${prefix}Overview}}`,
    "Zodiac Seasons\n{{openingSeasonSign}}\n\n{{openingZodiacSeason}}\n\n{{openingZodiacSeasonPolarAxis}}",
    "{{#closingSeasonSign}}\n{{closingSeasonSign}} · {{seasonChangeDate}}\n\n{{closingZodiacSeason}}\n\n{{closingZodiacSeasonPolarAxis}}\n{{/closingSeasonSign}}",
    "{{seasonOverview}}",
    "Lunar Cycle\n{{lunationDates}}\n\n{{lunarOverview}}",
    "Planetary Changes\n{{planetaryChanges}}\n\n{{planetaryAspects}}\n\n{{transitOverview}}"
  ];
  if (period === "weekly-sky") sections.push(...["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"].map(day => `{{${day}Date}}\n{{${day}Timing}}\n\n{{${day}Writeup}}`));
  sections.push(`Closing\n{{${prefix}Integration}}`);
  return sections.join("\n\n");
}
