import { selectedMoonKind } from "./skyMoonSummary";
import { validSummaryGeometry } from "./skySummaryGeometry";
import type { PlanetPosition } from "../types";

export function skySummaryEventPlacements(event: { name: string; sign: string; eclipseType?: "solar" | "lunar" }, positions: PlanetPosition[]) {
  const sun = positions.find(position => position.planet === "Sun");
  const moon = positions.find(position => position.planet === "Moon");
  const kind = selectedMoonKind({ ...event, isToday: true });
  if (!sun || !moon || kind === "regular" || !validSummaryGeometry(sun.sign, moon.sign, kind)
    || moon.sign.toLowerCase() !== event.sign.toLowerCase()
    || [sun.degree, moon.degree].some(degree => !Number.isFinite(degree) || degree < 0 || degree >= 30)) {
    throw new Error("IMPOSSIBLE_SKY: exact lunation placements disagree with the calendar event.");
  }
  return { sun, moon };
}
