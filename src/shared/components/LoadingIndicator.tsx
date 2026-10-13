import { useId } from "react";
import "../../../apps/web/src/styles/loading.css";

/** Decorative only; the parent owns the accessible status and readiness. */
export function LoadingIndicator({ compact = false }: { compact?: boolean }) {
  const discId = useId();
  return <svg className={`loading-moon${compact ? " loading-moon--compact" : ""}`} viewBox={compact ? "8 8 32 32" : "0 0 48 48"} aria-hidden="true">
    <defs><mask id={discId}>
      <circle cx="24" cy="24" r="15" fill="white" />
      <circle className="loading-moon__shadow" cx="24" cy="24" r="15.5" fill="black" />
    </mask></defs>
    <circle cx="24" cy="24" r="15" fill="currentColor" mask={`url(#${discId})`} />
    <circle className="loading-moon__outline" cx="24" cy="24" r="15" fill="none" stroke="currentColor" />
  </svg>;
}
