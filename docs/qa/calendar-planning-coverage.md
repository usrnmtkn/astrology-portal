# Monthly Calendar and subscription planning coverage

Implementation base: refreshed `origin/main` at `92c9f893e`, on
`codex/calendar-full-coverage-20261025`. Exact tested revisions, gate outcomes and
deployment receipts belong in the release pull request. This document describes
the implementation and acceptance contract; it does not approve new wording.

## Calculated coverage

- Calendar and ICS use the same exact-event calculation. The five major aspects
  now include Chiron and the Swiss Ephemeris True Node. Equivalent South Node
  contacts are calculated as the opposite end of that axis and displayed with
  one event identity. The nodes cannot produce aspects to their own axis.
- Signed crossings detect exact conjunctions and oppositions. Their unsigned
  separation touches, rather than crosses, the target angle.
- First and last quarter moons have their own subscription category. Existing
  New/Full Moon preferences retain their original meaning.
- VOC intervals run from the last major Moon aspect to the next calculated
  ingress. The existing Sun-through-Pluto definition is retained; Chiron, Lilith
  and the nodes do not silently change which aspects end a VOC period.
- All intervals overlapping a local civil day are retained, including short
  windows outside noon, windows across midnight/year boundaries and two windows
  separated by a sign change on the same day. Each interval carries its own sign.
- Adjacent UTC-year facts preserve local January 1 and December 31 coverage
  for subscribers ahead of or behind UTC.

## Daily planning and writing authority

The month view and selected day show the same dated Daily planning reading as
the ICS link. Activity windows use scoped planetary-hour affinities verified in
the [source audit](calendar-planetary-hours-source-audit.md): Venus for courtship;
Mercury for writing/trade, Jupiter for patrons/finance and Saturn for
property/land; Venus for art/music and Mercury for writing; Venus for leisure
under Rest. Rest does not claim a best sleep/recovery hour. The seven classical
rulers determine the hour sequence, with no outer-planet hours.
The selected location's sunrise-to-sunset and sunset-to-next-sunrise intervals
are each divided into twelve unequal hours. The weekday ruler begins at sunrise
and continues in Chaldean order. Predawn hours retain the previous planetary
day's ruler; local civil-date windows retain DST changes. Polar dates without
the required solar crossings show unavailable hours rather than invented times.
Calculation was checked against Gadbury's and Simotta's unequal-hour tables,
including all seven daylight/night starting rulers and an eight-hour-day
example. Sunrise/sunset also agree within one minute with two independent
US Naval Observatory date/location fixtures. Source locators, qualifications
and excluded inferences are recorded in the audit.

Subscriptions save the selected calendar location and time zone. Existing rows
receive no guessed coordinates; daily guidance requires a selected location.
Full-reading links preserve the saved location independently of the browser's
current location. Exact transits and VOC remain separate Sky context and do not
choose or rescore the planetary-hour windows.

Sky context selects complete eligible TLDR passages, not newly generated prose
or a favorable-day scoring system. Supportive and difficult contacts both remain
eligible. No Moon phase, sign or aspect alone guarantees a successful date,
project or outcome. An approved lunar context supplies shared context when no
eligible activity-specific passage exists; it is explicitly labeled Lunar
context. A shared source appears once below the hour windows. Missing eligible
sources stay unavailable. No generic replacement is written in React.

The feed reader retains the existing publication, retirement, exact-version and
source eligibility gates. This change creates no new approvals, changes no
published source wording and makes no provider calls. Editing an underlying
passage still uses its existing Content Studio workflow. This implementation
does not certify newly authored voice or authorize new activity-specific wording.

Daily planning includes complete passages in ICS. Other event descriptions keep
the existing three-sentence preview and full-reading link. Exact event times and
VOC start/end times use the subscription zone. Each daily planning entry is an
all-day local-date entry, with an exclusive next-date end.

## Subscription and transport

New subscriptions include all eleven available categories. Existing saved
subscriptions retain their selections; users enable the added categories in
their existing preferences without changing the URL. The additive migration
`20261026015340_calendar_planning_categories.sql` expands the category constraint
and adds nullable location fields with paired-coordinate and range checks.
It changes no stored selections, tokens, grants or RLS policies.

The complete two-year feed with all categories exceeds the buffered response
limit. The handler streams 64 KiB byte chunks with native Node
backpressure/error handling. It does not truncate the calendar to satisfy the
buffered response limit. HEAD, ETag and stable UID behavior are preserved.
Vercel documents [streaming for responses above the buffered limit](https://vercel.com/kb/guide/how-to-bypass-vercel-body-size-limit-serverless-functions).

## Verification

- `node --import tsx scripts/test-calendar-planning-coverage.mts`: independent
  Swiss checks on 2026 and 2027 contacts and quarter moons, VOC endpoint and
  no-later-aspect checks, short/two-window VOC coverage, local dates across DST
  and UTC+14, local year boundaries, all categories, stable UIDs, full streamed calendar and daily
  guidance source preservation. With the current clock, the feed has 730 daily
  entries across 2026–2027. The daily API reading and ICS description are
  compared in full.
- `node --import tsx scripts/test-calendar-subscriptions.mts`: actual handlers,
  emitted native ESM graph, isolated PostgreSQL migrations, publication and
  retirement, preferences, refresh, ETags, full reading links and access denial.
- Calendar API validation, aspect-retrograde publication, exact-copy routing,
  surface-event tests, web/server types, CSS/token audit, reader-copy boundary
  and the web/admin builds are checked separately.
- `tests/visual/calendar-subscriptions.spec.ts`: 19 cases cover
  fresh-build mobile/desktop,
  light/dark, month/day guidance, reload, full source text, heading typography,
  two VOC windows, category choices, real feed handlers, saved planetary-hour
  locations in full-reading links and existing owner flows.

| Acceptance criterion | Result and evidence |
| --- | --- |
| Month/day discovery and four activity labels | Fresh-build browser fixtures at 390 and 1440 px, light and dark |
| Heading hierarchy, existing typography and horizontal fit | Computed-style and rendered checks in all four variants |
| Saved subscription URL and preference persistence | Real-handler browser flows and isolated PostgreSQL checks |
| Loading, outage retry and unavailable copy | Browser fixtures; unavailable eligible copy does not produce replacement prose |
| Quarter moons, Chiron/node contacts and complete VOC intervals | Independent Swiss calculations and browser two-window case |
| ICS completeness, app parity and local date boundaries | Full-feed and actual-handler checks |
| Planetary hours | Unequal day/night hours, weekday/Chaldean order, predawn, DST, polar absence and saved-location links |
| Deployed migration, calendar UI and streamed response | Exact main deployment and production checks recorded in the release receipt |
| Native calendar import and refresh | Unverified; requires device checks |

The initial missing private ingress reference prerequisite was resolved from
the existing protected local source store, validating both complete bodies
against the registered SHA-256 values. All seven approved-voice-style checks
pass with the protection unchanged. Full API/release evidence must identify the
exact planetary-hours revision in the release pull request.
The private policy was read in place through `PROJECT_PRIVACY_POLICY_FILE`;
source and both public build privacy scans passed without copying the policy.

## Release boundary

Before release, pass the complete API
gate on the final revision, apply the additive migration to the confirmed
deployment database, then use the repository's main-branch release workflow.
Verify the deployed streamed feed and rendered calendar against the released
revision. Native Apple/Google calendar refresh and acceptance require their own
device checks; local browser tests are not evidence of those outcomes.
