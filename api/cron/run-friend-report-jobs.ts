import type { IncomingMessage, ServerResponse } from "node:http";
import { runFriendReportQueueBatch } from "../_lib/friend-report-generation.js";
import { requireInternalRunner, sendJson } from "../_lib/report-http.js";

export const maxDuration = 300;

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  if (req.method !== "POST" && req.method !== "GET") return sendJson(res, 405, { error: "Use GET or POST." });
  if (!requireInternalRunner(req)) return sendJson(res, 401, { error: "Unauthorized." });
  try {
    const workerId = `friend-report-worker-${process.pid}-${Date.now()}`;
    const limitParam = Number.parseInt(new URL(req.url ?? "/", "https://tldrastro.invalid").searchParams.get("limit") ?? "3", 10);
    const limit = Number.isInteger(limitParam) ? Math.max(1, Math.min(limitParam, 5)) : 3;
    sendJson(res, 200, await runFriendReportQueueBatch(workerId, limit));
  } catch (error) {
    console.error("run-friend-report-jobs failed", error);
    sendJson(res, 500, { error: "Friends report worker failed." });
  }
}
