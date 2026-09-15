import { skyForecastTemplates, type SkyForecastPeriod } from "./skyForecastTemplates";

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
