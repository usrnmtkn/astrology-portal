import type { ManualChart } from "./manualCharts";
import type { PlanetPosition, SkySnapshot } from "../types";

export const zodiacSigns = [
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

export const zodiacSignGlyphs: Record<string, string> = {
  Aries: "♈",
  Taurus: "♉",
  Gemini: "♊",
  Cancer: "♋",
  Leo: "♌",
  Virgo: "♍",
  Libra: "♎",
  Scorpio: "♏",
  Sagittarius: "♐",
  Capricorn: "♑",
  Aquarius: "♒",
  Pisces: "♓"
};

export const transitAspectDefinitions = [
  { type: "conjunction", exact: 0, orb: 4 },
  { type: "sextile", exact: 60, orb: 3 },
  { type: "square", exact: 90, orb: 4 },
  { type: "trine", exact: 120, orb: 4 },
  { type: "opposition", exact: 180, orb: 4 }
] as const;

const signElementMap: Record<string, "Fire" | "Earth" | "Air" | "Water"> = {
  Aries: "Fire",
  Leo: "Fire",
  Sagittarius: "Fire",
  Taurus: "Earth",
  Virgo: "Earth",
  Capricorn: "Earth",
  Gemini: "Air",
  Libra: "Air",
  Aquarius: "Air",
  Cancer: "Water",
  Scorpio: "Water",
  Pisces: "Water"
};

const comparisonPointRoles: Record<string, string> = {
  Ascendant: "presence, attraction, and first impression",
  Midheaven: "public direction and life trajectory",
  Sun: "identity, vitality, and what feels central",
  Moon: "emotional needs, instincts, and private reactions",
  Mercury: "communication, interpretation, and daily thinking",
  Venus: "affection, pleasure, values, and how love is offered",
  Mars: "desire, pursuit, conflict, and physical chemistry",
  Jupiter: "trust, encouragement, growth, and shared belief",
  Saturn: "commitment, limits, duty, and the pressure to mature",
  Uranus: "freedom, disruption, and the need for space",
  Neptune: "idealization, longing, imagination, and blurred boundaries",
  Pluto: "intensity, control, vulnerability, and deep change",
  "North Node": "familiarity, direction, and timing",
  "True Node": "familiarity, direction, and timing"
};

export function normalizedAngle(value: number) {
  return ((value % 360) + 360) % 360;
}

export function angularDistance(first: number, second: number) {
  const difference = Math.abs(normalizedAngle(first - second));

  return difference > 180 ? 360 - difference : difference;
}

export function zodiacSignForLongitude(longitude: number) {
  return zodiacSigns[Math.floor(normalizedAngle(longitude) / 30)] ?? "Aries";
}

export function zodiacLongitude(position?: PlanetPosition) {
  if (!position) {
    return 0;
  }

  const signIndex = zodiacSigns.indexOf(position.sign);

  return (Math.max(signIndex, 0) * 30 + position.degree) % 360;
}

export function wholeSignHouseForSign(sign: string, ascendant: string) {
  const signIndex = zodiacSigns.indexOf(sign);
  const ascendantIndex = zodiacSigns.indexOf(ascendant);

  if (signIndex < 0 || ascendantIndex < 0) {
    return null;
  }

  return ((signIndex - ascendantIndex + 12) % 12) + 1;
}

export function natalElementBalance(positions: PlanetPosition[]) {
  const counts = { Fire: 0, Earth: 0, Air: 0, Water: 0 };

  positions.forEach((position) => {
    const element = signElementMap[position.sign];

    if (element) {
      counts[element] += 1;
    }
  });

  return (["Fire", "Earth", "Air", "Water"] as const).map((element) => ({
    element,
    count: counts[element]
  }));
}

export function comparisonPointRole(point: string) {
  return comparisonPointRoles[point] ?? point.toLowerCase();
}

export function relationshipMidpointLongitude(first: number, second: number) {
  const distance = normalizedAngle(second - first);
  const shortestDistance = distance > 180 ? distance - 360 : distance;

  return normalizedAngle(first + shortestDistance / 2);
}

export function relationshipCompositeSky(
  profileNatalSky: SkySnapshot | null,
  chart: Pick<ManualChart, "natalChart">
): SkySnapshot | null {
  const friendSky = chart.natalChart;

  if (!profileNatalSky || !friendSky) {
    return null;
  }

  const compositeAscendantLongitude = typeof profileNatalSky.ascendantLongitude === "number" && typeof friendSky.ascendantLongitude === "number"
    ? relationshipMidpointLongitude(profileNatalSky.ascendantLongitude, friendSky.ascendantLongitude)
    : undefined;
  const compositeMidheavenLongitude = typeof profileNatalSky.midheavenLongitude === "number" && typeof friendSky.midheavenLongitude === "number"
    ? relationshipMidpointLongitude(profileNatalSky.midheavenLongitude, friendSky.midheavenLongitude)
    : undefined;
  const compositeAscendant = typeof compositeAscendantLongitude === "number"
    ? zodiacSignForLongitude(compositeAscendantLongitude)
    : friendSky.ascendant;
  const compositeMidheaven = typeof compositeMidheavenLongitude === "number"
    ? zodiacSignForLongitude(compositeMidheavenLongitude)
    : friendSky.midheaven;
  const friendPositions = new Map(friendSky.positions.map((position) => [position.planet, position]));
  const positions = profileNatalSky.positions.flatMap((yourPosition) => {
    const friendPosition = friendPositions.get(yourPosition.planet);

    if (!friendPosition || yourPosition.planet === "North Node" || yourPosition.planet === "True Node") {
      return [];
    }

    const longitude = relationshipMidpointLongitude(zodiacLongitude(yourPosition), zodiacLongitude(friendPosition));
    const sign = zodiacSignForLongitude(longitude);

    return [{
      planet: yourPosition.planet,
      glyph: yourPosition.glyph,
      sign,
      signGlyph: zodiacSignGlyphs[sign] ?? "",
      degree: normalizedAngle(longitude) % 30,
      house: wholeSignHouseForSign(sign, compositeAscendant) ?? 0,
      motion: "direct" as const,
      theme: `Shared ${comparisonPointRole(yourPosition.planet)}`
    }];
  });

  const aspects = positions.flatMap((fromPosition, fromIndex) => (
    positions.slice(fromIndex + 1).flatMap((toPosition) => {
      const separation = angularDistance(zodiacLongitude(fromPosition), zodiacLongitude(toPosition));
      const aspect = transitAspectDefinitions
        .map((definition) => ({ ...definition, orbValue: Math.abs(separation - definition.exact) }))
        .filter((definition) => definition.orbValue <= definition.orb)
        .sort((first, second) => first.orbValue - second.orbValue)[0];

      return aspect
        ? [{
            from: fromPosition.planet,
            to: toPosition.planet,
            type: aspect.type,
            orb: aspect.orbValue,
            meaning: `${fromPosition.planet} ${aspect.type} ${toPosition.planet}`
          }]
        : [];
    })
  ))
    .sort((first, second) => first.orb - second.orb)
    .slice(0, 12);

  return {
    location: profileNatalSky.location,
    generatedAt: profileNatalSky.generatedAt,
    ascendant: compositeAscendant,
    ascendantLongitude: compositeAscendantLongitude,
    midheaven: compositeMidheaven,
    midheavenLongitude: compositeMidheavenLongitude,
    moonPhase: "Relationship chart",
    dominantElement: natalElementBalance(positions).sort((first, second) => second.count - first.count)[0]?.element ?? "Fire",
    positions,
    aspects
  };
}
