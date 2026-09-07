import { reportBillingMode } from "./report-fulfillment-config.js";
import { createSupabaseReportAdmin, type SupabaseReportAdmin } from "./supabase-report-admin.js";
import type { FriendTransitReadingBrief } from "./friend-transit-reading.js";

export const FRIEND_REPORT_PRODUCT_KEY = "friend_transit_day";
export const FRIEND_REPORT_PRICE_ENV = "STRIPE_FRIEND_TRANSIT_READING_PRICE";
export const FRIEND_REPORT_AMOUNT_ENV = "STRIPE_FRIEND_TRANSIT_READING_AMOUNT";

export type FriendReportEntitlementStatus = "pending_payment" | "active" | "revoked" | "refunded";
export type FriendReportJobState = "queued" | "running" | "retry" | "complete" | "failed" | "cancelled";

export type FriendReportEntitlementRow = {
  id: string;
  user_id: string;
  subject_id: string;
  content_key: string;
  target_date: string;
  friend_name: string;
  brief: FriendTransitReadingBrief;
  status: FriendReportEntitlementStatus;
  source: "free_test" | "stripe";
  stripe_event_id: string | null;
  stripe_checkout_session_id: string | null;
  stripe_customer_id: string | null;
  stripe_payment_intent_id: string | null;
  purchased_at: string | null;
  activated_at: string | null;
  revoked_at: string | null;
  created_at: string;
  updated_at: string;
};

export type FriendReportJobRow = {
  id: string;
  entitlement_id: string;
  user_id: string;
  subject_id: string;
  content_key: string;
  target_date: string;
  friend_name: string;
  brief: FriendTransitReadingBrief;
  state: FriendReportJobState;
  attempt: number;
  run_after: string;
  locked_at: string | null;
  locked_by: string | null;
  result_id: string | null;
  last_error: string | null;
  created_at: string;
  updated_at: string;
};

export function friendReportBillingMode() {
  return reportBillingMode();
}

export function friendReportPriceId() {
  return process.env[FRIEND_REPORT_PRICE_ENV]?.trim() ?? "";
}

export function friendReportAmountCents() {
  const value = Number.parseInt(process.env[FRIEND_REPORT_AMOUNT_ENV] ?? "", 10);
  return Number.isInteger(value) && value > 0 ? value : null;
}

function entitlementQuery(userId: string, contentKey: string) {
  return new URLSearchParams({
    user_id: `eq.${userId}`,
    content_key: `eq.${contentKey}`,
    select: "*"
  });
}

export async function findFriendReportEntitlement(
  admin: SupabaseReportAdmin,
  userId: string,
  contentKey: string
) {
  return admin.selectOne<FriendReportEntitlementRow>(
    "friend_report_entitlements",
    entitlementQuery(userId, contentKey)
  );
}

export async function ensureFreeTestFriendReportEntitlement(input: {
  admin?: SupabaseReportAdmin;
  userId: string;
  subjectId: string;
  contentKey: string;
  targetDate: string;
  friendName: string;
  brief: FriendTransitReadingBrief;
}) {
  const admin = input.admin ?? createSupabaseReportAdmin();
  const now = new Date().toISOString();
  const rows = await admin.insert<FriendReportEntitlementRow>("friend_report_entitlements", {
    user_id: input.userId,
    subject_id: input.subjectId,
    content_key: input.contentKey,
    target_date: input.targetDate,
    friend_name: input.friendName,
    brief: input.brief,
    status: "active",
    source: "free_test",
    purchased_at: now,
    activated_at: now,
    revoked_at: null
  }, { onConflict: "user_id,content_key" });
  const row = rows[0] ?? await findFriendReportEntitlement(admin, input.userId, input.contentKey);
  if (!row) throw new Error("FRIEND_REPORT_TEST_ENTITLEMENT_NOT_CREATED");
  return row;
}

