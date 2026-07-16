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
