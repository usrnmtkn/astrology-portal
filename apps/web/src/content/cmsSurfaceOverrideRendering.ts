import { contentPublication, publicationRestoresBaseline } from "./contentPublicationState.js";
import { isRetiredCompositionKey } from "./fallbackArchitectureV3/resolver/retiredCompositions.mjs";
import { generatedContentParagraphs, renderGeneratedContentTemplate } from "../services/generatedContentRendering.js";
import type { LiveGeneratedContent } from "../services/generatedContent.js";
import type { TemplateSlotValues } from "../services/templateInterpolation.js";

export type CmsGeneratedContentMap = ReadonlyMap<string, LiveGeneratedContent>;
export type CmsSurfaceOverride = {
  body: string;
  contentKey: string;
  headline: string | null;
  sourceKeys: string[];
  retired?: boolean;
  unavailable?: boolean;
};

/** Pure reader selection shared by browser surfaces and subscription handlers.
 * Callers supply only LIVE, serving, review-clear rows and their own ledger. */
export function resolveCmsSurfaceOverride(
  generatedContent: CmsGeneratedContentMap | null | undefined,
  contentKeys: readonly string[],
  slots: TemplateSlotValues = {},
  publicationForKey = contentPublication
): CmsSurfaceOverride | null {
  for (const contentKey of contentKeys) {
    const publication = publicationForKey(contentKey);
    if (publication && publicationRestoresBaseline(publication)) continue;
    const retired = isRetiredCompositionKey(contentKey) || publication?.state === "retired";
    const rendered = retired ? null : renderGeneratedContentTemplate(generatedContent?.get(contentKey), slots);
    if (!rendered && publication) {
      return { body: "", headline: null, contentKey, sourceKeys: [contentKey], retired, unavailable: true };
    }
    if (!rendered) continue;
    const body = generatedContentParagraphs(rendered).join("\n\n").trim();
    if (!body) continue;
    return { body, contentKey: rendered.contentKey, headline: rendered.headline?.trim() || null,
      sourceKeys: ["generated_interpretations", rendered.contentKey] };
  }
  return null;
}
