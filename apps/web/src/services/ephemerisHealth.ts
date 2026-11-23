import { withRequestDeadline } from "./requestDeadline";

type Source = "service" | "worker" | "sky-api";
type Observation = { ok: boolean; observedAt: number };
let observations: Partial<Record<Source, Observation>> = {};
const listeners = new Set<() => void>();
export const readEphemerisHealth = () => observations;
export function subscribeEphemerisHealth(listener: () => void) {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}
export function observeEphemerisHealth(source: Source, ok: boolean) {
  const previous = observations[source];
  if (previous?.ok === ok) return;
  observations = { ...observations, [source]: { ok, observedAt: Date.now() } };
  for (const listener of listeners) listener();
  if (source === "service" && previous?.ok === false && ok && typeof window !== "undefined") {
    window.dispatchEvent(new Event("tldr:ephemeris-recovered"));
  }
}

let probe: Promise<void> | undefined;
export function refreshEphemerisHealth() {
  if (probe) return probe;
  probe = withRequestDeadline(async signal => {
    const response = await fetch("/api/health?scope=ephemeris", { cache: "no-store", signal });
    const report = await response.json();
    // Defer probe validation, keeping outage presentation available without a
    // later asset request. Import failure is an unavailable observation too.
    const { isEphemerisHealthReport } = await import("../../../../src/shared/ephemerisHealth.mjs");
    signal.throwIfAborted();
    observeEphemerisHealth("service", isEphemerisHealthReport(report) && response.ok && report.ok);
  }, { timeoutMs: 8_000 }).catch(() => observeEphemerisHealth("service", false))
    .finally(() => { probe = undefined; });
  return probe;
}
