import type { IncomingMessage, ServerResponse } from "node:http";
import {
  getLunarCalendarMonth,
  getLunarCalendarWeek,
  getLunarCalendarRangeEvents,
  type LunarCalendarDetailLevel
} from "../apps/web/src/services/ephemeris.js";
import { zonedDateTimeToUtc } from "../apps/web/src/services/timezones.js";
import type { LocationInput } from "../apps/web/src/types.js";

type CalendarViewMode = "week" | "month";

function sendJson(res: ServerResponse, status: number, body: unknown) {
  res.statusCode = status;
  res.setHeader("content-type", "application/json");
  res.setHeader("cache-control", "private, max-age=300, stale-while-revalidate=3600");
  res.end(JSON.stringify(body));
}

function numberParam(url: URL, key: string) {
  const value = url.searchParams.get(key);
  const numberValue = value == null ? NaN : Number(value);

  return Number.isFinite(numberValue) ? numberValue : null;
}

function stringParam(url: URL, key: string) {
  const value = url.searchParams.get(key)?.trim();

  return value || null;
}

function parseMode(value: string | null): CalendarViewMode {
  return value === "month" ? "month" : "week";
}

function parseDetail(value: string | null): LunarCalendarDetailLevel {
  return value === "full" ? "full" : "basic";
}

function parseAnchor(value: string | null, timeZone: string) {
  if (!value) return new Date();

  try {
    // Calendar dates are civil dates in the selected location. Parsing the
    // value as server-local or UTC midnight can move it to the previous day in
    // western time zones and make a requested week return the prior week.
    return zonedDateTimeToUtc(value, "12:00 PM", timeZone);
  } catch {
    return new Date();
  }
}

function parseLocation(url: URL): LocationInput {
  const latitude = numberParam(url, "lat");
  const longitude = numberParam(url, "lon");

  if (latitude == null || longitude == null) {
    throw new Error("Calendar API requires lat and lon query parameters.");
  }

  return {
    label: stringParam(url, "label") ?? "Selected location",
    latitude,
    longitude,
    timeZone: stringParam(url, "timeZone") ?? undefined
  };
}

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  if (req.method !== "GET") {
    sendJson(res, 405, { ok: false, error: "Use GET." });
    return;
  }

  try {
    const requestUrl = new URL(req.url ?? "/api/calendar", "http://localhost");
    if (requestUrl.searchParams.get("mode") === "range") {
      const location = parseLocation(requestUrl);
      const start = new Date(requestUrl.searchParams.get("start") ?? "");
      const end = new Date(requestUrl.searchParams.get("end") ?? "");
      const duration = end.getTime() - start.getTime();
      if (!Number.isFinite(duration) || duration <= 0 || duration > 40 * 86_400_000) {
        throw new Error("Calendar event range must span between zero and 40 days.");
      }
      if (Math.abs(location.latitude) > 90 || Math.abs(location.longitude) > 180) {
        throw new Error("Calendar API requires valid latitude and longitude.");
      }
      const events = await getLunarCalendarRangeEvents(location, start, end);
      sendJson(res, 200, { ok: true, mode: "range", start: start.toISOString(), end: end.toISOString(), events });
      return;
    }
    const mode = parseMode(requestUrl.searchParams.get("mode"));
    const detail = parseDetail(requestUrl.searchParams.get("detail"));
    const location = parseLocation(requestUrl);
    const anchor = parseAnchor(requestUrl.searchParams.get("date"), location.timeZone ?? "UTC");
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
    sendJson(res, 400, {
      ok: false,
      error: error instanceof Error ? error.message : "Calendar data could not load."
    });
  }
}
