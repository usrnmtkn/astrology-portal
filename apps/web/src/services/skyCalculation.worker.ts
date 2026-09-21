import type { SkyCalculationOptions } from "./ephemeris.js";
import type { LocationInput } from "../types.js";
import {
  getAstrodienstSky,
  getSkyPlacementSnapshot,
  getSkyPlacementTransitFacts,
  getLunarCalendarMonth,
  getLunarCalendarRangeEvents,
  getLunarCalendarWeek,
  getMatchingNewMoonForFullMoon,
  natalTransitTimingFor,
  preloadSwissEphemeris
} from "./ephemeris.js";

type SkyCalculationRequest =
  | {
      id: number;
      kind: "sky";
      location: LocationInput;
      date: string;
      options?: SkyCalculationOptions;
    }
  | { id: number; kind: "lunar-calendar-range"; args: Parameters<typeof getLunarCalendarRangeEvents> }
  | { id: number; kind: "lunar-calendar-month"; args: Parameters<typeof getLunarCalendarMonth> }
  | { id: number; kind: "lunar-calendar-week"; args: Parameters<typeof getLunarCalendarWeek> }
  | { id: number; kind: "matching-new-moon"; args: Parameters<typeof getMatchingNewMoonForFullMoon> }
  | { id: number; kind: "natal-transit-timing"; args: Parameters<typeof natalTransitTimingFor> }
  | { id: number; kind: "placement-sky"; includeAspectLists?: boolean; location: LocationInput; planet: string; sign: string; date: string }
  | { id: number; kind: "placement-transit-facts"; planet: string; sign: string; date: string; timeZone: string }
  | { id: number; kind: "preload" };

type SkyCalculationResponse =
  | { id: number; ok: true; value: unknown }
  | { id: number; ok: false; error: string };

const foregroundQueue: SkyCalculationRequest[] = [];
const backgroundQueue: SkyCalculationRequest[] = [];
let draining = false;

async function calculate(request: SkyCalculationRequest) {
  switch (request.kind) {
    case "sky":
      return getAstrodienstSky(request.location, new Date(request.date), request.options);
    case "placement-transit-facts":
      return getSkyPlacementTransitFacts({ planet: request.planet, sign: request.sign, referenceDate: new Date(request.date), timeZone: request.timeZone });
    case "placement-sky":
      return getSkyPlacementSnapshot(request.location, request.planet, request.sign, new Date(request.date), request.includeAspectLists);
    case "lunar-calendar-range":
      return getLunarCalendarRangeEvents(...request.args);
    case "lunar-calendar-month":
      return getLunarCalendarMonth(...request.args);
    case "lunar-calendar-week":
      return getLunarCalendarWeek(...request.args);
    case "matching-new-moon":
      return getMatchingNewMoonForFullMoon(...request.args);
    case "natal-transit-timing":
      return natalTransitTimingFor(...request.args);
    case "preload":
      await preloadSwissEphemeris();
      return null;
  }
}

// Timing enrichment can enqueue dozens of calculations after You first paints.
// Yield between jobs so a later Calendar/Sky navigation can enter the queue,
// then serve visible-route facts before that optional background enrichment.
async function drainCalculations() {
  const request = foregroundQueue.shift() ?? backgroundQueue.shift();
  if (!request) {
    draining = false;
    return;
  }
  try {
    const value = await calculate(request);
    const response: SkyCalculationResponse = { id: request.id, ok: true, value };
    self.postMessage(response);
  } catch (error: unknown) {
    const response: SkyCalculationResponse = {
      id: request.id,
      ok: false,
      error: error instanceof Error ? error.message : String(error)
    };
    self.postMessage(response);
  } finally {
    setTimeout(drainCalculations, 0);
  }
}

self.addEventListener("message", (event: MessageEvent<SkyCalculationRequest>) => {
  const request = event.data;
  const queue = request.kind === "natal-transit-timing" ? backgroundQueue : foregroundQueue;
  queue.push(request);
  if (!draining) {
    draining = true;
    setTimeout(drainCalculations, 0);
  }
});
