import assert from "node:assert/strict";
import fs from "node:fs";

const read = (path) => fs.readFileSync(path, "utf8");

const service = read("apps/web/src/services/reportLibrary.ts");
const links = read("apps/web/src/services/reportLinks.ts");
const sharingService = read("apps/web/src/services/reportSharing.ts");
const shareApi = read("api/report-share.ts");
const generatedService = read("apps/web/src/services/userGeneratedContent.ts");
const globalLayer = read("apps/web/src/features/reports/ReportsGlobalLayer.tsx");
const libraryView = read("apps/web/src/components/reports/ReportLibraryView.tsx");
const vanityView = read("apps/web/src/components/reports/ReportVanityDeliveryView.tsx");
const reportArticle = read("apps/web/src/components/reports/ReportArticle.tsx");
const reportTopNavigation = read("apps/web/src/components/reports/ReportTopNavigation.tsx");
const libraryStyles = read("apps/web/src/styles/report-library.css");
const notificationStyles = read("apps/web/src/styles/report-notifications.css");
const reportRoute = read("apps/web/src/routes/ReportRoute.tsx");
const main = read("apps/web/src/main.tsx");
const migration = read("apps/web/supabase/migrations/20260906214000_report_library_state.sql");
const shareMigration = read("apps/web/supabase/migrations/20260907014500_report_library_share_links.sql");

