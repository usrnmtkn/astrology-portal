import "../styles/loading.css";

/** Decorative only; the parent owns the accessible status and readiness. */
export function LoadingIndicator({ compact = false }: { compact?: boolean }) {
  return <span className={`loading-spinner${compact ? " loading-spinner--compact" : ""}`} aria-hidden="true" />;
}
