import {
  generatedContentParagraphs,
  renderGeneratedContentTemplate,
  type LiveGeneratedContent
} from "../services/generatedContent";
import type { TemplateSlotValues } from "../services/templateInterpolation";

export type CmsGeneratedContentMap = ReadonlyMap<string, LiveGeneratedContent>;

function keyPart(value: string | number | null | undefined) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    || "unknown";
}

export const cmsSurfaceKeys = {
  soulRoadmap: (sun: string, moon: string, path: string) => [
    `cms/soul-roadmap/${keyPart(sun)}/${keyPart(moon)}/${keyPart(path)}`,
    "cms/soul-roadmap/template"
  ],
  placementRow: (planet: string) => [
    `cms/chart-placement-row/${keyPart(planet)}`,
    "cms/chart-placement-row/template"
  ],
  emptyHouse: (kind: "card" | "detail", voice: "you" | "they", house: number, sign: string) => [
    `cms/natal-empty-house/${kind}/${voice}/${house}/${keyPart(sign)}`,
    `cms/natal-empty-house/${kind}/${voice}/${house}`,
    `cms/natal-empty-house/${kind}/${voice}/template`
  ],
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

export type CmsSurfaceOverride = {
  body: string;
  contentKey: string;
  headline: string | null;
  sourceKeys: string[];
};

/**
 * Resolves a reviewed dashboard row without changing the local fallback.
 * Callers pass keys from most-specific to least-specific. The reader loader
 * has already rejected every row that is not LIVE, serving, and review-clear.
 */
export function resolveCmsSurfaceOverride(
  generatedContent: CmsGeneratedContentMap | null | undefined,
  contentKeys: readonly string[],
  slots: TemplateSlotValues = {}
): CmsSurfaceOverride | null {
  if (!generatedContent) return null;

  for (const contentKey of contentKeys) {
    const rendered = renderGeneratedContentTemplate(generatedContent.get(contentKey), slots);
    if (!rendered) continue;
    const body = generatedContentParagraphs(rendered).join("\n\n").trim();
    if (!body) continue;

    return {
      body,
      contentKey: rendered.contentKey,
      headline: rendered.headline?.trim() || null,
      sourceKeys: ["generated_interpretations", rendered.contentKey]
    };
  }

  return null;
}
