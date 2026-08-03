import type { ManualChart } from "./manualCharts";
import type { InterChartAspectLine } from "../components/charts/Wheels";
import type { PlanetPosition, SkySnapshot } from "../types";

export type ComparisonPoint = {
  name: string;
  glyph: string;
  longitude: number;
  role: string;
};

export type CalculatedSynastryContact = {
  id: string;
  friendPoint: ComparisonPoint;
  yourPoint: ComparisonPoint;
  aspect: string;
  orb: number;
  score: number;
  tone: string;
};

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

const synastryPersonalPoints = new Set(["sun", "moon", "mercury", "venus", "mars"]);
const synastryAngles = new Set(["ascendant", "midheaven"]);
const synastrySocialOuterPoints = new Set(["jupiter", "saturn", "uranus", "neptune", "pluto"]);
const compatibilityHighlightPoints = new Set(["Sun", "Moon", "Venus", "Mars", "Mercury", "Saturn"]);

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

function synastryPointKey(point: string) {
  return point.trim().toLowerCase().replace(/\s+/g, "-");
}

function isSynastryPersonalOrAngle(point: string) {
  const key = synastryPointKey(point);

  return synastryPersonalPoints.has(key) || synastryAngles.has(key);
}

function isSameSocialOrOuterSynastryContact(firstPoint: string, secondPoint: string) {
  const firstKey = synastryPointKey(firstPoint);
  const secondKey = synastryPointKey(secondPoint);

  return firstKey === secondKey && synastrySocialOuterPoints.has(firstKey);
}

export function synastryAspectOrbLimit(aspect: string, firstPoint: string, secondPoint: string) {
  const baseLimits: Record<string, number> = {
    conjunction: 4,
    opposition: 3.5,
    square: 3.5,
    trine: 3,
    sextile: 2.5
  };
  const baseLimit = baseLimits[aspect] ?? 3;
  const firstIsPersonalOrAngle = isSynastryPersonalOrAngle(firstPoint);
  const secondIsPersonalOrAngle = isSynastryPersonalOrAngle(secondPoint);

  if (isSameSocialOrOuterSynastryContact(firstPoint, secondPoint)) {
    return Math.min(baseLimit, 1.25);
  }

  if (firstIsPersonalOrAngle && secondIsPersonalOrAngle) {
    return baseLimit + 0.5;
  }

  if (firstIsPersonalOrAngle || secondIsPersonalOrAngle) {
    return baseLimit;
  }

  return Math.min(baseLimit, 2);
}

function synastryWheelAspectOrbLimit(aspect: string, firstPoint: string, secondPoint: string) {
  const listLimit = synastryAspectOrbLimit(aspect, firstPoint, secondPoint);

  if (isSameSocialOrOuterSynastryContact(firstPoint, secondPoint)) {
    return listLimit;
  }

  if (isSynastryPersonalOrAngle(firstPoint) || isSynastryPersonalOrAngle(secondPoint)) {
    return Math.max(listLimit, 4.5);
  }

  return listLimit;
}

export function synastryContactSignalTier(firstPoint: string, secondPoint: string) {
  if (isSameSocialOrOuterSynastryContact(firstPoint, secondPoint)) {
    return "background";
  }

  if (isSynastryPersonalOrAngle(firstPoint) || isSynastryPersonalOrAngle(secondPoint)) {
    return "primary";
  }

  if ([firstPoint, secondPoint].includes("Saturn")) {
    return "secondary";
  }

  return "background";
}

function synastryPointWeight(point: string) {
  const weights: Record<string, number> = {
    Sun: 18,
    Moon: 22,
    Ascendant: 22,
    Midheaven: 14,
    Venus: 18,
    Mars: 18,
    Saturn: 17,
    Mercury: 13,
    Jupiter: 12,
    Pluto: 11,
    Neptune: 9,
    Uranus: 9,
    "North Node": 20,
    "True Node": 20
  };

  return weights[point] ?? 6;
}

function synastryAspectWeight(aspect: string) {
  const weights: Record<string, number> = {
    conjunction: 26,
    opposition: 18,
    square: 18,
    trine: 14,
    sextile: 10
  };

  return weights[aspect] ?? 6;
}

function synastryOrbWeight(orb: number) {
  if (orb <= 0.5) return 30;
  if (orb <= 1) return 24;
  if (orb <= 2) return 16;
  if (orb <= 3) return 10;
  return 4;
}

