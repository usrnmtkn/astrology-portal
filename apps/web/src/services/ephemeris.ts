import type { LocationInput, PlanetPosition, SkySnapshot, SolarDaylight } from "../types.js";
import { debugInfoForZonedDateTime } from "./timezones.js";

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

const SE_CHIRON = 15;
const SE_MEAN_BLACK_MOON_LILITH = 12;

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

const aspectDefinitions = [
  ["conjunction", 0],
  ["sextile", 60],
  ["square", 90],
  ["trine", 120],
  ["opposition", 180]
] as const;

const calendarAspectDefinitions = aspectDefinitions.filter(([, degrees]) => degrees <= 180);

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

  return normalizeDegrees(swe.calc_ut(jd, planetId, flags)[0]);
}

function exactPlanetSpeed(swe: SwissEphInstance, planetId: number, date: Date) {
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
    return "TODAY left";
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
  const houses = swe.houses(julianDayForDate(swe, date), location.latitude, location.longitude, "P") as unknown as {
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
          sign: toSign
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
  const planetIds = [
    swe.SE_MERCURY,
    swe.SE_VENUS,
    swe.SE_MARS,
    swe.SE_JUPITER,
    swe.SE_SATURN,
    swe.SE_URANUS,
    swe.SE_NEPTUNE,
    swe.SE_PLUTO
  ];
  const stationPlanets = planets.slice(2, 10);
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
        const direction = speedAfter < 0 ? "retrograde" : "direct";
        const dateKey = localDateKey(occursAt, timeZone);
        const sign = exactPlanetSign(swe, planetId, occursAt);

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
            sign
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
    swe.SE_PLUTO
  ];
  const retrogradePlanets = planets.slice(2, 10);

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
        sign
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

function nodeRetrogradeTransitWindowFor(
  planet: string,
  motion: PlanetPosition["motion"],
  transitWindow: Pick<PlanetPosition, "transitStart" | "transitEnd">
): Pick<PlanetPosition, "retrogradeStart" | "retrogradeEnd" | "retrogradeWindowSource"> {
  if (planet !== "North Node" || motion !== "retrograde" || !transitWindow.transitStart || !transitWindow.transitEnd) {
    return {};
  }

  return {
    retrogradeStart: transitWindow.transitStart,
    retrogradeEnd: transitWindow.transitEnd,
    retrogradeWindowSource: "sign-transit"
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
                aspect
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
  const gridStart = zonedDateTimeToUtc(timeZone, localParts.year, localParts.month, localParts.day - Math.max(0, weekdayIndex));
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

function aspectForSeparation(separation: number) {
  return aspectDefinitions
    .map(([type, exact]) => ({ type, orb: Math.abs(separation - exact) }))
    .filter(({ orb }) => orb <= 5)
    .sort((a, b) => a.orb - b.orb)[0];
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
          orb: Number(aspect.orb.toFixed(1))
        });
      }
    });
  });

  return aspects.sort((a, b) => a.orb - b.orb);
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
    SE_CHIRON,
    SE_MEAN_BLACK_MOON_LILITH,
    swe.SE_MEAN_NODE
  ];
  const positions: CalculatedPlanet[] = planets.map(([planet, glyph], index) => {
    const result = swe.calc_ut(jd, planetIds[index], flags);
    const longitude = normalizeDegrees(result[0]);
    const { sign, signGlyph, degree } = signForLongitude(longitude);
    const motion = result[3] < -0.0001 ? "retrograde" : "direct";
    const transitWindow = options.includeTransitWindows
      ? signTransitWindowFor(swe, planet, planetIds[index], date, sign)
      : {};
    const retrogradeWindow = options.includeTransitWindows
      ? {
          ...nodeRetrogradeTransitWindowFor(planet, motion, transitWindow),
          ...activeRetrogradeWindowFor(swe, planet, planetIds[index], date, motion)
        }
      : {};

    return {
      planet,
      glyph,
      sign,
      signGlyph,
      degree,
      house: wholeSignHouse(sign, ascendant),
      motion,
      ...transitWindow,
      ...retrogradeWindow,
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
    moonStatus: moonStatusFor(swe, date),
    moonSignTransition: moonSignTransitionForDay(swe, date, location.timeZone),
    moonEvent: nextMoonEvent(swe, date),
    solarDaylight: solarDaylightForDay(swe, location, date),
    dominantElement: elementForSign(sun.sign),
    positions: positions.map(({ longitude, speed, ...position }) => position),
    aspects: calculateAspects(positions)
  };
}
