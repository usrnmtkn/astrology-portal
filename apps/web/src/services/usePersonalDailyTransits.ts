import { useEffect, useState } from "react";
import type { PersonalDailyPeak } from "./personalDailyTransits";
import type { NatalTransitTiming } from "./ephemeris";
import { transitToNatalOrbLimit } from "../astrologyConfig";

type PeakRequest = { planets: string[]; targets: Array<{ planet: string; longitude: number }>; referenceAt: string; timeZone: string };
const peaksCache = new Map<string, Promise<PersonalDailyPeak[]>>();

export function usePersonalDailyPeaks(request: PeakRequest | null) {
  const key = request ? JSON.stringify(request) : "";
  const [state, setState] = useState<{ key: string; status: "ready" | "error"; peaks: PersonalDailyPeak[] } | null>(null);
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    if (!key) return;
    let cancelled = false;
    let pending = peaksCache.get(key);
    if (!pending) {
      const input = JSON.parse(key) as PeakRequest;
      pending = import("./skyCalculationClient").then(({ natalDailyTransitPeaksForOffMainThread }) =>
        natalDailyTransitPeaksForOffMainThread(input.planets, input.targets, input.referenceAt, input.timeZone));
      peaksCache.set(key, pending);
      if (peaksCache.size > 12) peaksCache.delete(peaksCache.keys().next().value!);
      void pending.catch(() => { if (peaksCache.get(key) === pending) peaksCache.delete(key); });
    }
    void pending.then(peaks => {
      if (!cancelled) setState({ key, status: "ready", peaks });
    }, () => {
      if (!cancelled) setState({ key, status: "error", peaks: [] });
    });
    return () => { cancelled = true; };
  }, [key, retry]);
  return {
    status: !key ? "idle" : state?.key === key ? state.status : "loading",
    peaks: state?.key === key ? state.peaks : [],
    retry: () => { setState(null); setRetry(value => value + 1); }
  };
}

type SeriesContact = { id: string; transitPlanet: string; natalLongitude?: number; aspectDegrees?: number; dailyPeak?: PersonalDailyPeak };
export function usePersonalTransitSeries(contacts: SeriesContact[], referenceAt: string, timeZone: string) {
  const key = JSON.stringify(contacts.map(contact => ({
    id: contact.id, planet: contact.transitPlanet, longitude: contact.natalLongitude,
    aspect: contact.aspectDegrees,
    // A Moon contact exact early/late on the selected date can be out of orb at
    // noon. Its series must be calculated around that verified event instead.
    referenceAt: contact.dailyPeak?.exactToday[0] ?? referenceAt, timeZone
  })));
  const [state, setState] = useState<{ key: string; timings: Map<string, NatalTransitTiming | null> } | null>(null);
  useEffect(() => {
    let cancelled = false;
    const inputs = JSON.parse(key) as Array<{ id: string; planet: string; longitude: number; aspect: number; referenceAt: string; timeZone: string }>;
    if (!inputs.length) return;
    void import("./skyCalculationClient").then(async ({ natalTransitTimingForOffMainThread: calculate }) => {
      await Promise.all(inputs.map(async input => {
        const timing = Number.isFinite(input.longitude) && Number.isFinite(input.aspect)
          ? await calculate(input.planet, input.longitude, input.referenceAt, {
            aspectDegrees: input.aspect, presentationDegrees: transitToNatalOrbLimit(input.planet), timeZone: input.timeZone
          }).catch(() => null) : null;
        if (!cancelled) setState(current => ({ key,
          timings: new Map([...(current?.key === key ? current.timings : []), [input.id, timing]])
        }));
      }));
    }).catch(() => {
      if (!cancelled) setState({ key, timings: new Map(inputs.map(input => [input.id, null])) });
    });
    return () => { cancelled = true; };
  }, [key]);
  return state?.key === key ? state.timings : new Map<string, NatalTransitTiming | null>();
}
