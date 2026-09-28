# Calendar Moon transition phrases — acceptance record

Verified locally on September 28, 2026. This feature has not been deployed.

Branch: `feat/calendar-transition-phrase-editor`, based on main
`3f4092b12d4436973d40df1e690bce583e948613`. The branch has no commits beyond that
base. The 27 changed implementation/configuration/test files have SHA-256
`51e6b9ef33228c8848a91d6f8bf012c471351ce8ea04365e34a1cbf537f4b121` when sorted by
repository-relative path and hashed as `path + NUL + file bytes + NUL`.
This document is excluded from that fingerprint.

## Owner workflow

Open **Content Studio → Calendar Write-ups → Moon transition phrases**.
The section is available in the Calendar sidebar children and workspace tabs.
Route: `/admin/content#calendar-writeups?view=moon-transition-phrases`.

Search by the words visible in the Calendar, or filter by when the phrase
appears. Choose **Edit**, then **Save draft** or **Save & publish** in the existing
content editor. Published edits feed both Calendar Day and Week. Drafts remain
private. Table cells show a short preview; the editor contains the complete text.

The 26 entries include twelve sign continuation phrases, the existing Sagittarius
First Quarter continuation, nine phrases around New Moons/Full Moons/eclipses,
three general season-ending phrases, and one late-night Moon ingress phrase.
Calculated signs, dates and event times remain separate from editable prose.
Links lead to the existing Lunar ingresses and Season transitions passage editors.

The four highlighted passages from the owner's screenshots can be found under:

| Screenshot passage | Entry |
| --- | --- |
| “If you already started it yesterday…” | Moon in Aries · Continuation |
| “Repeat what actually made yesterday easier…” | Moon in Taurus · Continuation |
| “Keep the part that became clear…” | Day after a Full Moon |
| “The first reaction has had some time to settle…” | Two or three days after a Full Moon |

## Source and publication behavior

- All original wording is preserved. The thirteen extracted context bodies were
  compared with the base revision; the existing sign continuation bodies are unchanged.
- Browsing original phrases does not create database rows. Saved rows take
  precedence over registered starters.
- Each starter records its original body, SHA-256 and word count. It remains a
  draft/reference with `needs_review`, `owner_approved: false`, and
  `serving_enabled: false` until the ordinary owner publication action.
- Admission is restricted to the 26 registered keys. Authentication and optimistic
  version checks remain in the existing handlers.
- A newer draft over a published row is labeled **Unpublished changes**.
- Week previously discarded later paragraphs of an assembled Moon passage. It now
  retains the entire transition phrase, while lunation article previews still use
  their existing paragraph limit.

## Acceptance criteria

All checks below passed against the fingerprint above. API and browser writes used
an isolated synthetic PostgREST store through the actual application handlers.
They did not write production content or call a paid model.

| Criterion | Evidence |
| --- | --- |
| Find the new workspace and all 26 original phrases | Rendered Studio tests; actual inventory/detail handlers |
| Find all four highlighted screenshot phrases | Browser search and original-body assertions |
| Filter, search, preview and open complete text | Browser tests at 390 and 1440 pixels |
| Save a draft, reload and recover exact text | Actual handler checks for all 26 sources; rendered editor round trip |
| Publish and load the exact saved phrase | Actual publish/reader handlers for all 26 sources |
| Day and Week use both edited continuation and context phrases | Rendered reader checks on September 27, 2026; complete multi-paragraph text asserted |
| Timing text remains calculated and unchanged | Resolver assertions for all context branches and browser reader assertions |
| Draft-only text is excluded from readers | API/resolver tests |
| Stale writes and unauthenticated requests are rejected | Actual handler 409 and 401 assertions |
| An exact source link reopens the saved editor | Browser reload/deep-link check |
| Loading, error/retry and empty/reset states work | Browser delayed request, injected 503 and empty search |
| Shared typography, responsive layout and both themes | Computed styles compared with Season transitions; light/dark desktop/mobile screenshots reviewed |
| Existing lunation articles remain previews | Ten Calendar lunation-preview browser cases |

## Commands and results

- Independent `npm ci --no-audit --no-fund` and `npm run build:knowledge`: passed.
- `npm run typecheck`: passed.
- `npm run test:content-studio-api`: passed on the final implementation, including
  the new `scripts/test-calendar-transition-phrases.mts` and existing governance,
  reader-copy boundary and API checks.
- `node --import tsx scripts/test-calendar-moon-fallback.mjs`,
  `scripts/test-calendar-template-preview.mts`, and
  `scripts/test-calendar-handoff-catalog.mjs`: passed.
- `PLAYWRIGHT_BASE_URL=http://127.0.0.1:4287 npx playwright test
  tests/visual/calendar-transition-phrases.spec.ts
  tests/visual/calendar-lunation-preview.spec.ts --workers=1`: **14 passed** on a
  fresh production web build with workflow test configuration.
- `npm run test:browser-suite-coverage`: passed; the new browser spec is included
  in the existing visual-smoke workflow.
- Standalone admin Vite production build after the final module separation: passed.
  The earlier full `npm run build:admin` also passed.
- `npm run qa:bundle`, `node scripts/check-admin-bundle-budgets.mjs`, and
  `npm run qa:css-audit`: passed.
- `git diff --check`: passed.

Browser artifacts are under `test-results/transition-phrases*.png`; local command
logs are `/private/tmp/transition-*.log`. These are local evidence artifacts, not
production checks. An initial build-contention timeout was rerun after concurrent
build work finished. Browser verification also exposed the Week truncation issue
described above; the final run includes its fix.

## Bundle allocation

The editor is lazy loaded. Reader phrase bodies are separated from editor identity
metadata. No dependency or CSS rule was added.

The final workflow-configured web build measures **3,500,234 aggregate JavaScript
gzip bytes**. The aggregate cap increases by 6,000 bytes, from 3,495,250 to
3,501,250, leaving 1,016 bytes. Reader startup, CSS and individual chunk limits are
unchanged.

The standalone admin build measures approximately **755.1 kB raw / 219.7 kB gzip
at entry** and **761.5 kB aggregate gzip**. Its raw entry/largest limit increases by
2,000 bytes, entry gzip by 500 bytes and aggregate gzip by 4,000 bytes. This is an
explicit feature allocation, not a claim of performance improvement. Memory graph,
forbidden payload and reader startup protections remain unchanged.

## Not yet verified

No commit, merge, production deployment or production content mutation was performed.
The live site's new navigation and publication flow must be checked after deployment
before describing this feature as live.
