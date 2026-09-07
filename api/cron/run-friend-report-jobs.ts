import type { IncomingMessage, ServerResponse } from "node:http";
import { runFriendReportJobs } from "../_lib/friend-report-lifecycle.js";
import { requireInternalRunner, sendJson } from "../_lib/report-http.js";

export const maxDuration = 300;

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  if (req.method !== "POST" && req.method !== "GET") return sendJson(res, 405, { error: "Use GET or POST." });
  if (!requireInternalRunner(req)) return sendJson(res, 401, { error: "Unauthorized." });
  try {
    const jobId = new URL(req.url ?? "/", "https://tldrastro.invalid").searchParams.get("jobId") ?? undefined;
    const workerId = `friend-report-worker-${process.pid}-${Date.now()}`;
    return sendJson(res, 200, await runFriendReportJobs({ workerId, jobId, batchLimit: 1 }));
  } catch (error) {
    console.error("run-friend-report-jobs failed", error);
    return sendJson(res, 500, { error: "Friends report worker failed." });
  }
}
