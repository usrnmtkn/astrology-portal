import type { LocationInput, PlanetPosition, SkySnapshot, SolarDaylight } from "../types.js";
import {
  calculateSkyAspects,
  canonicalizeNodeAxisAspects,
  SKY_ASPECT_DEFINITIONS,
  SKY_ASPECT_POINT_ORDER
} from "@tldr/astro-knowledge/sky-aspect-engine";
import { ASTROLOGY_CALCULATION_PROVENANCE, factsFromSkySnapshot } from "./astrologyFacts.js";
import { debugInfoForZonedDateTime } from "./timezones.js";
import { assertCanonicalSkyPoints } from "./canonicalSkyAspectProfile.js";

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
  ["Sun", "☉"],
  ["Moon", "☽"],
  ["Mercury", "☿"],
  ["Venus", "♀"],
  ["Mars", "♂"],
  ["Jupiter", "♃"],
  ["Saturn", "♄"],
  ["Uranus", "♅"],
  ["Neptune", "♆"],
  ["Pluto", "♇"],
  ["Chiron", "⚷"],
  ["Lilith", "⚸"],
  ["North Node", "☊"]
] as const;

assertCanonicalSkyPoints([...planets.map(([planet]) => planet), "South Node"]);
assertCanonicalSkyPoints([...SKY_ASPECT_POINT_ORDER]);

const SE_CHIRON = 15;
const SE_MEAN_BLACK_MOON_LILITH = 12;
const SE_DERIVED_SOUTH_NODE = -1001;

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

export type LunarCalendarEventType = "lunation" | "ingress" | "aspect" | "station";
export type LunarCalendarEclipseType = "solar" | "lunar";
export type RetrogradePhase = "pre-shadow" | "station-retrograde" | "retrograde-passage" | "cazimi" | "sun-opposition" | "station-direct" | "post-shadow";
export type PlanetDirection = "direct" | "retrograde";
export type IngressPassType = "initial" | "re-entry" | "final";

export type SkyPlacementTransitAspectFact = {
  id: string;
  eventType: "aspect";
  planet: string;
  otherPlanet: string;
  planets: [string, string];
  aspect: "conjunction" | "sextile" | "square" | "trine" | "opposition";
  occursAt: string;
  dateKey: string;
  rank: number;
};

export type SkyPlacementTransitFacts = {
  planet: string;
  sign: string;
  timeZone: string;
  referenceDate: string;
  transitStart: string;
  transitEnd: string;
  priorSign: string;
  priorSignEntryDate: string;
  priorSignExitDate: string;
  previousResidency: {
    sign: string;
    entryDate: string;
    exitDate: string;
  } | null;
  rankedEventsDuringTransit: SkyPlacementTransitAspectFact[];
  calculationSource: "Swiss Ephemeris";
  zodiac: "tropical";
};

export type LunarCalendarEvent = {
  id: string;
  type: LunarCalendarEventType;
  title: string;
  startsAt: string;
  endsAt?: string;
  dateKey: string;
  glyph: string;
  primary: boolean;
  planet?: string;
  planets?: [string, string];
  aspect?: string;
  sign?: string;
  sunSign?: string;
  fromSign?: string;
  toSign?: string;
  direction?: PlanetDirection;
  passType?: IngressPassType;
  phase?: RetrogradePhase;
  longitude?: number;
  retrogradeStart?: string;
  retrogradeEnd?: string;
  shadowStart?: string;
  shadowEnd?: string;
  cazimi?: boolean;
  cazimiOrb?: number;
  nearSun?: boolean;
  eclipseType?: LunarCalendarEclipseType;
};

export type LunarCalendarActiveAspect = {
  planetA: string;
  aspectType: string;
  planetB: string;
  orb: number;
  applying: boolean;
};

export type LunarCalendarDay = {
  date: string;
  dateKey: string;
  inMonth: boolean;
  moonSign: string;
  moonSignGlyph: string;
  moonPhase: string;
  illumination: number;
  solarDaylight?: SolarDaylight;
  voidOfCourse?: {
    remainingLabel: string;
    durationLabel?: string;
    startsAt?: string;
    until?: string;
    nextSign?: string;
  } | null;
  activeAspects: LunarCalendarActiveAspect[];
  events: LunarCalendarEvent[];
};

export type LunarCalendarMonth = {
  month: string;
  timeZone: string;
  location: LocationInput;
  days: LunarCalendarDay[];
  events: LunarCalendarEvent[];
};

export type LunarCalendarDetailLevel = "basic" | "full";

type LunarCalendarMonthOptions = {
  detail?: LunarCalendarDetailLevel;
};

const calendarAspectDefinitions = SKY_ASPECT_DEFINITIONS
  .filter(({ type }) => type !== "quincunx")
  .map(({ type, exactAngle }) => [type, exactAngle] as const);
const namedCazimiOrbDegrees = 17 / 60;
const nearSunOrbDegrees = 1;

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

