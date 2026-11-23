import { getAstrodienstSky } from "../../apps/web/src/services/ephemeris.js";
import { isVerifiedSkySnapshot } from "../../apps/web/src/services/verifiedSkyCache.js";
import { withRequestDeadline } from "../../apps/web/src/services/requestDeadline.js";
import { ASTROLOGY_CALCULATION_CONTRACT, SWISS_EPHEMERIS_FLAG, MOSHIER_EPHEMERIS_FLAG } from "../../apps/web/src/services/astrologyFacts.js";
import { EPHEMERIS_HEALTH_SCHEMA, type EphemerisDependency, type EphemerisHealthReport } from "../../src/shared/ephemerisHealth.mjs";
import { calculationApiBaseUrl } from "./calculation-api.js";

const probeLocation = { label: "Health check", latitude: 0, longitude: 0, timeZone: "UTC" };
const elapsed = (start: number) => Math.round(performance.now() - start);

export async function checkCalculationReadiness(fetcher: typeof fetch = fetch, timeoutMs = 2_500): Promise<EphemerisDependency> {
  const start = performance.now();
  const target = `${calculationApiBaseUrl()}/ready`;
  try {
    return await withRequestDeadline<EphemerisDependency>(async signal => {
      const response = await fetcher(target, { cache: "no-store", signal });
      const payload = await response.json();
      const engine = payload?.ephemeris;
      if (!response.ok || payload?.ok !== true || engine?.ready !== true || engine.available !== true
        || engine.actualEngine !== "swiss" || engine.fallback !== false || engine.degraded !== false
        || !Number.isFinite(Date.parse(payload.checkedAt)) || Math.abs(Date.now() - Date.parse(payload.checkedAt)) > 120_000
        || !Array.isArray(engine.checks) || !["Sun", "Moon", "True Black Moon Lilith"].every(body =>
          engine.checks.some((check: { body?: string }) => check.body === body))
        || !engine.checks.every((check: { ok?: boolean; engine?: string; returnedFlags?: number }) =>
          check.ok === true && check.engine === "swiss" && Number.isInteger(check.returnedFlags)
          && (check.returnedFlags! & SWISS_EPHEMERIS_FLAG) === SWISS_EPHEMERIS_FLAG && (check.returnedFlags! & MOSHIER_EPHEMERIS_FLAG) === 0)) {
        return { ok: false, elapsedMs: elapsed(start), code: "unready", error: "The calculation service could not verify Swiss Ephemeris readiness." };
      }
      return { ok: true, elapsedMs: elapsed(start), detail: { host: new URL(target).host, actualEngine: "swiss" } };
    }, { timeoutMs });
  } catch (error) {
    const code = (error as Error)?.name === "TimeoutError" ? "timeout" : "unavailable";
    return { ok: false, elapsedMs: elapsed(start), code, error: "The calculation readiness check did not complete." };
  }
}

export async function checkRuntimeEphemeris(calculate = getAstrodienstSky, date = new Date(), timeoutMs = 4_000): Promise<EphemerisDependency> {
  const start = performance.now();
  try {
    return await withRequestDeadline<EphemerisDependency>(async () => {
      const sky = await calculate(probeLocation, date, { includeTransitWindows: false, includeAspectTiming: false });
      if (!isVerifiedSkySnapshot(sky) || sky.generatedAt !== date.toISOString() || sky.positions.length !== 14
        || sky.location.latitude !== 0 || sky.location.longitude !== 0 || sky.location.timeZone !== "UTC"
        || sky.calculationProvenance?.nodeType !== ASTROLOGY_CALCULATION_CONTRACT.nodeType) {
        return { ok: false, elapsedMs: elapsed(start), code: "invalid_facts", error: "The runtime calculation did not return verified facts for the requested inputs." };
      }
      return { ok: true, elapsedMs: elapsed(start), detail: { actualEngine: "swiss", positions: sky.positions.length, calculationVersion: sky.calculationProvenance!.calculationVersion } };
    }, { timeoutMs });
  } catch (error) {
    const code = (error as Error)?.name === "TimeoutError" ? "timeout" : "unavailable";
    return { ok: false, elapsedMs: elapsed(start), code, error: "The runtime ephemeris check did not complete." };
  }
}

let recentReport: EphemerisHealthReport | undefined;
let pendingReport: Promise<EphemerisHealthReport> | undefined;

export async function ephemerisHealthReport(): Promise<EphemerisHealthReport> {
  // Share concurrent probes per function instance without presenting an old
  // observation as newly checked. Clients still enforce report freshness.
  if (recentReport && Date.now() - Date.parse(recentReport.timestamp) < 15_000) return recentReport;
  if (pendingReport) return pendingReport;
  pendingReport = collectEphemerisHealthReport().then(report => { recentReport = report; return report; })
    .finally(() => { pendingReport = undefined; });
  return pendingReport;
}

async function collectEphemerisHealthReport(): Promise<EphemerisHealthReport> {
  const [ephemeris, skyCalculationApi] = await Promise.all([checkRuntimeEphemeris(), checkCalculationReadiness()]);
  const ok = ephemeris.ok && skyCalculationApi.ok;
  return { schema: EPHEMERIS_HEALTH_SCHEMA, ok, status: ok ? "ok" : "degraded", timestamp: new Date().toISOString(),
    revision: process.env.VERCEL_GIT_COMMIT_SHA || undefined, dependencies: { ephemeris, skyCalculationApi } };
}
