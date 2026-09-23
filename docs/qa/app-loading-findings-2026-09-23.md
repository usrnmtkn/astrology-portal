# App loading investigation — September 23, 2026

This investigation uses main revision
`e049ca31f761cf3639f73f93f54661e49799417d`. It implements the laboratory
measurement and regression gates in [the protocol](app-loading-protocol.md),
and tests a narrowly scoped change to uncached You startup. It does not establish
an app-wide improvement or a production performance result.

The [baseline results](app-loading-results-2026-09-23.md) contain 200 attempts,
ten per desktop/mobile and fresh/reload cell. Twenty attempts failed: all ten
mobile cold You visits and all ten mobile cold natal visits. Successful
attempts retained identical rendered text within each route/profile.

## Findings and decisions

### 1. Uncached You can exhaust its chart deadline while downloading prose

**High severity; reproduced in a controlled mobile fixture.**
`App.tsx` starts the empty-house and deferred fallback packages after the profile
paints. A fresh account still needs the Swiss Ephemeris runtime and data before
its natal calculation can finish. Three prose chunks transfer approximately
896 KB compressed while that calculation is pending. The ephemeris data and
WASM add approximately 2.13 MB compressed. At the protocol's 200,000 bytes/s,
this competition can consume the existing 15-second chart deadline.

The existing fast You tests seed a calculated natal snapshot. Their profile
paint budget does not detect this first-calculation failure. The new laboratory
fixture fetches a synthetic profile and seeds no chart or profile cache.

**Implemented candidate:** wait for `profileNatalCalculationStatus === "ready"`
before starting those two prose loaders on You. The existing cache applies a
ready natal snapshot immediately. The saved profile remains visible, and the
calculation deadline, inputs, publication checks, and prose are unchanged.
A browser regression holds the real WASM request and checks that the competing
packages have not started, then releases it and checks that the chart and
deferred requests complete.

The first candidate avoided calculation timeouts but failed the stability check:
the weekly reading briefly returned to loading when the deferred bundle arrived.
A sequential weekly-start check removed that flash but added about 160 ms to
desktop cold loading, exceeding the regression tolerance. It was replaced.

The current candidate starts weekly calculation and required prose loading
together, then assembles the reading only after both finish. Results carry the
account, location, date, and content-version identity that requested them; an
earlier result cannot render as ready before an effect resets it. There is no
new timer or deadline extension. The browser regression then opens Transits and
checks that both daily and weekly readings appear, guarding against dependency
deadlocks and omissions. All earlier iterations remain separate evidence.

The full-text comparison also caught a missing daily reading: its effect ran
before the deferred source rows arrived but did not depend on the content
version. The candidate adds that dependency so installation regenerates the
same existing reading. No passage was edited. The preceding iteration was
rejected despite successful timing marks because its rendered text differed.

The final three-pair diagnostic completed all 24 candidate visits with matching
complete reading text wherever the baseline completed. The baseline failed all
six cold mobile visits. Median candidate complete-content times were 22.88
seconds for cold mobile You and 19.29 seconds for cold mobile natal. These remain
long waits; the comparison does not meet the 30-pair release gate.

This ordering does not remove the cost of downloading ephemeris data. A separate
one-pair adverse diagnostic at 100,000 bytes/s timed out on both fresh load and
reload. The candidate does not resolve that slower condition. Neither worker
compute time nor queue time has been isolated from initialization.

### 2. Existing readiness checks can precede required text

**High severity for measurement validity; reproduced in browser diagnostics.**
Calendar's `calendar.reading` measurement finishes before the V9 and exact Sky
registry modules have supplied the final passages. You natal can show empty-house
rows before their descriptions arrive. You transits can show cards before their
aspect and house-transit descriptions arrive.

The new fixed-fixture observer waits for the required passage counts and checks
the rendered text again after font readiness. The comparator rejects changed
text across matched candidates, repeat visits, and cache states. These checks
do not change production telemetry or claim generalized readiness for every
possible chart. Unknown-time charts and other Calendar views need their own
completion contracts.

### 3. Parallelizing Calendar's remaining content downloads caused timeouts

**Rejected experiment.** Calendar currently loads facts, then its fallback
packages, then V9/registry modules. Starting the content modules together and
including all of them in the reading barrier appeared to remove a serial
dependency, but the three-pair diagnostic produced three new mobile reading
timeouts. Baseline mobile fresh attempts completed at a median of 23.86 seconds;
desktop fresh medians were approximately 2.36 seconds on both sides. The change
was removed. No deadline was extended and no losing samples were discarded.

Further Calendar work needs a smaller selected-content dependency or a separately
measured server path. Broad parallel loading is not justified by this experiment.

### 4. A warm-load gain cannot justify a cold-load regression

