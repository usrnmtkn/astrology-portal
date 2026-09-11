# Content Studio API audit — 2026-09-10

Base: `origin/main` at `8e1a97ce1fd4bfbd62f14932e6b4755e6c58b368`.
Scope: Content Studio content CRUD, review records, publication/status, reader previews, and the adjacent report correction/feedback editors. Billing, generation authorization, scheduled fulfillment, and test-data cleanup were inspected for scope and access boundaries; this is not a certification of every application API or a paid-generation test.

## Root cause

The application accumulated separate request parsers, storage clients, and save contracts. Main Content Library saves gained conditional updates and confirmation checks while smaller editors retained older implementations. These are application integration defects; the audit does not establish a provider outage.

## Confirmed defects and changes

- Aspect Patterns GET could read persisted drafts before authorization; preview also bypassed authorization. All operations now authorize first, and the browser forwards its existing credential for reads and previews.
- Aspect Pattern saves lacked version checks and used merge-on-conflict creation. Updates now require the opened version and matching record identity; creation cannot overwrite an existing record. Invalid or missing storage receipts cannot report success.
- Queue prepopulation could replace any non-LIVE draft. It now creates missing rows, preserves every existing row, and reports confirmed saves and the failed key when a batch stops.
- Source decisions and issue resolutions accepted empty or malformed save receipts. They now verify the stored identity and requested fields. Duplicate source decisions must be confirmed by a matching stored receipt. Resolution edits also require the opened version; competing first saves cannot upsert over one another.
- Report correction saves, discards, and publication lacked version checks. The editor forwards the opened unit version; conditional writes preserve newer work. Feedback approval now reports a conflict when another decision wins, and candidate creation requires a receipt.
- The shared JSON parser now enforces an object and a byte limit for both streamed and pre-parsed requests. Supporting storage consumers use a deadline that includes JSON body consumption, with invalid JSON and transport failures distinguished from client errors. Report storage retains legitimate 204 responses for deletion.
- Supporting inventories reject malformed row arrays instead of silently treating them as empty. Template-slot requests validate types and calendar dates before calculation or generation.
- Aspect Pattern refresh now keeps the selected record and its draft together instead of loading the first record's text under a different selection.

## Route inventory

Paths below are under `api/admin/`. A source review is distinct from an exercised lifecycle regression.

| Route(s) | Audit and verification |
| --- | --- |
| `generated-content.ts` | Existing actual-handler CRUD, create races, stale edits, archive/restore/delete, publication and shipped-reader round trips retained in required gate. |
| `user-generated-content.ts`, `content-publication.ts` | Prior release's actual-handler type, conflict, timeout, receipt and publication eligibility coverage rerun with shared parser changes. |
| `aspect-pattern-writeups.ts` | New actual-handler authorization, validation, create/update/conflict/receipt tests; existing natal/activation reader round trips; actual-handler browser save/reopen/conflict flow. |
| `prepopulate-content.ts` | New actual-handler draft preservation, invalid receipt and partial-batch tests; existing LIVE protection regression updated to require no PATCH. |
| `content-source-repair-decisions.ts` | Exact-plan governance preserved; new actual-handler receipt and duplicate confirmation tests use isolated storage. |
| `content-unresolved-resolutions.ts` | Actual-handler receipt, repeated edit and conflict tests; browser verifies selected issue and opened version submission. |
| `content-unresolved.ts`, `content-review-events.ts` | Actual-handler malformed inventory and anonymous-denial tests; stored decisions cannot become an apparently empty inventory after invalid JSON. |
| `content-live-status.ts` | Existing actual-handler/reader eligibility and full-source tests rerun; shared JSON transport and object validation. |
| `sky-draft-writing.ts` | Existing actual-handler reservation, generation/recheck and stale-write gate; complete-response deadline and reservation/save receipt shape checks. No paid generation. |
| `sky-review-horizon.ts`, `review-records.ts` | Source review of bounded lists/cursors, auth and storage reads; malformed arrays rejected, complete-response deadlines. Horizon fails explicitly when its inventory cap is reached. |
| `natal-placement-preview.ts`, `transit-natal-preview.ts` | Existing exact-source and reader preview tests; complete-response deadline; current publication checks retained. |
| `sky-article-template-slots.ts` | Actual-handler invalid types/dates and anonymous denial; approved reference-template requirements retained. No model calls. |
| `content-facts.ts`, `sky-v4-preview.ts`, `sky-fallback-variant-preview.ts` | Shared object parser; existing normalization/preview tests and source review. Computation stays outside the editor. |
| `sky-article-facts.ts`, `content-coverage.ts`, `memory-graph.ts` | Source-reviewed read-only calculations/static inventory; existing authorization and memory gates retained. |
| `aspect-pattern-fixtures.ts` | Public deterministic fixtures, no persisted drafts or storage access; intentionally distinct from the protected write-up inventory. |
| `content-source-repair-plans.ts` | Helper module, not an HTTP handler; exact candidate hash and unsigned governance metadata unchanged. |
| `generated-report-feedback.ts` | Actual-handler candidate receipt, approval race, malformed input and anonymous denial; owner-feedback governance regression. |
| `report-fulfillment.ts` | Actual-handler correction stage/publish/discard, exact copy, stale version and bad receipt tests; browser verifies version submission. Existing fulfillment regressions cover surrounding operations. |
| `friend-report-test-cleanup.ts` | Separate destructive operation: source-reviewed admin authentication, dry-run default and explicit confirmation boundary. No cleanup invoked. Shared report transport preserves 204 responses. |

## Release evidence

Required: `npm run test:content-studio-api` from this isolated checkout, exact-head GitHub API gate and `visual-smoke`, fresh local editor flows, CSS audit, then main deployment identity and read-only production checks. The PR records final commit-specific results. No real content was created, approved, retired, deleted, or generated for this audit's tests.

The new handler suites are `test-content-studio-aspect-crud.mts`, `test-content-studio-support-crud.mts`, and `test-content-studio-report-crud.mts`; all run in the mandatory API command. The first Aspect Patterns regression run failed all three groups against the old implementation. Supporting read, prepopulation and template-validation regressions also failed before the fixes. Resolution/decision fixtures seed only the test process's report cache when the current generated report has no open issues.

CI exposed two release-test timing limits: the expanded API-plus-reader Sky placement job reached 15 minutes while its reader tests were running, so its job budget is 30 minutes; the Moon-event fixture checked asynchronously computed event copy after only five seconds, so that exact-copy assertion now waits up to 30 seconds. Text, event-link, and exclusion assertions are unchanged. The same Moon fixture passed unchanged in a fresh local reproduction.

The subsequent recovery run exposed the same readiness inconsistency after reloading the Lilith/Pluto transit list: initial entry allowed 45 seconds, while reload used the default five seconds. Reload now waits for the row with the same 45-second budget before checking the complete interpretation and mobile layout. Both the unchanged reproduction and the corrected fresh-build test passed locally; no reader assertions were removed.

The broad visual job also exhausted its 30-minute budget while still completing the expanded reader matrix. Its limit is now 45 minutes, retaining all suites and individual test budgets. Three Calendar checks failed while the visible surface still said “Calculating calendar”; all passed unchanged locally. The shared route helper now requires the calculated calendar body within its existing 15-second route budget before a test examines its content.

The local privacy hook rejected the recovery fixture's pre-existing owner birth data. That fixture now uses a synthetic chart whose calculated Pluto position retains the Lilith-square-Pluto regression; the alternate-time option no longer claims a specific rising sign. No privacy guard was bypassed.
