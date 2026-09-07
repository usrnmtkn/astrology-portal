import { friendTransitReadingRequestLock } from "./friend-transit-reading.js";
import { generateFriendTransitReadingForUser, type FriendTransitReadingRow } from "./friend-transit-reading-generation.js";
import { createSupabaseReportAdmin, type SupabaseReportAdmin } from "./supabase-report-admin.js";

export type FriendReportBillingMode = "free_test" | "stripe";
export type FriendReportJobState = "queued" | "running" | "retry" | "complete" | "failed" | "cancelled";

export type FriendReportEntitlement = {
  id: string;
  user_id: string;
  subject_id: string;
  target_date: string;
  content_key: string;
  product_key: string;
  source: "free_test" | "stripe" | "comp";
  status: "active" | "revoked" | "refunded";
  stripe_event_id: string | null;
  stripe_checkout_session_id: string | null;
  stripe_customer_id: string | null;
  stripe_payment_intent_id: string | null;
  stripe_charge_id: string | null;
  purchased_at: string;
  revoked_at: string | null;
};

export type FriendReportJob = {
  id: string;
  entitlement_id: string;
  user_id: string;
  subject_id: string;
  target_date: string;
  content_key: string;
  facts: Record<string, unknown>;
  source_snapshot: Record<string, unknown>;
  state: FriendReportJobState;
  attempt: number;
  run_after: string;
  locked_at: string | null;
  locked_by: string | null;
  last_error: string | null;
  result_id: string | null;
};

export type FriendReportCheckoutIntent = {
  id: string;
  user_id: string;
  subject_id: string;
  target_date: string;
  content_key: string;
  facts: Record<string, unknown>;
  source_snapshot: Record<string, unknown>;
  status: "pending" | "converted" | "cancelled" | "expired";
  expires_at: string;
};

export function friendReportBillingMode(): FriendReportBillingMode {
  const configured = process.env.FRIEND_REPORT_BILLING_MODE?.trim()
    || process.env.REPORT_BILLING_MODE?.trim()
    || "free_test";
  if (configured !== "free_test" && configured !== "stripe") {
    throw new Error(`Unsupported Friends report billing mode '${configured}'.`);
  }
  return configured;
}

export function friendReportStripePriceId() {
  return process.env.STRIPE_FRIEND_TRANSIT_READING_PRICE?.trim()
    || process.env.STRIPE_FRIEND_TRANSIT_READING_PRICE_ID?.trim()
    || "";
}

function adminClient(admin?: SupabaseReportAdmin) {
  return admin ?? createSupabaseReportAdmin();
}

function entitlementParams(userId: string, subjectId: string, targetDate: string) {
  return new URLSearchParams({
    user_id: `eq.${userId}`,
    subject_id: `eq.${subjectId}`,
    target_date: `eq.${targetDate}`,
    select: "*"
  });
}

export async function findFriendReportEntitlement(input: {
  userId: string;
  subjectId: string;
  targetDate: string;
  admin?: SupabaseReportAdmin;
}) {
  return adminClient(input.admin).selectOne<FriendReportEntitlement>(
    "friend_report_entitlements",
    entitlementParams(input.userId, input.subjectId, input.targetDate)
  );
}

export async function findCompletedFriendReading(input: {
  userId: string;
  subjectId: string;
  targetDate: string;
  contentKey: string;
  admin?: SupabaseReportAdmin;
}) {
  return adminClient(input.admin).selectOne<FriendTransitReadingRow>(
    "user_generated_interpretations",
    new URLSearchParams({
      user_id: `eq.${input.userId}`,
      subject_type: "eq.friend_transit_reading",
      subject_id: `eq.${input.subjectId}`,
      target_date: `eq.${input.targetDate}`,
      content_key: `eq.${input.contentKey}`,
      mode: "eq.in_depth",
      select: "id,content_key,surface,mode,status,event_type,target_date,headline,summary,body,sections,provider,model,updated_at,friend_report_entitlement_id",
      order: "updated_at.desc"
    })
  ).then((row) => row?.body?.trim() ? row : null);
}

