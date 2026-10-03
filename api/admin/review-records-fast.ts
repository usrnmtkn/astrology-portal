import type { IncomingMessage, ServerResponse } from "node:http";
import { URL } from "node:url";
import { requireContentAdmin } from "../_lib/admin-auth.js";
import { sendAdminMethodNotAllowed } from "../_lib/admin-http.js";
import { sendSupplementalReviewRecords } from "../_lib/review-records-bootstrap.js";

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
  if (!await requireContentAdmin(req, res)) return;

  if (req.method !== "GET") {
    sendAdminMethodNotAllowed(res, ["GET"]);
    return;
  }

  const requestUrl = new URL(req.url ?? "/api/admin/review-records", "http://localhost");
  if (sendSupplementalReviewRecords(requestUrl, res)) return;

  const { default: reviewRecordsHandler } = await import("./review-records.js");
  await reviewRecordsHandler(req, res);
}
