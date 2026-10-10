# Weekly batch storage timeout repair

A Weekly batch could repeatedly display the same writing stage when its request
reservation failed in storage. No provider call could start without that saved
reservation. The browser reconciled the unchanged row and retried indefinitely.

The checkpoint RPCs now have a function-specific 25-second statement deadline,
below the server's 30-second storage deadline. Other database limits remain
unchanged. PostgREST reloads its schema cache to use the function settings.
See [Supabase statement timeouts](https://supabase.com/docs/guides/database/postgres/timeouts).

The private version trigger checks its existing unique hash before attempting an
insert. Previously it offered both OLD and NEW full snapshots to ON CONFLICT on
every checkpoint, including the already captured OLD version. The precheck
avoids redundant snapshot storage work. The unique constraint remains the race
guard; complete originals, hashes, immutable history and access controls stay
intact. Neither migration rewrites existing content or archive rows.

Three consecutive connection failures without confirmed progress now stop the
batch with a visible error. A successful response or a confirmed newer version
resets that counter. Existing provider results remain recoverable; no paid
retry is introduced. The cost notice explicitly names the remaining batch size.

## Regression coverage

- Real PostgreSQL checkpoint SQL with over 40 MB of synthetic nested history,
  the generated Studio listing column and the private audit trigger.
- Exact-version conflicts, immutable audit history, permission boundaries,
  atomic rollback when archival fails, and unchanged original text.
- Archive sequence assertions prove duplicate OLD versions do not attempt an
  insert; all 31 distinct versions remain available after 30 edits.
- The real API handler fails three reservations before dispatch: no writer or
  reviewer calls, no changed source row, visible stop, and explicit recovery.
- One approved batch subsequently completes all four missing readings, preserves
  the eight existing readings and remains unpublished after reload.
- Complete twelve-sign Gemini sequences on desktop and mobile, prolonged review,
  lost acknowledgements, interrupted reviews, model changes and pause/resume.

Browser fixtures use synthetic providers and storage; they verify orchestration,
not model prose quality or live provider availability. Production verification
must inspect the actual saved edition separately before claiming completion.
