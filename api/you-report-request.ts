import { REPORT_REVIEW_REQUIRED_MESSAGE } from "./_lib/transit-reading-review-stop.js";
import type { IncomingMessage, ServerResponse } from "node:http";
import { waitUntil } from "@vercel/functions";
import { requestYouReport, runYouReportJobs } from "./_lib/you-report-lifecycle.js";
import { jsonRequestBody, requireReportUser, sendJson } from "./_lib/report-http.js";

type RequestBody = {
  reportWindow?: "day" | "week";
  brief?: unknown;
};

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  if (req.method !== "POST") return sendJson(res, 405, { error: "Use POST." });
  try {
    const user = await requireReportUser(req);
    const body = await jsonRequestBody<RequestBody>(req);
    if (body.reportWindow !== "day" && body.reportWindow !== "week") {
      return sendJson(res, 400, { error: "Choose a day or week report." });
    }
    const result = await requestYouReport({
      userId: user.id,
      reportWindow: body.reportWindow,
      brief: body.brief
    });
    if (result.status === "unavailable") {
      return sendJson(res, 409, { status: "unavailable", error: "This report is unavailable." });
    }
    if (result.status === "ready") {
      return sendJson(res, 200, { status: "ready", reportId: result.reading?.id ?? null });
    }
    if (result.status === "needs_review") {
      return sendJson(res, 409, { status: "needs_review", reportId: result.reading?.id ?? null,
        error: REPORT_REVIEW_REQUIRED_MESSAGE });
    }
    const jobId = result.job?.id;
    if (jobId) {
      const workerId = `you-report-request-${process.pid}-${Date.now()}`;
      waitUntil(runYouReportJobs({ workerId, jobId }).catch((error) => {
        console.error("you-report background generation failed", error);
      }));
    }
    return sendJson(res, 202, {
      status: "queued",
      jobId: jobId ?? null,
      reportId: result.reading?.id ?? null,
      message: "Your report is being prepared. It will stay in Reports even if you leave this page."
    });
  } catch (error) {
    console.error("you-report-request failed", error);
    return sendJson(res, 400, { error: error instanceof Error ? error.message : "Could not prepare this report." });
  }
}
