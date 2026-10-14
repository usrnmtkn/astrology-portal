import { useId } from "react";
import "../../../apps/web/src/styles/loading.css";

/** Decorative only; the parent owns the accessible status and readiness. */
export function LoadingIndicator({ compact = false }: { compact?: boolean }) {
  const discId = useId();
  return <svg className={`loading-moon${compact ? " loading-moon--compact" : ""}`} viewBox={compact ? "-16 -16 32 32" : "-24 -24 48 48"} aria-hidden>
    <mask id={discId}>
      <circle r="15" fill="white" />
      <circle className="loading-moon__shadow" r="15.5" fill="black" />
    </mask>
    <circle r="15" mask={`url(#${discId})`} />
    <circle r="15" />
  </svg>;
}
