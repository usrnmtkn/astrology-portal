# Weekly checkpoint transport

Weekly editions retain complete writing evidence and rejected drafts. Reposting
that growing document for every state change made reservation and native stream
result saves vulnerable to storage timeouts. A compact save acknowledgement did
not fix the oversized upload. Native Gemini/Claude also performed a separate
response-ID save after dispatch, which could race the background result save.

`checkpoint_weekly_horoscope` now applies changed fields and appended history
inside PostgreSQL, under the opened row version and a row lock. It returns only
the row ID and trigger-generated version. The complete history remains in the
original row. Only the service role can execute this invoker-security function;
it admits Weekly DRAFT horoscope rows and cannot publish them.

Native stream IDs are deterministic and saved with the reservation before a
provider call begins. The background result uses the same acknowledged storage
path, a unique write identity, exact readback, and a deadline bounded by the
original function invocation. Storage retries cannot dispatch provider calls.

The browser can repeat a failed reservation only when the server explicitly
confirms dispatch never started and a fresh read shows the entire row unchanged.
A lost response that confirms the exact interrupted request was held may advance
the already approved batch to other signs. It cannot replay that held request or
ignore an unrelated owner edit. Provider failures remain visible; unknown paid
outcomes require explicit release and approval before a replacement request.

## Verification

- `scripts/test-horoscope-checkpoint-sql.mts` executes the migration in isolated
  PostgreSQL (PGlite), including >17 MB retained history, compact receipts, stale
  versions, append/delete/null changes, invalid-write rollback, role permissions,
  and Weekly DRAFT isolation. It is part of `test:content-studio-api`.
- The actual writer/review handler regression completes all twelve synthetic
  signs with >17 MB history, an upload ceiling, and a lost native-result save
  acknowledgement. It checks exact history and provider request counts.
- Fresh browser tests exercise desktop/light and mobile/dark, all twelve signs,
  failed unbilled reservations, lost acknowledgements, long reviews, reopening,
  manual progress checks, interrupted streams, and retained drafts.

These tests use synthetic provider responses. They do not certify provider
availability, prose quality, or completion of an owner's live edition. Deployment
verification must identify the actual main revision and keep paid live generation
within the owner's approved scope.
