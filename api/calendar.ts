import type { IncomingMessage, ServerResponse } from "node:http";
import {
  getLunarCalendarMonth,
  getLunarCalendarWeek,
  type LunarCalendarDetailLevel
} from "../apps/web/src/services/ephemeris.js";
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

function parseAnchor(value: string | null) {
  if (!value) return new Date();

  const date = new Date(`${value}T00:00:00`);

  return Number.isNaN(date.getTime()) ? new Date() : date;
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
    const mode = parseMode(requestUrl.searchParams.get("mode"));
    const detail = parseDetail(requestUrl.searchParams.get("detail"));
    const anchor = parseAnchor(requestUrl.searchParams.get("date"));
    const location = parseLocation(requestUrl);
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
