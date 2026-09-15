# Placement visit dates — 2026-09-14

The current Sky card and article header use the same calculated continuous
visit. The countdown uses that visit's exit. A sign residency with return
visits is shown separately as `Full residency in {sign}: …`, from the first
verified ingress to the final verified exit. Retrograde primary timing remains
station-to-station, with the full residency on the second line.

For Venus in Scorpio on September 14, 2026 (Eastern Time):

- Card: September 10–October 25, 2026.
- Article primary: September 10–October 25, 2026; countdown 41 days.
- Full residency: September 10, 2026–January 7, 2027.
- On December 10, the primary visit starts December 4; the full residency still
  starts September 10. The countdown is 28 days.

Calculated adapter metadata takes precedence over an embedded template date
line in the article header. Body `entryDate`/`exitDate` facts keep their existing
contract, including the final exit for residency prose. Source rows, approved
reader wording, publication state, ephemeris calculations and archive selection
are unchanged. The existing metadata component and shared typography tokens
render both date lines.

## Repeatable verification

- `node --import tsx scripts/test-sky-placement-date-consistency.mts`: all 14
  supported bodies plus Venus's return visit in New York, UTC and Tokyo;
  two Sun seasons with independent Swiss boundary checks; month, year and
  same-day formatting boundaries.
- `npm run test:event-dates`: Calendar/Sky shared times, civil dates, Sun
  season ingresses, midnight, year rollover and both DST transitions.
- `node --import tsx scripts/test-sky-placement-retrograde.mts`: complete
  direct/retrograde/archive copy and source/shipped-renderer parity.
- Fresh-build Playwright: `placement-visit-dates.spec.ts`,
  `sky-placement-dates.spec.ts`, `event-date-consistency.spec.ts`, and the
  `Rx placement card and article` cases in `sky-placement-retrograde.spec.ts`.
  Browser time zone is independent of selected location; mobile/desktop,
  light/dark, navigation, reload, countdowns, explicit current/final-exit
  variables, preserved opening/final prose, and matching metadata typography.
- Mandatory `npm run test:content-studio-api`, typecheck, CSS audit,
  `npm run qa:bundle`, staged privacy and built-asset privacy scans.

## Durable memory

`AGENTS.md` contains the cross-surface date/window rule. The technical owner
direction is recorded with task/date provenance in
`data/agent-memory/decisions.jsonl`; it grants no reader-wording approval.
Both paths already belong to the deployed source configuration. The memory
regression checks search, full detail, hashes and task provenance; the API suite
also checks source packaging, historical exclusions and access boundaries.
The September 11 technology review remains current; dependencies and renderer
patches are unchanged.

A production claim requires the main deployment to be Ready, the affected
browser cases to pass there, authenticated retrieval of this rule and its exact
source/body hashes, and anonymous API denial. Local notes and the Refresh
button do not update deployed repository memory.

## Existing unrelated gate failure

The broad `npm run test:content` suite stops at the protected natal-aspect hash
assertion in `scripts/test-natal-exact-copy-routing.mjs:49`. The assertion and
all its source/provenance inputs are unchanged from main. This is recorded
separately from the focused placement/date and mandatory API results.
