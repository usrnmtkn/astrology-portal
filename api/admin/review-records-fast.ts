import type { IncomingMessage, ServerResponse } from "node:http";
import { URL } from "node:url";
import { isContentAdminAuthorized } from "../_lib/admin-auth.js";
import { sendAdminJson, sendAdminMethodNotAllowed } from "../_lib/admin-http.js";
import reviewRecordsHandler from "./review-records.js";

/**
 * Content Studio loads its saved content inventory separately and already builds
 * the Review Queue from those rows. The legacy supplemental review request used
 * to calculate a 30-day sky window on every Studio page load, which could exceed
 * the browser's 10-second read timeout and show a misleading
 * "Partial load: review records failed" warning even though saved content loaded.
 *
 * Keep explicit/date-scoped review requests fully functional, but make the
 * default supplemental upcoming-aspects request cheap. Dedicated upcoming-sky
 * inventory tools can request a date window when calculated candidates are needed.
 */
export default async function handler(req: IncomingMessage, res: ServerResponse) {
  if (!await isContentAdminAuthorized(req)) {
    sendAdminJson(res, 401, { ok: false, error: "Unauthorized." });
    return;
  }

  if (req.method !== "GET") {
    sendAdminMethodNotAllowed(res, ["GET"]);
    return;
  }

  const requestUrl = new URL(req.url ?? "/api/admin/review-records", "http://localhost");
  const surface = requestUrl.searchParams.get("surface") ?? "upcomingAspects";
  const hasExplicitDateWindow = Boolean(
    requestUrl.searchParams.get("startDate") || requestUrl.searchParams.get("endDate")
  );

  if (surface === "upcomingAspects" && !hasExplicitDateWindow) {
    const today = new Date().toISOString().slice(0, 10);
    sendAdminJson(res, 200, {
      ok: true,
      surface: "upcomingAspects",
      startDate: today,
      endDate: today,
      prompt: null,
      warnings: [],
      rows: [],
      counts: { total: 0, DRAFT: 0, REVIEWED: 0, LIVE: 0, ARCHIVED: 0, ERROR: 0 },
      supplementalOnly: true
    });
    return;
  }

  await reviewRecordsHandler(req, res);
}
