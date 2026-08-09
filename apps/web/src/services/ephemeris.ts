import type { LocationInput, PlanetPosition, SkySnapshot, SolarDaylight } from "../types.js";
import {
  calculateSkyAspects,
  canonicalizeNodeAxisAspects,
  SKY_ASPECT_DEFINITIONS,
  SKY_ASPECT_POINT_ORDER
} from "@tldr/astro-knowledge/sky-aspect-engine";
import {
  ASTROLOGY_CALCULATION_CONTRACT,
  astrologyCalculationProvenance,
  factsFromSkySnapshot
} from "./astrologyFacts.js";
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
// True (osculating) lunar apogee, Swiss Ephemeris SE_OSCU_APOG.
// Owner decision 2026-08-09 (tldr-astro-lilith-fact-boundary.md): the app uses
// TRUE Black Moon Lilith. Mean apogee (SE_MEAN_APOG, id 12) is intentionally no
// longer used; see calculationVersion v3 in astrologyFacts.ts.
const SE_TRUE_BLACK_MOON_LILITH = 13;

type SwissEphConstructor = typeof import("swisseph-wasm").default;
type SwissEphInstance = InstanceType<SwissEphConstructor>;

type SwissCalculation = {
  values: Float64Array;
  returnedFlags: number;
};

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
export type RetrogradePhase = "pre-shadow" | "station-retrograde" | "retrograde-passage" | "cazimi" | "station-direct" | "post-shadow";
export type PlanetDirection = "direct" | "retrograde";

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
  phase?: RetrogradePhase;
  longitude?: number;
  retrogradeStart?: string;
  retrogradeEnd?: string;
  shadowStart?: string;
  shadowEnd?: string;
  cazimi?: boolean;
  cazimiOrb?: number;
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
const cazimiOrbDegrees = 1;

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

