import { zonedDateTimeToUtc } from "./timezones.js";

export const PERSONAL_DAILY_ORB = 1;
export const PERSONAL_DAILY_SEPARATING_DAYS = 2;
export type PersonalDailyPeak = {
  id: string;
  referenceAt: string;
  dateKey: string;
  timeZone: string;
  orbDegrees: number;
  direction: "applying" | "separating" | "stationary";
  exactToday: string[];
  previousExactAt: string | null;
  nextExactAt: string | null;
};

export function personalTransitId(planet: string, aspect: string, target: string) {
  return `${planet}-${aspect}-${target}`.toLowerCase().replace(/\s+/g, "-");
}

export function personalDateKey(date: Date | string, timeZone: string) {
  return new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(date));
}

export function shiftPersonalDateKey(dateKey: string, days: number) {
  const date = new Date(`${dateKey}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

/** Calendar boundaries, including 23/25-hour days, in the selected location. */
export function personalDayBounds(date: Date | string, timeZone: string) {
  const dateKey = /^\d{4}-\d{2}-\d{2}$/.test(String(date)) ? String(date) : personalDateKey(date, timeZone);
  return {
    dateKey,
    start: zonedDateTimeToUtc(dateKey, "00:00", timeZone),
    end: zonedDateTimeToUtc(shiftPersonalDateKey(dateKey, 1), "00:00", timeZone),
    recentStart: zonedDateTimeToUtc(shiftPersonalDateKey(dateKey, -PERSONAL_DAILY_SEPARATING_DAYS), "00:00", timeZone)
  };
}

export function personalDailyPriority(peak?: PersonalDailyPeak) {
  if (!peak) return null;
  if (peak.exactToday.length) return 0;
  if (peak.orbDegrees > PERSONAL_DAILY_ORB) return null;
  if (peak.direction === "applying") return 1;
  if (peak.direction === "separating" && peak.previousExactAt) {
    const { recentStart, start } = personalDayBounds(peak.dateKey, peak.timeZone);
    const previous = Date.parse(peak.previousExactAt);
    if (previous >= recentStart.getTime() && previous < start.getTime()) return 2;
  }
  return null;
}

type DailyContact = { id: string; dailyPeak?: PersonalDailyPeak; score?: number };
export function comparePersonalDailyTransits(a: DailyContact, b: DailyContact) {
  const priority = (personalDailyPriority(a.dailyPeak) ?? 3) - (personalDailyPriority(b.dailyPeak) ?? 3);
  if (priority) return priority;
  const first = a.dailyPeak;
  const second = b.dailyPeak;
  if (!first || !second) return (b.score ?? 0) - (a.score ?? 0);
  // Within each stage, prefer the nearest verified peak. Never estimate a date
  // by dividing the orb by speed, particularly around a station.
  const distance = (peak: PersonalDailyPeak) => {
    const exact = peak.exactToday[0] ?? (peak.direction === "applying" ? peak.nextExactAt : peak.previousExactAt);
    return exact ? Math.abs(Date.parse(exact) - Date.parse(peak.referenceAt)) : Infinity;
  };
  const proximity = distance(first) - distance(second);
  return (Number.isNaN(proximity) ? 0 : proximity) || first.orbDegrees - second.orbDegrees || (b.score ?? 0) - (a.score ?? 0) || a.id.localeCompare(b.id);
}

export function precisePersonalOrb(orb: number) {
  const minutes = Math.round(Math.abs(orb) * 60);
  if (minutes === 0 && orb !== 0) return "<1′";
  return `${Math.floor(minutes / 60)}° ${String(minutes % 60).padStart(2, "0")}′`;
}

export function personalDailyPeakLabel(peak: PersonalDailyPeak) {
  const date = (iso: string) => new Intl.DateTimeFormat("en-US", {
    timeZone: peak.timeZone, month: "short", day: "numeric", year: "numeric"
  }).format(new Date(iso));
  const time = (iso: string) => new Intl.DateTimeFormat("en-US", {
    timeZone: peak.timeZone, hour: "numeric", minute: "2-digit", timeZoneName: "short"
  }).format(new Date(iso));
  if (peak.exactToday.length) return peak.exactToday.map(iso => `Exact ${date(iso)} · ${time(iso)}`).join("; ");
  if (peak.direction === "applying") return peak.nextExactAt ? `Applying · Exact ${date(peak.nextExactAt)}` : "Applying";
  if (peak.direction === "separating") return peak.previousExactAt ? `Separating · Exact ${date(peak.previousExactAt)}` : "Separating";
  return "Stationary";
}
