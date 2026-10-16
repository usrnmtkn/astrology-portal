# Cold Sky article content admission

The first article can request the existing core article inventory while its
complete publication ledger is loading. Transport overlap does not grant
permission to serve a row. The reader buffers every page and its publication
records privately, then checks the complete current live ledger before exposing
rows or installing response publication state.

Admission requires an online ledger at the final boundary, no newer buffered
publication, eligible current row identities and timestamps, and every matching
live core publication represented in the response. Placement partitions retain
their separate selected-source loader. A newly published key, revised row, or
matching key from another provider conservatively discards the early result and
uses one normal read after the ledger. Network failures retain normal recovery.
One 20-second caller deadline bounds the staged transport and readiness wait.

Only the initial uncached article takes this path. Cached and already resolved
readers retain revision-first loading. Concurrent article preparations share the
active transport; the dashboard owner claims it before yielding to client setup,
so a duplicate subscriber cannot discard its request. Final source-plane identity
and missing-publication checks still precede rendering. No writing is changed.

The optional placement-worker preload from #1275 is removed. Its initialization
and actual placement messages were separated by about 0.1 ms in the retained
production diagnostic, which did not establish a startup benefit. Initial full
Sky API capture and source-asset loading continue while App downloads; the
mounted selected calculation and its normal fallback remain responsible for
worker initialization.

The same cold guest preparation may request published exact-aspect candidates
while its selected calculation runs. Keys come from the existing canonical key
function, intersected with the complete live ledger. More than 50 candidates
disables this optional read; it never truncates the required inventory. After
calculation, only eligible rows matching actual ingress/timeline keys enter the
article map. Dated, absent and changed rows still use the normal required-key
read. Confirmed accounts, pending auth, cached articles and calculations already
finished keep the existing path. Auth confirmation can attach to an active
preparation without restarting or delaying its calculation.

Build packaging groups already eager fact-validation modules and publication
state/transport/notices to reduce separate module overhead. This must pass the
unchanged startup, aggregate and deferred bundle limits; source grouping alone
does not establish a size improvement.

## Required regression evidence

- Actual reader transport: no rows or partial publication state escape a held
  readiness gate; all pages, abort, rejection and retirement are covered.
- Dashboard loader: shared transport, delayed-client duplicate subscriber,
  cache-version correctness, newly published/revised keys, final offline state,
  newer buffered retirement and conservative mixed-provider recovery.
- Actual initial dispatcher/capture: all 168 planet/sign combinations and route
  delimiters, exact unresolved metadata identity, current route/login/Studio
  guards, asset/API failure isolation and no speculative local calculation.
- Candidate aspect transport: actual cold-guest predicate and preparation,
  canonical node polarity, the 50-key cutoff, ledger and calculation readiness,
  actual-key-only admission, microsecond revisions, retirement, failure recovery
  and normal dated/missing-key reads.
- Fresh browser build: no worker or WASM while App is held; exactly one selected
  placement computation and one versioned engine asset pair after mount for a
  known-sign placement route. Three-part retrograde routes keep their existing
  route and API readiness checks. Keep
  complete-copy, selected-facts, auth, changed-selection and recovery coverage.
- Unfiltered content/API suites, types, build and unchanged bundle limits,
  source wiring, browser coverage, CSS and checkout/built-asset privacy checks.
  Hosted checks must pass on the final committed PR head.

## Production acceptance

#1275's retained before/after pair failed its performance criteria. Functional
passes and diagnostic observations do not supersede that result. This follow-up
requires a new baseline on the accepted combined main revision and a new matched
post-merge run on the exact READY production revision, with unchanged helpers and
complete publication-ledger brackets. Keep every attempt and outlier.

Use ten fresh browser contexts at each of 390 px and 1440 px, plus the existing
four warm-reopen controls. Verify the full first/final body, dates, calculated
facts, source provenance and errors. The fixed acceptance thresholds are:

- Mobile median improves by at least 20% and at least 250 ms.
- Mobile p75 does not worsen.
- Desktop median regression is at most 5%.
- No warm control regresses by both more than 10% and more than 100 ms.

Fresh browser contexts do not prove forced server cold starts. Sequential runs
on the same alias retain deployment, network and time confounding; report those
limits and do not attribute causation from a single pair. DNS and production
content writes are outside this verification.