async function ensurePlaceholder(input: {
  admin: SupabaseReportAdmin;
  entitlement: FriendReportEntitlement;
  locked: ReturnType<typeof friendTransitReadingRequestLock>;
}) {
  const rows = await input.admin.insert<FriendTransitReadingRow>("user_generated_interpretations", {
    user_id: input.entitlement.user_id,
    subject_type: "friend_transit_reading",
    subject_id: input.entitlement.subject_id,
    content_key: input.locked.contentKey,
    surface: input.locked.surface,
    mode: input.locked.mode,
    status: "DRAFT",
    event_type: input.locked.eventType,
    target_date: input.entitlement.target_date,
    facts: input.locked.facts,
    knowledge_ids: input.locked.knowledgeIds,
    source_snapshot: input.locked.sourceSnapshot,
    prompt_version: "friend-transit-reading-queued-v1",
    provider: null,
    model: null,
    headline: input.locked.headline,
    summary: null,
    body: "",
    sections: { sections: [], sceneLock: null, astrologyDrilldown: null },
    response_id: null,
    error: null,
    friend_report_entitlement_id: input.entitlement.id
  }, { onConflict: "user_id,subject_type,subject_id,content_key,target_date,mode" });
  return rows[0] ?? null;
}

async function ensureJob(input: {
  admin: SupabaseReportAdmin;
  entitlement: FriendReportEntitlement;
  locked: ReturnType<typeof friendTransitReadingRequestLock>;
}) {
  const existing = await input.admin.selectOne<FriendReportJob>(
    "friend_report_jobs",
    new URLSearchParams({ entitlement_id: `eq.${input.entitlement.id}`, select: "*" })
  );
  if (existing) {
    if (["failed", "cancelled"].includes(existing.state) && input.entitlement.status === "active") {
      const rows = await input.admin.update<FriendReportJob>("friend_report_jobs", `id=eq.${existing.id}`, {
        state: "queued",
        run_after: new Date().toISOString(),
        locked_at: null,
        locked_by: null,
        last_error: null
      });
      return rows[0] ?? existing;
    }
    return existing;
  }
  const rows = await input.admin.insert<FriendReportJob>("friend_report_jobs", {
    entitlement_id: input.entitlement.id,
    user_id: input.entitlement.user_id,
    subject_id: input.entitlement.subject_id,
    target_date: input.entitlement.target_date,
    content_key: input.locked.contentKey,
    facts: input.locked.facts,
    source_snapshot: input.locked.sourceSnapshot,
    state: "queued"
  }, { onConflict: "entitlement_id", ignoreDuplicates: true });
  if (rows[0]) return rows[0];
  const refetched = await input.admin.selectOne<FriendReportJob>(
    "friend_report_jobs",
    new URLSearchParams({ entitlement_id: `eq.${input.entitlement.id}`, select: "*" })
  );
  if (!refetched) throw new Error("Friends report job could not be created.");
  return refetched;
}

async function createFreeTestEntitlement(input: {
  admin: SupabaseReportAdmin;
  userId: string;
  subjectId: string;
  targetDate: string;
  contentKey: string;
}) {
  const rows = await input.admin.insert<FriendReportEntitlement>("friend_report_entitlements", {
    user_id: input.userId,
    subject_id: input.subjectId,
    target_date: input.targetDate,
    content_key: input.contentKey,
    product_key: "friend_transit_daily",
    source: "free_test",
    status: "active",
    purchased_at: new Date().toISOString()
  }, { onConflict: "user_id,subject_id,target_date", ignoreDuplicates: true });
  if (rows[0]) return rows[0];
  const existing = await findFriendReportEntitlement({ ...input, admin: input.admin });
  if (!existing) throw new Error("Friends report entitlement could not be created.");
  return existing;
}