export function synastryContactScore(friendPoint: string, yourPoint: string, aspect: string, orb: number) {
  const signalTier = synastryContactSignalTier(friendPoint, yourPoint);
  const sameSocialOrOuterPoint = signalTier === "background" && isSameSocialOrOuterSynastryContact(friendPoint, yourPoint);
  const personalPairBonus = ["Sun", "Moon", "Mercury", "Venus", "Mars"].includes(friendPoint)
    && ["Sun", "Moon", "Mercury", "Venus", "Mars", "Ascendant"].includes(yourPoint)
    ? 12
    : 0;
  const saturnBondBonus = [friendPoint, yourPoint].includes("Saturn") && !sameSocialOrOuterPoint ? 5 : 0;
  const angleBonus = [friendPoint, yourPoint].some((point) => ["Ascendant", "Midheaven"].includes(point)) ? 8 : 0;
  const signalBonus = signalTier === "primary" ? 14 : signalTier === "secondary" ? 5 : 0;
  const generationalContextPenalty = sameSocialOrOuterPoint ? 32 : 0;

  return synastryOrbWeight(orb)
    + synastryAspectWeight(aspect)
    + synastryPointWeight(friendPoint)
    + synastryPointWeight(yourPoint)
    + personalPairBonus
    + saturnBondBonus
    + angleBonus
    + signalBonus
    - generationalContextPenalty;
}

export function synastryTone(aspect: string) {
  if (["square", "opposition"].includes(aspect)) {
    return "Friction";
  }

  if (["trine", "sextile"].includes(aspect)) {
    return "Flow";
  }

  return "Fusion";
}

export function comparisonPointsFromSky(sky: SkySnapshot | null): ComparisonPoint[] {
  if (!sky) {
    return [];
  }

  const points = sky.positions
    .filter((position) => position.planet !== "North Node" && position.planet !== "True Node")
    .map((position) => ({
      name: position.planet,
      glyph: position.glyph,
      longitude: zodiacLongitude(position),
      role: comparisonPointRole(position.planet)
    }));

  if (typeof sky.ascendantLongitude === "number") {
    points.push({
      name: "Ascendant",
      glyph: "Asc",
      longitude: normalizedAngle(sky.ascendantLongitude),
      role: comparisonPointRole("Ascendant")
    });
  }

  if (typeof sky.midheavenLongitude === "number") {
    points.push({
      name: "Midheaven",
      glyph: "MC",
      longitude: normalizedAngle(sky.midheavenLongitude),
      role: comparisonPointRole("Midheaven")
    });
  }

  return points;
}

export function calculatedSynastryContacts(
  profileNatalSky: SkySnapshot | null,
  chart: Pick<ManualChart, "id" | "natalChart">
): CalculatedSynastryContact[] {
  const friendPoints = comparisonPointsFromSky(chart.natalChart ?? null);
  const yourPoints = comparisonPointsFromSky(profileNatalSky);
  const contacts = friendPoints.flatMap((friendPoint) => yourPoints.flatMap((yourPoint) => {
    const separation = angularDistance(friendPoint.longitude, yourPoint.longitude);
    const aspect = transitAspectDefinitions
      .map((definition) => ({ ...definition, orbValue: Math.abs(separation - definition.exact) }))
      .filter((definition) => definition.orbValue <= synastryAspectOrbLimit(definition.type, friendPoint.name, yourPoint.name))
      .sort((first, second) => first.orbValue - second.orbValue)[0];

    if (!aspect) {
      return [];
    }

    return [{
      id: `${chart.id}-${friendPoint.name}-${aspect.type}-${yourPoint.name}`.toLowerCase().replace(/\s+/g, "-"),
      friendPoint,
      yourPoint,
      aspect: aspect.type,
      orb: aspect.orbValue,
      score: synastryContactScore(friendPoint.name, yourPoint.name, aspect.type, aspect.orbValue),
      tone: synastryTone(aspect.type)
    }];
  }));
  const orderedContacts = contacts.sort((first, second) => second.score - first.score || first.orb - second.orb);
  const primaryContacts = orderedContacts.filter((contact) => synastryContactSignalTier(contact.friendPoint.name, contact.yourPoint.name) === "primary");
  const secondaryContacts = orderedContacts.filter((contact) => synastryContactSignalTier(contact.friendPoint.name, contact.yourPoint.name) === "secondary");
  const backgroundContacts = orderedContacts.filter((contact) => synastryContactSignalTier(contact.friendPoint.name, contact.yourPoint.name) === "background");

  return [...primaryContacts, ...secondaryContacts, ...backgroundContacts].slice(0, 16);
}