export async function ensurePendingStripeFriendReportEntitlement(input: {
  admin?: SupabaseReportAdmin;
  userId: string;
  subjectId: string;
  contentKey: string;
  targetDate: string;
  friendName: string;
  brief: FriendTransitReadingBrief;
}) {
  const admin = input.admin ?? createSupabaseReportAdmin();
  const existing = await findFriendReportEntitlement(admin, input.userId, input.contentKey);
  if (existing?.status === "active") return existing;
  const rows = await admin.insert<FriendReportEntitlementRow>("friend_report_entitlements", {
    user_id: input.userId,
    subject_id: input.subjectId,
    content_key: input.contentKey,
    target_date: input.targetDate,
    friend_name: input.friendName,
    brief: input.brief,
    status: "pending_payment",
    source: "stripe",
    revoked_at: null
  }, { onConflict: "user_id,content_key" });
  const row = rows[0] ?? await findFriendReportEntitlement(admin, input.userId, input.contentKey);
  if (!row) throw new Error("FRIEND_REPORT_STRIPE_ENTITLEMENT_NOT_CREATED");
  return row;
}

export async function attachFriendCheckoutSession(input: {
  admin?: SupabaseReportAdmin;
  entitlementId: string;
  checkoutSessionId: string;
}) {
  const admin = input.admin ?? createSupabaseReportAdmin();
  await admin.update<FriendReportEntitlementRow>(
    "friend_report_entitlements",
    `id=eq.${encodeURIComponent(input.entitlementId)}&status=eq.pending_payment`,
    { stripe_checkout_session_id: input.checkoutSessionId }
  );
}

export async function activateFriendReportEntitlementFromStripe(input: {
  admin?: SupabaseReportAdmin;
  entitlementId: string;
  userId: string;
  eventId: string;
  checkoutSessionId: string;
  customerId?: string | null;
  paymentIntentId?: string | null;
  purchasedAt: string;
}) {
  const admin = input.admin ?? createSupabaseReportAdmin();
  const existing = await admin.selectOne<FriendReportEntitlementRow>(
    "friend_report_entitlements",
    new URLSearchParams({
      id: `eq.${input.entitlementId}`,
      user_id: `eq.${input.userId}`,
      select: "*"
    })
  );
  if (!existing) throw new Error("FRIEND_REPORT_ENTITLEMENT_NOT_FOUND");
  if (existing.status === "revoked" || existing.status === "refunded") {
    throw new Error("FRIEND_REPORT_ENTITLEMENT_NOT_ACTIVE");
  }
  const now = new Date().toISOString();
  const updated = await admin.update<FriendReportEntitlementRow>(
    "friend_report_entitlements",
    `id=eq.${encodeURIComponent(existing.id)}`,
    {
      status: "active",
      source: "stripe",
      stripe_event_id: input.eventId,
      stripe_checkout_session_id: input.checkoutSessionId,
      stripe_customer_id: input.customerId ?? null,
      stripe_payment_intent_id: input.paymentIntentId ?? null,
      purchased_at: input.purchasedAt,
      activated_at: now,
      revoked_at: null
    }
  );
  const entitlement = updated[0] ?? existing;
  const job = await ensureFriendReportJob({ admin, entitlement });
  return { entitlement, job };
}

export async function revokeFriendReportEntitlementByPaymentIntent(input: {
  admin?: SupabaseReportAdmin;
  paymentIntentId: string;
  status: "revoked" | "refunded";
}) {
  const admin = input.admin ?? createSupabaseReportAdmin();
  const entitlement = await admin.selectOne<FriendReportEntitlementRow>(
    "friend_report_entitlements",
    new URLSearchParams({
      stripe_payment_intent_id: `eq.${input.paymentIntentId}`,
      select: "*"
    })
  );
  if (!entitlement) return false;
  const now = new Date().toISOString();
  await admin.update<FriendReportEntitlementRow>(
    "friend_report_entitlements",
    `id=eq.${encodeURIComponent(entitlement.id)}`,
    { status: input.status, revoked_at: now }
  );
  await admin.update<FriendReportJobRow>(
    "friend_report_jobs",
    `entitlement_id=eq.${encodeURIComponent(entitlement.id)}&state=in.(queued,retry,running)`,
    { state: "cancelled", locked_at: null, locked_by: null, last_error: input.status }
  );
  return true;
}

