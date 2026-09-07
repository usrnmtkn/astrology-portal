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
assert.match(service, /periodEnd: row\.target_date/u, "A one-day Friends reading must expose its one-day report window.");
assert.match(service, /periodEnd: row\.period_end/u, "Longer reports must expose their actual period end.");
assert.doesNotMatch(service, /"Right now"/u, "The report library must not use a generic Right now label when the report has a date window.");
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
assert.match(libraryView, /Archived/u);
assert.match(libraryView, /Archive/u);
assert.match(libraryView, /Restore/u);
assert.match(libraryView, /Your readings are saved here, so you can return to them anytime\./u);
assert.match(libraryView, /MoreHorizontal/u, "Library rows must keep secondary management actions behind a compact overflow control.");
assert.match(libraryView, /aria-haspopup="menu"/u);
assert.match(libraryView, /if \(item\.status === "ready"\) return item\.seenAt \? null : "New"/u, "Seen reports must not carry a redundant Ready badge.");
assert.doesNotMatch(libraryView, /ChevronRight/u, "Report library rows must not show a trailing chevron.");
assert.match(libraryView, /Today, /u, "One-day report windows must be able to label the current date as Today.");
assert.match(libraryView, /ordinalSuffix/u, "Report date labels must use reader-facing ordinal dates.");
assert.match(libraryView, /Created \{formatCreatedDate\(item\.createdAt\)\}/u, "Library metadata must show when the report was created, not when it was saved.");
assert.match(libraryView, /formatReadingWindowDates\(item\.targetDate, item\.periodEnd/u, "Library metadata must render the report's actual coverage window.");
assert.match(libraryView, /loadGeneratedReportById/u);
assert.match(libraryView, /Friends paid reading/u);
assert.match(libraryView, /className="article-page sky-detail-page saved-generated-report"/u, "Saved Friends reports must use the established article-ID page shell.");
assert.match(libraryView, /className="article-shell sky-detail-article saved-generated-report__article"/u);
assert.match(libraryView, /className="sky-detail-back floating-back-button"/u, "Saved report detail must have the same Back control as other article-ID pages.");
assert.match(libraryView, /<span>Back<\/span>/u);
assert.match(libraryView, /Created \{formatCreatedDate\(report\.createdAt\)\}/u);
assert.match(libraryView, /if \(item\.status !== "ready"\)[\s\S]*window\.location\.assign\(item\.route\)/u, "Opening an in-progress report must not mark it seen before it finishes.");

assert.match(reportRoute, /styles\/report-library\.css/u, "Standalone Reports routes must import their own visual stylesheet.");
assert.match(reportRoute, /path === "\/reports"[\s\S]*<ReportLibraryView/u);
assert.match(reportRoute, /\/reports\\\/generated/u);
assert.match(reportRoute, /<GeneratedReportDeliveryView/u);
assert.match(reportRoute, /<ReportDeliveryView/u, "Existing premium report delivery must remain intact.");
assert.match(reportRoute, /className="topbar report-topbar"/u, "Reports must retain the normal top navigation shell.");
assert.match(reportRoute, /className="nav-pill"/u);
assert.match(reportRoute, /aria-label="Primary navigation"/u);
assert.match(reportRoute, />Sky<\/span>[\s\S]*>Calendar<\/span>[\s\S]*>You<\/span>[\s\S]*>Friends<\/span>/u);
assert.match(reportRoute, /<span>Reports<\/span>/u, "The Reports destination must remain available in the overflow menu while viewing a report.");
assert.match(reportRoute, /localStorage\.getItem\("tldrastro:theme"\)/u);
assert.match(reportRoute, /document\.documentElement\.dataset\.theme = theme/u, "Standalone report pages must inherit the saved app theme.");
assert.match(reportRoute, /theme-\$\{theme\}/u);

assert.match(libraryStyles, /\.report-library-page/u);
assert.match(libraryStyles, /\.saved-generated-report__article/u);
assert.match(libraryStyles, /var\(--sky-page-padding\)/u, "Reports library must clear the fixed top navigation like other article routes.");
assert.match(libraryStyles, /var\(--card-bg\)/u);
assert.match(libraryStyles, /var\(--card-shadow\)/u);
assert.match(libraryStyles, /var\(--container-reading\)/u);
assert.match(libraryStyles, /\.report-library-row__menu/u, "Archive and restore belong in the row overflow menu.");
assert.doesNotMatch(libraryStyles, /\.report-library-row__archive/u, "Archive must not consume a permanent full-height action column.");
assert.doesNotMatch(libraryStyles, /\.report-library-row__chevron/u, "Removing the report chevron must also remove its styling.");
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

console.log("Report library, notification, article navigation, date labels, and library UX contract passed.");
