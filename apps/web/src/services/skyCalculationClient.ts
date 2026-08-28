import type { LocationInput, SkySnapshot } from "../types.js";
import type {
  LunarCalendarEvent,
  LunarCalendarMonth,
  MatchingNewMoonFact,
  natalTransitTimingFor as NatalTransitTimingFunction
} from "./ephemeris.js";

type SkyCalculationOptions = { includeTransitWindows?: boolean };
type SkyCalculationResponse =
  | { id: number; ok: true; value: unknown }
  | { id: number; ok: false; error: string };
type PendingCalculation = {
  resolve: (value: unknown) => void;
  reject: (error: Error) => void;
};

let skyWorker: Worker | null = null;
let nextRequestId = 1;
const pendingCalculations = new Map<number, PendingCalculation>();

function loadEphemerisForNonBrowserRuntime() {
  const modulePath = "./ephemeris.js";
  return import(/* @vite-ignore */ modulePath);
}

function rejectPendingCalculations(error: Error) {
  for (const { reject } of pendingCalculations.values()) reject(error);
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
    if (response.ok) pending.resolve(response.value);
    else pending.reject(new Error(response.error));
  });

  worker.addEventListener("error", (event) => {
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
    pendingCalculations.set(id, { resolve: (value) => resolve(value as T), reject });
    workerForSkyCalculations().postMessage({ id, ...message });
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
