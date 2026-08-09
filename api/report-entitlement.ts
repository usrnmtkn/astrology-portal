import type { IncomingMessage, ServerResponse } from "node:http";
import { activateReadyEntitlement } from "./_lib/report-entitlements.js";
import { jsonRequestBody, requireReportUser, sendJson } from "./_lib/report-http.js";
import { createSupabaseReportAdmin } from "./_lib/supabase-report-admin.js";

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  if (req.method !== "POST") return sendJson(res, 405, { error: "Use POST." });
  try {
    const user = await requireReportUser(req);
    const body = await jsonRequestBody<{ entitlementId?: string }>(req);
    if (!body.entitlementId) throw new Error("entitlementId is required.");
    sendJson(res, 200, await activateReadyEntitlement(createSupabaseReportAdmin(), body.entitlementId, user.id));
  } catch (error) {
    sendJson(res, 400, { error: error instanceof Error ? error.message : "Could not activate the report entitlement." });
  }
}
