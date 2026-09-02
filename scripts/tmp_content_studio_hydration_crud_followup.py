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

print("Content Studio UX/provenance contract follow-up written.")
