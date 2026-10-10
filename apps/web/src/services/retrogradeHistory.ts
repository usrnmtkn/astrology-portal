/** Shared, factual retrograde history. All positions are supplied by the verified
 * Swiss adapter; this module contains no interpretation or historical calendars. */
export const RETROGRADE_HISTORY_VERSION = "retrograde-history-v1";
export const RETROGRADE_HISTORY_START = "1800-01-02T00:00:00.000Z";
export const RETROGRADE_HISTORY_END = "2399-12-30T00:00:00.000Z";
export const retrogradeHistoryPlanets = ["mercury", "venus", "mars", "jupiter", "saturn", "uranus", "neptune", "pluto", "chiron"] as const;
const signs = ["aries", "taurus", "gemini", "cancer", "leo", "virgo", "libra", "scorpio", "sagittarius", "capricorn", "aquarius", "pisces"];
const DAY = 86_400_000;
const normalize = (n: number) => (n % 360 + 360) % 360;
const separation = (a: number, b: number) => Math.min(normalize(a - b), normalize(b - a));
type Sample = { longitude: number; speed: number };
export type RetrogradeStation = { instant: string; longitude: number; sign: string; degree: number };
export type RetrogradeSegment = { sign: string; start: string; end: string };
export type RetrogradeCycle = {
  retrograde: RetrogradeStation;
  direct: RetrogradeStation;
  segments: RetrogradeSegment[];
};
export type RetrogradeHistory = {
  schema: typeof RETROGRADE_HISTORY_VERSION;
  planet: string;
  sign: string | null;
  status: "ready" | "not-retrograde" | "unsupported" | "out-of-range" | "incomplete-cycle";
  current?: RetrogradeCycle;
  sameSign?: RetrogradeCycle | null;
  degreeMatch?: { cycle: RetrogradeCycle; closestInstant: string; distanceDegrees: number; exact: boolean } | null;
  referenceLongitude?: number;
  referenceBasis: "retrograde-start-station";
  toleranceDegrees: 4;
  coverage?: { start: string; end: string; completedCycles: number; reachedBoundary: boolean };
  calculationProvenance?: unknown;
};

/** Finds complete cycles, including those that only pass through the requested
 * sign. Roots are refined to one second. Station-to-station retrograde paths are
 * monotone; unwrapping from their start prevents a false crossing at 180°. */
