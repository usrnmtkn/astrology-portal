import { TRANSIT_READING_INVOCATION_BUDGET_MS, withTransitReadingCheckpoints, TransitReadingCheckpointYield, TransitReadingCheckpointStopped } from "./transit-reading-checkpoints.js";
import { youTransitReadingRequestLock, type YouTransitReadingWindow } from "./you-transit-reading.js";
import { generateYouTransitReadingForUser, type YouTransitReadingRow } from "./you-transit-reading-generation.js";
import { isTransitReadingJudgeBlockedError, type GeneratedTransitReadingDraft } from "./transit-reading-generation.js";
import { createSupabaseReportAdmin, type SupabaseReportAdmin } from "./supabase-report-admin.js";

export type YouReportJobState = "queued" | "running" | "retry" | "complete" | "failed" | "cancelled";

export type YouReportEntitlement = {
  id: string;
  user_id: string;
  report_window: YouTransitReadingWindow;
  target_date: string;
  period_end: string;
  content_key: string;
  product_key: "you_transit_day" | "you_transit_week";
  source: "free_test" | "stripe" | "comp";
  status: "active" | "revoked" | "refunded";
  purchased_at: string;
  revoked_at: string | null;
};

export type YouReportJob = {
  id: string;
  entitlement_id: string;
  user_id: string;
  report_window: YouTransitReadingWindow;
  target_date: string;
  period_end: string;
  content_key: string;
  facts: Record<string, unknown>;
  source_snapshot: Record<string, unknown>;
  state: YouReportJobState;
  attempt: number;
  checkpoint_attempt?: number;
  run_after: string;
  locked_at: string | null;
  locked_by: string | null;
  last_error: string | null;
  result_id: string | null;
};

const ownerReviewRequiredPrefix = "OWNER_REVIEW_REQUIRED:";

function adminClient(admin?: SupabaseReportAdmin) {
  return admin ?? createSupabaseReportAdmin();
}

function entitlementParams(userId: string, reportWindow: YouTransitReadingWindow, targetDate: string) {
  return new URLSearchParams({
    user_id: `eq.${userId}`,
    report_window: `eq.${reportWindow}`,
    target_date: `eq.${targetDate}`,
    select: "*"
  });
}

export async function findYouReportEntitlement(input: {
  userId: string;
  reportWindow: YouTransitReadingWindow;
  targetDate: string;
  admin?: SupabaseReportAdmin;
}) {
  return adminClient(input.admin).selectOne<YouReportEntitlement>(
    "you_report_entitlements",
    entitlementParams(input.userId, input.reportWindow, input.targetDate)
  );
}

async function findYouReading(input: {
  userId: string;
  locked: ReturnType<typeof youTransitReadingRequestLock>;
  admin: SupabaseReportAdmin;
}) {
  return input.admin.selectOne<YouTransitReadingRow>(
    "user_generated_interpretations",
    new URLSearchParams({
      user_id: `eq.${input.userId}`,
      subject_type: `eq.${input.locked.subjectType}`,
      subject_id: `eq.${input.locked.subjectId}`,
      target_date: `eq.${input.locked.brief.targetDate}`,
      content_key: `eq.${input.locked.contentKey}`,
      mode: "eq.in_depth",
      select: "id,content_key,surface,mode,status,event_type,target_date,headline,summary,body,sections,provider,model,updated_at,you_report_entitlement_id",
      order: "updated_at.desc"
    })
  );
}

async function ensurePlaceholder(input: {
  admin: SupabaseReportAdmin;
  entitlement: YouReportEntitlement;
  locked: ReturnType<typeof youTransitReadingRequestLock>;
}) {
  const existing = await findYouReading({ userId: input.entitlement.user_id, locked: input.locked, admin: input.admin });
  if (existing?.body?.trim() && existing.you_report_entitlement_id === input.entitlement.id) return existing;

  const rows = await input.admin.insert<YouTransitReadingRow>("user_generated_interpretations", {
    user_id: input.entitlement.user_id,
    subject_type: input.locked.subjectType,
    subject_id: input.locked.subjectId,
    content_key: input.locked.contentKey,
    surface: input.locked.surface,
    mode: input.locked.mode,
    status: "DRAFT",
    event_type: input.locked.eventType,
    target_date: input.locked.brief.targetDate,
    facts: input.locked.facts,
    knowledge_ids: input.locked.knowledgeIds,
    source_snapshot: input.locked.sourceSnapshot,
    prompt_version: "you-transit-reading-queued-v1",
    provider: null,
    model: null,
    headline: input.locked.headline,
    summary: null,
    body: "",
    sections: { sections: [], sceneLock: null, astrologyDrilldown: null },
    response_id: null,
    error: null,
    you_report_entitlement_id: input.entitlement.id
  }, { onConflict: "user_id,subject_type,subject_id,content_key,target_date,mode" });
  return rows[0] ?? null;
}

