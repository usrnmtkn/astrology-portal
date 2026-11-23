# Writing run archive acceptance — 2026-11-18

Request: retain exact prompts and selected evidence for every future writer and
judge run, so private instruction exports can show the inputs actually supplied.
Implementation and release ownership remain in this change. Release coordination
is authorized; no paid generation is required.

Implementation base: `767a98a5285ac9e917aadaab0712a7f20a8c493f`. The subsequent
main revision `5af47261880e4495ed42ff35e2f311ad7f7962eb` changes Friends CSS,
its visual regression and QA guidance; it does not change these writer, archive,
or database inputs. Mandatory memory was refreshed for that revision; all 65
required context entries were identical and reused.

| Criterion | Local evidence | Result |
| --- | --- | --- |
| Final serialized prompts and supplied evidence saved before dispatch | Shared OpenAI, Anthropic stream and Gemini transport fixtures compare sent bytes with the reserved archive | Passed |
| Save failure cannot produce an unarchived call | Pre-dispatch outage rejects with zero provider calls; post-dispatch uncertainty suppresses fallback | Passed |
| You/Friends cannot automatically replay an uncertain archive outcome | Actual checkpoint controller regression for both report families | Passed |
| Runs remain distinct and retain their original context | Concurrent async scopes, response retries and identical-time UUID pagination | Passed |
| Evidence survives later profile edits | Actual archive handler reload returns the original profile, feedback and complete selected passages | Passed |
| Private access and immutable input columns | Owner API denial/detail/list/error tests; migration executed in PGlite PostgreSQL with service/anonymous/authenticated roles | Passed |
| Complete export | Multi-page export, hashes, exact text, ZIP readback and CRC validation; Git checkout/overwrite rejection | Passed |
| Existing Studio saved-profile journey | Fresh Studio build; Calendar mobile/desktop in light/dark themes, save/reload, input export, stale edits and empty state | 4 passed |
| Privacy | Source scanner: 11,999 files; built Studio scanner: 103 files, using the protected policy | Passed |
| Type contracts | Focused API/provider/checkpoint TypeScript check | Passed |

All 36 targeted writer, judge, report and archive test commands passed after the
fixture corrections below. All model calls in local acceptance are intercepted fixtures. Protected reference
prerequisites remain ignored and outside source publication. Raw QA output and
private reference paths stay in local protected storage. The real PostgreSQL
migration test verifies permissions and exact text without touching production.

Earlier local failures were retained: the first batch launcher selected an x64
Node process against arm64 dependencies; later runs used the correct architecture.
Missing protected reference prerequisites were provisioned locally. Existing
provider fixtures were updated to inject archive storage explicitly, and the
provider-gate source assertion now enumerates the archived Anthropic boundary.
The first hosted preview on `448faae78ed2c79812a6295227b7d6a1fadf9b64`
failed the strict server typecheck: the metadata helper accepted an `unknown`
response type rather than preserving its caller's generic response type. The
helper was corrected without changing emitted JavaScript, then checked with the
full server TypeScript configuration. These corrections do not relax runtime
checks or change model input.

The `corpus-grammar` check on `5b44645a29c62fb7704aa744c314dbd4dddd46a6`
identified the new shared archive transport as an unregistered kernel boundary.
It was registered alongside the existing canonical provider transports. Direct
uses of `archivedWritingFetch` are now also detected by the drift scanner; the
frozen exception allowlist remains unchanged.

The earlier hosted `project-privacy` check passed on that revision. The required
`content-studio-api` and `browser-release-gate` runs were cancelled during the
release hold; neither is passing evidence. The corrected strict-type preview
reached Ready, but a preview is not production activation.

The additive archive migration was applied on November 18. Production inspection
confirmed RLS, no client policies or browser-role read privileges, server
insert/read access, outcome-only updates, and no server delete privilege. Do not
reapply the migration merely to resume the release.

The owner resumed release on November 21. A static integration check against
`72a6f10fbdb4a6f3df27dfe509412a536631482c` found conflicts in `package.json`,
`scripts/test-shared-explicit-writing-feedback.mts`, and
`scripts/test-synastry-writing-contract.mts`. The release coordinator queued this
change after the preceding accepted main release. Main integration, scoped
preflight, exact-head gates, and production acceptance remain pending. Private
run archives must remain excluded from any public published-content backup.

## November 22 integration candidate

