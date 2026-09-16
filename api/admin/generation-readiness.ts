import type { IncomingMessage, ServerResponse } from "node:http";
import { generationReadiness } from "../_lib/generation-readiness.js";
import { sendAdminJson, sendAdminMethodNotAllowed } from "../_lib/admin-http.js";
import { requireReportAdmin } from "../_lib/report-http.js";

export const maxDuration = 60;

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  if (!await requireReportAdmin(req)) {
    sendAdminJson(res, 401, { ok: false, error: "Unauthorized." });
    return;
  }
  if (req.method !== "GET") {
    sendAdminMethodNotAllowed(res, ["GET"]);
    return;
  }
  try {
    const readiness = await generationReadiness();
    sendAdminJson(res, readiness.status === "blocked" ? 503 : 200, { ok: readiness.status !== "blocked", ...readiness });
  } catch (error) {
    sendAdminJson(res, 503, {
      ok: false,
      schema: "tldr-generation-readiness.v1",
      status: "blocked",
      checkedAt: new Date().toISOString(),
      checks: [],
      error: error instanceof Error ? error.message : "Generation readiness could not be checked."
    });
  }
}
