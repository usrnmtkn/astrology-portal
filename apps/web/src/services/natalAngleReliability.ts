import type { SkySnapshot } from "../types";
import { natalSnapshotWithBirthTimeReliability } from "./birthTimeReliability";

/**
 * Unknown-birth-time manual charts are calculated at noon so their planet
 * positions remain usable. Any time-dependent outputs on that noon snapshot are
 * placeholders, not reliable natal facts, and must never feed angle-, house-,
 * or timing-dependent behavior.
 *
 * This remains a second line of defense after persistence normalization. If an
 * older/local record ever carries contradictory provenance, `birthTimeUnknown`
 * wins and the snapshot is fully sanitized before it enters Friends state.
 */
export function natalChartWithReliableAngleLongitudes<T extends SkySnapshot | null | undefined>(
  natalChart: T,
  birthTimeUnknown: boolean
): T {
  if (!natalChart || !birthTimeUnknown) {
    return natalChart;
  }

  return natalSnapshotWithBirthTimeReliability(natalChart, false) as T;
}
