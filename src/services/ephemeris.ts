import SwissEph from "swisseph-wasm";
import type { LocationInput, PlanetPosition, SkySnapshot } from "../types";

const signs = [
  ["Aries", "♈"],
  ["Taurus", "♉"],
  ["Gemini", "♊"],
  ["Cancer", "♋"],
  ["Leo", "♌"],
  ["Virgo", "♍"],
  ["Libra", "♎"],
  ["Scorpio", "♏"],
  ["Sagittarius", "♐"],
  ["Capricorn", "♑"],
  ["Aquarius", "♒"],
  ["Pisces", "♓"]
] as const;

const planets = [
  ["Sun", "☉", "identity"],
  ["Moon", "☽", "mood"],
  ["Mercury", "☿", "language"],
  ["Venus", "♀", "desire"],
  ["Mars", "♂", "momentum"],
  ["Jupiter", "♃", "growth"],
  ["Saturn", "♄", "structure"],
  ["Uranus", "♅", "change"],
  ["Neptune", "♆", "imagination"],
  ["Pluto", "♇", "depth"],
  ["True Node", "☊", "direction"]
] as const;

type SwissEphInstance = InstanceType<typeof SwissEph>;

type CalculatedPlanet = PlanetPosition & {
  longitude: number;
  speed: number;
};

const aspectDefinitions = [
  ["conjunction", 0],
  ["sextile", 60],
  ["square", 90],
  ["trine", 120],
  ["opposition", 180]
] as const;

let swissEphPromise: Promise<SwissEphInstance> | null = null;

function signIndexFor(sign: string) {
  return signs.findIndex(([name]) => name === sign);
}

function wholeSignHouse(sign: string, ascendant: string) {
  const signIndex = signIndexFor(sign);
  const ascendantIndex = signIndexFor(ascendant);

  if (signIndex < 0 || ascendantIndex < 0) {
    return 1;
  }

  return ((signIndex - ascendantIndex + 12) % 12) + 1;
}

function normalizeDegrees(degrees: number) {
  return ((degrees % 360) + 360) % 360;
}

function signForLongitude(longitude: number) {
  const normalized = normalizeDegrees(longitude);
  const signIndex = Math.floor(normalized / 30);
  const [sign, signGlyph] = signs[signIndex];

  return {
    sign,
    signGlyph,
    degree: Number((normalized % 30).toFixed(2))
  };
}

function elementForSign(sign: string): SkySnapshot["dominantElement"] {
  if (["Aries", "Leo", "Sagittarius"].includes(sign)) return "Fire";
  if (["Taurus", "Virgo", "Capricorn"].includes(sign)) return "Earth";
  if (["Gemini", "Libra", "Aquarius"].includes(sign)) return "Air";
  return "Water";
}

async function getSwissEph() {
  if (!swissEphPromise) {
    swissEphPromise = (async () => {
      const swe = new SwissEph();
      await swe.initSwissEph();
      return swe;
    })();
  }

  return swissEphPromise;
}

function utcHour(date: Date) {
  return date.getUTCHours() + date.getUTCMinutes() / 60 + date.getUTCSeconds() / 3600;
}

function moonPhaseName(sunLongitude: number, moonLongitude: number) {
  const phase = normalizeDegrees(moonLongitude - sunLongitude);
  const names = [
    "New Moon",
    "Waxing Crescent",
    "First Quarter",
    "Waxing Gibbous",
    "Full Moon",
    "Waning Gibbous",
    "Last Quarter",
    "Waning Crescent"
  ];
  const index = Math.floor(((phase + 22.5) % 360) / 45);

  return names[index];
}

function angularSeparation(first: number, second: number) {
  const difference = Math.abs(normalizeDegrees(first - second));
  return difference > 180 ? 360 - difference : difference;
}

function aspectForSeparation(separation: number) {
  return aspectDefinitions
    .map(([type, exact]) => ({ type, orb: Math.abs(separation - exact) }))
    .filter(({ orb }) => orb <= 5)
    .sort((a, b) => a.orb - b.orb)[0];
}

function aspectMeaning(from: CalculatedPlanet, to: CalculatedPlanet, type: string) {
  const tone: Record<string, string> = {
    conjunction: "are speaking in the same room.",
    sextile: "can cooperate with a little invitation.",
    square: "create friction that wants a cleaner choice.",
    trine: "move with unusual ease today.",
    opposition: "pull attention across two poles."
  };

  return `${from.theme[0].toUpperCase()}${from.theme.slice(1)} and ${to.theme} ${tone[type] ?? "are in conversation."}`;
}

