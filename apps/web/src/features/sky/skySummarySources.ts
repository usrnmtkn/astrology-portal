import { sunSeasonSourceKeys } from "../../content/skySunSeason";
import { skyDailySummaryFields, skySummaryTemplateErrors } from "../../content/skyDailySummaryCatalog";
import { moonSummaryKey, selectedMoonKind } from "../../content/skyMoonSummary";
import { contentPublication, publicationAllowsContent } from "../../content/contentPublicationState";
import { ingressSummaryKeys } from "../../content/skySummaryEvents";
import type { SkyDailySummaryFacts } from "../../content/skyDailySummary";
import type { LunarCalendarEvent } from "../../services/ephemeris";
import type { LiveGeneratedContent } from "../../services/generatedContent";
type Content = Map<string, LiveGeneratedContent>;

export function skySummarySourceKeys(facts: SkyDailySummaryFacts, events: LunarCalendarEvent[]) {
  const kind = selectedMoonKind(facts.event);
  const sun = kind === "regular" || facts.sunTransition ? facts.sun : facts.event?.sun ?? facts.sun;
  const moon = kind === "regular" ? facts.moon : facts.event;
  const common = skyDailySummaryFields.filter(field => !/^cms\/sky-daily-summary\/(sun|moon)\//u.test(field.key)).map(field => field.key);
  return [...new Set([...common,
    ...(sun?.sign ? sunSeasonSourceKeys(sun.sign, facts.retrogradePlacements?.map(p => p.planet) ?? facts.retrogradePlanets) : []),
    ...(moon?.sign ? [moonSummaryKey(moon.sign, kind)] : []),
    ...events.flatMap(ingressSummaryKeys)
  ])].sort();
}

export function missingPublishedSkySummaryKeys(keys: readonly string[], content: Content) {
  return keys.filter(key => {
    const publication = contentPublication(key);
    if (publication?.state !== "live") return false;
    const row = content.get(key);
    // The canonical loader has already checked LIVE/serving/review-clear;
    // normalized LiveGeneratedContent does not always retain the status field.
    return !row || !publicationAllowsContent(key, row.id, row.updatedAt, row.targetDate)
      || Boolean(row.status && row.status !== "LIVE") || !row.body.trim()
      || skySummaryTemplateErrors(key, row.body).length > 0;
  });
}

