import type { IncomingMessage, ServerResponse } from "node:http";
import { createReportFactsCalculator, runReportFulfillmentBatch } from "../_lib/report-fulfillment.js";
import { createReportFulfillmentStore } from "../_lib/report-fulfillment-store.js";
import { requireInternalRunner, sendJson } from "../_lib/report-http.js";

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  if (req.method !== "POST" && req.method !== "GET") return sendJson(res, 405, { error: "Use GET or POST." });
  if (!requireInternalRunner(req)) return sendJson(res, 401, { error: "Unauthorized." });
  try {
    const workerId = `report-worker-${process.pid}-${Date.now()}`;
    sendJson(res, 200, await runReportFulfillmentBatch({
      workerId,
      store: createReportFulfillmentStore(),
      calculateFacts: createReportFactsCalculator()
    }));
  } catch (error) {
    sendJson(res, 500, { error: error instanceof Error ? error.message : "Report fulfillment runner failed." });
  }
}
