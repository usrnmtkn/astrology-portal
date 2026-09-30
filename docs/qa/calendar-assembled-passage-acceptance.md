# Calendar assembled passage editor acceptance

Implementation branch: `feat/calendar-passage-editor`.
Base: `670c84d9d90548972d9414a68c4230e45ced03dd`.
Evidence date: September 30, 2026. This records implementation acceptance before
release. The pull request records the tested commit and subsequent deployment checks.

## Owner workflow

Open Content Studio → Calendar Write-ups → Daily Sky, Weekly Sky, or Monthly Sky.
The **Complete passage** editor is the first section. Choose a date and time zone,
then **Load passage**. Choose a dated edition or the shared template, edit the
whole passage, inspect its rendered preview, **Save draft**, then **Publish passage**.

**Sources and variables** exposes calculated values, their available source
editors, and Moon transition/timing templates. Reference templates and their
existing editors remain available in the expandable section below.

Dated publication takes priority over a published shared template. Without either,
the existing Calendar assembly remains in use. A dated edition can return to the
shared template without deleting its earlier writing. Its next edit uses an exact
version check against the retained source and can be published again.

Calculated dates, signs, and times remain variables. Source passage expansion
preserves complete prose and paragraph boundaries. The owner-requested lunation
card preview remains one opening paragraph with a link to the article.

## Acceptance evidence

Browser acceptance uses a freshly built local preview (no reused server), desktop
and mobile layouts, and light and dark Studio themes. Synthetic wording goes
through actual authenticated API handlers and the existing publication/history
SQL migrations in isolated PGlite storage. Calendar facts come from Swiss
Ephemeris. No owner database records or paid model calls are used.

| Criterion | Result | Evidence |
| --- | --- | --- |
| Discover the editor within existing Calendar navigation | Passed | `calendar-passage-editor.spec.ts`, `calendar-template-preview.spec.ts` |
| Load, edit, save, reload, and publish a dated complete passage | Passed | Same browser suite and `test-calendar-passage-editor.mts` |
| Keep published wording unchanged while saving a revision | Passed | Actual API and browser round trip |
| Display the complete published copy in Day and Week | Passed | Reader opening/final-sentence assertions with calculated month facts |
| Publish weekly and monthly overviews and open the correct view | Passed | Dedicated period cases in editor browser test |
| Keep shared and dated edits separate; return to shared and republish | Passed | Shared override, retirement, subsequent revision and reader checks |
| Warn about changed sources without overwriting local writing | Passed | Cross-tab content notice and reload checks |
| Preserve edits on save failure; reject invalid variables and stale writes | Passed | Synthetic outage in browser; actual API validation/CAS checks |
| Preserve version history and keep drafts private | Passed | Actual history endpoint, publication RPC, and reader API checks |
| Keep old reference-template workflows working | Passed | Sixteen existing template browser cases |
| Keep reading stable and lunar cards as previews | Passed | Existing Calendar stability and lunar preview browser suites |
| Match established heading styles and avoid mobile overflow | Passed | Computed typography equality, four viewport/theme combinations |
| Enforce shared styles and reader-copy boundaries | Passed | `qa:css-audit`; reader-copy boundary included in API suite |
| Complete Content Studio API regression suite | Passed | `test:content-studio-api` exited 0 |
| Full repository content suite | Blocked by environment | Reaches report-generation checks, then fails because protected private report evidence is not configured in this checkout |
| Production revision and rendered behavior | Pending release | Record the merged revision, deployment, and hosted browser results in the pull request |

Local logs are `/private/tmp/calendar-passage-{browser,api-suite,typecheck,css,content}.log`.
Browser screenshots are `test-results/calendar-passage-editor-*.png`.
Tested source/test fingerprint: `1a0919356430467233445e89a6c42d08a1262f7f113ff784a578e734cbaf073e`.
The per-file SHA-256 manifest is `test-results/calendar-passage-tested-files.json`.
The manifest excludes this acceptance document.

The final browser command ran 38 tests successfully in 3.3 minutes. It covered the
new editor plus existing template, reader-stability, and lunar-preview suites.
`npm run typecheck` and `npm run qa:css-audit` exited 0. The focused passage
API check, all 41 transition/timing sources, and the Calendar package-boundary
check also passed. The complete Content Studio API suite exited 0; its included
reader-copy boundary check passed. Remote refs were refreshed; the implementation
base was 0 commits ahead and 0 behind `origin/main` at verification.

## Implementation boundaries

- Reuses existing versioned content storage, owner authentication, publication
  receipts, immutable history, and retirement. No database migration is required.
- New passage keys include the period, its canonical date, and an encoded IANA
  time zone; shared templates have a separate key.
- Existing approved prose and fallback artifacts are unchanged. The fifteen
  timing templates expose existing connecting sentences without rewriting them.
- Existing reference templates retain their previous serving behavior. Saving
  a reference preview does not implicitly publish a complete passage.
- The full content gate is not reported as passed. Report evidence must be
  provisioned through the project's protected store before that gate can complete.
