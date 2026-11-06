# Wheel tooltip Studio verification — 2026-11-05

Branch: `codex/interactive-zodiac-wheels`, uncommitted on
`4377ac40ddec37ad083d74a62b8a394a60c30ea2`. This records local work, not a deployment.

The actual-handler test in `scripts/test-wheel-tooltip-studio-api.mts` exercises
all 30 sources against isolated in-memory PostgREST storage: draft creation,
reopening, publication, complete reader text, later edits, version conflicts,
retirement and canonical variable protection. It first reproduced publication of
a forged variable contract; the server now rejects that publication. Browser
cases exercise the rendered Studio editor and the shared wheel consumer without
writing owner content. A network guard contains all synthetic API/storage calls.

The complete `test:content-studio-api` command was attempted. Its prerequisite
knowledge build passed; the suite stopped at three existing approved-voice-style
tests with `INGRESS_VOICE_REFERENCE_STORAGE_UNAVAILABLE`. No private sources were
copied into this worktree and this full gate remains unresolved.

Standalone bundle measurement used a separate detached checkout at the same HEAD
with its own `npm ci`. Both builds used ARM64 Node 22.20.0, zlib 1.3.1-470d3a2 and
unset standalone public environment values. Baseline entry raw/gzip/aggregate:
821151 / 238166 / 877532 bytes. Candidate: 823195 / 238633 / 880383 bytes. The
increment is 2044 raw entry, 467 gzip entry and 2851 aggregate gzip bytes. The new
selector is lazy; no dependency, private prose or chart data was bundled.

The existing startup limits still pass. A documented 3000-byte aggregate gzip
allocation covers this feature. Other limits and forbidden/deferred payload
checks are unchanged. This is a measured feature cost, not a performance gain.

Acceptance results for this local revision:

| Criterion | Result | Evidence |
| --- | --- | --- |
| Discover the section in Zodiac Wheel navigation and breadcrumbs | Passed | Browser cases at 390/1440 px in light/dark themes |
| Open a starter without creating a row | Passed | Isolated storage remains empty until Save draft |
| Save and reopen complete wording after reload | Passed | Rendered editor + actual handler storage assertion |
| Invalid variables cannot publish | Passed | Rendered disabled publication control + canonical server regression |
| Stale save keeps unsaved input | Passed | Rendered conflict and retained editor value |
| Publish shared wording to You, Friend and Sky tooltips | Passed | Complete title/hover text rendered from actual reader handler |
| Loading and source read failure preserve stored copy | Passed | Disabled opening control, error, retry and unchanged storage |
| Heading order and existing typography | Passed | h1/h2 order; computed comparison with established guidance heading |
| Chrome and Safari regression set | Passed | 22 tests, fresh isolated synthetic build and preview |
| Typechecks, CSS/token audit and reader-copy boundary | Passed | Web/admin TypeScript; shared style audits; no drafting-note findings |
| Standalone Admin build, lazy boundaries and bundle allowance | Passed | Matched bundle measurements above; actual Rollup boundary checks |
| Safe preview access boundary | Passed | Public environment allowlist; unauthenticated admin 403; fixed upstream and method/header/body checks |
| Signed-in owner session on the user's live browser tab | Passed, read-only | Normal owner session connected; new variable source opened with Your ready to edit; no owner data was saved |
| Complete Content Studio API release gate | Blocked | Private ingress voice reference fixtures unavailable, as described above |
| Web bundle release gate | Failed | Current branch/public preview build exceeds reader boot, initial CSS, signup, aggregate JS/CSS and memory CSS limits. Contributions from earlier wheel changes have not been isolated; no web limits were raised. |

No production deployment, owner-content write, credential rotation or schema change
was performed. The preview uses the normal shared Studio store only when the owner
chooses to save or publish.

Navigation correction, 2026-11-05: moved Tooltips from Write into its own Zodiac Wheel group; the page title is Zodiac Wheel tooltips and breadcrumbs read Admin / Zodiac Wheel / Tooltips. Eight Chrome/Safari cases passed across 390/1440 px and light/dark themes, including navigation placement, label order, computed style parity with Write, empty starters, populated saved wording and the full edit/publication flow. Admin typecheck, CSS/token audit, standalone Admin build and existing bundle allowance passed. The normal public-configured preview was rebuilt at localhost:5173; the browser context’s localhost:5174 address has no running server. No content, credentials or API behavior changed in this navigation revision.

