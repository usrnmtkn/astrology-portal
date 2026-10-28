# Final UI release pass — October 27, 2026

Status: local acceptance and release gates passed. This document records local release evidence; it does not approve a commit, owner-content publication, merge or deployment.

## Scope

The reader journey is navigation or a saved link → calculated facts or an admitted publication/API response → a complete reading, saved action or recoverable state. Verification uses a fresh production preview, isolated browser storage and fixture-backed API handlers. The owner's localhost session and saved records are not test data.

| Screen family | Acceptance coverage |
| --- | --- |
| Shared header and menu | Matching primary order, responsive overflow, theme persistence, date/location controls, child Back actions and focus restoration |
| Sky | Calculated wheel facts, glyph/degree/tick clearance, highlights, dignity section, placement cards and disabled unwritten angle cards |
| Sky reading pages | Direct/Rx placement timelines, closed key-date and cycle sections, complete aspect bridges, lunation/season articles and unavailable/retry states |
| Calendar | Day/Week/Month controls, navigation, monthly overview, exact events, article links and subscriptions |
| Journal | All five steps, tags and people, failed save/retry, exact saved text, reload and Account history |
| Horoscopes | Daily/Weekly/Monthly/Seasonal/Planets, edition navigation, Sun/rising selection and planetary-horoscope routing |
| Guide and Learn | Blog covers, filters, complete dated and evergreen readings, direct links, published revisions, retirement and recovery |
| You | Transits and natal layouts, chart setup, complete reading pages, Patterns & Insights, day/night sect pages and overflow controls |
| Friends | Feed source filters, saved charts and Circle, birthdays, exact aspects, Friction & Flow, profile tabs and return navigation |
| Reports | Shared sign-in/session, library and delivery states, preparing/review/error handling, deletion and shared readings |
| Account and Settings | Profile/account controls, journal history, signed-out isolation, blocked-account states and appearance settings |
| Shared presentation | Body and UI type roles, accessible fonts, neutral links, product controls, light/dark contrast, modals, loading/empty/error states and viewport containment |

## Verification record

The final browser matrix selects 54 files and 1,608 cases. It combines full reader journeys with shared-component presentation fixtures; the count is not a claim that every case is end-to-end. It includes the newly merged Calendar Moon-reading cases. After the verified repairs, 1,604 distinct cases passed and four private-snapshot cases stayed excluded. The full unfiltered Content Studio API and content-integrity gates run in independent checkouts with their own dependencies. Their runtime sources match the release checkout, including the final wheel changes, and they do not receive the localhost development configuration.

The final broad run completed with 1,603 passes, four skips and one Journal computed-style assertion failure. That assertion had sampled a node replaced during hydration; the retryable locator checks the actual current node. All four Journal variants then passed their complete five-step save/failure/retry/reload journeys against the identical build. The evidence catalog preserves both outcomes rather than relabeling the broad run as a single clean invocation. An additional 24 dignity-tooltip repetitions passed. Duplicate cases are counted once in the 1,604 total.

The initial run found legacy expectations for the blog's former Type dropdown and large card title, the old generic theme-button label, and earlier Calendar error wording. The current handoffs use filter tabs, compact cover captions, descriptive theme actions and the shared load-error design. Those assertions were updated against the rendered surface and existing token contracts while retaining complete publication, saved-copy, retry and navigation checks.

The longer journeys also needed to follow the updated insight/sect pages, closed sections, date-picker tabs and explicit Apply action, report deletion confirmation, placement date labels, relationship chart layout and scoped retry controls. Assertions still check complete saved passages, exact calculated dates, audience isolation, publication eligibility, persistent changes and return navigation. Computed-style checks use retryable locators where Calendar hydration replaces the initial node. Guest viewport checks target the current authentication dialog rather than the hidden legacy background panel.

Four private-snapshot tests remain opt-in and were not run: two approved natal-body cases and two approved Friend-pair cases. No private source snapshot was copied into browser receipts. Equivalent page, audience, full-body, reload and retry journeys run with synthetic published records; this does not establish live owner-account or production acceptance.

## Repairs found during this pass

### Startup payload

The matched production build, including the Mapbox fixture setting used by browser QA, exceeded the existing App boot cap by 644 bytes and the reader boot cap by 584 bytes. The composite-only fitted marker packing now loads with the deferred Friends chart surface instead of every initial reader. The algorithm was extracted unchanged into `fittedWheelGeometry.ts`; `CompositeWheel` supplies its memoized layouts to the shared wheel. Synastry uses that same deferred helper.

