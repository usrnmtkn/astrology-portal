# Codex prompt — commit the blocked-harvest mode-null fix; clean up local docs duplicates

Copy everything below the line into Codex. Two independent items: a commit/PR of verified unstaged
work, and a local working-tree cleanup. No billed calls; no reader copy, approvals, serving, or
promotion changes.

Context you need first: the Jupiter–Ascendant `humanMoment` beats are ALREADY on `main` (merged via
PRs #68/#70 with holder-templated wording). Do not add, modify, or re-approve beats anywhere. The
five `A-jupiter_B-ascendant_*.json` files in the CI checkout were restored to HEAD content and must
show clean in `git status`.

---

## 1. Commit and PR the blocked-harvest mode-null fix

The checkout at `/private/tmp/tldrastro-calendar-ci.pfrDVO` (a worktree on `main`) carries verified,
unstaged changes implementing `codex-prompt-blocked-harvest-mode-null-aug04.md`:

- `packages/astro-knowledge/scripts/aspect-corpus-warmth-harvest.js` — `failedHarvest()` reports
  `harvest_mode: null`; ready/allowed guards before mode branches.
- `packages/astro-knowledge/scripts/generate-sky-aspect-cards.d.ts` — nullability.
- `packages/astro-knowledge/scripts/test-aspect-corpus-warmth-harvest.js` — blocked packet asserts
  nested and packet-level modes are both null.
- `packages/astro-knowledge/docs/editorial-ai/codex-prompt-warmth-scale-rule-blocked-aug04.md` —
  include only if the modification documents this follow-up; otherwise restore it.

Confirm the five synastry data files and everything else show clean; commit ONLY the files above on
a branch off `main` (suggested: `codex/aspect-warmth-blocked-mode-null`), one commit
(`fix(editorial): report null harvest mode on blocked packets`), PR to `main` like #49.

Before opening the PR, run and report: warmth-harvest regression, exact-aspect pipeline, full
Current Sky aspect suite including cron entrypoint, reader-facing content contract. Counts must
hold: 198 ready / 42 fail-closed, 117 matched / 108 none_found, 225 owner calibration entries.
Also rebuild the three Jupiter–Ascendant packets (conjunction, square, trine; surface
`synastry-aspect`, format `full-card`) against the merged beats and report: all `ready`,
`generationAllowed: true`, modes `matched` or `none_found` — never null on a ready packet.

## 2. Clean up untracked duplicates in the primary checkout

In `/Users/mprez/Code/tldrastro` (currently on `perf/runtime-foundations` — do not touch that
branch's tracked changes), these untracked files are stale copies of content now tracked on `main`:

- `packages/astro-knowledge/voice/tldr-astro/marie-satori-owner-feedback-audit.md` (if identical to
  `main`'s tracked version — verify before deleting)
- `packages/astro-knowledge/docs/editorial-ai/method-corpus-warmth-harvest.md` (same check)
- `packages/astro-knowledge/review/codex-prompt-blocked-packet-scale-rule-aug04.md` — duplicate of
  the scaleRule prompt PR #49 committed under `docs/editorial-ai/`; delete.

For every other untracked `packages/astro-knowledge/review/codex-prompt-*.md`: if the same prompt is
already tracked on `main` (either path), delete the local copy; if not, commit it on a docs branch
off `main` (suggested: `codex/review-prompt-docs-aug04`, commit
`docs(editorial): track aug04 codex prompts`) and PR to `main`.

Report every file deleted and every file committed, per item. If an untracked file differs from its
tracked `main` counterpart, do not delete it — report the diff instead and leave it in place.

## Verify

- CI checkout `git status` clean after the PR branch is cut (data files untouched).
- Primary checkout: no untracked review-prompt or duplicate doc files remain unaccounted for;
  `perf/runtime-foundations` tracked state unchanged.
- `git diff --check` on both branches.

Out of scope: beats, governed synastry entries, generation behavior, gates, approvals, serving,
promotion.
