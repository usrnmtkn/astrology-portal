import type { PlanetPosition } from "../types";

const lunarNodeNames = new Set(["North Node", "South Node", "True Node"]);

export function isLunarNodePoint(planet: string) {
  return lunarNodeNames.has(planet);
}

export function isDisplayRetrograde(
  position: Pick<PlanetPosition, "motion" | "planet">
) {
  return position.motion === "retrograde" && !isLunarNodePoint(position.planet);
}

export function astrologyDateRangeLabel(
  start: string,
  end: string,
  timeZone = "UTC"
) {
  const startDate = new Date(start);
  const endDate = new Date(end);

  if (
    Number.isNaN(startDate.getTime())
    || Number.isNaN(endDate.getTime())
    || endDate.getTime() < startDate.getTime()
  ) {
    throw new RangeError("Astrology date ranges require valid chronological timestamps.");
  }

  const formatter = new Intl.DateTimeFormat("en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone
  });

  return `${formatter.format(startDate)} - ${formatter.format(endDate)}`;
}

export function lunarNodeTransitRangeLabel(
  position: Pick<PlanetPosition, "planet" | "transitEnd" | "transitStart" | "transitTimeZone">
) {
  if (!isLunarNodePoint(position.planet) || !position.transitStart || !position.transitEnd) {
    return null;
  }

  return astrologyDateRangeLabel(
    position.transitStart,
    position.transitEnd,
    position.transitTimeZone || "UTC"
  );
}
