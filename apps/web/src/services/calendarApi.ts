import type { LocationInput } from "../types";
import type {
  LunarCalendarDetailLevel,
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

export async function getLunarCalendarFromApi(
  location: LocationInput,
  mode: CalendarApiMode,
  anchor: Date,
  detail: LunarCalendarDetailLevel
) {
  const requestedDate = dateParam(anchor, location.timeZone);
  const params = new URLSearchParams({
    mode,
    detail,
    date: requestedDate,
    lat: String(location.latitude),
    lon: String(location.longitude),
    label: location.label
  });

  if (location.timeZone) {
    params.set("timeZone", location.timeZone);
  }

  const response = await fetch(`/api/calendar?${params}`, {
    headers: {
      Accept: "application/json"
    }
  });
  const contentType = response.headers.get("content-type") ?? "";

  if (!response.ok || !contentType.includes("application/json")) {
    throw new Error(`Calendar API unavailable: ${response.status}`);
  }

  const payload = await response.json() as CalendarApiResponse;

  if (!payload.ok || !payload.calendar) {
    throw new Error(payload.error ?? "Calendar API returned no calendar.");
  }

  if (mode === "week" && !payload.calendar.days.some((day) => day.dateKey === requestedDate)) {
    throw new Error("Calendar API returned the wrong week.");
  }

  return payload.calendar;
}