function southNodePositionFromNorthNode(northNode: CalculatedPlanet, ascendant: string): CalculatedPlanet {
  const longitude = normalizeDegrees((northNode.longitude ?? 0) + 180);
  const { sign, signGlyph, degree } = signForLongitude(longitude);

  return {
    ...northNode,
    planet: "South Node",
    glyph: "☋",
    longitude: Number(longitude.toFixed(4)),
    sign,
    signGlyph,
    degree,
    house: wholeSignHouse(sign, ascendant),
    theme: themeForPoint("South Node")
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

export function validateSwissEphemerisReturnFlag(
  returnedFlags: number,
  swissFlag: number,
  moshierFlag: number,
  errorMessage = ""
) {
  if (returnedFlags < 0) {
    throw new Error(`Swiss Ephemeris calculation failed${errorMessage ? `: ${errorMessage}` : "."}`);
  }

  const usedSwissEphemeris = (returnedFlags & swissFlag) === swissFlag;
  const usedMoshierEphemeris = (returnedFlags & moshierFlag) === moshierFlag;

  if (!usedSwissEphemeris || usedMoshierEphemeris) {
    const detail = errorMessage ? ` ${errorMessage}` : "";
    throw new Error(
      `Swiss Ephemeris provenance mismatch: expected Swiss flags, received ${returnedFlags}.${detail}`
    );
  }
}

function calculateSwissUt(
  swe: SwissEphInstance,
  julianDay: number,
  body: number,
  flags: number
): SwissCalculation {
  const resultPointer = swe.SweModule._malloc(6 * Float64Array.BYTES_PER_ELEMENT);
  const errorPointer = swe.SweModule._malloc(256);

  try {
    const returnedFlags = swe.SweModule.ccall(
      "swe_calc_ut",
      "number",
      ["number", "number", "number", "pointer", "pointer"],
      [julianDay, body, flags, resultPointer, errorPointer]
    );
    const errorMessage = swe.SweModule.UTF8ToString(errorPointer).trim();
    validateSwissEphemerisReturnFlag(
      returnedFlags,
      swe.SEFLG_SWIEPH,
      swe.SEFLG_MOSEPH,
      errorMessage
    );

    const resultStart = resultPointer / Float64Array.BYTES_PER_ELEMENT;
    return {
      values: swe.SweModule.HEAPF64.slice(resultStart, resultStart + 6),
      returnedFlags
    };
  } finally {
    swe.SweModule._free(resultPointer);
    swe.SweModule._free(errorPointer);
  }
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

function exactPlanetLongitude(swe: SwissEphInstance, planetId: number, date: Date) {
  const jd = swe.julday(
    date.getUTCFullYear(),
    date.getUTCMonth() + 1,
    date.getUTCDate(),
    utcHour(date)
  );
  const flags = swe.SEFLG_SWIEPH;

  return normalizeDegrees(calculateSwissUt(swe, jd, planetId, flags).values[0]);
}

function exactPlanetSpeed(swe: SwissEphInstance, planetId: number, date: Date) {
  const jd = swe.julday(
    date.getUTCFullYear(),
    date.getUTCMonth() + 1,
    date.getUTCDate(),
    utcHour(date)
  );
  const flags = swe.SEFLG_SWIEPH | swe.SEFLG_SPEED;

  return calculateSwissUt(swe, jd, planetId, flags).values[3];
}

function exactPlanetSign(swe: SwissEphInstance, planetId: number, date: Date, longitudeOffset = 0) {
  return signForLongitude(exactPlanetLongitude(swe, planetId, date) + longitudeOffset).sign;
}

function planetSunOrb(swe: SwissEphInstance, planetId: number, date: Date) {
  return angularSeparation(exactPlanetLongitude(swe, planetId, date), exactPlanetLongitude(swe, swe.SE_SUN, date));
}

function isPlanetCazimi(swe: SwissEphInstance, planetId: number, date: Date) {
  return planetSunOrb(swe, planetId, date) <= cazimiOrbDegrees;
}

function transitSearchStepDays(planet: string) {
  if (planet === "Moon") return 0.25;
  if (planet === "Lilith") return 0.25;
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
  differentSignDate: Date,
  longitudeOffset = 0
) {
  let same = sameSignDate;
  let different = differentSignDate;

  for (let index = 0; index < 50; index += 1) {
    const midpoint = new Date((same.getTime() + different.getTime()) / 2);

    if (exactPlanetSign(swe, planetId, midpoint, longitudeOffset) === currentSign) {
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
  currentSign: string,
  longitudeOffset = 0
) {
  const stepDays = transitSearchStepDays(planet);
  const maxIterations = Math.ceil((365.25 * 32) / stepDays);
  let previousDifferent = addDays(date, -stepDays);
  let nextDifferent = addDays(date, stepDays);

  for (let index = 0; index < maxIterations && exactPlanetSign(swe, planetId, previousDifferent, longitudeOffset) === currentSign; index += 1) {
    previousDifferent = addDays(previousDifferent, -stepDays);
  }

  for (let index = 0; index < maxIterations && exactPlanetSign(swe, planetId, nextDifferent, longitudeOffset) === currentSign; index += 1) {
    nextDifferent = addDays(nextDifferent, stepDays);
  }

  if (exactPlanetSign(swe, planetId, previousDifferent, longitudeOffset) === currentSign || exactPlanetSign(swe, planetId, nextDifferent, longitudeOffset) === currentSign) {
    return {};
  }

  const transitStart = refineSignBoundary(swe, planetId, currentSign, date, previousDifferent, longitudeOffset);
  const transitEnd = refineSignBoundary(swe, planetId, currentSign, date, nextDifferent, longitudeOffset);
  const remainingDays = (transitEnd.getTime() - date.getTime()) / 86_400_000;

  return {
    transitStart: transitStart.toISOString(),
    transitEnd: transitEnd.toISOString(),
    transitRemainingLabel: compactDurationLabelFromDays(remainingDays)
  };
}

type SignResidencyPass = {
  entryDate: string;
  exitDate: string;
};

type SignTransitWindow = {
  transitStart?: string;
  transitEnd?: string;
  transitRemainingLabel?: string;
  residencyPasses?: SignResidencyPass[];
};

// True/osculating Lilith loops across a sign boundary many times during one
// residency. A placement's exitDate is therefore the final exit after the
// short re-entry passes, not the end of the single pass containing `date`.
// A 45-day closed search is longer than the monthly oscillation and short
// enough not to join the next long-term sign residency.
function lilithSignResidencyFor(
  swe: SwissEphInstance,
  planetId: number,
  date: Date,
  currentSign: string,
  longitudeOffset = 0
): SignTransitWindow {
  const initial = signTransitWindowFor(swe, "Lilith", planetId, date, currentSign, longitudeOffset);
  if (!initial.transitStart || !initial.transitEnd) return {};

  const passes: SignResidencyPass[] = [{
    entryDate: initial.transitStart,
    exitDate: initial.transitEnd
  }];
  const maximumGapDays = 45;
  const scanStepDays = transitSearchStepDays("Lilith");

  function adjacentPass(direction: -1 | 1, boundary: Date) {
    for (let elapsed = scanStepDays; elapsed <= maximumGapDays; elapsed += scanStepDays) {
      const sample = addDays(boundary, direction * elapsed);
      if (exactPlanetSign(swe, planetId, sample, longitudeOffset) !== currentSign) continue;
      const pass = signTransitWindowFor(swe, "Lilith", planetId, sample, currentSign, longitudeOffset);
      if (pass.transitStart && pass.transitEnd) {
        return { entryDate: pass.transitStart, exitDate: pass.transitEnd };
      }
    }
    return null;
  }

  for (let count = 0; count < 48; count += 1) {
    const first = passes[0];
    const previous = adjacentPass(-1, new Date(first.entryDate));
    if (!previous || previous.exitDate >= first.entryDate) break;
    passes.unshift(previous);
  }

  for (let count = 0; count < 48; count += 1) {
    const last = passes[passes.length - 1];
    const next = adjacentPass(1, new Date(last.exitDate));
    if (!next || next.entryDate <= last.exitDate) break;
    passes.push(next);
  }

  const transitStart = passes[0].entryDate;
  const transitEnd = passes[passes.length - 1].exitDate;
  return {
    transitStart,
    transitEnd,
    transitRemainingLabel: compactDurationLabelFromDays(
      (new Date(transitEnd).getTime() - date.getTime()) / 86_400_000
    ),
    residencyPasses: passes
  };
}

function signResidencyWindowFor(
  swe: SwissEphInstance,
  planet: string,
  planetId: number,
  date: Date,
  currentSign: string,
  longitudeOffset = 0
): SignTransitWindow {
  return planet === "Lilith"
    ? lilithSignResidencyFor(swe, planetId, date, currentSign, longitudeOffset)
    : signTransitWindowFor(swe, planet, planetId, date, currentSign, longitudeOffset);
}

function previousSameSignResidencyFor(
  swe: SwissEphInstance,
  planet: string,
  planetId: number,
  sign: string,
  currentStart: Date,
  longitudeOffset = 0
) {
  const searchYears = placementSearchYears(planet);
  const minimumGapYears = planet === "Jupiter" ? 6 : planet === "Lilith" ? 4 : 1;
  const stepDays = transitSearchStepDays(planet);
  const maxIterations = Math.ceil((searchYears * 365.25) / stepDays);
  let sample = addDays(currentStart, -minimumGapYears * 365.25);

  for (let index = 0; index < maxIterations; index += 1) {
    if (exactPlanetSign(swe, planetId, sample, longitudeOffset) === sign) {
      const previousWindow = signResidencyWindowFor(swe, planet, planetId, sample, sign, longitudeOffset);
      if (
        previousWindow.transitStart
        && previousWindow.transitEnd
        && new Date(previousWindow.transitEnd) < currentStart
      ) {
        return previousWindow;
      }
    }
    sample = addDays(sample, -stepDays);
  }

  return null;
}

const SKY_PLACEMENT_STRUCTURAL_FACT_PLANETS = new Set([
  "Sun",
  "Mercury",
  "Venus",
  "Mars",
  "Jupiter",
  "Saturn",
  "Uranus",
  "Neptune",
  "Pluto",
  "Chiron",
  "Lilith",
  "North Node"
]);

function skyPlacementStructuralTransitFacts(
  swe: SwissEphInstance,
  planet: string,
  planetId: number,
  sign: string,
  transitWindow: { transitStart?: string; transitEnd?: string }
) {
  if (!SKY_PLACEMENT_STRUCTURAL_FACT_PLANETS.has(planet) || !transitWindow.transitStart || !transitWindow.transitEnd) {
    return {};
  }

  const currentStart = new Date(transitWindow.transitStart);
  const priorReference = new Date(currentStart.getTime() - 5 * 60_000);
  const priorTransitSign = exactPlanetSign(swe, planetId, priorReference);
  const priorWindow = signTransitWindowFor(swe, planet, planetId, priorReference, priorTransitSign);
  const previousResidency = previousSameSignResidencyFor(swe, planet, planetId, sign, currentStart);

  return {
    priorTransitSign,
    priorTransitStart: priorWindow.transitStart ?? null,
    priorTransitEnd: priorWindow.transitEnd ?? null,
    previousSignResidencyStart: previousResidency?.transitStart ?? null,
    previousSignResidencyEnd: previousResidency?.transitEnd ?? null
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
  const [longitude, latitude] = calculateSwissUt(swe, jd, swe.SE_SUN, flags).values;
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
    let previousDate = start;
    let previousSign = exactPlanetSign(swe, planetId, previousDate);

    for (let time = start.getTime() + stepMs; time <= end.getTime(); time += stepMs) {
      const currentDate = new Date(time);
      const currentSign = exactPlanetSign(swe, planetId, currentDate);

      if (currentSign !== previousSign) {
        const occursAt = refineSignIngress(swe, planetId, previousSign, previousDate, currentDate);
        const longitude = exactPlanetLongitude(swe, planetId, occursAt);
        const direction = exactPlanetSpeed(swe, planetId, occursAt) < 0 ? "retrograde" : "direct";
        const toSign = exactPlanetSign(swe, planetId, occursAt);
        const dateKey = localDateKey(occursAt, timeZone);

        events.push({
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
          direction
        });
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
  const stationBodies = [
    ["Mercury", "☿", swe.SE_MERCURY],
    ["Venus", "♀", swe.SE_VENUS],
    ["Mars", "♂", swe.SE_MARS],
    ["Jupiter", "♃", swe.SE_JUPITER],
    ["Saturn", "♄", swe.SE_SATURN],
    ["Uranus", "♅", swe.SE_URANUS],
    ["Neptune", "♆", swe.SE_NEPTUNE],
    ["Pluto", "♇", swe.SE_PLUTO],
    ["Lilith", "⚸", SE_TRUE_BLACK_MOON_LILITH]
  ] as const;
  const events: LunarCalendarEvent[] = [];
  const stepMs = 12 * 60 * 60_000;

  stationBodies.forEach(([planet, glyph, planetId]) => {
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
            cazimi: isPlanetCazimi(swe, planetId, occursAt),
            cazimiOrb: Number(planetSunOrb(swe, planetId, occursAt).toFixed(3))
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
  const retrogradeBodies = [
    ["Mercury", "☿", swe.SE_MERCURY],
    ["Venus", "♀", swe.SE_VENUS],
    ["Mars", "♂", swe.SE_MARS],
    ["Jupiter", "♃", swe.SE_JUPITER],
    ["Saturn", "♄", swe.SE_SATURN],
    ["Uranus", "♅", swe.SE_URANUS],
    ["Neptune", "♆", swe.SE_NEPTUNE],
    ["Pluto", "♇", swe.SE_PLUTO],
    ["Lilith", "⚸", SE_TRUE_BLACK_MOON_LILITH]
  ] as const;

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

    retrogradeBodies.forEach(([planet, glyph, planetId]) => {
      const speed = exactPlanetSpeed(swe, planetId, sampleTime);

      if (speed >= -0.0001) {
        return;
      }

      const sign = exactPlanetSign(swe, planetId, sampleTime);
      const endsAt = nextDirectStation(planetId, planet, sampleTime);
      const retrogradeFacts = retrogradeCycleFactsFor(swe, planet, planetId, sampleTime, "retrograde");
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
        cazimi: retrogradeFacts.cazimi ?? false,
        cazimiOrb: retrogradeFacts.cazimiOrb ?? Number(planetSunOrb(swe, planetId, sampleTime).toFixed(3))
      });
    });
  }

  return events;
}

function retrogradeSearchWindowDays(planet: string) {
  if (planet === "Lilith") {
    return 90;
  }
  if (["Mercury", "Venus", "Mars"].includes(planet)) {
    return 180;
  }

  if (["Jupiter", "Saturn"].includes(planet)) {
    return 420;
  }

  if (["Uranus", "Neptune", "Pluto"].includes(planet)) {
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
): Pick<PlanetPosition, "retrogradeStart" | "retrogradeEnd" | "retrogradeWindowSource" | "retrogradePhase" | "retrogradeShadowStart" | "retrogradeShadowEnd" | "cazimi" | "cazimiOrb"> {
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
  const cazimiOrb = Number(planetSunOrb(swe, planetId, date).toFixed(3));

  return {
    retrogradeStart: previousStation.toISOString(),
    retrogradeEnd: nextStation.toISOString(),
    retrogradeWindowSource: "station",
    retrogradePhase: "retrograde-passage",
    retrogradeShadowStart: shadowStart?.toISOString() ?? null,
    retrogradeShadowEnd: shadowEnd?.toISOString() ?? null,
    cazimi: cazimiOrb <= cazimiOrbDegrees,
    cazimiOrb
  };
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

export type NatalTransitTiming = {
  group: SkyAspectTiming["group"];
  phase: SkyAspectTiming["phase"];
  engagementStart: string;
  engagementEnd: string;
  timeZone?: string;
  passIndex: number;
  exactPasses: Array<{
    exactAt: string;
    firstMotion: "direct" | "retrograde";
    secondMotion: "fixed";
  }>;
  stationNearNatal: boolean;
};

export type NatalTransitTimingOptions = {
  aspectDegrees?: number;
  presentationDegrees?: number;
  timeZone?: string;
};

const natalTransitTimingCache = new Map<string, Promise<NatalTransitTiming | null>>();

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
    Lilith: SE_TRUE_BLACK_MOON_LILITH,
    "North Node": swe.SE_TRUE_NODE
  };
  return ids[point] ?? null;
}

function fixedNatalResidualsAt(
  swe: SwissEphInstance,
  planetId: number,
  natalLongitude: number,
  date: Date,
  targetDegrees: number
) {
  const directed = shortestAngleDistance(exactPlanetLongitude(swe, planetId, date) - natalLongitude);
  const residuals = [shortestAngleDistance(directed - targetDegrees)];
  if (targetDegrees !== 0 && targetDegrees !== 180) {
    residuals.push(shortestAngleDistance(directed + targetDegrees));
  }
  return residuals;
}

type AspectResidualsAt = (date: Date) => number[];

function refineResidualPass(
  residualsAt: AspectResidualsAt,
  branch: number,
  lowerInput: Date,
  upperInput: Date
) {
  let lower = lowerInput;
  let upper = upperInput;
  let lowerResidual = residualsAt(lower)[branch];
  for (let index = 0; index < 54; index += 1) {
    const midpoint = new Date((lower.getTime() + upper.getTime()) / 2);
    const midpointResidual = residualsAt(midpoint)[branch];
    if (lowerResidual === 0 || lowerResidual * midpointResidual <= 0) {
      upper = midpoint;
    } else {
      lower = midpoint;
      lowerResidual = midpointResidual;
    }
  }
  return new Date((lower.getTime() + upper.getTime()) / 2);
}

function scanResidualPasses(
  residualsAt: AspectResidualsAt,
  start: Date,
  end: Date,
  stepDays: number,
  branchFilter: number | null = null
) {
  const passes: Date[] = [];
  let previousDate = start;
  let previous = residualsAt(previousDate);
  const stepMs = Math.max(60 * 60_000, stepDays * 86_400_000);
  for (let time = start.getTime() + stepMs; time <= end.getTime(); time += stepMs) {
    const currentDate = new Date(time);
    const current = residualsAt(currentDate);
    current.forEach((residual, branch) => {
      if (branchFilter !== null && branch !== branchFilter) return;
      const prior = previous[branch];
      if (!Number.isFinite(prior) || Math.abs(residual - prior) > 180) return;
      if (prior === 0 || residual === 0 || prior * residual < 0) {
        const exact = refineResidualPass(residualsAt, branch, previousDate, currentDate);
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

function findResidualBoundary(
  residualsAt: AspectResidualsAt,
  presentationDegrees: number,
  from: Date,
  direction: -1 | 1,
  stepDays: number,
  maxDays: number
) {
  let near = from;
  for (let elapsed = stepDays; elapsed <= maxDays; elapsed += stepDays) {
    const far = addDays(from, direction * elapsed);
    if (Math.min(...residualsAt(far).map(Math.abs)) > presentationDegrees) {
      let inside = near;
      let outside = far;
      for (let index = 0; index < 45; index += 1) {
        const midpoint = new Date((inside.getTime() + outside.getTime()) / 2);
        if (Math.min(...residualsAt(midpoint).map(Math.abs)) <= presentationDegrees) {
          inside = midpoint;
        } else {
          outside = midpoint;
        }
      }
      return new Date((inside.getTime() + outside.getTime()) / 2);
    }
    near = far;
  }
  return addDays(from, direction * maxDays);
}

function stationFallsNearNatal(
  swe: SwissEphInstance,
  planetId: number,
  natalLongitude: number,
  start: Date,
  end: Date
) {
  const stepMs = 12 * 60 * 60_000;
  let previousDate = start;
  let previousSpeed = exactPlanetSpeed(swe, planetId, previousDate);
  for (let time = start.getTime() + stepMs; time <= end.getTime(); time += stepMs) {
    const currentDate = new Date(time);
    const currentSpeed = exactPlanetSpeed(swe, planetId, currentDate);
    if (previousSpeed === 0 || previousSpeed * currentSpeed < 0) {
      const station = refineStationEvent(swe, planetId, previousDate, currentDate);
      if (angularSeparation(exactPlanetLongitude(swe, planetId, station), natalLongitude) <= 1.5) return true;
    }
    previousDate = currentDate;
    previousSpeed = currentSpeed;
  }
  return false;
}

async function calculateNatalTransitTiming(
  transitingPlanet: string,
  natalLongitude: number,
  aroundDate: Date,
  options: NatalTransitTimingOptions
): Promise<NatalTransitTiming | null> {
  const swe = await getSwissEph();
  const planetId = skyPointPlanetId(swe, transitingPlanet);
  if (planetId === null || transitingPlanet === "South Node") return null;
  const targetDegrees = options.aspectDegrees ?? 0;
  const presentationDegrees = options.presentationDegrees ?? 1.5;
  const residualsAt = (date: Date) => fixedNatalResidualsAt(swe, planetId, natalLongitude, date, targetDegrees);
  const speed = Math.max(0.002, Math.abs(exactPlanetSpeed(swe, planetId, aroundDate)));
  const slowSeriesFloorDays = ["Jupiter", "Saturn", "Uranus", "Neptune", "Pluto", "Chiron"].includes(transitingPlanet)
    ? 400
    : 10;
  const series = aspectPassSeriesTiming({
    residualsAt,
    motionIsRetrogradeAt: (date) => exactPlanetSpeed(swe, planetId, date) < 0,
    reference: aroundDate,
    presentationDegrees,
    relativeSpeed: speed,
    fastestSpeed: speed,
    maxBoundaryCapDays: 1800,
    seriesFloorDays: slowSeriesFloorDays,
    horizonMinDays: 120,
    horizonMaxDays: 2200
  });
  if (!series) return null;
  const { engagementEnd, engagementPasses, engagementStart, group, passIndex, phase } = series;
  return {
    group,
    phase,
    engagementStart: engagementStart.toISOString(),
    engagementEnd: engagementEnd.toISOString(),
    timeZone: options.timeZone,
    passIndex: passIndex + 1,
    exactPasses: engagementPasses.map((pass) => ({
      exactAt: pass.toISOString(),
      firstMotion: exactPlanetSpeed(swe, planetId, pass) < 0 ? "retrograde" : "direct",
      secondMotion: "fixed"
    })),
    stationNearNatal: stationFallsNearNatal(swe, planetId, natalLongitude, engagementStart, engagementEnd)
  };
}

/** Memoized fixed-natal counterpart to skyAspectTimingFor. */
export function natalTransitTimingFor(
  transitingPlanet: string,
  natalLongitude: number,
  aroundDateInput: Date | string,
  options: NatalTransitTimingOptions = {}
) {
  const aroundDate = aroundDateInput instanceof Date ? aroundDateInput : new Date(aroundDateInput);
  if (!Number.isFinite(natalLongitude) || Number.isNaN(aroundDate.getTime())) return Promise.resolve(null);
  const day = aroundDate.toISOString().slice(0, 10);
  const key = [transitingPlanet, normalizeDegrees(natalLongitude).toFixed(4), day, options.aspectDegrees ?? 0, options.presentationDegrees ?? 1.5, options.timeZone ?? ""].join("|");
  const cached = natalTransitTimingCache.get(key);
  if (cached) return cached;
  const pending = calculateNatalTransitTiming(transitingPlanet, normalizeDegrees(natalLongitude), aroundDate, options);
  natalTransitTimingCache.set(key, pending);
  void pending.catch(() => {
    if (natalTransitTimingCache.get(key) === pending) natalTransitTimingCache.delete(key);
  });
  return pending;
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
  return scanResidualPasses(
    (date) => directedAspectResidualsAt(swe, firstPlanetId, secondPlanetId, date, targetDegrees),
    start,
    end,
    stepDays,
    branchFilter
  );
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
  return findResidualBoundary(
    (date) => directedAspectResidualsAt(swe, firstPlanetId, secondPlanetId, date, targetDegrees),
    presentationDegrees,
    from,
    direction,
    stepDays,
    maxDays
  );
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

function aspectPassSeriesTiming({
  residualsAt,
  motionIsRetrogradeAt,
  reference,
  presentationDegrees,
  relativeSpeed,
  fastestSpeed,
  maxBoundaryCapDays,
  seriesFloorDays = 10,
  horizonMinDays = 60,
  horizonMaxDays = 5000
}: {
  residualsAt: AspectResidualsAt;
  motionIsRetrogradeAt: (date: Date) => boolean;
  reference: Date;
  presentationDegrees: number;
  relativeSpeed: number;
  fastestSpeed: number;
  maxBoundaryCapDays: number;
  seriesFloorDays?: number;
  horizonMinDays?: number;
  horizonMaxDays?: number;
}) {
  const estimatedDurationDays = (presentationDegrees * 2) / relativeSpeed;
  const boundaryStepDays = Math.max(0.125, Math.min(5, presentationDegrees / (fastestSpeed * 4)));
  const maxBoundaryDays = Math.max(60, Math.min(maxBoundaryCapDays, estimatedDurationDays * 4));
  const currentStart = findResidualBoundary(residualsAt, presentationDegrees, reference, -1, boundaryStepDays, maxBoundaryDays);
  const currentEnd = findResidualBoundary(residualsAt, presentationDegrees, reference, 1, boundaryStepDays, maxBoundaryDays);
  const passStepDays = Math.max(1 / 24, Math.min(2, presentationDegrees / (fastestSpeed * 8)));
  const currentPasses = scanResidualPasses(residualsAt, currentStart, currentEnd, passStepDays);
  if (!currentPasses.length) return null;
  const passResiduals = residualsAt(currentPasses[0]);
  const branch = passResiduals.reduce((best, residual, index) => Math.abs(residual) < Math.abs(passResiduals[best]) ? index : best, 0);
  const currentDurationDays = Math.max(1, (currentEnd.getTime() - currentStart.getTime()) / 86_400_000);
  const maxSeriesGapDays = Math.max(seriesFloorDays, Math.min(550, currentDurationDays * 4));
  const horizonDays = Math.max(horizonMinDays, Math.min(horizonMaxDays, maxSeriesGapDays * 8));
  const allPasses = scanResidualPasses(residualsAt, addDays(reference, -horizonDays), addDays(reference, horizonDays), passStepDays, branch);
  const seedTimes = new Set(currentPasses.map((pass) => Math.round(pass.getTime() / 60_000)));
  const linkedPasses = clusterAspectPasses(allPasses, maxSeriesGapDays).find((cluster) => cluster.some((pass) => seedTimes.has(Math.round(pass.getTime() / 60_000)))) ?? currentPasses;
  const engagementPasses = linkedPasses.length > 1 && !linkedPasses.some(motionIsRetrogradeAt) ? currentPasses : linkedPasses;
  const engagementStart = findResidualBoundary(residualsAt, presentationDegrees, engagementPasses[0], -1, boundaryStepDays, maxBoundaryDays);
  const engagementEnd = findResidualBoundary(residualsAt, presentationDegrees, engagementPasses.at(-1)!, 1, boundaryStepDays, maxBoundaryDays);
  const durationDays = Math.max(0, (engagementEnd.getTime() - engagementStart.getTime()) / 86_400_000);
  const group: SkyAspectTiming["group"] = durationDays <= 10 ? "this-week" : durationDays < 365 ? "this-season" : "undercurrent";
  const closestIndex = engagementPasses.reduce((best, pass, index) => Math.abs(pass.getTime() - reference.getTime()) < Math.abs(engagementPasses[best].getTime() - reference.getTime()) ? index : best, 0);
  const nextIndex = engagementPasses.findIndex((pass) => pass.getTime() > reference.getTime());
  const exact = Math.abs(engagementPasses[closestIndex].getTime() - reference.getTime()) <= 12 * 3_600_000;
  const phase: SkyAspectTiming["phase"] = exact ? "exact" : nextIndex >= 0 ? "building" : "fading";
  const passIndex = exact ? closestIndex : nextIndex >= 0 ? nextIndex : engagementPasses.length - 1;
  return { branch, engagementEnd, engagementPasses, engagementStart, estimatedDurationDays, group, passIndex, passStepDays, phase };
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
  const residualsAt = (date: Date) => directedAspectResidualsAt(swe, firstPlanetId, secondPlanetId, date, targetDegrees);
  const series = aspectPassSeriesTiming({
    residualsAt,
    motionIsRetrogradeAt: (date) => exactPlanetSpeed(swe, firstPlanetId, date) < 0 || exactPlanetSpeed(swe, secondPlanetId, date) < 0,
    reference,
    presentationDegrees,
    relativeSpeed,
    fastestSpeed,
    maxBoundaryCapDays: 5500
  });
  if (!series) return null;
  const {
    branch: engagementBranch,
    engagementEnd,
    engagementPasses,
    engagementStart,
    estimatedDurationDays,
    group,
    passIndex,
    passStepDays: passScanStepDays,
    phase
  } = series;

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
    swe.SE_PLUTO,
    SE_TRUE_BLACK_MOON_LILITH
  ];
  const calendarPlanets = [...planets.slice(0, 10), planets[11]];
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

          if (previousDistance === 0 || previousDistance * currentDistance < 0) {
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

export type SkyPlacementTransitFacts = {
  planet: string;
  sign: string;
  referenceDate: string;
  timeZone: string;
  transitStart: string;
  transitEnd: string;
  residencyPasses: SignResidencyPass[];
  priorSign: string;
  priorSignEntryDate: string;
  priorSignExitDate: string;
  previousResidency: {
    sign: string;
    entryDate: string;
    exitDate: string;
  } | null;
  rankedEventsDuringTransit: Array<{
    id: string;
    eventType: "exact-aspect";
    planet: string;
    otherPlanet: string;
    planets: [string, string];
    aspect: string;
    occursAt: string;
    dateKey: string;
    rank: number;
  }>;
  calculationSource: string;
  zodiac: "tropical" | "sidereal";
  lilithType: "mean" | "true";
};

function placementPlanet(swe: SwissEphInstance, requestedPlanet: string) {
  const key = requestedPlanet.trim().toLowerCase();
  const supported = [
    ["sun", "Sun", swe.SE_SUN],
    ["mercury", "Mercury", swe.SE_MERCURY],
    ["venus", "Venus", swe.SE_VENUS],
    ["mars", "Mars", swe.SE_MARS],
    ["jupiter", "Jupiter", swe.SE_JUPITER],
    ["saturn", "Saturn", swe.SE_SATURN],
    ["uranus", "Uranus", swe.SE_URANUS],
    ["neptune", "Neptune", swe.SE_NEPTUNE],
    ["pluto", "Pluto", swe.SE_PLUTO],
    ["chiron", "Chiron", SE_CHIRON],
    ["lilith", "Lilith", SE_TRUE_BLACK_MOON_LILITH],
    ["north-node", "North Node", swe.SE_TRUE_NODE],
    ["south-node", "South Node", swe.SE_TRUE_NODE]
  ] as const;
  const match = supported.find(([slug]) => slug === key);
  if (!match) throw new Error(`Unsupported Sky Placement planet '${requestedPlanet}'.`);
  return { planet: match[1], planetId: match[2], longitudeOffset: match[0] === "south-node" ? 180 : 0 };
}

function placementSign(requestedSign: string) {
  const match = signs.find(([name]) => name.toLowerCase() === requestedSign.trim().toLowerCase());
  if (!match) throw new Error(`Unsupported Sky Placement sign '${requestedSign}'.`);
  return match[0];
}

function placementSearchYears(planet: string) {
  if (["Sun", "Mercury", "Venus", "Mars"].includes(planet)) return 3;
  if (planet === "Jupiter") return 15;
  if (planet === "Saturn") return 32;
  if (planet === "Uranus") return 90;
  if (planet === "Neptune") return 170;
  if (planet === "Chiron") return 60;
  if (planet === "Lilith") return 12;
  if (["North Node", "South Node"].includes(planet)) return 22;
  return 260;
}

function findNextPlacementSample(
  swe: SwissEphInstance,
  planet: string,
  planetId: number,
  sign: string,
  referenceDate: Date,
  longitudeOffset = 0
) {
  if (exactPlanetSign(swe, planetId, referenceDate, longitudeOffset) === sign) return referenceDate;
  const stepDays = transitSearchStepDays(planet);
  const maxIterations = Math.ceil((placementSearchYears(planet) * 365.25) / stepDays);
  let sample = addDays(referenceDate, stepDays);
  for (let index = 0; index < maxIterations; index += 1) {
    if (exactPlanetSign(swe, planetId, sample, longitudeOffset) === sign) return sample;
    sample = addDays(sample, stepDays);
  }
  throw new Error(`Could not locate the next ${planet} in ${sign} transit from ${referenceDate.toISOString()}.`);
}

function rankPlacementEvents(events: LunarCalendarEvent[], planet: string) {
  const bodyPriority = ["Pluto", "Neptune", "Uranus", "Saturn", "Jupiter", "Mars", "Venus", "Mercury", "Sun"];
  const aspectPriority = ["conjunction", "opposition", "square", "trine", "sextile"];
  return events
    .filter((event) => event.type === "aspect" && event.primary && event.planets?.includes(planet))
    .map((event) => {
      const pair = event.planets as [string, string];
      const otherPlanet = pair[0] === planet ? pair[1] : pair[0];
      return {
        event,
        otherPlanet,
        bodyRank: bodyPriority.indexOf(otherPlanet),
        aspectRank: aspectPriority.indexOf(event.aspect || "")
      };
    })
    .sort((left, right) => (
      (left.bodyRank < 0 ? bodyPriority.length : left.bodyRank) - (right.bodyRank < 0 ? bodyPriority.length : right.bodyRank)
      || (left.aspectRank < 0 ? aspectPriority.length : left.aspectRank) - (right.aspectRank < 0 ? aspectPriority.length : right.aspectRank)
      || left.event.startsAt.localeCompare(right.event.startsAt)
    ))
    .map(({ event, otherPlanet }, index) => ({
      id: event.id,
      eventType: "exact-aspect" as const,
      planet,
      otherPlanet,
      planets: event.planets as [string, string],
      aspect: event.aspect || "",
      occursAt: event.startsAt,
      dateKey: event.dateKey,
      rank: index + 1
    }));
}

export async function getSkyPlacementTransitFacts({
  planet: requestedPlanet,
  sign: requestedSign,
  referenceDate = new Date(),
  timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC"
}: {
  planet: string;
  sign: string;
  referenceDate?: Date;
  timeZone?: string;
}): Promise<SkyPlacementTransitFacts> {
  if (Number.isNaN(referenceDate.getTime())) throw new Error("Sky Placement referenceDate must be valid.");
  new Intl.DateTimeFormat("en-US", { timeZone }).format(referenceDate);
  const swe = await getSwissEph();
  const { planet, planetId, longitudeOffset } = placementPlanet(swe, requestedPlanet);
  const sign = placementSign(requestedSign);
  const sample = findNextPlacementSample(swe, planet, planetId, sign, referenceDate, longitudeOffset);
  const window = signResidencyWindowFor(swe, planet, planetId, sample, sign, longitudeOffset);
  if (!window.transitStart || !window.transitEnd) {
    throw new Error(`Could not resolve the ${planet} in ${sign} transit boundaries.`);
  }
  const transitStart = new Date(window.transitStart);
  const transitEnd = new Date(window.transitEnd);
  const priorReference = new Date(transitStart.getTime() - 5 * 60_000);
  const priorSign = exactPlanetSign(swe, planetId, priorReference, longitudeOffset);
  const priorWindow = signTransitWindowFor(swe, planet, planetId, priorReference, priorSign, longitudeOffset);
  if (!priorWindow.transitStart || !priorWindow.transitEnd) {
    throw new Error(`Could not resolve the prior ${planet} in ${priorSign} transit boundaries.`);
  }
  const previous = previousSameSignResidencyFor(swe, planet, planetId, sign, transitStart, longitudeOffset);
  const eventPasses = window.residencyPasses ?? [{
    entryDate: window.transitStart,
    exitDate: window.transitEnd
  }];
  const rankedEventsDuringTransit = ["Chiron", "North Node", "South Node"].includes(planet)
    ? []
    : rankPlacementEvents(
      eventPasses.flatMap((pass) => findSkyAspects(
        swe,
        new Date(pass.entryDate),
        new Date(pass.exitDate),
        timeZone
      )),
      planet
    );

  return {
    planet,
    sign,
    referenceDate: referenceDate.toISOString(),
    timeZone,
    transitStart: window.transitStart,
    transitEnd: window.transitEnd,
    residencyPasses: eventPasses,
    priorSign,
    priorSignEntryDate: priorWindow.transitStart,
    priorSignExitDate: priorWindow.transitEnd,
    previousResidency: previous?.transitStart && previous.transitEnd
      ? { sign, entryDate: previous.transitStart, exitDate: previous.transitEnd }
      : null,
    rankedEventsDuringTransit,
    calculationSource: ASTROLOGY_CALCULATION_CONTRACT.source,
    zodiac: ASTROLOGY_CALCULATION_CONTRACT.zodiac,
    lilithType: ASTROLOGY_CALCULATION_CONTRACT.lilithType
  };
}

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
    SE_TRUE_BLACK_MOON_LILITH,
    swe.SE_TRUE_NODE
  ];
  const returnedEphemerisFlags = new Set<number>();
  const positions: CalculatedPlanet[] = planets.map(([planet, glyph], index) => {
    const calculation = calculateSwissUt(swe, jd, planetIds[index], flags);
    returnedEphemerisFlags.add(calculation.returnedFlags);
    const result = calculation.values;
    const longitude = normalizeDegrees(result[0]);
    const latitude = Number(result[1].toFixed(4));
    const { sign, signGlyph, degree } = signForLongitude(longitude);
    const motion = result[3] < -0.0001 ? "retrograde" : "direct";
    const transitWindow = options.includeTransitWindows
      ? signResidencyWindowFor(swe, planet, planetIds[index], date, sign)
      : {};
    const structuralTransitFacts = options.includeTransitWindows
      ? skyPlacementStructuralTransitFacts(swe, planet, planetIds[index], sign, transitWindow)
      : {};
    const retrogradeWindow = options.includeTransitWindows
      ? retrogradeCycleFactsFor(swe, planet, planetIds[index], date, motion)
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
      ...retrogradeWindow
    };
  });
  const northNode = positions.find((position) => position.planet === "North Node");
  const displayPositions = northNode ? [...positions, southNodePositionFromNorthNode(northNode, ascendant)] : positions;
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
    calculationProvenance: astrologyCalculationProvenance(returnedEphemerisFlags),
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
