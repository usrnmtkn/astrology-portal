import { skyDebilityFields } from "./skyDebilityCatalog";
import { skyDebilityInterpretationKey } from "./skyDebilityInterpretation";
import type { SkyDebilityDisplayPosition } from "./skyDebilityPresentation";
import { emptyHouseCmsKeys } from "./emptyHouseRulership.js";

export { resolveCmsSurfaceOverride } from "./cmsSurfaceOverrideRendering.js";
export type { CmsGeneratedContentMap, CmsSurfaceOverride } from "./cmsSurfaceOverrideRendering.js";

function keyPart(value: string | number | null | undefined) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    || "unknown";
}

export const cmsSurfaceKeys = {
  retrogradeSummary: () => ["cms/sky-retrograde-summary"],
  skyDebility: (positions: readonly SkyDebilityDisplayPosition[] = []) => {
    const key = skyDebilityInterpretationKey(positions);
    return [...(key ? [key] : []), ...skyDebilityFields.map(field => field.key)];
  },
  soulRoadmap: (sun: string, moon: string, path: string) => [
    `cms/soul-roadmap/${keyPart(sun)}/${keyPart(moon)}/${keyPart(path)}`,
    "cms/soul-roadmap/template"
  ],
  placementRow: (planet: string) => [
    `cms/chart-placement-row/${keyPart(planet)}`,
    "cms/chart-placement-row/template"
  ],
  emptyHouse: emptyHouseCmsKeys,
  transitHouse: (voice: "you" | "they", planet: string, house: number, sign: string, motion: string) => [
    `cms/personal-transit-house/${voice}/${keyPart(planet)}/${house}/${keyPart(sign)}/${keyPart(motion)}`,
    `cms/personal-transit-house/${voice}/${keyPart(planet)}/${house}`,
    `cms/personal-transit-house/${voice}/template`
  ],
  calendarDay: (kind: "moon" | "phase" | "continuation", subject?: string | null) => [
    ...(subject ? [`cms/calendar-day/${kind}/${keyPart(subject)}`] : []),
    `cms/calendar-day/${kind}`
  ],
  weeklySection: (kind: string, risingSign?: string | null) => [
    ...(risingSign ? [`cms/weekly-horoscope/${keyPart(kind)}/${keyPart(risingSign)}`] : []),
    `cms/weekly-horoscope/${keyPart(kind)}`
  ]
} as const;