Parity checks compare 500 charts across three layouts with the pre-extraction implementation. The geometry and rendered collision regressions preserve full-size glyphs, exact longitude strokes, degree values, angle alignment, house containment and inspector interactions. No cap was raised to resolve this pass's startup failure. The accumulated handoff allocations already present before this pass remain in the release diff and are documented in the earlier integration receipt.

### Natal reader focus during hydration

A reproduced browser failure showed a focused dignity badge disappearing when today's sky finished loading. The date/time-zone effect cleared the open natal article even though its birth-chart facts had not changed. The effect now leaves a routed natal reader mounted; its existing route/source refresh still owns updates, and dated transit articles retain their normal invalidation. No source-admission or publication gate was bypassed.

The failing interaction passes 24 repeated production-browser cases across both themes and four viewport shapes, including a 240-pixel viewport-height resize, scrolling, retained keyboard focus and blur dismissal.

## Release gates

| Check | Result | Local evidence |
| --- | --- | --- |
| Final production-browser matrix | Passed: 1,604 distinct; four private cases excluded | `browser-verified.json`, four-case `browser-journal-verified.json`, 24-repetition `browser-dignity-fixed.json`; deduplicated `browser-coverage.json` |
| Complete unfiltered Content Studio API | Passed on final source | `verified-api.log`, independent API replica |
| Complete content-integrity command, including pre/post commands | Passed on final source | `verified-content.log`, independent content replica |
| Web and server TypeScript | Passed | `verified-types.log`, `verified-server-types.log` |
| Shared CSS consistency, token integrity and Studio architecture | Passed | `verified-css.log`; zero semantic-body/type/token findings |
| Web production build and bundle gates | Passed | `verified-web-budget.log`, `verified-web-measurements.json` |
| Standalone Admin production build, budget and import/lazy boundaries | Passed | `current-admin-build.log`, `current-admin-budget.log`, `current-admin-boundaries.log`; no Admin source changed after that build |
| Wheel SSR and geometry | Passed | `current-wheel-geometry.log`; fixed/full-size rings, rotations, 300 irregular layouts and 300 additional composite/paired layouts |
| Extracted composite packing parity | Passed | `geometry-parity.log`; 500 charts × 3 layouts |
| Working-tree and built-output privacy | Passed | 11,608 working files, 409 web assets, 108 Admin assets; the existing private policy was referenced outside this checkout |
| Existing staged bytes | Passed | 167 staged files scanned without changing the index |
| Diff whitespace and original owner-file preservation | Passed | `verified-diff-check.log`, `owner-preservation.json` |

The final web build measures 396,089 bytes of App boot JavaScript against the existing 396,850-byte cap, and 454,429 reader boot bytes including awaited CSS against 455,250. Startup CSS is 58,340 bytes. The standalone Admin aggregate is 853,146 bytes against 853,750. These are gzip measurements, not network or interaction-time claims.

Evidence is retained under the ignored `test-results/final-ui-release-pass-2026-10-27/` directory. Browser receipts use Chromium with responsive viewport sizes, synthetic sessions and isolated storage. External identity-provider sign-in, private owner snapshots, an exact future PR head and the deployed main revision remain outside this local acceptance record. No production release or owner-content publication is implied by these results.

## Source state

Release checkout: `<local-checkouts>/tldrastro-ui-release-qa-20261027`, branch `codex/ui-release-qa-20261027`, base `249e6c6e2915821028be730734d61cddc871884a`. Main's Calendar Moon-details/editor fix arrived during the pass and fast-forwarded cleanly without overlapping the local changes. No new commit was created. The refreshed comparison after that integration was 0 ahead / 0 behind `origin/main`. Changes are uncommitted; working-source fingerprints are recorded separately from the base commit.

The final source set contains 10,349 fingerprinted runtime/gate files, SHA-256 `9f2731ce1ebf23c89b06092f8afa08d1ace47954e8616794ccbadaf63862fbfb`. Both independent API/content replicas matched every file before their final runs and on the final recheck. Their dependency installations are separate. The browser test-source fingerprint is `aacfce0bdcb5c85438a298cf55dcf39c994739e3a85aa7495b4c973db0005df4`; built-output hashes are recorded with the receipts. The final refreshed branch comparison remains 0 ahead / 0 behind `origin/main`.

The original owner checkout, `<local-checkouts>/tldrastro-ui-handoff-review-20261026`, retains all 288 snapshotted changed/untracked files byte-for-byte. The seven private synastry drafts remain unchanged. Browser writes use isolated synthetic records; no owner data, account settings or approved wording was changed.

The earlier release QA and focused wheel receipts remain historical evidence. This pass must establish the final UI's results independently. A later PR must run the required unfiltered API workflow on its exact committed head, and production acceptance must verify the deployed main revision.
