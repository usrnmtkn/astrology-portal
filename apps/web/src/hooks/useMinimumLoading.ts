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

  const pending = isLoading || performance.now() < cycle.until;

  useEffect(() => {
    if (isLoading || !pending) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const release = () => {
      const remaining = cycle.until - performance.now();
      // The commit may have crossed the deadline since render. Always refresh
      // that pending render, and reschedule a timer that wakes slightly early.
      if (remaining <= 0) tick(value => value + 1);
      else timer = setTimeout(release, Math.ceil(remaining));
    };
    release();
    return () => clearTimeout(timer);
  }, [isLoading, cycle.until, pending]);

  return pending;
}
