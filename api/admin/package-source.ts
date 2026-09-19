import type { IncomingMessage, ServerResponse } from "node:http";
import { URL } from "node:url";
import { isContentAdminAuthorized } from "../_lib/admin-auth.js";
import { AdminHttpError, adminErrorMessage, adminErrorStatus, sendAdminJson, sendAdminMethodNotAllowed } from "../_lib/admin-http.js";
import { isRetiredCompositionKey } from "../../apps/web/src/content/fallbackArchitectureV3/resolver/retiredCompositions.mjs";

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  if (!await isContentAdminAuthorized(req)) {
    sendAdminJson(res, 401, { ok: false, error: "Unauthorized." });
    return;
  }
  if (req.method !== "GET") {
    sendAdminMethodNotAllowed(res, ["GET"]);
    return;
  }

  try {
    const requestUrl = new URL(req.url ?? "/api/admin/package-source", "http://localhost");
    const key = requestUrl.searchParams.get("contentKey");
    if (!key || requestUrl.searchParams.getAll("contentKey").length !== 1 || requestUrl.searchParams.has("contentKeys")) {
      throw new AdminHttpError(400, "A single contentKey is required for package source lookup.");
    }
    const { servingPackageRecords } = await import("../_lib/serving-package-records.js");
    sendAdminJson(res, 200, {
      ok: true,
      packageSource: isRetiredCompositionKey(key) ? null : servingPackageRecords.get(key) ?? null
    });
  } catch (error) {
    sendAdminJson(res, adminErrorStatus(error), {
      ok: false,
      error: adminErrorMessage(error, "Could not load the packaged source.")
    });
  }
}
