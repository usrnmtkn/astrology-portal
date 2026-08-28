import type { LocationInput } from "../types.js";
import {
  getAstrodienstSky,
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
      options?: { includeTransitWindows?: boolean };
    }
  | { id: number; kind: "lunar-calendar-range"; args: Parameters<typeof getLunarCalendarRangeEvents> }
  | { id: number; kind: "lunar-calendar-month"; args: Parameters<typeof getLunarCalendarMonth> }
  | { id: number; kind: "lunar-calendar-week"; args: Parameters<typeof getLunarCalendarWeek> }
  | { id: number; kind: "matching-new-moon"; args: Parameters<typeof getMatchingNewMoonForFullMoon> }
  | { id: number; kind: "natal-transit-timing"; args: Parameters<typeof natalTransitTimingFor> }
  | { id: number; kind: "preload" };

type SkyCalculationResponse =
  | { id: number; ok: true; value: unknown }
  | { id: number; ok: false; error: string };

let calculationQueue = Promise.resolve();

async function calculate(request: SkyCalculationRequest) {
  switch (request.kind) {
    case "sky":
      return getAstrodienstSky(request.location, new Date(request.date), request.options);
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

self.addEventListener("message", (event: MessageEvent<SkyCalculationRequest>) => {
  const request = event.data;

  calculationQueue = calculationQueue.then(async () => {
    const value = await calculate(request);
    const response: SkyCalculationResponse = { id: request.id, ok: true, value };
    self.postMessage(response);
  }).catch((error: unknown) => {
    const response: SkyCalculationResponse = {
      id: request.id,
      ok: false,
      error: error instanceof Error ? error.message : String(error)
    };
    self.postMessage(response);
  });
});