function wholeSignHouseCusps(ascendant: string): NonNullable<SkySnapshot["houseCusps"]> {
  const ascendantIndex = signIndexFor(ascendant);
  const startIndex = ascendantIndex >= 0 ? ascendantIndex : 0;

  return Array.from({ length: 12 }, (_, index) => {
    const signIndex = (startIndex + index) % 12;
    const [sign] = signs[signIndex];

    return {
      house: index + 1,
      longitude: signIndex * 30,
      sign,
      degree: 0,
      houseSystem: "whole_sign"
    };
  });
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

function southNodePositionFromNorthNode(
  swe: SwissEphInstance,
  northNode: CalculatedPlanet,
  ascendant: string,
  date: Date,
  includeTransitWindows: boolean,
  timeZone?: string
): CalculatedPlanet {
  const longitude = normalizeDegrees((northNode.longitude ?? 0) + 180);
  const { sign, signGlyph, degree } = signForLongitude(longitude);
  const transitWindow = includeTransitWindows
    ? signTransitWindowFor(swe, "South Node", SE_DERIVED_SOUTH_NODE, date, sign)
    : {};
  const structuralTransitFacts = includeTransitWindows
    ? skyPlacementStructuralTransitFacts(swe, "South Node", SE_DERIVED_SOUTH_NODE, sign, transitWindow)
    : {};

  return {
    ...northNode,
    planet: "South Node",
    glyph: "☋",
    longitude: Number(longitude.toFixed(4)),
    sign,
    signGlyph,
    degree,
    house: wholeSignHouse(sign, ascendant),
    theme: themeForPoint("South Node"),
    transitTimeZone: includeTransitWindows ? timeZone ?? "UTC" : undefined,
    ...transitWindow,
    ...structuralTransitFacts
  };
}

function elementForSign(sign: string): SkySnapshot["dominantElement"] {
  if (["Aries", "Leo", "Sagittarius"].includes(sign)) return "Fire";
  if (["Taurus", "Virgo", "Capricorn"].includes(sign)) return "Earth";
  if (["Gemini", "Libra", "Aquarius"].includes(sign)) return "Air";
  return "Water";
}

function themeForPoint(point: string) {
  const themes: Record<string, string> = {
    Sun: "identity and vitality",
    Moon: "emotional needs and instinct",
    Mercury: "thinking and communication",
    Venus: "love, taste, and connection",
    Mars: "drive, anger, and desire",
    Jupiter: "growth, faith, and opportunity",
    Saturn: "limits, discipline, and responsibility",
    Uranus: "freedom, disruption, and change",
    Neptune: "dreams, sensitivity, and imagination",
    Pluto: "power, depth, and transformation",
    Chiron: "tenderness, repair, and old wounds",
    Lilith: "instinct and refusal",
    "North Node": "growth edge and future direction",
    "South Node": "familiar patterns and release"
  };

  return themes[point] ?? point.toLowerCase();
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

  if (phase < 8) return "New Moon";
  if (phase < 67.5) return "Waxing Crescent";
  if (phase < 112.5) return "First Quarter";
  if (phase < 157.5) return "Waxing Gibbous";
  if (phase < 202.5) return "Full Moon";
  if (phase < 247.5) return "Waning Gibbous";
  if (phase < 292.5) return "Last Quarter";

  return "Waning Crescent";
}

function exactPlanetLongitude(swe: SwissEphInstance, planetId: number, date: Date): number {
  if (planetId === SE_DERIVED_SOUTH_NODE) {
    return normalizeDegrees(exactPlanetLongitude(swe, swe.SE_TRUE_NODE, date) + 180);
  }
  const jd = swe.julday(
    date.getUTCFullYear(),
    date.getUTCMonth() + 1,
    date.getUTCDate(),
    utcHour(date)
  );
  const flags = swe.SEFLG_SWIEPH;

  return normalizeDegrees(swe.calc_ut(jd, planetId, flags)[0]);
}

function exactPlanetSpeed(swe: SwissEphInstance, planetId: number, date: Date): number {
  if (planetId === SE_DERIVED_SOUTH_NODE) {
    return exactPlanetSpeed(swe, swe.SE_TRUE_NODE, date);
  }
  const jd = swe.julday(
    date.getUTCFullYear(),
    date.getUTCMonth() + 1,
    date.getUTCDate(),
    utcHour(date)
  );
  const flags = swe.SEFLG_SWIEPH | swe.SEFLG_SPEED;

  return swe.calc_ut(jd, planetId, flags)[3];
}

function exactPlanetSign(swe: SwissEphInstance, planetId: number, date: Date) {
  return signForLongitude(exactPlanetLongitude(swe, planetId, date)).sign;
}

function planetSunOrb(swe: SwissEphInstance, planetId: number, date: Date) {
  return angularSeparation(exactPlanetLongitude(swe, planetId, date), exactPlanetLongitude(swe, swe.SE_SUN, date));
}

function solarProximityFactsFor(swe: SwissEphInstance, planetId: number, date: Date) {
  const exactOrb = planetSunOrb(swe, planetId, date);
  const cazimiOrb = Number(exactOrb.toFixed(3));

  return {
    cazimi: exactOrb <= namedCazimiOrbDegrees,
    cazimiOrb,
    nearSun: exactOrb <= nearSunOrbDegrees
  };
}

function supportsSolarProximity(planet: string) {
  return ["Mercury", "Venus", "Mars", "Jupiter", "Saturn", "Uranus", "Neptune", "Pluto", "Chiron"].includes(planet);
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
  const roundedDays = Math.ceil(days);

  if (roundedDays < 1) {
    return "TODAY";
  }

  if (roundedDays < 30) {
    return `${roundedDays}D left`;
  }

  const months = roundedDays >= 365
    ? Math.max(12, Math.round(roundedDays / 30.44))
    : Math.max(1, Math.round(roundedDays / 30.44));

  if (months < 12) {
    return `${months}M left`;
  }

  const years = Math.floor(months / 12);
  const remainingMonths = months % 12;

  const duration = remainingMonths > 0 ? `${years}Y ${remainingMonths}M` : `${years}Y`;

  return `${duration} left`;
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

const skyPlacementAspectAngles = [
  ["conjunction", [0]],
  ["sextile", [60, 300]],
  ["square", [90, 270]],
  ["trine", [120, 240]],
  ["opposition", [180]]
] as const;

const skyPlacementConcurrentBodies = [
  "Sun",
  "Mercury",
  "Venus",
  "Mars",
  "Jupiter",
  "Saturn",
  "Uranus",
  "Neptune",
  "Pluto"
] as const;

const skyPlacementSearchYears: Record<string, number> = {
  Sun: 2,
  Mercury: 2,
  Venus: 2,
  Mars: 4,
  Jupiter: 14,
  Saturn: 32,
  Uranus: 90,
  Neptune: 180,
  Pluto: 300,
  Chiron: 60,
  "North Node": 20,
  "South Node": 20
};

const skyPlacementPreviousCycleGapYears: Record<string, number> = {
  Sun: 0.5,
  Mercury: 0.35,
  Venus: 0.5,
  Mars: 1,
  Jupiter: 6,
  Saturn: 14,
  Uranus: 40,
  Neptune: 80,
  Pluto: 100,
  Chiron: 20,
  "North Node": 8,
  "South Node": 8
};

function skyPlacementPlanetName(value: string) {
  const normalized = value.trim().toLowerCase().replace(/[_\s]+/gu, "-");
  const names: Record<string, string> = {
    sun: "Sun",
    mercury: "Mercury",
    venus: "Venus",
    mars: "Mars",
    jupiter: "Jupiter",
    saturn: "Saturn",
    uranus: "Uranus",
    neptune: "Neptune",
    pluto: "Pluto",
    chiron: "Chiron",
    "north-node": "North Node",
    "south-node": "South Node"
  };
  return names[normalized] ?? null;
}

function skyPlacementPlanetId(swe: SwissEphInstance, planet: string) {
  const ids: Record<string, number> = {
    Sun: swe.SE_SUN,
    Mercury: swe.SE_MERCURY,
    Venus: swe.SE_VENUS,
    Mars: swe.SE_MARS,
    Jupiter: swe.SE_JUPITER,
    Saturn: swe.SE_SATURN,
    Uranus: swe.SE_URANUS,
    Neptune: swe.SE_NEPTUNE,
    Pluto: swe.SE_PLUTO,
    Chiron: SE_CHIRON,
    "North Node": swe.SE_TRUE_NODE,
    "South Node": SE_DERIVED_SOUTH_NODE
  };
  return ids[planet] ?? null;
}

function signedAngle(value: number) {
  const normalized = normalizeDegrees(value);
  return normalized > 180 ? normalized - 360 : normalized;
}

function refineDirectedAspect(
  swe: SwissEphInstance,
  firstPlanetId: number,
  secondPlanetId: number,
  targetAngle: number,
  lowerInput: Date,
  upperInput: Date
) {
  let lower = lowerInput;
  let upper = upperInput;
  let lowerValue = signedAngle(
    exactPlanetLongitude(swe, secondPlanetId, lower)
    - exactPlanetLongitude(swe, firstPlanetId, lower)
    - targetAngle
  );

  for (let index = 0; index < 54; index += 1) {
    const midpoint = new Date((lower.getTime() + upper.getTime()) / 2);
    const midpointValue = signedAngle(
      exactPlanetLongitude(swe, secondPlanetId, midpoint)
      - exactPlanetLongitude(swe, firstPlanetId, midpoint)
      - targetAngle
    );
    if (lowerValue === 0 || lowerValue * midpointValue <= 0) {
      upper = midpoint;
    } else {
      lower = midpoint;
      lowerValue = midpointValue;
    }
  }

  return new Date((lower.getTime() + upper.getTime()) / 2);
}

function skyPlacementEventRank(otherPlanet: string, aspect: SkyPlacementTransitAspectFact["aspect"]) {
  const bodyRank: Record<string, number> = {
    Pluto: 0,
    Neptune: 1,
    Uranus: 2,
    Saturn: 3,
    Jupiter: 4,
    Mars: 5,
    Venus: 6,
    Mercury: 7,
    Sun: 8
  };
  const aspectRank: Record<SkyPlacementTransitAspectFact["aspect"], number> = {
    conjunction: 0,
    opposition: 1,
    square: 2,
    trine: 3,
    sextile: 4
  };
  return (bodyRank[otherPlanet] ?? 9) * 10 + aspectRank[aspect];
}

function findRankedSkyPlacementAspects(
  swe: SwissEphInstance,
  planet: string,
  planetId: number,
  start: Date,
  end: Date,
  timeZone: string
) {
  const spanDays = Math.max(1, (end.getTime() - start.getTime()) / 86_400_000);
  const stepDays = spanDays > 3650 ? 4 : spanDays > 730 ? 2 : 0.5;
  const events: SkyPlacementTransitAspectFact[] = [];

  for (const otherPlanet of skyPlacementConcurrentBodies) {
    if (otherPlanet === planet) continue;
    const otherPlanetId = skyPlacementPlanetId(swe, otherPlanet);
    if (otherPlanetId === null) continue;

    for (const [aspect, targetAngles] of skyPlacementAspectAngles) {
      for (const targetAngle of targetAngles) {
        let previousDate = start;
        let previousValue = signedAngle(
          exactPlanetLongitude(swe, otherPlanetId, previousDate)
          - exactPlanetLongitude(swe, planetId, previousDate)
          - targetAngle
        );
        for (
          let time = start.getTime() + stepDays * 86_400_000;
          previousDate.getTime() < end.getTime();
          time += stepDays * 86_400_000
        ) {
          const currentDate = new Date(Math.min(time, end.getTime()));
          const currentValue = signedAngle(
            exactPlanetLongitude(swe, otherPlanetId, currentDate)
            - exactPlanetLongitude(swe, planetId, currentDate)
            - targetAngle
          );
          const crossed = Math.abs(currentValue - previousValue) < 180
            && (previousValue === 0 || previousValue * currentValue < 0);
          if (crossed) {
            const occursAt = refineDirectedAspect(
              swe,
              planetId,
              otherPlanetId,
              targetAngle,
              previousDate,
              currentDate
            );
            const duplicate = events.some((event) => (
              event.otherPlanet === otherPlanet
              && event.aspect === aspect
              && Math.abs(new Date(event.occursAt).getTime() - occursAt.getTime()) < 3 * 60 * 60_000
            ));
            if (!duplicate) {
              events.push({
                id: `aspect-${planet}-${aspect}-${otherPlanet}-${occursAt.toISOString()}`.toLowerCase().replace(/\s+/gu, "-"),
                eventType: "aspect",
                planet,
                otherPlanet,
                planets: [planet, otherPlanet],
                aspect,
                occursAt: occursAt.toISOString(),
                dateKey: localDateKey(occursAt, timeZone),
                rank: skyPlacementEventRank(otherPlanet, aspect)
              });
            }
          }
          previousDate = currentDate;
          previousValue = currentValue;
          if (currentDate.getTime() === end.getTime()) break;
        }
      }
    }
  }

  return events.sort((first, second) => (
    first.rank - second.rank || first.occursAt.localeCompare(second.occursAt)
  ));
}

function findDateInSign(
  swe: SwissEphInstance,
  planet: string,
  planetId: number,
  sign: string,
  referenceDate: Date
) {
  if (exactPlanetSign(swe, planetId, referenceDate) === sign) return referenceDate;
  const stepDays = transitSearchStepDays(planet);
  const maxIterations = Math.ceil(((skyPlacementSearchYears[planet] ?? 32) * 365.25) / stepDays);
  let date = referenceDate;
  for (let index = 0; index < maxIterations; index += 1) {
    date = addDays(date, stepDays);
    if (exactPlanetSign(swe, planetId, date) === sign) return date;
  }
  return null;
}

function findPreviousSameSignResidency(
  swe: SwissEphInstance,
  planet: string,
  planetId: number,
  sign: string,
  currentStart: Date
) {
  const minimumGapDays = (skyPlacementPreviousCycleGapYears[planet] ?? 1) * 365.25;
  const stepDays = transitSearchStepDays(planet);
  const maxIterations = Math.ceil(((skyPlacementSearchYears[planet] ?? 32) * 365.25) / stepDays);
  let date = addDays(currentStart, -minimumGapDays);
  for (let index = 0; index < maxIterations; index += 1) {
    if (exactPlanetSign(swe, planetId, date) === sign) {
      const window = signTransitWindowFor(swe, planet, planetId, date, sign);
      if (window.transitStart && window.transitEnd && new Date(window.transitEnd) < currentStart) {
        return { start: new Date(window.transitStart), end: new Date(window.transitEnd) };
      }
    }
    date = addDays(date, -stepDays);
  }
  return null;
}

function skyPlacementStructuralTransitFacts(
  swe: SwissEphInstance,
  planet: string,
  planetId: number,
  sign: string,
  transitWindow: { transitStart?: string; transitEnd?: string }
) {
  if (planet === "Moon" || !transitWindow.transitStart || !transitWindow.transitEnd) return {};
  const currentStart = new Date(transitWindow.transitStart);
  const priorReference = new Date(currentStart.getTime() - 5 * 60_000);
  const priorTransitSign = exactPlanetSign(swe, planetId, priorReference);
  const priorWindow = signTransitWindowFor(swe, planet, planetId, priorReference, priorTransitSign);
  const previousResidency = findPreviousSameSignResidency(swe, planet, planetId, sign, currentStart);
  return {
    priorTransitSign,
    priorTransitStart: priorWindow.transitStart ?? null,
    priorTransitEnd: priorWindow.transitEnd ?? null,
    previousSignResidencyStart: previousResidency?.start.toISOString() ?? null,
    previousSignResidencyEnd: previousResidency?.end.toISOString() ?? null
  };
}

/**
 * Calculation-only facts for Sky Placement authoring packets. This does not
 * select or serve prose. Dates remain UTC instants with an explicit local-zone
 * date key; the authoring adapter joins meanings from astro-knowledge.
 */
export async function getSkyPlacementTransitFacts({
  planet: planetInput,
  sign,
  referenceDate = new Date(),
  timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC"
}: {
  planet: string;
  sign: string;
  referenceDate?: Date;
  timeZone?: string;
}): Promise<SkyPlacementTransitFacts> {
  const swe = await getSwissEph();
  const planet = skyPlacementPlanetName(planetInput);
  const planetId = planet ? skyPlacementPlanetId(swe, planet) : null;
  if (!planet || planetId === null) throw new Error(`Unsupported Sky Placement planet: ${planetInput}`);
  if (!signs.some(([candidate]) => candidate.toLowerCase() === sign.toLowerCase())) {
    throw new Error(`Unsupported zodiac sign: ${sign}`);
  }
  const signTitle = signs.find(([candidate]) => candidate.toLowerCase() === sign.toLowerCase())?.[0] ?? sign;
  const dateInSign = findDateInSign(swe, planet, planetId, signTitle, referenceDate);
  if (!dateInSign) throw new Error(`Could not locate ${planet} in ${signTitle} from ${referenceDate.toISOString()}`);
  const currentWindow = signTransitWindowFor(swe, planet, planetId, dateInSign, signTitle);
  if (!currentWindow.transitStart || !currentWindow.transitEnd) {
    throw new Error(`Could not calculate the ${planet} in ${signTitle} transit window.`);
  }
  const currentStart = new Date(currentWindow.transitStart);
  const currentEnd = new Date(currentWindow.transitEnd);
  const priorReference = new Date(currentStart.getTime() - 5 * 60_000);
  const priorSign = exactPlanetSign(swe, planetId, priorReference);
  const priorWindow = signTransitWindowFor(swe, planet, planetId, priorReference, priorSign);
  if (!priorWindow.transitStart || !priorWindow.transitEnd) {
    throw new Error(`Could not calculate the prior-sign window for ${planet} in ${signTitle}.`);
  }
  const previousResidency = findPreviousSameSignResidency(swe, planet, planetId, signTitle, currentStart);

  return {
    planet,
    sign: signTitle,
    timeZone,
    referenceDate: dateInSign.toISOString(),
    transitStart: currentStart.toISOString(),
    transitEnd: currentEnd.toISOString(),
    priorSign,
    priorSignEntryDate: priorWindow.transitStart,
    priorSignExitDate: priorWindow.transitEnd,
    previousResidency: previousResidency ? {
      sign: signTitle,
      entryDate: previousResidency.start.toISOString(),
      exitDate: previousResidency.end.toISOString()
    } : null,
    rankedEventsDuringTransit: findRankedSkyPlacementAspects(
      swe,
      planet,
      planetId,
      currentStart,
      currentEnd,
      timeZone
    ),
    calculationSource: "Swiss Ephemeris",
    zodiac: "tropical"
  };
}

function moonSunPhaseAngle(swe: SwissEphInstance, date: Date) {
  return normalizeDegrees(
    exactPlanetLongitude(swe, swe.SE_MOON, date) - exactPlanetLongitude(swe, swe.SE_SUN, date)
  );
}

function timeZoneOffsetMs(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit"
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  const asUtc = Date.UTC(
    Number(values.year),
    Number(values.month) - 1,
    Number(values.day),
    Number(values.hour),
    Number(values.minute),
    Number(values.second)
  );

  return asUtc - date.getTime();
}

function zonedDateTimeToUtc(timeZone: string, year: number, month: number, day: number, hour = 0, minute = 0, second = 0) {
  const targetUtc = Date.UTC(year, month - 1, day, hour, minute, second);
  let utcDate = new Date(targetUtc);

  for (let index = 0; index < 2; index += 1) {
    utcDate = new Date(targetUtc - timeZoneOffsetMs(utcDate, timeZone));
  }

  return utcDate;
}

function localDayRange(date: Date, timeZone?: string) {
  const zone = timeZone || Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: zone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  const year = Number(values.year);
  const month = Number(values.month);
  const day = Number(values.day);
  const start = zonedDateTimeToUtc(zone, year, month, day);
  const end = zonedDateTimeToUtc(zone, year, month, day + 1);

  return { start, end };
}

function localNoon(date: Date, timeZone?: string) {
  const zone = timeZone || Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  const { year, month, day } = localDateParts(date, zone);

  return zonedDateTimeToUtc(zone, year, month, day, 12);
}

function degreesToRadians(degrees: number) {
  return degrees * Math.PI / 180;
}

function radiansToDegrees(radians: number) {
  return radians * 180 / Math.PI;
}

function normalizeRadians(radians: number) {
  const circle = Math.PI * 2;
  return ((radians % circle) + circle) % circle;
}

function julianDayForDate(swe: SwissEphInstance, date: Date) {
  return swe.julday(
    date.getUTCFullYear(),
    date.getUTCMonth() + 1,
    date.getUTCDate(),
    utcHour(date)
  );
}

function greenwichMeanSiderealTimeDegrees(julianDay: number) {
  const centuries = (julianDay - 2451545.0) / 36525;

  return normalizeDegrees(
    280.46061837
    + 360.98564736629 * (julianDay - 2451545.0)
    + 0.000387933 * centuries * centuries
    - (centuries * centuries * centuries) / 38710000
  );
}

function sunAltitudeDegrees(swe: SwissEphInstance, location: LocationInput, date: Date) {
  const jd = julianDayForDate(swe, date);
  const flags = swe.SEFLG_SWIEPH | swe.SEFLG_SPEED;
  const [longitude, latitude] = swe.calc_ut(jd, swe.SE_SUN, flags);
  const eclipticLongitude = degreesToRadians(normalizeDegrees(longitude));
  const eclipticLatitude = degreesToRadians(latitude);
  const meanObliquity = degreesToRadians(23.439291111);
  const rightAscension = normalizeRadians(Math.atan2(
    Math.sin(eclipticLongitude) * Math.cos(meanObliquity) - Math.tan(eclipticLatitude) * Math.sin(meanObliquity),
    Math.cos(eclipticLongitude)
  ));
  const declination = Math.asin(
    Math.sin(eclipticLatitude) * Math.cos(meanObliquity)
    + Math.cos(eclipticLatitude) * Math.sin(meanObliquity) * Math.sin(eclipticLongitude)
  );
  const localSiderealTime = degreesToRadians(normalizeDegrees(greenwichMeanSiderealTimeDegrees(jd) + location.longitude));
  let hourAngle = normalizeRadians(localSiderealTime - rightAscension);

  if (hourAngle > Math.PI) {
    hourAngle -= Math.PI * 2;
  }

  const latitudeRadians = degreesToRadians(location.latitude);
  const altitude = Math.asin(
    Math.sin(latitudeRadians) * Math.sin(declination)
    + Math.cos(latitudeRadians) * Math.cos(declination) * Math.cos(hourAngle)
  );

  return radiansToDegrees(altitude);
}

function refineSolarAltitudeCrossing(
  swe: SwissEphInstance,
  location: LocationInput,
  lowerDate: Date,
  upperDate: Date,
  targetAltitude: number
) {
  let lower = lowerDate;
  let upper = upperDate;

  for (let index = 0; index < 42; index += 1) {
    const midpoint = new Date((lower.getTime() + upper.getTime()) / 2);
    const lowerAltitude = sunAltitudeDegrees(swe, location, lower) - targetAltitude;
    const midpointAltitude = sunAltitudeDegrees(swe, location, midpoint) - targetAltitude;

    if (lowerAltitude === 0 || lowerAltitude * midpointAltitude <= 0) {
      upper = midpoint;
    } else {
      lower = midpoint;
    }
  }

  return new Date((lower.getTime() + upper.getTime()) / 2);
}

function solarAltitudeCrossingForDay(
  swe: SwissEphInstance,
  location: LocationInput,
  start: Date,
  end: Date,
  targetAltitude: number,
  mode: "rise" | "set"
) {
  const stepMs = 5 * 60_000;
  let previousDate = start;
  let previousAltitude = sunAltitudeDegrees(swe, location, previousDate) - targetAltitude;

  for (let time = start.getTime() + stepMs; time <= end.getTime(); time += stepMs) {
    const currentDate = new Date(Math.min(time, end.getTime()));
    const currentAltitude = sunAltitudeDegrees(swe, location, currentDate) - targetAltitude;
    const crossed = mode === "rise"
      ? previousAltitude < 0 && currentAltitude >= 0
      : previousAltitude >= 0 && currentAltitude < 0;

    if (crossed) {
      return refineSolarAltitudeCrossing(swe, location, previousDate, currentDate, targetAltitude);
    }

    previousDate = currentDate;
    previousAltitude = currentAltitude;
  }

  return null;
}

function horizonSignFor(swe: SwissEphInstance, location: LocationInput, date: Date, horizon: "ascendant" | "descendant") {
  const houses = swe.houses(julianDayForDate(swe, date), location.latitude, location.longitude, "W") as unknown as {
    ascmc: Float64Array;
  };
  const ascendantLongitude = normalizeDegrees(houses.ascmc[0]);
  const longitude = horizon === "ascendant"
    ? ascendantLongitude
    : normalizeDegrees(ascendantLongitude + 180);

  return signForLongitude(longitude).sign;
}

function solarDaylightForDay(swe: SwissEphInstance, location: LocationInput, date: Date): SolarDaylight {
  const { start, end } = localDayRange(date, location.timeZone);
  const apparentHorizonAltitude = -0.833;
  const sunrise = solarAltitudeCrossingForDay(swe, location, start, end, apparentHorizonAltitude, "rise");
  const sunset = solarAltitudeCrossingForDay(swe, location, start, end, apparentHorizonAltitude, "set");
  const dayLengthMinutes = sunrise && sunset
    ? Math.max(0, Math.round((sunset.getTime() - sunrise.getTime()) / 60_000))
    : null;
  const sunriseRisingSign = sunrise ? horizonSignFor(swe, location, sunrise, "ascendant") : null;
  const sunsetSettingSign = sunset ? horizonSignFor(swe, location, sunset, "descendant") : null;

  return {
    sunrise: sunrise?.toISOString() ?? null,
    sunset: sunset?.toISOString() ?? null,
    dayLengthMinutes,
    sunriseRisingSign,
    sunsetSettingSign
  };
}

function moonSignAt(swe: SwissEphInstance, date: Date) {
  return signForLongitude(exactPlanetLongitude(swe, swe.SE_MOON, date)).sign;
}

function moonIngressAfter(swe: SwissEphInstance, date: Date) {
  const from = moonSignAt(swe, date);
  let upper = new Date(date.getTime() + 60 * 60_000);

  while (moonSignAt(swe, upper) === from && upper.getTime() - date.getTime() < 72 * 60 * 60_000) {
    upper = new Date(upper.getTime() + 60 * 60_000);
  }

  const to = moonSignAt(swe, upper);

  if (to === from) {
    return null;
  }

  let lower = date;

  for (let index = 0; index < 48; index += 1) {
    const midpoint = new Date((lower.getTime() + upper.getTime()) / 2);

    if (moonSignAt(swe, midpoint) === from) {
      lower = midpoint;
    } else {
      upper = midpoint;
    }
  }

  return {
    from,
    to,
    occursAt: upper
  };
}

function moonIngressBefore(swe: SwissEphInstance, date: Date) {
  const from = moonSignAt(swe, date);
  let lower = new Date(date.getTime() - 60 * 60_000);

  while (moonSignAt(swe, lower) === from && date.getTime() - lower.getTime() < 72 * 60 * 60_000) {
    lower = new Date(lower.getTime() - 60 * 60_000);
  }

  const previousSign = moonSignAt(swe, lower);

  if (previousSign === from) {
    return null;
  }

  let same = date;
  let different = lower;

  for (let index = 0; index < 48; index += 1) {
    const midpoint = new Date((same.getTime() + different.getTime()) / 2);

    if (moonSignAt(swe, midpoint) === from) {
      same = midpoint;
    } else {
      different = midpoint;
    }
  }

  return {
    from: previousSign,
    to: from,
    occursAt: same
  };
}

function moonSignTransitionForDay(swe: SwissEphInstance, date: Date, timeZone?: string): SkySnapshot["moonSignTransition"] {
  const { start, end } = localDayRange(date, timeZone);
  const from = moonSignAt(swe, start);
  const to = moonSignAt(swe, new Date(end.getTime() - 1));

  if (from === to) {
    return null;
  }

  let lower = start;
  let upper = end;

  for (let index = 0; index < 48; index += 1) {
    const midpoint = new Date((lower.getTime() + upper.getTime()) / 2);

    if (moonSignAt(swe, midpoint) === from) {
      lower = midpoint;
    } else {
      upper = midpoint;
    }
  }

  return {
    from,
    to,
    occursAt: upper.toISOString()
  };
}

function shortestAngleDistance(degrees: number) {
  const normalized = normalizeDegrees(degrees);

  return normalized > 180 ? normalized - 360 : normalized;
}

function moonAspectDistance(swe: SwissEphInstance, planetId: number, date: Date, targetDegrees: number) {
  const moonLongitude = exactPlanetLongitude(swe, swe.SE_MOON, date);
  const planetLongitude = exactPlanetLongitude(swe, planetId, date);

  return shortestAngleDistance(normalizeDegrees(moonLongitude - planetLongitude) - targetDegrees);
}

function refineMoonAspectEvent(
  swe: SwissEphInstance,
  planetId: number,
  targetDegrees: number,
  lowerDate: Date,
  upperDate: Date
) {
  let lower = lowerDate;
  let upper = upperDate;
  let lowerDistance = moonAspectDistance(swe, planetId, lower, targetDegrees);

  for (let index = 0; index < 50; index += 1) {
    const midpoint = new Date((lower.getTime() + upper.getTime()) / 2);
    const midpointDistance = moonAspectDistance(swe, planetId, midpoint, targetDegrees);

    if (Math.abs(midpointDistance) < 0.00001 || lowerDistance === 0 || lowerDistance * midpointDistance <= 0) {
      upper = midpoint;
    } else {
      lower = midpoint;
      lowerDistance = midpointDistance;
    }
  }

  return new Date((lower.getTime() + upper.getTime()) / 2);
}

function lunarAspectSearchConfig(swe: SwissEphInstance) {
  return {
    planetIds: [
      swe.SE_SUN,
      swe.SE_MERCURY,
      swe.SE_VENUS,
      swe.SE_MARS,
      swe.SE_JUPITER,
      swe.SE_SATURN,
      swe.SE_URANUS,
      swe.SE_NEPTUNE,
      swe.SE_PLUTO
    ],
    aspectTargets: [0, 60, 90, 120, 180, 240, 270, 300]
  };
}

function hasMoonAspectBeforeIngress(swe: SwissEphInstance, date: Date, ingressDate: Date) {
  const { planetIds, aspectTargets } = lunarAspectSearchConfig(swe);
  const stepMs = 15 * 60_000;

  for (const planetId of planetIds) {
    for (const target of aspectTargets) {
      let previousDistance = moonAspectDistance(swe, planetId, date, target);

      for (
        let time = Math.min(date.getTime() + stepMs, ingressDate.getTime());
        time <= ingressDate.getTime();
        time += stepMs
      ) {
        const currentDate = new Date(time);
        const currentDistance = moonAspectDistance(swe, planetId, currentDate, target);

        if (Math.abs(currentDistance) < 0.03 || previousDistance === 0 || previousDistance * currentDistance < 0) {
          return true;
        }

        previousDistance = currentDistance;
      }
    }
  }

  return false;
}

function lastMoonAspectBetween(swe: SwissEphInstance, startDate: Date, endDate: Date) {
  const { planetIds, aspectTargets } = lunarAspectSearchConfig(swe);
  const stepMs = 15 * 60_000;
  let latestAspect: Date | null = null;

  for (const planetId of planetIds) {
    for (const target of aspectTargets) {
      let previousDate = startDate;
      let previousDistance = moonAspectDistance(swe, planetId, previousDate, target);

      for (
        let time = Math.min(startDate.getTime() + stepMs, endDate.getTime());
        time <= endDate.getTime();
        time += stepMs
      ) {
        const currentDate = new Date(time);
        const currentDistance = moonAspectDistance(swe, planetId, currentDate, target);

        if (Math.abs(currentDistance) < 0.03 || previousDistance === 0 || previousDistance * currentDistance < 0) {
          const exactAspect = refineMoonAspectEvent(swe, planetId, target, previousDate, currentDate);

          if (exactAspect.getTime() <= endDate.getTime() && (!latestAspect || exactAspect.getTime() > latestAspect.getTime())) {
            latestAspect = exactAspect;
          }
        }

        previousDate = currentDate;
        previousDistance = currentDistance;
      }
    }
  }

  return latestAspect;
}

type MoonVoidPeriod = {
  startsAt: Date;
  until: Date;
  durationLabel: string;
  remainingLabel: string;
};

function moonVoidPeriodFor(
  swe: SwissEphInstance,
  date: Date,
  aspectCache?: Map<string, Date | null>
): MoonVoidPeriod | null {
  const ingress = moonIngressAfter(swe, date);

  if (!ingress) return null;

  const previousIngress = moonIngressBefore(swe, date);
  const currentSignStart = previousIngress?.occursAt ?? new Date(date.getTime() - 72 * 60 * 60_000);
  const aspectCacheKey = `${currentSignStart.toISOString()}|${ingress.occursAt.toISOString()}`;
  let lastAspect = aspectCache?.get(aspectCacheKey);

  if (lastAspect === undefined) {
    lastAspect = lastMoonAspectBetween(swe, currentSignStart, ingress.occursAt);
    aspectCache?.set(aspectCacheKey, lastAspect);
  }

  if (!lastAspect || date.getTime() < lastAspect.getTime() || date.getTime() >= ingress.occursAt.getTime()) {
    return null;
  }

  return {
    startsAt: lastAspect,
    until: ingress.occursAt,
    durationLabel: compactHoursRemaining(lastAspect, ingress.occursAt),
    remainingLabel: compactHoursRemaining(date, ingress.occursAt)
  };
}

function compactHoursRemaining(start: Date, end: Date) {
  const minutes = Math.max(0, Math.round((end.getTime() - start.getTime()) / 60_000));

  if (minutes < 60) {
    return `${Math.max(1, minutes)}min`;
  }

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  const hourLabel = `${hours}hr${hours === 1 ? "" : "s"}`;

  return remainingMinutes > 0 ? `${hourLabel} ${remainingMinutes}min` : hourLabel;
}

function compactCalendarVoidLabel(label: string | undefined) {
  return (label ?? "").replace(/hrs?/g, "h").replace(/min/g, "m");
}

function moonStatusFor(
  swe: SwissEphInstance,
  date: Date,
  voidAspectCache?: Map<string, Date | null>
): SkySnapshot["moonStatus"] {
  const currentSign = moonSignAt(swe, date);
  const ingress = moonIngressAfter(swe, date);

  if (!ingress) {
    return {
      kind: "sign",
      label: currentSign,
      sign: currentSign
    };
  }

  const voidPeriod = moonVoidPeriodFor(swe, date, voidAspectCache);

  if (voidPeriod) {
    return {
      kind: "void",
      label: `VoC (${voidPeriod.remainingLabel})`,
      sign: currentSign,
      nextSign: ingress.to,
      startsAt: voidPeriod.startsAt.toISOString(),
      until: voidPeriod.until.toISOString(),
      durationLabel: voidPeriod.durationLabel,
      remainingLabel: voidPeriod.remainingLabel
    };
  }

  return {
    kind: "sign",
    label: currentSign,
    sign: currentSign,
    nextSign: ingress.to,
    until: ingress.occursAt.toISOString()
  };
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

function localDateParts(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));

  return {
    year: Number(values.year),
    month: Number(values.month),
    day: Number(values.day)
  };
}

function localDateKey(date: Date, timeZone: string) {
  const { year, month, day } = localDateParts(date, timeZone);

  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function monthGridRange(month: Date, timeZone: string) {
  const monthStart = zonedDateTimeToUtc(timeZone, month.getFullYear(), month.getMonth() + 1, 1);
  const firstWeekday = new Intl.DateTimeFormat("en-US", {
    timeZone,
    weekday: "short"
  }).format(monthStart);
  const weekdayIndex = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(firstWeekday);
  const gridStart = zonedDateTimeToUtc(timeZone, month.getFullYear(), month.getMonth() + 1, 1 - Math.max(0, weekdayIndex));
  const gridEnd = new Date(gridStart.getTime() + 42 * 86_400_000);

  return { gridStart, gridEnd };
}

function moonPhaseIllumination(swe: SwissEphInstance, date: Date) {
  return illuminationFromPhaseAngle(moonSunPhaseAngle(swe, date));
}

function illuminationFromPhaseAngle(phase: number) {
  return Math.round(((1 - Math.cos((phase * Math.PI) / 180)) / 2) * 100);
}

function refinePhaseEvent(
  swe: SwissEphInstance,
  targetDegrees: number,
  lowerDate: Date,
  upperDate: Date
) {
  let lower = lowerDate;
  let upper = upperDate;
  let lowerDistance = shortestAngleDistance(moonSunPhaseAngle(swe, lower) - targetDegrees);

  for (let index = 0; index < 56; index += 1) {
    const midpoint = new Date((lower.getTime() + upper.getTime()) / 2);
    const midpointDistance = shortestAngleDistance(moonSunPhaseAngle(swe, midpoint) - targetDegrees);

    if (lowerDistance === 0 || lowerDistance * midpointDistance <= 0) {
      upper = midpoint;
    } else {
      lower = midpoint;
      lowerDistance = midpointDistance;
    }
  }

  return new Date((lower.getTime() + upper.getTime()) / 2);
}

function findLunations(
  swe: SwissEphInstance,
  start: Date,
  end: Date,
  timeZone: string
): LunarCalendarEvent[] {
  const phaseTargets = [
    { name: "New Moon", target: 0, glyph: "●", primary: true },
    { name: "First Quarter Moon", target: 90, glyph: "◐", primary: false },
    { name: "Full Moon", target: 180, glyph: "○", primary: true },
    { name: "Last Quarter Moon", target: 270, glyph: "◑", primary: false }
  ];
  const events: LunarCalendarEvent[] = [];
  const stepMs = 6 * 60 * 60_000;
  const sampledPhases: Array<{ date: Date; phase: number }> = [];
  let previousRawPhase = moonSunPhaseAngle(swe, start);
  let phaseOffset = 0;

  sampledPhases.push({ date: start, phase: previousRawPhase });

  for (let time = start.getTime() + stepMs; time <= end.getTime(); time += stepMs) {
    const currentDate = new Date(time);
    const rawPhase = moonSunPhaseAngle(swe, currentDate);

    if (rawPhase + phaseOffset < previousRawPhase - 120) {
      phaseOffset += 360;
    }

    const unwrappedPhase = rawPhase + phaseOffset;
    sampledPhases.push({ date: currentDate, phase: unwrappedPhase });
    previousRawPhase = unwrappedPhase;
  }

  phaseTargets.forEach((phaseTarget) => {
    for (let index = 1; index < sampledPhases.length; index += 1) {
      const previous = sampledPhases[index - 1];
      const current = sampledPhases[index];
      const firstTarget = phaseTarget.target + Math.ceil((previous.phase - phaseTarget.target) / 360) * 360;
      const targets = [firstTarget, firstTarget + 360];

      targets.forEach((target) => {
        if (target < previous.phase || target > current.phase) {
          return;
        }

        const occursAt = refinePhaseEvent(swe, phaseTarget.target, previous.date, current.date);
        const moonSign = signForLongitude(exactPlanetLongitude(swe, swe.SE_MOON, occursAt)).sign;
        const sunSign = signForLongitude(exactPlanetLongitude(swe, swe.SE_SUN, occursAt)).sign;
        const sign = moonSign;
        const dateKey = localDateKey(occursAt, timeZone);
        const eclipseType = eclipseTypeForLunation(swe, occursAt, phaseTarget.target);
        const title = lunationTitle(phaseTarget.name, sign, eclipseType);

        if (!events.some((event) => Math.abs(new Date(event.startsAt).getTime() - occursAt.getTime()) < 60 * 60_000 && event.title.startsWith(phaseTarget.name))) {
          events.push({
            id: `lunation-${phaseTarget.name.toLowerCase().replace(/\s+/g, "-")}-${occursAt.toISOString()}`,
            type: "lunation",
            title,
            startsAt: occursAt.toISOString(),
            dateKey,
            glyph: phaseTarget.glyph,
            primary: phaseTarget.primary,
            sign,
            sunSign,
            eclipseType: eclipseType ?? undefined
          });
        }
      });
    }
  });

  return events;
}

function eclipseTypeForLunation(
  swe: SwissEphInstance,
  date: Date,
  targetPhase: number
): LunarCalendarEclipseType | null {
  if (targetPhase !== 0 && targetPhase !== 180) {
    return null;
  }

  const nodeLongitude = exactPlanetLongitude(swe, swe.SE_TRUE_NODE, date);
  const lunationLongitude = exactPlanetLongitude(
    swe,
    targetPhase === 0 ? swe.SE_SUN : swe.SE_MOON,
    date
  );
  const nearestNodeDistance = Math.min(
    angularSeparation(lunationLongitude, nodeLongitude),
    angularSeparation(lunationLongitude, normalizeDegrees(nodeLongitude + 180))
  );

  return nearestNodeDistance <= 17.5 ? targetPhase === 0 ? "solar" : "lunar" : null;
}

function lunationTitle(name: string, sign: string, eclipseType: LunarCalendarEclipseType | null) {
  if (eclipseType === "solar") return `${name} Solar Eclipse in ${sign}`;
  if (eclipseType === "lunar") return `${name} Lunar Eclipse in ${sign}`;

  return `${name} in ${sign}`;
}

function refineSignIngress(
  swe: SwissEphInstance,
  planetId: number,
  fromSign: string,
  lowerDate: Date,
  upperDate: Date
) {
  let lower = lowerDate;
  let upper = upperDate;

  for (let index = 0; index < 52; index += 1) {
    const midpoint = new Date((lower.getTime() + upper.getTime()) / 2);

    if (exactPlanetSign(swe, planetId, midpoint) === fromSign) {
      lower = midpoint;
    } else {
      upper = midpoint;
    }
  }

  return upper;
}

function findIngresses(
  swe: SwissEphInstance,
  start: Date,
  end: Date,
  timeZone: string
): LunarCalendarEvent[] {
  const planetIds = [
    swe.SE_SUN,
    swe.SE_MERCURY,
    swe.SE_VENUS,
    swe.SE_MARS,
    swe.SE_JUPITER,
    swe.SE_SATURN,
    swe.SE_URANUS,
    swe.SE_NEPTUNE,
    swe.SE_PLUTO
  ];
  const calendarPlanets = planets.filter(([planet]) => planet !== "Moon").slice(0, planetIds.length);
  const events: LunarCalendarEvent[] = [];

  calendarPlanets.forEach(([planet, glyph], index) => {
    const planetId = planetIds[index];
    const stepMs = planet === "Moon" ? 3 * 60 * 60_000 : 12 * 60 * 60_000;
    const historyStart = planet === "Sun" ? start : addDays(start, -550);
    const ingressHistory: LunarCalendarEvent[] = [];
    let previousDate = historyStart;
    let previousSign = exactPlanetSign(swe, planetId, previousDate);

    for (let time = historyStart.getTime() + stepMs; time <= end.getTime(); time += stepMs) {
      const currentDate = new Date(time);
      const currentSign = exactPlanetSign(swe, planetId, currentDate);

      if (currentSign !== previousSign) {
        const occursAt = refineSignIngress(swe, planetId, previousSign, previousDate, currentDate);
        const longitude = exactPlanetLongitude(swe, planetId, occursAt);
        const direction = exactPlanetSpeed(swe, planetId, occursAt) < 0 ? "retrograde" : "direct";
        const toSign = exactPlanetSign(swe, planetId, occursAt);
        const dateKey = localDateKey(occursAt, timeZone);
        const previousIngress = ingressHistory.at(-1);
        const passType: IngressPassType = planet === "Sun"
          ? "initial"
          : direction === "retrograde"
            ? "re-entry"
            : previousIngress?.direction === "retrograde"
              && previousIngress.fromSign === toSign
              && previousIngress.toSign === previousSign
              ? "final"
              : "initial";
        const event: LunarCalendarEvent = {
          id: `ingress-${planet.toLowerCase().replace(/\s+/g, "-")}-${occursAt.toISOString()}`,
          type: "ingress",
          title: `${planet} enters ${toSign}`,
          startsAt: occursAt.toISOString(),
          dateKey,
          glyph,
          primary: planet !== "Moon",
          planet,
          fromSign: previousSign,
          toSign,
          sign: toSign,
          longitude,
          direction,
          passType
        };

        ingressHistory.push(event);
        if (occursAt.getTime() >= start.getTime() && occursAt.getTime() <= end.getTime()) {
          events.push(event);
        }
      }

      previousDate = currentDate;
      previousSign = currentSign;
    }
  });

  return events;
}

function refineStationEvent(
  swe: SwissEphInstance,
  planetId: number,
  lowerDate: Date,
  upperDate: Date
) {
  let lower = lowerDate;
  let upper = upperDate;
  let lowerSpeed = exactPlanetSpeed(swe, planetId, lower);

  for (let index = 0; index < 54; index += 1) {
    const midpoint = new Date((lower.getTime() + upper.getTime()) / 2);
    const midpointSpeed = exactPlanetSpeed(swe, planetId, midpoint);

    if (lowerSpeed === 0 || lowerSpeed * midpointSpeed <= 0) {
      upper = midpoint;
    } else {
      lower = midpoint;
      lowerSpeed = midpointSpeed;
    }
  }

  return new Date((lower.getTime() + upper.getTime()) / 2);
}

function findStations(
  swe: SwissEphInstance,
  start: Date,
  end: Date,
  timeZone: string
): LunarCalendarEvent[] {
  const planetIds = [
    swe.SE_MERCURY,
    swe.SE_VENUS,
    swe.SE_MARS,
    swe.SE_JUPITER,
    swe.SE_SATURN,
    swe.SE_URANUS,
    swe.SE_NEPTUNE,
    swe.SE_PLUTO,
    SE_CHIRON
  ];
  const stationPlanets = planets.slice(2, 11);
  const events: LunarCalendarEvent[] = [];
  const stepMs = 12 * 60 * 60_000;

  stationPlanets.forEach(([planet, glyph], index) => {
    const planetId = planetIds[index];
    let previousDate = start;
    let previousSpeed = exactPlanetSpeed(swe, planetId, previousDate);

    for (let time = start.getTime() + stepMs; time <= end.getTime(); time += stepMs) {
      const currentDate = new Date(time);
      const currentSpeed = exactPlanetSpeed(swe, planetId, currentDate);

      if (previousSpeed === 0 || previousSpeed * currentSpeed < 0) {
        const occursAt = refineStationEvent(swe, planetId, previousDate, currentDate);
        const speedAfter = exactPlanetSpeed(swe, planetId, addDays(occursAt, 1));
        const direction: PlanetDirection = speedAfter < 0 ? "retrograde" : "direct";
        const dateKey = localDateKey(occursAt, timeZone);
        const sign = exactPlanetSign(swe, planetId, occursAt);
        const longitude = Number(exactPlanetLongitude(swe, planetId, occursAt).toFixed(4));

        if (!events.some((event) => event.planet === planet && Math.abs(new Date(event.startsAt).getTime() - occursAt.getTime()) < 24 * 60 * 60_000)) {
          events.push({
            id: `station-${planet.toLowerCase().replace(/\s+/g, "-")}-${direction}-${occursAt.toISOString()}`,
            type: "station",
            title: `${planet} stations ${direction}`,
            startsAt: occursAt.toISOString(),
            dateKey,
            glyph,
            primary: true,
            planet,
            sign,
            direction,
            phase: direction === "retrograde" ? "station-retrograde" : "station-direct",
            longitude,
            ...solarProximityFactsFor(swe, planetId, occursAt)
          });
        }
      }

      previousDate = currentDate;
      previousSpeed = currentSpeed;
    }
  });

  return events;
}

function findActiveRetrogrades(
  swe: SwissEphInstance,
  displayStart: Date,
  displayEnd: Date,
  timeZone: string
): LunarCalendarEvent[] {
  const planetIds = [
    swe.SE_MERCURY,
    swe.SE_VENUS,
    swe.SE_MARS,
    swe.SE_JUPITER,
    swe.SE_SATURN,
    swe.SE_URANUS,
    swe.SE_NEPTUNE,
    swe.SE_PLUTO,
    SE_CHIRON
  ];
  const retrogradePlanets = planets.slice(2, 11);

  const events: LunarCalendarEvent[] = [];
  const directStationCache = new Map<string, Date | null>();

  function nextDirectStation(planetId: number, planet: string, fromDate: Date) {
    if (directStationCache.has(planet)) {
      return directStationCache.get(planet) ?? null;
    }

    const stepMs = 12 * 60 * 60_000;
    let previousDate = fromDate;
    let previousSpeed = exactPlanetSpeed(swe, planetId, previousDate);
    let directStation: Date | null = null;

    for (let time = fromDate.getTime() + stepMs; time <= fromDate.getTime() + 240 * 86_400_000; time += stepMs) {
      const currentDate = new Date(time);
      const currentSpeed = exactPlanetSpeed(swe, planetId, currentDate);

      if (previousSpeed < 0 && currentSpeed >= 0) {
        directStation = refineStationEvent(swe, planetId, previousDate, currentDate);
        break;
      }

      previousDate = currentDate;
      previousSpeed = currentSpeed;
    }

    directStationCache.set(planet, directStation);

    return directStation;
  }

  for (let time = displayStart.getTime(); time < displayEnd.getTime(); time += 86_400_000) {
    const dayStart = new Date(time);
    const dateKey = localDateKey(dayStart, timeZone);
    const sampleTime = addDays(dayStart, 0.5);

    retrogradePlanets.forEach(([planet, glyph], index) => {
      const planetId = planetIds[index];
      const speed = exactPlanetSpeed(swe, planetId, sampleTime);

      if (speed >= -0.0001) {
        return;
      }

      const sign = exactPlanetSign(swe, planetId, sampleTime);
      const endsAt = nextDirectStation(planetId, planet, sampleTime);
      const retrogradeFacts = retrogradeCycleFactsFor(swe, planet, planetId, sampleTime, "retrograde");
      const solarProximity = solarProximityFactsFor(swe, planetId, sampleTime);
      const longitude = Number(exactPlanetLongitude(swe, planetId, sampleTime).toFixed(4));

      events.push({
        id: `retrograde-${planet.toLowerCase().replace(/\s+/g, "-")}-${dateKey}`,
        type: "station" as const,
        title: `${planet} retrograde`,
        startsAt: dayStart.toISOString(),
        endsAt: endsAt?.toISOString(),
        dateKey,
        glyph,
        primary: false,
        planet,
        sign,
        direction: "retrograde",
        phase: "retrograde-passage",
        longitude,
        retrogradeStart: retrogradeFacts.retrogradeStart ?? undefined,
        retrogradeEnd: retrogradeFacts.retrogradeEnd ?? endsAt?.toISOString(),
        shadowStart: retrogradeFacts.retrogradeShadowStart ?? undefined,
        shadowEnd: retrogradeFacts.retrogradeShadowEnd ?? undefined,
        cazimi: retrogradeFacts.cazimi ?? solarProximity.cazimi,
        cazimiOrb: retrogradeFacts.cazimiOrb ?? solarProximity.cazimiOrb,
        nearSun: retrogradeFacts.nearSun ?? solarProximity.nearSun
      });
    });
  }

  return events;
}

function retrogradeSearchWindowDays(planet: string) {
  if (["Mercury", "Venus", "Mars"].includes(planet)) {
    return 180;
  }

  if (["Jupiter", "Saturn"].includes(planet)) {
    return 420;
  }

  if (["Uranus", "Neptune", "Pluto", "Chiron"].includes(planet)) {
    return 600;
  }

  return 240;
}

function findPreviousStation(
  swe: SwissEphInstance,
  planetId: number,
  date: Date,
  maxDays: number
) {
  const stepMs = 12 * 60 * 60_000;
  let upper = date;
  let upperSpeed = exactPlanetSpeed(swe, planetId, upper);

  for (let elapsedMs = stepMs; elapsedMs <= maxDays * 86_400_000; elapsedMs += stepMs) {
    const lower = new Date(date.getTime() - elapsedMs);
    const lowerSpeed = exactPlanetSpeed(swe, planetId, lower);

    if (lowerSpeed === 0 || lowerSpeed * upperSpeed <= 0) {
      return refineStationEvent(swe, planetId, lower, upper);
    }

    upper = lower;
    upperSpeed = lowerSpeed;
  }

  return null;
}

function findNextStation(
  swe: SwissEphInstance,
  planetId: number,
  date: Date,
  maxDays: number
) {
  const stepMs = 12 * 60 * 60_000;
  let lower = date;
  let lowerSpeed = exactPlanetSpeed(swe, planetId, lower);

  for (let elapsedMs = stepMs; elapsedMs <= maxDays * 86_400_000; elapsedMs += stepMs) {
    const upper = new Date(date.getTime() + elapsedMs);
    const upperSpeed = exactPlanetSpeed(swe, planetId, upper);

    if (lowerSpeed === 0 || lowerSpeed * upperSpeed <= 0) {
      return refineStationEvent(swe, planetId, lower, upper);
    }

    lower = upper;
    lowerSpeed = upperSpeed;
  }

  return null;
}

function longitudeDistanceFromTarget(
  swe: SwissEphInstance,
  planetId: number,
  date: Date,
  targetLongitude: number
) {
  return shortestAngleDistance(exactPlanetLongitude(swe, planetId, date) - targetLongitude);
}

function refineLongitudeCrossing(
  swe: SwissEphInstance,
  planetId: number,
  targetLongitude: number,
  lowerDate: Date,
  upperDate: Date
) {
  let lower = lowerDate;
  let upper = upperDate;
  let lowerDistance = longitudeDistanceFromTarget(swe, planetId, lower, targetLongitude);

  for (let index = 0; index < 54; index += 1) {
    const midpoint = new Date((lower.getTime() + upper.getTime()) / 2);
    const midpointDistance = longitudeDistanceFromTarget(swe, planetId, midpoint, targetLongitude);

    if (Math.abs(midpointDistance) < 0.00001 || lowerDistance === 0 || lowerDistance * midpointDistance <= 0) {
      upper = midpoint;
    } else {
      lower = midpoint;
      lowerDistance = midpointDistance;
    }
  }

  return new Date((lower.getTime() + upper.getTime()) / 2);
}

function findNearestPreviousLongitudeCrossing(
  swe: SwissEphInstance,
  planetId: number,
  targetLongitude: number,
  from: Date,
  maxDays: number
) {
  const stepMs = 6 * 60 * 60_000;
  let upper = from;
  let upperDistance = longitudeDistanceFromTarget(swe, planetId, upper, targetLongitude);

  for (let elapsedMs = stepMs; elapsedMs <= maxDays * 86_400_000; elapsedMs += stepMs) {
    const lower = new Date(from.getTime() - elapsedMs);
    const lowerDistance = longitudeDistanceFromTarget(swe, planetId, lower, targetLongitude);

    if (Math.abs(lowerDistance) < 0.00001 || upperDistance === 0 || lowerDistance * upperDistance <= 0) {
      return refineLongitudeCrossing(swe, planetId, targetLongitude, lower, upper);
    }

    upper = lower;
    upperDistance = lowerDistance;
  }

  return null;
}

function findNearestNextLongitudeCrossing(
  swe: SwissEphInstance,
  planetId: number,
  targetLongitude: number,
  from: Date,
  maxDays: number
) {
  const stepMs = 6 * 60 * 60_000;
  let lower = from;
  let lowerDistance = longitudeDistanceFromTarget(swe, planetId, lower, targetLongitude);

  for (let elapsedMs = stepMs; elapsedMs <= maxDays * 86_400_000; elapsedMs += stepMs) {
    const upper = new Date(from.getTime() + elapsedMs);
    const upperDistance = longitudeDistanceFromTarget(swe, planetId, upper, targetLongitude);

    if (Math.abs(upperDistance) < 0.00001 || lowerDistance === 0 || lowerDistance * upperDistance <= 0) {
      return refineLongitudeCrossing(swe, planetId, targetLongitude, lower, upper);
    }

    lower = upper;
    lowerDistance = upperDistance;
  }

  return null;
}

function retrogradeCycleFactsFor(
  swe: SwissEphInstance,
  planet: string,
  planetId: number,
  date: Date,
  motion: PlanetDirection
): Pick<PlanetPosition, "retrogradeStart" | "retrogradeEnd" | "retrogradeWindowSource" | "retrogradePhase" | "retrogradeShadowStart" | "retrogradeShadowEnd" | "cazimi" | "cazimiOrb" | "nearSun"> {
  if (motion !== "retrograde") {
    return {};
  }

  const searchDays = retrogradeSearchWindowDays(planet);
  const previousStation = findPreviousStation(swe, planetId, date, searchDays);
  const nextStation = findNextStation(swe, planetId, date, searchDays);

  if (!previousStation || !nextStation) {
    return {};
  }

  const speedAfterPreviousStation = exactPlanetSpeed(swe, planetId, addDays(previousStation, 1));
  const speedAfterNextStation = exactPlanetSpeed(swe, planetId, addDays(nextStation, 1));

  if (speedAfterPreviousStation >= 0 || speedAfterNextStation < 0) {
    return {};
  }

  const retrogradeStartLongitude = exactPlanetLongitude(swe, planetId, previousStation);
  const retrogradeEndLongitude = exactPlanetLongitude(swe, planetId, nextStation);
  const shadowSearchDays = Math.max(90, Math.min(searchDays, 240));
  const shadowStart = findNearestPreviousLongitudeCrossing(
    swe,
    planetId,
    retrogradeEndLongitude,
    previousStation,
    shadowSearchDays
  );
  const shadowEnd = findNearestNextLongitudeCrossing(
    swe,
    planetId,
    retrogradeStartLongitude,
    nextStation,
    shadowSearchDays
  );
  return {
    retrogradeStart: previousStation.toISOString(),
    retrogradeEnd: nextStation.toISOString(),
    retrogradeWindowSource: "station",
    retrogradePhase: "retrograde-passage",
    retrogradeShadowStart: shadowStart?.toISOString() ?? null,
    retrogradeShadowEnd: shadowEnd?.toISOString() ?? null,
    ...solarProximityFactsFor(swe, planetId, date)
  };
}

type RetrogradeCycleWindow = {
  retrogradeStart: Date;
  retrogradeEnd: Date;
  shadowStart: Date;
  shadowEnd: Date;
};

function planetStationTimesBetween(
  swe: SwissEphInstance,
  planetId: number,
  start: Date,
  end: Date
) {
  const stations: Array<{ occursAt: Date; direction: PlanetDirection }> = [];
  const stepMs = 12 * 60 * 60_000;
  let previousDate = start;
  let previousSpeed = exactPlanetSpeed(swe, planetId, previousDate);

  for (let time = start.getTime() + stepMs; time <= end.getTime(); time += stepMs) {
    const currentDate = new Date(time);
    const currentSpeed = exactPlanetSpeed(swe, planetId, currentDate);

    if (previousSpeed === 0 || previousSpeed * currentSpeed < 0) {
      const occursAt = refineStationEvent(swe, planetId, previousDate, currentDate);
      const direction: PlanetDirection = exactPlanetSpeed(swe, planetId, addDays(occursAt, 1)) < 0
        ? "retrograde"
        : "direct";
      if (!stations.some((station) => Math.abs(station.occursAt.getTime() - occursAt.getTime()) < 24 * 60 * 60_000)) {
        stations.push({ occursAt, direction });
      }
    }

    previousDate = currentDate;
    previousSpeed = currentSpeed;
  }

  return stations;
}

function retrogradeCycleWindowsForRange(
  swe: SwissEphInstance,
  planet: string,
  planetId: number,
  start: Date,
  end: Date
): RetrogradeCycleWindow[] {
  const searchDays = retrogradeSearchWindowDays(planet);
  const stations = planetStationTimesBetween(
    swe,
    planetId,
    addDays(start, -searchDays),
    addDays(end, searchDays)
  );
  const shadowSearchDays = Math.max(90, Math.min(searchDays, 240));
  const cycles: RetrogradeCycleWindow[] = [];

  stations.forEach((station, index) => {
    if (station.direction !== "retrograde") return;
    const directStation = stations.slice(index + 1).find((candidate) => candidate.direction === "direct");
    if (!directStation) return;

    const retrogradeStartLongitude = exactPlanetLongitude(swe, planetId, station.occursAt);
    const retrogradeEndLongitude = exactPlanetLongitude(swe, planetId, directStation.occursAt);
    const shadowStart = findNearestPreviousLongitudeCrossing(
      swe,
      planetId,
      retrogradeEndLongitude,
      station.occursAt,
      shadowSearchDays
    );
    const shadowEnd = findNearestNextLongitudeCrossing(
      swe,
      planetId,
      retrogradeStartLongitude,
      directStation.occursAt,
      shadowSearchDays
    );

    if (!shadowStart || !shadowEnd) return;
    if (!(shadowStart < station.occursAt && station.occursAt < directStation.occursAt && directStation.occursAt < shadowEnd)) return;
    if (shadowEnd < start || shadowStart > end) return;
    cycles.push({
      retrogradeStart: station.occursAt,
      retrogradeEnd: directStation.occursAt,
      shadowStart,
      shadowEnd
    });
  });

  return cycles;
}

function findActiveShadowPhases(
  swe: SwissEphInstance,
  displayStart: Date,
  displayEnd: Date,
  timeZone: string
): LunarCalendarEvent[] {
  const shadowPlanetIds = [swe.SE_MERCURY, swe.SE_VENUS, swe.SE_MARS];
  const shadowPlanets = planets.slice(2, 5);
  const cyclesByPlanet = shadowPlanets.map(([planet], index) => (
    retrogradeCycleWindowsForRange(swe, planet, shadowPlanetIds[index], displayStart, displayEnd)
  ));
  const events: LunarCalendarEvent[] = [];

  for (let time = displayStart.getTime(); time < displayEnd.getTime(); time += 86_400_000) {
    const dayStart = new Date(time);
    const sampleTime = addDays(dayStart, 0.5);
    const dateKey = localDateKey(dayStart, timeZone);

    shadowPlanets.forEach(([planet, glyph], index) => {
      const cycle = cyclesByPlanet[index].find((candidate) => (
        sampleTime >= candidate.shadowStart && sampleTime <= candidate.shadowEnd
      ));
      if (!cycle) return;

      const phase: RetrogradePhase | null = sampleTime < cycle.retrogradeStart
        ? "pre-shadow"
        : sampleTime >= cycle.retrogradeEnd
          ? "post-shadow"
          : null;
      if (!phase) return;

      const planetId = shadowPlanetIds[index];
      const sign = exactPlanetSign(swe, planetId, sampleTime);
      events.push({
        id: `${phase}-${planet.toLowerCase()}-${dateKey}`,
        type: "station",
        title: `${planet} retrograde ${phase}`,
        startsAt: dayStart.toISOString(),
        endsAt: (phase === "pre-shadow" ? cycle.retrogradeStart : cycle.shadowEnd).toISOString(),
        dateKey,
        glyph,
        primary: false,
        planet,
        sign,
        direction: "direct",
        phase,
        longitude: Number(exactPlanetLongitude(swe, planetId, sampleTime).toFixed(4)),
        retrogradeStart: cycle.retrogradeStart.toISOString(),
        retrogradeEnd: cycle.retrogradeEnd.toISOString(),
        shadowStart: cycle.shadowStart.toISOString(),
        shadowEnd: cycle.shadowEnd.toISOString()
      });
    });
  }

  return events;
}

function activeRetrogradeWindowFor(
  swe: SwissEphInstance,
  planet: string,
  planetId: number,
  date: Date,
  motion: PlanetPosition["motion"]
): Pick<PlanetPosition, "retrogradeStart" | "retrogradeEnd" | "retrogradeWindowSource"> {
  if (motion !== "retrograde") {
    return {};
  }

  const searchDays = retrogradeSearchWindowDays(planet);
  const previousStation = findPreviousStation(swe, planetId, date, searchDays);
  const nextStation = findNextStation(swe, planetId, date, searchDays);

  if (!previousStation || !nextStation) {
    return {};
  }

  const speedAfterPreviousStation = exactPlanetSpeed(swe, planetId, addDays(previousStation, 1));
  const speedAfterNextStation = exactPlanetSpeed(swe, planetId, addDays(nextStation, 1));

  if (speedAfterPreviousStation >= 0 || speedAfterNextStation < 0) {
    return {};
  }

  return {
    retrogradeStart: previousStation.toISOString(),
    retrogradeEnd: nextStation.toISOString(),
    retrogradeWindowSource: "station"
  };
}

function planetLongitudeAt(swe: SwissEphInstance, planetId: number, date: Date) {
  return exactPlanetLongitude(swe, planetId, date);
}

function aspectDistanceAt(
  swe: SwissEphInstance,
  firstPlanetId: number,
  secondPlanetId: number,
  date: Date,
  targetDegrees: number
) {
  const separation = angularSeparation(
    planetLongitudeAt(swe, firstPlanetId, date),
    planetLongitudeAt(swe, secondPlanetId, date)
  );

  return separation - targetDegrees;
}

function refineAspectEvent(
  swe: SwissEphInstance,
  firstPlanetId: number,
  secondPlanetId: number,
  targetDegrees: number,
  lowerDate: Date,
  upperDate: Date
) {
  let lower = lowerDate;
  let upper = upperDate;
  let lowerDistance = aspectDistanceAt(swe, firstPlanetId, secondPlanetId, lower, targetDegrees);

  for (let index = 0; index < 54; index += 1) {
    const midpoint = new Date((lower.getTime() + upper.getTime()) / 2);
    const midpointDistance = aspectDistanceAt(swe, firstPlanetId, secondPlanetId, midpoint, targetDegrees);

    if (lowerDistance === 0 || lowerDistance * midpointDistance <= 0) {
      upper = midpoint;
    } else {
      lower = midpoint;
      lowerDistance = midpointDistance;
    }
  }

  return new Date((lower.getTime() + upper.getTime()) / 2);
}

type SkyAspectRecord = SkySnapshot["aspects"][number];
type SkyAspectTiming = NonNullable<SkyAspectRecord["timing"]>;

function skyPointPlanetId(swe: SwissEphInstance, point: string) {
  const ids: Record<string, number> = {
    Sun: swe.SE_SUN,
    Moon: swe.SE_MOON,
    Mercury: swe.SE_MERCURY,
    Venus: swe.SE_VENUS,
    Mars: swe.SE_MARS,
    Jupiter: swe.SE_JUPITER,
    Saturn: swe.SE_SATURN,
    Uranus: swe.SE_URANUS,
    Neptune: swe.SE_NEPTUNE,
    Pluto: swe.SE_PLUTO,
    Chiron: SE_CHIRON,
    Lilith: SE_MEAN_BLACK_MOON_LILITH,
    "North Node": swe.SE_TRUE_NODE
  };
  return ids[point] ?? null;
}

function skyAspectPresentationOrb(aspect: SkyAspectRecord) {
  const points = new Set([aspect.from, aspect.to]);
  if (points.has("Moon")) return 6;
  if (["Sun", "Mercury", "Venus", "Mars"].some((point) => points.has(point))) return 3;
  return 1.5;
}

function directedAspectResidualsAt(
  swe: SwissEphInstance,
  firstPlanetId: number,
  secondPlanetId: number,
  date: Date,
  targetDegrees: number
) {
  const directed = shortestAngleDistance(
    exactPlanetLongitude(swe, firstPlanetId, date) - exactPlanetLongitude(swe, secondPlanetId, date)
  );
  const residuals = [shortestAngleDistance(directed - targetDegrees)];
  if (targetDegrees !== 0 && targetDegrees !== 180) {
    residuals.push(shortestAngleDistance(directed + targetDegrees));
  }
  return residuals;
}

function refineDirectedAspectPass(
  swe: SwissEphInstance,
  firstPlanetId: number,
  secondPlanetId: number,
  targetDegrees: number,
  branch: number,
  lowerInput: Date,
  upperInput: Date
) {
  let lower = lowerInput;
  let upper = upperInput;
  let lowerDistance = directedAspectResidualsAt(swe, firstPlanetId, secondPlanetId, lower, targetDegrees)[branch];
  for (let index = 0; index < 54; index += 1) {
    const midpoint = new Date((lower.getTime() + upper.getTime()) / 2);
    const midpointDistance = directedAspectResidualsAt(swe, firstPlanetId, secondPlanetId, midpoint, targetDegrees)[branch];
    if (lowerDistance === 0 || lowerDistance * midpointDistance <= 0) {
      upper = midpoint;
    } else {
      lower = midpoint;
      lowerDistance = midpointDistance;
    }
  }
  return new Date((lower.getTime() + upper.getTime()) / 2);
}

function scanExactAspectPasses(
  swe: SwissEphInstance,
  firstPlanetId: number,
  secondPlanetId: number,
  targetDegrees: number,
  start: Date,
  end: Date,
  stepDays: number,
  branchFilter: number | null = null
) {
  const passes: Date[] = [];
  let previousDate = start;
  let previous = directedAspectResidualsAt(swe, firstPlanetId, secondPlanetId, previousDate, targetDegrees);
  const stepMs = Math.max(60 * 60_000, stepDays * 86_400_000);

  for (let time = start.getTime() + stepMs; time <= end.getTime(); time += stepMs) {
    const currentDate = new Date(time);
    const current = directedAspectResidualsAt(swe, firstPlanetId, secondPlanetId, currentDate, targetDegrees);
    current.forEach((distance, branch) => {
      if (branchFilter !== null && branch !== branchFilter) return;
      const prior = previous[branch];
      if (!Number.isFinite(prior) || Math.abs(distance - prior) > 180) return;
      if (prior === 0 || distance === 0 || prior * distance < 0) {
        const exact = refineDirectedAspectPass(
          swe,
          firstPlanetId,
          secondPlanetId,
          targetDegrees,
          branch,
          previousDate,
          currentDate
        );
        if (!passes.some((pass) => Math.abs(pass.getTime() - exact.getTime()) < 6 * 60 * 60_000)) {
          passes.push(exact);
        }
      }
    });
    previousDate = currentDate;
    previous = current;
  }
  return passes.sort((first, second) => first.getTime() - second.getTime());
}

function findNamedCazimis(
  swe: SwissEphInstance,
  start: Date,
  end: Date,
  timeZone: string
): LunarCalendarEvent[] {
  const cazimiBodies = [
    { planet: "Mercury", glyph: "☿", planetId: swe.SE_MERCURY },
    { planet: "Venus", glyph: "♀", planetId: swe.SE_VENUS }
  ];

  return cazimiBodies.flatMap(({ planet, glyph, planetId }) => (
    scanExactAspectPasses(swe, planetId, swe.SE_SUN, 0, start, end, 1 / 8).map((occursAt) => {
      const direction: PlanetDirection = exactPlanetSpeed(swe, planetId, occursAt) < 0 ? "retrograde" : "direct";
      const proximity = solarProximityFactsFor(swe, planetId, occursAt);
      if (!proximity.cazimi) {
        throw new Error(`${planet} conjunction at ${occursAt.toISOString()} fell outside the named cazimi threshold.`);
      }

      const sign = exactPlanetSign(swe, planetId, occursAt);
      return {
        id: `cazimi-${planet.toLowerCase()}-${direction}-${occursAt.toISOString()}`,
        type: "station" as const,
        title: `${planet} ${direction} cazimi`,
        startsAt: occursAt.toISOString(),
        dateKey: localDateKey(occursAt, timeZone),
        glyph: `${glyph}☉`,
        primary: true,
        planet,
        planets: [planet, "Sun"] as [string, string],
        aspect: "conjunction",
        sign,
        sunSign: exactPlanetSign(swe, swe.SE_SUN, occursAt),
        direction,
        phase: "cazimi" as const,
        longitude: Number(exactPlanetLongitude(swe, planetId, occursAt).toFixed(4)),
        ...proximity
      };
    })
  ));
}

function findMarsSunRetrogradeMidpoints(
  swe: SwissEphInstance,
  start: Date,
  end: Date,
  timeZone: string
): LunarCalendarEvent[] {
  return scanExactAspectPasses(swe, swe.SE_MARS, swe.SE_SUN, 180, start, end, 1 / 8)
    .filter((occursAt) => exactPlanetSpeed(swe, swe.SE_MARS, occursAt) < 0)
    .map((occursAt) => ({
      id: `retrograde-mars-sun-opposition-${occursAt.toISOString()}`,
      type: "station" as const,
      title: "Mars retrograde midpoint opposite Sun",
      startsAt: occursAt.toISOString(),
      dateKey: localDateKey(occursAt, timeZone),
      glyph: "♂☉",
      primary: true,
      planet: "Mars",
      planets: ["Mars", "Sun"] as [string, string],
      aspect: "opposition",
      sign: exactPlanetSign(swe, swe.SE_MARS, occursAt),
      sunSign: exactPlanetSign(swe, swe.SE_SUN, occursAt),
      direction: "retrograde" as const,
      phase: "sun-opposition" as const,
      longitude: Number(exactPlanetLongitude(swe, swe.SE_MARS, occursAt).toFixed(4))
    }));
}

function directedAspectBranchAt(
  swe: SwissEphInstance,
  firstPlanetId: number,
  secondPlanetId: number,
  targetDegrees: number,
  date: Date
) {
  const residuals = directedAspectResidualsAt(swe, firstPlanetId, secondPlanetId, date, targetDegrees);
  return residuals.reduce((best, residual, index) => (
    Math.abs(residual) < Math.abs(residuals[best]) ? index : best
  ), 0);
}

function aspectPresentationDistanceAt(
  swe: SwissEphInstance,
  firstPlanetId: number,
  secondPlanetId: number,
  date: Date,
  targetDegrees: number
) {
  return Math.min(...directedAspectResidualsAt(swe, firstPlanetId, secondPlanetId, date, targetDegrees).map(Math.abs));
}

function refineAspectBoundary(
  swe: SwissEphInstance,
  firstPlanetId: number,
  secondPlanetId: number,
  targetDegrees: number,
  presentationDegrees: number,
  nearInput: Date,
  farInput: Date
) {
  let near = nearInput;
  let far = farInput;
  for (let index = 0; index < 45; index += 1) {
    const midpoint = new Date((near.getTime() + far.getTime()) / 2);
    if (aspectPresentationDistanceAt(swe, firstPlanetId, secondPlanetId, midpoint, targetDegrees) <= presentationDegrees) {
      near = midpoint;
    } else {
      far = midpoint;
    }
  }
  return new Date((near.getTime() + far.getTime()) / 2);
}

function findAspectBoundary(
  swe: SwissEphInstance,
  firstPlanetId: number,
  secondPlanetId: number,
  targetDegrees: number,
  presentationDegrees: number,
  from: Date,
  direction: -1 | 1,
  stepDays: number,
  maxDays: number
) {
  let near = from;
  for (let elapsed = stepDays; elapsed <= maxDays; elapsed += stepDays) {
    const far = addDays(from, direction * elapsed);
    if (aspectPresentationDistanceAt(swe, firstPlanetId, secondPlanetId, far, targetDegrees) > presentationDegrees) {
      return refineAspectBoundary(swe, firstPlanetId, secondPlanetId, targetDegrees, presentationDegrees, near, far);
    }
    near = far;
  }
  return addDays(from, direction * maxDays);
}

function clusterAspectPasses(passes: Date[], maxGapDays: number) {
  const clusters: Date[][] = [];
  for (const pass of passes) {
    const current = clusters.at(-1);
    if (!current || pass.getTime() - current.at(-1)!.getTime() > maxGapDays * 86_400_000) {
      clusters.push([pass]);
    } else {
      current.push(pass);
    }
  }
  return clusters;
}

function skyAspectTimingFor(
  swe: SwissEphInstance,
  aspect: SkyAspectRecord,
  positions: CalculatedPlanet[],
  reference: Date,
  timeZone?: string
): SkyAspectTiming | null {
  const firstPlanetId = skyPointPlanetId(swe, aspect.from);
  const secondPlanetId = skyPointPlanetId(swe, aspect.to);
  if (firstPlanetId === null || secondPlanetId === null || aspect.from === "South Node" || aspect.to === "South Node") return null;

  const targetDegrees = Number(aspect.exactAngle);
  if (!Number.isFinite(targetDegrees)) return null;
  const firstPosition = positions.find((position) => position.planet === aspect.from);
  const secondPosition = positions.find((position) => position.planet === aspect.to);
  if (!firstPosition || !secondPosition) return null;

  const relativeSpeed = Math.max(0.002, Math.abs(firstPosition.speed - secondPosition.speed));
  const fastestSpeed = Math.max(0.02, Math.abs(firstPosition.speed), Math.abs(secondPosition.speed));
  const presentationDegrees = skyAspectPresentationOrb(aspect);
  const estimatedDurationDays = (presentationDegrees * 2) / relativeSpeed;
  const boundaryStepDays = Math.max(0.125, Math.min(5, presentationDegrees / (fastestSpeed * 4)));
  const maxBoundaryDays = Math.max(60, Math.min(5500, estimatedDurationDays * 4));
  const currentWindowStart = findAspectBoundary(swe, firstPlanetId, secondPlanetId, targetDegrees, presentationDegrees, reference, -1, boundaryStepDays, maxBoundaryDays);
  const currentWindowEnd = findAspectBoundary(swe, firstPlanetId, secondPlanetId, targetDegrees, presentationDegrees, reference, 1, boundaryStepDays, maxBoundaryDays);
  const passScanStepDays = Math.max(1 / 24, Math.min(2, presentationDegrees / (fastestSpeed * 8)));
  const currentWindowPasses = scanExactAspectPasses(
    swe,
    firstPlanetId,
    secondPlanetId,
    targetDegrees,
    currentWindowStart,
    currentWindowEnd,
    passScanStepDays
  );
  if (!currentWindowPasses.length) return null;
  const engagementBranch = directedAspectBranchAt(
    swe,
    firstPlanetId,
    secondPlanetId,
    targetDegrees,
    currentWindowPasses[0]
  );

  const currentWindowDurationDays = Math.max(0, (currentWindowEnd.getTime() - currentWindowStart.getTime()) / 86_400_000);
  const maxSeriesGapDays = Math.max(10, Math.min(550, currentWindowDurationDays * 4));
  const seriesHorizonDays = Math.max(60, Math.min(5000, maxSeriesGapDays * 8));
  const allPasses = scanExactAspectPasses(
    swe,
    firstPlanetId,
    secondPlanetId,
    targetDegrees,
    addDays(reference, -seriesHorizonDays),
    addDays(reference, seriesHorizonDays),
    passScanStepDays,
    engagementBranch
  );
  const seedPassTimes = new Set(currentWindowPasses.map((pass) => Math.round(pass.getTime() / 60_000)));
  const linkedPasses = clusterAspectPasses(allPasses, maxSeriesGapDays).find((cluster) => (
    cluster.some((pass) => seedPassTimes.has(Math.round(pass.getTime() / 60_000)))
  )) ?? currentWindowPasses;
  const hasRetrogradeRehit = linkedPasses.some((pass) => (
    exactPlanetSpeed(swe, firstPlanetId, pass) < 0 || exactPlanetSpeed(swe, secondPlanetId, pass) < 0
  ));
  const engagementPasses = linkedPasses.length > 1 && !hasRetrogradeRehit
    ? currentWindowPasses
    : linkedPasses;
  const engagementStart = findAspectBoundary(swe, firstPlanetId, secondPlanetId, targetDegrees, presentationDegrees, engagementPasses[0], -1, boundaryStepDays, maxBoundaryDays);
  const engagementEnd = findAspectBoundary(swe, firstPlanetId, secondPlanetId, targetDegrees, presentationDegrees, engagementPasses.at(-1)!, 1, boundaryStepDays, maxBoundaryDays);

  const durationDays = Math.max(0, (engagementEnd.getTime() - engagementStart.getTime()) / 86_400_000);
  const group: SkyAspectTiming["group"] = durationDays <= 10 ? "this-week" : durationDays < 365 ? "this-season" : "undercurrent";
  const closestPassIndex = engagementPasses.reduce((best, pass, index) => (
    Math.abs(pass.getTime() - reference.getTime()) < Math.abs(engagementPasses[best].getTime() - reference.getTime()) ? index : best
  ), 0);
  const nextPassIndex = engagementPasses.findIndex((pass) => pass.getTime() > reference.getTime());
  const exactDistanceHours = Math.abs(engagementPasses[closestPassIndex].getTime() - reference.getTime()) / 3_600_000;
  const phase: SkyAspectTiming["phase"] = exactDistanceHours <= 12
    ? "exact"
    : nextPassIndex >= 0 ? "building" : "fading";
  const passIndex = phase === "exact"
    ? closestPassIndex
    : nextPassIndex >= 0 ? nextPassIndex : engagementPasses.length - 1;

  let cycleLocation: SkyAspectTiming["cycleLocation"] = null;
  const hasNode = aspect.from.includes("Node") || aspect.to.includes("Node");
  if (group === "undercurrent" && !hasNode) {
    const cycleStepDays = Math.max(5, Math.min(30, estimatedDurationDays / 20));
    const searchDays = 220 * 365.2425;
    try {
      const previous = scanExactAspectPasses(swe, firstPlanetId, secondPlanetId, targetDegrees, addDays(engagementStart, -searchDays), addDays(engagementStart, -1), cycleStepDays, engagementBranch).at(-1) ?? null;
      const next = scanExactAspectPasses(swe, firstPlanetId, secondPlanetId, targetDegrees, addDays(engagementEnd, 1), addDays(engagementEnd, searchDays), cycleStepDays, engagementBranch)[0] ?? null;
      const currentYear = engagementPasses[passIndex].getFullYear();
      cycleLocation = {
        previousYear: previous?.getFullYear() ?? null,
        nextYear: next?.getFullYear() ?? null,
        cycleYears: aspect.type === "conjunction" && previous ? Math.max(1, currentYear - previous.getFullYear()) : null,
        ambiguous: false
      };
    } catch {
      cycleLocation = {
        previousYear: null,
        nextYear: null,
        cycleYears: null,
        ambiguous: true
      };
    }
  }

  return {
    group,
    phase,
    engagementStart: engagementStart.toISOString(),
    engagementEnd: engagementEnd.toISOString(),
    timeZone,
    buildsAllWeek: group === "this-week" && phase === "building" && engagementPasses[passIndex].getTime() - reference.getTime() >= 5 * 86_400_000,
    passIndex: passIndex + 1,
    exactPasses: engagementPasses.map((pass) => ({
      exactAt: pass.toISOString(),
      firstMotion: exactPlanetSpeed(swe, firstPlanetId, pass) < 0 ? "retrograde" : "direct",
      secondMotion: exactPlanetSpeed(swe, secondPlanetId, pass) < 0 ? "retrograde" : "direct"
    })),
    cycleLocation,
    relation: null
  };
}

function addSkyAspectRelations(aspects: SkyAspectRecord[]) {
  const undercurrents = aspects.filter((aspect) => aspect.timing?.group === "undercurrent");
  return aspects.map((aspect) => {
    if (aspect.timing?.group !== "this-week") return aspect;
    const engagementStart = new Date(aspect.timing.engagementStart).getTime();
    const engagementEnd = new Date(aspect.timing.engagementEnd).getTime();
    if (!Number.isFinite(engagementStart) || !Number.isFinite(engagementEnd)) return aspect;
    const relation = undercurrents.find((undercurrent) => {
      const pair = new Set([undercurrent.from, undercurrent.to]);
      const sharesExactlyOnePlanet = pair.has(aspect.from) !== pair.has(aspect.to);
      const exactDuringFastEngagement = undercurrent.timing?.exactPasses.some((pass) => {
        const exactAt = new Date(pass.exactAt).getTime();
        return Number.isFinite(exactAt) && exactAt >= engagementStart && exactAt <= engagementEnd;
      });
      return sharesExactlyOnePlanet && exactDuringFastEngagement;
    });
    if (!relation || !aspect.timing) return aspect;
    const undercurrentPair = new Set([relation.from, relation.to]);
    const fastPlanet = undercurrentPair.has(aspect.from) ? aspect.to : aspect.from;
    return {
      ...aspect,
      timing: {
        ...aspect.timing,
        relation: {
          fastPlanet,
          undercurrentA: relation.from,
          undercurrentB: relation.to
        }
      }
    };
  });
}

function enrichSkyAspectTiming(
  swe: SwissEphInstance,
  aspects: SkyAspectRecord[],
  positions: CalculatedPlanet[],
  reference: Date,
  timeZone?: string
) {
  return addSkyAspectRelations(aspects.map((aspect) => {
    const timing = skyAspectTimingFor(swe, aspect, positions, reference, timeZone);
    if (!timing) return aspect;
    const exactAt = timing.exactPasses[Math.max(0, timing.passIndex - 1)]?.exactAt ?? null;
    return {
      ...aspect,
      exactAt,
      series: timing.exactPasses.length > 1 ? {
        index: timing.passIndex,
        count: timing.exactPasses.length,
        throughLabel: timing.engagementEnd
      } : null,
      timing
    };
  }));
}

function findSkyAspects(
  swe: SwissEphInstance,
  start: Date,
  end: Date,
  timeZone: string
): LunarCalendarEvent[] {
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
    swe.SE_PLUTO
  ];
  const calendarPlanets = planets.slice(0, planetIds.length);
  const events: LunarCalendarEvent[] = [];
  const stepMs = 12 * 60 * 60_000;

  calendarPlanets.forEach(([firstPlanet, firstGlyph], firstIndex) => {
    calendarPlanets.slice(firstIndex + 1).forEach(([secondPlanet, secondGlyph], offsetIndex) => {
      const secondIndex = firstIndex + offsetIndex + 1;
      const firstPlanetId = planetIds[firstIndex];
      const secondPlanetId = planetIds[secondIndex];

      calendarAspectDefinitions.forEach(([aspect, degrees]) => {
        let previousDate = start;
        let previousDistance = aspectDistanceAt(swe, firstPlanetId, secondPlanetId, previousDate, degrees);

        for (let time = start.getTime() + stepMs; time <= end.getTime(); time += stepMs) {
          const currentDate = new Date(time);
          const currentDistance = aspectDistanceAt(swe, firstPlanetId, secondPlanetId, currentDate, degrees);

          if (Math.abs(currentDistance) < 0.03 || previousDistance === 0 || previousDistance * currentDistance < 0) {
            const occursAt = refineAspectEvent(swe, firstPlanetId, secondPlanetId, degrees, previousDate, currentDate);
            const dateKey = localDateKey(occursAt, timeZone);
            const title = `${firstPlanet} ${aspect} ${secondPlanet}`;

            if (!events.some((event) => event.title === title && Math.abs(new Date(event.startsAt).getTime() - occursAt.getTime()) < 3 * 60 * 60_000)) {
              events.push({
                id: `aspect-${firstPlanet}-${aspect}-${secondPlanet}-${occursAt.toISOString()}`.toLowerCase().replace(/\s+/g, "-"),
                type: "aspect",
                title,
                startsAt: occursAt.toISOString(),
                dateKey,
                glyph: `${firstGlyph}${secondGlyph}`,
                primary: !firstPlanet.includes("Moon") && !secondPlanet.includes("Moon"),
                planets: [firstPlanet, secondPlanet],
                aspect,
                // Each body's sign at exactness, so the collective write-up can read
                // "Neptune in Aries is sextile Pluto in Aquarius" (aSign/bSign).
                fromSign: exactPlanetSign(swe, firstPlanetId, occursAt),
                toSign: exactPlanetSign(swe, secondPlanetId, occursAt)
              });
            }
          }

          previousDate = currentDate;
          previousDistance = currentDistance;
        }
      });
    });
  });

  return events;
}

function activeSkyAspectsForDay(swe: SwissEphInstance, date: Date): LunarCalendarActiveAspect[] {
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
    swe.SE_PLUTO
  ];
  const calendarPlanets = planets.slice(0, planetIds.length);
  const comparisonDate = new Date(date.getTime() + 60 * 60_000);
  const activeAspects: LunarCalendarActiveAspect[] = [];

  calendarPlanets.forEach(([firstPlanet], firstIndex) => {
    calendarPlanets.slice(firstIndex + 1).forEach(([secondPlanet], offsetIndex) => {
      const secondIndex = firstIndex + offsetIndex + 1;
      const firstPlanetId = planetIds[firstIndex];
      const secondPlanetId = planetIds[secondIndex];

      calendarAspectDefinitions.forEach(([aspectType, degrees]) => {
        const currentDistance = aspectDistanceAt(swe, firstPlanetId, secondPlanetId, date, degrees);
        const orb = Math.abs(currentDistance);

        if (orb > 5) {
          return;
        }

        const nextDistance = aspectDistanceAt(swe, firstPlanetId, secondPlanetId, comparisonDate, degrees);

        activeAspects.push({
          planetA: firstPlanet,
          aspectType,
          planetB: secondPlanet,
          orb: Number(orb.toFixed(2)),
          applying: Math.abs(nextDistance) < orb
        });
      });
    });
  });

  return activeAspects.sort((first, second) => first.orb - second.orb);
}

