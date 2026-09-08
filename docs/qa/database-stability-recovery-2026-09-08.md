# Database stability recovery — September 8, 2026

Started from refreshed `origin/main` at `63950131` in a clean worktree.

## Findings and changes

- The fast reboot did not recover sustained service. SQL diagnostic connections
  repeatedly timed out while the management API intermittently reported healthy.
- The project was still on Nano. Applied the dashboard's Nano → Micro and
  2 GB → 8 GB change; its cost comparison was $9.68/month before and after.
  Micro completed its restart by 17:11 UTC. No credentials, permissions, or
  reader content were changed.
- Production already had the September 2 hydration indexes. A provider reader
  query still chose two bitmap scans and a sort of 3,607 wide rows. Its estimate
  was 920 rows before ANALYZE and 937 afterward. The sort spilled 4,904 KiB to
  disk (615 temporary blocks written).
- Added a partial `(provider,id)` index for live serving rows with no review
  state, plus multicolumn MCV/dependency statistics for the correlated filters.
  Production migration ledger version: `20260908171846`.
- After the migration the same query used the new index, estimated 3,607 rows,
  read only the requested first 1,000 rows, and wrote no temporary blocks.
  Execution was 3.121 ms, compared with 20.929 ms on the warmed pre-migration
  query. The initial cold pre-migration query was 79.890 ms. These are database
  execution timings, not browser page-load measurements.
- Coalesce duplicate Studio notices arriving over storage and BroadcastChannel.
  Resume/focus refreshes now have a 30-second minimum interval, instead of one
  second. New publication and retirement notices still refresh immediately;
  the existing five-minute cross-device refresh remains.

## Validation

- PGlite migration test: exact reader rows and cursor order preserved, repeat
  application succeeds, indexed query avoids a sort, anonymous users still
  cannot see draft/reference/review-pending rows or write content.
- Event tests: rapid tab switching coalesces, refresh resumes after cooldown,
  hidden/offline tabs do not poll, duplicate publication transports reload once,
  a new retirement reloads immediately, and cleanup removes listeners.
- `npm run test:content-studio-api` passed, including the new database regression.
- Web TypeScript check passed.
- Supabase security/performance advisors run after migration. Existing advisory
  debt remains (including RLS initplans and foreign-key indexes); this change
  does not broaden access or blanket-remove indexes based on freshly reset stats.
- At 17:22 UTC public Auth health returned HTTP 200 in 218 ms, publication read
  in 121 ms, and the 1,000-row provider response in 642 ms (about 4.6 MB).
- A legacy standalone source-regex test, not part of the API test command,
  rejects the existing epoch guard in `planetTopicVocabulary.ts`'s `finally`
  block. That code and test were unchanged by this recovery; the behavioral
  refresh tests above exercise the changed behavior directly.

Release and sustained post-deployment evidence are recorded separately after
the exact main deployment completes. A healthy management status alone is not
used as recovery evidence.

## Operational notes

The migration has short lock/statement deadlines and is idempotent. It changes
only an index and planner statistics. Reversal, if ever needed, consists of
dropping those two named objects; no table data needs restoration. The local
migration was created with the Supabase CLI, then aligned to the actual applied
management migration version to avoid duplicate pending history entries.
