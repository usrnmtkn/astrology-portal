import type { LocationInput } from "../types";
import { withTimeZone, zonedDateTimeToUtc } from "./timezones";
import { liveSkyReference, skyCivilDate } from "./skyClock";

export const defaultLocation: LocationInput = {
  label: "New York City, NY",
  latitude: 40.7128,
  longitude: -74.006,
  timeZone: "America/New_York"
};

export const selectedLocationStorageKey = "tldrastro:selectedLocation";

export function isLocationInput(value: unknown): value is LocationInput {
  if (!value || typeof value !== "object") {
    return false;
  }

  const location = value as Partial<LocationInput>;

  return (
    typeof location.label === "string" &&
    typeof location.latitude === "number" &&
    typeof location.longitude === "number"
  );
}

export function dateInputValue(date: Date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

export function dateFromInput(value: string) {
  return new Date(`${value}T12:00:00`);
}

export function isDateInputValue(value: string | null): value is string {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/u.test(value)) {
    return false;
  }

  const parsed = dateFromInput(value);
  return !Number.isNaN(parsed.getTime()) && dateInputValue(parsed) === value;
}

export function transitDateFromUrl() {
  try {
    const value = new URL(window.location.href).searchParams.get("date");
    return isDateInputValue(value) ? value : null;
  } catch {
    return null;
  }
}

export function getInitialTransitDate() {
  return transitDateFromUrl() ?? skyCivilDate(getInitialLocation().location.timeZone);
}

export function skyDateTimeFromInput(value: string, location: LocationInput, live = false, now: Date = new Date()) {
  const resolvedLocation = withTimeZone(location);
  const current = live && liveSkyReference(value, resolvedLocation.timeZone, now);
  if (current) return current;
  // Other dates and editorial calculations retain the local-noon anchor.
  return zonedDateTimeToUtc(value, "12:00 PM", resolvedLocation.timeZone);
}

export function getInitialLocation() {
  try {
    const savedLocation = window.localStorage.getItem(selectedLocationStorageKey);

    if (!savedLocation) {
      return {
        location: defaultLocation,
        hasSavedLocation: false
      };
    }

    const parsedLocation = JSON.parse(savedLocation) as unknown;

    if (isLocationInput(parsedLocation)) {
      return {
        location: withTimeZone(parsedLocation),
        hasSavedLocation: true
      };
    }

    return {
      location: defaultLocation,
      hasSavedLocation: false
    };
  } catch {
    return {
      location: defaultLocation,
      hasSavedLocation: false
    };
  }
}