## Editable variable wording — 2026-11-05

Owner requested editable wording inside `ownerPossessive`, `possessive`,
`houseOrdinal` and `rulerHouseOrdinal`. A new Variable wording group exposes ten
registered sources: You title/body ownership forms, Friend name possessives,
You/she/he/they/unspecified possessives, selected-house formatting and ruler-house
formatting. Existing defaults remain byte-identical until the owner publishes.
Name templates keep `{{ownerName}}`; house templates keep `{{house}}` or
`{{houseOrdinal}}` (or both). The active profile chooses the form and calculations
choose the house values. No chart facts or profile pronoun settings are edited.

The actual-handler regression first reproduced refusal to publish the new Friend
name source (`Choose a registered wheel tooltip source.`). The canonical registry
now includes all ten variable sources. Metadata cannot widen their contracts or
remove the calculated house input. Literal profile text is not reinterpreted as
HTML or nested template tokens. Retired required variable sources hide only the
affected popup; unused pronoun forms do not hide another audience's popup.

Validation at the local uncommitted revision:

- 40 source lifecycle checks passed against the actual handler and isolated store.
- Ten variable publication/reader cases passed, including both house formatting
  alternatives, invalid facts, name interpolation and forged metadata.
- 26 browser cases passed in Chrome/Safari from a fresh isolated build and server.
  These cover desktop/mobile, light/dark, all ten editable forms, draft persistence,
  owner publication, You and all Friend pronoun variants, distinct calculated
  houses/rulers, retired variables, and preserved default wording.
- Web/Admin typechecks, CSS/token and reader-copy audits, calculation regressions,
  standalone Admin build, source map and actual Rollup lazy boundaries passed.
- The unfiltered Content Studio API gate again stopped at the three existing
  `INGRESS_VOICE_REFERENCE_STORAGE_UNAVAILABLE` tests. No private sources were
  copied to work around this gate. The earlier web bundle gate gaps remain open.

A browser build initially overlapped a generated knowledge rebuild and failed to
resolve its shared-web output. The knowledge prerequisite finished, then the
complete browser run was restarted and passed; the failed prerequisite run is
not counted as an application-test result.

Matched local Admin artifacts before/after the variable extension, with the same
isolated npm-ci dependencies, ARM64 Node 22.20.0, zlib 1.3.1-470d3a2 and unset
standalone public build environment: entry raw/gzip/aggregate
823195 / 238633 / 880383 versus 823626 / 238788 / 881020 bytes. The ten sources
and selector remain lazy. A measured 200-byte entry-gzip allocation covers the
155-byte validation/guidance increase. The 637-byte aggregate increase fits the
existing aggregate limit. Every other limit remains unchanged.

All write tests used isolated synthetic storage. No agent action saved or
published owner wording, changed credentials, or deployed the branch.

Final preview check: the refreshed safe build was opened in a separate signed-in tab. Variable wording lists all ten forms, and ownerPossessive · You, title opens with the literal value Your focused for editing. No owner row was created, saved or published by the agent. Exact lowercase fragment previews passed four focused Chrome/Safari checks; the shared interpolation renderer remains unchanged.

## Unpublished wheel preview — 2026-11-05

On `codex/interactive-zodiac-wheels`, uncommitted changes based on
`4377ac40ddec37ad083d74a62b8a394a60c30ea2`. The branch is 31 commits behind cached
`origin/main`; the attempted remote refresh failed DNS, so that comparison may
be stale. This is a local preview, with no deployment or owner-content writes.

The editor now offers **Preview on wheel**. It overlays only the current
registered source in component memory, retaining the published resolver for
every other source. **Preview wording** shares the editor's unsaved body state.
Invalid edits hide the wheel instead of retaining stale copy. No draft values
enter publication state, local storage, cross-tab messaging or API requests.
Closing the preview unmounts its data, subscriptions and overlay.

Charts load only after opening the preview. The existing publishable browser
client verifies the session and reads the current user's profile and owned
manual charts with explicit ownership filters under existing RLS. Only birth
inputs are selected; the normal Swiss worker calculates the placements. No
profile or chart-cache sync/write function is used. Unknown times omit houses.
Both SDK account events and session-storage changes invalidate the chart state;
late reads/calculations cannot repopulate an unmounted preview.

Acceptance evidence from fresh synthetic builds and preview servers:

