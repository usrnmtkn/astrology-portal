import { assertCompiledSkyArticleEdition, selectActiveSkyArticleEdition, skyArticleEditionRecord, type SkyArticleEditionCandidate } from "./skyArticleTemplateCompiler.js";
import { isSkyIngressEssay } from "./skyIngressEssay.mjs";

/** Receives the reader-admitted inventory, never Studio drafts. Keep selection
 * and exact stored prose identical on initial hydration and later refreshes. */
export function skyIngressEssayReaderSection(
  candidates: Iterable<SkyArticleEditionCandidate & { status?: string }>,
  context: { activeInstant: string; planet: string; sign: string }
) {
  const selected = selectActiveSkyArticleEdition([...candidates].filter(row => row.status === "LIVE"
    && isSkyIngressEssay(skyArticleEditionRecord((row.sections as { skyArticleEdition?: unknown } | undefined)?.skyArticleEdition)?.format)), context);
  if (!selected || !isSkyIngressEssay(selected.edition.format)) return null;
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
