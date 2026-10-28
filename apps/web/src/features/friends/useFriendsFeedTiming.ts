import { useEffect, useState } from "react";
import type { TransitItem } from "../../App";
import { transitToNatalOrbLimit } from "../../astrologyConfig";
import type { PersonalDailyPeak } from "../../services/personalDailyTransits";

type Request = { id: string; transit: TransitItem };
type Timing = NonNullable<TransitItem["timing"]>;

/** The feed uses searched contact windows, rather than guessed activity times. */
export function useFriendsFeedTiming(requests: Request[], at: string, timeZone: string) {
  const [revision, setRevision] = useState(0);
  const key = JSON.stringify([at, timeZone, revision, requests.map(({ id, transit }) =>
    [id, transit.transitPlanet, transit.natalLongitude, transit.aspectDegrees, transit.dailyPeak?.exactToday[0]])]);
  const [state, setState] = useState<{ key: string; timings: Map<string, Timing>; error: boolean } | null>(null);

  useEffect(() => {
    if (!requests.length) return;
    let active = true;
    void import("../../services/skyCalculationClient").then(async ({ natalTransitTimingForOffMainThread }) => {
      const results = await Promise.allSettled(requests.map(async ({ id, transit }) => {
        const timing = await natalTransitTimingForOffMainThread(transit.transitPlanet, transit.natalLongitude!, transit.dailyPeak?.exactToday[0] ?? at, {
          aspectDegrees: transit.aspectDegrees,
          presentationDegrees: transitToNatalOrbLimit(transit.transitPlanet) || 1.5,
          timeZone
        });
        return [id, timing] as const;
      }));
      if (!active) return;
      const timings = new Map<string, Timing>();
      for (const result of results) {
        if (result.status === "fulfilled" && result.value[1]) timings.set(result.value[0], result.value[1]);
      }
      setState({ key, timings, error: results.some(result => result.status === "rejected") || timings.size !== requests.length });
    }).catch(() => {
      if (active) setState({ key, timings: new Map(), error: true });
    });
    return () => { active = false; };
    // The serialized key includes every calculation input and the retry revision.
  }, [key]);

  const current = state?.key === key ? state : null;
  return {
    timings: current?.timings,
    loading: requests.length > 0 && !current,
    error: current?.error ?? false,
    retry: () => setRevision(value => value + 1)
  };
}

type DailyRequest = { id: string; targets: Array<{ planet: string; longitude: number }> };

export function useFriendsFeedDailyPeaks(requests: DailyRequest[], planets: string[], at: string, timeZone: string) {
  const [revision, setRevision] = useState(0);
  const key = JSON.stringify([requests, planets, at, timeZone, revision]);
  const [state, setState] = useState<{ key: string; peaks: Map<string, PersonalDailyPeak[]>; error: boolean } | null>(null);
  useEffect(() => {
    if (!requests.length) return;
    let active = true;
    void import("../../services/skyCalculationClient").then(async ({ natalDailyTransitPeaksForOffMainThread: calculate }) => {
      const results = await Promise.allSettled(requests.map(async request =>
        [request.id, await calculate(planets, request.targets, at, timeZone)] as const));
      if (!active) return;
      const peaks = new Map<string, PersonalDailyPeak[]>();
      for (const result of results) if (result.status === "fulfilled") peaks.set(...result.value);
      setState({ key, peaks, error: results.some(result => result.status === "rejected") });
    }).catch(() => { if (active) setState({ key, peaks: new Map(), error: true }); });
    return () => { active = false; };
  }, [key]);
  const current = state?.key === key ? state : null;
  return { peaks: current?.peaks, loading: requests.length > 0 && !current, error: current?.error ?? false,
    retry: () => { setState(null); setRevision(value => value + 1); } };
}