const lunarCalendarMonthCache = new Map<string, Promise<LunarCalendarMonth>>();
const maxLunarCalendarMonthCacheEntries = 12;
const lunarCalendarRangeEventsCache = new Map<string, Promise<LunarCalendarEvent[]>>();
const maxLunarCalendarRangeEventsCacheEntries = 24;

function lunarCalendarMonthCacheKey(
  location: LocationInput,
  month: Date,
  detail: LunarCalendarDetailLevel,
  range = "month"
) {
  return [
    range,
    detail,
    month.getFullYear(),
    month.getMonth(),
    month.getDate(),
    location.latitude.toFixed(4),
    location.longitude.toFixed(4),
    location.timeZone || "UTC"
  ].join("|");
}

function weekGridRange(anchor: Date, timeZone: string) {
  const localParts = localDateParts(anchor, timeZone);
  const localMidnight = zonedDateTimeToUtc(timeZone, localParts.year, localParts.month, localParts.day);
  const weekday = new Intl.DateTimeFormat("en-US", {
    timeZone,
    weekday: "short"
  }).format(localMidnight);
  const weekdayIndex = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(weekday);
  const daysSinceMonday = weekdayIndex === 0 ? 6 : Math.max(0, weekdayIndex - 1);
  const gridStart = zonedDateTimeToUtc(timeZone, localParts.year, localParts.month, localParts.day - daysSinceMonday);
  const gridEnd = new Date(gridStart.getTime() + 7 * 86_400_000);

  return { gridStart, gridEnd };
}