function ownerReviewRequired(job: Pick<YouReportJob, "state" | "last_error">) {
  return job.state === "failed" && Boolean(job.last_error?.startsWith(ownerReviewRequiredPrefix));
}

async function ensureJob(input: {
  admin: SupabaseReportAdmin;
  entitlement: YouReportEntitlement;
  locked: ReturnType<typeof youTransitReadingRequestLock>;
}) {
  const existing = await input.admin.selectOne<YouReportJob>(
    "you_report_jobs",
    new URLSearchParams({ entitlement_id: `eq.${input.entitlement.id}`, select: "*" })
  );
  if (existing) {
    if (ownerReviewRequired(existing)) return existing;
    if (["failed", "cancelled"].includes(existing.state) && input.entitlement.status === "active") {
      await input.admin.update(
        "user_generated_interpretations",
        `you_report_entitlement_id=eq.${input.entitlement.id}&subject_type=eq.${input.locked.subjectType}`,
        {
          status: "DRAFT",
          error: null,
          body: "",
          summary: null,
          source_snapshot: input.locked.sourceSnapshot
        }
      );
      const rows = await input.admin.update<YouReportJob>("you_report_jobs", `id=eq.${existing.id}`, {
        state: "queued",
        attempt: 0,
        checkpoint_attempt: (existing.checkpoint_attempt ?? 1) + 1,
        run_after: new Date().toISOString(),
        locked_at: null,
        locked_by: null,
        last_error: null,
        result_id: null
      });
      return rows[0] ?? existing;
    }
    return existing;
  }
  const rows = await input.admin.insert<YouReportJob>("you_report_jobs", {
    entitlement_id: input.entitlement.id,
    user_id: input.entitlement.user_id,
    report_window: input.entitlement.report_window,
    target_date: input.entitlement.target_date,
    period_end: input.entitlement.period_end,
    content_key: input.locked.contentKey,
    facts: input.locked.facts,
    source_snapshot: input.locked.sourceSnapshot,
    state: "queued"
  }, { onConflict: "entitlement_id", ignoreDuplicates: true });
  if (rows[0]) return rows[0];
  const refetched = await input.admin.selectOne<YouReportJob>(
    "you_report_jobs",
    new URLSearchParams({ entitlement_id: `eq.${input.entitlement.id}`, select: "*" })
  );
  if (!refetched) throw new Error("You report job could not be created.");
  return refetched;
}

async function createFreeTestEntitlement(input: {
  admin: SupabaseReportAdmin;
  userId: string;
  locked: ReturnType<typeof youTransitReadingRequestLock>;
}) {
  const reportWindow = input.locked.brief.window;
  const rows = await input.admin.insert<YouReportEntitlement>("you_report_entitlements", {
    user_id: input.userId,
    report_window: reportWindow,
    target_date: input.locked.brief.targetDate,
    period_end: input.locked.brief.periodEnd,
    content_key: input.locked.contentKey,
    product_key: reportWindow === "day" ? "you_transit_day" : "you_transit_week",
    source: "free_test",
    status: "active",
    purchased_at: new Date().toISOString()
  }, { onConflict: "user_id,report_window,target_date", ignoreDuplicates: true });
  if (rows[0]) return rows[0];
  const existing = await findYouReportEntitlement({
    userId: input.userId,
    reportWindow,
    targetDate: input.locked.brief.targetDate,
    admin: input.admin
  });
  if (!existing) throw new Error("You report entitlement could not be created.");
  return existing;
}

