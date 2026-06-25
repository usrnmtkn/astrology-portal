import type { LocationInput, PlanetPosition, SkySnapshot } from "../types.js";
import { debugInfoForZonedDateTime } from "./timezones";

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
  ["Chiron", "⚷", "repair"],
  ["Lilith", "⚸", "shadow"],
  ["North Node", "☊", "direction"]
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

export type LunarCalendarEventType = "lunation" | "ingress" | "aspect";

export type LunarCalendarEvent = {
  id: string;
  type: LunarCalendarEventType;
  title: string;
  startsAt: string;
  dateKey: string;
  glyph: string;
  primary: boolean;
  planet?: string;
  planets?: [string, string];
  aspect?: string;
  sign?: string;
  fromSign?: string;
  toSign?: string;
  description: string;
};

export type LunarCalendarDay = {
  date: string;
  dateKey: string;
  inMonth: boolean;
  moonSign: string;
  moonSignGlyph: string;
  moonPhase: string;
  illumination: number;
  events: LunarCalendarEvent[];
};

export type LunarCalendarMonth = {
  month: string;
  timeZone: string;
  location: LocationInput;
  days: LunarCalendarDay[];
  events: LunarCalendarEvent[];
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

function hasMoonAspectBeforeIngress(swe: SwissEphInstance, date: Date, ingressDate: Date) {
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
  const aspectTargets = [0, 60, 90, 120, 180, 240, 270, 300];
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

function moonStatusFor(swe: SwissEphInstance, date: Date): SkySnapshot["moonStatus"] {
  const currentSign = moonSignAt(swe, date);
  const ingress = moonIngressAfter(swe, date);

  if (!ingress) {
    return {
      kind: "sign",
      label: currentSign,
      sign: currentSign
    };
  }

  const hasApplyingAspect = hasMoonAspectBeforeIngress(swe, date, ingress.occursAt);

  if (!hasApplyingAspect) {
    const remainingLabel = compactHoursRemaining(date, ingress.occursAt);

    return {
      kind: "void",
      label: `VoC (${remainingLabel})`,
      sign: currentSign,
      nextSign: ingress.to,
      until: ingress.occursAt.toISOString(),
      remainingLabel
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

function eventSignDescription(sign: string) {
  const element = elementForSign(sign);

  return `${sign} brings a ${element.toLowerCase()} tone to the event.`;
}

function moonPhaseIllumination(swe: SwissEphInstance, date: Date) {
  const phase = moonSunPhaseAngle(swe, date);

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
        const sign = signForLongitude(exactPlanetLongitude(swe, swe.SE_MOON, occursAt)).sign;
        const dateKey = localDateKey(occursAt, timeZone);

        if (!events.some((event) => Math.abs(new Date(event.startsAt).getTime() - occursAt.getTime()) < 60 * 60_000 && event.title === phaseTarget.name)) {
          events.push({
            id: `lunation-${phaseTarget.name.toLowerCase().replace(/\s+/g, "-")}-${occursAt.toISOString()}`,
            type: "lunation",
            title: `${phaseTarget.name} in ${sign}`,
            startsAt: occursAt.toISOString(),
            dateKey,
            glyph: phaseTarget.glyph,
            primary: phaseTarget.primary,
            sign,
            description: `${phaseTarget.name} exact in ${sign}. ${eventSignDescription(sign)}`
          });
        }
      });
    }
  });

  return events;
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
          sign: toSign,
          description: `${planet} leaves ${previousSign} and enters ${toSign}. ${eventSignDescription(toSign)}`
        });
      }

      previousDate = currentDate;
      previousSign = currentSign;
    }
  });

  return events;
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
                aspect,
                description: skyAspectDescription(firstPlanet, secondPlanet, aspect)
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

function skyAspectDescription(firstPlanet: string, secondPlanet: string, aspect: string) {
  const aspectTone: Record<string, string> = {
    conjunction: "concentrates their themes in one place",
    sextile: "opens a workable exchange between their themes",
    square: "puts pressure on their themes until a clearer response is needed",
    trine: "lets their themes move with less friction",
    opposition: "pulls their themes into direct comparison"
  };

  return `${firstPlanet} ${aspect} ${secondPlanet} ${aspectTone[aspect] ?? "links their themes for the day"}.`;
}

export async function getLunarCalendarMonth(
  location: LocationInput = defaultLocation,
  month: Date = new Date()
): Promise<LunarCalendarMonth> {
  const swe = await getSwissEph();
  const timeZone = location.timeZone || Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  const monthAnchor = new Date(month.getFullYear(), month.getMonth(), 1);
  const { gridStart, gridEnd } = monthGridRange(monthAnchor, timeZone);
  const eventStart = new Date(gridStart.getTime() - 2 * 86_400_000);
  const eventEnd = new Date(gridEnd.getTime() + 2 * 86_400_000);
  const events = [
    ...findLunations(swe, eventStart, eventEnd, timeZone),
    ...findIngresses(swe, eventStart, eventEnd, timeZone),
    ...findSkyAspects(swe, eventStart, eventEnd, timeZone)
  ].sort((first, second) => new Date(first.startsAt).getTime() - new Date(second.startsAt).getTime());
  const days = Array.from({ length: 42 }, (_, index) => {
    const dayStart = new Date(gridStart.getTime() + index * 86_400_000);
    const dateKey = localDateKey(dayStart, timeZone);
    const noon = new Date(dayStart.getTime() + 12 * 60 * 60_000);
    const moonLongitude = exactPlanetLongitude(swe, swe.SE_MOON, noon);
    const moonSign = signForLongitude(moonLongitude);
    const sunLongitude = exactPlanetLongitude(swe, swe.SE_SUN, noon);
    const localParts = localDateParts(dayStart, timeZone);

    return {
      date: dayStart.toISOString(),
      dateKey,
      inMonth: localParts.month === monthAnchor.getMonth() + 1 && localParts.year === monthAnchor.getFullYear(),
      moonSign: moonSign.sign,
      moonSignGlyph: moonSign.signGlyph,
      moonPhase: moonPhaseName(sunLongitude, moonLongitude),
      illumination: moonPhaseIllumination(swe, noon),
      events: events.filter((event) => event.dateKey === dateKey)
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
    moonStatus: moonStatusFor(swe, date),
    moonSignTransition: moonSignTransitionForDay(swe, date, location.timeZone),
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
    moonStatus: {
      kind: "sign",
      label: positions[1]?.sign ?? "Moon",
      sign: positions[1]?.sign ?? "Moon"
    },
    moonSignTransition: null,
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