function calculateAspects(positions: CalculatedPlanet[]): SkySnapshot["aspects"] {
  const aspects: SkySnapshot["aspects"] = [];

  positions.forEach((from, fromIndex) => {
    positions.slice(fromIndex + 1).forEach((to) => {
      const aspect = aspectForSeparation(angularSeparation(from.longitude, to.longitude));

      if (aspect) {
        aspects.push({
          from: from.planet,
          to: to.planet,
          type: aspect.type,
          orb: Number(aspect.orb.toFixed(1)),
          meaning: aspectMeaning(from, to, aspect.type)
        });
      }
    });
  });

  return aspects
    .sort((a, b) => a.orb - b.orb)
    .slice(0, 5);
}

export const defaultLocation: LocationInput = {
  label: "New York, NY",
  latitude: 40.7128,
  longitude: -74.006
};

export async function getAstrodienstSky(location: LocationInput = defaultLocation): Promise<SkySnapshot> {
  const now = new Date();
  const swe = await getSwissEph();
  const jd = swe.julday(
    now.getUTCFullYear(),
    now.getUTCMonth() + 1,
    now.getUTCDate(),
    utcHour(now)
  );
  const flags = swe.SEFLG_SWIEPH | swe.SEFLG_SPEED;
  const houses = swe.houses(jd, location.latitude, location.longitude, "P") as unknown as {
    ascmc: Float64Array;
  };
  const ascendant = signForLongitude(houses.ascmc[0]).sign;
  const midheaven = signForLongitude(houses.ascmc[1]).sign;
  const planetIds = [
    swe.SE_SUN,
    swe.SE_MOON,
    swe.SE_MERCURY,
    swe.SE_VENUS,
    swe.SE_MARS,
    swe.SE_JUPITER,
    swe.SE_SATURN,
    swe.SE_URANUS,
    swe.SE_NEPTUNE,
    swe.SE_PLUTO,
    swe.SE_TRUE_NODE
  ];
  const positions: CalculatedPlanet[] = planets.map(([planet, glyph, theme], index) => {
    const result = swe.calc_ut(jd, planetIds[index], flags);
    const longitude = normalizeDegrees(result[0]);
    const { sign, signGlyph, degree } = signForLongitude(longitude);

    return {
      planet,
      glyph,
      sign,
      signGlyph,
      degree,
      house: wholeSignHouse(sign, ascendant),
      motion: result[3] < -0.0001 ? "retrograde" : "direct",
      theme,
      longitude,
      speed: result[3]
    };
  });
  const sun = positions.find((position) => position.planet === "Sun") ?? positions[0];
  const moon = positions.find((position) => position.planet === "Moon") ?? positions[1];

  return {
    location,
    generatedAt: now.toISOString(),
    ascendant,
    midheaven,
    moonPhase: moonPhaseName(sun.longitude, moon.longitude),
    dominantElement: elementForSign(sun.sign),
    positions: positions.map(({ longitude, speed, ...position }) => position),
    aspects: calculateAspects(positions)
  };
}

export function getCurrentSky(location: LocationInput = defaultLocation): SkySnapshot {
  const now = new Date();
  const daySeed = Math.floor(now.getTime() / 86_400_000);
  const locationSeed = Math.round((location.latitude + 90) * 10 + (location.longitude + 180) * 10);

  const basePositions: PlanetPosition[] = planets.map(([planet, glyph, theme], index) => {
    const raw = daySeed * (index + 3) + locationSeed + index * 47;
    const signIndex = Math.abs(raw) % signs.length;
    const [sign, signGlyph] = signs[signIndex];
    const motion: PlanetPosition["motion"] = index > 1 && raw % 5 === 0 ? "retrograde" : "direct";

    return {
      planet,
      glyph,
      sign,
      signGlyph,
      degree: Math.abs(raw * 7) % 30,
      house: 1,
      motion,
      theme
    };
  });
  const ascendant = basePositions[7].sign;
  const positions: PlanetPosition[] = basePositions.map((position) => ({
    ...position,
    house: wholeSignHouse(position.sign, ascendant)
  }));

  return {
    location,
    generatedAt: now.toISOString(),
    ascendant,
    midheaven: positions[4].sign,
    moonPhase: "Waxing Crescent",
    dominantElement: ["Fire", "Earth", "Air", "Water"][Math.abs(locationSeed + daySeed) % 4] as SkySnapshot["dominantElement"],
    positions,
    aspects: [
      {
        from: "Moon",
        to: "Venus",
        type: "trine",
        orb: 2.1,
        meaning: "Emotional tone and appetite for ease are cooperating."
      },
      {
        from: "Mercury",
        to: "Saturn",
        type: "square",
        orb: 3.4,
        meaning: "Plans may need cleaner commitments before they move."
      },
      {
        from: "Mars",
        to: "Jupiter",
        type: "sextile",
        orb: 1.8,
        meaning: "Effort can grow quickly when it has a specific target."
      }
    ]
  };
}
