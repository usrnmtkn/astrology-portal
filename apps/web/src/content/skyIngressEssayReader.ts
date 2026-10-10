import { approvedSkySeasonFallback, skySeasonFallbackIdentity } from "./skySeasonFallback.js";
import { assertCompiledSkyArticleEdition, selectActiveSkyArticleEdition, skyArticleEditionRecord, type SkyArticleEditionCandidate } from "./skyArticleTemplateCompiler.js";
import { isSkyIngressEssay } from "./skyIngressEssay.mjs";
import type { ContentPublication } from "./contentPublicationState.js";

/** Discover dated editions from the current ledger, then fetch their exact
 * rows. Fallback-package caches do not contain compiled Studio editions. */
export function skyIngressEssayPublicationKeys(
  publications: readonly ContentPublication[], context: { planet: string; sign: string }
) {
  const prefix = `sky-article/${context.planet}/${context.sign}/`;
  return publications.filter(row => row.state === "live" && row.row_id
    && ((row.content_key.startsWith(prefix)
      && /^\d{4}\/\d{4}-\d{2}-\d{2}$/u.test(row.content_key.slice(prefix.length)))
      || (skySeasonFallbackIdentity(row.content_key)?.planet === context.planet
        && skySeasonFallbackIdentity(row.content_key)?.sign === context.sign)))
    .map(row => row.content_key);
}

/** Receives the reader-admitted inventory, never Studio drafts. Keep selection
 * and exact stored prose identical on initial hydration and later refreshes. */
export function skyIngressEssayReaderSection(
  candidates: Iterable<SkyArticleEditionCandidate & { status?: string; headline?: string | null; summary?: string | null; body?: string; lane?: string | null; reviewState?: string | null }>,
  context: { activeInstant: string; planet: string; sign: string }
) {
  const rows = [...candidates];
  const selected = selectActiveSkyArticleEdition(rows.filter(row => row.status === "LIVE"
    && isSkyIngressEssay(skyArticleEditionRecord((row.sections as { skyArticleEdition?: unknown } | undefined)?.skyArticleEdition)?.format)), context);
  if (!selected || !isSkyIngressEssay(selected.edition.format)) {
    const active = Date.parse(context.activeInstant);
    const fallback = rows.flatMap(row => {
      const visit = approvedSkySeasonFallback({ content_key: row.contentKey, status: row.status,
        lane: row.lane, review_state: row.reviewState, sections: row.sections, source_snapshot: row.sourceSnapshot });
      return visit && visit.planet === context.planet && visit.sign === context.sign
        && visit.start <= active && active < visit.end && row.body?.trim() ? [{ row, visit }] : [];
    }).sort((a, b) => b.visit.start - a.visit.start)[0]?.row;
    if (!fallback) return null;
    return {
      slot: "meaning" as const, required: true, layer: "authored" as const,
      tier: "fallback-architecture-v3-authored" as const, sourceKeys: [fallback.contentKey],
      heading: fallback.headline ?? "", tldr: fallback.summary ?? "", body: fallback.body!,
      articleSections: [{ id: "season-fallback", heading: "", body: fallback.body!, kind: "ingress-essay" }],
      risingHoroscopes: [], keyDates: [], tagline: null, closingCharge: null
    };
  }
  const edition = assertCompiledSkyArticleEdition(selected.edition);
  return {
    slot: "meaning" as const, required: true, layer: "authored" as const,
    tier: "fallback-architecture-v3-authored" as const,
    sourceKeys: ["compiled-sky-article-edition-v2", edition.contentKey],
    heading: edition.headline, tldr: edition.tldr, body: edition.body,
    articleSections: edition.articleSections.map(section => ({ ...section, kind: "ingress-essay" })),
    risingHoroscopes: [], keyDates: [], tagline: null, closingCharge: null
  };
}
