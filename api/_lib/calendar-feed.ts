import { createHash } from "node:crypto";
import { getCalendarSubscriptionEvents, type LunarCalendarEvent } from "../../apps/web/src/services/ephemeris.js";
import { calendarEventGeneratedContentKeys, calendarSkyV4LunationContentKey } from "../../apps/web/src/features/calendar/calendarContentKeys.js";
import { isHandoffKeyEvent } from "../../apps/web/src/features/calendar/calendarHandoff.js";
import { calendarLocalDateKey } from "../../apps/web/src/features/calendar/calendarPhaseLabel.js";
import { isReaderServableGeneratedContentRow, isGeneratedContentReaderBoundaryAllowed } from "../../apps/web/src/content/generatedContentEligibility.js";
import { publicationAllowsContent, type ContentPublication } from "../../apps/web/src/content/contentPublicationState.js";
import { zonedDateTimeToUtc } from "../../apps/web/src/services/timezones.js";
import type { CalendarFeedCategory, CalendarFeedEvent, CalendarFeedEventRecord, CalendarSubscriptionOptions } from "../../apps/web/src/features/calendar/calendarSubscription.js";
import { allCalendarRows } from "./calendar-subscriptions.js";

export type FeedEntry = CalendarFeedEvent & { uid: string; modified: string; sequence: number; cancelled?: boolean };
const factCache = new Map<number, Promise<LunarCalendarEvent[]>>();
async function yearFacts(year: number) {
  let value = factCache.get(year);
  if (!value) {
    value = getCalendarSubscriptionEvents(year); factCache.set(year, value);
    void value.catch(() => factCache.delete(year));
    if (factCache.size > 3) factCache.delete(factCache.keys().next().value!);
  }
  return value;
}
export function eventFeedCategory(event: LunarCalendarEvent): CalendarFeedCategory {
  if (event.type === "lunation") return "lunations";
  if (event.type === "station") return "retrogrades";
  if (event.type === "ingress") return event.planet === "Moon" ? "moon-signs" : event.planet === "Sun" ? "seasons" : "ingresses";
  return "aspects";
}
function contentKeys(event: LunarCalendarEvent) {
  return [...new Set([calendarSkyV4LunationContentKey(event), ...calendarEventGeneratedContentKeys(event)]
    .filter((key): key is string => Boolean(key) && !/^(fallback-|ms\/)/u.test(key!)))];
}
export function selectCalendarFeedCopy(keys: string[], date: string, rows: Record<string, any>[], publications: ReadonlyMap<string, ContentPublication>) {
  for (const key of keys) {
    const candidates = rows.filter(row => row.content_key === key && (!row.target_date || row.target_date === date))
      .sort((a, b) => Number(Boolean(b.target_date)) - Number(Boolean(a.target_date)) || b.updated_at.localeCompare(a.updated_at));
    for (const row of candidates) {
      // Only a complete published reader body crosses into the feed. Authoring
      // objects, package drafts, templates, and private metadata never do.
      if (row.status !== "LIVE" || row.lane !== "serving" || row.review_state || row.sections?.packageDraft || row.sections?.packageRecord
        || typeof row.body !== "string" || !row.body.trim() || /\{\{[^]*?\}\}/u.test(row.body)
        || !isReaderServableGeneratedContentRow(row) || !isGeneratedContentReaderBoundaryAllowed(row)
        || !publicationAllowsContent(key, row.id, row.updated_at, row.target_date, publications)) continue;
      return { body: row.body, updatedAt: row.updated_at };
    }
  }
  return null;
}
async function publishedCopy(events: LunarCalendarEvent[]) {
  const keys = [...new Set(events.flatMap(contentKeys))];
  const rows: Record<string, any>[] = [], publications = new Map<string, ContentPublication>();
  // Mark the request-scoped ledger authoritative without mutating browser globals.
  publications.set("__content-publication-ledger/v1", {} as ContentPublication);
  const groups = Array.from({ length: Math.ceil(keys.length / 60) }, (_, index) => keys.slice(index * 60, index * 60 + 60));
  for (let index = 0; index < groups.length; index += 4) {
    await Promise.all(groups.slice(index, index + 4).map(async group => {
      const filter = `in.(${group.map(key => `"${key.replace(/["\\]/gu, "")}"`).join(",")})`;
      const [copy, ledger] = await Promise.all([
        allCalendarRows("generated_interpretations", { select: "id,content_key,target_date,status,lane,review_state,updated_at,body,summary,headline,sections,source_snapshot,facts,provider,flags,event_type,surface", content_key: filter, status: "eq.LIVE", lane: "eq.serving", order: "id.asc" }),
        allCalendarRows<ContentPublication>("content_publications", { select: "*", content_key: filter, order: "content_key.asc" })
      ]);
      rows.push(...copy); ledger.forEach(record => publications.set(record.content_key, record));
    }));
  }
  return { rows, publications };
}
const factsModified = "2026-09-22T00:00:00Z";
export async function buildCalendarFeedEntries(options: CalendarSubscriptionOptions, origin: string, now = new Date()): Promise<FeedEntry[]> {
  const year = now.getUTCFullYear();
  const facts = (await Promise.all([yearFacts(year), yearFacts(year + 1)])).flat()
    .map(event => ({ ...event, dateKey: calendarLocalDateKey(event.startsAt, options.timeZone) })).filter(event => {
    if (event.type === "lunation" && !event.primary) return false;
    const category = eventFeedCategory(event);
    return options.include.includes(category) || options.include.includes("key") && isHandoffKeyEvent(event, event.dateKey);
  });
  const [copy, custom] = await Promise.all([
    publishedCopy(facts),
    allCalendarRows<CalendarFeedEventRecord>("calendar_feed_events", { select: "id,published,cancelled,revision,published_at", published: "not.is.null", order: "id.asc" })
  ]);
  const entries: FeedEntry[] = facts.map(event => {
    const text = selectCalendarFeedCopy(contentKeys(event), event.dateKey, copy.rows, copy.publications);
    return { uid: `astro-${createHash("sha256").update(event.id).digest("hex")}@tldrastro`, title: event.title,
      description: text?.body ?? "", start: event.startsAt, end: event.endsAt && event.endsAt > event.startsAt ? event.endsAt : new Date(Date.parse(event.startsAt) + 60000).toISOString(),
      allDay: false, category: eventFeedCategory(event), url: new URL(`/#calendar?date=${event.dateKey}`, origin).href,
      modified: text?.updatedAt ?? factsModified, sequence: text ? Math.max(1, Math.floor((Date.parse(text.updatedAt) - Date.UTC(2020, 0, 1)) / 1000)) : 0 };
  });
  // Weekly entries link to the current Calendar week. Dated owner-published
  // forecasts can be added in Subscription events with the weekly category.
  if (options.include.includes("weekly")) {
    for (let day = new Date(Date.UTC(year, 0, 1)); day.getUTCFullYear() <= year + 1; day = new Date(day.getTime() + 86400000)) {
      if (day.getUTCDay() !== 1) continue;
      const date = day.toISOString().slice(0, 10), start = zonedDateTimeToUtc(date, "9:00 AM", options.timeZone);
      entries.push({ uid: `week-${date}@tldrastro`, title: "Weekly emotional forecast", description: "", start: start.toISOString(), end: new Date(start.getTime() + 60000).toISOString(), allDay: false,
        category: "weekly", url: new URL(`/#calendar?date=${date}&view=weekly`, origin).href, modified: factsModified, sequence: 0 });
    }
  }
  for (const row of custom) {
    if (!row.published || !options.include.includes(row.published.category)) continue;
    entries.push({ ...row.published, uid: `event-${row.id}@tldrastro`, modified: row.published_at!, sequence: row.revision, cancelled: row.cancelled });
  }
  return entries.sort((a, b) => a.start.localeCompare(b.start) || a.uid.localeCompare(b.uid));
}
export function escapeCalendarText(value: string) { return value.replace(/\\/gu, "\\\\").replace(/\r\n|\r|\n/gu, "\\n").replace(/;/gu, "\\;").replace(/,/gu, "\\,").replace(/[\x00-\x08\x0b\x0c\x0e-\x1f]/gu, ""); }
export function foldCalendarLine(line: string) {
  const lines: string[] = []; let current = "", bytes = 0;
  for (const character of line) {
    const length = Buffer.byteLength(character, "utf8");
    if (bytes + length > 75) { lines.push(current); current = " "; bytes = 1; }
    current += character; bytes += length;
  }
  lines.push(current); return lines.join("\r\n");
}
const calendarDateTime = (value: string) => new Date(value).toISOString().replace(/[-:]/gu, "").replace(/\.\d{3}Z$/u, "Z");
export function serializeCalendarFeed(entries: FeedEntry[], options: CalendarSubscriptionOptions) {
  const lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//TLDR Astro//Calendar//EN", "CALSCALE:GREGORIAN", "X-WR-CALNAME:TLDR Astro", `X-WR-TIMEZONE:${escapeCalendarText(options.timeZone)}`, "REFRESH-INTERVAL;VALUE=DURATION:PT1H", "X-PUBLISHED-TTL:PT1H"];
  for (const event of entries) {
    lines.push("BEGIN:VEVENT", `UID:${event.uid}`, `DTSTAMP:${calendarDateTime(event.modified)}`, `LAST-MODIFIED:${calendarDateTime(event.modified)}`, `SEQUENCE:${event.sequence}`,
      event.allDay ? `DTSTART;VALUE=DATE:${event.start.replace(/-/gu, "")}` : `DTSTART:${calendarDateTime(event.start)}`,
      event.allDay ? `DTEND;VALUE=DATE:${event.end.replace(/-/gu, "")}` : `DTEND:${calendarDateTime(event.end)}`,
      `SUMMARY:${escapeCalendarText(event.title)}`, `DESCRIPTION:${escapeCalendarText(event.description)}`, `CATEGORIES:${escapeCalendarText(event.category)}`, "TRANSP:TRANSPARENT", `STATUS:${event.cancelled ? "CANCELLED" : "CONFIRMED"}`);
    if (event.url) lines.push(`URL:${event.url.replace(/[\r\n]/gu, "")}`);
    if (options.reminder !== "None" && !event.cancelled) lines.push("BEGIN:VALARM", "ACTION:DISPLAY", `TRIGGER:${options.reminder === "Day before" ? "-P1D" : "PT0S"}`, `DESCRIPTION:${escapeCalendarText(event.title)}`, "END:VALARM");
    lines.push("END:VEVENT");
  }
  lines.push("END:VCALENDAR");
  return `${lines.map(foldCalendarLine).join("\r\n")}\r\n`;
}
