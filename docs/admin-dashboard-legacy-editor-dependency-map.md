# Admin Dashboard Legacy Editor Dependency Map

Scope: `apps/admin/src/GeneratedContentAdminDashboard.tsx`

This maps the legacy Content editor state that should not be refactored until the next brief: `rows`, `selectedId`, `draft`, `loadRows`, `saveDraft`, and `deleteDraft`.

## State

- `rows` / `setRows` is declared at `apps/admin/src/GeneratedContentAdminDashboard.tsx:3657`.
- `selectedId` / `setSelectedId` is declared at `apps/admin/src/GeneratedContentAdminDashboard.tsx:3694`.
- `draft` / `setDraft` is declared at `apps/admin/src/GeneratedContentAdminDashboard.tsx:3704`.
- `selectedRow` derives the active legacy row from `rows` and `selectedId` at `apps/admin/src/GeneratedContentAdminDashboard.tsx:3732`.

## Load And Selection Flow

- `loadRows` is defined at `apps/admin/src/GeneratedContentAdminDashboard.tsx:4752`.
- `loadRows` fetches `/api/admin/generated-content` at `apps/admin/src/GeneratedContentAdminDashboard.tsx:4778`.
- `loadRows` writes the returned list with `setRows` at `apps/admin/src/GeneratedContentAdminDashboard.tsx:4783`.
- `loadRows` clears the review selection at `apps/admin/src/GeneratedContentAdminDashboard.tsx:4785`.
- `loadRows` reconciles `selectedId` against returned rows at `apps/admin/src/GeneratedContentAdminDashboard.tsx:4787`.
- `loadRows` sets the first returned row as selected at `apps/admin/src/GeneratedContentAdminDashboard.tsx:4789`.
- `loadRows` writes the editor `draft` from that first row at `apps/admin/src/GeneratedContentAdminDashboard.tsx:4791`.
- `loadRows` resets `draft` to a new empty surface draft when no row is available at `apps/admin/src/GeneratedContentAdminDashboard.tsx:4794`.
- `loadRowDetails` refreshes `draft` from an exact row fetch at `apps/admin/src/GeneratedContentAdminDashboard.tsx:5179`.
- `loadRowDetails` merges exact row details back into `rows` at `apps/admin/src/GeneratedContentAdminDashboard.tsx:5180`.
- `selectRow` writes `selectedId`, `draft`, and then calls `loadRowDetails` at `apps/admin/src/GeneratedContentAdminDashboard.tsx:5187`.

## Content Creation And Coverage

- `openLunarCoverageEditor` creates a missing lunar coverage row through `/api/admin/generated-content` at `apps/admin/src/GeneratedContentAdminDashboard.tsx:5202`.
- After lunar coverage creation, it inserts the created row into `rows` at `apps/admin/src/GeneratedContentAdminDashboard.tsx:5243`.
- When editing an existing lunar coverage row, it inserts that row into `rows` at `apps/admin/src/GeneratedContentAdminDashboard.tsx:5262`.
- `startManualReviewEntry` clears `selectedId` and seeds `draft` from the new review record at `apps/admin/src/GeneratedContentAdminDashboard.tsx:6784`.
- `createDraft` reads the current `draft` into a POST payload at `apps/admin/src/GeneratedContentAdminDashboard.tsx:6808`.
- `createDraft` writes `selectedId` and `draft` from the saved row at `apps/admin/src/GeneratedContentAdminDashboard.tsx:6827`.
- `createDraft` calls `loadRows` after saving at `apps/admin/src/GeneratedContentAdminDashboard.tsx:6834`.

## Draft Generation And Fact Loading

