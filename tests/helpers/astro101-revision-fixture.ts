/** Neutral complete documents for actual-handler and rendered Learn revision tests. */
export function astro101RevisionFixture(kind: "chapter" | "article" | "house", mode = "article") {
  const slug = kind === "house" ? "11" : `synthetic-${kind}`;
  return {
    id: kind === "chapter" ? "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa" : kind === "article" ? "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb" : "dddddddd-dddd-4ddd-8ddd-dddddddddddd",
    content_key: `education/astro-101/${kind}/${slug}`, surface: "education", mode,
    event_type: mode === "all" ? null : "sky_article", block_type: "essay", status: "DRAFT", lane: "serving", review_state: null,
    headline: `Synthetic ${kind}`, summary: "Synthetic card description.",
    body: "Synthetic published opening.\n\nSynthetic published final sentence.",
    sections: { kind, packageRecord: { content_role: "education_article", review_status: "needs_review", privateNote: "SYNTHETIC_IMPORT_NOTE" }, intro: "Synthetic published opening.", blocks: [
      { heading: "Synthetic section", level: 2, body: "Synthetic published final sentence.", style: "p" }
    ] },
    facts: { slug: `/learn/${kind === "house" ? "houses" : "astro-101"}/${slug}`, order: 1 },
    source_snapshot: { contentType: "authored-article", authoringSource: "admin-dashboard" },
    provider: "manual-admin", prompt_version: "manual-admin", target_date: null,
    updated_at: "2026-10-01T00:00:00.000Z", flags: []
  };
}
