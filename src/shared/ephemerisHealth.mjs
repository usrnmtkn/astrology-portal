export const EPHEMERIS_HEALTH_SCHEMA = "ephemeris-health/v1";
export const EPHEMERIS_HEALTH_MAX_AGE_MS = 120_000;

/** A cached, malformed, or internally inconsistent health response is unknown. */
export function isEphemerisHealthReport(value, now = Date.now()) {
  if (!value || value.schema !== EPHEMERIS_HEALTH_SCHEMA || typeof value.ok !== "boolean" || typeof value.timestamp !== "string") return false;
  const age = now - Date.parse(value.timestamp);
  if (!Number.isFinite(age) || age < -5_000 || age > EPHEMERIS_HEALTH_MAX_AGE_MS) return false;
  const checks = [value.dependencies?.ephemeris, value.dependencies?.skyCalculationApi];
  if (!checks.every(check => check && typeof check.ok === "boolean"
    && Number.isFinite(check.elapsedMs) && check.elapsedMs >= 0
    && (!check.ok || check.detail?.actualEngine === "swiss"))) return false;
  return value.ok === checks.every(check => check.ok)
    && value.status === (value.ok ? "ok" : "degraded");
}
