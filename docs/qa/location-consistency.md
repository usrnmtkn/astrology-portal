# Current location consistency

Base: `7ece1f0416c53d1d8ef2f3b7294a3416242646d8` on
`fix/location-consistency-20261104`, November 4, 2026. Verification applies to
the local working diff. No commit, merge or deployment was performed.

## Intended behavior and repair

The saved current city supplies the shared observer coordinates and time zone.
Settings, Sky, Calendar, You, Friends and city-based Horoscopes must agree.
Birthplaces remain independent. Explicit Horoscope device/time-zone modes retain
their existing purpose. Sign-up labels explain that current city supplies the
daily sky and transits; chart and birth-detail forms retain separate birth data.

Settings previously changed the profile while Sky retained an independent saved
city. Hydration could restore a conflicting preference, and free text could
invent coordinates by hashing the city name. Current-city choices now update the
shared selection and profile together. Startup and account hydration prefer the
valid profile city. A slow account read or device response cannot overwrite a
later explicit city choice. Other open tabs synchronize that choice.

Snapshots are admitted only for the selected observer coordinates, time zone and
civil date. This prevents stale chart/transit facts being paired with a new city
label. Dated Sky content, Friends daily keys and You timing use the observer's
local day, including dates different from UTC. Today highlighting uses that same
day. Mobile date controls also preserve the intended click when the city editor
closes; the previous outside-pointer handler moved the tabs before the click.

Existing legacy name-hash coordinates are rejected. A profile city is recovered
only when geocoding returns one matching city/state; unresolved or ambiguous text
cannot save invented coordinates. Explicit device lookup requests fresh
coordinates. Calculation formulas, ephemeris provenance, approved astrology copy,
source precedence and birth data are preserved.

## Location audit and acceptance

| Area | Evidence |
| --- | --- |
| Settings current city | Selected coordinates required; navigation, save, cancellation and reload verified. |
| Sky date/location picker | Search, rejected free text, device success/denial and delayed-response races verified on desktop/mobile. |
| Horoscopes | Stale city preference cannot shadow the saved current city; selected city updates the shared observer. Explicit device/time-zone modes preserved. |
| Studio horoscope edition location | Shared picker supplies the edition's generation context, independently of the reader observer. Source-audited; edition context and actual handler contracts covered by the API gate. |
| Signup current city and birthplace | Shared city search requires selected coordinate data; account/signup continuity covered by isolated browser fixtures. No live account created. |
| You chart setup | Selected current-city coordinates required; birth fields remain separate. Local-day timing and Today highlighting verified across UTC midnight. |
| Account birth details / Friends manual charts | These select birthplaces; current-city changes preserve their data. Existing full client flows verified. |
| Calendar | Shared observer coordinates/time zone feed requests. Day/week/month and event-date rendered regressions verified. |
| You and Friends transits | Snapshot validity includes observer and local date; Friends daily reading keys and You timing requests share that day. |
| Saved preferences | Conflicting local/remote profile preferences, slow auth/profile hydration, saved POST payload, reload and cross-tab propagation verified. |

## Verification

Tests run from isolated worktrees, each with its own `npm ci` dependencies.
Browser checks build and start fresh previews. Synthetic profiles, intercepted
geocoding/auth/timing endpoints and actual Swiss Ephemeris fixture calculations
avoid live account writes or paid generation. Raw logs and protected reference
fixtures remain outside Git.

The source privacy scan initially caught the supplied current location in two
new test fixtures. Both fixtures now use neutral public cities and pass the
source scan. Built public assets passed before and after this fixture cleanup.

The full, unfiltered `npm run test:content-studio-api` passed after verified
protected local fixtures were made available through ignored private-storage
links. The obsolete date-picker source assertion was replaced with checks of the
actual header controls and executable selected-time-zone URL behavior. Two other
outdated source assertions were updated to the current rendered components;
complete owner-body checks and fact-isolation checks remain enforced.

The broad client/date browser run passed 306 cases, with four existing opt-in
private-snapshot skips. Those require `NATAL_PUBLISHED_READER_SNAPSHOT` or
`NATAL_FRIEND_READER_SNAPSHOT`; this run does not claim those optional private
inventories were exercised. Native PostgreSQL supplemental concurrency/checkpoint
CI tests were not run locally because a PostgreSQL server toolchain is absent.
The full API suite includes its isolated SQL contract coverage.

Final working-source fingerprint: `eefef85f1b520a246f2c38680bc0e9097a2e1b24ab853a152d76b6d0e7febe0d`. This hashes each sorted changed/new non-document path, a NUL, its complete bytes and a final NUL. All 20 files match the independently installed QA copy. Refreshed `origin/main` matches the base (0 commits ahead/behind). Runtime source stayed unchanged after the broad browser checks; subsequent changes neutralized test fixtures and recorded measured bundle limits.

| Check | Final result |
| --- | --- |
| Full `npm test` | Passed: content suite, typecheck and production web build. |
| Full `test:content-studio-api` | Passed unfiltered on the matching final source copy. |
| `test:performance-contracts` | Passed, with existing runtime thresholds. |
| Client, live-clock, event-date and placement-date browsers | 306 passed; four existing opt-in private snapshot skips. |
| Account browsers | 130 passed across desktop Chromium and iPhone WebKit. |
| Focused location browsers | 14 passed from a fresh preview with neutral city fixtures. |
| Location unit cases | Five passed. |
| Server typecheck | Passed. |
| CSS/token audit and CI coverage | Passed; browser-suite coverage and all 48 workflow YAML/condition checks passed. |
| Bundle and privacy | Complete bundle gate, source privacy and all 413 public build files passed. |

The total is **450 browser checks passed**, four existing optional skips, zero unexpected failures and zero flaky cases. The initial focused preview build exceeded the unchanged 120-second setup timeout while heavy QA ran concurrently; sequential fresh-build runs passed without increasing the timeout.

Matched clean-main and repair builds use their own `npm ci`, ARM Node 22.20.0 and identical synthetic Mapbox, timing-API, Supabase and natal-pattern inputs. App JavaScript boot measures 398,357 / 399,142 gzip bytes (+785); reader boot 456,513 / 457,298 (+785); App chunk 89,053 / 89,523 (+470); aggregate JavaScript 3,709,216 / 3,710,606 (+1,390), across 272 files. Initial CSS stays 58,156. Clean main already exceeded its inherited reader ceiling by 63 bytes. Scoped allowances add only 800 App-boot, 900 reader-boot, 50 App-chunk and 1,300 aggregate bytes above main's ceilings. Other chunk, CSS, graph, source-payload and runtime limits stay unchanged. This records the correctness cost; it is not a performance-improvement claim.

Synthetic result receipts and desktop/mobile screenshots are retained under ignored `test-results/location-fullqa/`; raw/private logs remain outside Git. No live account, paid generation, commit, merge or deployment was performed.
