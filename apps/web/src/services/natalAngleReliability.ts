import type { SkySnapshot } from "../types";

/**
 * Unknown-birth-time manual charts are calculated at noon so their planet
 * positions remain usable. Any angle longitudes on that noon snapshot are
 * placeholders, not reliable natal angles, and must never feed angle-based
 * transit targeting.
 */
export function natalChartWithReliableAngleLongitudes<T extends SkySnapshot | null | undefined>(
  natalChart: T,
  birthTimeUnknown: boolean
): T {
  if (!natalChart || !birthTimeUnknown) {
    return natalChart;
  }

  if (natalChart.ascendantLongitude === undefined && natalChart.midheavenLongitude === undefined) {
    return natalChart;
  }

  return {
    ...natalChart,
    ascendantLongitude: undefined,
    midheavenLongitude: undefined
  } as T;
}
