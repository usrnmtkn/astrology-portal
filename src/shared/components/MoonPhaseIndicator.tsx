import { useId } from "react";

/** Decorative moon; the loading region owns the accessible status. */
export function MoonPhaseIndicator() {
  const discId = useId();
  return <svg className="loading-moon" viewBox="0 0 48 48" aria-hidden="true">
    <defs><mask id={discId}>
      <circle cx="24" cy="24" r="15" fill="white" />
      <circle className="loading-moon__shadow" cx="24" cy="24" r="15.5" fill="black" />
    </mask></defs>
    <circle cx="24" cy="24" r="15" fill="currentColor" mask={`url(#${discId})`} />
    <circle className="loading-moon__outline" cx="24" cy="24" r="15" fill="none" stroke="currentColor" />
  </svg>;
}
