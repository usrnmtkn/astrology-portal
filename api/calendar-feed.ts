import { createHash } from "node:crypto";
import type { IncomingMessage, ServerResponse } from "node:http";
import { loadLocalWebEnv } from "./_lib/local-env.js";
import { calendarStorage, hashCalendarToken, validCalendarToken, parseCalendarOptions } from "./_lib/calendar-subscriptions.js";
import { buildCalendarFeedEntries, serializeCalendarFeed } from "./_lib/calendar-feed.js";
loadLocalWebEnv();
export default async function handler(req: IncomingMessage, res: ServerResponse) {
  res.setHeader("Cache-Control", "private, no-cache"); res.setHeader("Referrer-Policy", "no-referrer");
  res.setHeader("X-Content-Type-Options", "nosniff"); res.setHeader("X-Robots-Tag", "noindex, nofollow");
  if (!["GET", "HEAD"].includes(req.method ?? "")) { res.setHeader("Allow", "GET, HEAD"); res.statusCode = 405; return res.end(); }
  const url = new URL(req.url ?? "/", "http://localhost");
  const token = url.pathname.match(/^\/feed\/([A-Za-z0-9_-]{43})\.ics$/u)?.[1] ?? url.searchParams.get("token");
  if (!validCalendarToken(token)) { res.statusCode = 404; return res.end(); }
  try {
    const [row] = await calendarStorage("calendar_subscriptions", { select: "include,reminder,time_zone,updated_at,revision", token_hash: `eq.${hashCalendarToken(token)}`, revoked_at: "is.null" });
    if (!row) { res.statusCode = 404; return res.end(); }
    const options = parseCalendarOptions({ ...row, timeZone: row.time_zone });
    // Event links use the deployed app origin, never a caller-controlled Host.
    const origin = process.env.CALENDAR_PUBLIC_ORIGIN || "https://tldrastro.vercel.app";
    const entries = (await buildCalendarFeedEntries(options, origin)).map(event => ({ ...event,
      sequence: event.sequence + row.revision,
      modified: Date.parse(row.updated_at) > Date.parse(event.modified) ? row.updated_at : event.modified
    }));
    const content = serializeCalendarFeed(entries, options);
    const etag = `"${createHash("sha256").update(content).digest("hex")}"`;
    res.setHeader("ETag", etag); res.setHeader("Content-Type", "text/calendar; charset=utf-8");
    res.setHeader("Content-Disposition", 'inline; filename="tldr-astro.ics"');
    if (req.headers["if-none-match"]?.split(/\s*,\s*/u).some(value => value.replace(/^W\//u, "") === etag || value === "*")) { res.statusCode = 304; return res.end(); }
    res.statusCode = 200; return res.end(req.method === "HEAD" ? undefined : content);
  } catch {
    res.statusCode = 503; res.setHeader("Cache-Control", "no-store"); res.setHeader("Retry-After", "60"); res.setHeader("Content-Type", "text/plain; charset=utf-8");
    return res.end(req.method === "HEAD" ? undefined : "Calendar temporarily unavailable. Please try again.");
  }
}