function buildLunarCalendarRange(
  swe: SwissEphInstance,
  location: LocationInput,
  monthAnchor: Date,
  gridStart: Date,
  gridEnd: Date,
  dayCount: number,
  timeZone: string,
  detail: LunarCalendarDetailLevel
): LunarCalendarMonth {
  const events = detail === "full"
    ? (() => {
      const eventStart = new Date(gridStart.getTime() - 2 * 86_400_000);
      const eventEnd = new Date(gridEnd.getTime() + 2 * 86_400_000);
      const displayStart = dayCount === 7
        ? gridStart
        : zonedDateTimeToUtc(timeZone, monthAnchor.getFullYear(), monthAnchor.getMonth() + 1, 1);

      return [
        ...findLunations(swe, eventStart, eventEnd, timeZone),
        ...findIngresses(swe, eventStart, eventEnd, timeZone),
        ...findStations(swe, eventStart, eventEnd, timeZone),
        ...findActiveRetrogrades(swe, displayStart, gridEnd, timeZone),
        ...findSkyAspects(swe, eventStart, eventEnd, timeZone)
      ].sort((first, second) => new Date(first.startsAt).getTime() - new Date(second.startsAt).getTime());
    })()
    : [];
  const eventsByDateKey = events.reduce((groupedEvents, event) => {
    const groupedDayEvents = groupedEvents.get(event.dateKey);

    if (groupedDayEvents) {
      groupedDayEvents.push(event);
    } else {
      groupedEvents.set(event.dateKey, [event]);
    }

    return groupedEvents;
  }, new Map<string, LunarCalendarEvent[]>());
  const voidAspectCache = detail === "full" ? new Map<string, Date | null>() : undefined;
  const days = Array.from({ length: dayCount }, (_, index) => {
    const dayStart = new Date(gridStart.getTime() + index * 86_400_000);
    const dateKey = localDateKey(dayStart, timeZone);
    const noon = new Date(dayStart.getTime() + 12 * 60 * 60_000);
    const moonLongitude = exactPlanetLongitude(swe, swe.SE_MOON, noon);
    const moonSign = signForLongitude(moonLongitude);
    const sunLongitude = exactPlanetLongitude(swe, swe.SE_SUN, noon);
    const phaseAngle = normalizeDegrees(moonLongitude - sunLongitude);
    const moonStatus = detail === "full" ? moonStatusFor(swe, noon, voidAspectCache) : null;
    const localParts = localDateParts(dayStart, timeZone);

    return {
      date: dayStart.toISOString(),
      dateKey,
      inMonth: localParts.month === monthAnchor.getMonth() + 1 && localParts.year === monthAnchor.getFullYear(),
      moonSign: moonSign.sign,
      moonSignGlyph: moonSign.signGlyph,
      moonPhase: moonPhaseName(sunLongitude, moonLongitude),
      illumination: illuminationFromPhaseAngle(phaseAngle),
      voidOfCourse: moonStatus?.kind === "void" ? {
        remainingLabel: compactCalendarVoidLabel(moonStatus.remainingLabel),
        durationLabel: compactCalendarVoidLabel(moonStatus.durationLabel),
        startsAt: moonStatus.startsAt,
        until: moonStatus.until,
        nextSign: moonStatus.nextSign
      } : null,
      activeAspects: detail === "full" ? activeSkyAspectsForDay(swe, noon) : [],
      events: eventsByDateKey.get(dateKey) ?? []
    };
  });

  return {
    month: monthAnchor.toISOString(),
    timeZone,
    location,
    days,
    events: events.filter((event) => days.some((day) => day.dateKey === event.dateKey))
  };
}

