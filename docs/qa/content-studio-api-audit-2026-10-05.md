# Content Studio API audit — October 5, 2026

Base: `80d60f32b2e6787e6d635c1d71db984f34961c07`. Branch: `fix/studio-api-audit-20261005`, created at freshly fetched main with independent npm-ci dependencies.

## Scope and evidence rules

All 37 HTTP handlers under `api/admin`, their Studio callers and storage/reader dependencies are inventoried below. Two helper modules are not HTTP routes. The deterministic Aspect Patterns fixture route is public; the other 36 routes require owner access. Billing and paid provider execution are excluded. Source/test references are coverage pointers, not claims that every lifecycle or production mutation was exercised.

Every required API run now checks the route inventory against actual exported handlers and exercises anonymous, ordinary-user (including forged user metadata), and expired-session denial for declared methods. Each request must fail before any storage or model call. Production writes are not used as acceptance evidence.

## Route inventory

| Route | Methods | Access | Existing focused test references (review alongside actual assertions) |
| --- | --- | --- | --- |
| `/api/admin/aspect-pattern-fixtures` | GET | public-fixture | `scripts/test-aspect-pattern-diagnostics-view.mjs` |
| `/api/admin/aspect-pattern-writeups` | GET, POST, PATCH | owner | `scripts/test-natal-aspect-pattern-reader-contract.mjs`; `scripts/test-content-studio-aspect-crud.mts`; `scripts/test-content-authority-map-v1.mjs`; `scripts/test-aspect-pattern-writeups-runtime.mjs` |
| `/api/admin/calendar-feed-events` | GET, PATCH, POST | owner | `scripts/test-calendar-subscriptions.mts`; `tests/visual/calendar-subscriptions.spec.ts`; `tests/visual/lunation-writing-studio.spec.ts` |
| `/api/admin/calendar-lunation-writing` | GET, POST | owner | `scripts/test-lunation-studio.mts`; `scripts/test-article-writer-deployment-assets.mjs`; `tests/visual/lunation-studio.spec.ts` |
| `/api/admin/content-coverage` | GET | owner | `scripts/test-content-coverage-deployment.mts`; `scripts/test-content-coverage-authority-chain.mjs`; `scripts/test-content-coverage-dashboard-current.mjs`; `tests/visual/content-studio-needs-attention.spec.ts` |
| `/api/admin/content-facts` | POST | owner | `scripts/test-content-studio-admin-api-contract.mjs`; `scripts/test-production-identifier-coverage.mjs`; `scripts/test-production-sky-emission-coverage.mjs` |
| `/api/admin/content-history` | GET | owner | `scripts/test-calendar-passage-editor.mts`; `scripts/test-content-studio-private-versions.mts`; `tests/visual/calendar-passage-editor.spec.ts` |
| `/api/admin/content-live-status` | POST | owner | `scripts/test-content-live-status.mts`; `scripts/test-content-live-status-node-runtime.mjs`; `scripts/test-studio-auth-availability.mts`; `tests/visual/calendar-season-transitions.spec.ts` |
| `/api/admin/content-publication` | POST | owner | `scripts/test-content-studio-secondary-crud.mts`; `scripts/test-lunation-studio.mts`; `scripts/test-horoscope-writing-profiles.mts`; `scripts/test-platform-json-body.mts` |
| `/api/admin/content-review-events` | GET | owner | `scripts/test-content-studio-admin-api-contract.mjs`; `scripts/test-content-studio-support-crud.mts`; `scripts/test-content-review-event-queue.mjs` |
| `/api/admin/content-source-repair-decisions` | POST | owner | `scripts/test-content-studio-admin-api-contract.mjs`; `scripts/test-content-unresolved-studio.mts`; `scripts/test-content-studio-support-crud.mts` |
| `/api/admin/content-unresolved-resolutions` | POST | owner | `scripts/test-content-studio-admin-api-contract.mjs`; `scripts/test-content-unresolved-studio.mts`; `scripts/test-content-studio-support-crud.mts` |
| `/api/admin/content-unresolved` | GET | owner | `scripts/test-content-studio-admin-api-contract.mjs`; `scripts/test-content-unresolved-studio.mts`; `scripts/test-content-studio-support-crud.mts`; `tests/visual/content-dashboard-admin-user-flows.spec.ts` |
| `/api/admin/friend-report-test-cleanup` | POST | owner | `scripts/test-friend-report-paid-lifecycle.mts` |
| `/api/admin/generated-content-inventory` | GET | owner | `scripts/test-studio-package-source.mjs`; `scripts/test-calendar-transition-phrases.mts`; `scripts/test-sky-secondary-editor-crud.mts`; `scripts/test-sky-moon-studio.mts` |
| `/api/admin/generated-content` | POST, PATCH, GET, DELETE | owner | `scripts/test-calendar-planetary-studio.mts`; `scripts/test-content-studio-atomic-concurrency.mjs`; `scripts/test-horoscope-rejection.mts`; `scripts/test-content-studio-transit-friend-editor.mjs` |
| `/api/admin/generated-report-feedback` | GET, POST | owner | `scripts/test-generated-report-judge-governance.mts`; `scripts/test-content-studio-report-crud.mts` |
| `/api/admin/horoscope-writing` | POST | owner | `scripts/test-horoscope-rejection.mts`; `scripts/test-horoscope-depth.mts`; `scripts/test-article-writer-deployment-assets.mjs`; `scripts/test-horoscope-seasonal-meaning.mts` |
| `/api/admin/lunation-writing` | GET, POST | owner | `scripts/test-article-writer-deployment-assets.mjs`; `scripts/test-lunation-writing-studio.mts`; `tests/visual/lunation-studio.spec.ts`; `tests/visual/studio-dedicated-editor-routing.spec.ts` |
| `/api/admin/memory-graph` | GET | owner | `scripts/test-agent-memory.mjs`; `tests/memory/graph.spec.ts`; `tests/visual/content-dashboard-admin-user-flows.spec.ts`; `tests/visual/studio-memory-feedback.spec.ts` |
| `/api/admin/natal-placement-preview` | POST | owner | `scripts/test-uranus-scorpio-owner-copy.mjs`; `scripts/test-admin-natal-placement-preview-api.mjs`; `scripts/test-content-studio-admin-api-contract.mjs`; `scripts/test-content-publication-reader.mts` |
| `/api/admin/package-source` | GET | owner | `scripts/test-studio-package-source.mjs`; `tests/visual/sky-placement-legacy-editor.spec.ts` |
| `/api/admin/personal-transit-writing` | POST | owner | `scripts/test-content-studio-admin-api-contract.mjs`; `scripts/test-personal-transit-writer.mjs`; `scripts/test-article-writer-deployment-assets.mjs` |
| `/api/admin/prepopulate-content` | POST | owner | `scripts/test-content-studio-prepopulate-live-race.mjs`; `scripts/test-content-studio-admin-api-contract.mjs`; `scripts/test-production-identifier-coverage.mjs`; `scripts/test-content-studio-support-crud.mts` |
| `/api/admin/report-fulfillment` | GET, POST | owner | `scripts/test-report-fulfillment.mjs`; `scripts/test-admin-report-copy-editor.mjs`; `scripts/test-content-studio-report-crud.mts` |
| `/api/admin/review-records-fast` | GET | owner | `scripts/test-content-studio-admin-api-contract.mjs`; `scripts/test-studio-review-bootstrap.mts` |
| `/api/admin/review-records` | GET | owner | `scripts/test-admin-daily-glance-studio.mts`; `scripts/test-content-studio-admin-api-contract.mjs`; `scripts/test-calculation-api-failure-reporting.mjs`; `scripts/test-production-identifier-coverage.mjs` |
| `/api/admin/sky-article-facts` | GET | owner | `scripts/test-content-studio-admin-api-contract.mjs` |
| `/api/admin/sky-article-template-slots` | POST | owner | `scripts/test-content-studio-support-crud.mts`; `scripts/test-article-writer-deployment-assets.mjs`; `scripts/test-studio-article-writer.mjs` |
| `/api/admin/sky-article-writing` | POST | owner | `scripts/test-calculation-api-failure-reporting.mjs`; `scripts/test-article-writer-deployment-assets.mjs`; `scripts/test-studio-article-writer.mjs` |
| `/api/admin/sky-draft-writing` | POST | owner | `scripts/test-sky-writing-memory.mjs`; `tests/visual/calendar-aspect-create.spec.ts`; `tests/visual/review-queue-workflow.spec.ts`; `tests/visual/studio-memory-feedback.spec.ts` |
| `/api/admin/sky-fallback-variant-preview` | POST | owner | `scripts/test-sky-v4-preview-api.mts` |
| `/api/admin/sky-review-horizon` | GET | owner | `scripts/test-content-studio-admin-api-contract.mjs`; `scripts/test-sky-90-day-review-horizon.mjs`; `tests/visual/review-queue-workflow.spec.ts` |
| `/api/admin/sky-v4-preview` | POST | owner | `scripts/test-calendar-aspect-content-studio-drafts.mjs`; `scripts/test-sky-v4-preview-api.mts`; `scripts/test-content-studio-admin-api-contract.mjs` |
| `/api/admin/studio-memory-feedback` | GET, POST | owner | `scripts/test-platform-json-body.mts`; `scripts/test-studio-memory-feedback.mjs`; `tests/visual/studio-article-memory.spec.ts`; `tests/visual/studio-memory-feedback.spec.ts` |
| `/api/admin/transit-natal-preview` | POST | owner | `scripts/test-transit-natal-preview-api.mts`; `scripts/test-content-studio-api-roundtrip.mjs`; `scripts/test-content-live-status-node-runtime.mjs`; `tests/visual/content-dashboard-admin-user-flows.spec.ts` |
| `/api/admin/user-generated-content` | GET, PATCH | owner | `scripts/test-content-studio-secondary-crud.mts`; `scripts/test-content-studio-admin-api-contract.mjs`; `scripts/test-platform-json-body.mts`; `scripts/test-editorial-copy-api.mts` |

