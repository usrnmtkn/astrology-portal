# Content Studio API QA — October 4, 2026

**Result: not a clean pass.** The current Content Studio CRUD and Moon publishing regressions pass, and the live Moon sources match the saved database versions. This pass found two remaining defects: an authenticated profile-save permission failure and incorrect handling of malformed JSON in the deployed Node runtime.

Tested production `https://tldrastro.vercel.app` and commit `7ce5aab98ada02a891a6b05bdf4bff99ca268803`, on branch `qa/content-studio-api-20261004`. The checkout started clean and matched freshly fetched `origin/main`. QA ran approximately 14:42–14:59 UTC on October 4. No application fix, database change, content edit, paid generation, merge, or deployment was performed in this pass.

## Findings

### P1 — authenticated profile saves fail inside a database trigger

The production `normalize_user_profile_birth_times` trigger runs with the caller's privileges and calls `public.canonical_birth_time_text(text)`. The latter grants EXECUTE only to `postgres` and `service_role`; `authenticated` cannot execute it. A correctly authenticated owner can therefore pass the table's ownership policy and still receive an HTTP 403 when saving a profile.

Evidence:

- In the bounded production log window, two POSTs to `/rest/v1/user_profiles` returned 403 from the production app. Both had an authenticated JWT role and an authenticated user. The same window also contained two PostgreSQL permission errors with SQLSTATE `42501`, with both the profile trigger and birth-time helper named in the error context.
- Production schema inspection confirmed the invoker trigger, missing helper permission, and existing authenticated INSERT/UPDATE/SELECT grants and ownership policies. Broad table grants or relaxing RLS would not address this cause.
- An isolated PGlite reproduction executed the actual migration's normalization functions and helper grants, with authenticated role and owner policies. Upserts failed with `permission denied for function canonical_birth_time_text` for a known birth time, an empty charts array, and a missing charts field. Failed writes preserved the previous stored row.
- The app's profile persistence catch falls back to its local cache and logs a warning. This can leave the local profile looking updated while the cloud profile remains unchanged.

Relevant source: `apps/web/supabase/migrations/20260810210000_birth_time_normalization.sql:80`, the helper call at line 96, and revocation at line 141; `apps/web/src/services/auth.ts` (`upsertPersistedProfile`); `apps/web/src/App.tsx:13093`.

Required follow-up: repair the helper/trigger permission arrangement narrowly, preserving ownership RLS. Add database tests that run real profile inserts and updates as `authenticated`, including another owner's row being denied. This is a profile API defect separate from the Studio source retrieval fixes.

### P2 — malformed JSON is classified as an outage

Production reproduction:

```sh
curl -i 'https://tldrastro.vercel.app/api/content-reader' \
  -H 'Content-Type: application/json' --data-binary '{invalid'
```

Expected: HTTP 400. Observed: HTTP 503, with the generic published-content-unavailable message, in 42 ms.

`readAdminJsonBody` reads `req.body` before normalizing parse errors. Vercel populates that property through a lazy getter that throws its own `ApiError(400)` on malformed JSON. It is not an instance of the application's `AdminHttpError`, so the reader maps it to 503. The main generated-content handler has a separate body parser with the same gap and maps it to 500.

Isolated actual-handler reproduction, with a synthetic platform-style getter and zero network calls:

| Handler | Raw Node stream | Vercel-style lazy body getter |
| --- | ---: | ---: |
| POST content-reader | 400 | 503 |
| PATCH admin/generated-content | 400 | 500 |

The admin PATCH reproduction was local only. No malformed authenticated write was submitted to production. Existing parser tests cover malformed streams and already parsed bodies, but not a throwing platform getter.

