import type { ServerResponse } from "node:http";
import type { URL } from "node:url";
import { sendAdminJson } from "./admin-http.js";

/** Saved inventory already supplies the queue. Only explicit review windows
 * need the legacy sky calculation. Apply this to both physical API routes. */
export function sendSupplementalReviewRecords(requestUrl: URL, res: ServerResponse) {
  const surface = requestUrl.searchParams.get("surface") ?? "upcomingAspects";
  if (surface !== "upcomingAspects" || requestUrl.searchParams.get("startDate") || requestUrl.searchParams.get("endDate")) return false;

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
  return true;
}