| Criterion | Result | Evidence |
| --- | --- | --- |
| Unsaved edits appear on the wheel | Passed | Chrome/WebKit at 390 dark and 1440 light; both wording fields stay synchronized and popup survives editing |
| No save/publication/profile write | Passed | Zero write requests; isolated actual-handler store stays empty; normal wheel retains published wording |
| Chart/voice/house selection | Passed | Own and saved-friend birth inputs, actual Swiss worker, independent preview voice and distinct house selection |
| Invalid, empty, failed and unknown-time states | Passed | Invalid template hides preview; empty/read failures retry without losing text; unknown times disable houses |
| Sign-out isolation | Passed | Session removal clears chart and requires sign-in, while preserving typed wording |
| Visual hierarchy and controls | Passed | Label order and absence of new headings; computed reader-title/close-control comparison; shared Studio narrative size retained; light/dark mobile/desktop screenshots |
| Existing wheel and source lifecycle | Passed | 26 existing Chrome/WebKit cases plus four focused unpublished-preview cases; 40 actual-handler source lifecycles and ten variable-source lifecycles |
| Pure overlay/birth-input integrity | Passed | Exact-source overlay, unchanged baseline, invalid templates, ownership filtering, valid dates/zones, unknown time and immutable inputs |
| Safe real-user preview | Passed, read-only | Existing normal signed-in session loaded the user's chart and saved-chart chooser; original wording left unchanged; no Save/Publish action |
| Typechecks, CSS and reader-copy boundary | Passed | Web/Admin TypeScript, shared CSS/token audit and 10,955-row repository copy audit |
| Standalone Admin build/boundaries/budget | Passed | Both preview layers are dynamic entries outside startup; normal build and final emitted graph checks |
| Complete release checks | Blocked | Unfiltered Content Studio API gate still fails three private ingress-fixture tests with `INGRESS_VOICE_REFERENCE_STORAGE_UNAVAILABLE`; earlier Web bundle failures remain unresolved |

The tests first reproduced the missing preview action. Later checks caught the
Studio button-style collision and missing session-storage invalidation; both
were corrected before the focused acceptance run passed. Studio narrative copy
uses its existing 16px body token, while reader copy uses its existing 19px role;
the shared wheel's title, glyphs and close-control geometry remain intact.

Matched local standalone Admin artifacts, same isolated npm-ci dependencies,
ARM64 Node 22.20.0, zlib 1.3.1-470d3a2 and unset standalone public environment:
entry raw/gzip/aggregate 823626 / 238788 / 881020 before, versus
825351 / 239401 / 896372 after. Allocate 600 entry-gzip and 15,000 aggregate-gzip
bytes, using existing headroom for the remainder. Raw-entry/largest, memory,
reader, CSS, dependency and payload boundaries stay unchanged. The two optional
preview modules are checked by `scripts/test-wheel-tooltip-preview-boundary.mjs`.
No dependencies, credentials, schemas or owner prose were changed.

## Side-by-side editing — 2026-11-06

The local preview places its shared unsaved wording field and chart controls on
the left and the wheel on the right using the existing Studio two-column grid
and Stack spacing. At the existing 720px mobile breakpoint the grid stacks.
The wheel column can stay in view while its taller neighboring editor scrolls.
Focusing Preview wording brings the pair to the top of the editor's scroll area,
so the fixed save bar does not cover the ruler popup while typing. No labels,
heading levels, typography roles, source resolution or save behavior changed.

Acceptance at the uncommitted `4377ac40ddec37ad083d74a62b8a394a60c30ea2` worktree:

- Eight Chrome/WebKit cases passed from a fresh build and preview, covering
  390px mobile in both themes and 1440px light / 1280px dark at 720px height.
  Assertions check horizontal editor/wheel separation, vertical stacking on
  mobile, no page overflow, and the complete popup inside the visible editor
  area above the save bar. Shared typography/label order checks still pass.
- Live text synchronization, chart/voice/house selection, invalid wording,
  unknown times, empty/error retries, sign-out clearing and zero writes passed
  in the same eight cases. The pre-change desktop geometry regression failed
  against the previous stacked artifact as expected.
- Web/Admin TypeScript, CSS/token audit, pure preview-input regression,
  standalone Admin build, lazy-boundary checks and existing bundle caps passed.
  Final standalone startup raw/gzip: 825351 / 239408 bytes; aggregate gzip:
  896489 bytes, within the unchanged 896850-byte allowance.
