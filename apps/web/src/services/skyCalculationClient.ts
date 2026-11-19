import { observeEphemerisHealth } from "./ephemerisHealth";
import { isVerifiedSkySnapshot } from "./verifiedSkyCache";
import { ASTROLOGY_CALCULATION_CONTRACT } from "./astrologyFacts";
import type { LocationInput, SkySnapshot } from "../types.js";
import type { RetrogradeHistory } from "./retrogradeHistory.js";
import type { CalendarSkyEventSnapshot } from "./ephemeris.js";

export function getCalendarSkyEventSnapshotOffMainThread(location: LocationInput, route: string): Promise<CalendarSkyEventSnapshot | null> {
  if (typeof Worker === "undefined") return loadEphemerisForNonBrowserRuntime().then(module => module.getCalendarSkyEventSnapshot(location, route));
  return requestCalculation({ kind: "calendar-event-article", location, route });
}

export function getRetrogradeHistoryOffMainThread(planet: string, sign: string, referenceDate: Date): Promise<RetrogradeHistory> {
  if (typeof Worker === "undefined") return loadEphemerisForNonBrowserRuntime().then(({ getRetrogradeHistory }) => getRetrogradeHistory({ planet, sign, referenceDate }));
  return requestCalculation({ kind: "retrograde-history", planet, sign, date: referenceDate.toISOString() });
}
import type {
  SkyCalculationOptions,
  LunarCalendarEvent,
  LunarCalendarMonth,
  MatchingNewMoonFact,
  natalTransitTimingFor as NatalTransitTimingFunction
} from "./ephemeris.js";

type SkyCalculationResponse =
  | { id: number; ok: true; value: unknown }
  | { id: number; ok: false; error: string };
type PendingCalculation = {
  resolve: (value: unknown) => void;
  reject: (error: Error) => void;
  timeout: ReturnType<typeof setTimeout>;
};

let skyWorker: Worker | null = null;
let nextRequestId = 1;
const pendingCalculations = new Map<number, PendingCalculation>();

function loadEphemerisForNonBrowserRuntime() {
  const modulePath = "./ephemeris.js";
  return import(/* @vite-ignore */ modulePath);
}

function rejectPendingCalculations(error: Error) {
  for (const { reject, timeout } of pendingCalculations.values()) {
    clearTimeout(timeout);
    reject(error);
  }
  pendingCalculations.clear();
}

function failSkyWorker(error: Error, worker = skyWorker) {
  if (skyWorker !== worker) return;
  observeEphemerisHealth("worker", false);
  worker?.terminate();
  skyWorker = null;
  rejectPendingCalculations(error);
}

function workerForSkyCalculations() {
  if (skyWorker) return skyWorker;

  const worker = new Worker(new URL("./skyCalculation.worker.ts", import.meta.url), {
    type: "module",
    name: "tldrastro-sky-calculation"
  });

  const failWorker = (error: Error) => failSkyWorker(error, worker);
  worker.addEventListener("messageerror", () => failWorker(new Error("The astronomy worker returned an unreadable response.")));
  worker.addEventListener("message", (event: MessageEvent<SkyCalculationResponse>) => {
    if (skyWorker !== worker) return;
    const response = event.data;
    if (!response || !Number.isInteger(response.id) || typeof response.ok !== "boolean") {
      failWorker(new Error("The astronomy worker returned an invalid response."));
      return;
    }
    const pending = pendingCalculations.get(response.id);
    if (!pending) return;

    pendingCalculations.delete(response.id);
    clearTimeout(pending.timeout);
    observeEphemerisHealth("worker", response.ok);
    if (response.ok === true) pending.resolve(response.value);
    else pending.reject(new Error(response.error));
  });

  worker.addEventListener("error", event => failWorker(new Error(event.message || "The sky calculation worker stopped unexpectedly.")));

  skyWorker = worker;
  return worker;
}

function requestCalculation<T>(message: Record<string, unknown>): Promise<T> {
  if (typeof Worker === "undefined") {
    throw new Error("Astronomy calculations require Web Worker support.");
  }

  const id = nextRequestId;
  nextRequestId += 1;

  return new Promise<T>((resolve, reject) => {
    const timeout = setTimeout(() => {
      // A hung worker or missing asset must not leave every later route queued
      // forever. A retry creates a new worker with the original ephemeris inputs.
      failSkyWorker(new Error("Astronomy calculation timed out. Please retry."));
    }, message.kind === "sky" || message.kind === "preload" ? 30_000 : 120_000);
    pendingCalculations.set(id, { resolve: (value) => resolve(value as T), reject, timeout });
    try {
      workerForSkyCalculations().postMessage({ id, ...message });
    } catch (error) {
      failSkyWorker(error instanceof Error ? error : new Error("Astronomy calculation could not start."));
    }
  });
}

export function getAstrodienstSkyOffMainThread(
  location: LocationInput,
  date: Date,
  options: SkyCalculationOptions = {}
): Promise<SkySnapshot> {
  const calculation = typeof Worker === "undefined"
    ? loadEphemerisForNonBrowserRuntime().then(({ getAstrodienstSky }) => getAstrodienstSky(location, date, options))
    : requestCalculation<SkySnapshot>({ kind: "sky", location, date: date.toISOString(), options });
  return calculation.then(sky => {
    if (!isVerifiedSkySnapshot(sky) || sky.generatedAt !== date.toISOString() || sky.positions.length !== 14
      || sky.location.latitude !== location.latitude || sky.location.longitude !== location.longitude
      || sky.location.timeZone !== (location.timeZone || "UTC")
      || sky.calculationProvenance?.nodeType !== ASTROLOGY_CALCULATION_CONTRACT.nodeType) {
      observeEphemerisHealth("worker", false);
      throw new Error("The astronomy calculation could not verify the requested facts.");
    }
    return sky;
  });
}

