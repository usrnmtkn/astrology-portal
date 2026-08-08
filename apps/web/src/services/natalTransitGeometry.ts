export type NatalTransitDirection = "applying" | "separating";

export type NatalTransitGeometry = {
  direction?: NatalTransitDirection;
  exactOffsetDays?: number;
  residualDegrees: number;
};

const STATION_SPEED_THRESHOLD = 0.01;

export function normalizeSignedDegrees(value: number) {
  const normalized = ((value + 180) % 360 + 360) % 360 - 180;
  return normalized === -180 ? 180 : normalized;
}

/**
 * Resolve the directed aspect branch nearest the current transit position.
 * Square, trine, and sextile each have two valid branches; retaining the
 * branch sign is what makes a retrograde re-hit classify correctly.
 */
export function natalTransitGeometry(
  transitingLongitude: number,
  natalLongitude: number,
  exactAngle: number,
  signedSpeed?: number | null
): NatalTransitGeometry {
  const directedSeparation = normalizeSignedDegrees(transitingLongitude - natalLongitude);
  const branches = exactAngle === 0 || exactAngle === 180
    ? [exactAngle]
    : [exactAngle, -exactAngle];
  const residualDegrees = branches
    .map((branch) => normalizeSignedDegrees(directedSeparation - branch))
    .sort((first, second) => Math.abs(first) - Math.abs(second))[0] ?? 0;

  if (typeof signedSpeed !== "number" || !Number.isFinite(signedSpeed) || Math.abs(signedSpeed) < 0.000001) {
    return { residualDegrees };
  }

  const exactOffsetDays = -residualDegrees / signedSpeed;
  return {
    direction: exactOffsetDays >= 0 ? "applying" : "separating",
    exactOffsetDays,
    residualDegrees
  };
}

const MAX_WINDOW_DAYS: Record<string, number> = {
  Moon: 3,
  Sun: 14,
  Mercury: 30,
  Venus: 45,
  Mars: 90,
  Jupiter: 240,
  Saturn: 420,
  Uranus: 600,
  Neptune: 750,
  Pluto: 900,
  Chiron: 600,
  "North Node": 600,
  "South Node": 600
};

export function natalTransitWindowDays({
  planet,
  remainingOrb,
  signedSpeed,
  fallbackSpeed
}: {
  planet: string;
  remainingOrb: number;
  signedSpeed?: number | null;
  fallbackSpeed: number;
}) {
  const hasCurrentSpeed = typeof signedSpeed === "number" && Number.isFinite(signedSpeed);
  const speedMagnitude = hasCurrentSpeed ? Math.abs(signedSpeed) : Math.abs(fallbackSpeed);
  const stationary = hasCurrentSpeed && speedMagnitude < STATION_SPEED_THRESHOLD;
  const effectiveSpeed = Math.max(stationary ? STATION_SPEED_THRESHOLD / 4 : 0.0001, speedMagnitude);
  const maxDays = MAX_WINDOW_DAYS[planet] ?? 365;
  const days = Math.min(maxDays, remainingOrb / effectiveSpeed);

  return {
    days: Math.max(0.2, days),
    stationary,
    precise: !stationary
  };
}

export function natalTransitStationThreshold() {
  return STATION_SPEED_THRESHOLD;
}