- The normal signed-in safe preview at localhost:5174 was opened in a separate
  tab with the user's chart and original wording unchanged. No owner source,
  profile or publication was written. Existing user tabs were preserved.

Remote fetch succeeded before work: `codex/interactive-zodiac-wheels` is 62
commits behind refreshed `origin/main` at `fcb810d3356e33cdaf5dfe5f9a420252e5345640`.
The memory helper's separate fetch failed DNS; its offline recall used that
refreshed ref and the same canonical-source fingerprint. The unfiltered API gate
was attempted again and still stops at three missing private ingress fixtures
(`INGRESS_VOICE_REFERENCE_STORAGE_UNAVAILABLE`). This is local-preview evidence,
not a production deployment or release-gate pass.

## Wheel-driven source navigation — 2026-11-06

The Studio preview now supports navigation in both directions. A house selection
updates House and the read-only Ruler’s house from the actual chart, and adapts
the active title/opening/placement source family to that context. The ruler
headline and opening sentence are keyboard/pointer targets that select their
exact CMS source. Tooltip group, Wording source, the main editor and preview
field share that source; these selectors are also available beside the wheel.
Choosing a source can find a compatible house without reloading the chart or
changing its facts. Unavailable chart contexts have an explicit status.

An editor-lifetime session retains complete drafts with their original saved
baselines and CAS versions. Source navigation performs reads only. Unsaved
source edits compose locally in the preview, and invalid sources fail closed.
Returning restores the pending writing. Save/Publish still addresses only the
current source, and closing/reloading guards pending changes in other sources.
The session is discarded with the editor and has no storage or publication
side effects. Public reader wheels do not expose these Studio navigation controls.

Validation at the uncommitted 4377ac40ddec37ad083d74a62b8a394a60c30ea2 checkout:

- All 34 Chrome/WebKit wheel and Studio cases passed from a fresh synthetic
  build/server. The eight preview cases cover mobile/desktop, both themes,
  actual Swiss 2nd-to-6th ruler facts, house and source selectors, clicking a
  title, keyboard selection of the opening sentence, own/other-house variants,
  saved friends and retained chart/voice/house context.
- The same cases verify retained unsaved writing, no navigation writes, source
  read failure/retry without replacing the current field, close cancellation
  when another source has edits, invalid/empty/unknown-time states and sign-out
  isolation. Explicit fixture saves verify the selected ruler-title key/body
  reaches the actual handler. Existing published reader wording stays separate.
- The regression against the previous bundle reproduced House staying at 1
  after selecting house 2. Two test-only modal locators were corrected before
  the full run passed; no product behavior was changed to bypass those checks.
- Pure/actual-handler regressions passed: two independent Swiss instants give
  distinct rulers in the calculated 2nd-to-6th context; source variants follow
  facts; snapshots stay immutable; cached drafts retain their exact baseline;
  an older cached version cannot overwrite a newer owner edit (actual 409).
- Web/Admin TypeScript, CSS/token and reader-copy audits, the calculation
  regression, 40 source lifecycles and ten variable-source lifecycles passed.
- Standalone Admin build, startup boundaries and final bundle check passed.
  Preview and emitted editor-session chunks remain outside startup. Matched
  before/after raw/gzip/aggregate bytes are 825351 / 239408 / 896489 versus
  826781 / 240056 / 897867. A measured feature allocation adds 700 entry-gzip
  and 1500 aggregate-gzip bytes; raw/largest, reader, CSS, memory, dependency
  and source-payload limits are unchanged.
- A read-only check in the signed-in safe preview selected the user's actual
  second house, followed its opening source, then clicked its headline. Both
  source selectors and the editable template matched the selected title while
  House remained 2 and the calculated ruler house remained 6. No owner wording
  was typed, saved or published, and existing tabs were preserved.

At task start, codex/interactive-zodiac-wheels was 62 commits behind fetched
origin/main. The final comparison is 65 commits behind the subsequently updated
local origin/main. The required memory recall used the start-of-task ref after
its separate fetch failed DNS; no new required-context hashes were found. The unfiltered API release
gate was attempted again and still fails the three missing private ingress
reference-fixture tests. This is verified local-preview work, not a deployment.

## Current-main release integration, 2026-11-06

