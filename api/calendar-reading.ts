import type { IncomingMessage, ServerResponse } from "node:http";
import { loadLocalWebEnv } from "./_lib/local-env.js";
import { buildCalendarFeedEntries } from "./_lib/calendar-feed.js";
import { calendarFeedCategories } from "../apps/web/src/features/calendar/calendarSubscription.js";
import type { CalendarSubscriptionReading } from "../apps/web/src/features/calendar/calendarFeedPreview.js";
loadLocalWebEnv();

/** Public published readings only. Subscription and management tokens never enter app links. */
export default async function handler(req: IncomingMessage, res: ServerResponse) {
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("X-Content-Type-Options", "nosniff");
  const send = (status: number, payload: unknown) => { res.statusCode = status; res.end(JSON.stringify(payload)); };
  if (req.method !== "GET") { res.setHeader("Allow", "GET"); return send(405, { error: "Method not allowed" }); }
  const url = new URL(req.url ?? "/", "http://localhost");
  const id = url.searchParams.get("id") ?? "", date = url.searchParams.get("date") ?? "";
  const timeZone = url.searchParams.get("timeZone") ?? "UTC";
  const instant = new Date(`${date}T12:00:00Z`);
  if (!/^(?:week|event|ingress|lunation|station|aspect)-[a-zA-Z0-9:.\-]{1,180}$/u.test(id)
    || !/^\d{4}-\d{2}-\d{2}$/u.test(date) || !Number.isFinite(instant.getTime())
    || instant.toISOString().slice(0, 10) !== date || instant.getUTCFullYear() < 2020 || instant.getUTCFullYear() > 2100) {
    return send(400, { error: "Invalid calendar event link" });
  }
  try { new Intl.DateTimeFormat("en", { timeZone }); } catch { return send(400, { error: "Invalid time zone" }); }
  try {
    const origin = process.env.CALENDAR_PUBLIC_ORIGIN || "https://tldrastro.vercel.app";
    const [event] = await buildCalendarFeedEntries({ include: [...calendarFeedCategories], reminder: "None", timeZone }, origin, instant, id);
    if (!event) return send(404, { error: "This calendar event is not available." });
    const reading: CalendarSubscriptionReading = {
      id: event.readingId, title: event.title, body: event.description, start: event.start, end: event.end,
      allDay: event.allDay, url: event.url, sourceUrl: event.sourceUrl, cancelled: event.cancelled
    };
    return send(200, { reading });
  } catch { return send(503, { error: "This reading could not load. Please try again." }); }
}
