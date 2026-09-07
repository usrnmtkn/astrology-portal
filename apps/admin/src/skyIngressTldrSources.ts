import type { SummaryCompositionRow } from "./skySummaryComposition";
import { isGeneratedContentReaderBoundaryAllowed, isReaderServableGeneratedContentRow } from "../../web/src/content/generatedContentEligibility";
import { isContentRetired } from "../../web/src/content/contentPublicationState";
import { skyIngressContentKey } from "../../web/src/services/generatedContentKeys";

// Reuse only an explicit, published TLDR for this ingress. Never shorten the article body.
export function ingressTldrSourceKeys(planet: string, sign: string) {
  const body = planet.toLowerCase().replace(/ /gu, "-");
  const zodiac = sign.toLowerCase();
  return [skyIngressContentKey(planet, sign), `sky-ingress-${body}-${zodiac}`, `sky-${body}-enters-${zodiac}`];
}

export function publishedIngressTldr<Row extends SummaryCompositionRow>(rows: Row[], planet: string, sign: string): Row | undefined {
  for (const key of ingressTldrSourceKeys(planet, sign)) {
    const row = rows.find(row => row.content_key === key && !row.inventory_only && row.summary?.trim()
      && row.status === "LIVE" && row.lane === "serving" && !row.review_state && !isContentRetired(key)
      && isGeneratedContentReaderBoundaryAllowed(row) && isReaderServableGeneratedContentRow(row));
    if (row) return row;
  }
  return undefined;
}
