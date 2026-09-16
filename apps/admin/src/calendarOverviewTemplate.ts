import { skyForecastTemplates, type SkyForecastPeriod } from "./skyForecastTemplates";

export type CalendarOverviewField = { name: string; label: string; help: string; starter?: string };

const monthlyOverviewStarter = `{{#hasMonthlyTheme}}
{{monthName}} brings attention to {{primaryMonthlyThemeFocus}}. You may notice {{primaryMonthlyThemeExperience}}.
{{/hasMonthlyTheme}}

{{#hasSecondaryMonthlyTheme}}
It also brings attention to {{secondaryMonthlyThemeFocus}}. You may notice {{secondaryMonthlyThemeExperience}}.
{{/hasSecondaryMonthlyTheme}}

{{#hasLeadEvent}}
On {{leadEventDate}}, {{leadEventClause}}. You may notice {{leadEventExperience}}, making this a useful time to {{leadEventOpportunity}}.
{{/hasLeadEvent}}`;

const monthlySeasonStarter = `The Sun in {{openingSeasonSign}} turns our attention to {{openingSeasonFocus}}, helping us {{openingSeasonOpportunity}}.

{{#closingSeasonSign}}
When the Sun enters {{closingSeasonSign}} on {{seasonChangeDate}}, attention turns toward {{closingSeasonFocus}}. The challenge is {{closingSeasonChallenge}}. You can {{closingSeasonPractice}}.
{{/closingSeasonSign}}`;

export function calendarOverviewPeriod(key: string): SkyForecastPeriod | undefined {
  return (Object.keys(skyForecastTemplates) as SkyForecastPeriod[]).find(period => skyForecastTemplates[period].contentKey === key);
}

export function calendarOverviewFields(period: SkyForecastPeriod): CalendarOverviewField[] {
  if (period === "daily-sky") return [];
  const prefix = period === "weekly-sky" ? "weekly" : "monthly";
  const periodName = prefix === "weekly" ? "week" : "month";
  if (period === "monthly-sky") return [
    { name: "monthlyOverview", label: "Monthly opening template", help: "Edit the reusable sentence structure for optional month-specific themes and the reviewed lead event. Phrase values are bound separately.", starter: monthlyOverviewStarter },
    { name: "seasonOverview", label: "Season transition template", help: "Edit the reusable sentence structure for the opening and incoming zodiac seasons. Seasonal phrase values are bound separately.", starter: monthlySeasonStarter },
    { name: "lunarOverview", label: "Lunar cycle", help: "Connect the New Moon, Full Moon, or eclipse to the period’s main story." },
    { name: "transitOverview", label: "Planetary changes", help: "Describe the significance of the period’s ingresses, stations, and planetary aspects." },
    { name: "monthlyIntegration", label: "Closing passage", help: "Bring the month’s themes together without repeating the event list." }
  ];
  return [
    { name: `${prefix}Overview`, label: "Weekly overview", help: `Describe the main story of the ${periodName} and how its events connect.` },
    { name: "seasonOverview", label: "Season transition", help: "Explain how the zodiac season shapes this period and what changes when the Sun enters the next sign." },
    { name: "lunarOverview", label: "Lunar cycle", help: "Connect the New Moon, Full Moon, or eclipse to the period’s main story." },
    { name: "transitOverview", label: "Planetary changes", help: "Describe the significance of the period’s ingresses, stations, and planetary aspects." },
    { name: `${prefix}Integration`, label: "Closing passage", help: `Bring the ${periodName}’s themes together without repeating the event list.` }
  ];
}

export const calendarSeasonVariables = ["zodiacSeason", "zodiacSeasonPolarAxis", "seasonSign", "seasonStart", "seasonEnd", "openingSeasonSign", "openingZodiacSeason", "openingZodiacSeasonPolarAxis", "closingSeasonSign", "closingZodiacSeason", "closingZodiacSeasonPolarAxis", "seasonChangeDate"];

/** Stable across periods, source loading and editors; uses the shared Studio palette. */
export function calendarVariableColor(name: string) {
  let hash = 0;
  for (const character of name) hash = (hash * 31 + character.charCodeAt(0)) | 0;
  return String((hash >>> 0) % 6 + 1);
}

export function calendarOverviewWriting(sections: unknown): Record<string, string> {
  const value = (sections as { calendarOverview?: unknown } | null)?.calendarOverview;
  return value && typeof value === "object" && !Array.isArray(value)
    ? Object.fromEntries(Object.entries(value).filter((entry): entry is [string, string] => typeof entry[1] === "string")) : {};
}

export { calendarOverviewPattern } from "./skyForecastTemplates";

export function calendarSeasonSourceKey(name: string, sun: string, opening: string, closing: string) {
  const sign = name.startsWith("opening") ? opening : name.startsWith("closing") ? closing : sun;
  const normalized = name.replace(/^(opening|closing)/u, "").toLowerCase();
  const family = normalized === "zodiacseason" ? "zodiac-season" : normalized === "zodiacseasonpolaraxis" ? "zodiac-season-polar-axis" : "";
  return sign && family ? `fallback-hook/${family}/${sign.toLowerCase()}` : undefined;
}
