import type { SkySnapshot } from "../types";
import { natalSnapshotWithBirthTimeReliability } from "./birthTimeReliability";
import { natalSectForSnapshot, SOLAR_HORIZON_VERSION } from "../../../../src/shared/solarHorizon.js";

export function friendSafeNatalChart(chart: SkySnapshot | null | undefined, birthTimeKnown = false): SkySnapshot | null {
  const reliableChart = natalSnapshotWithBirthTimeReliability(chart, birthTimeKnown);
  if (!reliableChart) return null;
  return {
    ...reliableChart,
    location: { label: "Private birth location", latitude: 0, longitude: 0 },
    generatedAt: "",
    solarHorizon: undefined,
    sharedNatalSect: { version: SOLAR_HORIZON_VERSION, value: natalSectForSnapshot(reliableChart) },
    solarDaylight: undefined,
    moonEvent: undefined,
    moonSignTransition: undefined,
    facts: undefined,
    dailyEvents: undefined
  };
}
