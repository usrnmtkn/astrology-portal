# Calendar Moon transition phrases — acceptance record

Initial local acceptance recorded on September 28, 2026, before deployment.
Release follow-up and baseline CI findings are recorded below and in PR #1081.

Branch: `feat/calendar-transition-phrase-editor`, based on main
`3f4092b12d4436973d40df1e690bce583e948613`. At the initial acceptance check, the 27 changed implementation/configuration/test
files had SHA-256
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
2,500 bytes, entry gzip by 500 bytes and aggregate gzip by 4,000 bytes. This is an
explicit feature allocation, not a claim of performance improvement. Memory graph,
forbidden payload and reader startup protections remain unchanged.

## Release follow-up

The CI-configured standalone admin build matches hosted chunk
`index-BtMrEcd1.js`: 755577 raw / 219830 gzip entry bytes and about 761.6 kB
aggregate gzip. Supabase placeholders add about 500 raw bytes compared with the
original local measurement. The explicit feature allocation corrects the raw
entry/largest cap to 756,000 bytes; entry gzip, aggregate, CSS, reader and payload
caps receive no further increase. All 29 hosted Studio browser cases passed
before the bundle check detected this measurement difference.

Final local verification before the correction commit: the complete API suite and
plain-Node startup check pass. The fresh-build browser run passed all 20 affected
Studio/navigation/phrase cases; its additional Calendar pressure-release case
reproduced the baseline failure below. Typecheck, CSS, bundle and privacy checks
pass. The final 30 code/configuration/test files have SHA-256
`079bd933badbf03116dd80b01bd274c04b2bba7120f9caaf4993c4aff3bcdf98` using the same fingerprint method above.

The first hosted run on `b375414ab` passed the Content Studio API contract but
exposed extensionless imports in the shared phrase catalog under plain Node.
The release correction uses explicit `.js` specifiers and adds the existing
production-style Node ESM startup check to the unfiltered API command. This
ensures API authorization can be reached in the emitted server runtime.

The release also updates the Calendar tab/sidebar assertions to include the new
workspace. The Season write-ups scroll check now uses its existing one-pixel
right-edge rounding tolerance on both edges; CI measured a 0.03125-pixel left
edge difference. The same assertion already failed on main by 0.015625 pixels.

Known baseline failures were compared directly with the workflow on main
`3f4092b12d4436973d40df1e690bce583e948613`, not inferred from unrelated files:

| Existing failure | Main evidence |
| --- | --- |
| Calendar pressure-release cannot find synthetic Pluto–Lilith event | [Reader job](https://github.com/usrnmtkn/astrology-portal/actions/runs/36371637825/job/108769289771) |
| Calendar collective-release cannot find Mercury–Pluto and Saturn–Lilith events | [Reader job](https://github.com/usrnmtkn/astrology-portal/actions/runs/36371637825/job/108769289804) |
| Offline publication-cache assertion in app-loading-feedback | [Smoke job](https://github.com/usrnmtkn/astrology-portal/actions/runs/36371637825/job/108769289740) |
| Horoscope reader expects the old missing-reading message | [Prior release record](https://github.com/usrnmtkn/astrology-portal/pull/1079); test-only follow-up [#1080](https://github.com/usrnmtkn/astrology-portal/pull/1080) |

These are not reported as passing. Production deployment and acceptance results
are recorded on [PR #1081](https://github.com/usrnmtkn/astrology-portal/pull/1081)
when completed. All write tests remain isolated from production storage.
