# Astro 101 reader recovery

Status: implemented and verified locally; owner authorized release and ledger recovery.
Task: `thread:01a0cba9-ef2f-7600-99ce-6fb770a21638`.
Owner release direction: “Release the fix and restore the lessons.”
Branch: `fix/astro101-missing-content`, based on refreshed main
`58c2aec59e445da1c4a8faaab24ae0661b1b6212` (zero commits divergent at investigation).

## Production evidence

The public `/api/content-reader` request for the education prefix returned HTTP
200 with zero rows, reproducing the absent chapter list and `/learn/houses/11`
not-found page. Read-only database inspection found all 70 saved articles intact:
9 chapters, 12 houses, 12 signs, 9 points, 16 retrogrades and 12 lunar pages.
All had `LIVE`, `serving`, and no review hold. Only one had an exact matching live
publication ledger record; the other 69 had no record.

The reader API introduced in PR #1006 routes any `sections.packageRecord`
through the fallback package admission gate. Astro 101 instead keeps its original
import descriptor there (`education_article`, `needs_review`) and publishes its
saved body, intro and blocks through the education workflow. Existing education
tests and Studio live-status logic explicitly recognize that distinction. The
generic gate rejected even the chapter with a valid publication record.

## Repair

- Apply the established Astro 101 article eligibility check after the shared
  LIVE/lane/review, sample and blocking-flag checks. Keep the exact publication
  ledger requirement, including retirement and microsecond version matching.
- Exclude the education import descriptor from the public response. Preserve
  the complete saved body, intro, blocks, lists and related links.
- Resolve reader paths consistently with the existing education helper.
- Propagate request failure to the existing Learn error state rather than
  turning failure into an empty successful inventory or a not-found lesson.
- Make Studio's education live-status result honor the publication ledger.
- Register actual-handler education regressions in the API suite and browser CI.

No article wording, editorial state, production row or database policy was changed.

## Verification

- A new actual-handler regression failed on the original API: zero of ten
  published synthetic lessons returned. It passes with the repair.
- All 70 saved production rows passed the corrected eligibility and projection
  checks locally; body, intro and blocks were compared to the saved snapshot.
- The regression covers private import/draft exclusion, draft/reference/review
  refusal, blocking flags, incomplete articles, unresolved slots, missing/retired/
  stale ledger entries, actual client loading and transport errors.
- The existing publication bootstrap was exercised against the actual SQL
  migrations in isolated PostgreSQL (PGlite). It fills absent ledger entries,
  leaves article copy unchanged, skips concurrent edits and preserves retirement.
- `npm run test:content-studio-api`: passed in this worktree with its own `npm ci`
  dependencies and knowledge-package build.
- Web typecheck, fresh production build, CSS audit, browser-suite coverage and
  public built-asset privacy scan: passed.
- Four fresh-build browser cases passed at 390/1440 px and light/dark: all nine
  chapter cards, chapter opening/end text, back navigation, house 11 opening/end
  text, reload, retirement and a distinct transport-error state. Browser requests
  use the real API handler against isolated synthetic storage.
- A separate local preview using all 70 saved articles and a simulated repaired
  ledger visibly restored all nine chapter titles and the house-11 article
  (16 section headings, 8,344 rendered body characters). No browser warning or
  error was observed on the hub. This is local evidence, not a deployment claim.

## Existing bundle-budget failures

The budget check fails on unchanged main as well as the repair. A separate clean
worktree at the exact base commit used its own `npm ci`, knowledge build, and the
same browser-build environment. Budgets were not changed or waived.

| Measure (gzip bytes) | Main | Repair | Limit |
| --- | ---: | ---: | ---: |
| App boot | 470,931 | 470,944 | 461,000 |
| Reader boot | 524,417 | 524,430 | 513,750 |
| All JavaScript | 3,457,661 | 3,457,722 | 3,457,500 |

## Release and recovery

The version-checked SQL was prepared with the existing
`scripts/seed-content-publications.mts` bootstrap from the read-only 70-row
snapshot. Its `ON CONFLICT DO NOTHING` preserves the existing publication and
any later retirement; its source identity/version join skips later edits. It
adds the 69 missing publication records without updating lesson rows. The
snapshot and exact SQL remain outside Git in private temporary files; refresh
and revalidate them if the saved lessons change before release.

After owner release authorization, commit/review the patch, require the exact-head
Content Studio API check, merge through main and verify its production deployment.
Apply the inspected publication recovery, then requery the public API and verify
all nine chapter cards and `/learn/houses/11` on production. Report any changed
source or existing retirement instead of republishing it. Confirm that all saved
article hashes, versions and editorial states are unchanged after recovery.
