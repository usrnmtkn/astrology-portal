# Content Studio CMS reliability plan

## Goal

Content Studio must behave like a CMS rather than a bulk database browser: edits are versioned, publishing has one reader-serving meaning, inventory loads remain responsive as the corpus grows, and the reader sees the same eligible copy that Studio previews.

## Production baseline (2026-09-02)

- `generated_interpretations`: about 14.9k rows / 89 MB total relation size.
- Default editorial inventory: about 9.1k active serving rows.
- Heavy JSON/prose fields in that inventory alone: about 35 MB before HTTP/JSON overhead.
- Existing first-page editorial query: roughly 614 ms DB execution before transfer.
- Deep reader hydration page near offset 3000: roughly 426 ms DB execution.
- Postgres logs contain repeated statement-timeout cancellations during large content scans.

## Repair shipped in this branch

1. **CRUD safety**: create no longer silently overwrites, LIVE rows cannot be hard-deleted, invalid publish state is rejected, and 404/409 responses distinguish missing/stale records.
2. **Optimistic concurrency**: ordinary saves, bulk actions, autosaves, package approval, and Sky publication carry the last observed `updated_at` version and reject stale editors.
3. **Hydration parity**: natal Studio preview and reader use the same generated production projection and serving eligibility; dynamic exact natal keys have a governed extension contract.
4. **Cache invalidation**: fallback reader caches use a provider revision watermark so edit, publish, demotion, or archive invalidates stale content.
5. **Cursor pagination**: Admin inventory uses an opaque `(updated_at,id)` cursor; reader bulk hydration uses primary-key cursors instead of growing OFFSET scans, then restores newest-first precedence in memory.
6. **Query indexes**: indexes cover active Studio ordering, provider cursor scans, and LIVE serving surface cursor scans; migration refreshes planner statistics.
7. **Cancellable inventory loads**: a superseded CMS load is aborted and late responses cannot replace state from a newer navigation/auth load. Inventory progress is surfaced page by page.
8. **Nightly last-known-good**: reader-safe durable LIVE/serving Content Studio rows are exported nightly through the public reader RLS boundary into a static JSON failover asset. Runtime precedence on CMS/network failure is browser cache → nightly snapshot → governed local package. Dated/transient rows and the strict Sky Placement partition are excluded. The snapshot is not bundled into application JavaScript.

## Next performance threshold

After this release, measure Content Studio initial usable time and transferred bytes. If the active editorial inventory still transfers more than 8 MB or takes more than 2 seconds on a warm production connection, the next change should split the API into:

- a compact **inventory projection** (identity, status, title, routing metadata, version), and
- a full **document detail** request fetched only when an editor opens.

That is intentionally a second phase because several current list classifiers inspect JSON metadata. Moving them to a compact projection should be done as an explicit schema contract rather than silently dropping fields.

## Release gates

- Focused CRUD/hydration/concurrency/performance tests pass.
- `npm run typecheck`, `npm run build:web`, and `npm run build:admin` pass.
- Web bundle budgets pass. This release adds only 15 kB of aggregate-build headroom for CMS reliability; App boot, reader boot, App chunk, startup CSS, and individual deferred-content limits remain unchanged.
- Migration is reviewed before production application.
- After migration: compare `EXPLAIN (ANALYZE, BUFFERS)` for Studio first page and reader cursor scans against this baseline.
- Production smoke: create draft, read it back, edit, stale-edit conflict, publish, reader hydration, demote, cache refresh, archive, restore, and protected delete.

## Step 6 activation (2026-09-02)

The post-Step-5 production measurement crossed the split threshold: the active editorial inventory contains **9,141 serving rows**, and serializing the full rows is about **47 MB** before HTTP framing. The >8 MB trigger is therefore confirmed rather than hypothetical.

Step 6 keeps the existing full-detail API contract as the default and adds an opt-in `view=inventory` projection for the normal editorial list. That projection retains identity, publishing state, title/summary, routing/classification metadata, and `updated_at` versioning while excluding full body copy and the large `sections`, `facts`, `source_snapshot`, provenance, and judge-detail documents. Exact row reads remain full detail.

Content Studio uses the compact projection only for the ordinary active editorial inventory. Rich workspaces that already require cross-row structured documents continue to request the full extended inventory. When a compact row is opened, Studio re-fetches that exact row by `id` before constructing an editable draft, so a partial list record can never be submitted as a destructive replacement for the stored structured document.

