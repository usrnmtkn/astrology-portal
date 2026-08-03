import { useEffect, useState } from "react";
import type { LocationInput } from "../../types";
import {
  getPersonalTiming,
  isTldrAstroApiConfigured
} from "../../services/tldrastroApi";
import type {
  PersonalTimingResponse,
  TldrAstroChartSettings,
  TldrAstroSubject
} from "../../services/tldrastroApi";

export type PersonalTimingStatus = "idle" | "loading" | "ready" | "error";

type UsePersonalTimingOptions = {
  enabled: boolean;
  natalSubject: TldrAstroSubject | null;
  settings: TldrAstroChartSettings;
  targetDate: string;
  targetLocation: LocationInput | null;
};

export function usePersonalTiming({
  enabled,
  natalSubject,
  settings,
  targetDate,
  targetLocation
}: UsePersonalTimingOptions) {
  const [response, setResponse] = useState<PersonalTimingResponse | null>(null);
  const [status, setStatus] = useState<PersonalTimingStatus>("idle");

  useEffect(() => {
    if (
      !enabled
      || !isTldrAstroApiConfigured
      || !natalSubject?.datetime.timeKnown
      || !targetLocation
    ) {
      setResponse(null);
      setStatus("idle");
      return;
    }

    let cancelled = false;
    const controller = new AbortController();
    setStatus("loading");

    getPersonalTiming({
      natalSubject,
      targetDatetime: {
        date: targetDate,
        time: "12:00",
        timeKnown: true,
        timeZone: targetLocation.timeZone
      },
      targetLocation,
      settings,
      includeContentFacts: true,
      maxTransits: 8
    }, {
      signal: controller.signal
    })
      .then((nextResponse) => {
        if (!cancelled) {
          setResponse(nextResponse);
          setStatus("ready");
        }
      })
      .catch((error) => {
        if (!cancelled) {
          console.warn("TLDR Astro personal timing API failed; using local transit rows.", error);
          setResponse(null);
          setStatus("error");
        }
      });

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [enabled, natalSubject, settings, targetDate, targetLocation]);

  return { response, status };
}
