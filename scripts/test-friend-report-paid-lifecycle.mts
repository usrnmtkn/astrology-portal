import assert from "node:assert/strict";
import fs from "node:fs";

const read = (path: string) => fs.readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

const lifecycle = read("api/_lib/friend-report-lifecycle.ts");
const generation = read("api/_lib/friend-transit-reading-generation.ts");
const legacyGenerationApi = read("api/generate-friend-transit-reading.ts");
const requestApi = read("api/friend-report-request.ts");
const checkoutApi = read("api/friend-report-checkout.ts");
const webhook = read("api/stripe-webhook.ts");
const worker = read("api/cron/run-friend-report-jobs.ts");
const cleanup = read("api/admin/friend-report-test-cleanup.ts");
const stripe = read("api/_lib/stripe-report-billing.ts");
const client = read("apps/web/src/services/userGeneratedContent.ts");
const friendTab = read("apps/web/src/features/friends/FriendTransitsTab.tsx");
const library = read("apps/web/src/services/reportLibrary.ts");
const libraryView = read("apps/web/src/components/reports/ReportLibraryView.tsx");
const reportStyles = read("apps/web/src/styles/report-library.css");
const migration = read("apps/web/supabase/migrations/20260907070000_friend_report_paid_lifecycle.sql");
const securityMigration = read("apps/web/supabase/migrations/20260907071000_friend_report_lifecycle_security.sql");
const vercel = read("vercel.json");

assert.match(lifecycle, /FriendReportBillingMode = "free_test" \| "stripe"/u);
assert.match(lifecycle, /process\.env\.FRIEND_REPORT_BILLING_MODE/u);
assert.match(lifecycle, /entitlement\.source === "stripe" \|\| entitlement\.source === "comp"/u,
  "Stripe mode must not treat free-test entitlements as paid access.");
assert.match(lifecycle, /friend_report_entitlements/u);
assert.match(lifecycle, /friend_report_checkout_intents/u);
assert.match(lifecycle, /friend_report_jobs/u);
assert.match(lifecycle, /source: "free_test"/u);
assert.match(lifecycle, /source: "stripe"/u);
assert.match(lifecycle, /friend_report_entitlement_id/u);
assert.match(lifecycle, /state: "queued"/u);
assert.match(lifecycle, /state: failed \? "failed" : "retry"/u);
assert.match(lifecycle, /status: "ERROR"/u, "Terminal generation failure must surface as a customer-safe failed state.");
assert.match(lifecycle, /recordFriendReportCheckoutSession/u);
assert.match(lifecycle, /checkout_url/u);
assert.match(lifecycle, /intent\.status === "converted"/u, "Stripe activation must be idempotent across webhook retries.");
assert.match(lifecycle, /entitlement\?\.source === "free_test"/u, "A test entitlement must be convertible when Stripe is enabled.");
assert.match(lifecycle, /refundFriendReportByPaymentIntent/u);
assert.match(lifecycle, /revokeFriendReportShares/u, "Refunds must revoke external share access.");

assert.match(generation, /generateFriendTransitReadingForUser/u);
assert.match(generation, /entitlementId\?: string \| null/u);
assert.match(generation, /friend_report_entitlement_id/u);
assert.match(legacyGenerationApi, /friendReportBillingMode\(\) === "stripe"/u,
  "The legacy synchronous endpoint must not bypass payment when Stripe mode is enabled.");
assert.match(legacyGenerationApi, /paid_lifecycle_required/u);