export async function requestFriendReport(input: {
  userId: string;
  subjectId: string;
  targetDate: string;
  facts?: Record<string, unknown>;
  admin?: SupabaseReportAdmin;
}) {
  const admin = adminClient(input.admin);
  const locked = friendTransitReadingRequestLock({
    brief: input.facts?.friendTransitsBrief,
    subjectId: input.subjectId,
    targetDate: input.targetDate
  });
  const completed = await findCompletedFriendReading({
    userId: input.userId,
    subjectId: input.subjectId,
    targetDate: input.targetDate,
    contentKey: locked.contentKey,
    admin
  });
  if (completed) return { status: "ready" as const, reading: completed, entitlement: null, job: null };

  let entitlement = await findFriendReportEntitlement({
    userId: input.userId,
    subjectId: input.subjectId,
    targetDate: input.targetDate,
    admin
  });
  if (!entitlement) {
    if (friendReportBillingMode() === "stripe") {
      return { status: "payment_required" as const, locked, entitlement: null, job: null };
    }
    entitlement = await createFreeTestEntitlement({
      admin,
      userId: input.userId,
      subjectId: input.subjectId,
      targetDate: input.targetDate,
      contentKey: locked.contentKey
    });
  }
  if (entitlement.status !== "active") {
    return { status: "unavailable" as const, entitlement, job: null };
  }

  const placeholder = await ensurePlaceholder({ admin, entitlement, locked });
  const job = await ensureJob({ admin, entitlement, locked });
  return { status: job.state === "complete" && placeholder?.body?.trim() ? "ready" as const : "queued" as const, reading: placeholder, entitlement, job };
}

export async function createFriendReportCheckoutIntent(input: {
  userId: string;
  subjectId: string;
  targetDate: string;
  facts?: Record<string, unknown>;
  admin?: SupabaseReportAdmin;
}) {
  const admin = adminClient(input.admin);
  const locked = friendTransitReadingRequestLock({
    brief: input.facts?.friendTransitsBrief,
    subjectId: input.subjectId,
    targetDate: input.targetDate
  });
  const rows = await admin.insert<FriendReportCheckoutIntent>("friend_report_checkout_intents", {
    user_id: input.userId,
    subject_id: input.subjectId,
    target_date: input.targetDate,
    content_key: locked.contentKey,
    facts: locked.facts,
    source_snapshot: locked.sourceSnapshot,
    status: "pending"
  });
  const intent = rows[0];
  if (!intent) throw new Error("Friends report checkout intent could not be created.");
  return { intent, locked };
}

export async function activateFriendReportCheckout(input: {
  intentId: string;
  stripeEventId: string;
  checkoutSessionId: string;
  customerId?: string | null;
  paymentIntentId?: string | null;
  admin?: SupabaseReportAdmin;
}) {
  const admin = adminClient(input.admin);
  const intent = await admin.selectOne<FriendReportCheckoutIntent>(
    "friend_report_checkout_intents",
    new URLSearchParams({ id: `eq.${input.intentId}`, status: "eq.pending", select: "*" })
  );
  if (!intent) throw new Error("Friends report checkout intent is unavailable or already converted.");
  if (Date.parse(intent.expires_at) <= Date.now()) {
    await admin.update("friend_report_checkout_intents", `id=eq.${intent.id}`, { status: "expired" });
    throw new Error("Friends report checkout intent expired.");
  }
  const rows = await admin.insert<FriendReportEntitlement>("friend_report_entitlements", {
    user_id: intent.user_id,
    subject_id: intent.subject_id,
    target_date: intent.target_date,
    content_key: intent.content_key,
    product_key: "friend_transit_daily",
    source: "stripe",
    status: "active",
    stripe_event_id: input.stripeEventId,
    stripe_checkout_session_id: input.checkoutSessionId,
    stripe_customer_id: input.customerId ?? null,
    stripe_payment_intent_id: input.paymentIntentId ?? null,
    purchased_at: new Date().toISOString()
  }, { onConflict: "user_id,subject_id,target_date", ignoreDuplicates: true });
  const entitlement = rows[0] ?? await findFriendReportEntitlement({
    userId: intent.user_id,
    subjectId: intent.subject_id,
    targetDate: intent.target_date,
    admin
  });
  if (!entitlement || entitlement.status !== "active") throw new Error("Friends report entitlement activation failed.");
  const locked = friendTransitReadingRequestLock({
    brief: intent.facts.friendTransitsBrief,
    subjectId: intent.subject_id,
    targetDate: intent.target_date
  });
  await ensurePlaceholder({ admin, entitlement, locked });
  const job = await ensureJob({ admin, entitlement, locked });
  await admin.update("friend_report_checkout_intents", `id=eq.${intent.id}`, {
    status: "converted",
    converted_at: new Date().toISOString()
  });
  return { entitlement, job };
}