async function calculateLunarCalendarMonth(
  location: LocationInput = defaultLocation,
  month: Date = new Date(),
  options: LunarCalendarMonthOptions = {}
): Promise<LunarCalendarMonth> {
  const swe = await getSwissEph();
  const detail = options.detail ?? "full";
  const timeZone = location.timeZone || Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  const monthAnchor = new Date(month.getFullYear(), month.getMonth(), 1);
  const { gridStart, gridEnd } = monthGridRange(monthAnchor, timeZone);

  return buildLunarCalendarRange(swe, location, monthAnchor, gridStart, gridEnd, 42, timeZone, detail);
}

export function getLunarCalendarMonth(
  location: LocationInput = defaultLocation,
  month: Date = new Date(),
  options: LunarCalendarMonthOptions = {}
): Promise<LunarCalendarMonth> {
  const detail = options.detail ?? "full";
  const monthAnchor = new Date(month.getFullYear(), month.getMonth(), 1);
  const key = lunarCalendarMonthCacheKey(location, monthAnchor, detail);
  const cached = lunarCalendarMonthCache.get(key);

  if (cached) {
    return cached;
  }

  const request = calculateLunarCalendarMonth(location, monthAnchor, { detail });

  lunarCalendarMonthCache.set(key, request);

  if (lunarCalendarMonthCache.size > maxLunarCalendarMonthCacheEntries) {
    const oldestKey = lunarCalendarMonthCache.keys().next().value;

    if (oldestKey) {
      lunarCalendarMonthCache.delete(oldestKey);
    }
  }

  return request;
}

