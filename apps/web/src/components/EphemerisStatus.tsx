import { useEffect, useLayoutEffect, useRef, useSyncExternalStore } from "react";
import { RefreshCw, TriangleAlert } from "lucide-react";
import { readEphemerisHealth, refreshEphemerisHealth, subscribeEphemerisHealth } from "../services/ephemerisHealth";
import "../styles/ephemeris-status.css";

export function EphemerisStatus({ retainedAt, timeZone }: { retainedAt?: string; timeZone?: string }) {
  const statusRef = useRef<HTMLElement>(null);
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
  useLayoutEffect(() => {
    const element = statusRef.current;
    if (!degraded || !element) return;
    const root = document.documentElement;
    const setHeight = (height: number) => {
      const previous = Number.parseFloat(root.style.getPropertyValue("--app-notice-height")) || 0;
      if (height === previous) return;
      const scrollTop = window.scrollY;
      if (height) root.style.setProperty("--app-notice-height", `${height}px`);
      else root.style.removeProperty("--app-notice-height");
      if (scrollTop > 0) window.scrollTo({ top: Math.max(0, scrollTop + height - previous), behavior: "instant" });
    };
    const updateHeight = () => setHeight(element.getBoundingClientRect().height);
    updateHeight();
    const observer = new ResizeObserver(updateHeight);
    observer.observe(element);
    return () => {
      observer.disconnect();
      setHeight(0);
    };
  }, [degraded]);
  if (!degraded) return null;
  return <aside ref={statusRef} className="ephemeris-status" role="status" aria-live="polite" aria-label="Astronomy service warning" data-ephemeris-status="degraded">
    <TriangleAlert className="ephemeris-status__icon" aria-hidden="true" focusable="false" />
    <p>{retainedAt
      ? <><strong>Live calculations are temporarily unavailable.</strong> Showing the last verified calculation from {new Date(retainedAt).toLocaleString([], { timeZone: timeZone || "UTC", timeZoneName: "short" })}.</>
      : <><strong>Some astronomy calculations are temporarily unavailable.</strong> Affected readings may need another try.</>}</p>
    <button type="button" className="ephemeris-status__retry" aria-label="Check again" title="Check again" onClick={() => {
      void refreshEphemerisHealth();
      window.dispatchEvent(new Event("tldr:ephemeris-retry"));
    }}><RefreshCw className="ephemeris-status__refresh-icon" aria-hidden="true" focusable="false" /></button>
  </aside>;
}
