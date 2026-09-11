# Report library deletion

Delete follows Archive in active reports and Restore in archived reports. The browser confirms the report title and explains that the report cannot be restored from the library. Failed writes retain the row and display an error; successful writes remove the row and update counts. The same operation covers completed, failed, and preparing reports.

Deletion sets the owner-scoped `user_report_library_state.deleted_at` field. It is library deletion, not erasure of payment, entitlement, or generation history. Existing owner RLS protects writes. Archive and seen updates preserve the deletion marker. Deleted entries are excluded from active/archived lists and unread counts; generated UUID readers, premium delivery, and both creation and use of shared links check deletion. Ongoing fulfillment is not cancelled.

## Release order

Apply `apps/web/supabase/migrations/20260911151405_report_library_delete.sql` before deploying the application. The new application reads this column and must not be deployed first. The migration adds a nullable column and does not delete or modify any existing report. No production reports were deleted while implementing or testing this feature.

## Validation

- `node scripts/test-report-library-delete.mjs`: real service and share/delivery handlers with isolated transport; generated/premium deletion, archive/seen preservation, shared/direct access denial, and failed writes.
- `REPORT_PGLITE_MODULE=/path/to/@electric-sql/pglite/dist/index.js node scripts/test-report-library-delete-migration.mjs`: actual migration against isolated PostgreSQL, including cross-account RLS.
- `PLAYWRIGHT_BASE_URL=http://127.0.0.1:4187 npx playwright test tests/visual/report-library-delete.spec.ts --workers=1`: fresh build, four desktop/mobile and light/dark cases; menu order, cancellation, confirmation, failed write, and reload persistence.
- `npm run typecheck` and `npm run qa:css-audit`.

All checks above passed on the local change based on main `bbbc8ed04e9727a62b21d2c87bd8e0441d0d6a49`. Production migration and deployment have not been performed for this feature.
