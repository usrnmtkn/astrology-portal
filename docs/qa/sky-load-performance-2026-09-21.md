# Sky load performance — 2026-09-21

Release candidate: the owner authorized commit, merge to main and live deployment in task `01a0c4f7-25c8-7940-aa8f-183716960f8e` on September 21. The patch is now applied to a fresh clone on branch `codex/sky-load-release-20260921`, based on refreshed main `a05a04bce6da77dde37a4fdd368e34dd9df228d8`. The latest Studio change integrates without a source conflict; all 19 runtime/configuration files other than `package.json` are byte-identical to the verified preview. The package-script difference retains main's new Studio inventory test.

Latest verified [preview](https://tldrastro-gs0q1c1ec-usrnmtkns-projects.vercel.app/?date=2026-09-21#sky): **9.56 s cold / 3.71 s reload** mobile medians, with all ten runs below the provisional 10 s / 4 s targets. Complete text matches the previous preview. These are controlled lab results, not production percentiles.

The two stale exact-copy assertions are reconciled against existing approval evidence. No reader prose, approval records or source manifests changed. Exact-head release checks and production deployment evidence are recorded on the release PR. Earlier sections below preserve their historical status and limitations.

## First phase changes

- Share in-flight Sky source preparation across initial publication notifications. Revalidate on subsequent requests and after a publication identity changes; keep bounded retries and the existing source gate.
- Fetch the Sky/shared portion of the core overlay, with a separate revision cache and runtime overlay. Preserve station/week-opening passages and shared fallback sources even when their catalog surface is personal. A full inventory supersedes the partial overlay; switching back to Sky cannot erase personal rows.
- Reserve the complete nightly snapshot for recovery instead of downloading it on every successful live Sky visit.
- Defer natal inventory reads until You or the relevant Friends reader opens. Leave Daily Sky source loading with `PublishedSkySummary` instead of also requesting its entire catalog in the generic Sky loader.
- Start the eight-second content-query deadline after publication resolution, so the publication lookup does not consume the content query's budget.

No authored content, calculations, styling, or layout changed. The summary and all 14 cards still reveal together. The existing residency source assertion was updated to include the fourth registry argument already present on the base revision; no content fingerprint was changed.

## First phase measurement

Two production builds from the same base revision, with and without this patch, used identical anonymous public reader configuration. Owned Vite previews used the existing gzip preview plugin and proxied `/api` to the public deployment. Desktop: Chromium, 1440×1000, no CPU/network throttling, public New York location, `/?date=2026-09-21#sky`. Five fresh contexts, each followed by one reload retaining browser storage. Local preview HTTP cache behavior differs from Vercel; these are comparative lab measurements, not production p75 or a speed guarantee.

The measured endpoint is a visible resolved Daily Sky summary plus 14 resolved cards, no busy reading layout and no error alert. An error is a failure, never a fast load. The chart appearing alone does not satisfy the endpoint. The harness records shell/chart/reading times, worker timing, requests, long tasks, shifts and rendered text.

| Desktop complete reading | Baseline median | Candidate median | Reduction |
| --- | ---: | ---: | ---: |
| Cold visit | 6.09 s | 3.41 s | 44% |
| Reload | 5.39 s | 2.18 s | 59% |

The cold core-inventory request count fell from eight pages to two; the nightly-snapshot request fell from one to zero. The checked-in snapshot contains 3,867 core-provider rows, of which 1,278 belong to the Sky/shared scope. Every existing live override for the shipped eager Sky dependencies survives the scope filter.

Before/after summary and card prose matched. Full card text differed only in the Moon's changing angular minute during the real-time observation. Layout-shift scores were zero in the measured desktop runs. These traces are anonymous and stored outside Git under `/private/tmp/sky-performance-*.json`; optional Playwright traces also remain outside Git.

Reproduce against a fresh owned production preview configured for the same public content service:

```sh
SKY_PERF_URL=http://127.0.0.1:PORT \
SKY_PERF_DATE=2026-09-21 SKY_PERF_RUNS=5 SKY_PERF_PROFILES=desktop \
SKY_PERF_OUT=/tmp/sky-load-results.json node scripts/measure-sky-loading.mjs
```

Use `SKY_PERF_PROFILES=mobile` for the 390×844, 4× CPU, 80 ms latency, 1.6 Mbps download / 750 kbps upload stress profile. `SKY_PERF_TRACE=1` enables optional trace files. Use an empty anonymous browser context; do not copy a user session.

## Limits and release checks

The first phase failed the 1.6 Mbps mobile stress profile before a usable reading. This prompted the second phase below. Those failures are not performance wins.

The full `npm run test:content` prerequisite fails on the existing natal-aspect fingerprint in `scripts/test-natal-exact-copy-routing.mjs:49`: expected `087d8486…`, actual `7469bac8…`. The protected source file is byte-identical to the base commit. Preserve this guard; resolve its provenance separately before release.

First-phase checks passed:

- Production build and typecheck.
- `npm run test:content-studio-api` (full suite), `npm run test:performance-contracts`, CSS audits, reader-copy boundary, and source/public-asset privacy checks.
- 13 Sky browser regressions; seven changed-build repeats cover both widths/themes, request scope, publication recovery and retry. Final code-size cleanup also passes the source/caching tests and a fresh cold/reload/article-return/revalidation browser check.
- Daily Sky summary suite, authored-verbatim checks, Sky placement regressions and personalized composition checks.
- New executable regressions cover coalescing, revalidation, bounded publication-race retries, missing sources, offline recovery, scoped cache isolation, cross-page overlay preservation, and content deadlines beginning after publication resolution.

Additional existing failures are recorded rather than suppressed: `test-fallback-package-cache-contract.mjs:93` expects a `ProfileView` prop within an obsolete 240-character source window (also false on the base revision), and `test-fallback-refresh-wiring.mjs:326` expects old authored wording with unchanged source/built resolver inputs. Neither failure was repaired by altering prose or weakening its expected content.

## Second phase: slow mobile

- Added an exact-input `/api/sky` endpoint using the same Swiss Ephemeris engine as the browser and Calendar. It returns all 14 positions, timing fields, aspects, provenance and the selected local day's events. The client rejects mismatched timestamps, locations, calculation versions, incomplete timing and invalid provenance. Identical inputs share only their in-flight response.
- Successful initial loads avoid the browser's approximately 1.87 MB compressed ephemeris data. An eight-second API deadline retains the identical-input local worker fallback. The server allows 15 seconds; an observed first hosted request took 4.73 seconds, too close to the initial five-second client deadline.
- The list requests selected planet/sign and combined-node publications, preserving full source bodies. Full article and house inventories load on opening a detail. A changed sign, changed publication timestamp or retirement cannot reuse obsolete cached prose.
- Narrowed the initial shared inventory and vocabulary query, overlapped bundled-source loading with calculations, removed duplicate aspect/catalog requests, and used supplied daily events immediately instead of an extra state/render cycle.
- Added content-addressed astronomy files. Their hash matches the emitted bytes; the earlier hosted preview returns `Cache-Control: public, max-age=31536000, immutable` for the versioned data file.

No owner-authored source rows or templates changed. No approximation, date rounding, Mean Node or Mean Lilith substitution was introduced. The current base also includes main's restored Moon ingress event feed.

### Hosted pilot and final measurements

An earlier [Sky performance pilot](https://tldrastro-omuoklh6y-usrnmtkns-projects.vercel.app) deployed successfully from base `79f22c148`. Its API returned 14 positions, eight selected-day events and Swiss flags 258. One fresh anonymous mobile context and reload, using the documented 4× CPU / 1.6 Mbps profile, measured **10.17 seconds cold and 5.81 seconds warm**, with no reader error, page errors or worker requests. This was a pilot, not five-run acceptance or production p75. It did **not** meet the provisional <10-second cold / <4-second warm targets.

The pilot predates the combined-node selection fix, immediate daily-event rendering, eight-second API deadline and latest main integration. A first pilot using Playwright's clock API also shifted the performance time origin across reloads; that pilot was discarded. The harness now freezes only Date when `SKY_PERF_INSTANT` is requested, preserving native navigation/performance timing. Preview access cookies remain in a private temporary file and never enter measurement output or Git.

The owner explicitly authorized the source upload and preview tests on September 21 in task `01a0c4f7-25c8-7940-aa8f-183716960f8e` ("yes, you may. please proceed"). The approved runtime-source fingerprint was rechecked before upload. Deployment `dpl_5tA1mzWtmZfoCFek2dQ5XReiy3Ff` reached **READY** on the existing `usrnmtkns-projects/tldrastro` project. [Open the verified preview](https://tldrastro-1t7bqywkj-usrnmtkns-projects.vercel.app/?date=2026-09-21#sky). Production is unchanged.

Five fresh anonymous browser contexts, each followed by a reload, exercised the final hosted build under the same mobile stress profile. Each run used September 21 at 16:00 UTC and the synthetic New York location, without changing native performance timing.

| Complete hosted reading | Median | Slowest | Failed loads |
| --- | ---: | ---: | ---: |
| Cold browser visit | 10.53 s | 11.50 s | 0/5 |
| Reload with browser storage | 5.89 s | 5.99 s | 0/5 |

All ten runs rendered the resolved summary and 14 cards without page errors, worker requests or astronomy-file downloads. Measured layout shifts were zero, and the captured summary/card prose hashes matched across runs. The provisional <10-second cold / <4-second reload targets remain **unmet**. Cold means a fresh browser context, not five forcibly restarted server instances. These are laboratory timings, not production p75. There is no simultaneous hosted production baseline from which to calculate a percentage improvement.

The trace still shows work after assets are cached. A representative reload has four sequential publication-ledger pages (about 0.36–0.40 seconds each), a 2.61-second Sky request, and three long main-thread tasks of 664, 609 and 1,212 ms. These can overlap; do not add them as independent contributions or attribute the long tasks without a CPU profile. Further optimization must preserve the current-publication and full-copy gates.

Hosted verification also passed exact positions, aspects, timing fields, placement aspect facts, Moon status, daylight and selected-day events against the local shared ephemeris for September 21/New York, March 27/Tokyo and November 1/New York across DST. Those dates returned 14 positions each and 9, 6 and 13 events respectively. True Node, True Lilith, Swiss provenance and private/no-store API headers were retained. The versioned data file matched the source bytes and returned the immutable cache header. A fresh mobile flow successfully opened and closed the Sun article and changed from September 21/Sun in Virgo to September 24/Sun in Libra, with no page errors.

The final checkout also passed five cold and five warm local mobile stress loads against a fresh gzip preview and the actual local API, with anonymous live content reads. Median complete reading: **10.54 seconds cold / 8.25 seconds reload**; maximum: 11.08 / 8.32 seconds. All ten runs had zero reader/page errors and zero worker requests; rendered summary/card prose matched across all runs at the fixed instant. This local preview revalidates static assets and has no Vercel function cold start, so these results do not replace hosted cache/cold-start acceptance. The sanitized measurements and exact runtime-source fingerprint are in the companion JSON artifact.

### Second-phase verification

- Full `npm run test:content-studio-api` passed after integration onto `cf29be0e1`.
- Actual Sky handler tests passed for September 21, March 27 and the November 1 DST transition, using New York and Tokyo. They compare complete timing and event payloads with the shared engine plus direct Swiss positions, and exercise invalid inputs, corrupt provenance, duplicate-request coalescing and API-failure fallback.
- Performance contracts, scoped-cache/publication tests, typecheck, CSS audit and privacy checks passed. Publication tests cover combined nodes, changing signs, unchanged cached rows, exact timestamp changes, retirement and incomplete successful responses.
- Thirteen fresh-build browser regressions passed before the final main integration: both widths/themes, API success without WASM downloads, complete first reveal, reload, article return, publication revalidation/retirement, failed-read Retry and full/trimmed ephemeris parity. Four additional tests passed from a fresh build on the integrated base: mobile light/dark initial API/reload/article/revalidation flows, known-publication failure and Retry, and trimmed/full Swiss parity.

### Byte cost and release boundary

The source-selection and API coordination logic intentionally costs a small amount of client code. The final public-reader build passes the budgets at 458.6 kB app-boot and 511.3 kB reader-boot gzip. Each cap is allocated 1,500 bytes above main (457,500 → 459,000 and 510,250 → 511,750); other caps remain unchanged. No bytes were moved to an immediately fetched chunk to disguise this cost.

The protected-copy fingerprint failure above still blocks the full content gate. No commit, merge or production deployment was made. Production must follow the repository's main-branch Git deployment path after all release gates are satisfied.

## Continuation: CPU profile, parallel ledger, and exact day events

The hosted CPU sample on `tldrastro-1t7bqywkj` (one cold/reload pair,
4× CPU and the same 1.6 Mbps/80 ms profile) located the repeated source-key
classification in `createPublishedSkyReader` and substantial canvas drawing in
`thinking-orbs`. The cold sample attributed about 2.0 seconds of self time to
one canvas drawing callback; the warm sample attributed about 1.8 seconds to
season-key classification helpers across their call sites. Sampling is diagnostic,
not a separate timing baseline or proof that all that time lies on the critical path.

The reader now rejects unversioned rows before classifying their keys. A monotonic
publication generation replaces serialization of all publication records for every
card; current row identity, timestamp, approval, and retirement checks still run.
A regression checks that unversioned keys are not inspected, repeated renders are
identical, and an in-place eligibility change still fails closed. The loader keeps
the same orbit artwork and clock speed, drawing at most 30 frames per second.

Publication reads use four concurrent half-open key ranges, each independently
keyset-paginated. All ranges must finish and validate before installation. They
cover future key families as well as current keys and preserve the last complete
ledger after failures. The actual loader returned all 3,944 public records exactly
matching a sequential reference read. Synthetic regressions cover range boundaries,
2,010 extra records in one range, concurrent callers, failed later pages, invalid
records and non-advancing cursors. The Supabase changelog and current
[range-filter documentation](https://supabase.com/docs/reference/javascript/using-filters-gte)
were checked on September 21; no database schema or policy changed.

The Sky API now obtains the selected day's events from the same week event scan
without computing seven days of calendar presentation facts. Search boundaries,
root searches, Moon ingresses, station/retrograde context and ordering are shared
with Calendar. A bounded 12-week in-process event cache uses exact week endpoints
and the selected timezone; placement snapshots are still calculated at the exact
requested instant. Local diagnostics measured 612 ms for the complete week versus
269 ms for the events-only path; these are component timings, not hosted gains.

### Protected-copy fingerprint reconciliation

The 231 non-V15 natal-aspect rows produce `7469bac8e7742fe8e0a31ec8e002d8cca923e238fa75d226c60918d8e1784789`
in current `cf29be0e1`, in `6c49da493f26cb252f040aac547e925a51c0714f` (the commit
introducing the `087d8486…` assertion), and in that commit's parent. The projected
rows are identical across those revisions. This history establishes the existing
mismatch; it does not alone establish approval.

The separate approval audit verified all 231 current bodies byte-for-byte against
their recorded approved sources: 78 individual Lilith approval payloads and 153
rows in the locked V13 owner-approved matrix. All 231 recomputed payload hashes
match the serving rows' approval hashes. The test now performs these independent
checks (source key, exact body, owner-authored/approved state, approval date and
payload hash) and pins the verified aggregate fingerprint. Reader copy, approval
records and source manifests are unchanged. The exact-copy test passes; this is
not a claim that the entire content suite passes.

The restarted full content prerequisite gets past the repaired natal check and
stops at `scripts/test-calendar-exact-sky-aspect-routing.mjs:114` for
`sky.moon.sextile.lilith`. Direct reads of unchanged `cf29be0e1` Git objects
reproduce the mismatch: the stored `{summary, body}` hashes to
`03c4f120eb0e0245481f2f7439a2a08cb1058014ec8631025b7969a41689d465`, while the
current-owner-payload fixture hashes to
`450b45fe62c42f730a1c69caede10aaae8809fae5c4511d517974dd3420363c7`.
Both source files and that assertion remain unchanged. Resolving their approval
relationship is separate from the Sky loading patch; the full content suite is
still blocked. The two older contract failures recorded above were not waived.

### Final continuation verification

Deployment `dpl_5SVauzpBfaM7G5VA3A44SghsGY1w` is READY. Its 20-file runtime
fingerprint is `18e13b9f763c7b441f222b3fb6dbb56710648dee7a766431dd223fe9a502b397`.
Branch `codex/sky-load-performance-20260921` remains uncommitted on `cf29be0e1`,
0 ahead / 0 behind freshly fetched `origin/main`.

| Mobile complete reading | Prior preview median | New median | New slowest |
| --- | ---: | ---: | ---: |
| Cold browser | 10.53 s | 9.56 s | 9.75 s |
| Reload | 5.89 s | 3.71 s | 3.77 s |

Five cold/reload pairs used the same 390×844 viewport, 4× CPU slowdown, 80 ms
latency, 1.6 Mbps download and 750 kbps upload. All ten succeeded with zero page
errors, worker requests, astronomy downloads or layout shift. Summary prose and
complete card text hashes match the previous hosted candidate exactly. The longest
recorded task fell from 1,239 ms to 196 ms. These are small-sample controlled results,
not field percentiles; a cold browser does not force a fresh function instance.

The separate CPU profile no longer places season-key classification among the
ten largest self-time entries. The orb's leading drawing callback fell from
1,992 to 443 ms cold and 695 to 124 ms on reload in the two diagnostic samples.
Those profiles are excluded from the timing cohort.

The final deployed API matched every tested position, aspect, placement-aspect
fact, Moon status, daylight and selected-day event against the shared engine on
September 21/New York, March 27/Tokyo and November 1/New York (DST). True Node,
True Lilith, no-store responses, immutable astronomy asset bytes/headers and the
mobile article → close → date/sign-change flow passed. The mobile screenshot was
visually inspected.

Local validation: final-source Content Studio API suite, performance contracts,
actual Sky handler and direct Swiss checks, Calendar event/timezone regressions,
publication and source-eligibility regressions, web typecheck/build, bundle budget,
CSS audits and privacy scans passed. Fifteen browser cases passed for mobile/desktop,
light/dark, animation/reduced motion, layout/reload/article/revalidation and
publication authority; three mobile cases were repeated from the final fresh build.
The bundle limits were not raised in this continuation. The full content suite
remains blocked as detailed above. Production has not changed.

## Release preflight on current main

The fresh clone has its own `npm ci` dependencies, neutral commit identity, staged
privacy hook, and full-ancestry retired-history push guard. The previous worktree
and its push protection are untouched. Source content and approvals have no diff
against current main.

The Calendar mismatch was an omitted supersession in one test. Main commit
`ae45f2e8260e18e907fe017a7bd998794a00e40b` already installed the September 20
Moon sextile Lilith replacement and updated the two other collective-release
contracts. The exact-routing test now verifies the existing replacement's owner
state, content key, complete payload and summary/body hashes, plus its exact
superseded historical payload. The historical projection remains unchanged and
its hash checks still run. All 379 projected records / 758 directional routes
pass, as does the dedicated Moon sextile Lilith approval regression.

Main's existing CI failures are recorded for comparison: Social friends security
fails its database authorization step; Corpus grammar reports
`PRODUCTION_SKY_COMPARISON_STALE`. Neither workflow or source artifact is changed
by this release. They are not reported as passing.

The integrated CI-configured build exposed a 629-byte aggregate overage. Factoring
three identical dashboard pagination loops into one preserves their filters,
page bounds, deadlines and caller-owned recovery and saves 61 gzip bytes. Separate
isolated builds with identical CI configuration measure main at 3,440,218 bytes
and the release at 3,443,068 (+2,850). The aggregate allocation increases by 1,000
to 3,443,500; the already-reviewed boot limits, CSS, individual chunk and timing
limits stay unchanged. The release does not claim a JavaScript size reduction.

A local mobile-dark layout run observed late Google font swaps (summary geometry
changed by 1–2 pixels; recorded CLS 0.0000277). The existing asynchronous font
policy deliberately permits reading before fonts load. The test assertion is
preserved; repeat checks and production measurements remain separate evidence.

With protected report fixtures supplied privately, the restarted full content
suite passes the reconciled copy checks and then fails the existing report-judge
fixture assertion: April 17 versus expected April 14 in
`scripts/report-judge-v3-fixture-packets.mjs:127`. Running the same test in the
untouched `a05a04bce` baseline with its own dependencies reproduces the exact
failure. The fixture and report sources are unchanged; the full content suite
is not reported as green.

Release CI exposed two integration defects. The standalone Studio build shared
the versioned astronomy URL transform but did not emit those assets; it now
uses the same asset-emission plugin as the web build. Calendar also cached Moon
selection before the deferred source bundles arrived; selection now waits for
bundle readiness and invalidates on content revision. All eight existing
mobile/desktop, light/dark, empty/populated first-copy checks pass unchanged.
Browser download counting and fault injection now recognize the content-addressed
asset paths, preserving their original request counts and timing thresholds.
The affected Calendar performance/error cases and two real Studio calculation
cases pass locally. Web/admin bundle budgets and public-output privacy scans pass.

The Git-built preview repeat at `04a9c650` measured three cold/reload pairs:
cold median 11.32 s (9.54–11.93), reload median 3.50 s (3.42–3.58). All six
completed with identical prose and zero page errors, worker requests or CLS.
The provisional 10-second cold target is not consistently met; variable asset
and publication response times remain visible. The earlier five-pair result
does not establish a guarantee. Final release commit, CI, production deployment
and post-release verification are recorded in PR #1003.