export function compatibilityHighlightContact(
  profileNatalSky: SkySnapshot | null,
  chart: Pick<ManualChart, "id" | "natalChart">
): CalculatedSynastryContact | null {
  const friendSky = chart.natalChart;

  if (!profileNatalSky || !friendSky) {
    return null;
  }

  const contacts = profileNatalSky.positions.flatMap((yourPosition) => (
    friendSky.positions.flatMap((friendPosition) => {
      if (!compatibilityHighlightPoints.has(yourPosition.planet) || !compatibilityHighlightPoints.has(friendPosition.planet)) {
        return [];
      }

      const separation = angularDistance(zodiacLongitude(yourPosition), zodiacLongitude(friendPosition));
      const aspect = transitAspectDefinitions
        .map((definition) => ({ ...definition, orbValue: Math.abs(separation - definition.exact) }))
        .filter((definition) => definition.orbValue <= synastryAspectOrbLimit(definition.type, friendPosition.planet, yourPosition.planet))
        .sort((first, second) => first.orbValue - second.orbValue)[0];

      if (!aspect) {
        return [];
      }

      return [{
        id: `${chart.id}-${friendPosition.planet}-${aspect.type}-${yourPosition.planet}`.toLowerCase().replace(/\s+/g, "-"),
        friendPoint: {
          name: friendPosition.planet,
          glyph: friendPosition.glyph,
          longitude: zodiacLongitude(friendPosition),
          role: comparisonPointRole(friendPosition.planet)
        },
        yourPoint: {
          name: yourPosition.planet,
          glyph: yourPosition.glyph,
          longitude: zodiacLongitude(yourPosition),
          role: comparisonPointRole(yourPosition.planet)
        },
        aspect: aspect.type,
        orb: aspect.orbValue,
        score: synastryContactScore(friendPosition.planet, yourPosition.planet, aspect.type, aspect.orbValue),
        tone: synastryTone(aspect.type)
      }];
    })
  ))
    .sort((first, second) => second.score - first.score || first.orb - second.orb);

  return contacts.find((contact) => synastryContactSignalTier(contact.friendPoint.name, contact.yourPoint.name) !== "background")
    ?? contacts[0]
    ?? null;
}

export function samePlanetExactAspect(personAPosition: PlanetPosition, personBPosition: PlanetPosition) {
  const separation = angularDistance(zodiacLongitude(personAPosition), zodiacLongitude(personBPosition));

  return transitAspectDefinitions
    .map((definition) => ({ ...definition, orbValue: Math.abs(separation - definition.exact) }))
    .filter((definition) => definition.orbValue <= synastryAspectOrbLimit(definition.type, personBPosition.planet, personAPosition.planet))
    .sort((first, second) => first.orbValue - second.orbValue)[0] ?? null;
}

export function synastryWheelAspectLines(
  profileNatalSky: SkySnapshot | null,
  chart: Pick<ManualChart, "id" | "natalChart">
): InterChartAspectLine[] {
  const friendPoints = comparisonPointsFromSky(chart.natalChart ?? null);
  const yourPoints = comparisonPointsFromSky(profileNatalSky);

  return friendPoints
    .flatMap((friendPoint) => yourPoints.flatMap((yourPoint) => {
      const separation = angularDistance(friendPoint.longitude, yourPoint.longitude);
      const aspect = transitAspectDefinitions
        .map((definition) => ({ ...definition, orbValue: Math.abs(separation - definition.exact) }))
        .filter((definition) => definition.orbValue <= synastryWheelAspectOrbLimit(definition.type, friendPoint.name, yourPoint.name))
        .sort((first, second) => first.orbValue - second.orbValue)[0];

      if (!aspect) {
        return [];
      }

      return [{
        id: `${chart.id}-wheel-${friendPoint.name}-${aspect.type}-${yourPoint.name}`.toLowerCase().replace(/\s+/g, "-"),
        fromLongitude: friendPoint.longitude,
        toLongitude: yourPoint.longitude,
        type: aspect.type,
        orb: aspect.orbValue,
        fromPointId: `outer:${friendPoint.name}`,
        toPointId: `inner:${yourPoint.name}`,
        score: synastryContactScore(friendPoint.name, yourPoint.name, aspect.type, aspect.orbValue)
      }];
    }))
    .sort((first, second) => second.score - first.score || first.orb - second.orb)
    .slice(0, 18)
    .map(({ id, fromLongitude, toLongitude, type, orb, fromPointId, toPointId }) => ({
      id,
      fromLongitude,
      toLongitude,
      type,
      orb,
      fromPointId,
      toPointId
    }));
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
