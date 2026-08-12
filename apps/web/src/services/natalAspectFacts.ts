import {
  calculateSkyAspects,
  canonicalizeNodeAxisAspects,
  SKY_ASPECT_POINT_ORDER
} from "@tldr/astro-knowledge/sky-aspect-engine";
import type { PlanetPosition, SkySnapshot } from "../types";

type NatalAspectSnapshot = Pick<SkySnapshot, "positions" | "aspects">;

const canonicalNatalPoints = new Set<string>(SKY_ASPECT_POINT_ORDER);

function canonicalNatalPositions(positions: readonly PlanetPosition[]) {
  return positions.flatMap((position) => {
    if (
      !canonicalNatalPoints.has(position.planet)
      || typeof position.longitude !== "number"
      || !Number.isFinite(position.longitude)
    ) {
      return [];
    }

    return [{
      planet: position.planet,
      longitude: position.longitude,
      speed: position.speed
    }];
  });
}

/**
 * Natal reader surfaces derive aspects from the chart's fixed longitudes.
 * The snapshot's incoming `aspects` array is deliberately ignored: it may be
 * stale, transit-timed, hydrated through a cross-surface alias, or otherwise
 * inconsistent with the natal positions.
 */
export function canonicalNatalAspectsForSnapshot(
  snapshot: NatalAspectSnapshot | null | undefined
): SkySnapshot["aspects"] {
  if (!snapshot) return [];

  const calculated = calculateSkyAspects(canonicalNatalPositions(snapshot.positions));
  return canonicalizeNodeAxisAspects(calculated);
}
