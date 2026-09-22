import { createHash } from "node:crypto";
import { AdminHttpError, adminFetchJson, adminStorageRows } from "./admin-http.js";
import { calendarFeedCategories, calendarReminders, type CalendarSubscriptionOptions, type CalendarFeedEvent } from "../../apps/web/src/features/calendar/calendarSubscription.js";
export const hashCalendarToken = (token: string) => createHash("sha256").update(token).digest("hex");
export function validCalendarToken(token: unknown): token is string { return typeof token === "string" && /^[A-Za-z0-9_-]{43}$/.test(token); }
export function parseCalendarOptions(body: Record<string, unknown>): CalendarSubscriptionOptions {
  if (!Array.isArray(body.include) || !body.include.length || body.include.length > 8 || body.include.some(key => !calendarFeedCategories.includes(key))
    || !calendarReminders.includes(body.reminder as any) || typeof body.timeZone !== "string" || body.timeZone.length > 100) throw new AdminHttpError(400, "Choose calendar events, a reminder, and a valid time zone.");
  try { new Intl.DateTimeFormat("en", { timeZone: body.timeZone }); } catch { throw new AdminHttpError(400, "Choose a valid time zone."); }
  return { include: [...new Set(body.include)] as CalendarSubscriptionOptions["include"], reminder: body.reminder as CalendarSubscriptionOptions["reminder"], timeZone: body.timeZone };
}
export async function calendarStorage<T extends object = Record<string, any>>(table: string, query: Record<string, string> = {}, method = "GET", body?: unknown): Promise<T[]> {
  const base = (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "").replace(/\/$/u, "");
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!base || !key) throw new AdminHttpError(503, "Calendar storage is temporarily unavailable.");
  const response = await adminFetchJson(`${base}/rest/v1/${table}?${new URLSearchParams(query)}`, {
    method, headers: { apikey: key, authorization: `Bearer ${key}`, "content-type": "application/json", Prefer: "return=representation" },
    ...(body === undefined ? {} : { body: JSON.stringify(body) })
  });
  if (!response.ok) throw new AdminHttpError(503, "Calendar storage is temporarily unavailable. Please try again.");
  return adminStorageRows<T>(response.payload);
}
export async function allCalendarRows<T extends object = Record<string, any>>(table: string, query: Record<string, string>) {
  const rows: T[] = [];
  for (let offset = 0; offset < 20000; offset += 500) {
    const page = await calendarStorage<T>(table, { ...query, limit: "500", offset: String(offset) });
    rows.push(...page);
    if (page.length < 500) return rows;
  }
  throw new AdminHttpError(503, "The complete calendar could not be loaded.");
}
export function parseCalendarEvent(value: unknown): CalendarFeedEvent {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new AdminHttpError(400, "An event is required.");
  const event = value as CalendarFeedEvent;
  if (typeof event.title !== "string" || !event.title.trim() || event.title.length > 300 || /[\r\n\x00-\x1f]/u.test(event.title)
    || typeof event.description !== "string" || event.description.length > 100000 || typeof event.allDay !== "boolean"
    || !calendarFeedCategories.includes(event.category) || typeof event.url !== "string") throw new AdminHttpError(400, "Complete the title, description and category.");
  const datePattern = event.allDay ? /^\d{4}-\d{2}-\d{2}$/u : /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/u;
  if (!datePattern.test(event.start) || !datePattern.test(event.end) || !Number.isFinite(Date.parse(event.start)) || !Number.isFinite(Date.parse(event.end)) || Date.parse(event.end) <= Date.parse(event.start)) throw new AdminHttpError(400, "The event end must be after its start.");
  if ([event.start, event.end].some(value => new Date(value).toISOString().slice(0, 10) !== value.slice(0, 10))) throw new AdminHttpError(400, "Choose valid calendar dates.");
  if (event.url) {
    try { const url = new URL(event.url); if (url.protocol !== "https:" || url.username || url.password || event.url.length > 2000) throw new Error(); }
    catch { throw new AdminHttpError(400, "The event link must be an HTTPS URL."); }
  }
  return { title: event.title, description: event.description, start: event.start, end: event.end, allDay: event.allDay, category: event.category, url: event.url };
}
