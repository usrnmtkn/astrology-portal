import { isInitialSkyReaderHash } from "./initialSkyRoute.mjs";
import { getInitialLocation, getInitialTransitDate, skyDateTimeFromInput } from "./skySelection";
import { liveSkyReference } from "./skyClock";
import { withTimeZone } from "./timezones";
import { rememberStudioReturnPath } from "./studioAuthReturn";

import type { LocationInput, SkySnapshot } from "../types";
import { ASTROLOGY_CALCULATION_CONTRACT } from "./astrologyFacts";
import { isVerifiedSkySnapshot } from "./verifiedSkyCache";
import { withRequestDeadline } from "./requestDeadline";
import { acceptInitialSkyReader, trackInitialSkyReaderRequest } from "./initialSkyReader";
import {matchingInitialSkyTransport,takeInitialSkyTransport} from "./initialSkyTransport";

const pending = new Map<string, Promise<SkySnapshot>>();
let primedInitialSkyLoad: InitialSkyLoad | null = null;

/** Share exact inputs only. Never reuse an earlier live instant or another location. */
export function getSkyFromApi(location: LocationInput, date: Date, complete: boolean | "placements" = true): Promise<SkySnapshot> {
  const detail = complete === "placements" ? complete : complete ? "full" : "core";
  const params = new URLSearchParams({ at: date.toISOString(), lat: String(location.latitude),
    lon: String(location.longitude), timeZone: location.timeZone || "UTC",
    version: ASTROLOGY_CALCULATION_CONTRACT.calculationVersion, detail });
  const key = params.toString();
  let request = pending.get(key);
  if (!request) {
    const primedTransport = detail === "placements" ? takeInitialSkyTransport(key) : null;
    request = withRequestDeadline(async signal => {
      let payload: { sky: SkySnapshot; initialReader?: unknown };
      try {
        if (primedTransport) payload = await primedTransport.request as typeof payload;
        else {
          const response = await fetch(`/api/${detail === "placements" ? "sky-reader" : "sky"}?${key}`, { signal, priority: detail === "placements" ? "high" : "auto" });
          if (!response.ok) throw new Error("Sky API unavailable.");
          payload = await response.json();
        }
      } catch (error) {
        if (detail !== "placements" || signal.aborted) throw error;
        const response = await fetch(`/api/sky?${key}`, { signal, priority: "high" });
        if (!response.ok) throw new Error("Sky API unavailable.");
        payload = await response.json();
      }
      const { sky } = payload;
      if (!isVerifiedSkySnapshot(sky) || sky.generatedAt !== date.toISOString()
        || sky.calculationDetail !== undefined && sky.calculationDetail !== detail
        || detail === "placements" && sky.calculationDetail !== detail
        || sky.calculationProvenance?.nodeType !== ASTROLOGY_CALCULATION_CONTRACT.nodeType
        || sky.location.latitude !== location.latitude || sky.location.longitude !== location.longitude
        || sky.location.timeZone !== (location.timeZone || "UTC")
        || sky.positions.length !== 14
        || complete && (!Array.isArray(sky.dailyEvents) || sky.positions.some(p => !p.transitStart || !p.transitEnd))) {
        throw new Error("Sky facts incomplete or mismatched.");
      }
      if (detail === "placements" && await acceptInitialSkyReader(sky, payload.initialReader)) {
        const { admitInitialSkyReaderPublications } = await import("./contentPublications");
        admitInitialSkyReaderPublications();
        // The complete selected reading is known now. Prepare its existing
        // renderer while App downloads, keeping Markdown outside static boot.
        void import("../components/FormattedWritingContent").catch(() => {});
      }
      return sky;
    }, { timeoutMs: primedTransport ? Math.max(1, 8_000 - (performance.now() - primedTransport.startedAt)) : 8_000 }).finally(() => pending.delete(key));
    pending.set(key, request);
    if (detail === "placements") trackInitialSkyReaderRequest(request);
  }
  return request.then(sky => ({ ...sky, location }));
}

