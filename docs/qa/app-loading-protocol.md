# App loading laboratory protocol

`tldr-loading/v1` measures navigation through required rendered content, then
font readiness, for fixed synthetic fixtures. It supplements the existing You,
Friends, and Calendar tests; their budgets and definitions remain unchanged.

## Reproducible builds and services

Use an isolated checkout with its own `npm ci` dependencies and Playwright
Chromium (`npx playwright install chromium`). Build each revision
with identical configuration into a different absolute directory:

```sh
npm run build:knowledge
VITE_SUPABASE_URL=http://127.0.0.1:4260 \
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_loading_fixture \
VITE_SUPABASE_ANON_KEY= \
VITE_TLDRASTRO_API_URL=http://127.0.0.1:4260 \
VITE_ENABLE_NATAL_ASPECT_PATTERNS=true \
npm run build -w @tldr/web -- --outDir /private/tmp/loading-baseline-dist
```

Use the same command for the candidate with a different output directory.
The harness starts its own servers on loopback ports 4260, 4262, and 4263 and
fails if they are occupied. It never reuses an existing server. It hashes and
loads the complete build inventory before measurements so disk edits cannot
silently change one side mid-run. Retain the source revision for each artifact.

The service supplies a fictional session, a server-fetched profile, calculated
chart fixtures, and an explicit public ledger with no published overrides.
The real bundled corpus and Swiss Ephemeris worker still run in the browser.
Sky uses a precomputed response from the same engine; Calendar and supplemental
remote calculations deliberately exercise local fallback. These results cannot
be called production API or server-cold measurements. They do not measure live
publication-ledger or live content-row download cost.

Static assets and JSON use gzip. Hashed assets and ephemeris data use immutable
HTTP caching; other static files revalidate. No Playwright request routing is
used: routing would disable HTTP caching and invalidate reload comparisons.
Fresh contexts contain only explicit location/theme preferences and, for signed-in
scenarios, a synthetic session. No profile, natal chart, or manual-chart cache
is seeded. Reload retains only what the first visit naturally populated.
All HTTPS traffic is blocked by CDP; real accounts and generation services are
never called. The fixture refuses unimplemented API routes rather than
pretending they succeeded.

## Milestones and conditions

All timestamps begin at browser document navigation. `usable`, `content`, and
`fonts` are distinct. Content identity is hashed again one second after font
readiness; a late required-text change fails the attempt without moving its
timestamp. The observation window is not a proof against every later change.

| Scenario | Usable | Required content for this fixed fixture |
| --- | --- | --- |
| Sky | Navigation/menu and date control | Selected-day summary, all 14 placement cards, no busy reader |
| Calendar day | Calculated date controls | Existing reading mark, selected September 21 day, all five complete event passages, no busy reader |
| You transits | Verified fixture profile | Natal calculation, both daily summary and weekly reading, three aspect descriptions and 14 house-transit descriptions; no active reader loading state |
| You natal | Verified fixture profile | Three signature rows, 13 remaining body/angle rows, all five empty-house descriptions, no active reader loading state |
| Friends charts | Authorized rows or confirmed empty state | All 0, 5, or 100 expected rows; no active list loading state |

Saved-report availability and the social handle are independent enhancements,
excluded from required-text hashes. These fixed-fixture assertions are not a
general-purpose definition for every possible chart. An unknown-time profile
needs a separate contract; changing its expected row counts is not a substitute.

| Profile | Viewport | CPU multiplier | Latency | Download bytes/s | Upload bytes/s |
| --- | --- | ---: | ---: | ---: | ---: |
| desktop | 1440 × 1000 | 1 | 40 ms | 2,500,000 | 625,000 |
| mobile | 390 × 844 | 4 | 80 ms | 200,000 | 93,750 |
| adverse | 390 × 844 | 8 | 150 ms | 100,000 | 31,250 |

The browser is Chromium with a mobile-sized viewport, not a physical Android
or iOS device. Profile values, browser version, fixture hash, complete ledger
identity, and asset fingerprint are written into each result. The harness
records main-document resources, long tasks, layout shifts, worker request/reply
times, and fixture-server transfers (including worker assets). Server write
duration is not network-receive or worker-calculation duration.

```sh
# Ten observations per baseline cell; do not build or run other browser suites concurrently.
npm run qa:app-loading -- --baseline=/private/tmp/loading-baseline-dist \
  --out=/private/tmp/loading-baseline.json --runs=10

# Three alternating pairs diagnose a hypothesis; they cannot pass release gates.
npm run qa:app-loading -- --baseline=/private/tmp/loading-baseline-dist \
  --candidate=/private/tmp/loading-candidate-dist --out=/private/tmp/loading-diagnostic.json \
  --scenarios=you,you-natal --primary=you --runs=3

# Preserve every attempt in the final comparison, including failures and outliers.
npm run qa:app-loading -- --baseline=/private/tmp/loading-baseline-dist \
  --candidate=/private/tmp/loading-candidate-dist --out=/private/tmp/loading-comparison.json \
  --scenarios=you,you-natal --primary=you --runs=30
node scripts/summarize-app-loading.mjs /private/tmp/loading-comparison.json
npm run qa:app-loading:compare -- /private/tmp/loading-comparison.json
```

The measurement command exits nonzero if any attempt fails, including a
baseline attempt. It still saves the evidence. The comparison command exits
nonzero for invalid, inconclusive, or regressing results.

`--scenarios` also accepts `friends-empty` and `friends-large`. `--trace=true`
records diagnostic traces, which the comparison gate rejects as timing evidence.
The large-list fixture repeats one calculated chart with distinct synthetic row
IDs/names. It checks row-count/rendering behavior; its highly compressible payload
does not represent download cost for 100 different real charts.
The harness refuses to overwrite an existing result, records the planned count
and its own source fingerprint, and marks a batch complete only after all
attempts finish. The comparator rejects missing planned pairs, undeclared
samples, duplicate cells, and text changes across repeat visits or cache states.
Timing JSON and failure-text files use private filesystem permissions. Never upload session state,
real profile data, or raw production reader text as benchmark attachments.

## Acceptance and limits

The comparator requires at least 30 complete matched pairs per declared cell.
It alternates A/B order by pair. It reports a seeded, reproducible 95% paired
bootstrap interval of the median within-pair difference. The declared primary
cell must improve by at least 10% and at least 250 ms when the baseline is
2.5 seconds or longer, otherwise at least 50 ms. Both the median paired saving
and the difference of medians must meet that threshold, and the interval must
exclude zero improvement.

Every required cold/reload milestone independently blocks a candidate when its
regression exceeds `max(100 ms, 3%)`. A wide interval, missing milestone, failed
attempt, changed content/publication/build/fixture, mismatched profile, or fewer
than 30 pairs is not a pass. A baseline timeout cannot be silently discarded to
manufacture a speedup; failure-to-success improvements require a separate
reliability report and do not produce a latency-improvement claim.

The statistical result is only one release gate. Existing calculation parity,
publication/retirement, owner-copy, auth isolation, functional navigation, asset
recovery, bundle, privacy, CSS, and unfiltered Content Studio API checks still
apply. A new failure or content change blocks release regardless of timing.

Still outside this harness: live authenticated production data, field percentiles,
physical devices, Calendar week/month, expired-session and account-switch
stress, Friends detail completion and repair, offline recovery, route-to-route
input latency, and worker queue-versus-calculation attribution. Existing tests
cover parts of these flows; their passing results must not be relabeled as this
protocol's complete-content measurements. Production sampled telemetry is
unchanged until generalized readiness definitions have been verified.
