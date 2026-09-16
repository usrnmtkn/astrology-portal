import { skyForecastTemplates, type SkyForecastPeriod } from "./skyForecastTemplates";

export type CalendarPhraseGrammar = "noun phrase" | "verb phrase" | "clause";
export type CalendarPhraseSource = "edition" | "opening-season" | "closing-season" | "lead-event";
export type CalendarPhraseVariable = {
  name: string;
  label: string;
  grammar: CalendarPhraseGrammar;
  source: CalendarPhraseSource;
  help: string;
};

export function calendarOverviewPeriod(key: string): SkyForecastPeriod | undefined {
  return (Object.keys(skyForecastTemplates) as SkyForecastPeriod[]).find(period => skyForecastTemplates[period].contentKey === key);
}

export function calendarOverviewFields(period: SkyForecastPeriod) {
  if (period === "daily-sky") return [];
  const prefix = period === "weekly-sky" ? "weekly" : "monthly";
  const periodName = prefix === "weekly" ? "week" : "month";
  return [
    { name: `${prefix}Overview`, label: `${prefix === "weekly" ? "Weekly" : "Monthly"} overview`, help: `Describe the main story of the ${periodName} and how its events connect.` },
    { name: "seasonOverview", label: "Season transition", help: "Explain how the zodiac season shapes this period and what changes when the Sun enters the next sign." },
    { name: "lunarOverview", label: "Lunar cycle", help: "Connect the New Moon, Full Moon, or eclipse to the period’s main story." },
    { name: "transitOverview", label: "Planetary changes", help: "Describe the significance of the period’s ingresses, stations, and planetary aspects." },
    { name: `${prefix}Integration`, label: "Closing passage", help: `Bring the ${periodName}’s themes together without repeating the event list.` }
  ];
}

export const calendarSeasonVariables = ["zodiacSeason", "zodiacSeasonPolarAxis", "seasonSign", "seasonStart", "seasonEnd", "openingSeasonSign", "openingZodiacSeason", "openingZodiacSeasonPolarAxis", "closingSeasonSign", "closingZodiacSeason", "closingZodiacSeasonPolarAxis", "seasonChangeDate"];

const monthlyPhraseVariables: CalendarPhraseVariable[] = [
  { name: "primaryMonthlyThemeFocus", label: "Primary monthly theme", grammar: "noun phrase", source: "edition", help: "The first event-supported theme for this monthly edition. It stays separate from the zodiac-season focus." },
  { name: "primaryMonthlyThemeExperience", label: "Primary theme experience", grammar: "clause", source: "edition", help: "A recognizable experience of the primary monthly theme, written to fit inside a larger sentence." },
  { name: "secondaryMonthlyThemeFocus", label: "Secondary monthly theme", grammar: "noun phrase", source: "edition", help: "An optional concurrent theme when the month genuinely carries two distinct stories. Do not force a second theme." },
  { name: "secondaryMonthlyThemeExperience", label: "Secondary theme experience", grammar: "clause", source: "edition", help: "A recognizable experience of the optional secondary monthly theme." },
  { name: "openingSeasonFocus", label: "Opening season focus", grammar: "noun phrase", source: "opening-season", help: "The emphasis of the zodiac season active when the month begins." },
  { name: "openingSeasonOpportunity", label: "Opening season opportunity", grammar: "verb phrase", source: "opening-season", help: "A useful action or possibility that fits after wording such as helping us." },
  { name: "closingSeasonFocus", label: "Closing season focus", grammar: "noun phrase", source: "closing-season", help: "The emphasis added by the zodiac season the Sun enters during the month." },
  { name: "closingSeasonChallenge", label: "Closing season challenge", grammar: "noun phrase", source: "closing-season", help: "A relevant complication written to fit after The challenge is." },
  { name: "closingSeasonPractice", label: "Closing season practice", grammar: "verb phrase", source: "closing-season", help: "A useful response written in base verb form to fit after You can." },
  { name: "leadEventExperience", label: "Lead event experience", grammar: "clause", source: "lead-event", help: "A recognizable experience tied to the reviewed lead planetary event." },
  { name: "leadEventOpportunity", label: "Lead event opportunity", grammar: "verb phrase", source: "lead-event", help: "A useful response tied to the reviewed lead event, written to fit after a useful time to." }
];

export function calendarPhraseVariables(period: SkyForecastPeriod) {
  return period === "monthly-sky" ? monthlyPhraseVariables : [];
}

export const calendarPhraseSourceLabel: Record<CalendarPhraseSource, string> = {
  edition: "Monthly edition",
  "opening-season": "Opening Sun season",
  "closing-season": "Closing Sun season",
  "lead-event": "Reviewed lead planetary event"
};

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
