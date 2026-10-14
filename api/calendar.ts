import type { IncomingMessage, ServerResponse } from "node:http";
import {
  getLunarCalendarMonth,
  getLunarCalendarWeek,
  getLunarCalendarRangeEvents,
  type LunarCalendarDetailLevel
} from "../apps/web/src/services/ephemeris.js";
import { zonedDateTimeToUtc } from "../apps/web/src/services/timezones.js";
import type { LocationInput } from "../apps/web/src/types.js";
import { parseCalculationDate } from "./_lib/calculation-date.js";

type CalendarViewMode = "week" | "month";

function sendJson(res: ServerResponse, status: number, body: unknown) {
  res.statusCode = status;
  res.setHeader("content-type", "application/json");
  res.setHeader("cache-control", status === 200 ? "private, max-age=300, stale-while-revalidate=3600" : "no-store");
  res.end(JSON.stringify(body));
}

function numberParam(url: URL, key: string) {
  const value = url.searchParams.get(key);
  const numberValue = value == null || !value.trim() ? NaN : Number(value);

  return Number.isFinite(numberValue) ? numberValue : null;
}

function stringParam(url: URL, key: string) {
  const value = url.searchParams.get(key)?.trim();

  return value || null;
}

function parseMode(value: string | null): CalendarViewMode {
  if (value !== null && value !== "week" && value !== "month") throw new Error("Invalid Calendar mode.");
  return value === "month" ? "month" : "week";
}

function parseDetail(value: string | null): LunarCalendarDetailLevel {
  if (value !== null && value !== "basic" && value !== "full") throw new Error("Invalid Calendar detail.");
  return value === "full" ? "full" : "basic";
}

function parseAnchor(value: string | null, timeZone: string) {
  if (value === null) return new Date();
  // Date construction normalizes impossible days (for example February 30).
  // Reject those and malformed values instead of silently reading another day.
  const checked = new Date(`${value}T12:00:00Z`);
  if (!/^\d{4}-\d{2}-\d{2}$/u.test(value) || !Number.isFinite(checked.getTime())
    || checked.toISOString().slice(0, 10) !== value) {
    throw new Error("Calendar date must be a valid YYYY-MM-DD date.");
  }
  // Anchor in the selected location so western time zones retain the civil day.
  return zonedDateTimeToUtc(value, "12:00 PM", timeZone);
}

function parseLocation(url: URL): LocationInput {
  const latitude = numberParam(url, "lat");
  const longitude = numberParam(url, "lon");

  if (latitude == null || longitude == null || Math.abs(latitude) > 90 || Math.abs(longitude) > 180) {
    throw new Error("Calendar API requires valid latitude and longitude.");
  }
  const timeZone = stringParam(url, "timeZone") ?? "UTC";
  new Intl.DateTimeFormat("en", { timeZone }).format(new Date());

  return {
    label: stringParam(url, "label") ?? "Selected location",
    latitude,
    longitude,
    timeZone
  };
}

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  if (req.method !== "GET") {
    res.setHeader("allow", "GET");
    sendJson(res, 405, { ok: false, error: "Use GET." });
    return;
  }

  let calculating = false;
  try {
    const requestUrl = new URL(req.url ?? "/api/calendar", "http://localhost");
    if (requestUrl.searchParams.get("mode") === "range") {
      const location = parseLocation(requestUrl);
      const start = parseCalculationDate(requestUrl.searchParams.get("start"));
      const end = parseCalculationDate(requestUrl.searchParams.get("end"));
      const duration = end.getTime() - start.getTime();
      if (!Number.isFinite(duration) || duration <= 0 || duration > 40 * 86_400_000) {
        throw new Error("Calendar event range must span between zero and 40 days.");
      }
      calculating = true;
      const events = await getLunarCalendarRangeEvents(location, start, end);
      sendJson(res, 200, { ok: true, mode: "range", start: start.toISOString(), end: end.toISOString(), events });
      return;
    }
    const mode = parseMode(requestUrl.searchParams.get("mode"));
    const detail = parseDetail(requestUrl.searchParams.get("detail"));
    const location = parseLocation(requestUrl);
    const anchor = parseAnchor(requestUrl.searchParams.get("date"), location.timeZone ?? "UTC");
    calculating = true;
    const calendar = mode === "week"
      ? await getLunarCalendarWeek(location, anchor, { detail })
      : await getLunarCalendarMonth(location, anchor, { detail });

    sendJson(res, 200, {
      ok: true,
      mode,
      detail,
      calendar
    });
  } catch (error) {
    sendJson(res, calculating ? 503 : 400, {
      ok: false,
      error: calculating ? "Calendar calculation unavailable." : error instanceof Error ? error.message : "Invalid Calendar inputs."
    });
  }
}