The owner requested production release of the wheel and tooltip editor. The
original preview work is preserved separately. This release starts from fetched
main `25092e7c9aed4570bfd7d5a6d33356deb61428ec` in an independently
`npm ci`-installed worktree. No fallback source row, knowledge source, owner
wording, publication state, schema, dependency, or credential is changed.

The wheel, its geometry and template hook, glyph assets, floating tooltip,
portal visibility and read-more cue are shared implementations under
`src/shared/components`. Existing reader import paths re-export them, preserving
the same components and portal context. Studio imports the shared wheel directly;
no application-UI exception was added to the architecture audit. A lazy chart
wrapper loads the drawing and its inspection styles only for chart views.

Local acceptance evidence:

- The final shared implementation passed all 42 dedicated Chrome/WebKit wheel,
  supplied-design and Studio cases, covering mobile/desktop and light/dark:
  selection, Safari ruler overlays, close controls, clean aspects/chevrons,
  variable edits, matching source selection, retained local drafts, isolated
  save/reopen/publish, invalid/empty/read-error states and sign-out isolation.
- The expanded app journeys initially passed 55 of 58 cases. Three WebKit cases
  exposed an invalid synthetic member-sync fixture: its empty successful save
  response caused repeated requests and cancellation errors during navigation.
  The isolated fixture now retains its saved inventory independently of local
  migration and returns complete chart-refresh receipts. The reproduced
  desktop journey passes in both Chrome and WebKit without suppressing browser
  errors. All 16 final app-journey cases pass, including saved-chart reads and
  refresh receipts, all four wheel themes/sizes, article links and unknown-time
  reloads. Together with the dedicated cases, 58 browser checks pass.
- Actual-handler regressions passed 40 source lifecycles and ten variable forms,
  canonical allowed-slot enforcement, exact publication revisions, retirement,
  stale-write conflicts and cached-source conflict protection. Direct Swiss
  checks use two independent instants, canonical True Node, whole-sign facts,
  day/night Fortune and unknown-time omission.
- Web/Admin/server types, CSS/token audits, reader-copy/knowledge boundaries,
  shared-module and lazy-editor boundaries, and source/staged/public-output
  privacy scans passed. Local dev-port probes were sandbox-restricted; fresh
  browser runs used an unused loopback port with `reuseExistingServer: false`.
- The complete unfiltered local API command was attempted again after integration.
  Its knowledge-build prerequisite passed. It still stops at the same three
  missing private ingress-reference fixtures, with
  `INGRESS_VOICE_REFERENCE_STORAGE_UNAVAILABLE`. No private source was copied,
  credential introduced, fixture bypassed or assertion weakened. Protected CI
  must supply its dedicated fixtures and pass before merge.

Matched native ARM64 Node 22.20.0/zlib 1.3.1-470d3a2 builds use identical
synthetic Supabase settings and natal-aspect-pattern flags, with independent
dependencies for current main and the first candidate `89e5cece6b`:

| Gzip bytes unless marked raw | Main | First candidate |
| --- | ---: | ---: |
| Web App startup | 398713 | 390513 |
| Reader startup including awaited CSS | 456983 | 449098 |
| Initial CSS | 58270 | 58585 |
| Aggregate Web JavaScript | 3711939 | 3734963 |
| Aggregate Web CSS | 144093 | 147403 |
| Shared Memory CSS | 31873 | 32237 |
| Studio entry, raw | 823078 | 828863 |
| Studio entry | 238837 | 240776 |
| Aggregate Studio JavaScript | 880262 | 901225 |

The initial eager-wheel build and provisional inherited feature allowances failed
their gates. The lazy wrapper removes the startup regression; narrowly measured
feature costs are documented in both budget rationales. Existing startup,
source-payload, dependency, accuracy and runtime-performance guards remain.
The Web budget now rejects an eager wheel drawing/stylesheet, and the Admin
budget enforces the preview and editor-session boundaries. Both bundle gates
pass on the measured artifacts. The dedicated browser cases are included in
the required design-handoff matrix.

Local evidence does not prove deployment. Merge requires green exact-head
`content-studio-api`, `browser-release-gate` and `project-privacy` checks against
current main, followed by main's automatic Vercel deployment and read-only
rendered verification. Release commit, CI and deployed-revision results belong
on the release PR; previewing alone never approves or publishes tooltip wording.

### Release-check follow-up

CI at `89e5cece6b` found an extensionless validation import in the plain Node ESM
startup path and a missing reader-destination policy for the new Composition Map
surface. The import now uses `.js`; the production-style Node startup regression
reaches authorization. The surface now declares chart context as required and
registers its canonical source family. The link audit passes all 27 surfaces;
no contextless app link or policy exception was introduced.

