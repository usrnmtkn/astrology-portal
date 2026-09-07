import type { IncomingMessage, ServerResponse } from "node:http";
import { waitUntil } from "@vercel/functions";
import { requestFriendReport, runFriendReportJobs } from "./_lib/friend-report-lifecycle.js";
import { jsonRequestBody, requireReportUser, sendJson } from "./_lib/report-http.js";

type RequestBody = {
  subjectType?: string;
  subjectId?: string;
  targetDate?: string;
  facts?: Record<string, unknown>;
};

function stringValue(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  if (req.method !== "POST") return sendJson(res, 405, { error: "Use POST." });
  try {
    const user = await requireReportUser(req);
    const body = await jsonRequestBody<RequestBody>(req);
    if (body.subjectType !== "friend_transit_reading") {
      return sendJson(res, 400, { error: "Unsupported Friends report request." });
    }
    const result = await requestFriendReport({
      userId: user.id,
      subjectId: stringValue(body.subjectId),
      targetDate: stringValue(body.targetDate),
      facts: body.facts
    });
    if (result.status === "payment_required") {
      return sendJson(res, 402, { status: "payment_required", errorType: "payment_required", error: "Purchase this reading to continue." });
    }
    if (result.status === "unavailable") {
      return sendJson(res, 409, { status: "unavailable", error: "This reading is unavailable." });
    }
    if (result.status === "ready") {
      return sendJson(res, 200, { status: "ready", saved: result.reading ? [result.reading] : [] });
    }
    const jobId = result.job?.id;
    if (jobId) {
      const workerId = `friend-report-request-${process.pid}-${Date.now()}`;
      waitUntil(runFriendReportJobs({ workerId, jobId }).catch((error) => {
        console.error("friend-report background generation failed", error);
      }));
    }
    return sendJson(res, 202, {
      status: "queued",
      jobId: jobId ?? null,
      reportId: result.reading?.id ?? null,
      message: "Your reading is being prepared. It will stay in Reports even if you leave this page."
    });
  } catch (error) {
    console.error("friend-report-request failed", error);
    return sendJson(res, 400, { error: error instanceof Error ? error.message : "Could not prepare this reading." });
  }
}
