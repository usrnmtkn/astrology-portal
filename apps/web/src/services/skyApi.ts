import type { LocationInput, SkySnapshot } from "../types";
import { ASTROLOGY_CALCULATION_CONTRACT } from "./astrologyFacts";
import { isVerifiedSkySnapshot } from "./verifiedSkyCache";
import { withRequestDeadline } from "./requestDeadline";

const pending = new Map<string, Promise<SkySnapshot>>();

/** Share exact inputs only. Never reuse an earlier live instant or another location. */
export function getSkyFromApi(location: LocationInput, date: Date, complete = true): Promise<SkySnapshot> {
  const params = new URLSearchParams({ at: date.toISOString(), lat: String(location.latitude),
    lon: String(location.longitude), timeZone: location.timeZone || "UTC",
    version: ASTROLOGY_CALCULATION_CONTRACT.calculationVersion, detail: complete ? "full" : "core" });
  const key = params.toString();
  let request = pending.get(key);
  if (!request) {
    request = withRequestDeadline(async signal => {
      const response = await fetch(`/api/sky?${key}`, { signal });
      if (!response.ok) throw new Error("Sky API unavailable.");
      const { sky } = await response.json() as { sky: SkySnapshot };
      if (!isVerifiedSkySnapshot(sky) || sky.generatedAt !== date.toISOString()
        || sky.calculationProvenance?.nodeType !== ASTROLOGY_CALCULATION_CONTRACT.nodeType
        || sky.location.latitude !== location.latitude || sky.location.longitude !== location.longitude
        || sky.location.timeZone !== (location.timeZone || "UTC")
        || sky.positions.length !== 14
        || complete && (!Array.isArray(sky.dailyEvents) || sky.positions.some(p => !p.transitStart || !p.transitEnd))) {
        throw new Error("Sky facts incomplete or mismatched.");
      }
      return sky;
    }, { timeoutMs: 8_000 }).finally(() => pending.delete(key));
    pending.set(key, request);
  }
  return request.then(sky => ({ ...sky, location }));
}

export async function getSkyOnlineFirst(location: LocationInput, date: Date, complete = true) {
  try {
    return await getSkyFromApi(location, date, complete);
  } catch {
    // Offline or unavailable service: calculate the identical inputs locally.
    const { getAstrodienstSkyOffMainThread } = await import("./skyCalculationClient");
    return getAstrodienstSkyOffMainThread(location, date, { includeTransitWindows: complete });
  }
}
