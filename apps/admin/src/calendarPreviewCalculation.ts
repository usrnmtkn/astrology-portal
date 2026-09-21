import { getAstrodienstSkyOffMainThread, getLunarCalendarMonthOffMainThread, getLunarCalendarWeekOffMainThread } from "../../web/src/services/skyCalculationClient";
import type { SkySnapshot } from "../../web/src/types";
import type { LunarCalendarDay, LunarCalendarEvent } from "../../web/src/services/ephemeris";
import type { SkyForecastPeriod } from "./skyForecastTemplates";

export type CalendarPreviewCalculation = {
  sky: SkySnapshot;
  days: LunarCalendarDay[];
  events: LunarCalendarEvent[];
  seasonIngresses?: LunarCalendarEvent[];
  cycleEvents?: LunarCalendarEvent[];
  timeZone: string;
};

/** Geocentric facts, calculated by the same Swiss worker used by the reader. */
export async function calculateCalendarPreview(period: SkyForecastPeriod, instant: string, timeZone: string): Promise<CalendarPreviewCalculation> {
  const date = new Date(instant);
  if (!Number.isFinite(date.getTime())) throw new Error("Choose a valid date and time.");
  new Intl.DateTimeFormat("en-US", { timeZone }).format(date);
  const location = { label: "Geocentric reference", latitude: 0, longitude: 0, timeZone };
  const [sky, calendar] = await Promise.all([
    getAstrodienstSkyOffMainThread(location, date, { includeTransitWindows: false }),
    period === "monthly-sky" ? getLunarCalendarMonthOffMainThread(location, date)
      : getLunarCalendarWeekOffMainThread(location, date)
  ]);
  if (sky.calculationProvenance?.actualEphemeris !== "swiss" || sky.generatedAt !== date.toISOString()) {
    throw new Error("Verified ephemeris facts are unavailable for this date. Retry the calculation.");
  }
  const days = calendar?.days.filter(day => period !== "monthly-sky" || day.inMonth) ?? [];
  const dates = new Set(days.map(day => day.dateKey));
  return {
    sky,
    days,
    seasonIngresses: calendar?.events.filter(event => event.planet === "Sun" && event.type === "ingress") ?? [],
    events: calendar?.events.filter(event => dates.has(event.dateKey)) ?? [],
    cycleEvents: calendar?.cycleEvents ?? [],
    timeZone
  };
}
