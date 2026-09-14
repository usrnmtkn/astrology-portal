/** Collective Sky writing references, separate from rising-sign horoscopes. */
export const skyForecastTemplates = {
  "weekly-sky": {
    label: "Weekly Sky",
    title: "Weekly overview template",
    contentKey: "slot-template/calendar/weekly-overview/v1",
    headline: "Calendar · Weekly Overview",
    description: "Write the week’s opening overview, seven daily passages, and closing integration.",
    body: ["{{weekRange}}", "{{weeklyOverview}}", ...["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"].map(day => `{{${day}Date}}\n{{${day}Timing}}\n{{${day}Writeup}}`), "Weekly Integration\n{{weeklyIntegration}}"].join("\n\n")
  },
  "monthly-sky": {
    label: "Monthly Sky",
    title: "Monthly overview template",
    contentKey: "slot-template/calendar/monthly-overview/v1",
    headline: "Calendar · Monthly Overview",
    description: "Write the month’s overview, key dates, and closing integration.",
    body: "{{monthRange}}\n\n{{monthlyOverview}}\n\n{{keyDates}}\n\n{{monthlyIntegration}}"
  }
} as const;

export type SkyForecastPeriod = keyof typeof skyForecastTemplates;
