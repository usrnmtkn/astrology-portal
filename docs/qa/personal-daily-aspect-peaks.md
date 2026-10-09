# Personal daily aspect peaks

Owner request: implement the daily aspect recommendation and make it a durable
rule, October 9, 2026, `thread:01a120fd-4144-7933-ab58-e9a5a2a762e9`.
Scope: You / Areas of Your Life and its aspect detail/report handoff.

## Behavior

- Exact contacts anywhere in the selected local date precede close applying
  contacts (1°), then close separating contacts whose exact pass was within the
  previous two local dates. Noon remains the reference for displayed orbs.
- The first four distinct events appear in the daily list. Opposite ends of a
  natal angle/node axis share one slot, with both complete available source
  units in the detail. No combined interpretive passage is authored.
- Other active slow contacts occupy up to four separate Long-term transits
  cards. Their primary dates describe the continuous contact. Multi-pass series
  ranges and all calculated exact passes appear in Key dates in the detail.
- Exact dates are Swiss Ephemeris roots, not orb/speed estimates. The daily
  search excludes an exact event at the following midnight, includes the last
  partial search interval on DST dates, and keeps early/late Moon events even
  if they are out of orb at noon. Search bounds are never displayed as dates.
- Asynchronous facts are keyed by chart, selected reference and time zone.
  Timing failures stay distinct from empty days and offer retry. Dates and
  date-slotted copy wait for calculated timing; individual cards hydrate as
  their calculations finish. Date/location changes invalidate old results.
- Daily report timing uses the verified exact event when applicable while
  retaining the selected day's reference in evidence. No new provider calls,
  editorial source edits or reader-content approvals are part of this change.

Shared calculation changes close the final partial residual-search interval,
avoid rounding midnight crossings into the preceding date, and use the stored
precise natal/transit longitudes rather than the rounded display degrees. Sky,
Calendar and Friends selection/UI behavior is not changed. Existing pass-engine,
report timing, daily Moon selection and date-consistency checks cover those
shared consumers.

## Verification

Run from the isolated checkout after `npm ci` and `npm run build:knowledge`:

```sh
npm run test:personal-daily-transits
npm run test:transit-pass-engine
node scripts/test-personal-report-timing.mjs
node scripts/test-daily-glance-selection.mjs
npm run test:event-dates
npm run typecheck
npm run qa:css-audit
npm run test:content-studio-api
PLAYWRIGHT_BASE_URL=http://127.0.0.1:4198 npx playwright test tests/visual/personal-daily-aspects.spec.ts --workers=1
```

The browser runner builds the current checkout and starts a fresh preview.
Fixtures use a synthetic birth profile and local Swiss calculations. Provider
and remote content responses are isolated fixtures. Cover desktop/mobile,
light/dark, populated/empty/error/retry states, opening full detail, reload and
date navigation. Compare the new section label's computed typography with the
existing House transits label and check horizontal overflow.

Calculation tests independently derive synthetic fixed targets using direct
Swiss Ephemeris calls on multiple dates. They check full-day discovery, exact
midnight ownership, DST, year/time-zone boundaries, retrograde repeat peaks,
axis grouping, minute precision, sorting and report timing outside the noon orb.

The memory rule is indexed directly from AGENTS.md; its companion decision
record preserves task provenance without approving reader wording. Verify
search/detail text and source hashes through `npm run test:agent-memory`.
Deployment and authenticated production verification are separate from these
local checks; do not infer production status from a successful local build.

## October 9 implementation verification

Tested as uncommitted changes on main revision
`f5eb6bed83a910681fade6e8aa0a974278c1e536`, branch
`codex/daily-aspect-peaks-current-20261009`, with its own `npm ci` dependencies
and local knowledge build. The patch applied cleanly over the intervening main
updates. Repository memory's required context was unchanged at this revision.

| Acceptance criterion | Result and evidence |
| --- | --- |
| Exact-day discovery, applying/recent-separating order and precise orbs | Passed `test:personal-daily-transits`, including direct Swiss reference calculations. |
| Midnight, DST, year and location boundaries; distinct retrograde peaks | Passed daily tests, `test:transit-pass-engine` and `test:event-dates`. |
| Equivalent axis contacts share one slot and retain both complete source units | Passed grouping and actual detail-renderer tests, including repeated paragraphs and original endings. |
| Daily report evidence retains an exact event outside the noon orb | Passed daily regression and `test-personal-report-timing.mjs`. |
| Shared Moon daily-summary selection remains independent | Passed `test-daily-glance-selection.mjs`. |
| Card/detail/reload/date navigation and empty/error/retry states | Passed six fresh-build browser cases across 1440px/390px and light/dark. |
| Established section-label role, order, typography and layout | Passed browser checks and `qa:css-audit`; screenshots inspected in both themes and widths. |
| Existing published source hydration and complete reader content | Passed Sky/You parity, personal transit/report hydration, composition and live-content wiring checks. |
| Types | Passed `typecheck`. |
| Required complete API contract suite | Passed unfiltered `test:content-studio-api`, including memory, Calendar subscriptions and rhetorical-admission tests. |
| Memory rule search/detail and provenance | Passed all 23 `test:agent-memory` tests within the API suite; the new AGENTS.md section is included with its exact source/body hashes and task provenance. |
| Web bundle limits | Passed after the measured aggregate-only allocation below. |
| Complete content suite | Failed on a pre-existing static report-fixture date mismatch, described below. |
| Production and authenticated deployed memory | Unverified; this task has not deployed the change. |

`test:content` reached `test-report-judge-v3.mjs`, where its regression manifest
expects April 14, 2026 and the frozen facts contain April 17. Reading both inputs
directly from the unchanged base Git objects reproduces the discrepancy, with
13 conflicting fixture references in total. This is independent of the daily
calculations. The proof is retained locally in
`test-results/report-fixture-baseline-mismatch.json`. The suite is not reported
as passed, and these historical fixtures or source passages were not rewritten.

The first broad checks lacked private report evidence. Subsequent checks used
the existing local protected store after hash verification, provisioned only in
ignored `.private-documents` storage. No protected document bodies were logged
or added to Git. Browser fixtures use synthetic profiles and isolated responses;
they do not verify a user's production account or authorize paid generation.

Matched independent builds of unchanged main and this feature used separate
`npm ci` installations, local knowledge builds, natal-aspect-patterns enabled,
and the same public visual-smoke Supabase placeholders. Aggregate JavaScript
gzip increases from 3,552,713 to 3,555,953 bytes (+3,240), across the same 224
files. The aggregate allowance increases by 3,500 bytes to 3,557,250, leaving
1,297 measured bytes. Startup, individual chunk, CSS, lazy-loading and runtime
limits are unchanged; `qa:bundle` passes. Dependency versions and source prose remain unchanged. Exact measurements are retained in
`test-results/daily-peaks-bundle-comparison.json`.

## Release request

The owner requested “please merge and push live” in the same task on October 9.
The release is prepared in a fresh clone of the cleaned `astrology-portal`
repository on `codex/daily-aspect-peaks-release-20261009`, starting at the same
`f5eb6bed83a910681fade6e8aa0a974278c1e536` main revision. It uses its own
dependencies, privacy hooks and retired-history guard. The Visual smoke reader
suite now runs the daily peak browser cases; its first shard also runs the
transit pass-engine calculations. CI, merge SHA and production verification
are recorded with the release PR, rather than inferred from these local checks.