## Confirmed defects and regressions

- Inventory pagination returned 14 rows for twelve lunar ingress keys when two saved rows appeared before the final page. Final-page starter injection checked only that page. The fix performs bounded key-only existence checks across all saved states before adding a bundled source; saved revisions and archives retain precedence.
- Starter rows ignored status, visibility, surface and mode filters. The fix applies the same filters before returning a virtual row. Unconfirmed or truncated existence reads fail explicitly rather than replacing saved copy.
- Malformed inventory cursors returned HTTP 500. They now return 400 before storage; unsafe embedded filter syntax is rejected.
- Studio memory feedback bypassed the shared platform body parser. Its actual handler now preserves malformed-JSON 400 and oversized-body 413 responses while keeping unexpected failures as server errors.

Before fixes, all four inventory integrity groups failed; the expanded parser regression failed only the newly covered memory endpoint. After fixes, those regressions pass. No authored text, review decisions, publication states, schema or access grants are changed.

## Verification results

| Criterion | Result and evidence |
| --- | --- |
| Route inventory / access boundary | Passed: 147 actual-handler requests across 36 protected routes, anonymous/ordinary/expired credentials; zero storage/provider calls. |
| Paginated source identity, state filters and error recovery | Passed: four new failing-before/passing-after handler groups. Twelve ingress identities remain twelve across page sizes 1, 2, 3 and 80. |
| Platform request parsing | Passed: six actual-handler groups, including memory feedback; invalid input makes zero storage calls. |
| Existing full API baseline | Passed on main base, before repairs. Full repaired-head run and hosted evidence recorded in the release PR. |
| Browser editing and reader | Passed: 17 fresh-build cases, desktop/mobile and light/dark; lunar ingress and Moon section edit/save/publish/reload, version conflicts, lost publication response, and invalid secondary-source recovery. All writes use isolated storage. |
| Admin typecheck | Passed. |

