import type { IncomingMessage, ServerResponse } from "node:http";
import { existingFriendTransitReading } from "./_lib/friend-report-generation.js";
import {
  findFriendReportEntitlement,
  friendReportJobForOwner
} from "./_lib/friend-report-lifecycle.js";
import { requireReportUser, sendJson } from "./_lib/report-http.js";
import { createSupabaseReportAdmin } from "./_lib/supabase-report-admin.js";

function stringValue(value: string | null) {
  return value?.trim() ?? "";
}

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  if (req.method !== "GET") return sendJson(res, 405, { error: "Use GET." });
  try {
    const user = await requireReportUser(req);
    const url = new URL(req.url ?? "/api/friend-report-status", "https://tldrastro.invalid");
    const subjectId = stringValue(url.searchParams.get("subjectId"));
    const targetDate = stringValue(url.searchParams.get("targetDate"));
    if (!subjectId || !/^\d{4}-\d{2}-\d{2}$/u.test(targetDate)) {
      return sendJson(res, 400, { error: "Invalid Friends report status request." });
    }
    const contentKey = `friend-transit-reading/${subjectId}/${targetDate}`;
    const admin = createSupabaseReportAdmin();
    const saved = await existingFriendTransitReading({
      admin,
      userId: user.id,
      subjectId,
      contentKey,
      targetDate
    });
    if (saved && ["DRAFT", "REVIEWED", "LIVE"].includes(saved.status) && saved.body.trim()) {
      res.setHeader("cache-control", "private, no-store");
      return sendJson(res, 200, { state: "complete", saved: [saved] });
    }

    const [entitlement, job] = await Promise.all([
      findFriendReportEntitlement(admin, user.id, contentKey),
      friendReportJobForOwner({ admin, userId: user.id, contentKey })
    ]);
    res.setHeader("cache-control", "private, no-store");
    return sendJson(res, 200, {
      state: job?.state ?? (entitlement?.status === "pending_payment" ? "pending_payment" : "idle"),
      entitlementStatus: entitlement?.status ?? null,
      jobId: job?.id ?? null
    });
  } catch {
    return sendJson(res, 401, { error: "Could not load this report status." });
  }
}