export async function refundFriendReportByPaymentIntent(input: {
  paymentIntentId: string;
  chargeId?: string | null;
  admin?: SupabaseReportAdmin;
}) {
  const admin = adminClient(input.admin);
  const entitlement = await admin.selectOne<FriendReportEntitlement>(
    "friend_report_entitlements",
    new URLSearchParams({ stripe_payment_intent_id: `eq.${input.paymentIntentId}`, select: "*" })
  );
  if (!entitlement) return null;
  await admin.update("friend_report_entitlements", `id=eq.${entitlement.id}`, {
    status: "refunded",
    revoked_at: new Date().toISOString(),
    ...(input.chargeId ? { stripe_charge_id: input.chargeId } : {})
  });
  await admin.update("friend_report_jobs", `entitlement_id=eq.${entitlement.id}&state=in.(queued,running,retry)`, {
    state: "cancelled",
    locked_at: null,
    locked_by: null,
    last_error: "Entitlement refunded before completion."
  });
  return entitlement;
}

async function claimJobs(input: {
  admin: SupabaseReportAdmin;
  workerId: string;
  jobId?: string;
  batchLimit: number;
}) {
  return input.admin.request<FriendReportJob[]>("rpc/claim_friend_report_jobs", {
    method: "POST",
    body: JSON.stringify({
      worker_id: input.workerId,
      batch_limit: input.batchLimit,
      requested_job_id: input.jobId ?? null
    })
  });
}

export async function runFriendReportJobs(input: {
  workerId: string;
  jobId?: string;
  batchLimit?: number;
  admin?: SupabaseReportAdmin;
}) {
  const admin = adminClient(input.admin);
  const jobs = await claimJobs({ admin, workerId: input.workerId, jobId: input.jobId, batchLimit: input.batchLimit ?? 1 });
  const results: Array<{ jobId: string; status: string; resultId?: string }> = [];
  const attemptCap = Math.max(1, Number.parseInt(process.env.FRIEND_REPORT_JOB_ATTEMPT_CAP ?? "4", 10) || 4);

  for (const job of jobs) {
    const entitlement = await admin.selectOne<FriendReportEntitlement>(
      "friend_report_entitlements",
      new URLSearchParams({ id: `eq.${job.entitlement_id}`, select: "*" })
    );
    if (!entitlement || entitlement.status !== "active") {
      await admin.update("friend_report_jobs", `id=eq.${job.id}`, {
        state: "cancelled",
        locked_at: null,
        locked_by: null,
        last_error: "Active entitlement is unavailable."
      });
      results.push({ jobId: job.id, status: "cancelled" });
      continue;
    }
    try {
      const generated = await generateFriendTransitReadingForUser({
        userId: job.user_id,
        subjectId: job.subject_id,
        targetDate: job.target_date,
        facts: job.facts,
        entitlementId: job.entitlement_id
      });
      const resultId = generated.saved[0]?.id;
      await admin.update("friend_report_jobs", `id=eq.${job.id}`, {
        state: "complete",
        result_id: resultId ?? null,
        locked_at: null,
        locked_by: null,
        last_error: null
      });
      results.push({ jobId: job.id, status: "complete", ...(resultId ? { resultId } : {}) });
    } catch (error) {
      const failed = job.attempt >= attemptCap;
      const delayMinutes = Math.min(30, Math.max(1, job.attempt * 2));
      await admin.update("friend_report_jobs", `id=eq.${job.id}`, {
        state: failed ? "failed" : "retry",
        run_after: failed ? new Date().toISOString() : new Date(Date.now() + delayMinutes * 60_000).toISOString(),
        locked_at: null,
        locked_by: null,
        last_error: error instanceof Error ? error.message.slice(0, 2000) : "Friends report generation failed."
      });
      results.push({ jobId: job.id, status: failed ? "failed" : "retry" });
    }
  }
  return { claimed: jobs.length, results };
}
