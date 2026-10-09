import { transitToNatalOrbLimit } from "../astrologyConfig";
import type { NatalTransitTiming } from "./ephemeris";
import { personalDayBounds, type PersonalDailyPeak } from "./personalDailyTransits";

export type ReportTransit = {
  id: string; transitPlanet: string; natalPoint: string; aspect: string;
  natalLongitude?: number; aspectDegrees?: number; natalSign: string;
  transitSign?: string; natalHouse?: number; transitHouse?: number;
  orb: string; direction?: string; timeZone?: string;
  dailyPeak?: PersonalDailyPeak;
};
type Calculate = typeof import("./ephemeris").natalTransitTimingFor;

/** Snapshot actual contact calculations before freezing the paid-report input.
 * Card display estimates and the date a return series ends are not end dates
 * for the current continuous contact. */
export async function preparePersonalReportTiming<T extends ReportTransit>(
  transits: T[], reference: Date, timeZone: string, calculate?: Calculate
) {
  const compute = calculate ?? (await import("./skyCalculationClient")).natalTransitTimingForOffMainThread;
  const dateLabel = (date: string | Date) => new Intl.DateTimeFormat("en-US", {
    month: "long", day: "numeric", year: "numeric", timeZone
  }).format(new Date(date));
  const resolved = await Promise.all(transits.map(async transit => {
    const orbDegrees = transitToNatalOrbLimit(transit.transitPlanet);
    const bounds = personalDayBounds(reference, timeZone);
    const event = transit.dailyPeak?.exactToday.find(iso => Date.parse(iso) >= bounds.start.getTime() && Date.parse(iso) < bounds.end.getTime());
    const contactReference = event ? new Date(event) : reference;
    const timing: NatalTransitTiming | null = Number.isFinite(transit.natalLongitude)
      && Number.isFinite(transit.aspectDegrees) && orbDegrees > 0
      ? await compute(transit.transitPlanet, transit.natalLongitude!, contactReference, {
        aspectDegrees: transit.aspectDegrees, presentationDegrees: orbDegrees, timeZone
      }) : null;
    const continuous = timing && Date.parse(timing.currentStart) <= contactReference.getTime()
      && Date.parse(timing.currentEnd) >= contactReference.getTime() ? timing : null;
    if (!continuous) {
      // The source renderer inserts its window as an end date. A reference-day
      // label here would silently turn "On" into a false "Until" claim.
      throw new Error(`Timing for ${transit.transitPlanet} ${transit.aspect} ${transit.natalPoint} could not be verified. The report has not been submitted.`);
    }
    const window = `Until ${dateLabel(continuous.currentEnd)}`;
    return {
      transit: { ...transit, timing: continuous, reportWindowLabel: window },
      evidence: {
        id: transit.id, transitPlanet: transit.transitPlanet, natalPoint: transit.natalPoint,
        natalSign: transit.natalSign, transitSign: transit.transitSign ?? null,
        natalLongitude: transit.natalLongitude ?? null, aspect: transit.aspect,
        aspectDegrees: transit.aspectDegrees ?? null, orb: transit.orb,
        house: transit.natalHouse ?? null, transitHouse: transit.transitHouse ?? null,
        direction: transit.direction ?? null, window,
        calculation: { engine: "swiss-ephemeris", referenceAt: reference.toISOString(), timeZone,
          contactReferenceAt: contactReference.toISOString(), exactOnSelectedDay: Boolean(event),
          orbDegrees, status: continuous ? "calculated" : "end_date_unavailable",
          currentStart: continuous?.currentStart ?? null, currentEnd: continuous?.currentEnd ?? null,
          exactPasses: continuous.exactPasses.map(pass => ({ ...pass,
            dateLabel: dateLabel(pass.exactAt),
            timeLabel: new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit", timeZone, timeZoneName: "short" }).format(new Date(pass.exactAt))
          })),
          repeatContact: (continuous?.exactPasses.length ?? 0) > 1 }
      }
    };
  }));
  return { transits: resolved.map(row => row.transit), qualifyingTransits: resolved.map(row => row.evidence) };
}
