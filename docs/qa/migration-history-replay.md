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
