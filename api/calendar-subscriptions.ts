import { randomBytes } from "node:crypto";
import type { IncomingMessage, ServerResponse } from "node:http";
import { loadLocalWebEnv } from "./_lib/local-env.js";
import { AdminHttpError, readAdminJsonBody, sendAdminJson, adminErrorStatus } from "./_lib/admin-http.js";
import { calendarStorage, hashCalendarToken, parseCalendarOptions, validCalendarToken } from "./_lib/calendar-subscriptions.js";
loadLocalWebEnv();
export default async function handler(req: IncomingMessage, res: ServerResponse) {
  res.setHeader("Referrer-Policy", "no-referrer");
  if (!["POST", "PATCH"].includes(req.method ?? "")) { res.setHeader("Allow", "POST, PATCH"); return sendAdminJson(res, 405, { ok: false, error: "Use POST or PATCH." }); }
  if (req.headers["sec-fetch-site"] === "cross-site") return sendAdminJson(res, 403, { ok: false, error: "Open the calendar website to create a subscription." });
  try {
    const body = await readAdminJsonBody<Record<string, unknown>>(req, 4096);
    const options = parseCalendarOptions(body);
    const fields = { include: options.include, reminder: options.reminder, time_zone: options.timeZone };
    if (req.method === "POST") {
      const token = randomBytes(32).toString("base64url"), manageToken = randomBytes(32).toString("base64url");
      const [row] = await calendarStorage("calendar_subscriptions", {}, "POST", { ...fields, token_hash: hashCalendarToken(token), manage_token_hash: hashCalendarToken(manageToken) });
      if (!row?.updated_at) throw new AdminHttpError(503, "The subscription could not be confirmed.");
      return sendAdminJson(res, 201, { ok: true, subscription: { token, manageToken, updatedAt: row.updated_at } });
    }
    if (!validCalendarToken(body.token) || !validCalendarToken(body.manageToken) || typeof body.expectedUpdatedAt !== "string" || !Number.isFinite(Date.parse(body.expectedUpdatedAt))) throw new AdminHttpError(400, "The saved subscription and its current version are required.");
    const [row] = await calendarStorage("calendar_subscriptions", { token_hash: `eq.${hashCalendarToken(body.token)}`, manage_token_hash: `eq.${hashCalendarToken(body.manageToken)}`, updated_at: `eq.${body.expectedUpdatedAt}`, revoked_at: "is.null" }, "PATCH", fields);
    if (!row) throw new AdminHttpError(409, "This subscription changed or is unavailable. Reload the calendar before trying again.");
    return sendAdminJson(res, 200, { ok: true, subscription: { updatedAt: row.updated_at } });
  } catch (error) { return sendAdminJson(res, adminErrorStatus(error), { ok: false, error: error instanceof AdminHttpError ? error.message : "Your calendar link could not be saved. Please try again." }); }
}
