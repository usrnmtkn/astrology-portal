import type { IncomingMessage, ServerResponse } from "node:http";
import { friendTransitReadingRequestLock } from "./_lib/friend-transit-reading.js";
import { friendReportWriterBrief } from "./_lib/friend-report-specificity.js";
import { ensureFriendReportPlaceholder } from "./_lib/friend-report-placeholder.js";
import {
  claimAndProcessFriendReportJob,
  existingFriendTransitReading,
  FRIEND_TRANSIT_READING_PROVIDER_SCHEMA
} from "./_lib/friend-report-generation.js";
import {
  ensureFreeTestFriendReportEntitlement,
  ensureFriendReportJob,
  findFriendReportEntitlement,
  friendReportBillingMode
} from "./_lib/friend-report-lifecycle.js";
import { jsonRequestBody, requireReportUser, sendJson } from "./_lib/report-http.js";
import { createSupabaseReportAdmin } from "./_lib/supabase-report-admin.js";

export { FRIEND_TRANSIT_READING_PROVIDER_SCHEMA };

export const maxDuration = 300;

type FriendTransitReadingRequest = {
  subjectType?: string;
  subjectId: string;
  targetDate?: string;
  facts?: Record<string, unknown>;
};

function stringValue(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  if (req.method !== "POST") {
    sendJson(res, 405, { error: "Use POST." });
    return;
  }

  try {
    const user = await requireReportUser(req);
    const input = await jsonRequestBody<FriendTransitReadingRequest>(req);
    if (input.subjectType !== "friend_transit_reading") {
      sendJson(res, 400, { ok: false, error: "Unsupported reading request." });
      return;
    }

    const subjectId = stringValue(input.subjectId);
    const targetDate = stringValue(input.targetDate);
    const locked = friendTransitReadingRequestLock({
      brief: input.facts?.friendTransitsBrief,
      subjectId,
      targetDate
    });
    const writerBrief = friendReportWriterBrief(locked.brief);
    const admin = createSupabaseReportAdmin();

    const existing = await existingFriendTransitReading({
      admin,
      userId: user.id,
      subjectId,
      contentKey: locked.contentKey,
      targetDate
    });
    if (existing && ["DRAFT", "REVIEWED", "LIVE"].includes(existing.status) && existing.body.trim()) {
      sendJson(res, 200, { ok: true, reused: true, contentKey: locked.contentKey, saved: [existing] });
      return;
    }

    let entitlement = await findFriendReportEntitlement(admin, user.id, locked.contentKey);
    if (friendReportBillingMode() === "free_test") {
      entitlement = await ensureFreeTestFriendReportEntitlement({
        admin,
        userId: user.id,
        subjectId,
        contentKey: locked.contentKey,
        targetDate,
        friendName: locked.brief.friendName,
        brief: writerBrief
      });
    } else if (!entitlement || entitlement.status !== "active") {
      sendJson(res, 402, {
        ok: false,
        errorType: "payment_required",
        error: "Purchase this reading to generate it.",
        contentKey: locked.contentKey
      });
      return;
    }

    if (!entitlement || entitlement.status !== "active") {
      throw new Error("FRIEND_REPORT_ACTIVE_ENTITLEMENT_REQUIRED");
    }

    await ensureFriendReportPlaceholder({ admin, entitlement });
    const job = await ensureFriendReportJob({ admin, entitlement });
    if (job.state === "complete") {
      const saved = await existingFriendTransitReading({
        admin,
        userId: user.id,
        subjectId,
        contentKey: locked.contentKey,
        targetDate
      });
      if (saved?.body.trim()) {
        sendJson(res, 200, { ok: true, reused: true, contentKey: locked.contentKey, saved: [saved] });
        return;
      }
    }

    if (job.state === "running") {
      sendJson(res, 202, { ok: true, queued: true, jobId: job.id, contentKey: locked.contentKey });
      return;
    }

    const workerId = `friend-inline-${process.pid}-${Date.now()}`;
    const result = await claimAndProcessFriendReportJob(job.id, workerId);
    if (result.state === "complete") {
      sendJson(res, 200, {
        ok: true,
        contentKey: locked.contentKey,
        generated: "generated" in result ? result.generated : undefined,
        saved: result.saved
      });
      return;
    }
    if (result.state === "retry" || result.state === "not_claimed") {
      sendJson(res, 202, { ok: true, queued: true, jobId: job.id, contentKey: locked.contentKey });
      return;
    }

    sendJson(res, 500, {
      ok: false,
      errorType: "paid_reading_unavailable",
      error: "This paid reading is currently unavailable."
    });
  } catch (error) {
    console.error("generate-friend-transit-reading failed", error);
    sendJson(res, 500, {
      ok: false,
      errorType: "paid_reading_unavailable",
      error: "This paid reading is currently unavailable."
    });
  }
}
