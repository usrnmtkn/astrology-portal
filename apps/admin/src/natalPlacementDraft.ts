import { isNatalRetrogradeModifierKey } from '../../web/src/content/natalRetrogradeModifier.js';

export function natalPlacementOverrideDraft(contentKey: string, label: string, body: string) {
  const modifier = isNatalRetrogradeModifierKey(contentKey);
  return {
    id: null,
    contentKey,
    surface: "you" as const,
    mode: "in_depth" as const,
    status: "DRAFT" as const,
    headline: label,
    summary: modifier ? "Retrograde addition for this planet and house." : "Optional exact write-up for this planet, sign, house, and motion.",
    body,
    lane: "serving",
    reviewState: "EDITORIAL_REVIEW_REQUIRED",
    blockType: "fallback_hook",
    promptVersion: "manual-admin",
    sections: {
      packageRecord: {
        body,
        ...(modifier ? { body_they: "" } : {}),
        contentKey,
        content_role: "full_copy",
        grammar_frame: "complete_sentence",
        headline: label,
        reader_only: true,
        render_policy: "reader-only-exact-lived-v1",
        review_status: "needs_review"
      }
    },
    facts: { fallbackArchitectureV3: true },
    reviewerNotes: modifier ? "" : "Created from the effective natal reader preview. Review the complete write-up before publishing.",
    sourceSnapshot: {
      contentType: modifier ? "natal-retrograde-modifier" : "natal-placement-exact-override",
      contentSystem: "fallback",
      content_role: "full_copy",
      review_status: "needs_review",
      sourcePackage: "tldrastro-fallback-architecture-v3"
    }
  };
}
