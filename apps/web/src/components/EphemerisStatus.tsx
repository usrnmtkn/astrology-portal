import { lazy, Suspense, useEffect, useSyncExternalStore } from "react";
import { readEphemerisHealth, refreshEphemerisHealth, subscribeEphemerisHealth } from "../services/ephemerisHealth";
import type { EphemerisWarningProps } from "./EphemerisWarning";

const EphemerisWarning = lazy(() => import("./EphemerisWarning"));

function retry() {
  void refreshEphemerisHealth();
  window.dispatchEvent(new Event("tldr:ephemeris-retry"));
}

export function EphemerisStatus({ retainedAt, timeZone }: Omit<EphemerisWarningProps, "onRetry">) {
  const health = useSyncExternalStore(subscribeEphemerisHealth, readEphemerisHealth, readEphemerisHealth);
  useEffect(() => {
    const check = () => { if (document.visibilityState !== "hidden") void refreshEphemerisHealth(); };
    // Keep the selected reading ahead of the background probe on initial load.
    const start = window.setTimeout(check, 3_000);
    const timer = window.setInterval(check, 60_000);
    window.addEventListener("online", check);
    document.addEventListener("visibilitychange", check);
    return () => {
      clearTimeout(start); clearInterval(timer);
      window.removeEventListener("online", check);
      document.removeEventListener("visibilitychange", check);
    };
  }, []);
  const degraded = Boolean(retainedAt) || health.service?.ok === false || health.worker?.ok === false;
  return degraded ? <Suspense fallback={null}><EphemerisWarning retainedAt={retainedAt} timeZone={timeZone} onRetry={retry} /></Suspense> : null;
}