## Performance and failure evidence

`qa-studio-inventory-performance.mts` runs in the required API command with 16,000 synthetic records, 201 inventory pages, and 100 warm requests for each operation at concurrency 1 and 5. Listing p95 was 19/88 ms; detail and late-page p95 were 1/2 ms. Cold handler startup was 45 ms. Existing 2-second detail and 5-second list targets in this audit were retained. Complete detail text and all row identities are asserted, not only timings.

`qa-studio-save-performance.mts` additionally runs the actual generated-content mutation handler against SQL storage under `service_role`, with the real publication/version migrations. It verifies 200 complete save/readback cycles at concurrency 1 and 5, exact body/identity, advancing versions and unchanged draft status. Observed p95 was 2/6 ms, below the proposed 2-second save budget. The benchmark is also part of the required API command.

These are actual handler + PGlite PostgreSQL-engine timings through an isolated PostgREST adapter. They exclude network, Auth, CDN, and independent database sessions. They do not establish a production latency SLO or production write throughput. Hosted publication concurrency tests separately use distinct PostgreSQL 17 sessions. No production load test was run.


## Dependencies and retained boundaries

Inventory, draft, review, publication and reader dependencies were traced through their existing schema, access checks and SQL regressions. Detailed live operational observations are retained in the local audit report.


## Existing bundle gate failure

The final broad CI exposed an existing aggregate budget failure after all Sky Summary browser assertions passed. Main `80d60f32b` fails the same gate in run `37261794909`. Matched clean npm-ci builds of main and audit `5721dad9a`, using the workflow Supabase placeholders, produce 74 byte-identical JavaScript assets: entry 765,959 raw / 222,951 gzip bytes, aggregate 786,030 bytes. This is a 30-byte overage of the existing 786,000-byte cap, with zero browser growth from these API fixes. The aggregate allowance is reconciled to 786,250 bytes; all other limits and deferred-payload checks remain unchanged. Failure messages now include exact byte counts so rounding cannot conceal the reason.

## Browser fixture lifecycle

The Moon reader regression exposed teardown failures after its copy and publication assertions passed: its isolated API process could be killed with a read still pending, and a late context guard could race browser shutdown. The test now navigates to a blank page while its fixture is available, waits for both routing layers to finish, and then stops the process. This changes test cleanup only; assertions and production-write isolation remain intact. Repeated variants and final release evidence are recorded in the PR.

## Evidence and limitations


Live operational details are retained locally rather than published in this repository. No production content, approval, publication, database schema or access grant was mutated. No paid model calls were made. A source-test reference is not proof of a complete lifecycle; the test suite, SQL role probes, browser fixtures and live read-only observations are separate evidence. End-to-end production mutations and a production save-latency SLO remain unverified by design. Release SHA, hosted checks and post-deployment results belong in the PR.
