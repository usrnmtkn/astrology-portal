import { randomUUID } from "node:crypto";
import type { IncomingMessage, ServerResponse } from "node:http";
import { loadLocalWebEnv } from "../_lib/local-env.js";
import { isContentAdminAuthorized } from "../_lib/admin-auth.js";
import { AdminHttpError, readAdminJsonBody, sendAdminJson, adminErrorStatus } from "../_lib/admin-http.js";
import { allCalendarRows, calendarStorage, parseCalendarEvent } from "../_lib/calendar-subscriptions.js";
import { readerCopyIssues } from "../../apps/web/src/content/editorialCopyBoundary.mjs";
import type { CalendarFeedEventRecord } from "../../apps/web/src/features/calendar/calendarSubscription.js";
loadLocalWebEnv();
export default async function handler(req: IncomingMessage, res: ServerResponse) {
  if (!await isContentAdminAuthorized(req)) return sendAdminJson(res, 401, { ok: false, error: "Unauthorized." });
  try {
    if (req.method === "GET") return sendAdminJson(res, 200, { ok: true, events: await allCalendarRows("calendar_feed_events", { select: "*", order: "id.asc" }) });
    if (!["POST", "PATCH"].includes(req.method ?? "")) { res.setHeader("Allow", "GET, POST, PATCH"); return sendAdminJson(res, 405, { ok: false, error: "Use GET, POST or PATCH." }); }
    const body = await readAdminJsonBody<Record<string, unknown>>(req);
    if (!["draft", "publish", "cancel"].includes(body.action as string)) throw new AdminHttpError(400, "Choose Save draft, Publish or Cancel event.");
    let current: CalendarFeedEventRecord | undefined;
    const query: Record<string, string> = {};
    if (req.method === "PATCH") {
      if (typeof body.id !== "string" || !/^[a-f\d-]{36}$/iu.test(body.id) || typeof body.expectedUpdatedAt !== "string" || !Number.isFinite(Date.parse(body.expectedUpdatedAt))) throw new AdminHttpError(400, "Reload the saved event before editing.");
      query.id = `eq.${body.id}`; query.updated_at = `eq.${body.expectedUpdatedAt}`;
      [current] = await calendarStorage<CalendarFeedEventRecord>("calendar_feed_events", query);
      if (!current) throw new AdminHttpError(409, "This event changed. Reload it before saving; your draft is still here.");
    }
    if (body.action === "cancel" && !current?.published) throw new AdminHttpError(400, "Only a published event can be cancelled.");
    const draft = body.action === "cancel" ? current!.draft : parseCalendarEvent(body.event);
    if (body.action === "publish" && (readerCopyIssues({ headline: draft.title, body: draft.description }).length || /\{\{[^]*?\}\}/u.test(draft.description))) throw new AdminHttpError(422, "Remove drafting notes and unresolved variables before publishing.");
    const fields = {
      ...(current ? {} : { id: randomUUID() }), draft,
      ...(body.action === "publish" ? { published: draft, cancelled: false, revision: (current?.revision ?? 0) + 1, published_at: new Date().toISOString() } : {}),
      ...(body.action === "cancel" ? { cancelled: true, revision: current!.revision + 1, published_at: new Date().toISOString() } : {})
    };
    const [event] = await calendarStorage("calendar_feed_events", query, req.method, fields);
    if (!event) throw new AdminHttpError(409, "This event changed. Reload it before saving; your draft is still here.");
    return sendAdminJson(res, req.method === "POST" ? 201 : 200, { ok: true, event });
  } catch (error) { return sendAdminJson(res, adminErrorStatus(error), { ok: false, error: error instanceof AdminHttpError ? error.message : "The event could not be saved. Your draft is still here." }); }
}
