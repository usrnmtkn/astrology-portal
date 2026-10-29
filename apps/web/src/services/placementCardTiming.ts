import type { PlanetPosition } from "../types";
import { localDateParts as eventCalendarParts } from "./skyAspectTiming";
import { isDisplayRetrograde } from "./astrologyDisplay";

export function dateFromDurationInput(value: string | Date, timeZone = "UTC") {
  // A date-only value already identifies the selected civil day; it is not a
  // UTC instant to shift into the preceding date in western time zones.
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) return new Date(`${value}T00:00:00Z`);
  const instant = new Date(value);
  if (Number.isNaN(instant.getTime())) return null;
  const parts = eventCalendarParts(instant, timeZone);
  return new Date(Date.UTC(Number(parts.year), Number(parts.month) - 1, Number(parts.day)));
}

export function dateOnly(value: string | Date) {
  const date = typeof value === "string" ? new Date(`${value.slice(0, 10)}T00:00:00Z`) : value;

  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
}

export function differenceInCalendarDays(start: Date, end: Date) {
  return Math.max(0, Math.floor((dateOnly(end) - dateOnly(start)) / 86_400_000));
}

function daysInUtcMonth(year: number, month: number) {
  return new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
}

function addCalendarMonths(start: Date, months: number) {
  const year = start.getUTCFullYear() + Math.floor((start.getUTCMonth() + months) / 12);
  const month = (start.getUTCMonth() + months) % 12;
  const normalizedMonth = month < 0 ? month + 12 : month;
  const normalizedYear = month < 0 ? year - 1 : year;
  const day = Math.min(start.getUTCDate(), daysInUtcMonth(normalizedYear, normalizedMonth));

  return new Date(Date.UTC(normalizedYear, normalizedMonth, day));
}

export function differenceInCalendarParts(startInput: string | Date, endInput: string | Date, timeZone = "UTC") {
  const start = dateFromDurationInput(startInput, timeZone);
  const end = dateFromDurationInput(endInput, timeZone);

  if (!start || !end || end.getTime() < start.getTime()) {
    return null;
  }

  let totalMonths = (end.getUTCFullYear() - start.getUTCFullYear()) * 12 + (end.getUTCMonth() - start.getUTCMonth());
  let monthAnchor = addCalendarMonths(start, totalMonths);

  if (monthAnchor.getTime() > end.getTime()) {
    totalMonths = Math.max(0, totalMonths - 1);
    monthAnchor = addCalendarMonths(start, totalMonths);
  }

  const days = differenceInCalendarDays(monthAnchor, end);

  return {
    totalDays: differenceInCalendarDays(start, end),
    years: Math.floor(totalMonths / 12),
    months: totalMonths % 12,
    days
  };
}

/** Sky and planetary cards count remaining civil days in the selected location. */
export function placementCardCountdownLabel(startInput: string | Date, endInput: string | Date, timeZone = "UTC") {
  const parts = differenceInCalendarParts(startInput, endInput, timeZone);
  if (!parts) return null;
  if (parts.totalDays < 1) return "Ends today";
  const [count, unit] = parts.totalDays < 14 ? [parts.totalDays, "day"]
    : parts.totalDays < 60 ? [Math.ceil(parts.totalDays / 7), "week"]
    : parts.totalDays < 365 ? [parts.months + (parts.days > 0 ? 1 : 0), "month"]
    : [parts.years + (parts.months > 0 || parts.days > 0 ? 1 : 0), "year"];
  return `${count} ${unit}${count === 1 ? "" : "s"} left`;
}

export function placementVisitWindow(position: PlanetPosition, generatedAt: string) {
  const at = Date.parse(generatedAt);
  const visit = position.residencyPasses?.find(pass => Date.parse(pass.entryDate) <= at && at <= Date.parse(pass.exitDate));
  const start = new Date(visit?.entryDate ?? position.transitStart ?? "");
  const end = new Date(visit?.exitDate ?? position.transitEnd ?? "");
  return Number.isFinite(start.getTime()) && Number.isFinite(end.getTime()) && start < end ? { start, end } : null;
}

export function placementCardCountdowns(position: PlanetPosition, generatedAt: string, timeZone = "UTC") {
  const zone = position.transitTimeZone || timeZone;
  const visit = placementVisitWindow(position, generatedAt);
  return {
    durationLabel: visit ? placementCardCountdownLabel(generatedAt, visit.end, zone) : null,
    retrogradeDurationLabel: isDisplayRetrograde(position) && position.retrogradeWindowSource === "station" && position.retrogradeEnd
      ? placementCardCountdownLabel(generatedAt, position.retrogradeEnd, zone) : null
  };
}
