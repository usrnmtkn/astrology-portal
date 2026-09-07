import assert from "node:assert/strict";
import fs from "node:fs";
import { friendReportWriterBrief } from "../api/_lib/friend-report-specificity.ts";
import { assertFriendTransitReadingBrief } from "../api/_lib/friend-transit-reading.ts";

const read = (path: string) => fs.readFileSync(path, "utf8");
const migration = read("apps/web/supabase/migrations/20260907043000_friend_paid_report_lifecycle.sql");
const endpoint = read("api/generate-friend-transit-reading.ts");
const worker = read("api/_lib/friend-report-generation.ts");
const lifecycle = read("api/_lib/friend-report-lifecycle.ts");
const placeholder = read("api/_lib/friend-report-placeholder.ts");
const revocation = read("api/_lib/friend-report-revocation.ts");
const statusApi = read("api/friend-report-status.ts");
const checkout = read("api/friend-report-checkout.ts");
const webhook = read("api/stripe-webhook.ts");
const cron = read("api/cron/run-friend-report-jobs.ts");
const vercel = read("vercel.json");
const client = read("apps/web/src/services/userGeneratedContent.ts");
const library = read("apps/web/src/services/reportLibrary.ts");
const vanityView = read("apps/web/src/components/reports/ReportVanityDeliveryView.tsx");

