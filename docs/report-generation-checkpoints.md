# You and Friends report checkpoints

The You day/week and Friends cron workers run the existing governed generation
pipeline with server-only model checkpoints. Each invocation can make one new
provider request. Later requests replay stored responses through the same fact,
shape, owner-voice, and judge logic, then continue at the next unsaved call.
Nothing is saved to the reader report until the full pipeline passes.

`transit_report_model_checkpoints` stores raw structured responses and usage,
scoped to a job, logical generation attempt, and step (maximum six). A SHA-256
hash binds the response to the exact prompt, model, provider, and schema. Changed
instructions/evidence stop the job instead of reusing a mismatched draft.

`checkpoint_attempt` on each job identifies the logical generation attempt.
Scheduler claims still increment `attempt`; an ordinary continuation refunds
only that claim. A stale claim keeps the checkpoint identity. An actual quality
failure retains the existing attempt cap/backoff and advances checkpoint_attempt
for a fresh generation. An explicit report retry also advances that identity.

Before sending a request, the worker inserts a unique `started` checkpoint. It
records the complete response before returning it to the pipeline. A provider
error, failed checkpoint write, or unconfirmed `started` row stops automatic
replay. Inspect the checkpoint before explicitly starting a fresh generation:
a timeout does not prove that the provider did no billable work. No provider
fallback is permitted inside a checkpointed call. Outside these two job workers,
the existing model transport behavior is unchanged.

The worker aborts its provider request within a 240-second invocation budget,
leaving time before Vercel's 300-second deadline to persist failure. An aborted
HTTP request cannot guarantee cancellation at the model provider. Completed
steps are retained for inspection; an interrupted in-flight step cannot be
recovered automatically without a confirmed response. This is not a claim of
exactly-once model execution.

The existing five-minute cron schedule drives continuation, so reports with
multiple calls can take several scheduler ticks to finish. Failed legacy jobs
are not automatically requeued by this migration or deployment.

Deploy the additive database migration before the application commit. The table
has RLS and no browser grants/policies. Service-role workers alone can access
intermediate drafts. Deleting a job cascades to its checkpoints.

Offline verification:

- `node --import tsx scripts/test-transit-reading-checkpoints.mts`
- `node scripts/test-report-quality-retries.mjs`
- `node scripts/test-generated-report-correction.mjs`
- `node --import tsx scripts/test-generated-report-judge-governance.mts`
- Run `apps/web/supabase/tests/transit_report_model_checkpoints.sql` against a
  migrated disposable database (the test rolls back its fixtures).

Evidence verification deduplicates file hashing only inside one synchronous
preparation or assertion. The scope is discarded on return or exception; no
verified-byte cache crosses an await or provider call. The next provider
boundary reads and hashes the sources again. This prevents multi-target
packets and checkpoint replay from repeatedly reading the full corpus for each
nested target while preserving source-drift and packet-integrity failures.
Regression: `node scripts/test-source-verification.mjs` (also included in the
production pre-call gate suite).
