import { getInitialLocation, getInitialTransitDate, skyDateTimeFromInput } from "./skySelection";
import { liveSkyReference } from "./skyClock";
import { withTimeZone } from "./timezones";
import { rememberStudioReturnPath } from "./studioAuthReturn";

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
    return getSkyLocally(location, date, complete);
  }
}

async function getSkyLocally(location: LocationInput, date: Date, complete: boolean) {
  const { getAstrodienstSkyOffMainThread } = await import("./skyCalculationClient");
  return getAstrodienstSkyOffMainThread(location, date, { includeTransitWindows: complete });
}

export type InitialSkyLoad = {
  day: string;
  location: LocationInput;
  date: Date;
  live: boolean;
  startedAt: number;
  result: Promise<SkySnapshot | null>;
  matches: (day: string, location: LocationInput) => InitialSkyLoad | null;
  resolve: () => Promise<SkySnapshot>;
};

/** Capture the initial Sky selection while App downloads. No local worker is
 * started speculatively; failures belong to the mounted selection's fallback. */
export function startInitialSkyLoad(): InitialSkyLoad | null {
  const url = new URL(window.location.href);
  if (url.pathname !== "/" || !/^#\/?sky\/?$/u.test(url.hash)
    || url.searchParams.get("auth") === "login" || rememberStudioReturnPath()) return null;
  const day = getInitialTransitDate();
  const location = withTimeZone(getInitialLocation().location);
  const now = new Date();
  const date = skyDateTimeFromInput(day, location, true, now);
  const result = getSkyFromApi(location, date).catch(() => null);
  // Returning readers can validate their complete cache without a large download.
  // A first visit keeps the normal post-App read so ledger bytes do not delay App.
  void import("./contentPublications").then(({ refreshContentPublications, contentPublicationsResolved }) => {
    if (contentPublicationsResolved()) return refreshContentPublications(false,
      () => import("./publicationLedgerTransport").then(({ loadPublicationLedgerFromApi }) => loadPublicationLedgerFromApi()));
  }).catch(() => {});

  let calculation: Promise<SkySnapshot> | undefined;
  const initial: InitialSkyLoad = {
    day, location, date, live: Boolean(liveSkyReference(day, location.timeZone, now)), startedAt: performance.now(), result,
    matches: (selectedDay, selectedLocation) => matchingInitialSkyLoad(initial, selectedDay, selectedLocation),
    resolve: () => calculation ??= result.then(async snapshot => {
      if (snapshot) return snapshot;
      return getSkyLocally(location, date, true);
    })
  };
  return initial;
}

/** Never apply a preloaded response to a changed location, date or clock mode.
 * Bound live adoption by monotonic time, including a delayed/suspended mount. */
export function matchingInitialSkyLoad(initial: InitialSkyLoad | null, day: string, location: LocationInput): InitialSkyLoad | null {
  if (!initial || initial.day !== day || initial.location.latitude !== location.latitude
    || initial.location.longitude !== location.longitude || initial.location.timeZone !== location.timeZone
    || initial.live !== Boolean(liveSkyReference(day, location.timeZone))
    || performance.now() - initial.startedAt > 10_000) return null;
  return initial;
}
