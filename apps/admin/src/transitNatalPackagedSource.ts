/** Materialize the original package text, never the composed fallback shown in the preview. */
export function transitNatalPackagedSourceDraft(source: Record<string, unknown>, contentKey: string) {
  if (source.contentKey !== contentKey || ![source.body, source.body_you, source.body_they].some(value => typeof value === "string" && value.trim())) {
    throw new Error("The packaged source could not be verified.");
  }
  return {
    reviewerNotes: "", id: null, contentKey, surface: "you" as const, mode: "in_depth" as const,
    status: "DRAFT" as const, lane: "reference" as const, blockType: "fallback_hook" as const,
    headline: typeof source.headline === "string" ? source.headline : contentKey,
    summary: "", body: String(source.body_you ?? source.body ?? source.body_they ?? ""),
    reviewState: "needs-review" as const, promptVersion: "manual-admin",
    sections: { packageRecord: { ...source, review_status: "needs_review" }, packageOriginalRecord: { ...source } },
    facts: { fallbackArchitectureV3: true, review_status: "needs_review" },
    sourceSnapshot: { contentType: contentKey.startsWith("authored/") ? "authored-content" : "fallback-system", contentSystem: "fallback", content_role: source.content_role, review_status: "needs_review", sourcePackage: "tldrastro-fallback-architecture-v3" }
  };
}
