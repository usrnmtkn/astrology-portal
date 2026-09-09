# Production stability audit — September 9, 2026

## Scope and provenance

Started on `codex/production-stability-audit` from freshly fetched `origin/main`
at `01544a34a117065e43f29cebb71c373269e1e481`, zero commits ahead or behind.
Reviewed the recent loading, database, authentication, content-delivery, and
Studio-recovery changes following reports of continued instability.

This audit found a reproducible Studio database-query bottleneck and storage
response handling defects. It does not establish that one particular overnight
commit caused every reported symptom, or that the entire authenticated app is
now stable.

## Confirmed findings and fixes

### Later inventory pages scanned all earlier rows

The Studio's updated-time cursor used an OR predicate that PostgreSQL applied
as a filter, rather than an index condition. The existing timestamp/ID index
was present but a later page still traversed thousands of preceding rows.

Read-only production `EXPLAIN (ANALYZE, BUFFERS)` compared the same full-column
query, cursor and 400-row limit. The cursor was sampled at offset 8,000.

| Measurement | Existing query | Query with timestamp bound |
| --- | ---: | ---: |
| Execution time | 577.153 ms | 1.207 ms |
| Rows returned | 400 | 400 |
| Rows discarded by filter | 8,001 | 74 |
| Shared buffer hits | 8,372 | 474 |
| Disk reads / temporary writes | 0 / 0 | 0 / 0 |

The fix adds `updated_at <= cursorTime` alongside the existing exact cursor
predicate. The existing index starts at that timestamp; the original ID
comparison still orders ties correctly. Compatibility and date-range queries
keep their existing pagination. No migration, new index, content changes, or
access-policy changes are involved. These measurements are database execution
times, not end-to-end browser load times or guaranteed latency budgets.

### A stalled JSON body could outlive the storage deadline

The eight-second timeout previously ended when `fetch()` received response
headers. Reading the body happened afterward, outside the deadline. The
storage helper now keeps its abort signal and deadline active through the JSON
body read. An expired request returns HTTP 504. Successful responses containing
invalid JSON return HTTP 502 instead of being treated as absent data. Requests
that write content are not automatically retried.

### Invalid inventory responses could be reported as successful

An upstream HTTP 200 containing an object could pass through as a non-array
`rows` value, while null could throw during cursor construction. Inventory reads
now require an array and return HTTP 502 for a malformed row-list response. A
valid empty array remains a successful empty inventory.

The original Chrome Studio tab displayed an HTTP-200/expected-rows-array error.
Its raw authenticated network response could not be captured before the browser
debugger disconnected. The above malformed-response path is reproduced in the
actual API-handler test; it is not proof of the exact original response or the
cause of the earlier React white screen.

## Verification

- `npm run test:content-studio-api` passed after its required knowledge build.
  This includes API save/publish/reopen, current-revision conflicts, reader
  hydration, retirement, editorial status, and exact owner-copy preservation.
- `test-content-studio-storage-reliability.mjs` exercises the actual API handler
  with isolated storage responses: invalid object/null/JSON, valid empty data,
  and a body that stalls after headers. It verifies the outgoing cursor query.
- The same regression uses a 16,000-row PGlite table to compare full rows, body
  text, ordering and timestamp ties against the old query, including empty and
  before-all-row cursors. Its execution plan must use the timestamp index bound.
- `test-content-studio-crud-hydration-guards.mjs` and `git diff --check` passed.

### Actual production reads, without response mocks

At approximately 07:12–07:30 UTC the database management state was
`ACTIVE_HEALTHY`. SQL samples showed 19–25 connections, zero lock waiters, zero
idle-in-transaction sessions, and zero deadlocks. The database start time
remained September 8 at 17:11:03 UTC. The long-lived replication connection was
waiting for WAL, not executing a stuck application query. No reboot was made.

Public Supabase Auth health returned HTTP 200 in 790 ms; the first 1,000 public
publication records returned HTTP 200 in 208 ms. These are individual samples,
not a sustained-availability claim. An unauthenticated Studio API request
correctly returned HTTP 401 JSON.

A fresh, signed-out headless browser loaded production Sky, Saturn in Aries,
Calendar, You, Friends, and Studio routes. No page exceptions or HTTP failures
were observed on those six route checks. Saturn showed its article, key dates,
aspect section, and separate horoscopes. You, Friends, and Studio correctly
showed their sign-in state. Those checks included an eight-second settling wait;
the elapsed check times must not be presented as page-load measurements.

### Remaining verification limits

- Authenticated Friends data, Studio navigation and production CRUD still need
  verification through a working owner browser session. The local emergency
  credential was rejected by production; no credentials were changed.
- The Vercel connector denied production-log access for this team. Access was
  requested; server-log correlation remains incomplete.
- The deployed UI recovery tests from PR #712 used injected failures and mocked
  API responses. They verify recovery behavior, not production database health.
- Existing database advisory debt was reviewed without blanket schema changes.
  Historical temporary-file totals alone do not establish current resource
  exhaustion.

Merge/deployment evidence is recorded in the PR and release response after the
exact main deployment succeeds.