The existing mobile tooltip viewport regression also exposed programmatic focus
after opening a chart: Chromium need not mark it `:focus-visible`, leaving the
tooltip owned by a different pointer-hovered sector. Resizing then dismissed it.
Focus now owns the tooltip until blur, pointer events preserve a focused target,
and touch initiation still suppresses hover. The original focused SVG node is
asserted connected and focused after resizing. All 18 Chrome/WebKit tooltip
resize/scroll and touch cases pass, across all eight viewport/theme combinations.
No browser error, viewport, focus or touch assertion was removed.

Fresh matching artifacts after these corrections measure Web startup 390505,
reader startup including CSS 449090, App chunk 89791, aggregate JavaScript
3735092 and aggregate CSS 147403 gzip bytes. Studio entry raw/gzip is
828863/240765 and aggregate gzip is 901285. Every numeric ceiling stays unchanged
and passes; startup CSS, shared Memory CSS and all deferred boundaries remain
as above. Web/Admin/server types, actual-handler tooltip and variable lifecycles,
direct Swiss calculations, module boundaries, Node startup and link policy
regressions pass again. A fresh combined browser run and exact-head CI provide
the remaining release evidence on the PR.

The combined run at `3009d6f6e` passed 100 cases and found two WebKit focus-return
failures in the existing fullscreen journey. Safari does not always focus a
clicked button, so relying on the previously active element lost the opener.
The shared fullscreen control and Sky modal now declare their opener ids for
restoration. A fresh 16-case Chrome/WebKit app-journey/page-hierarchy run passes
all viewport/theme variants, including both reproduced failures and an explicit
Sky opener-focus assertion. Existing assertions remain intact. The full startup
and recovery performance-contract chain also passes.

Latest Web App/reader startup is 390516/449101, App chunk 89809, aggregate JS
3735072 and CSS 147403 gzip bytes; Studio measurements remain 828863 raw,
240765 entry gzip and 901285 aggregate gzip. All numeric ceilings remain
unchanged and pass. The PR records the follow-up revision and required CI.

The broader CI at `2663b0c5f` passed the unfiltered Content Studio API workflow.
Browser CI exposed a shared request-counter regression: closing the wheel editor
invalidated an unrelated Connection Transits request and prevented its loading
cleanup. Wheel wayfinding now owns a separate counter. The existing actual-handler
late-completion test passes without reducing its cancellation assertions.
A wheel-shaped placeholder now reserves the drawing and caption before the lazy
renderer arrives. All 22 focused Chrome checks pass: actual-handler cancellation,
Studio navigation, all 16 initial-response cases and four mobile/desktop/theme
loading-layout cases. Font and inspector checks wait for the deferred renderer;
nav coverage includes the requested Zodiac Wheel group. CSS/token audits pass.
Before integration with newer main, fresh Web App/reader startup is 390594/449251,
App chunk 89812, aggregate JS/CSS 3735202/147475 gzip bytes. Studio entry raw/gzip
is 827710/240346 and aggregate JS 900789. Existing numeric ceilings pass.

Integration with current main `625dc6266` preserves its dated Moon editor,
publication tests and deferred feedback panel. Matched independent-dependency
builds record Web aggregate JS 3717682/3741098 and Studio aggregate JS
886688/908016 gzip bytes (main/integrated). The narrowly measured combined
allocations and initial strict failures are retained in both budget rationales;
reader startup limits, lazy boundaries and runtime guards are not relaxed.
The existing guest Sky/article journey passes after waiting for the lazy
renderer and still checks highlighted configured aspects and keyboard closure.
Only the intentional Sky light wheel image differs in local visual baselines;
the reviewed macOS actual replaces that one image. All other baseline images
pass unchanged. Linux review will use the exact PR-head CI artifact.

The final integrated Chrome/WebKit run passed 101 of 102 cases. The remaining
Safari journey completed its UI assertions but full-document navigation
canceled old-document synthetic report reads. It now completes fixture reads
before replacing the document, with every browser-error and external-service
assertion still enabled. All 14 affected wheel journeys plus both unchanged
Seasonal quality-exhaustion cases pass in a fresh 16-case Chrome/WebKit rerun.
No product timeout, error filter or publication assertion is relaxed.
