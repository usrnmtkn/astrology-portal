import { RefreshCw, TriangleAlert } from "lucide-react";
import "../styles/ephemeris-status.css";

export type EphemerisWarningProps = { retainedAt?: string; timeZone?: string; onRetry: () => void };

function observeStatusHeight(element: HTMLElement | null) {
  if (!element) return;
  let previous = 0;
  const setHeight = (height: number) => {
    if (height === previous) return;
    const scrollTop = window.scrollY;
    document.documentElement.style.setProperty("--app-notice-height", `${height}px`);
    if (scrollTop > 0) window.scrollTo({ top: scrollTop + height - previous, behavior: "instant" });
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
}

export default function EphemerisWarning({ retainedAt, timeZone, onRetry }: EphemerisWarningProps) {
  return <aside ref={observeStatusHeight} className="ephemeris-status" role="status" aria-live="polite" aria-label="Astronomy service warning" data-ephemeris-status="degraded">
    <TriangleAlert className="ephemeris-status__icon" aria-hidden="true" focusable="false" />
    <p><strong>{retainedAt ? "Live calculations are temporarily unavailable." : "Some astronomy calculations are temporarily unavailable."}</strong>{retainedAt
      ? ` Showing the last verified calculation from ${new Date(retainedAt).toLocaleString([], { timeZone: timeZone || "UTC", timeZoneName: "short" })}.`
      : " Affected readings may need another try."}</p>
    <button type="button" aria-label="Check again" title="Check again" onClick={onRetry}><RefreshCw aria-hidden="true" focusable="false" /></button>
  </aside>;
}