export function calculateRetrogradeHistory(input: { planet: string; referenceDate: Date; sign?: string }, sample: (time: number) => Sample): RetrogradeHistory {
  const planet = input.planet.trim().toLowerCase();
  const requestedSign = input.sign?.trim().toLowerCase();
  if (requestedSign && !signs.includes(requestedSign)) throw new Error("Unknown retrograde-history sign.");
  const reference = input.referenceDate.getTime();
  if (!Number.isFinite(reference)) throw new Error("Invalid retrograde-history reference date.");
  const base: RetrogradeHistory = { schema: RETROGRADE_HISTORY_VERSION, planet, sign: requestedSign ?? null,
    status: "ready", referenceBasis: "retrograde-start-station", toleranceDegrees: 4 };
  if (!(retrogradeHistoryPlanets as readonly string[]).includes(planet)) return { ...base, status: "unsupported" };
  const min = Date.parse(RETROGRADE_HISTORY_START), max = Date.parse(RETROGRADE_HISTORY_END);
  if (reference < min || reference > max) return { ...base, status: "out-of-range" };
  const checked = (time: number) => {
    if (time < min || time > max) throw new Error("Retrograde search exceeded its ephemeris boundary.");
    const value = sample(time);
    if (!Number.isFinite(value.longitude) || !Number.isFinite(value.speed)) throw new Error("Retrograde history needs verified finite ephemeris positions.");
    return { longitude: normalize(value.longitude), speed: value.speed };
  };
  const step = (["mercury", "venus"].includes(planet) ? 1 : planet === "mars" ? 2 : 5) * DAY;
  const at = checked(reference);
  if (at.speed >= 0) return { ...base, status: "not-retrograde" };
  const root = (lo: number, hi: number, value: (time: number) => number) => {
    const initial = value(lo);
    while (hi - lo > 1) {
      const mid = Math.floor((lo + hi) / 2);
      if ((value(mid) < 0) === (initial < 0)) lo = mid;
      else hi = mid;
    }
    return Math.ceil(hi / 1000) * 1000;
  };
  const station = (time: number): RetrogradeStation => {
    const longitude = checked(time).longitude;
    return { instant: new Date(time).toISOString(), longitude, sign: signs[Math.floor(longitude / 30)], degree: longitude % 30 };
  };
  const cycle = (start: number, end: number): RetrogradeCycle => {
    const retrograde = station(start), direct = station(end);
    const span = normalize(retrograde.longitude - direct.longitude);
    if (span > 180) throw new Error("Retrograde path could not be verified.");
    const endLongitude = retrograde.longitude - span;
    const crossing = (target: number) => root(start, end, time => {
      const delta = ((checked(time).longitude - retrograde.longitude + 540) % 360) - 180;
      return retrograde.longitude + delta - target;
    });
    const points = [{ time: start, longitude: retrograde.longitude }];
    for (let boundary = Math.floor(retrograde.longitude / 30) * 30; boundary > endLongitude; boundary -= 30) {
      if (boundary < retrograde.longitude) points.push({ time: crossing(boundary), longitude: boundary });
    }
    points.push({ time: end, longitude: endLongitude });
    return { retrograde, direct, segments: points.slice(0, -1).map((point, index) => ({
      sign: signs[Math.floor(normalize((point.longitude + points[index + 1].longitude) / 2) / 30)],
      start: new Date(point.time).toISOString(), end: new Date(points[index + 1].time).toISOString()
    })) };
  };
  const boundary = (direction: -1 | 1) => {
    let previous = reference;
    // A complete planetary retrograde is shorter than a year. A cap also makes
    // malformed or unsupported samplers fail closed instead of searching forever.
    const limit = direction < 0 ? Math.max(min, reference - 366 * DAY) : Math.min(max, reference + 366 * DAY);
    while (previous !== limit) {
      const next = direction < 0 ? Math.max(limit, previous - step) : Math.min(limit, previous + step);
      if (checked(next).speed >= 0) return root(Math.min(previous, next), Math.max(previous, next), time => checked(time).speed);
      previous = next;
    }
    return null;
  };
  const start = boundary(-1), end = boundary(1);
  if (start === null || end === null) return { ...base, status: "incomplete-cycle" };
  const current = cycle(start, end);
  const sign = requestedSign ?? signs[Math.floor(at.longitude / 30)];
  if (!current.segments.some(segment => segment.sign === sign)) throw new Error("The requested sign is not part of this retrograde cycle.");
  const referenceLongitude = current.retrograde.longitude;
  let sameSign: RetrogradeCycle | null = null;
  let degreeMatch: RetrogradeHistory["degreeMatch"] = null;
  let previousTime = Math.max(min, start - 60_000), previousSpeed = checked(previousTime).speed;
  let directTime: number | null = null;
  let completedCycles = 0;
  while (previousTime > min && (!sameSign || !degreeMatch)) {
    const time = Math.max(min, previousTime - step), speed = checked(time).speed;
    if ((speed < 0) !== (previousSpeed < 0)) {
      const stationTime = root(time, previousTime, instant => checked(instant).speed);
      if (speed < 0) directTime = stationTime;
      else if (directTime !== null) {
        const candidate = cycle(stationTime, directTime);
        completedCycles += 1;
        if (!sameSign && candidate.segments.some(segment => segment.sign === sign)) sameSign = candidate;
        if (!degreeMatch) {
          const span = normalize(candidate.retrograde.longitude - candidate.direct.longitude);
          const offset = normalize(candidate.retrograde.longitude - referenceLongitude);
          const exact = offset <= span;
          const startDistance = separation(referenceLongitude, candidate.retrograde.longitude);
          const endDistance = separation(referenceLongitude, candidate.direct.longitude);
          const distanceDegrees = exact ? 0 : Math.min(startDistance, endDistance);
          if (distanceDegrees <= 4) {
            const closestInstant = exact ? new Date(root(stationTime, directTime, instant => {
              const delta = ((checked(instant).longitude - candidate.retrograde.longitude + 540) % 360) - 180;
              return delta + offset;
            })).toISOString() : startDistance <= endDistance ? candidate.retrograde.instant : candidate.direct.instant;
            degreeMatch = { cycle: candidate, closestInstant, distanceDegrees, exact };
          }
        }
        directTime = null;
      }
    }
    previousTime = time;
    previousSpeed = speed;
  }
  return { ...base, sign, current, sameSign, degreeMatch, referenceLongitude,
    coverage: { start: new Date(previousTime).toISOString(), end: current.retrograde.instant, completedCycles, reachedBoundary: previousTime === min } };
}

export function hasVerifiedSameSignHistory(history: RetrogradeHistory | undefined): boolean {
  return history?.status === "ready" && !!history.sameSign && !!history.coverage;
}