export async function requestYouReport(input: {
  userId: string;
  reportWindow: YouTransitReadingWindow;
  brief: unknown;
  admin?: SupabaseReportAdmin;
}) {
  const admin = adminClient(input.admin);
  const locked = youTransitReadingRequestLock({ brief: input.brief });
  if (locked.brief.window !== input.reportWindow) throw new Error("You report window does not match its governed brief.");
  let entitlement = await findYouReportEntitlement({
    userId: input.userId,
    reportWindow: locked.brief.window,
    targetDate: locked.brief.targetDate,
    admin
  });
  if (entitlement && entitlement.status !== "active") {
    return { status: "unavailable" as const, entitlement, job: null };
  }

  const completed = await findYouReading({ userId: input.userId, locked, admin });
  if (completed?.body?.trim() && ["DRAFT", "REVIEWED", "LIVE"].includes(completed.status)
    && (!entitlement || completed.you_report_entitlement_id === entitlement.id)) {
    return { status: "ready" as const, reading: completed, entitlement, job: null };
  }

  if (!entitlement) entitlement = await createFreeTestEntitlement({ admin, userId: input.userId, locked });
  const placeholder = await ensurePlaceholder({ admin, entitlement, locked });
  const job = await ensureJob({ admin, entitlement, locked });
  if (job.state === "complete" && placeholder?.body?.trim() && ["DRAFT", "REVIEWED", "LIVE"].includes(placeholder.status)) {
    return { status: "ready" as const, reading: placeholder, entitlement, job };
  }
  return { status: "queued" as const, reading: placeholder, entitlement, job };
}

async function claimJobs(input: {
  admin: SupabaseReportAdmin;
  workerId: string;
  jobId?: string;
  batchLimit: number;
}) {
  return input.admin.request<YouReportJob[]>("rpc/claim_you_report_jobs", {
    method: "POST",
    body: JSON.stringify({
      worker_id: input.workerId,
      batch_limit: input.batchLimit,
      requested_job_id: input.jobId ?? null
    })
  });
}

async function markPlaceholderFailed(admin: SupabaseReportAdmin, job: YouReportJob, message: string) {
  const subjectType = job.report_window === "day" ? "you_day_reading" : "you_week_reading";
  await admin.update(
    "user_generated_interpretations",
    `you_report_entitlement_id=eq.${job.entitlement_id}&subject_type=eq.${subjectType}`,
    { status: "ERROR", error: message.slice(0, 2000) }
  );
}

async function markPlaceholderReviewCandidate(
  admin: SupabaseReportAdmin,
  job: YouReportJob,
  candidate: GeneratedTransitReadingDraft,
  diagnostic: unknown
) {
  const subjectType = job.report_window === "day" ? "you_day_reading" : "you_week_reading";
  await admin.update(
    "user_generated_interpretations",
    `you_report_entitlement_id=eq.${job.entitlement_id}&subject_type=eq.${subjectType}`,
    {
      status: "ERROR",
      error: "Generated draft needs owner review before it can be shown.",
      source_snapshot: {
        ...job.source_snapshot,
        generatedReportReviewCandidate: {
          schema: "tldr-generated-report-review-candidate.v1",
          headline: candidate.headline,
          tldr: candidate.tldr,
          summary: candidate.summary,
          body: candidate.body,
          model: candidate.model,
          responseId: candidate.responseId ?? null,
          retryCount: candidate.retryCount,
          diagnostic,
          recordedAt: new Date().toISOString()
        }
      }
    }
  );
}

