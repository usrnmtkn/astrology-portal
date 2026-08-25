import { SKY_BODY_ORDER, normalizeSkyBodyName } from "../astrologyConfig";
import type { SkySnapshot } from "../types";

const timedNatalAngles = ["Ascendant", "Midheaven"] as const;

export type NatalChartPlacementCompleteness = {
  complete: boolean;
  expectedPlacementCount: number;
  missingPlacements: string[];
};

function hasFiniteAngle(value: number | undefined) {
  return typeof value === "number" && Number.isFinite(value);
}

/**
 * A saved natal snapshot is reader-ready only when every configured body is
 * present. Known-time charts must also carry both calculated angles. This is
 * an all-or-nothing display contract: callers must not render a partial chart.
 */
export function natalChartPlacementCompleteness(
  natalChart: SkySnapshot | null | undefined,
  birthTimeUnknown = false
): NatalChartPlacementCompleteness {
  if (!natalChart) {
    const missingPlacements = [
      ...SKY_BODY_ORDER,
      ...(birthTimeUnknown ? [] : timedNatalAngles)
    ];

    return {
      complete: false,
      expectedPlacementCount: missingPlacements.length,
      missingPlacements
    };
  }

  const availableBodies = new Set(
    natalChart.positions.map((position) => normalizeSkyBodyName(position.planet))
  );
  const missingPlacements: string[] = SKY_BODY_ORDER.filter(
    (placement) => !availableBodies.has(placement)
  );

  if (!birthTimeUnknown) {
    if (!hasFiniteAngle(natalChart.ascendantLongitude)) {
      missingPlacements.push("Ascendant");
    }

    if (!hasFiniteAngle(natalChart.midheavenLongitude)) {
      missingPlacements.push("Midheaven");
    }
  }

  return {
    complete: missingPlacements.length === 0,
    expectedPlacementCount: SKY_BODY_ORDER.length + (birthTimeUnknown ? 0 : timedNatalAngles.length),
    missingPlacements
  };
}

export function natalChartHasCompletePlacements(
  natalChart: SkySnapshot | null | undefined,
  birthTimeUnknown = false
) {
  return natalChartPlacementCompleteness(natalChart, birthTimeUnknown).complete;
}