assert.match(requestApi, /waitUntil\(runFriendReportJobs/u, "The request must detach fulfillment from the page request.");
assert.match(requestApi, /status: "queued"/u);
assert.match(requestApi, /leave this page/u);
assert.match(worker, /requireInternalRunner/u);
assert.match(worker, /runFriendReportJobs/u);
assert.match(vercel, /\/api\/cron\/run-friend-report-jobs/u, "Queued Friends reports need a durable cron fallback.");

assert.match(checkoutApi, /friendReportBillingMode\(\) === "free_test"/u, "Testing must remain free by default.");
assert.match(checkoutApi, /friend-report-checkout-\$\{intent\.id\}/u, "Stripe checkout creation must use a stable idempotency key.");
assert.match(checkoutApi, /intent\.checkout_url/u, "Repeated checkout clicks must reuse the same open Checkout Session.");
assert.match(stripe, /"idempotency-key"/u);
assert.match(webhook, /purchase_kind/u);
assert.match(webhook, /activateFriendReportCheckout/u);
assert.match(webhook, /refundFriendReportByPaymentIntent/u);
assert.match(webhook, /waitUntil\(runFriendReportJobs/u);

assert.match(client, /\/api\/friend-report-request/u);
assert.match(client, /\/api\/friend-report-checkout/u);
assert.doesNotMatch(client, /friendReading\s*\?\s*"\/api\/generate-friend-transit-reading"/u,
  "The customer Friends flow must use the durable lifecycle rather than the synchronous generator.");
assert.match(client, /response\.status === 202/u);
assert.match(client, /payload\?\.status === "payment_required"/u);
assert.match(client, /window\.location\.assign\(payload\.url\)/u);
assert.match(client, /"DRAFT", "REVIEWED", "LIVE", "ERROR"/u);

assert.match(friendTab, /queuedReadingPollMs/u);
assert.match(friendTab, /You can leave this page and come back later/u);
assert.match(friendTab, /savedReading\?\.status === "ERROR"/u);
assert.match(friendTab, /window\.setTimeout/u);

assert.match(library, /friend_report_entitlement_id/u);
assert.match(library, /"DRAFT", "LIVE", "ARCHIVED", "ERROR"/u);
assert.match(library, /lifecyclePlaceholder/u);
assert.match(library, /generatedReportStatus/u);
assert.match(library, /row\.status === "ERROR"/u);
assert.match(libraryView, /reportLibraryPollMs/u, "Standalone Reports must refresh while background fulfillment runs.");
assert.match(libraryView, /document\.visibilityState === "visible"/u);
assert.match(libraryView, /Needs attention/u);

assert.match(cleanup, /requireReportAdmin/u);
assert.match(cleanup, /PURGE FRIEND REPORT TEST DATA/u);
assert.match(cleanup, /source: "in\.\(free_test,comp\)"/u);
assert.match(cleanup, /includeLegacyUnentitled/u);
assert.match(cleanup, /Legacy unentitled cleanup requires an explicit before date/u);

assert.match(migration, /subject_id text not null/u, "Social friends require text subject ids.");
assert.match(migration, /unique \(user_id, subject_id, target_date\)/u);
assert.match(migration, /friend_report_checkout_intents_pending_target_idx/u);
assert.match(migration, /state = 'running' and locked_at < now\(\) - interval '10 minutes'/u,
  "Abandoned worker leases must be reclaimable.");
assert.match(migration, /enable row level security/u);
assert.match(migration, /grant select on public\.friend_report_entitlements to authenticated/u);
assert.doesNotMatch(migration, /grant (?:insert|update|delete) on public\.friend_report_/u);
assert.match(securityMigration, /revoke all on function public\.claim_friend_report_jobs/u);
assert.match(securityMigration, /grant execute on function public\.claim_friend_report_jobs[\s\S]*to service_role/u);

assert.match(reportStyles, /\.report-library-row__actions \{[\s\S]*z-index: auto/u,
  "Inactive row action columns must not paint above an open context menu.");
assert.match(reportStyles, /\.report-library-row__menu \{[\s\S]*z-index: var\(--z-popover\)/u);
assert.match(reportStyles, /\.report-library-row__menu \{[\s\S]*background: var\(--overlay-bg\)/u,
  "The open context menu must use the opaque overlay surface.");

console.log("Friends paid report lifecycle, async delivery, cleanup, payment gate, and menu stacking contract passed.");
