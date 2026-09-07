import assert from "node:assert/strict";
import fs from "node:fs";

const read = (path) => fs.readFileSync(path, "utf8");

const service = read("apps/web/src/services/reportLibrary.ts");
const generatedService = read("apps/web/src/services/userGeneratedContent.ts");
const globalLayer = read("apps/web/src/features/reports/ReportsGlobalLayer.tsx");
const libraryView = read("apps/web/src/components/reports/ReportLibraryView.tsx");
const libraryStyles = read("apps/web/src/styles/report-library.css");
const notificationStyles = read("apps/web/src/styles/report-notifications.css");
const reportRoute = read("apps/web/src/routes/ReportRoute.tsx");
const main = read("apps/web/src/main.tsx");
const migration = read("apps/web/supabase/migrations/20260906214000_report_library_state.sql");

assert.match(service, /from\("user_generated_interpretations"\)[\s\S]*subject_type[\s\S]*friend_transit_reading/u);
assert.match(service, /from\("user_reports"\)/u);
assert.match(service, /from\("user_report_library_state"\)/u);
assert.match(service, /customerPremiumFulfillmentStates[\s\S]*"queued"[\s\S]*"calculating"[\s\S]*"writing"[\s\S]*"validating"[\s\S]*"judging"[\s\S]*"live"/u);
assert.doesNotMatch(service.match(/const customerPremiumFulfillmentStates[\s\S]*?\]\);/u)?.[0] ?? "", /needs_review|exception|revoked/u);
assert.match(service, /route: `\/reports\/generated\/\$\{row\.id\}`/u);
assert.match(service, /route: `\/reports\/\$\{row\.id\}`/u);
assert.match(service, /markReportArchived/u);
assert.match(service, /markReportSeen/u);
assert.match(service, /status === "ready" && !item\.seenAt && !item\.archivedAt/u);

assert.match(generatedService, /dispatchReportReady\(\{/u);
assert.match(generatedService, /sourceKind: "generated_interpretation"/u);
assert.match(generatedService, /route: `\/reports\/generated\/\$\{result\.id\}`/u);
assert.match(generatedService, /reading is ready/u);

assert.match(globalLayer, /accountButton\.before\(slot\)/u, "Reports must appear before Account in the main popover menu.");
assert.match(globalLayer, />Reports<\/span>/u);
assert.match(globalLayer, /window\.location\.assign\("\/reports\/"\)/u);
assert.match(globalLayer, /pollIntervalMs = 30_000/u);
assert.match(globalLayer, /window\.addEventListener\(reportReadyEvent/u);
assert.match(globalLayer, /Report ready/u);
assert.match(globalLayer, /reports-nav-badge/u);
assert.match(globalLayer, /styles\/report-notifications\.css/u, "The global layer must own only notification/menu CSS.");
assert.doesNotMatch(globalLayer, /styles\/report-library\.css/u, "The global layer must not own standalone Reports route CSS.");

assert.match(libraryView, /id="report-library-title">Reports<\/h1>/u);
assert.match(libraryView, /SegmentedControl/u);
assert.match(libraryView, /type-page-title/u);
assert.match(libraryView, /ui-pill ui-pill--neutral/u);
assert.match(libraryView, /floating-back-button/u);
assert.match(libraryView, /Archived/u);
assert.match(libraryView, /Archive/u);
assert.match(libraryView, /Restore/u);
assert.match(libraryView, /Your readings are saved here, so you can return to them anytime\./u);
assert.match(libraryView, /MoreHorizontal/u, "Library rows must keep secondary management actions behind a compact overflow control.");
assert.match(libraryView, /aria-haspopup="menu"/u);
assert.match(libraryView, /if \(item\.status === "ready"\) return item\.seenAt \? null : "New"/u, "Seen reports must not carry a redundant Ready badge.");
assert.match(libraryView, /loadGeneratedReportById/u);
assert.match(libraryView, /Paid reading/u);
assert.match(libraryView, /if \(item\.status !== "ready"\)[\s\S]*window\.location\.assign\(item\.route\)/u, "Opening an in-progress report must not mark it seen before it finishes.");

assert.match(reportRoute, /styles\/report-library\.css/u, "Standalone Reports routes must import their own visual stylesheet.");
assert.match(reportRoute, /path === "\/reports"[\s\S]*<ReportLibraryView/u);
assert.match(reportRoute, /\/reports\\\/generated/u);
assert.match(reportRoute, /<GeneratedReportDeliveryView/u);
assert.match(reportRoute, /<ReportDeliveryView/u, "Existing premium report delivery must remain intact.");
assert.match(reportRoute, /localStorage\.getItem\("tldrastro:theme"\)/u);
assert.match(reportRoute, /document\.documentElement\.dataset\.theme = theme/u, "Standalone report pages must inherit the saved app theme.");
assert.match(reportRoute, /theme-\$\{theme\}/u);

assert.match(libraryStyles, /\.report-library-page/u);
assert.match(libraryStyles, /\.saved-generated-report__article/u);
assert.match(libraryStyles, /var\(--report-page-padding\)/u);
assert.match(libraryStyles, /var\(--card-bg\)/u);
assert.match(libraryStyles, /var\(--card-shadow\)/u);
assert.match(libraryStyles, /var\(--container-reading\)/u);
assert.match(libraryStyles, /\.report-library-row__menu/u, "Archive and restore belong in the row overflow menu.");
assert.doesNotMatch(libraryStyles, /\.report-library-row__archive/u, "Archive must not consume a permanent full-height action column.");
assert.doesNotMatch(libraryStyles, /\.report-ready-toast|\.reports-menu-slot/u, "Report-route CSS must stay independent from the global notification layer.");
assert.doesNotMatch(libraryStyles, /--font-serif|--font-sans|--text-small/u, "Reports must use current semantic TLDR typography tokens, not legacy aliases.");

assert.match(notificationStyles, /\.report-ready-toast/u);
assert.match(notificationStyles, /\.reports-menu-slot/u);
assert.match(notificationStyles, /var\(--card-bg\)/u);
assert.match(notificationStyles, /var\(--font-display\)/u);
assert.doesNotMatch(notificationStyles, /\.report-library-page|\.saved-generated-report/u, "Notification CSS must not carry standalone route styles.");
assert.doesNotMatch(notificationStyles, /--font-serif|--font-sans|--text-small/u, "Report notifications must use current semantic TLDR typography tokens.");

assert.match(main, /function isReportPath\(\)[\s\S]*\^\\\/reports/u);
assert.match(main, /!isAdminContentPath\(\) && !reportPath/u);
assert.match(main, /else if \(!reportPath\)[\s\S]*setupBlankRestoreRecovery/u);
assert.match(main, /isAdminContentPath\(\) \|\| isReportPath\(\)/u, "Standalone Reports routes must not be treated as blank app-shell restores.");

assert.match(migration, /create table if not exists public\.user_report_library_state/u);
assert.match(migration, /primary key \(user_id, source_kind, source_id\)/u);
assert.match(migration, /source_kind in \('generated_interpretation', 'premium_report'\)/u);
assert.match(migration, /enable row level security/u);
assert.match(migration, /auth\.uid\(\) = user_id/gmu);
assert.match(migration, /for select/u);
assert.match(migration, /for insert/u);
assert.match(migration, /for update/u);
assert.match(migration, /for delete/u);

console.log("Report library, notification, standalone styling, and library UX contract passed.");