export async function runYouReportJobs(input: {
  workerId: string;
  jobId?: string;
  batchLimit?: number;
  admin?: SupabaseReportAdmin;
}) {
  const deadline = Date.now() + TRANSIT_READING_INVOCATION_BUDGET_MS;
  const admin = adminClient(input.admin);
  const jobs = await claimJobs({ admin, workerId: input.workerId, jobId: input.jobId, batchLimit: input.batchLimit ?? 1 });
  const results: Array<{ jobId: string; status: string; resultId?: string }> = [];
  const attemptCap = Math.max(1, Number.parseInt(process.env.YOU_REPORT_JOB_ATTEMPT_CAP ?? "4", 10) || 4);
  const qualityAttemptCap = Math.max(1, Number.parseInt(process.env.YOU_REPORT_QUALITY_ATTEMPT_CAP ?? "2", 10) || 2);

  for (const job of jobs) {
    const entitlement = await admin.selectOne<YouReportEntitlement>(
      "you_report_entitlements",
      new URLSearchParams({ id: `eq.${job.entitlement_id}`, select: "*" })
    );
    if (!entitlement || entitlement.status !== "active") {
      await admin.update("you_report_jobs", `id=eq.${job.id}`, {
        state: "cancelled",
        locked_at: null,
        locked_by: null,
        last_error: "Active entitlement is unavailable."
      });
      await markPlaceholderFailed(admin, job, "This report is unavailable because its entitlement is no longer active.");
      results.push({ jobId: job.id, status: "cancelled" });
      continue;
    }
    try {
      if (deadline - Date.now() < 60_000) throw new TransitReadingCheckpointYield();
      const generated = await withTransitReadingCheckpoints({ admin, family: "you", jobId: job.id, attempt: job.checkpoint_attempt ?? 1, deadline,
        onProgress: async (stage) => {
          await admin.update("user_generated_interpretations",
            `user_id=eq.${job.user_id}&you_report_entitlement_id=eq.${job.entitlement_id}&status=eq.DRAFT&body=eq.`,
            { source_snapshot: { ...job.source_snapshot, reportProgress: { stage, updatedAt: new Date().toISOString() } } }
          ).catch(() => { console.warn("Report progress could not be saved", { jobId: job.id, stage }); });
        }
      }, () => generateYouTransitReadingForUser({
        userId: job.user_id,
        facts: job.facts,
        entitlementId: job.entitlement_id
      }));
      const resultId = generated.saved[0]?.id;
      await admin.update("you_report_jobs", `id=eq.${job.id}`, {
        state: "complete",
        result_id: resultId ?? null,
        locked_at: null,
        locked_by: null,
        last_error: null
      });
      results.push({ jobId: job.id, status: "complete", ...(resultId ? { resultId } : {}) });
    } catch (error) {
      if (error instanceof TransitReadingCheckpointYield) {
        await admin.update("you_report_jobs", `id=eq.${job.id}&state=eq.running&locked_by=eq.${encodeURIComponent(input.workerId)}`, {
          state: "retry", attempt: Math.max(0, job.attempt - 1), run_after: new Date().toISOString(),
          locked_at: null, locked_by: null, last_error: null
        });
        results.push({ jobId: job.id, status: "retry" });
        continue;
      }
      const judgeBlocked = isTransitReadingJudgeBlockedError(error);
      const qualityReviewRequired = judgeBlocked && job.attempt >= qualityAttemptCap;
      const failed = qualityReviewRequired || job.attempt >= attemptCap || error instanceof TransitReadingCheckpointStopped;
      const delayMinutes = judgeBlocked ? 0 : Math.min(30, Math.max(1, job.attempt * 2));
      const errorMessage = qualityReviewRequired
        ? `${ownerReviewRequiredPrefix} Generated draft needs owner review before it can be shown.`
        : judgeBlocked
          ? "Writing quality gate did not pass after one corrective rewrite and re-judge."
          : error instanceof Error
            ? error.message.slice(0, 2000)
            : "You report generation failed.";
      await admin.update("you_report_jobs", `id=eq.${job.id}`, {
        state: failed ? "failed" : "retry",
        ...(!failed ? { checkpoint_attempt: (job.checkpoint_attempt ?? 1) + 1 } : {}),
        run_after: !failed && judgeBlocked ? job.run_after
          : failed ? new Date().toISOString() : new Date(Date.now() + delayMinutes * 60_000).toISOString(),
        locked_at: null,
        locked_by: null,
        last_error: judgeBlocked && error.diagnostic
          ? `${errorMessage} ${JSON.stringify(error.diagnostic)}`.slice(0, 12000)
          : errorMessage
      });
      if (failed) {
        if (qualityReviewRequired && judgeBlocked && error.reviewCandidate) {
          await markPlaceholderReviewCandidate(admin, job, error.reviewCandidate, error.diagnostic ?? null);
        } else {
          await markPlaceholderFailed(admin, job, error instanceof TransitReadingCheckpointStopped
            ? "This report could not finish generating. Please try again." : errorMessage);
        }
      }
      results.push({ jobId: job.id, status: qualityReviewRequired ? "review_required" : failed ? "failed" : "retry" });
      if (!failed && judgeBlocked && deadline - Date.now() >= 60_000) {
        jobs.push(...await claimJobs({ admin, workerId: input.workerId, jobId: job.id, batchLimit: 1 }));
      }
    }
  }
  return { claimed: jobs.length, results };
}
