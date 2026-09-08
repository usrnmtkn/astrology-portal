# App reader and Content Studio QA — September 8, 2026

Started from refreshed `origin/main` at `1319b715` on
`codex/app-live-content-qa`. This follows the database recovery in PR #705.

## Fixes

- Friends now distinguishes a missing or revoked session from a service outage.
  Missing sessions offer sign-in; database and Auth service failures retain
  retry. Explicit login opens even when a cached local profile exists, returns
  to Friends after authentication, and preserves an existing account's chart.
- Calendar requests and renders published, sign-independent Studio aspect
  passages when an event has the planet pair and aspect but lacks sign metadata.
  Sign-specific generated passages still require both signs and fact validation.
- You and Friends use the same current residence pass for a house-transit card's
  date range and duration. Previously the duration could describe all passes
  while the adjacent dates described only the current pass.
- Local browser builds enable the synthetic content service used by CI so
  publication hydration tests actually exercise network loading. Explicit offline
  configurations remain offline.

No authored astrology prose, approval state, database permissions, or production
content records are changed by this patch.

## Verification

- Reader release pass: 141 cases across loading feedback, Calendar collective
  and pressure copy, offline publication/retirement, Sky placement dates,
  aspects, and client routes. The initial run passed 138; the remaining three
  passed targeted reruns after correcting the test environment and the expected
  sign-in action. Fresh builds were used throughout.
- Recovery browser suite: nine cases passed, including missing/rejected session
  login round trips, Auth outage versus sign-in classification, focus/online
  recovery, all 14 calculated house transits during a content outage, and
  Calendar skeleton completion and selected-date persistence.
- Studio owner access: five cases passed, including storage timeout/retry,
  retained emergency access, and return to the selected Studio route after login.
- Daily Sky Studio: 12 cases passed, including published preview, repeat save and
  publish, Live status, retirement, and dedicated ingress copy.
- Sky placement composition: 11 cases passed, including retrograde sources,
  section editing/reordering/skipping, repeated publication, narrow screens,
  both themes, and editing during inventory loading.
- Broader Studio CRUD pass: 75 cases passed, including scoped inventory loading,
  creation/editing, conflict recovery, publication, retirement, Natal Empty
  Houses, exact planet/sign/motion filters, and reader destination links.
- Friends sign-in notices retain the existing connection-error heading style:
  computed typography, margins, casing, and alignment match at 1440 and 390 px
  in light/dark themes. Heading order, overflow, and rendered screenshots were
  checked; all four sign-in variants passed again after adding these checks.
- Typecheck, CSS/token audit, web bundle budget, startup/performance contracts,
  Friends database/loading contracts, publication lifecycle/offline retirement,
  content wiring, and full-detail copy integrity checks passed.
- Focused Calendar key/hydration and transit-date tests passed. The Calendar
  regression checks the complete published owner revision before and after a
  reload and rejects the superseded opening.

## Limits

Browser write operations use synthetic accounts and isolated fixtures. Actual
private Studio inventory and the owner's Circle require an authenticated owner
session for a final production check. Public reader rendering and database
health are checked independently. A healthy status and this QA pass do not
guarantee that all future outages or unrelated bugs are prevented.

Production deployment and final smoke results are recorded after merging the
verified commit into main; a local pass alone is not a deployment claim.