- `updateDraft` is the generic field writer for `draft` at `apps/admin/src/GeneratedContentAdminDashboard.tsx:6524`.
- `loadFactsForDraft` defaults to the current `draft` at `apps/admin/src/GeneratedContentAdminDashboard.tsx:6708`.
- `loadFactsForDraft` writes the enriched `draft` at `apps/admin/src/GeneratedContentAdminDashboard.tsx:6751`.
- `generateDraft` reads current `draft` to decide whether facts are usable at `apps/admin/src/GeneratedContentAdminDashboard.tsx:6853`.
- `generateDraft` sends the enriched draft to `/api/generate-content` at `apps/admin/src/GeneratedContentAdminDashboard.tsx:6872`.
- `generateDraft` writes `selectedId` and `draft` from the saved generated row at `apps/admin/src/GeneratedContentAdminDashboard.tsx:6895`.
- If generation returns copy without a saved row, `generateDraft` patches the existing `draft` locally at `apps/admin/src/GeneratedContentAdminDashboard.tsx:6899`.
- `generateDraft` calls `loadRows` after generation at `apps/admin/src/GeneratedContentAdminDashboard.tsx:6909`.
- `prepopulateDraftRows` writes `selectedId` and `draft` from the first prepopulated row at `apps/admin/src/GeneratedContentAdminDashboard.tsx:6950`.
- `prepopulateDraftRows` calls `loadRows("DRAFT", nextSurface)` at `apps/admin/src/GeneratedContentAdminDashboard.tsx:6957`.

## Save And Delete

- `saveDraft` is defined at `apps/admin/src/GeneratedContentAdminDashboard.tsx:6968`.
- `saveDraft` delegates to `createDraft` if the current `draft` has no id at `apps/admin/src/GeneratedContentAdminDashboard.tsx:6974`.
- `saveDraft` reads the current `draft` into a PATCH payload at `apps/admin/src/GeneratedContentAdminDashboard.tsx:6987`.
- `saveDraft` writes `draft` and `selectedId` from the returned row at `apps/admin/src/GeneratedContentAdminDashboard.tsx:7007`.
- `saveDraft` calls `loadRows` after saving at `apps/admin/src/GeneratedContentAdminDashboard.tsx:7014`.
- `deleteDraft` is defined at `apps/admin/src/GeneratedContentAdminDashboard.tsx:7025`.
- `deleteDraft` reads `draft.id` for confirmation and DELETE routing at `apps/admin/src/GeneratedContentAdminDashboard.tsx:7026`.
- `deleteDraft` sends DELETE to `/api/admin/generated-content` at `apps/admin/src/GeneratedContentAdminDashboard.tsx:7032`.
- `deleteDraft` resets `draft` and `selectedId` after deletion at `apps/admin/src/GeneratedContentAdminDashboard.tsx:7037`.
- `deleteDraft` calls `loadRows` after deletion at `apps/admin/src/GeneratedContentAdminDashboard.tsx:7040`.

## Review Workspace Cross-Links

- `saveReviewEdit` writes `selectedId` and `draft` from the global saved row at `apps/admin/src/GeneratedContentAdminDashboard.tsx:6210`.
- `deleteReviewRecord` resets `draft` and `selectedId`, then calls `loadRows` after deleting a global row at `apps/admin/src/GeneratedContentAdminDashboard.tsx:6281`.
- Review draft generation writes `selectedId` and `draft` from a saved row at `apps/admin/src/GeneratedContentAdminDashboard.tsx:6493`.
- The content table `openRecord` handler writes `selectedId` and `draft` from `record.rawGlobalRow`, then calls `loadRowDetails` at `apps/admin/src/GeneratedContentAdminDashboard.tsx:8837`.

## Legacy Writing Cleanup Notes

Updated: 2026-07-17

These notes are for resolving the current legacy/removal risk without accidentally deleting runtime safety nets.

### Active Files To Keep Until Replaced

Do not remove these files as part of a generic legacy cleanup:

- `apps/web/src/content/fallbackHooks.ts`
- `apps/web/src/content/emergencyCopy.json`
- `apps/web/src/content/skyContentSnapshot.json`
- `apps/web/src/content/sourceGroundedV2.ts`
- `apps/web/src/content/finalSourceGroundedDashboardRecords.json`

Resolution path:

