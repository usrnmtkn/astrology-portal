import { createHash } from "node:crypto";
import { getAstrodienstSky, getLunarCalendarMonth } from "../../apps/web/src/services/ephemeris.js";
import { zonedDateTimeToUtc } from "../../apps/web/src/services/timezones.js";
import { type MonthlyFacts, type MonthlyEvent } from "../../src/content-studio/monthlyComposition.js";

export const calendarWritingHash = (value: unknown) => createHash("sha256").update(JSON.stringify(value)).digest("hex");
export function validateCalendarEdition(month: unknown, timeZone: unknown): { month: string; timeZone: string } {
  if (typeof month !== "string" || !/^\d{4}-(?:0[1-9]|1[0-2])$/u.test(month) || Number(month.slice(0, 4)) < 1900 || Number(month.slice(0, 4)) > 2200) throw new Error("Choose a valid month between 1900 and 2200.");
  if (typeof timeZone !== "string" || timeZone.length > 100) throw new Error("An editorial timezone is required.");
  new Intl.DateTimeFormat("en-US", { timeZone }).format(new Date());
  return { month, timeZone };
}
const cache = new Map<string, Promise<MonthlyFacts>>();

/** The same Swiss calculator as Calendar. Client-supplied facts never reach the writer. */
export function calculateMonthlyWritingFacts(month: string, timeZone: string): Promise<MonthlyFacts> {
  validateCalendarEdition(month, timeZone);
  const key = `${month}|${timeZone}`;
  const existing = cache.get(key);
  if (existing) return existing;
  const request = (async () => {
    const location = { label: "Geocentric reference", latitude: 0, longitude: 0, timeZone };
    const opening = zonedDateTimeToUtc(`${month}-01`, "12:00 AM", timeZone);
    const anchor = zonedDateTimeToUtc(`${month}-15`, "12:00 PM", timeZone);
    const [calendar, sky] = await Promise.all([
      getLunarCalendarMonth(location, anchor, { detail: "full" }),
      getAstrodienstSky(location, opening, { includeTransitWindows: false })
    ]);
    if (sky.calculationProvenance?.actualEphemeris !== "swiss" || sky.generatedAt !== opening.toISOString()) throw new Error("Verified Swiss ephemeris facts are unavailable. No writing was generated.");
    const sun = sky.positions.find(position => position.planet === "Sun");
    if (!sun?.sign) throw new Error("The opening Sun season could not be calculated.");
    const dates = new Set(calendar.days.filter(day => day.inMonth && day.dateKey.startsWith(`${month}-`)).map(day => day.dateKey));
    if (dates.size < 28) throw new Error("The calculated month is incomplete.");
    const events: MonthlyEvent[] = calendar.events.filter(event => dates.has(event.dateKey) && event.phase !== "retrograde-passage")
      .map(event => ({ id: event.id, type: event.type, title: event.title, startsAt: event.startsAt, dateKey: event.dateKey, primary: event.primary,
        ...(event.planet ? { planet: event.planet } : {}), ...(event.planets ? { planets: event.planets } : {}), ...(event.aspect ? { aspect: event.aspect } : {}),
        ...(event.sign ? { sign: event.sign } : {}), ...(event.fromSign ? { fromSign: event.fromSign } : {}), ...(event.toSign ? { toSign: event.toSign } : {}),
        ...(event.phase ? { phase: event.phase } : {}), ...(event.direction ? { direction: event.direction } : {}), ...(event.eclipseType ? { eclipseType: event.eclipseType } : {}) }));
    const change = events.find(event => event.type === "ingress" && event.planet === "Sun" && event.startsAt > opening.toISOString());
    if (change && !(change.toSign ?? change.sign)) throw new Error("The incoming Sun season is incomplete.");
    return { month, timeZone, openingSeasonSign: sun.sign, closingSeasonSign: change?.toSign ?? change?.sign ?? "", seasonChangeAt: change?.startsAt ?? null,
      events, calculationSource: "Swiss Ephemeris · Calendar month · tropical, geocentric" };
  })();
  cache.set(key, request);
  request.catch(() => cache.delete(key));
  if (cache.size > 12) cache.delete(cache.keys().next().value!);
  return request;
}