export async function getSkyOnlineFirst(location: LocationInput, date: Date, complete: boolean | "placements" = true) {
  try {
    return await getSkyFromApi(location, date, complete);
  } catch {
    // Offline or unavailable service: calculate the identical inputs locally.
    return getSkyLocally(location, date, complete);
  }
}

async function getSkyLocally(location: LocationInput, date: Date, complete: boolean | "placements") {
  const { getAstrodienstSkyOffMainThread } = await import("./skyCalculationClient");
  return getAstrodienstSkyOffMainThread(location, date, { includeTransitWindows: Boolean(complete), includeAspectTiming: complete !== "placements" });
}

export type InitialSkyLoad = {
  detail?: "placements" | "full";
  day: string;
  location: LocationInput;
  date: Date;
  live: boolean;
  startedAt: number;
  result: Promise<SkySnapshot | null>;
  snapshot?: SkySnapshot | null;
  matches: (day: string, location: LocationInput, detail?: "placements" | "full") => InitialSkyLoad | null;
  resolve: () => Promise<SkySnapshot>;
};

/** Capture the initial Sky selection while App downloads. No local worker is
 * started speculatively; failures belong to the mounted selection's fallback. */
export function startInitialSkyLoad(): InitialSkyLoad | null {
  const url = new URL(window.location.href);
  if (url.pathname !== "/" || !isInitialSkyReaderHash(url.hash)
    || url.searchParams.get("auth") === "login" || rememberStudioReturnPath()) return null;
  const day = getInitialTransitDate();
  const location = withTimeZone(getInitialLocation().location);
  const now = new Date();
  const detail = !url.hash || /^#\/?sky\/?$/u.test(url.hash) ? "placements" : "full";
  const transport = detail === "placements" ? matchingInitialSkyTransport(day, location, Boolean(liveSkyReference(day, location.timeZone, now))) : null;
  const date = transport ? new Date(transport.at) : skyDateTimeFromInput(day, location, true, now);
  const primed = matchingInitialSkyLoad(primedInitialSkyLoad, day, location, detail);
  if (primed) return primed;
  const result = getSkyFromApi(location, date, detail === "placements" ? detail : true).catch(() => null);
  // Direct articles benefit from early sources. On the list, let App mount and
  // start the selected publication reads before large source downloads compete.
  // The mounted source gate still requires the same complete package.
  if (url.hash && !/^#\/?sky\/?$/u.test(url.hash)) {
    void import("../content/canonicalSkyReaderAssets").then(({ loadCanonicalSkyReaderAssets }) =>
      loadCanonicalSkyReaderAssets()).catch(() => {});
  }
  let calculation: Promise<SkySnapshot> | undefined;
  const initial: InitialSkyLoad = {
    day, location, date, detail, live: Boolean(liveSkyReference(day, location.timeZone, now)), startedAt: performance.now(), result,
    matches: (selectedDay, selectedLocation, selectedDetail) => matchingInitialSkyLoad(initial, selectedDay, selectedLocation, selectedDetail),
    resolve: () => calculation ??= result.then(async snapshot => {
      if (snapshot) return snapshot;
      return getSkyLocally(location, date, detail === "placements" ? detail : true);
    })
  };
  primedInitialSkyLoad = initial;
  void result.then(snapshot => { initial.snapshot = snapshot; if (!snapshot && primedInitialSkyLoad === initial) primedInitialSkyLoad = null; });
  return initial;
}

/** Never apply a preloaded response to a changed location, date or clock mode.
 * Bound live adoption by monotonic time, including a delayed/suspended mount. */
export function matchingInitialSkyLoad(initial: InitialSkyLoad | null, day: string, location: LocationInput, detail: "placements" | "full" = "full"): InitialSkyLoad | null {
  if (!initial || (initial.detail ?? "full") !== detail || initial.day !== day || initial.location.latitude !== location.latitude
    || initial.location.longitude !== location.longitude || initial.location.timeZone !== location.timeZone
    || initial.live !== Boolean(liveSkyReference(day, location.timeZone))
    || performance.now() - initial.startedAt > 10_000) return null;
  return initial;
}
