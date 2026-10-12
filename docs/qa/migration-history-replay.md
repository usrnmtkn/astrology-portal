# Migration history replay repair

Supabase stores executable SQL in `supabase_migrations.schema_migrations.statements`.
An audit note in that column cannot be replayed when preparing a preview database.
Keep descriptive receipts outside the executable statements array. Do not mark a
migration reverted merely to remove a bad statement: that loses its applied status.

The birth-time history repair emits SQL from the original repository migration,
verifies its recorded SHA-256, and replaces only the exact known annotation. It
preserves the version, name, other metadata and unrelated migration records. An
already repaired entry is a no-op; missing or changed history fails closed.

Before running the emitted SQL through an authorized database connection, retain
a protected snapshot of the target history record and fingerprints of the other
records, affected function definitions/grants, profile policies and trigger.
Afterward, verify the stored SQL against the source hash and compare those
fingerprints. Keep operational snapshots outside Git.

```sh
node scripts/repair-birth-time-migration-history.mjs > /protected/path/repair.sql
node scripts/test-migration-history-repair.mjs
node scripts/test-profile-persistence-permissions.mjs
```

The script only prints SQL. Applying it changes migration metadata; it must not
execute the historical migration against production. That migration contains a
profile backfill and function permissions that were subsequently updated.

The regression reproduces the syntax failure, exercises the guarded repair in
PostgreSQL, replays the restored SQL in an isolated database, and checks later
permissions, idempotence and refusal of unexpected history. The normal Content
Studio API suite includes it. A hosted preview remains the integration check for
the complete branch setup; local replay does not establish all migrations are
healthy.

References: [Supabase migration history repair](https://supabase.com/docs/reference/cli/supabase-migration-repair)
and [branch deployment troubleshooting](https://supabase.com/docs/guides/deployment/branching/troubleshooting).

## Source reconciliation on 2026-10-12

The production ledger contained two migrations missing from the repository. Their
recorded SQL was restored byte-for-byte under its original production version:

| Version and name | SHA-256 of recorded SQL |
| --- | --- |
| `20260907074128_ask_tldr_owner_preview_content_studio` | `015f89df58f309508ae9c3b527ee91dd59cddd88d8bffa98feb7c44e414e7346` |
| `20260914150654_studio_explicit_writing_feedback` | `ad8320a9e8145c3f86159dc3488708bb220ffa55553d5c746b89dc16b3b2287b` |

This restores source history; neither migration was reapplied to production.
`content_studio_reader_cutover` already exists byte-for-byte at
`scripts/sql/content-studio-reader-cutover.sql` (SHA-256
`7634c04b05c4f15f6548509a8090368238ce9c5cc6de727cda6a3d25f4128ec4`).
It remains a separate activation step, as documented by the reader cutover
workflow; duplicating it as an additive migration would change that sequence.

`scripts/test-restored-studio-migrations.mjs` verifies these hashes and replays
the SQL in isolated PostgreSQL. It checks private preview constraints, feedback
capture and idempotent retries, conflicting retries, retirement, role isolation,
preservation of existing text, and removal of raw reader grants.

This is not full ledger reconciliation. Seventeen historical migration names
still have different local and production timestamps. Each requires an exact SQL
and dependency comparison before any history repair. Do not bulk-push migrations
or mark them applied solely because their names match. No historical ledger
metadata was changed by this source restoration.

The new `20261012040303_restrict_report_facts_claim_execution` migration was
applied to production. Verification confirmed that `anon` and `authenticated`
cannot execute the report-facts claim function, while `service_role` still can.
Its isolated regression also checks unchanged function behavior and saved rows.