async function calculateLunarCalendarWeek(
  location: LocationInput = defaultLocation,
  anchor: Date = new Date(),
  options: LunarCalendarMonthOptions = {}
): Promise<LunarCalendarMonth> {
  const swe = await getSwissEph();
  const detail = options.detail ?? "full";
  const timeZone = location.timeZone || Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  const monthAnchor = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
  const { gridStart, gridEnd } = weekGridRange(anchor, timeZone);

  return buildLunarCalendarRange(swe, location, monthAnchor, gridStart, gridEnd, 7, timeZone, detail);
}

export function getLunarCalendarWeek(
  location: LocationInput = defaultLocation,
  anchor: Date = new Date(),
  options: LunarCalendarMonthOptions = {}
): Promise<LunarCalendarMonth> {
  const detail = options.detail ?? "full";
  const timeZone = location.timeZone || Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  const { gridStart } = weekGridRange(anchor, timeZone);
  const key = lunarCalendarMonthCacheKey(location, gridStart, detail, "week");
  const cached = lunarCalendarMonthCache.get(key);

  if (cached) {
    return cached;
  }

  const request = calculateLunarCalendarWeek(location, anchor, { detail });

  lunarCalendarMonthCache.set(key, request);

  if (lunarCalendarMonthCache.size > maxLunarCalendarMonthCacheEntries) {
    const oldestKey = lunarCalendarMonthCache.keys().next().value;

    if (oldestKey) {
      lunarCalendarMonthCache.delete(oldestKey);
    }
  }

  return request;
}