The coordinator accepted main `d5cacf371f1f17f9eeee491b125b0eedf0009dd8`
and assigned PR #1525. A fresh server lease read returned the released #1542
reservation; the assignment was changed to #1525 and read back successfully.
The main merge preserves published branch history. The three original conflicts
retain current-main synthetic approval fixtures together with explicit archive
storage, and compose the API test commands without removing existing consumers.

The combined candidate includes the approved public synchronization delta from
`dc656f7e92f5009fbcdc0fe0be4c0eae31a28921`, whose seven postimages and complete
tree `4bf09e0133880c7e1ffb0bd99e2dc365dd8e1ff7` were verified independently,
and the UI delta from `720423536f3f81a3b5fbc02b762e3a1532e9084a`.
The UI test catalog retains both accepted Friends directory coverage and the new
date-range spec. Mobile speed work is outside this candidate.

Public synchronization reads only the controlled reader and publication ledger.
Its integration fixture explicitly rejects archive-table reads and verifies that
exact request bodies, selected evidence, writer/judge history, profiles and
feedback are excluded. The newer Synastry body path now carries its content key
into the archive and verifies the exact dispatched request through fixture storage.
The admission, workflow syntax, drift and public synchronization contracts pass.
The combined `1e6520d676aa90160c8a3c589676ec6e1fc54f86` preflight passed all
12 canonical build phases and source, built Web/Studio privacy, and CSS checks.
Its first API batch exposed three lunar-writer fixture failures: the isolated
Lunation store did not model the new archive table. The helper now uses the
existing synthetic archive store; complete lunar writing, rejection, and saved
writing reruns passed, including dispatched request and operation correlation.
A separate model-choice launch failed at the sandbox IPC prerequisite and passed
unchanged outside that sandbox. These initial failures remain recorded; they do
not replace the required corrected-candidate inventory or hosted gates.

On corrected `95585eb099145390a27c0a06ce8c622e212b6a62`, all 117 affected
API consumers passed, including ten repair-dependent/prerequisite reruns. The
sanctioned private worker collected and passed all 23 protected Studio-auth cases;
its keeper must confirm dependency stability for any later test-only revision.
The first five public browser groups retained their failures: an obsolete Darwin
Friends reference, a cross-frame geometry measurement, four Personal Transit
cases whose forked store omitted archives, and one viewport assertion affected
by restored vertical scroll after reload. The repair models the synthetic archive,
measures both adjacent rectangles atomically, reveals the tab strip while proving
its horizontal scroll is unchanged, and updates only the Darwin reference after
comparison with the accepted Linux design. Strict no-overlap, full viewport
containment and all numeric thresholds remain unchanged. Complete affected
consumer reruns remain required; this record does not claim them passed.

The complete corrected browser groups through design handoff passed on
`e21c1bea5803e99303fd59e4853778d8b1c46270`. The final mobile group exposed
two location-change timeouts because its build lacked the synthetic Mapbox token
already supplied by the dedicated connection-transit configuration. The run was
stopped after 24 passes, two failures and one interrupted case; 327 cases did not
run. The mobile configuration now enables the same intercepted provider fixture.
Its full profile matrix must pass again; no runtime behavior or timeout changed.

The corrected full mobile matrix on
`974b37c17bb1941a19847ea2dffcfe3778937436` collected all 354 cases with
339 passes, 15 failures, zero skips and no global errors. The city fixture
passed throughout. All remaining failures were two independently reproduced
WebKit platform differences: macOS requires Option+Tab to include native buttons,
and fractional line heights serialize with float32 noise. The tests retain every
focus/wrap/Escape/restoration assertion, using the native macOS shortcut only for
Darwin WebKit, and compare unchanged line-height targets to five decimal places
with the same 15-second deadline. No runtime, stylesheet or budget changes are
included. Both complete specs and all their configured profiles must pass again.

Complete affected-consumer preflight, hosted exact-head gates
and production acceptance remain pending at this integration checkpoint. Earlier
local/source receipts retain their original revision and scope.

Hosted exact-head API/browser/privacy gates and production activation are separate
release evidence. Local acceptance alone does not establish a live deployment.
Verify the existing migration and private access without a paid call before
production acceptance, and retain existing archives on rollback. Historical
requests that were never saved remain explicitly unavailable.

See [archive architecture and export instructions](../architecture/writing-run-archives.md).
