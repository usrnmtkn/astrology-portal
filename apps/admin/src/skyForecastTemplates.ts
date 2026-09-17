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
    description: "Start from Monday's Moon sign and weekly Moon passage, then write the week's seasons, lunar cycle, planetary changes, daily passages, and closing.",
    body: calendarOverviewPattern("weekly-sky")
  },
  "monthly-sky": {
    title: "Monthly overview template",
    contentKey: "slot-template/calendar/monthly-overview/v1",
    headline: "Calendar · Monthly Overview",
    description: "Write the month’s seasonal opening, selected highlights, lunations, season transition, and closing.",
    body: calendarOverviewPattern("monthly-sky")
  }
} as const;

export type SkyForecastPeriod = "daily-sky" | "weekly-sky" | "monthly-sky";

/** Previous labeled monthly layout. Existing saved patterns keep it until replaced. */
export function calendarMonthlyCompatibilityPattern() {
  return [
    "{{monthRange}}",
    "Monthly Overview\n{{monthlyOverview}}",
    "Zodiac Seasons\n{{openingSeasonSign}}\n\n{{openingZodiacSeason}}\n\n{{openingZodiacSeasonPolarAxis}}",
    "{{#closingSeasonSign}}\n{{closingSeasonSign}} · {{seasonChangeDate}}\n\n{{closingZodiacSeason}}\n\n{{closingZodiacSeasonPolarAxis}}\n{{/closingSeasonSign}}",
    "{{seasonOverview}}",
    "Lunar Cycle\n{{lunationDates}}\n\n{{lunarOverview}}",
    "Planetary Changes\n{{planetaryChanges}}\n\n{{planetaryAspects}}\n\n{{transitOverview}}",
    "Closing\n{{monthlyIntegration}}"
  ].join("\n\n");
}

/** Default Monthly Sky starter. Saved templates are not rewritten. */
export function calendarMonthlyEditorialPattern() {
  return [
    "{{monthRange}}",
    "{{seasonOpening}}",
    "{{#hasPlanetaryHighlights}}\n{{planetaryHighlights}}\n{{/hasPlanetaryHighlights}}",
    "{{#hasNewMoon}}\n{{newMoonOverview}}\n{{/hasNewMoon}}",
    "{{#hasFullMoon}}\n{{fullMoonOverview}}\n{{/hasFullMoon}}",
    "{{#hasLunationConnection}}\n{{lunationConnection}}\n{{/hasLunationConnection}}",
    "{{#hasSeasonTransition}}\n{{seasonOverview}}\n{{/hasSeasonTransition}}",
    "{{monthlyIntegration}}"
  ].join("\n\n");
}

/** Explicit starter adoption is an editor action, never a saved-template migration. */
export function calendarOverviewPattern(period: SkyForecastPeriod) {
  if (period === "daily-sky") return "{{date}}\n\n{{sunSummary}}\n\n{{moonWriteup}}";
  if (period === "monthly-sky") return calendarMonthlyEditorialPattern();
  const sections = [
    "{{weekRange}}",
    "Weekly Overview\n{{weeklyOverview}}",
    "Zodiac Seasons\n{{openingSeasonSign}}\n\n{{openingZodiacSeason}}\n\n{{openingZodiacSeasonPolarAxis}}",
    "{{#closingSeasonSign}}\n{{closingSeasonSign}} · {{seasonChangeDate}}\n\n{{closingZodiacSeason}}\n\n{{closingZodiacSeasonPolarAxis}}\n{{/closingSeasonSign}}",
    "{{seasonOverview}}",
    "Lunar Cycle\n{{lunationDates}}\n\n{{lunarOverview}}",
    "Planetary Changes\n{{planetaryChanges}}\n\n{{planetaryAspects}}\n\n{{transitOverview}}"
  ];
  sections.push(...["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"].map(day => `{{${day}Date}}\n{{${day}Timing}}\n\n{{${day}Writeup}}`));
  sections.push("Closing\n{{weeklyIntegration}}");
  return sections.join("\n\n");
}