/**
 * Lean event feed for horoscope assembly. Unlike the visual calendar builders,
 * this skips ingress/aspect scans, daily moon status, void-of-course searches,
 * illumination, and the 42-day month grid.
 */
export function getLunarCalendarRangeEvents(
  location: LocationInput = defaultLocation,
  start: Date,
  end: Date
): Promise<LunarCalendarEvent[]> {
  const timeZone = location.timeZone || Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  const key = [
    "range-events",
    start.toISOString(),
    end.toISOString(),
    location.latitude.toFixed(4),
    location.longitude.toFixed(4),
    timeZone
  ].join("|");
  const cached = lunarCalendarRangeEventsCache.get(key);

  if (cached) return cached;

  const request = getSwissEph().then((swe) => {
    const searchStart = new Date(start.getTime() - 2 * 86_400_000);
    const searchEnd = new Date(end.getTime() + 2 * 86_400_000);

    return [
      ...findLunations(swe, searchStart, searchEnd, timeZone),
      ...findStations(swe, searchStart, searchEnd, timeZone)
    ].sort((first, second) => first.startsAt.localeCompare(second.startsAt));
  });

  lunarCalendarRangeEventsCache.set(key, request);
  void request.catch(() => {
    if (lunarCalendarRangeEventsCache.get(key) === request) {
      lunarCalendarRangeEventsCache.delete(key);
    }
  });

  if (lunarCalendarRangeEventsCache.size > maxLunarCalendarRangeEventsCacheEntries) {
    const oldestKey = lunarCalendarRangeEventsCache.keys().next().value;
    if (oldestKey) lunarCalendarRangeEventsCache.delete(oldestKey);
  }

  return request;
}

