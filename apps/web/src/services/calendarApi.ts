import type { LocationInput } from "../types";
import { withRequestDeadline } from "./requestDeadline";
import type {
  LunarCalendarDetailLevel,
  LunarCalendarEvent,
  LunarCalendarMonth
} from "./ephemeris";

type CalendarApiMode = "week" | "month";

type CalendarApiResponse = {
  ok: boolean;
  calendar?: LunarCalendarMonth;
  error?: string;
};

function dateParam(date: Date, timeZone?: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    ...(timeZone ? { timeZone } : {}),
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(date);
  const valueFor = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value ?? "";

  return `${valueFor("year")}-${valueFor("month")}-${valueFor("day")}`;
}

async function readCalendarApi(params: URLSearchParams, signal: AbortSignal) {
  const response = await fetch(`/api/calendar?${params}`, { signal, headers: { Accept: "application/json" } });
  if (!response.ok || !response.headers.get("content-type")?.includes("application/json")) {
    throw new Error(`Calendar API unavailable: ${response.status}`);
  }
  return response.json();
}

export async function getLunarCalendarFromApi(
  location: LocationInput,
  mode: CalendarApiMode,
  anchor: Date,
  detail: LunarCalendarDetailLevel
) {
  return withRequestDeadline(async signal => {
    const requestedDate = dateParam(anchor, location.timeZone);
    const params = new URLSearchParams({
      mode,
      detail,
      factsVersion: "calendar-ingresses-v4",
      date: requestedDate,
      lat: String(location.latitude),
      lon: String(location.longitude),
      label: location.label
    });

    if (location.timeZone) {
      params.set("timeZone", location.timeZone);
    }

    const payload = await readCalendarApi(params, signal) as CalendarApiResponse;

    if (!payload.ok || !payload.calendar) {
      throw new Error(payload.error ?? "Calendar API returned no calendar.");
    }

    if (mode === "week" && !payload.calendar.days.some((day) => day.dateKey === requestedDate)) {
      throw new Error("Calendar API returned the wrong week.");
    }

    return payload.calendar;
  }, { timeoutMs: 2_500 });
}

// Seasonal milestones use the same server calculation as the local fallback,
// without making every healthy Calendar visit download the ephemeris engine.
const pendingRanges = new Map<string, Promise<LunarCalendarEvent[]>>();
export function getLunarCalendarRangeEventsFromApi(location: LocationInput, start: Date, end: Date) {
  const params = new URLSearchParams({ mode: "range", start: start.toISOString(), end: end.toISOString(),
    lat: String(location.latitude), lon: String(location.longitude), label: location.label,
    timeZone: location.timeZone || Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC" });
  const key = params.toString();
  const pending = pendingRanges.get(key);
  if (pending) return pending;
  // A background season request can queue behind the cold reader's downloads.
  // Use the shared bounded reader deadline before starting the larger fallback.
  const request = withRequestDeadline(async signal => {
    const payload = await readCalendarApi(params, signal);
    if (!payload.ok || payload.mode !== "range" || payload.start !== start.toISOString()
      || payload.end !== end.toISOString() || !Array.isArray(payload.events)
      || !payload.events.every((event: unknown) => {
        if (!event || typeof event !== "object") return false;
        const value = event as Partial<LunarCalendarEvent>;
        return (value.type === "lunation" || value.type === "station")
          && typeof value.startsAt === "string" && Number.isFinite(Date.parse(value.startsAt))
          && typeof value.title === "string" && typeof value.id === "string" && typeof value.dateKey === "string";
      })) {
      throw new Error("Calendar API returned the wrong event range.");
    }
    return payload.events as LunarCalendarEvent[];
  }).finally(() => {
    if (pendingRanges.get(key) === request) pendingRanges.delete(key);
  });
  pendingRanges.set(key, request);
  return request;
}