The comparison tool treats cold and reload milestones independently. It retains
failed attempts, requires the planned pairs to be present, and checks the frozen
network/CPU settings, build identities, fixture, complete publication identity,
content hashes, and practical/statistical thresholds. Synthetic regression tests
include the earlier pattern of faster reloads paired with a 370 ms cold slowdown.
That experiment is blocked.

### 5. Sky still pays for several large content and font transfers

The first controlled mobile baseline request downloaded approximately 149 KB of
canonical Sky rows, 147 KB of core fallback JavaScript, 138 KB of placement
fallback JavaScript, and 132 KB of Newsreader. The page made no worker requests
in that scenario. Three observed main-thread long tasks totaled approximately
405 ms, with a maximum of 211 ms. This is diagnostic evidence of substantial
asset cost, not proof that any one asset can be removed or that interaction
latency is acceptable. Required owner copy and publication checks remain
constraints on splitting or eliminating those transfers.

### 6. Missing social-chart data can start calculation outside You

**Code-path finding; impact not measured.** The natal calculation effect in
`App.tsx` permits work when `ownSocialProfile?.hasNatalChart === false`, even
when the active route would otherwise skip that calculation. The anonymous Sky
fixture does not exercise that state. The synthetic account's social row omits
`natal_chart`, which the service maps to a missing social chart; it must not be
described as a fully warmed social account. Compare signed-in Sky/Friends with
and without that social chart to isolate the effect. Deferring that backfill may
affect social-feature readiness and needs its own correctness tests.

## Verification performed

- Fresh production build and TypeScript check.
- You/Friends browser loading suites: 16 passed, including uncached calculation
  ordering, saved-profile paint, warm navigation, Friends repair and Synastry.
- Eight additional candidate-only visits passed for empty and 100-row synthetic
  Friends lists across desktop/mobile and fresh/reload. These are single-run
  diagnostics, not a performance comparison.
- Full `npm run test:performance-contracts`, including deferred-source parity.
- Full unfiltered `npm run test:content-studio-api`.
- `npm run qa:bundle`, `npm run qa:css-audit`, and the built public-asset privacy
  scan.

An additional `node scripts/test-weekly-horoscope-assembly.mjs` run fails at
line 1104 on the standalone aspect-copy expectation. The identical assertion
and actual text also fail with the original, unchanged weekly service from
`e049ca31`. The candidate source was restored exactly after that control run.
The expected wording was not changed. This is an inherited failure, not a
passing test, and remains a release blocker.

The first version of the new functional test incorrectly expected a signatures
placeholder even though its profile fixture already has saved signatures. It
was corrected to assert the pending chart-calculation region; the final browser
suites above passed. Initial measurement-development runs with a broken observer
or incorrect CORS configuration are excluded from baseline evidence, and remain
separate diagnostic files. This does not exclude application failures from the
final measurement batches.

## Evidence boundaries

The fixture uses Chromium, gzip, synthetic authentication and account data,
the bundled corpus, and real browser-side Swiss Ephemeris. Sky's service response
is precomputed from the same engine. Calendar's service and supplemental remote
calculations deliberately fail into the local path. The public ledger contains
an explicit version sentinel and no live overrides. These are repeatable local
experiments, not production backend or publication-transfer measurements.

Saved-report availability and the social handle are independent enhancements,
excluded from required reader-text hashes. A one-second observation after the
font mark detects late changes in that window; it is not proof of permanent
stability. Worker request/reply times include initialization and queueing.
Server transfer durations describe server writes, not browser receipt.

Reload follows the first attempt's one-second observation window, including
after a timeout. It retains whatever that attempt actually downloaded; it does
not promise a fully warm calculation cache. A failed baseline visit and a
successful candidate visit can leave different cache contents. Report that
reliability difference instead of attributing every reload saving to faster
execution on equivalent warm data.

## Scope still requiring evidence

- Production cold/reload measurements on the deployed revision, including live
  publication and content-row payloads.
- Calendar week/month and successful server calculations, separate from the
  selected-day local fallback measured here.
- Complete Friends detail content for every tab, saved-report retrieval, and
  shared reader routes. Existing functional/performance tests remain separate
  evidence; they do not satisfy the new complete-content protocol automatically.
- Expired sessions, account switches during loading, rapid cross-route/date/tab
  changes, offline recovery, physical Android/iOS, and field percentiles.
- A passing candidate comparison with at least 30 matched pairs. A baseline
  timeout has no successful latency to compare; fixing it requires a reliability
  report and cannot be labeled a percentage speedup.

## Release status

The candidate is not approved by the new performance gate and has not been
deployed. Its adverse-condition diagnostic still fails, and the inherited
weekly-copy assertion remains unresolved. Functional and performance-contract checks passing does not override
an inconclusive latency comparison. Raw timing records and rejected experiment
artifacts remain private; only synthetic aggregate measurements belong here.
