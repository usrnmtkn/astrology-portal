from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

def patch(path, old, new, label):
    file = ROOT / path
    text = file.read_text()
    count = text.count(old)
    if count != 1:
        raise RuntimeError(f"{label}: expected 1 match, found {count}")
    file.write_text(text.replace(old, new, 1))

patch(
    "apps/admin/src/NatalPlacementReaderPreview.tsx",
    '? "This preview uses the same production eligibility rules as the Friends reader. Draft, reviewed-only, reference-lane, stale-package, and otherwise non-hydratable Studio rows are excluded."',
    '? "This preview uses the same production eligibility rules as the Friends reader. Friend view is composed from separate third-person source writing, so it can be reviewed and edited independently from You copy. Draft, reviewed-only, reference-lane, stale-package, and otherwise non-hydratable Studio rows are excluded."',
    "friend source-writing explanation"
)

patch(
    "scripts/test-admin-writing-surface-map.mjs",
    'assert.match(generatedContentApiSource, /isCmsRow \\? "manual-admin" : "claude"/u, "CMS rows must retain manual owner-authored provenance instead of being labeled as model output.");',
    'assert.match(generatedContentApiSource, /provider: packageState\\?\\.provider[\\s\\S]*?"manual-admin"/u, "Manual Content Studio creates must retain manual-admin provenance instead of being mislabeled as model output.");',
    "manual provenance contract"
)

patch(
    "api/admin/generated-content.ts",
    '''    if (body.status === "LIVE") {
      if (!isPackageRow) {
        const effectiveLane = typeof body.lane === "string" && body.lane.trim()
          ? body.lane.trim()
          : existing.lane ?? "serving";
        if (effectiveLane !== "serving") {
          throw new GeneratedContentRequestError("Published content must use the serving lane.", 409);
        }
      }
      const requestedEdition = isRecord(body.sections) ? skyArticleEditionRecord(body.sections.skyArticleEdition) : null;
      if (existing?.event_type === "sky-article-edition" || body.eventType === "sky-article-edition" || requestedEdition) {
        throw new Error("Use Approve & publish edition so the exact compiled Sky article receives an owner approval record.");
      }''',
    '''    if (body.status === "LIVE") {
      const requestedEdition = isRecord(body.sections) ? skyArticleEditionRecord(body.sections.skyArticleEdition) : null;
      if (existing?.event_type === "sky-article-edition" || body.eventType === "sky-article-edition" || requestedEdition) {
        throw new GeneratedContentRequestError("Use Approve & publish edition so the exact compiled Sky article receives an owner approval record.", 409);
      }
      if (!isPackageRow) {
        const effectiveLane = typeof body.lane === "string" && body.lane.trim()
          ? body.lane.trim()
          : existing.lane ?? "serving";
        if (effectiveLane !== "serving") {
          throw new GeneratedContentRequestError("Published content must use the serving lane.", 409);
        }
      }''',
    "compiled edition explicit publish conflict"
)

patch(
    "scripts/test-sky-owner-review-actions.mjs",
    'assert.equal(genericEditionSignoff.status, 500);',
    'assert.equal(genericEditionSignoff.status, 409);',
    "compiled edition conflict status"
)

print("Content Studio UX/provenance/owner-action follow-up written.")
