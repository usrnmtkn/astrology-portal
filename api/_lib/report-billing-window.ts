import type { ReportHorizon } from "./report-types.ts";
import { BirthTimeValidationError, normalizeBirthTime } from "../../apps/web/src/services/chartTime.js";

export type BirthProfile = {
  birthDate: string;
  birthTime: string | null;
  birthTimeUnknown: boolean;
  birthLocation: { label: string; latitude: number; longitude: number; timeZone?: string } | null;
  natalPointLongitudes?: Partial<Record<"Ascendant" | "Midheaven", number>>;
};

export class ReportBirthDataError extends Error {
  readonly code: "BIRTH_DATA_MISSING" | "BIRTH_DATA_INVALID";

  constructor(code: "BIRTH_DATA_MISSING" | "BIRTH_DATA_INVALID", message: string) {
    super(`${code}: ${message}`);
    this.code = code;
    this.name = "ReportBirthDataError";
  }
}

function recordValue(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;
}

function stringValue(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

export function natalPointLongitudesFromChart(value: unknown) {
  const natalChart = recordValue(value);
  return {
    ...(typeof natalChart?.ascendantLongitude === "number" ? { Ascendant: natalChart.ascendantLongitude } : {}),
    ...(typeof natalChart?.midheavenLongitude === "number" ? { Midheaven: natalChart.midheavenLongitude } : {})
  } satisfies Partial<Record<"Ascendant" | "Midheaven", number>>;
}

export function birthProfileFromPersistedData(data: unknown): BirthProfile | null {
  const root = recordValue(data);
  const profile = recordValue(root?.profile) ?? root;
  const charts = Array.isArray(profile?.charts) ? profile.charts : [];
  const chart = recordValue(charts[0]);
  if (!chart) return null;
  const birthDate = stringValue(chart.birthDate);
  const rawBirthTime = stringValue(chart.birthTime);
  const birthTimeUnknown = rawBirthTime === "Time unknown";
  const location = recordValue(chart.birthLocation);
  const natalChart = recordValue(chart.natalChart);
  const latitude = typeof location?.latitude === "number" ? location.latitude : NaN;
  const longitude = typeof location?.longitude === "number" ? location.longitude : NaN;
  if (!/^\d{4}-\d{2}-\d{2}$/u.test(birthDate)) return null;
  let birthTime: string | null = null;
  if (!birthTimeUnknown && rawBirthTime !== "Birth time needed" && rawBirthTime) {
    birthTime = normalizeBirthTime(rawBirthTime);
  }
  return {
    birthDate,
    birthTime,
    birthTimeUnknown,
    birthLocation: location && Number.isFinite(latitude) && Number.isFinite(longitude) ? {
      label: stringValue(location.label),
      latitude,
      longitude,
      timeZone: stringValue(location.timeZone) || undefined
    } : null,
    natalPointLongitudes: natalPointLongitudesFromChart(natalChart)
  };
}

export function requireReportBirthProfile(data: unknown, requiresBirthTime: boolean) {
  let profile: BirthProfile | null;
  try {
    profile = birthProfileFromPersistedData(data);
  } catch (error) {
    if (error instanceof BirthTimeValidationError) {
      throw new ReportBirthDataError("BIRTH_DATA_INVALID", error.message);
    }
    throw error;
  }
  if (!profile?.birthDate || !profile.birthLocation) {
    throw new ReportBirthDataError("BIRTH_DATA_MISSING", "Add a valid birth date and birth place before generating this report.");
  }
  if (requiresBirthTime && (!profile.birthTime || profile.birthTimeUnknown)) {
    throw new ReportBirthDataError("BIRTH_DATA_MISSING", "Add a valid birth time before generating this report.");
  }
  return profile;
}

function isoDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function utcDate(value: string) {
  return new Date(`${value}T00:00:00.000Z`);
}

function addUtcMonths(date: Date, months: number) {
  const result = new Date(date);
  const day = result.getUTCDate();
  result.setUTCDate(1);
  result.setUTCMonth(result.getUTCMonth() + months);
  const lastDay = new Date(Date.UTC(result.getUTCFullYear(), result.getUTCMonth() + 1, 0)).getUTCDate();
  result.setUTCDate(Math.min(day, lastDay));
  return result;
}

export function reportWindowFromSelectedStart(horizon: ReportHorizon, selectedStart: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/u.test(selectedStart)) throw new Error("Window start must be an ISO date (YYYY-MM-DD).");
  const start = utcDate(selectedStart);
  if (Number.isNaN(start.valueOf()) || isoDate(start) !== selectedStart) throw new Error("Window start is not a valid calendar date.");
  const months = horizon === "1_month" ? 1 : horizon === "4_months" ? 4 : horizon === "6_months" ? 6 : 12;
  const end = addUtcMonths(start, months);
  end.setUTCDate(end.getUTCDate() - 1);
  return { start: isoDate(start), end: isoDate(end), anchor: "selected" as const };
}

function birthdayInYear(birthDate: string, year: number) {
  const [, month, day] = birthDate.split("-").map(Number);
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return new Date(Date.UTC(year, month - 1, Math.min(day, lastDay)));
}

export function reportBillingWindow(input: {
  horizon: ReportHorizon;
  purchasedAt: string;
  selectedStart?: string | null;
  birthDate?: string | null;
}) {
  const purchased = utcDate(input.purchasedAt.slice(0, 10));
  if (input.horizon === "12_months") {
    if (!input.birthDate) throw new Error("A birth date is required for a 12-month report window.");
    const thisYearBirthday = birthdayInYear(input.birthDate, purchased.getUTCFullYear());
    const start = purchased < thisYearBirthday
      ? birthdayInYear(input.birthDate, purchased.getUTCFullYear() - 1)
      : thisYearBirthday;
    const next = birthdayInYear(input.birthDate, start.getUTCFullYear() + 1);
    next.setUTCDate(next.getUTCDate() - 1);
    return { start: isoDate(start), end: isoDate(next), anchor: "solar_return_display" as const };
  }
  const start = input.selectedStart ? utcDate(input.selectedStart) : purchased;
  const months = input.horizon === "1_month" ? 1 : input.horizon === "4_months" ? 4 : 6;
  const end = addUtcMonths(start, months);
  end.setUTCDate(end.getUTCDate() - 1);
  return { start: isoDate(start), end: isoDate(end), anchor: input.selectedStart ? "selected" as const : "purchase" as const };
}
