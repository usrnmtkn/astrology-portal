export type NatalSect = "day" | "night";

export const SOLAR_HORIZON_VERSION = "solar-horizon-v1";
// Conservative application boundary, not a change to the traditional doctrine.
// Near the horizon, a rounded birth time cannot support a confident selection.
export const SECT_HORIZON_MARGIN_DEGREES = 0.25;

export type SolarHorizon = {
  version: typeof SOLAR_HORIZON_VERSION;
  altitude: number;
  instant: string;
};

export type SharedNatalSect = { version: typeof SOLAR_HORIZON_VERSION; value: NatalSect | null };

export function hasCalculatedSolarHorizon(snapshot: { generatedAt: string; solarHorizon?: SolarHorizon } | null | undefined): boolean {
  const horizon = snapshot?.solarHorizon;
  return Boolean(horizon && horizon.version === SOLAR_HORIZON_VERSION && horizon.instant === snapshot?.generatedAt
    && Number.isFinite(horizon.altitude) && Math.abs(horizon.altitude) <= 90);
}

/** Geometric solar-centre altitude. No refraction, civil-time or house inference. */
export function solarAltitudeFromEquatorial(rightAscension: number, declination: number,
  siderealHours: number, latitude: number, longitude: number): number {
  if (![rightAscension, declination, siderealHours, latitude, longitude].every(Number.isFinite)
    || Math.abs(latitude) > 90 || Math.abs(longitude) > 180 || Math.abs(declination) > 90) return NaN;
  const radians = Math.PI / 180;
  const hourAngle = (siderealHours * 15 + longitude - rightAscension) * radians;
  const sine = Math.sin(latitude * radians) * Math.sin(declination * radians)
    + Math.cos(latitude * radians) * Math.cos(declination * radians) * Math.cos(hourAngle);
  return Math.asin(Math.max(-1, Math.min(1, sine))) / radians;
}

export function natalSectFromAltitude(altitude: number | null | undefined, birthTimeKnown: boolean): NatalSect | null {
  if (!birthTimeKnown || typeof altitude !== "number" || !Number.isFinite(altitude)
    || Math.abs(altitude) > 90 || Math.abs(altitude) <= SECT_HORIZON_MARGIN_DEGREES) return null;
  return altitude > 0 ? "day" : "night";
}

export function natalSectForSnapshot(snapshot: {
  birthTimeKnown?: boolean;
  generatedAt: string;
  solarHorizon?: SolarHorizon;
  sharedNatalSect?: SharedNatalSect;
} | null | undefined): NatalSect | null {
  if (snapshot?.birthTimeKnown !== true) return null;
  if (snapshot.generatedAt === "" && snapshot.sharedNatalSect?.version === SOLAR_HORIZON_VERSION) {
    return ["day", "night"].includes(snapshot.sharedNatalSect.value ?? "") ? snapshot.sharedNatalSect.value : null;
  }
  const horizon = snapshot?.solarHorizon;
  if (!horizon || !hasCalculatedSolarHorizon(snapshot)) return null;
  return natalSectFromAltitude(horizon.altitude, snapshot?.birthTimeKnown === true);
}
