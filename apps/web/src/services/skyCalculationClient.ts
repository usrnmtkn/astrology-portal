import type { LocationInput, SkySnapshot } from "../types.js";
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

function workerForSkyCalculations() {
  if (skyWorker) return skyWorker;

  const worker = new Worker(new URL("./skyCalculation.worker.ts", import.meta.url), {
    type: "module",
    name: "tldrastro-sky-calculation"
  });

  worker.addEventListener("message", (event: MessageEvent<SkyCalculationResponse>) => {
    const response = event.data;
    const pending = pendingCalculations.get(response.id);
    if (!pending) return;

    pendingCalculations.delete(response.id);
    clearTimeout(pending.timeout);
    if (response.ok) pending.resolve(response.value);
    else pending.reject(new Error(response.error));
  });

  worker.addEventListener("error", (event) => {
    if (skyWorker !== worker) return;
    rejectPendingCalculations(new Error(event.message || "The sky calculation worker stopped unexpectedly."));
    worker.terminate();
    if (skyWorker === worker) skyWorker = null;
  });

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
      skyWorker?.terminate();
      skyWorker = null;
      rejectPendingCalculations(new Error("Astronomy calculation timed out. Please retry."));
    }, 120_000);
    pendingCalculations.set(id, { resolve: (value) => resolve(value as T), reject, timeout });
    try {
      workerForSkyCalculations().postMessage({ id, ...message });
    } catch (error) {
      clearTimeout(timeout);
      pendingCalculations.delete(id);
      reject(error);
    }
  });
}

export function getAstrodienstSkyOffMainThread(
  location: LocationInput,
  date: Date,
  options: SkyCalculationOptions = {}
): Promise<SkySnapshot> {
  if (typeof Worker === "undefined") {
    return loadEphemerisForNonBrowserRuntime().then(({ getAstrodienstSky }) => (
      getAstrodienstSky(location, date, options)
    ));
  }
  return requestCalculation({ kind: "sky", location, date: date.toISOString(), options });
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
  location: LocationInput, planet: string, sign: string, referenceDate: Date, includeAspectLists = false
): Promise<SkySnapshot> {
  const key = JSON.stringify([location, planet, sign, referenceDate.toISOString(), includeAspectLists]);
  const cached = placementSnapshotCache.get(key);
  if (cached) return cached;
  const pending = typeof Worker === "undefined"
    ? loadEphemerisForNonBrowserRuntime().then(({ getSkyPlacementSnapshot }) => getSkyPlacementSnapshot(location, planet, sign, referenceDate, includeAspectLists))
    : requestCalculation<SkySnapshot>({ kind: "placement-sky", location, planet, sign, includeAspectLists, date: referenceDate.toISOString() });
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
