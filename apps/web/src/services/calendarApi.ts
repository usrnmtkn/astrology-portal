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

function dateParam(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

export async function getLunarCalendarFromApi(
  location: LocationInput,
  mode: CalendarApiMode,
  anchor: Date,
  detail: LunarCalendarDetailLevel
) {
  const params = new URLSearchParams({
    mode,
    detail,
    date: dateParam(anchor),
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

  return payload.calendar;
}