for (const table of ["friend_report_entitlements", "friend_report_jobs"]) {
  assert.match(migration, new RegExp(`create table if not exists public\\.${table}`, "u"));
  assert.match(migration, new RegExp(`alter table public\\.${table} enable row level security`, "u"));
}
assert.match(migration, /subject_id text not null/u, "Social friend subject ids must remain text, including social:<uuid>.");
assert.match(migration, /pending_payment'[\s\S]*'active'[\s\S]*'revoked'[\s\S]*'refunded'/u);
assert.match(migration, /queued'[\s\S]*'running'[\s\S]*'retry'[\s\S]*'complete'[\s\S]*'failed'[\s\S]*'cancelled'/u);
assert.match(migration, /for update skip locked/u, "Workers must claim queued jobs atomically.");
assert.match(migration, /revoke all on function public\.claim_friend_report_job/u);
assert.match(migration, /grant execute on function public\.claim_friend_report_job\(text, uuid\) to service_role/u);
assert.doesNotMatch(migration, /create policy[^;]+friend_report_(?:entitlements|jobs)[^;]+for (?:insert|update|delete)/isu, "Browsers must not write entitlements or jobs directly.");

const entitlementIndex = endpoint.indexOf("friendReportEntitlementGrantsAccess");
const placeholderIndex = endpoint.indexOf("ensureFriendReportPlaceholder({");
const jobIndex = endpoint.indexOf("ensureFriendReportJob({");
const processIndex = endpoint.indexOf("claimAndProcessFriendReportJob(");
assert.ok(entitlementIndex >= 0 && placeholderIndex > entitlementIndex && jobIndex > placeholderIndex && processIndex > jobIndex,
  "Access must be checked, then durable placeholder/job persisted, before inline model processing.");
assert.match(endpoint, /billingMode === "stripe"[\s\S]*payment_required/u);
assert.match(endpoint, /sendJson\(res, 202/u, "The request must be able to return a durable queued state.");
assert.match(endpoint, /friendReportWriterBrief\(locked\.brief\)/u);
assert.doesNotMatch(endpoint, /error: error instanceof Error \? error\.message/u, "Provider details stay backend-only.");

assert.match(lifecycle, /friendReportEntitlementGrantsAccess/u);
assert.match(lifecycle, /billingMode === "free_test"[\s\S]*entitlement\.source === "stripe"/u);
assert.match(lifecycle, /billingMode === "free_test"[\s\S]*entitlement\.source === "free_test" \|\| entitlement\.source === "stripe"/u);
assert.match(lifecycle, /existing\?\.status === "active" && existing\.source === "stripe"/u,
  "A free-test entitlement must be converted to Stripe checkout rather than treated as purchased.");
assert.match(lifecycle, /retryFriendReportJob/u);
assert.match(lifecycle, /attemptCap = input\.attemptCap \?\? 5/u);

assert.match(placeholder, /status: "DRAFT"/u);
assert.match(placeholder, /body: ""/u);
assert.match(placeholder, /ignoreDuplicates: true/u, "The stable report identity must not change across retries.");
assert.match(worker, /processClaimedFriendReportJob/u);
assert.match(worker, /completeFriendReportJob/u);
assert.match(worker, /retryFriendReportJob/u);
assert.match(cron, /requireInternalRunner/u);
assert.match(cron, /runFriendReportQueueBatch/u);
assert.match(vercel, /\/api\/cron\/run-friend-report-jobs/u);

assert.match(statusApi, /requireReportUser/u);
assert.match(statusApi, /state: "complete"/u);
assert.doesNotMatch(statusApi, /last_error|lastError/u, "Customer status polling must not expose backend generation errors.");
assert.match(client, /\/api\/friend-report-status/u);
assert.match(client, /waitForFriendReportByIdentity/u);
assert.match(client, /row\?\.body\?\.trim\(\)/u, "An empty durable placeholder must not render as a finished reading.");
assert.match(client, /\/api\/friend-report-checkout/u);
assert.match(client, /payment_required/u);

assert.match(checkout, /friendReportBillingMode\(\) !== "stripe"/u);
assert.match(checkout, /STRIPE_FRIEND_TRANSIT_READING_PRICE/u);
assert.match(checkout, /metadata\[product_kind\][\s\S]*friend_transit_reading/u);
assert.match(checkout, /metadata\[entitlement_id\]/u);
assert.match(webhook, /product_kind\) === "friend_transit_reading"/u);
assert.match(webhook, /activateFriendReportEntitlementFromStripe/u);
assert.match(webhook, /ensureFriendReportPlaceholder/u);
assert.match(webhook, /revokeFriendReportPurchase/u);
assert.match(revocation, /revokeFriendReportEntitlementByPaymentIntent/u);
assert.match(revocation, /status: "ARCHIVED"/u, "A refund must remove the Friends reading from normal retrieval.");
assert.match(revocation, /report_share_links/u);
assert.match(revocation, /revoked_at: now/u, "A refund must invalidate any active recipient link.");

assert.match(library, /from\("friend_report_entitlements"\)/u);
assert.match(library, /from\("friend_report_jobs"\)/u);
assert.match(library, /reportStatus = "generating"/u);
assert.match(library, /reportStatus = "failed"/u);
assert.match(library, /pending_payment", "revoked", "refunded/u);
assert.match(vanityView, /item\.status === "generating"/u);
assert.match(vanityView, /still being prepared/u);
assert.match(vanityView, /item\.status === "failed"/u);

const fourHouseBrief = assertFriendTransitReadingBrief({
  schema: "tldr.friend-transits-brief.v1",
  friendName: "Alisa P",
  dateLabel: "September 7, 2026",
  primaryThemes: [{
    id: "sun-node",
    title: "Sun conjunct North Node",
    durationLabel: "A few days",
    rangeLabel: "Sep 6-9",
    timingLabel: "Active now",
    summary: "A choice about what comes next is easier to see.",
    orb: "1°",
    detailAvailable: true,
    evidence: {
      transitPlanet: "Sun",
      transitSign: "Virgo",
      aspect: "conjunction",
      natalPoint: "North Node",
      natalSign: "Virgo",
      natalHouse: 4,
      direction: "applying",
      timingBonuses: [],
      contentKeys: ["authored/transit-aspect/sun/north-node/conjunction"]
    }
  }],
  relationshipActivations: [],
  houseContext: [],
  daily: null,
  longerCycles: [],
  activePatterns: [],
  hasAnyTransit: true,
  counts: { primaryThemes: 1, relationshipActivations: 0, houseContext: 0, longerCycles: 0, activePatterns: 0 }
});
const writerBrief = friendReportWriterBrief(fourHouseBrief);
const writerSummary = writerBrief.primaryThemes[0]?.summary ?? "";
for (const domain of ["home", "family", "living situation", "private life"]) {
  assert.match(writerSummary, new RegExp(domain, "iu"), `4th-house writer evidence should include ${domain}.`);
}
assert.doesNotMatch(writerSummary, /moving|move house|relocat/iu,
  "House specificity must name domains without inventing a move or other biographical event.");

console.log("Friends paid report lifecycle, billing, async recovery, refund revocation, and house specificity regression passed.");
