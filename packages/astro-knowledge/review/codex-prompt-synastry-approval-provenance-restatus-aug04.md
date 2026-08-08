# Codex prompt — structured approval provenance and honest re-status for synastry serving rows

Copy everything below the line into Codex. This implements step 1 of
`synastry-legacy-corpus-audit-map-2026-08-04.md`. It is deterministic wiring and status hygiene:
no billed calls, no new or rewritten prose, no serving-content change (every row that is
reader-eligible today remains reader-eligible). The owner has approved the operation class; the
re-status rule below is mechanical so no individual judgment calls are made.

---

All 483 synastry serving rows in `apps/web/src/content/fallbackArchitectureV3/source-rows/
fallback-source-rows-v3.json` carry `review_status: "approved"`. On current `main`
(post-PR-#61 and post-PR-#63): 3 rows (Jupiter–Ascendant) carry the structured `approval` object
and are the reference implementation for this pass; 129 carry a free-text `approved_via` content
sign-off (a chat/Codex approval of the wording, possibly with the PR #63 closer-removal note
appended after a `|` separator); 336 carry ONLY the PR #63 note
`owner-approved stock-closer removal, chat 2026-08-04` — which documents a deletion operation,
not a content approval, and must NOT be treated as approval provenance; 15 have no `approved_via`
at all. The writer pipeline has a real exact-approval convention
(`approvalLevel: "exact_owner_approved"`, payload hashes, source paths, revocation records —
see `.agents/skills/marie-satori-writer/references/governance.md` and
`packages/astro-knowledge/review/*exact-approval*.json`) that never reaches serving rows. Close
that gap. Work on a fresh branch off `main` (suggest `codex/synastry-approval-provenance`).

Exact row lists: `packages/astro-knowledge/review/synastry-legacy-corpus-audit-lists-2026-08-04.json`
(`provenanceFreeRows`, `provenancedRows` — note the lists predate PR #61, so the three
Jupiter–Ascendant rows appear under `provenanceFreeRows` there but are already resolved).
Recompute from the file on your branch rather than trusting the list blindly. Categorize each
row: `structured` (has `approval`), `content-provenance` (any `approved_via` segment other than
the closer-removal note), `closer-note-only`, `none`. If your counts differ from
3 / 129 / 336 / 15, stop and report before changing anything.

## 1. Add a structured approval reference (schema)

Add an optional `approval` object to hook rows (register it wherever hook-row shape is validated;
add validation if none exists):

```json
"approval": {
  "approvalLevel": "exact_owner_approved",
  "recordPath": "packages/astro-knowledge/review/<approval-record>.json",
  "payloadSha256": "<sha256 of the approved payload>",
  "approvedAt": "YYYY-MM-DD"
}
```

- `approvalLevel` enum: `exact_owner_approved` | `owner_signoff_untraced` (field name matches the
  existing writer-pipeline exact-approval convention). The second level exists so historical chat
  sign-offs can be recorded honestly without fabricating a record path.
- `recordPath` and `payloadSha256` are required when `approvalLevel` is `exact_owner_approved`;
  `recordPath` must point to an existing file. Both are required-absent for
  `owner_signoff_untraced`.
- Keep `approved_via` as-is for human context; the structured field is what tooling reads.

## 2. Validation script

New script (suggest `scripts/test-synastry-approval-provenance.mjs`), run in the test suite:

- Every `synastry-pair` row with `review_status: "approved"` must carry an `approval` object.
- Every `recordPath` must exist on disk.
- `approved_reuse` and `reviewed` rows are exempt; `needs_review` rows must not carry `approval`.
- The script prints a coverage summary (rows per level) so future audits are one command.

## 3. Mechanical re-status (the honesty pass)

Apply exactly this rule to the 483 synastry-pair rows — no judgment calls:

- Rows that already carry a structured `approval` object (3: Jupiter–Ascendant, PR #61): leave
  entirely untouched.
- Rows with a content-provenance `approved_via` (129): keep `review_status: "approved"`, add
  `approval.approvalLevel: "owner_signoff_untraced"` with `approvedAt` parsed from the content
  sign-off's date (not the closer-removal note's date). Exception: the six Mars/Uranus–Ascendant
  rows shipped via PR #44/#45 — if an approval record or per-card contract test exists to point
  at, use `exact_owner_approved` with that `recordPath` and payload hash; otherwise they get
  `owner_signoff_untraced` like the rest.
- Rows with no content provenance (351 = 336 closer-note-only + 15 none): set
  `review_status: "reviewed"` and add no `approval` object. The closer-removal note stays in
  `approved_via` as history; it approves a deletion, not the wording. `reviewed` is
  reader-eligible (`READER_ELIGIBLE_STATUS` in the resolvers), so nothing changes for readers;
  the status simply stops claiming a content approval that cannot be evidenced.

Going forward, `approved` on a synastry row means evidenced approval. Future rewrites (the
Jupiter–Ascendant pilot onward) ship with `exact_owner_approved` and a record path.

## 4. Propagate and verify

- Regenerate derived artifacts (bundled rows, manifest summaries, `content-book.html`,
  `dist/tldr-content.js`) the same way PR #44/#45 did.
- Reader-facing content contract and visual smoke pass unchanged — reader-visible output must be
  byte-identical before and after this PR; assert that explicitly (the copy is untouched and every
  affected row remains reader-eligible).
- Counts to report in the PR description: 483 rows total; 132 `approved` (3 pre-existing
  `exact_owner_approved` + 129 re-recorded, of which N upgraded to `exact_owner_approved`),
  351 `reviewed`, 0 rows removed, 0 body texts changed.
- Emit a manifest of every status change to
  `packages/astro-knowledge/review/synastry-provenance-restatus-manifest-2026-08-04.json`.
- `git diff --check` clean.

## Out of scope

- Any prose change, any billed call, any approval-state upgrade not evidenced by an existing
  record.
- Backfilling exact approvals for the 2026-07-21/22 chat sign-offs — if the owner wants those
  promoted to `exact_owner_approved` later, that is a separate owner-driven step with real
  records.
- Duplicate-pair rewrites and further card drafts (separate prompts). The stock-closer removal
  (PR #63) and Jupiter–Ascendant shipping (PR #61) have already landed; the counts above reflect
  them.
- Non-synastry hook rows (the same gap exists corpus-wide — 893 provenance-free rows overall —
  but this pass is scoped to `synastry-pair` to stay reviewable).
