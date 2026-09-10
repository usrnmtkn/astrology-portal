import bank from "./skyMoonSummaryBank.json" with { type: "json" };
export const moonEventNames = { regular: "Moon", newMoon: "New Moon", fullMoon: "Full Moon", solarEclipse: "Solar Eclipse", lunarEclipse: "Lunar Eclipse" };
export type MoonSummaryKind = keyof typeof moonEventNames;
export const moonSummaryKey = (sign: string, kind: MoonSummaryKind = "regular") => `cms/sky-daily-summary/moon/${sign.toLowerCase()}/${kind}`;
export const moonSummaryBody = (sign: string, kind: MoonSummaryKind = "regular") => (bank as Record<string, Record<MoonSummaryKind, string>>)[sign.toLowerCase()]?.[kind] ?? "";
export function selectedMoonKind(event?: { placementsPending?: boolean; isToday?: boolean; name: string; eclipseType?: "solar" | "lunar" }): MoonSummaryKind {
  return !event?.isToday || event.placementsPending ? "regular" : event.eclipseType === "solar" ? "solarEclipse" : event.eclipseType === "lunar" ? "lunarEclipse" : event.name === "New Moon" ? "newMoon" : event.name === "Full Moon" ? "fullMoon" : "regular";
}
