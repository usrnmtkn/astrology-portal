import type { IncomingMessage, ServerResponse } from "node:http";
import { URL } from "node:url";
import { isContentAdminAuthorized } from "../_lib/admin-auth.js";
import { AdminHttpError, adminErrorMessage, adminErrorStatus, sendAdminJson, sendAdminMethodNotAllowed } from "../_lib/admin-http.js";
import { currentSkyFacts } from "../_lib/current-sky.js";
import { loadLocalWebEnv } from "../_lib/local-env.js";
import { skyArticleEditionFactsFromSnapshot } from "../_lib/sky-article-facts.js";

loadLocalWebEnv();

function normalizeToken(value: string) {
  return value.trim().toLowerCase().replace(/[_\s]+/gu, "-");
}

function validReferenceDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/u.test(value)) throw new AdminHttpError(400, "date must be YYYY-MM-DD.");
  const instant = new Date(`${value}T12:00:00.000Z`);
  if (Number.isNaN(instant.getTime()) || instant.toISOString().slice(0, 10) !== value) {
    throw new AdminHttpError(400, "date must be a valid YYYY-MM-DD date.");
  }
  return instant;
}

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
    const requestUrl = new URL(req.url ?? "/api/admin/sky-article-facts", "http://localhost");
    const planet = normalizeToken(requestUrl.searchParams.get("planet") ?? "");
    const referenceDate = requestUrl.searchParams.get("date") ?? new Date().toISOString().slice(0, 10);
    if (!planet) throw new AdminHttpError(400, "planet is required.");
    const referenceInstant = validReferenceDate(referenceDate);
    const snapshot = await currentSkyFacts(referenceInstant, { transitWindowPoints: [planet] });
    sendAdminJson(res, 200, { ok: true, facts: skyArticleEditionFactsFromSnapshot(snapshot, planet) });
  } catch (error) {
    sendAdminJson(res, adminErrorStatus(error), {
      ok: false,
      error: adminErrorMessage(error, "Unknown Sky article fact error.")
    });
  }
}
