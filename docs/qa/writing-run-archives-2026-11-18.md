# Writing run archive acceptance — 2026-11-18

Request: retain exact prompts and selected evidence for every future writer and
judge run, so private instruction exports can show the inputs actually supplied.
Implementation and release ownership remain in this change; no cross-chat
handoff or paid generation is required.

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

Hosted exact-head API/browser/privacy gates and production activation are separate
release evidence. Local acceptance alone does not establish a live deployment.
Apply the new migration before the main-branch app deployment, verify private
access without a paid call, and retain existing archives on rollback. Historical
requests that were never saved remain explicitly unavailable.

See [archive architecture and export instructions](../architecture/writing-run-archives.md).