Relevant source: `api/_lib/admin-http.ts:40`, `api/content-reader.ts` error mapping, and `api/admin/generated-content.ts:1163`. Vercel documents the throwing getter in its [Node request-body guidance](https://vercel.com/docs/functions/runtimes/node-js#request-body); the [runtime helper implementation](https://github.com/vercel/vercel/blob/main/packages/node/src/serverless-functions/helpers.ts) throws an `ApiError` with status 400.

Required follow-up: normalize platform parser failures at the request-body boundary and add regressions for both actual handlers. Valid storage failures must continue to receive a distinct server-error response.

## Checks completed

| Check | Result |
| --- | --- |
| Full unfiltered `npm run test:content-studio-api` at the tested commit | Passed, exit 0 |
| Hosted CI at that exact main commit | 43 successful, 1 skipped, none pending or failed |
| Production API probe matrix | 18 passed; 1 failed — malformed JSON above |
| Browser recovery tests against deployed frontend with isolated handler/storage fixtures | 13 passed |
| Actual authenticated production Studio load | Connected, 597 rows; no partial-load error observed |
| Moon in Cancer selected sources | Opening, How it shows up, Challenge and response all Live |
| Moon opening editor | Opens its live source, with saved content available and no retrieval error |
| Published Moon reader API | Three returned source bodies and `packageRecord.body_you` hashes match their saved database bodies |
| Publication linkage | All 4,088 live content entries match their row ID, content key, version, LIVE status and serving lane; zero invalid links |
| Complete public ledger and conditional read | 4,100 unique entries; ETag revalidation returns 304 |
| Database activity snapshot | No blocked sessions or idle transactions observed |

The full suite includes actual handler CRUD, stale-write conflicts, publication and retirement behavior, isolated database atomicity/receipt tests, private-data projection, secondary-source failures, and complete Moon write-up loading. The new findings above expose coverage gaps despite that suite passing.

The 13 browser tests cover five invalid-secondary-response recovery cases, four complete Moon discovery/edit/reload cases, and four version-conflict/lost-publication recovery cases across desktop/mobile sizes and light/dark themes. All writes in these browser tests use isolated fixtures; the real owner-session check was read-only.

Production probes also verified all five `/api/health` dependency checks, anonymous 401 responses on nine admin endpoints, reader method/field/cursor/prefix/body-size validation, and reader projection without draft or reviewer-only fields. The ledger contains 4,088 live content entries, one live initialization marker and 11 retired entries.

## Supabase request evidence

Fixed log window: **2026-10-03 19:50:00 UTC through 2026-10-04 14:42:08 UTC**. This is historical production evidence, not a load test.

| Operation | Successful requests | Origin p95 | Maximum |
| --- | ---: | ---: | ---: |
| Auth `/auth/v1/user` GET | 4,148 | 302 ms | 601 ms |
| Generated interpretations GET | 7,645 | 445 ms | 1,054 ms |
| Generated interpretations PATCH | 5 | 453 ms | 480 ms |
| Content publications GET | 6,963 | 403 ms | 2,351 ms |
| Content runtime revision RPC | 201 | 115 ms | 415 ms |

No Supabase edge 5xx statuses were found in that window. This does not claim that every Vercel handler response was successful; the malformed-body probe demonstrated an application-level 503 afterward.

There were 678 generated-content 401 responses from two older preview deployment origins, plus the two authenticated production profile 403s described above. The preview denials do not justify changing production access policies.

## Evidence and reproducibility

Local evidence from this run:

- `/private/tmp/studio-api-qa-20261004-full.log`
- `/private/tmp/studio-api-qa-20261004-browser.log`
- `/private/tmp/studio-api-qa-ci-main.json`
- `/private/tmp/studio-api-production-probes-20261004.mjs`
- `/private/tmp/studio-api-production-probes-20261004.json`
- `/private/tmp/studio-api-body-parser-repro-20261004.mts`
- `/private/tmp/studio-api-body-parser-repro-20261004.json`
- `/private/tmp/studio-api-profile-permission-repro-20261004.mjs`
- `/private/tmp/studio-api-profile-permission-repro-20261004.json`

Browser command:

```sh
STUDIO_PRODUCTION_ENTRY=1 PLAYWRIGHT_BASE_URL=https://tldrastro.vercel.app \
  npx playwright test -c playwright.config.ts --workers=1 \
  tests/visual/content-studio-recovery.spec.ts \
  tests/visual/studio-publication-recovery.spec.ts \
  tests/visual/sky-moon-publication-reader.spec.ts \
  --grep 'invalid secondary responses|Version conflict|Moon complete'
```

Scope: the Content Studio CRUD/publication/reader path, its dependencies, and relevant Supabase errors. This is not an exhaustive assessment of every product API, a paid-generation test, a production write test, or a concurrency/load certification. The earlier Studio fixes are deployed; the two newly found defects remain unfixed at the close of this QA pass.

## Authorized repair follow-up

The owner subsequently requested an explanation and implementation of both fixes.

Cause history:

- The profile failure originated in commit `eaea63928ffef1e4c7a9e588a1d70797cfc675bc` (August 10, 2026), which introduced both the invoker trigger and the helper permission revocation. The existing report-migration test verifies normalization as the database owner; it does not switch to `authenticated` for profile writes. That privileged test could pass despite the client-role failure.
- The generated-content parser's September 10 validation repair (`988947e59`, PR #739) added catches around explicit `JSON.parse` calls but left the platform `req.body` access outside that normalization. The shared parser had the same gap. Local raw-stream tests therefore missed the deployed getter's exception.

Implementation:

- A new migration grants only `EXECUTE` on the pure `canonical_birth_time_text(text)` helper to `authenticated`. It changes no profile rows, table grants, function bodies, or ownership policies; both functions remain invokers and anonymous helper access remains denied.
- Both parser paths use a shared platform-body accessor that normalizes malformed JSON and body-size failures while preserving unexpected errors. Reader validation errors describe bad input instead of reporting a storage outage. Generated-content responses explicitly use `no-store`.
- `test-platform-json-body.mts` exercises five actual handler/method combinations with raw malformed input, Vercel-style 400 errors, native syntax errors, 413 errors, unexpected runtime failures, zero storage calls, and authorization before parsing.
- `test-profile-persistence-permissions.mjs` first reproduces the original denial, then applies the repair and exercises the real SQL under the authenticated role: create/update/reload, exact unrelated fields, invalid-time rollback, empty/unknown chart times, anonymous denial and cross-owner protection.
- Both regressions run in the mandatory unfiltered `test:content-studio-api` gate. Before the fixes, all five platform-handler groups and the profile regression failed. After implementation, the focused regressions pass.

Release verification is recorded in the repair PR; local implementation alone is not a production deployment claim.
