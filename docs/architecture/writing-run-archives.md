# Exact writer and judge request archives

Owner request, 2026-11-18: preserve the exact prompts and selected evidence for
future writer/judge exports. Earlier runs with missing inputs cannot be repaired
by rebuilding their prompts from today's profiles or source library.

Every new dispatch through the app's OpenAI Responses, Anthropic Messages, and
Gemini Interactions writing transports first persists its final serialized JSON
body in `writing_run_archives`. This occurs after instruction assembly, saved
profile selection, live feedback hydration, evidence selection, and report
request limits. The exact transmitted `instructions`, `system`,
`system_instruction`, `input`, and `messages` fields are also recorded as evidence
with JSON pointers and hashes. They contain whatever this specific writer or
judge actually received: full selected passages, facts, examples, feedback, and
candidate text. A cold reader which received only rendered prose is recorded
honestly; it is not retroactively supplied the writer's evidence.

The archive does not change prompts, model routing, authorization, billing
budgets, publication, retry policy, or source selection. Each physical dispatch,
including a permitted retry, gets a distinct UUID. Polling, cancellation, replay
of an existing completed checkpoint, and manual writing do not create new model
runs. Shared offline transports also require archive storage when they dispatch;
standalone historical scripts outside these transports are not covered.

## Integrity and privacy

The request string is hashed before dispatch, and a second hash covers the
immutable metadata, request, and evidence. The insert's returned database row
must match and verify before the provider is contacted. A missing configuration,
unavailable table, failed insert, or mismatched readback stops generation. There
is no environment-dependent bypass or in-memory production fallback. Fixtures
inject storage explicitly through an isolated async context.

The table has RLS enabled and no client policies. Anonymous and signed-in browser
roles have no privileges. The server service role may insert/read and update
only transport outcome columns; it cannot change prompts, evidence, correlation
metadata, or delete rows. Reader content rows and public assets never contain
these archives. Authentication headers and provider keys are excluded. Payloads
can contain private source material and report facts; only the existing Content
Studio owner access boundary or service-authorized export may read them.

`dispatch_reserved` proves a durable request, not provider delivery. A crash at
that boundary leaves an explicitly uncertain reservation. `response_received`
means HTTP response headers were received, not that prose completed or passed a
judge. `provider_rejected` records a non-success HTTP response, and
`outcome_unknown` records a transport exception. Native streams are not consumed
by the archive; existing operation checkpoints retain completion and recovery.
A post-dispatch archive-outcome failure raises a distinct error and cannot
trigger the report client's provider fallback. Never automatically replay a
request just because its archive outcome is uncertain.

Surface/family/role, content key, period/sign, operation/edition, report/job,
checkpoint/attempt/step, schema name, and report domain/horizon/unit are retained
when the caller has them. These identify runs without copying personal facts
into list metadata. Existing operation and job IDs connect the archive to the
saved result; streaming response IDs remain in the existing checkpoints.

## Inspect and export

`GET /api/admin/writing-runs` uses the existing Content Studio authentication.
Lists contain metadata only. Filters: `surface`, `role`, `period`, `contentKey`;
`limit` is 1–100. Reuse the response's `through` and `next.before`/`next.beforeId`
for subsequent pages. `GET /api/admin/writing-runs?id=<UUID>` returns the verified
full record. All responses are private and non-cacheable; errors omit bodies,
credentials, and storage diagnostics.

Run the exporter with server credentials supplied through the environment or a
private environment file:

```sh
node scripts/export-writing-runs.mjs \
  --env-file /private/server.env \
  --out /private/new-writing-runs \
  --zip /private/new-writing-runs.zip
```

Use actual private absolute paths. Both destinations must be new and outside a
Git checkout. `--surface` optionally limits the export. The exporter fixes a
creation-time upper bound, paginates by time and UUID (including equal timestamps),
and verifies every record. Each run contains the exact `request-body.txt`, readable
`request.json`, `evidence.json`, and complete `record.json`. `INDEX.json` identifies
the runs and `MANIFEST.json` hashes the files. ZIP creation verifies archive CRCs.
Directories are owner-only and files are owner-readable/writable. Export failure
leaves its partial private directory for diagnosis; only an export with its final
index and manifest is complete. The command refuses to overwrite an earlier export.

Include this directory alongside current source prompts, Studio profiles and
feedback in future instruction ZIPs. The immutable run inputs answer what was
actually received; current profiles answer what a new run would select today.
An empty archive means no recorded dispatches, not reconstructed historical runs.

## Rollout and verification

Apply `apps/web/supabase/migrations/20261118164952_writing_run_archives.sql` before
releasing these transports. The migration creates a new table without changing
existing content or generation rows. Verify RLS, grants and the owner read path
without paid generation. Release through the normal reviewed main-branch process
and required affected API/browser/privacy gates. A rollback must retain the table
and its records. The implementation is not live merely because local tests pass.

`npm run test:writing-run-archive` covers final-byte equality, selected evidence,
concurrent contexts, retries, failed storage/dispatch, stream preservation,
immutable database grants using real PostgreSQL in PGlite, the actual owner API
handler, pagination, and exact ZIP round trips. Tests use synthetic inputs and
intercept every provider request. Existing writer/judge tests inject private
fixture storage; none need a real model call.
