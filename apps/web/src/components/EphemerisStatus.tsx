import { useEffect, useSyncExternalStore } from "react";
import { readEphemerisHealth, refreshEphemerisHealth, subscribeEphemerisHealth } from "../services/ephemerisHealth";
import "../styles/ephemeris-status.css";

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
  return <aside className="ephemeris-status" role="status" aria-live="polite" data-ephemeris-status="degraded">
    <p>{retainedAt
      ? <>Live calculations are temporarily unavailable. Showing the last verified calculation from {new Date(retainedAt).toLocaleString([], { timeZone: timeZone || "UTC", timeZoneName: "short" })}.</>
      : "Some astronomy calculations are temporarily unavailable. Affected readings may need another try."}</p>
    <button type="button" className="load-error__retry" onClick={() => {
      void refreshEphemerisHealth();
      window.dispatchEvent(new Event("tldr:ephemeris-retry"));
    }}>Check again</button>
  </aside>;
}
