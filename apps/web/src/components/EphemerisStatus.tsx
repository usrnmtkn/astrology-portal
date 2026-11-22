import { useEffect, useSyncExternalStore } from "react";
import { readEphemerisHealth, refreshEphemerisHealth, subscribeEphemerisHealth } from "../services/ephemerisHealth";
import EphemerisWarning from "./EphemerisWarning";

function retry() {
  void refreshEphemerisHealth();
  window.dispatchEvent(new Event("tldr:ephemeris-retry"));
}

export function EphemerisStatus({ retainedAt, timeZone }: { retainedAt?: string; timeZone?: string }) {
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
  if (!degraded) return null;
  return <EphemerisWarning onRetry={retry}>
    <p><strong>{retainedAt ? "Live calculations are temporarily unavailable." : "Some astronomy calculations are temporarily unavailable."}</strong>{retainedAt
      ? ` Showing the last verified calculation from ${new Date(retainedAt).toLocaleString([], { timeZone: timeZone || "UTC", timeZoneName: "short" })}.`
      : " Affected readings may need another try."}</p>
  </EphemerisWarning>;
}
