# Codex prompt — remove stock template closers from synastry serving rows

Copy everything below the line into Codex. This is a deterministic deletion pass, owner-approved
in chat on 2026-08-04. No billed calls, no generated or rewritten prose, no status changes. It
implements the standing editorial decision: "When the behavior and cost are clear, stop; delete a
following slogan, metaphor, reassurance, or second conclusion."

---

The synastry serving corpus (`apps/web/src/content/fallbackArchitectureV3/source-rows/
fallback-source-rows-v3.json`, `hookRows`, `fallback-hook/synastry-pair/*`) ends ~300 of its 483
rows on one of three fill-in-the-blank template closers. The owner has approved removing these
closer sentences outright. Work on a fresh branch off `main` (suggest
`codex/synastry-stock-closer-removal`).

## 1. Identify the rows (deterministic)

A row qualifies when the final sentence of `body_you` (placeholder-normalized) matches one of
three template signatures:

- ends "until the friction builds muscle." — the hard-aspect closer (112 rows on current `main`)
- ends "the same side without trying." — the soft-aspect closer (112 rows)
- ends "running as one instinct." — the conjunction closer (112 rows, one varied word slot)

(Counts are post-PR #61: the rewritten Jupiter–Ascendant rows no longer match, which the
signature-based selection handles automatically.)

Exact row lists: `synastry-legacy-corpus-audit-lists-2026-08-04.json` (`stockCloserRows`).

The closer is the entire final sentence (typically the "That's {{holder1Poss}} X against/with
{{holder2Poss}} Y: …" recap). Match by signature, not by row list, so the operation is
self-selecting: rows already rewritten (Mars–Ascendant, Uranus–Ascendant) simply won't match.

## 2. Remove (script, not hand edits)

Write a script (suggest `scripts/remove-synastry-stock-closers.mjs`, kept in the repo for the
audit trail) that:

- deletes the entire final closer sentence from both `body_you` and `body_they` of each matching
  row — the two variants must stay parallel;
- makes no other text change: no rewording, no replacement sentence, no punctuation "improvements"
  to the remaining body;
- appends to each modified row's `approved_via` (or sets it if absent):
  `"owner-approved stock-closer removal, chat 2026-08-04"` — preserving any existing value with a
  `" | "` separator;
- leaves `review_status` untouched;
- prints the exact list of modified `contentKey`s and the removed sentence for each, saved as a
  manifest next to the script output (suggest
  `packages/astro-knowledge/review/synastry-stock-closer-removal-manifest.json`).

## 3. Sanity constraints

- Every modified body must still end on a complete sentence with terminal punctuation.
- If removing the closer would leave a body under two sentences, do not modify that row; list it
  in the manifest under `skipped` for owner review instead.
- If a final sentence matches a signature but also contains content not present in the template
  frame (i.e., it is not purely the recap closer), skip and list it under `skipped`.
- No row outside `fallback-hook/synastry-pair/*` is touched.

## 4. Propagate and test

- Regenerate the derived artifacts the same way PR #44/#45 did (bundled rows, manifest summaries,
  `content-book.html`, `dist/tldr-content.js`) so serving and source stay consistent.
- Add a regression test (suggest `scripts/test-synastry-no-stock-closers.mjs`) asserting that no
  `synastry-pair` row's final sentence matches any of the three signatures, so the closers cannot
  return.
- Full test suite, reader-facing content contract, and visual smoke pass.
- `git diff --check` clean.

## 5. Verify counts

- Modified rows: expect exactly 112 + 112 + 112 = 336 on post-#61 `main` (the audit lists file
  predates #61 and shows 113s); the manifest is the source of truth. Zero modified rows outside
  the three signatures.
- The Jupiter–Ascendant rows will lose their closers here too; that is fine and interim — the pair
  is separately queued for full rewrite (`codex-prompt-jupiter-ascendant-card-drafts-aug04.md`),
  which supersedes these bodies when it ships.
- 483 synastry rows still present; no row added or removed; no `review_status` changed.

## Out of scope

- Any new or rewritten prose, any billed call.
- The provenance re-status work, duplicate-pair rewrites, and remaining Ascendant pairs (separate
  steps in `synastry-legacy-corpus-audit-map-2026-08-04.md`).
- Stock openers and shared frames ("sits at a hard angle to…") — closers only in this pass.