export function getLunarCalendarRangeEventsOffMainThread(
  ...args: Parameters<typeof import("./ephemeris.js").getLunarCalendarRangeEvents>
): Promise<LunarCalendarEvent[]> {
  if (typeof Worker === "undefined") {
    return loadEphemerisForNonBrowserRuntime().then(({ getLunarCalendarRangeEvents }) => (
      getLunarCalendarRangeEvents(...args)
    ));
  }
  return requestCalculation({ kind: "lunar-calendar-range", args });
}

const placementSnapshotCache = new Map<string, Promise<SkySnapshot>>();

export function getSkyPlacementSnapshotOffMainThread(
  location: LocationInput, planet: string, sign: string, referenceDate: Date, includeAspectLists = false,
  timingScope: "all" | "placement" = "all"
): Promise<SkySnapshot> {
  const key = JSON.stringify([location, planet, sign, referenceDate.toISOString(), includeAspectLists, timingScope]);
  const cached = placementSnapshotCache.get(key);
  if (cached) return cached;
  const pending = typeof Worker === "undefined"
    ? loadEphemerisForNonBrowserRuntime().then(({ getSkyPlacementSnapshot }) => getSkyPlacementSnapshot(location, planet, sign, referenceDate, includeAspectLists, timingScope))
    : requestCalculation<SkySnapshot>({ kind: "placement-sky", location, planet, sign, includeAspectLists, timingScope, date: referenceDate.toISOString() });
  placementSnapshotCache.set(key, pending);
  if (placementSnapshotCache.size > 24) placementSnapshotCache.delete(placementSnapshotCache.keys().next().value!);
  void pending.catch(() => { if (placementSnapshotCache.get(key) === pending) placementSnapshotCache.delete(key); });
  return pending;
}

export function getLunarCalendarMonthOffMainThread(
  ...args: Parameters<typeof import("./ephemeris.js").getLunarCalendarMonth>
): Promise<LunarCalendarMonth> {
  if (typeof Worker === "undefined") {
    return loadEphemerisForNonBrowserRuntime().then(({ getLunarCalendarMonth }) => (
      getLunarCalendarMonth(...args)
    ));
  }
  return requestCalculation({ kind: "lunar-calendar-month", args });
}

export function getLunarCalendarWeekOffMainThread(
  ...args: Parameters<typeof import("./ephemeris.js").getLunarCalendarWeek>
): Promise<LunarCalendarMonth> {
  if (typeof Worker === "undefined") {
    return loadEphemerisForNonBrowserRuntime().then(({ getLunarCalendarWeek }) => (
      getLunarCalendarWeek(...args)
    ));
  }
  return requestCalculation({ kind: "lunar-calendar-week", args });
}

export function getMatchingNewMoonForFullMoonOffMainThread(
  ...args: Parameters<typeof import("./ephemeris.js").getMatchingNewMoonForFullMoon>
): Promise<MatchingNewMoonFact | null> {
  if (typeof Worker === "undefined") {
    return loadEphemerisForNonBrowserRuntime().then(({ getMatchingNewMoonForFullMoon }) => (
      getMatchingNewMoonForFullMoon(...args)
    ));
  }
  return requestCalculation({ kind: "matching-new-moon", args });
}

export function natalTransitTimingForOffMainThread(
  ...args: Parameters<typeof NatalTransitTimingFunction>
): ReturnType<typeof NatalTransitTimingFunction> {
  if (typeof Worker === "undefined") {
    return loadEphemerisForNonBrowserRuntime().then(({ natalTransitTimingFor }) => (
      natalTransitTimingFor(...args)
    ));
  }
  return requestCalculation({ kind: "natal-transit-timing", args });
}

export function natalDailyTransitPeaksForOffMainThread(
  ...args: Parameters<typeof import("./ephemeris.js").natalDailyTransitPeaksFor>
): ReturnType<typeof import("./ephemeris.js").natalDailyTransitPeaksFor> {
  if (typeof Worker === "undefined") {
    return loadEphemerisForNonBrowserRuntime().then(({ natalDailyTransitPeaksFor }) => natalDailyTransitPeaksFor(...args));
  }
  return requestCalculation({ kind: "natal-daily-peaks", args });
}

export function relationshipForecastDayOffMainThread(
  ...args: Parameters<typeof import("./ephemeris.js").relationshipForecastDayFor>
): ReturnType<typeof import("./ephemeris.js").relationshipForecastDayFor> {
  if (typeof Worker === "undefined") return loadEphemerisForNonBrowserRuntime().then(({ relationshipForecastDayFor }) => relationshipForecastDayFor(...args));
  return requestCalculation({ kind: "relationship-forecast-day", args });
}

export function preloadSwissEphemerisOffMainThread(): Promise<void> {
  if (typeof Worker === "undefined") {
    return loadEphemerisForNonBrowserRuntime().then(({ preloadSwissEphemeris }) => (
      preloadSwissEphemeris()
    ));
  }
  return requestCalculation({ kind: "preload" });
}

export function getSkyPlacementTransitFactsOffMainThread(planet: string, sign: string, referenceDate: Date, timeZone: string): Promise<import("./ephemeris.js").SkyPlacementTransitFacts> {
  if (typeof Worker === "undefined") return loadEphemerisForNonBrowserRuntime().then(({ getSkyPlacementTransitFacts }) => getSkyPlacementTransitFacts({ planet, sign, referenceDate, timeZone }));
  return requestCalculation({ kind: "placement-transit-facts", planet, sign, date: referenceDate.toISOString(), timeZone });
}
