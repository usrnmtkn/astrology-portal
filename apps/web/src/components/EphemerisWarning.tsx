import { useLayoutEffect, useRef } from "react";
import { RefreshCw, TriangleAlert } from "lucide-react";
import "../styles/ephemeris-status.css";

export type EphemerisWarningProps = { retainedAt?: string; timeZone?: string; onRetry: () => void };

export default function EphemerisWarning({ retainedAt, timeZone, onRetry }: EphemerisWarningProps) {
  const statusRef = useRef<HTMLElement>(null);
  useLayoutEffect(() => {
    const element = statusRef.current;
    if (!element) return;
    const root = document.documentElement;
    let previous = 0;
    const setHeight = (height: number) => {
      if (height === previous) return;
      const scrollTop = window.scrollY;
      if (height) root.style.setProperty("--app-notice-height", `${height}px`);
      else root.style.removeProperty("--app-notice-height");
      if (scrollTop > 0) window.scrollTo({ top: Math.max(0, scrollTop + height - previous), behavior: "instant" });
      previous = height;
    };
    const updateHeight = () => setHeight(element.getBoundingClientRect().height);
    updateHeight();
    const observer = new ResizeObserver(updateHeight);
    observer.observe(element);
    return () => {
      observer.disconnect();
      setHeight(0);
    };
  }, []);
  return <aside ref={statusRef} className="ephemeris-status" role="status" aria-live="polite" aria-label="Astronomy service warning" data-ephemeris-status="degraded">
    <TriangleAlert className="ephemeris-status__icon" aria-hidden="true" focusable="false" />
    <p>{retainedAt
      ? <><strong>Live calculations are temporarily unavailable.</strong> Showing the last verified calculation from {new Date(retainedAt).toLocaleString([], { timeZone: timeZone || "UTC", timeZoneName: "short" })}.</>
      : <><strong>Some astronomy calculations are temporarily unavailable.</strong> Affected readings may need another try.</>}</p>
    <button type="button" className="ephemeris-status__retry" aria-label="Check again" title="Check again" onClick={onRetry}><RefreshCw className="ephemeris-status__refresh-icon" aria-hidden="true" focusable="false" /></button>
  </aside>;
}