export async function ensureFriendReportJob(input: {
  admin?: SupabaseReportAdmin;
  entitlement: FriendReportEntitlementRow;
}) {
  const admin = input.admin ?? createSupabaseReportAdmin();
  if (input.entitlement.status !== "active") throw new Error("FRIEND_REPORT_ACTIVE_ENTITLEMENT_REQUIRED");
  const rows = await admin.insert<FriendReportJobRow>("friend_report_jobs", {
    entitlement_id: input.entitlement.id,
    user_id: input.entitlement.user_id,
    subject_id: input.entitlement.subject_id,
    content_key: input.entitlement.content_key,
    target_date: input.entitlement.target_date,
    friend_name: input.entitlement.friend_name,
    brief: input.entitlement.brief,
    state: "queued",
    run_after: new Date().toISOString(),
    last_error: null
  }, { onConflict: "user_id,content_key", ignoreDuplicates: true });
  const row = rows[0] ?? await admin.selectOne<FriendReportJobRow>(
    "friend_report_jobs",
    new URLSearchParams({
      user_id: `eq.${input.entitlement.user_id}`,
      content_key: `eq.${input.entitlement.content_key}`,
      select: "*"
    })
  );
  if (!row) throw new Error("FRIEND_REPORT_JOB_NOT_CREATED");
  if (["failed", "cancelled"].includes(row.state)) {
    const reset = await admin.update<FriendReportJobRow>(
      "friend_report_jobs",
      `id=eq.${encodeURIComponent(row.id)}`,
      {
        state: "queued",
        run_after: new Date().toISOString(),
        locked_at: null,
        locked_by: null,
        last_error: null
      }
    );
    return reset[0] ?? row;
  }
  return row;
}

async function rpc<T>(admin: SupabaseReportAdmin, name: string, body: Record<string, unknown>) {
  return admin.request<T[]>(`rpc/${name}`, {
    method: "POST",
    body: JSON.stringify(body)
  });
}

export async function claimFriendReportJob(input: {
  admin?: SupabaseReportAdmin;
  workerId: string;
  jobId: string;
}) {
  const admin = input.admin ?? createSupabaseReportAdmin();
  const rows = await rpc<FriendReportJobRow>(admin, "claim_friend_report_job", {
    worker_id: input.workerId,
    target_job_id: input.jobId
  });
  return rows[0] ?? null;
}

export async function claimFriendReportJobs(input: {
  admin?: SupabaseReportAdmin;
  workerId: string;
  limit?: number;
}) {
  const admin = input.admin ?? createSupabaseReportAdmin();
  return rpc<FriendReportJobRow>(admin, "claim_friend_report_jobs", {
    worker_id: input.workerId,
    batch_limit: input.limit ?? 3
  });
}

export async function completeFriendReportJob(input: {
  admin?: SupabaseReportAdmin;
  jobId: string;
  resultId: string;
}) {
  const admin = input.admin ?? createSupabaseReportAdmin();
  await admin.update<FriendReportJobRow>("friend_report_jobs", `id=eq.${encodeURIComponent(input.jobId)}`, {
    state: "complete",
    result_id: input.resultId,
    locked_at: null,
    locked_by: null,
    last_error: null
  });
}

export async function retryFriendReportJob(input: {
  admin?: SupabaseReportAdmin;
  job: FriendReportJobRow;
  error: unknown;
  attemptCap?: number;
}) {
  const admin = input.admin ?? createSupabaseReportAdmin();
  const attemptCap = input.attemptCap ?? 5;
  const message = input.error instanceof Error ? input.error.message : "Unknown Friends report generation error.";
  const exhausted = input.job.attempt >= attemptCap;
  const delayMinutes = Math.min(30, Math.max(1, 2 ** Math.max(0, input.job.attempt - 1)));
  await admin.update<FriendReportJobRow>("friend_report_jobs", `id=eq.${encodeURIComponent(input.job.id)}`, {
    state: exhausted ? "failed" : "retry",
    run_after: new Date(Date.now() + delayMinutes * 60_000).toISOString(),
    locked_at: null,
    locked_by: null,
    last_error: message
  });
  return exhausted ? "failed" as const : "retry" as const;
}

export async function friendReportJobForOwner(input: {
  admin?: SupabaseReportAdmin;
  userId: string;
  contentKey: string;
}) {
  const admin = input.admin ?? createSupabaseReportAdmin();
  return admin.selectOne<FriendReportJobRow>(
    "friend_report_jobs",
    new URLSearchParams({
      user_id: `eq.${input.userId}`,
      content_key: `eq.${input.contentKey}`,
      select: "*"
    })
  );
}