/**
 * Calculation-only timing facts that are deliberately excluded from the
 * reader calendar feeds until their exact prose has separate owner approval.
 */
export async function getNonServingTimingEventCandidates(
  location: LocationInput = defaultLocation,
  start: Date,
  end: Date
): Promise<LunarCalendarEvent[]> {
  const swe = await getSwissEph();
  const timeZone = location.timeZone || Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";

  return [
    ...findActiveShadowPhases(swe, start, end, timeZone),
    ...findNamedCazimis(swe, start, end, timeZone),
    ...findMarsSunRetrogradeMidpoints(swe, start, end, timeZone)
  ].sort((first, second) => first.startsAt.localeCompare(second.startsAt));
}

const solarDaylightCache = new Map<string, Promise<SolarDaylight>>();
const maxSolarDaylightCacheEntries = 24;

function solarDaylightCacheKey(location: LocationInput, date: Date) {
  const timeZone = location.timeZone || "UTC";

  return [
    localDateKey(date, timeZone),
    location.latitude.toFixed(4),
    location.longitude.toFixed(4),
    timeZone
  ].join("|");
}

export async function getSolarDaylight(
  location: LocationInput = defaultLocation,
  date: Date = new Date()
): Promise<SolarDaylight> {
  const key = solarDaylightCacheKey(location, date);
  const cached = solarDaylightCache.get(key);

  if (cached) {
    return cached;
  }

  const request = getSwissEph().then((swe) => solarDaylightForDay(swe, location, date));

  solarDaylightCache.set(key, request);

  if (solarDaylightCache.size > maxSolarDaylightCacheEntries) {
    const oldestKey = solarDaylightCache.keys().next().value;

    if (oldestKey) {
      solarDaylightCache.delete(oldestKey);
    }
  }

  return request;
}

function angularSeparation(first: number, second: number) {
  const difference = Math.abs(normalizeDegrees(first - second));
  return difference > 180 ? 360 - difference : difference;
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
  const timeConversionDebug = debugInfoForZonedDateTime(date);

  if (timeConversionDebug) {
    console.debug("[natal-time-to-julian-day]", {
      parsedLocalDateTime: timeConversionDebug.parsedLocalDateTime,
      resolvedTimeZone: timeConversionDebug.resolvedTimeZone,
      utcOffsetMinutes: timeConversionDebug.utcOffsetMinutes,
      finalUtc: timeConversionDebug.finalUtc,
      julianDay: jd
    });
  }

  const flags = swe.SEFLG_SWIEPH | swe.SEFLG_SPEED;
  const houses = swe.houses(jd, location.latitude, location.longitude, "W") as unknown as {
    cusps: Float64Array;
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
    SE_CHIRON,
    SE_MEAN_BLACK_MOON_LILITH,
    swe.SE_TRUE_NODE
  ];
  const positions: CalculatedPlanet[] = planets.map(([planet, glyph], index) => {
    const result = swe.calc_ut(jd, planetIds[index], flags);
    const longitude = normalizeDegrees(result[0]);
    const latitude = Number(result[1].toFixed(4));
    const { sign, signGlyph, degree } = signForLongitude(longitude);
    const motion = result[3] < -0.0001 ? "retrograde" : "direct";
    const transitWindow = options.includeTransitWindows
      ? signTransitWindowFor(swe, planet, planetIds[index], date, sign)
      : {};
    const structuralTransitFacts = options.includeTransitWindows
      ? skyPlacementStructuralTransitFacts(swe, planet, planetIds[index], sign, transitWindow)
      : {};
    const retrogradeWindow = options.includeTransitWindows
      ? retrogradeCycleFactsFor(swe, planet, planetIds[index], date, motion)
      : {};
    const solarProximity = options.includeTransitWindows && supportsSolarProximity(planet)
      ? solarProximityFactsFor(swe, planetIds[index], date)
      : {};

    return {
      planet,
      glyph,
      longitude: Number(longitude.toFixed(4)),
      latitude,
      speed: Number(result[3].toFixed(6)),
      sign,
      signGlyph,
      degree,
      house: wholeSignHouse(sign, ascendant),
      houseSystem: "whole_sign",
      motion,
      theme: themeForPoint(planet),
      transitTimeZone: options.includeTransitWindows ? location.timeZone ?? "UTC" : undefined,
      ...transitWindow,
      ...structuralTransitFacts,
      ...solarProximity,
      ...retrogradeWindow
    };
  });
  const northNode = positions.find((position) => position.planet === "North Node");
  const displayPositions = northNode ? [
    ...positions,
    southNodePositionFromNorthNode(
      swe,
      northNode,
      ascendant,
      date,
      Boolean(options.includeTransitWindows),
      location.timeZone
    )
  ] : positions;
  const sun = displayPositions.find((position) => position.planet === "Sun") ?? displayPositions[0];
  const moon = displayPositions.find((position) => position.planet === "Moon") ?? displayPositions[1];
  const houseCusps = wholeSignHouseCusps(ascendant);
  const calculatedAspects = canonicalizeNodeAxisAspects(calculateSkyAspects(displayPositions));
  const timedAspects = options.includeTransitWindows
    ? enrichSkyAspectTiming(swe, calculatedAspects, positions, date, location.timeZone)
    : calculatedAspects;
  const snapshot: SkySnapshot = {
    location,
    generatedAt: date.toISOString(),
    calculationProvenance: ASTROLOGY_CALCULATION_PROVENANCE,
    ascendant,
    ascendantLongitude,
    midheaven,
    midheavenLongitude,
    houseCusps,
    moonPhase: moonPhaseName(sun.longitude, moon.longitude),
    moonStatus: moonStatusFor(swe, date),
    moonSignTransition: moonSignTransitionForDay(swe, date, location.timeZone),
    moonEvent: nextMoonEvent(swe, date),
    solarDaylight: solarDaylightForDay(swe, location, date),
    dominantElement: elementForSign(sun.sign),
    positions: displayPositions.map((position) => ({ ...position })),
    aspects: timedAspects
  };

  return {
    ...snapshot,
    facts: factsFromSkySnapshot(snapshot)
  };
}