assert.match(service, /from\("user_generated_interpretations"\)[\s\S]*friend_transit_reading/u);
assert.match(service, /from\("user_reports"\)/u);
assert.match(service, /from\("user_report_library_state"\)/u);
assert.match(service, /source_snapshot/u, "Friends library rows must retain the subject label used in vanity links.");
assert.match(service, /vanitySlug = reportVanitySlug/u);
assert.match(service, /route: `\/reports\/\$\{vanitySlug\}`/u);
assert.doesNotMatch(service, /route: `\/reports\/generated\//u, "New library links must never use the generated UUID route.");
assert.match(service, /resolveReportLibraryItemByVanitySlug/u);
assert.match(service, /generatedReportVanityPath/u);
assert.match(service, /periodEnd: row\.target_date/u);
assert.match(service, /periodEnd: row\.period_end/u);
assert.doesNotMatch(service, /"Right now"/u);
assert.match(service, /markReportArchived/u);
assert.match(service, /markReportSeen/u);
assert.match(service, /status === "ready" && !item\.seenAt && !item\.archivedAt/u);

assert.match(links, /export function reportVanitySlug/u);
assert.match(links, /return `\$\{date\}-\$\{subject\}`/u, "Vanity slugs must use yyyy-mm-dd-subject form.");
assert.match(links, /export function reportShareKeyFromHash/u);
assert.match(links, /\^#share=/u, "Share credentials must stay in the URL fragment.");

assert.match(sharingService, /method: "POST"/u);
assert.match(sharingService, /authorization: `Bearer \$\{token\}`/u);
assert.match(sharingService, /\/api\/report-share/u);
assert.match(sharingService, /export async function loadSharedReport/u);

assert.match(shareApi, /requireReportUser\(req\)/u, "Creating a share link must require the owner session.");
assert.match(shareApi, /report_share_links/u);
assert.match(shareApi, /randomUUID\(\)/u);
assert.match(shareApi, /#share=\$\{shareKey\}/u, "Share URLs must keep the bearer credential in the fragment.");
assert.match(shareApi, /revoked_at: "is\.null"/u);
assert.match(shareApi, /Only completed saved readings can be shared/u);
assert.match(shareApi, /Only completed active reports can be shared/u);
const loadShareStart = shareApi.indexOf("async function loadShare");
const handlerStart = shareApi.indexOf("export default async function handler");
assert.ok(loadShareStart >= 0 && handlerStart > loadShareStart, "Public share loader must be present before the handler.");
const loadShareBlock = shareApi.slice(loadShareStart, handlerStart);
assert.doesNotMatch(loadShareBlock, /requireReportUser/u, "Recipients must be able to open an explicitly shared link without the owner's session.");

assert.match(generatedService, /dispatchReportReady\(\{/u);
assert.match(generatedService, /sourceKind: "generated_interpretation"/u);
assert.match(generatedService, /reportVanityPath/u);
assert.doesNotMatch(generatedService, /route: `\/reports\/generated\//u, "Ready notifications must open the vanity URL.");
assert.match(generatedService, /reading is ready/u);

assert.match(globalLayer, /accountButton\.before\(slot\)/u);
assert.match(globalLayer, />Reports<\/span>/u);
assert.match(globalLayer, /window\.location\.assign\("\/reports\/"\)/u);
assert.match(globalLayer, /pollIntervalMs = 30_000/u);
assert.match(globalLayer, /window\.addEventListener\(reportReadyEvent/u);
assert.match(globalLayer, /reports-nav-badge/u);
assert.doesNotMatch(globalLayer, /styles\/report-library\.css/u);

assert.match(libraryView, /id="report-library-title">Reports<\/h1>/u);
assert.match(libraryView, /SegmentedControl/u);
assert.match(libraryView, /Archived/u);
assert.match(libraryView, /Share2/u, "Ready reports must offer Share in the overflow menu.");
const shareLabelIndex = libraryView.indexOf("<span>Share</span>");
const archiveLabelIndex = libraryView.indexOf('<span>{archived ? "Restore" : "Archive"}</span>');
assert.ok(shareLabelIndex >= 0 && archiveLabelIndex > shareLabelIndex, "Overflow actions must present Share before Archive/Restore.");
assert.match(libraryView, /createReportShareLink/u);
assert.match(libraryView, /navigator\.share/u);
assert.match(libraryView, /navigator\.clipboard/u);
assert.match(libraryView, /Share link copied\./u);
assert.match(libraryView, /MoreHorizontal/u);
assert.doesNotMatch(libraryView, /ChevronRight/u);
assert.match(libraryView, /Today, /u);
assert.match(libraryView, /Created \{formatCreatedDate\(item\.createdAt\)\}/u);
assert.match(libraryView, /formatReadingWindowDates\(item\.targetDate, item\.periodEnd/u);
assert.match(libraryView, /className="article-page sky-detail-page saved-generated-report"/u);
assert.match(libraryView, /className="article-shell sky-detail-article saved-generated-report__article"/u);
assert.match(libraryView, /className="sky-detail-back floating-back-button"/u);

assert.match(vanityView, /resolveReportLibraryItemByVanitySlug/u);
assert.match(vanityView, /reportShareKeyFromHash/u);
assert.match(vanityView, /loadSharedReport/u);
assert.match(vanityView, /GeneratedReportDeliveryView reportId=\{item\.sourceId\}/u);
assert.match(vanityView, /ReportDeliveryView reportId=\{item\.sourceId\}/u);
assert.match(vanityView, /window\.location\.replace\(generatedReportVanityPath\(report\)\)/u, "Legacy generated UUID URLs must redirect to the vanity path.");

assert.match(reportArticle, /className="report-article-back floating-back-button"/u);
assert.match(reportArticle, /backHref = "\/reports\/"/u);
assert.match(reportArticle, /<span>Back<\/span>/u);

assert.match(reportRoute, /styles\/report-library\.css/u);
assert.match(reportRoute, /path === "\/reports"[\s\S]*<ReportLibraryView/u);
assert.match(reportRoute, /\/reports\\\/generated/u, "The old generated path must remain as a backward-compatible alias.");
assert.match(reportRoute, /LegacyGeneratedReportRedirect/u);
assert.match(reportRoute, /ReportVanityDeliveryView/u);
assert.match(reportRoute, /singleSegment && isUuid\(singleSegment\)/u, "Legacy premium UUID links must remain readable.");
assert.match(reportRoute, /<ReportDeliveryView reportId=\{singleSegment\}/u);
assert.match(reportRoute, /import\("\.\.\/components\/reports\/ReportTopNavigation"\)/u, "Report navigation should remain deferred from the route entry chunk.");
assert.match(reportTopNavigation, /className="topbar report-topbar"/u);
assert.match(reportTopNavigation, /aria-label="Primary navigation"/u);
assert.match(reportTopNavigation, />Sky<\/span>[\s\S]*>Calendar<\/span>[\s\S]*>You<\/span>[\s\S]*>Friends<\/span>/u);
assert.match(reportTopNavigation, /<span>Reports<\/span>/u);
assert.match(reportTopNavigation, /getAuthAccount/u, "Shared-report navigation must not pretend a guest is signed in.");
assert.match(reportRoute, /localStorage\.getItem\("tldrastro:theme"\)/u);
assert.match(reportRoute, /document\.documentElement\.dataset\.theme = theme/u);

assert.match(libraryStyles, /\.report-library-page/u);
assert.match(libraryStyles, /\.report-library-row__menu/u);
assert.match(libraryStyles, /\.report-library-share-toast/u);
assert.match(libraryStyles, /var\(--sky-page-padding\)/u);
assert.match(libraryStyles, /var\(--card-bg\)/u);
assert.match(libraryStyles, /var\(--card-shadow\)/u);
assert.doesNotMatch(libraryStyles, /\.report-library-row__archive/u);
assert.doesNotMatch(libraryStyles, /\.report-library-row__chevron/u);
assert.doesNotMatch(libraryStyles, /\.report-ready-toast|\.reports-menu-slot/u);
assert.match(notificationStyles, /\.report-ready-toast/u);
assert.match(notificationStyles, /\.reports-menu-slot/u);

assert.match(main, /function isReportPath\(\)[\s\S]*\^\\\/reports/u);
assert.match(main, /isAdminContentPath\(\) \|\| isReportPath\(\)/u);

assert.match(migration, /create table if not exists public\.user_report_library_state/u);
assert.match(migration, /enable row level security/u);
assert.match(migration, /for select/u);
assert.match(migration, /for insert/u);
assert.match(migration, /for update/u);
assert.match(migration, /for delete/u);

assert.match(shareMigration, /create table if not exists public\.report_share_links/u);
assert.match(shareMigration, /share_key uuid not null default gen_random_uuid\(\)/u);
assert.match(shareMigration, /unique \(user_id, source_kind, source_id\)/u);
assert.match(shareMigration, /unique \(share_key\)/u);
assert.match(shareMigration, /enable row level security/u);
assert.match(shareMigration, /for select/u);
assert.doesNotMatch(shareMigration, /for (?:insert|update|delete)/u, "Browsers must not mint or mutate share bearer links directly.");
assert.match(shareMigration, /grant select on public\.report_share_links to authenticated/u);

console.log("Report library, vanity links, secure sharing, notification, article navigation, date labels, and library UX contract passed.");
