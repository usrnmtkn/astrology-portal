import { useEffect, useState } from "react";

export const MINIMUM_SKELETON_MS = 280;

/** Hold each loading cycle, including a fast response, without delaying errors
 * or requests themselves. Callers bypass the presentation hold on error. */
export function useMinimumLoading(isLoading: boolean, minimumMs = MINIMUM_SKELETON_MS) {
  const [cycle, setCycle] = useState(() => ({
    loading: isLoading,
    until: isLoading ? performance.now() + minimumMs : 0
  }));
  const [, tick] = useState(0);

  // Adjust before children commit: a later loading cycle must never flash its
  // resolved content first. The deadline survives rerenders and StrictMode.
  if (cycle.loading !== isLoading) {
    setCycle({ loading: isLoading, until: isLoading ? performance.now() + minimumMs : cycle.until });
  }

  useEffect(() => {
    if (isLoading) return;
    const remaining = cycle.until - performance.now();
    if (remaining <= 0) return;
    const timer = setTimeout(() => tick(value => value + 1), Math.ceil(remaining));
    return () => clearTimeout(timer);
  }, [isLoading, cycle.until]);

  return isLoading || performance.now() < cycle.until;
}
