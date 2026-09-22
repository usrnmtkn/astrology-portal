import { getSupabaseClient } from "../../services/auth";
import type { WeeklyHoroscopeAssembly, WeeklyHoroscopeReading } from "../../services/weeklyHoroscope";

export type YouTransitReportWindow = "day" | "week";

export type YouReportTransitReading = {
  transitId: string;
  heading: string;
  body: string;
  sourceUnits: string[];
};

export type YouTransitReportBrief = {
  schema: "tldr.you-transit-reading-brief.v1";
  window: YouTransitReportWindow;
  targetDate: string;
  periodEnd: string;
  dateLabel: string;
  approvedReaderText: Record<string, unknown>;
  technicalEvidence: Record<string, unknown>;
};

type DailySummary = {
  headline: string;
  summary: string;
  secondary?: string;
  writeup?: Array<{ heading?: string; body: string[] }>;
  moonContext?: unknown;
  status: "idle" | "loading" | "ready" | "error";
};

type DailyAssembly = {
  doItems?: string[];
  dontItems?: string[];
  specialSections: Array<{ headline: string; body: string }>;
  reportTransitReadings?: YouReportTransitReading[];
  reportSourceGaps?: string[];
  derivation: Record<string, unknown>;
};

function record(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

function isoDate(value: unknown) {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/u.test(value) ? value : "";
}

function compactWeeklyReading(reading: WeeklyHoroscopeReading) {
  return {
    dateKey: reading.dateKey ?? null,
    dayLabel: reading.dayLabel,
    headline: reading.headline,
    driverLabel: reading.driverLabel,
    timing: reading.timing ?? null,
    body: reading.body,
    tag: reading.tag ?? null,
    source: reading.source,
    orb: reading.orb ?? null,
    house: reading.house ?? null,
    sourceUnits: reading.sourceUnits
  };
}

export function buildYouDayReportBrief(input: {
  dateLabel: string;
  dailySummary?: DailySummary | null;
  dailyAssembly?: DailyAssembly | null;
}): YouTransitReportBrief | null {
  const derivation = record(input.dailyAssembly?.derivation);
  const targetDate = isoDate(derivation?.targetDate);
  if (!targetDate) return null;

  const qualifyingTransits = Array.isArray(derivation?.qualifyingTransits)
    ? derivation?.qualifyingTransits
    : [];
  const moonDriver = derivation?.moonDriver ?? null;
  const summaryReady = input.dailySummary?.status === "ready" && Boolean(input.dailySummary.summary.trim());
  const specialSections = input.dailyAssembly?.specialSections ?? [];
  const transitReadings = input.dailyAssembly?.reportTransitReadings ?? [];
  if (!summaryReady && specialSections.length === 0 && transitReadings.length === 0) return null;
  if (qualifyingTransits.length === 0 && !moonDriver) return null;

  return {
    schema: "tldr.you-transit-reading-brief.v1",
    window: "day",
    targetDate,
    periodEnd: targetDate,
    dateLabel: input.dateLabel,
    approvedReaderText: {
      dailySummary: summaryReady ? {
        headline: input.dailySummary?.headline ?? "",
        summary: input.dailySummary?.summary ?? "",
        secondary: input.dailySummary?.secondary ?? null,
        writeup: input.dailySummary?.writeup ?? [],
        moonContext: input.dailySummary?.moonContext ?? null
      } : null,
      doItems: input.dailyAssembly?.doItems ?? [],
      dontItems: input.dailyAssembly?.dontItems ?? [],
      specialSections,
      transitReadings
    },
    technicalEvidence: {
      qualifyingTransits,
      moonDriver,
      targetDate,
      sourceGaps: input.dailyAssembly?.reportSourceGaps ?? []
    }
  };
}

export function buildYouWeekReportBrief(input: {
  dateLabel: string;
  weeklyAssembly?: WeeklyHoroscopeAssembly | null;
}): YouTransitReportBrief | null {
  const weekly = input.weeklyAssembly;
  if (!weekly || weekly.status !== "ready") return null;
  const targetDate = isoDate(weekly.weekStart);
  const periodEnd = isoDate(weekly.weekEnd);
  if (!targetDate || !periodEnd) return null;

  const readings = [weekly.horoscope, ...weekly.aspects];
  if (!weekly.macro && readings.every((reading) => !reading.body.trim())) return null;

  return {
    schema: "tldr.you-transit-reading-brief.v1",
    window: "week",
    targetDate,
    periodEnd,
    dateLabel: `${weekly.weekStart} through ${weekly.weekEnd}`,
    approvedReaderText: {
      macro: weekly.macro ?? null,
      horoscope: compactWeeklyReading(weekly.horoscope),
      aspects: weekly.aspects.map(compactWeeklyReading)
    },
    technicalEvidence: {
      weekStart: weekly.weekStart,
      weekEnd: weekly.weekEnd,
      weekType: weekly.weekType,
      readings: readings.map((reading) => ({
        dateKey: reading.dateKey ?? null,
        dayLabel: reading.dayLabel,
        driverLabel: reading.driverLabel,
        timing: reading.timing ?? null,
        source: reading.source,
        orb: reading.orb ?? null,
        house: reading.house ?? null,
        sourceUnits: reading.sourceUnits
      }))
    }
  };
}

export async function requestYouTransitReport(brief: YouTransitReportBrief, expectedUserId?: string) {
  const supabase = await getSupabaseClient();
  if (!supabase) throw new Error("Report sign-in is unavailable. Please reload and try again.");
  const { data, error } = await supabase.auth.getSession();
  if (error || !data.session?.access_token || (expectedUserId && data.session.user.id !== expectedUserId)) {
    throw new Error("Your session could not be confirmed. Please try again.");
  }

  const response = await fetch("/api/you-report-request", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${data.session.access_token}`
    },
    body: JSON.stringify({ reportWindow: brief.window, brief })
  });
  const payload = await response.json().catch(() => null) as {
    status?: "ready" | "queued" | "unavailable";
    reportId?: string | null;
    jobId?: string | null;
    error?: string;
  } | null;
  if (!response.ok && response.status !== 202) {
    throw new Error(payload?.error ?? "Could not prepare this report.");
  }
  return {
    status: payload?.status ?? (response.status === 202 ? "queued" : "ready"),
    reportId: payload?.reportId ?? null,
    jobId: payload?.jobId ?? null
  };
}