1. Replace each active dependency with an explicit package or dashboard-backed source, not by deleting it in place.
2. Add a source map entry showing the replacement source and the app surfaces it feeds.
3. Run the reader-facing and admin QA suites before removing the old file.
4. Remove only after `rg` shows no runtime imports from `apps/web/src`, `apps/admin/src`, `api`, `scripts`, or tests.

Exit criteria:

- `npm run qa:admin-report` passes.
- `node scripts/test-reader-facing-content-contract.mjs` passes.
- `node scripts/test-sky-placement-regressions.mjs` passes.
- The fallback coverage audit either passes or has an explicit accepted finding for the surface being changed.

### Legacy DB Rows: Archive Before Delete

The safest cleanup target is not a source file. It is old generated database row classes:

- retired local composer wording
- legacy generic fallback templates
- local-normalized dashboard source rows
- source-grounded generated snapshot rows
- migration-seed rows that are no longer meant to be reader-facing

Resolution path:

1. Query candidate rows by `provider`, `prompt_version`, `source_snapshot.sourceType`, `content_key`, `status`, `lane`, and `review_state`.
2. Export the candidate list before changing anything.
3. Archive candidates first by setting `status = ARCHIVED` and a clear `review_state`, for example `legacy_archived`.
4. Keep archived rows through one QA/release cycle.
5. Delete only after proving no reader route, admin filter, import script, or fallback audit still expects them.

Do not delete first. Deleting fallback floors before authored coverage is complete can leave reader surfaces blank, or force the app into lower-quality emergency paths.

### Emergency Floors Are Not Legacy Trash

The admin API currently treats these key families as emergency floor content:

- `fallback-hook/`
- `slot-template/`
- `vocab/`
- `fallback-vocab/`
- `guide-phrase/`

Resolution path:

1. Keep these rows available until a reviewed authored row exists for the same surface and key family.
2. For replacements, create the new row as `DRAFT`, review it in the dashboard, then publish it.
3. Archive the older floor row only after confirming the reader route resolves the replacement.
4. Keep `fallback-vocab` and `guide-phrase` rows unless the template/fallback composer no longer uses their slots.

Risk if removed early:

- blank cards or missing sections
- raw template slots leaking into reader-facing copy
- app routes falling back to generic emergency text
- QA losing the ability to distinguish missing authored coverage from broken routing

### Synastry Fallback Helpers

The writing surface map flags direct synastry fallback helpers as future cleanup candidates, but the app still has active synastry fallback and relationship routing paths.

Resolution path:

1. Add visible provenance for Friends/Synastry rows so QA can see whether text came from authored source, knowledge rows, or fallback.
2. Confirm all active relationship contexts resolve through the normalized source-grounded or dashboard-authored path.
3. Search for active callers of synastry fallback helpers with `rg "synastry.*fallback|fallback.*synastry|synastryDetailCopy|synastryEmergency" apps scripts tests`.
4. Remove helper code only when the caller search is empty or every caller has been replaced.
5. Keep relationship-specific tests proving no romantic-only copy leaks into family, coworker, friend, or ex contexts.

Exit criteria:

- Friends/Synastry routes render without direct helper calls.
- Relationship context tests pass.
- `scripts/test-sky-placement-regressions.mjs` still passes the relationship knowledge fallback guard.
- The admin Surface Map shows the new source path clearly enough for editorial QA.

### Current Open Risk

`scripts/audit-fallback-runtime-coverage.mjs` still reports major hook families as missing complete authored reader copy. That means the fallback layer is wired, but coverage is not complete enough to remove fallback floors broadly.

Before any broad legacy cleanup, resolve or explicitly waive the missing authored coverage by family:

- Sky planet-in-sign placements
- planetary ingresses
- retrogrades and stations
- current-sky aspects
- natal planet-in-sign placements
- natal planet-in-house placements
- angles
- natal aspects
- transits through houses
- transits to natal planets
- transits to angles

Recommended order:

1. Finish authored rows for one family.
2. Publish only reviewed rows for that family.
3. Run the fallback runtime coverage audit.
4. Archive the superseded legacy/floor rows for that family.
5. Repeat family by family instead of doing one broad deletion pass.
