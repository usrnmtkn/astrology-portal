import type { PlanetPosition } from "../../types";
import { houseGlyph, pointGlyph, signGlyph } from "../../components/charts/chartAssets";

const zodiacSigns = [
  "Aries",
  "Taurus",
  "Gemini",
  "Cancer",
  "Leo",
  "Virgo",
  "Libra",
  "Scorpio",
  "Sagittarius",
  "Capricorn",
  "Aquarius",
  "Pisces"
];

function normalizedAngle(value: number) {
  return ((value % 360) + 360) % 360;
}

function angularDistance(first: number, second: number) {
  const difference = Math.abs(normalizedAngle(first - second));
  return difference > 180 ? 360 - difference : difference;
}

function zodiacSignForLongitude(longitude: number) {
  return zodiacSigns[Math.floor(normalizedAngle(longitude) / 30)] ?? "Aries";
}

function zodiacLongitude(position?: PlanetPosition) {
  if (!position) {
    return 0;
  }

  const signIndex = zodiacSigns.indexOf(position.sign);

  return (Math.max(signIndex, 0) * 30 + position.degree) % 360;
}

function positionFromLongitude({
  planet,
  glyph,
  longitude,
  theme
}: {
  planet: string;
  glyph: string;
  longitude: number;
  theme: string;
}): PlanetPosition {
  const normalizedLongitude = normalizedAngle(longitude);
  const sign = zodiacSignForLongitude(normalizedLongitude);

  return {
    planet,
    glyph,
    sign,
    signGlyph: signGlyph(sign),
    degree: normalizedLongitude % 30,
    house: 0,
    motion: "direct",
    theme
  };
}

export type SolarPhaseStatus = {
  label: string;
  tone: "muted" | "alert";
};

export function skyNodeDisplayPositions(positions: PlanetPosition[]) {
  const northNodeSource = positions.find((position) => position.planet === "North Node" || position.planet === "True Node");

  if (!northNodeSource) {
    return positions;
  }

  const northNode: PlanetPosition = {
    ...northNodeSource,
    planet: "North Node",
    glyph: "☊"
  };
  const southNodeBase = positionFromLongitude({
    planet: "South Node",
    glyph: "☋",
    longitude: zodiacLongitude(northNodeSource) + 180,
    theme: "release"
  });
  const southNode: PlanetPosition = {
    ...southNodeBase,
    house: northNodeSource.house,
    motion: northNodeSource.motion,
    transitStart: northNodeSource.transitStart,
    transitEnd: northNodeSource.transitEnd,
    transitRemainingLabel: northNodeSource.transitRemainingLabel
  };

  return [
    ...positions.filter((position) => position.planet !== "True Node" && position.planet !== "North Node" && position.planet !== "South Node"),
    northNode,
    southNode
  ];
}

export function wholeDegreeOrb(orb: number) {
  return `${Math.round(orb)}°`;
}

export function solarPhaseStatusFor(position: PlanetPosition, positions: PlanetPosition[]): SolarPhaseStatus | null {
  if (position.planet === "Sun") {
    return null;
  }

  const sun = positions.find((candidate) => candidate.planet === "Sun");

  if (!sun) {
    return null;
  }

  const separation = angularDistance(zodiacLongitude(position), zodiacLongitude(sun));
  const roundedSeparation = Math.round(separation);

  if (separation <= 0.3) {
    return { label: "CAZIMI", tone: "alert" };
  }

  if (separation <= 8) {
    return { label: `COMBUST · ${roundedSeparation}°`, tone: "alert" };
  }

  if (separation <= 17) {
    return { label: `NEARING THE BEAMS · ${roundedSeparation}°`, tone: "muted" };
  }

  return null;
}

export function placementStatuses(position: PlanetPosition) {
  const statuses: Array<{ label: string; tone: "muted" | "alert" | "retrograde" }> = [];

  if (position.motion === "retrograde") {
    statuses.push({ label: "Retrograde", tone: "retrograde" });
  }

  if (position.degree >= 29) {
    statuses.push({ label: "Last degree", tone: "alert" });
  } else if (position.degree < 1) {
    statuses.push({ label: "Fresh ingress", tone: "muted" });
  }

  return statuses;
}

export function formatPlanetDegree(position: PlanetPosition) {
  const degree = Math.floor(position.degree);
  const minutes = Math.round((position.degree - degree) * 60);

  if (minutes === 60) {
    return `${degree + 1}°00'`;
  }

  return `${degree}°${String(minutes).padStart(2, "0")}'`;
}

export function formatPlacementPosition(position: PlanetPosition) {
  return `${position.sign}${position.motion === "retrograde" ? " ℞" : ""} ${formatPlanetDegree(position)}`;
}

export function natalPlacementTitle(position: PlanetPosition) {
  return `${position.planet}${position.motion === "retrograde" ? " Rx" : ""} in ${position.sign}`;
}

export function detailGlyphForPlacement(position: PlanetPosition) {
  return [
    pointGlyph(position.planet),
    position.motion === "retrograde" ? "℞" : "",
    signGlyph(position.sign),
    houseGlyph(position.house)
  ].filter(Boolean).join(" ");
}

export function aspectTone(type: string) {
  if (["trine", "sextile"].includes(type)) {
    return "Flow";
  }

  if (["square", "opposition"].includes(type)) {
    return "Friction";
  }

  return "Contact";
}
