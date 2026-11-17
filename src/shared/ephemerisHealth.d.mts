export type EphemerisDependency = {
  ok: boolean;
  elapsedMs: number;
  code?: "timeout" | "unavailable" | "unready" | "invalid_facts";
  error?: string;
  detail?: Record<string, unknown>;
};
export type EphemerisHealthReport = {
  schema: "ephemeris-health/v1";
  ok: boolean;
  status: "ok" | "degraded";
  timestamp: string;
  revision?: string;
  dependencies: { ephemeris: EphemerisDependency; skyCalculationApi: EphemerisDependency };
};
export const EPHEMERIS_HEALTH_SCHEMA: "ephemeris-health/v1";
export const EPHEMERIS_HEALTH_MAX_AGE_MS: number;
export function isEphemerisHealthReport(value: unknown, now?: number): value is EphemerisHealthReport;
