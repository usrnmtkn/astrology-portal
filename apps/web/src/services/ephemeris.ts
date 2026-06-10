import type { LocationInput, PlanetPosition, SkySnapshot } from "../types.js";

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

type SwissEphConstructor = typeof import("swisseph-wasm").default;
type SwissEphInstance = InstanceType<SwissEphConstructor>;

type CalculatedPlanet = PlanetPosition & {
  longitude: number;
  speed: number;
};

type MoonEvent = NonNullable<SkySnapshot["moonEvent"]>;
type SkyCalculationOptions = {
  includeTransitWindows?: boolean;
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
      const { default: SwissEph } = await import("swisseph-wasm");
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

function exactPlanetLongitude(swe: SwissEphInstance, planetId: number, date: Date) {
  const jd = swe.julday(
    date.getUTCFullYear(),
    date.getUTCMonth() + 1,
    date.getUTCDate(),
    utcHour(date)
  );
  const flags = swe.SEFLG_SWIEPH | swe.SEFLG_SPEED;

  return normalizeDegrees(swe.calc_ut(jd, planetId, flags)[0]);
}

function exactPlanetSign(swe: SwissEphInstance, planetId: number, date: Date) {
  return signForLongitude(exactPlanetLongitude(swe, planetId, date)).sign;
}

function transitSearchStepDays(planet: string) {
  if (planet === "Moon") return 0.25;
  if (["Sun", "Mercury", "Venus", "Mars"].includes(planet)) return 1;
  if (planet === "Jupiter") return 4;
  if (planet === "Saturn") return 8;
  if (planet === "Uranus") return 16;
  return 24;
}

function addDays(date: Date, days: number) {
  return new Date(date.getTime() + days * 86_400_000);
}

function compactDurationLabelFromDays(days: number) {
  const roundedDays = Math.max(1, Math.ceil(days));

  if (roundedDays < 90) {
    return `${roundedDays}Ds`;
  }

  if (roundedDays <= 548) {
    return `${Math.max(1, Math.round(roundedDays / 30.44))}Mos`;
  }

  return `${Math.max(1, Math.round(roundedDays / 365.25))}Yrs`;
}

function refineSignBoundary(
  swe: SwissEphInstance,
  planetId: number,
  currentSign: string,
  sameSignDate: Date,
  differentSignDate: Date
) {
  let same = sameSignDate;
  let different = differentSignDate;

  for (let index = 0; index < 50; index += 1) {
    const midpoint = new Date((same.getTime() + different.getTime()) / 2);

    if (exactPlanetSign(swe, planetId, midpoint) === currentSign) {
      same = midpoint;
    } else {
      different = midpoint;
    }
  }

  return new Date((same.getTime() + different.getTime()) / 2);
}

function signTransitWindowFor(
  swe: SwissEphInstance,
  planet: string,
  planetId: number,
  date: Date,
  currentSign: string
) {
  const stepDays = transitSearchStepDays(planet);
  const maxIterations = Math.ceil((365.25 * 32) / stepDays);
  let previousDifferent = addDays(date, -stepDays);
  let nextDifferent = addDays(date, stepDays);

  for (let index = 0; index < maxIterations && exactPlanetSign(swe, planetId, previousDifferent) === currentSign; index += 1) {
    previousDifferent = addDays(previousDifferent, -stepDays);
  }

  for (let index = 0; index < maxIterations && exactPlanetSign(swe, planetId, nextDifferent) === currentSign; index += 1) {
    nextDifferent = addDays(nextDifferent, stepDays);
  }

  if (exactPlanetSign(swe, planetId, previousDifferent) === currentSign || exactPlanetSign(swe, planetId, nextDifferent) === currentSign) {
    return {};
  }

  const transitStart = refineSignBoundary(swe, planetId, currentSign, date, previousDifferent);
  const transitEnd = refineSignBoundary(swe, planetId, currentSign, date, nextDifferent);
  const remainingDays = (transitEnd.getTime() - date.getTime()) / 86_400_000;

  return {
    transitStart: transitStart.toISOString(),
    transitEnd: transitEnd.toISOString(),
    transitRemainingLabel: compactDurationLabelFromDays(remainingDays)
  };
}

function moonSunPhaseAngle(swe: SwissEphInstance, date: Date) {
  return normalizeDegrees(
    exactPlanetLongitude(swe, swe.SE_MOON, date) - exactPlanetLongitude(swe, swe.SE_SUN, date)
  );
}

function nextMoonEvent(swe: SwissEphInstance, date: Date): MoonEvent {
  const startingPhase = moonSunPhaseAngle(swe, date);
  const targetPhase = startingPhase < 180 ? 180 : 360;
  const name: MoonEvent["name"] = targetPhase === 180 ? "Full Moon" : "New Moon";
  const synodicMonthDays = 29.530588;
  const estimatedDays = Math.max(0.05, ((targetPhase - startingPhase) / 360) * synodicMonthDays);
  const phaseProgress = (eventDate: Date) => {
    const phase = moonSunPhaseAngle(swe, eventDate);
    return phase < startingPhase ? phase + 360 : phase;
  };

  let lower = new Date(date);
  let upper = new Date(date.getTime() + (estimatedDays + 2) * 86_400_000);

  while (phaseProgress(upper) < targetPhase) {
    upper = new Date(upper.getTime() + 86_400_000);
  }

  for (let index = 0; index < 60; index += 1) {
    const midpoint = new Date((lower.getTime() + upper.getTime()) / 2);

    if (phaseProgress(midpoint) >= targetPhase) {
      upper = midpoint;
    } else {
      lower = midpoint;
    }
  }

  const occursAt = new Date((lower.getTime() + upper.getTime()) / 2);
  const moonLongitude = exactPlanetLongitude(swe, swe.SE_MOON, occursAt);

  return {
    name,
    sign: signForLongitude(moonLongitude).sign,
    occursAt: occursAt.toISOString(),
    days: Math.max(0, (occursAt.getTime() - date.getTime()) / 86_400_000)
  };
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
  label: "New York City, NY",
  latitude: 40.7128,
  longitude: -74.006,
  timeZone: "America/New_York"
};

export async function getAstrodienstSky(
  location: LocationInput = defaultLocation,
  date: Date = new Date(),
  options: SkyCalculationOptions = {}
): Promise<SkySnapshot> {
  const swe = await getSwissEph();
  const jd = swe.julday(
    date.getUTCFullYear(),
    date.getUTCMonth() + 1,
    date.getUTCDate(),
    utcHour(date)
  );
  const flags = swe.SEFLG_SWIEPH | swe.SEFLG_SPEED;
  const houses = swe.houses(jd, location.latitude, location.longitude, "P") as unknown as {
    ascmc: Float64Array;
  };
  const ascendantLongitude = normalizeDegrees(houses.ascmc[0]);
  const midheavenLongitude = normalizeDegrees(houses.ascmc[1]);
  const ascendant = signForLongitude(ascendantLongitude).sign;
  const midheaven = signForLongitude(midheavenLongitude).sign;
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
    const transitWindow = options.includeTransitWindows
      ? signTransitWindowFor(swe, planet, planetIds[index], date, sign)
      : {};

    return {
      planet,
      glyph,
      sign,
      signGlyph,
      degree,
      house: wholeSignHouse(sign, ascendant),
      motion: result[3] < -0.0001 ? "retrograde" : "direct",
      theme,
      ...transitWindow,
      longitude,
      speed: result[3]
    };
  });
  const sun = positions.find((position) => position.planet === "Sun") ?? positions[0];
  const moon = positions.find((position) => position.planet === "Moon") ?? positions[1];

  return {
    location,
    generatedAt: date.toISOString(),
    ascendant,
    ascendantLongitude,
    midheaven,
    midheavenLongitude,
    moonPhase: moonPhaseName(sun.longitude, moon.longitude),
    moonEvent: nextMoonEvent(swe, date),
    dominantElement: elementForSign(sun.sign),
    positions: positions.map(({ longitude, speed, ...position }) => position),
    aspects: calculateAspects(positions)
  };
}

export function getCurrentSky(location: LocationInput = defaultLocation, date: Date = new Date()): SkySnapshot {
  const daySeed = Math.floor(date.getTime() / 86_400_000);
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
    generatedAt: date.toISOString(),
    ascendant,
    ascendantLongitude: signs.findIndex(([name]) => name === ascendant) * 30,
    midheaven: positions[4].sign,
    midheavenLongitude: signs.findIndex(([name]) => name === positions[4].sign) * 30,
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
