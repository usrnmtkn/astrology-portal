import { angularSeparation, calculateNatalAspects, calculateSkyAspects, normalizeDegrees, SKY_ASPECT_DEFINITIONS } from "@tldr/astro-knowledge/sky-aspect-engine";
import { hasCalculatedSolarHorizon, natalSectForSnapshot, natalSectFromAltitude } from "../../../../src/shared/solarHorizon";
import type { PlanetPosition, SkySnapshot } from "../types";
import { isDisplayRetrograde } from "./astrologyDisplay";
import { planetSignDignity } from "./planetSignDignity.mjs";
import { zodiacSigns } from "./chartMath";

export { zodiacSigns as wheelSigns };
export type ZodiacWheelSnapshot = Pick<SkySnapshot, "positions" | "aspects" | "ascendantLongitude" | "midheavenLongitude">
  & Partial<Pick<SkySnapshot, "birthTimeKnown" | "generatedAt" | "solarHorizon" | "sharedNatalSect">>;
export type WheelSelection = { type: "planet"; name: string } | { type: "house"; house: number } | { type: "angle"; key: string };
export type WheelCondition = { label: string; tone: "good" | "bad" | "neutral" };
export type WheelPoint = {
  name: string;
  longitude: number;
  sign: string;
  degree: number;
  house: number | null;
  speed?: number | null;
  retrograde: boolean;
  kind: "planet" | "point";
  conditions: WheelCondition[];
};
export type WheelAngle = { key: string; name: string; longitude: number; house: number };
export type WheelAspect = {
  from: string;
  to: string;
  type: string;
  orb: number;
  close: boolean;
  applying?: boolean;
};
export const traditionalRulers = ["Mars", "Venus", "Mercury", "Moon", "Sun", "Mercury", "Venus", "Mars", "Jupiter", "Saturn", "Saturn", "Jupiter"];
const majorPlanets = new Set(["Sun", "Moon", "Mercury", "Venus", "Mars", "Jupiter", "Saturn", "Uranus", "Neptune", "Pluto"]);
const supportedPoints = new Set([...majorPlanets, "North Node", "South Node", "Lilith", "Chiron", "Lot of Fortune"]);
const bySign: Record<number, string> = { 0: "conjunction", 2: "sextile", 3: "square", 4: "trine", 6: "opposition" };
const dignityLabels: Record<string, string> = { domicile: "Domicile", exaltation: "Exalted", detriment: "Detriment", fall: "Fall" };

function pointName(name: string) {
  if (name === "True Node") return "North Node";
  if (name === "Part of Fortune") return "Lot of Fortune";
  return name;
}

export function wheelLongitude(position: PlanetPosition) {
  if (typeof position.longitude === "number" && Number.isFinite(position.longitude)) {
    return position.longitude >= 0 && position.longitude < 360 ? position.longitude : normalizeDegrees(position.longitude);
  }
  const index = zodiacSigns.indexOf(position.sign);
  return index >= 0 && Number.isFinite(position.degree) && position.degree >= 0 && position.degree < 30
    ? index * 30 + position.degree : null;
}

export function wheelDegree(degree: number) {
  const minutes = Math.round(degree * 60);
  return `${Math.floor(minutes / 60)}°${String(minutes % 60).padStart(2, "0")}′`;
}

export function wheelOrdinal(value: number) {
  const last = value % 100;
  return `${value}${last >= 11 && last <= 13 ? "th" : ({ 1: "st", 2: "nd", 3: "rd" } as Record<number, string>)[value % 10] ?? "th"}`;
}

/** Display adapter only: placements retain their ephemeris longitudes and the
 * existing Sky/Natal aspect profiles retain their own orb policy. */
export function zodiacWheelFacts(snapshot: ZodiacWheelSnapshot, mode: "sky" | "natal", birthTimeUnknown = false) {
  const hasHouses = !birthTimeUnknown && snapshot.birthTimeKnown !== false
    && typeof snapshot.ascendantLongitude === "number" && Number.isFinite(snapshot.ascendantLongitude);
  const ascendant = hasHouses ? normalizeDegrees(snapshot.ascendantLongitude!) : null;
  const ascSign = ascendant === null ? null : Math.floor(ascendant / 30);
  const houseOf = (longitude: number) => ascSign === null ? null : (Math.floor(normalizeDegrees(longitude) / 30) - ascSign + 12) % 12 + 1;
  const signOfHouse = (house: number) => ascSign === null ? null : (ascSign + house - 1) % 12;
  const fullSnapshot = { ...snapshot, generatedAt: snapshot.generatedAt ?? "" };
  const sect = hasHouses ? mode === "natal" ? natalSectForSnapshot(fullSnapshot)
    : hasCalculatedSolarHorizon(fullSnapshot) ? natalSectFromAltitude(snapshot.solarHorizon?.altitude, true) : null : null;
  const positions = new Map<string, WheelPoint>();
  for (const position of snapshot.positions) {
    const name = pointName(position.planet), longitude = wheelLongitude(position);
    if (!supportedPoints.has(name) || longitude === null || positions.has(name)) continue;
    // Fortune requires a timed chart, even if a legacy noon snapshot stored it.
    if (name === "Lot of Fortune" && !hasHouses) continue;
    positions.set(name, {
      name, longitude, sign: zodiacSigns[Math.floor(longitude / 30)], degree: longitude % 30,
      house: houseOf(longitude), speed: position.speed,
      retrograde: name !== "Sun" && name !== "Moon" && isDisplayRetrograde({ ...position, planet: name,
        motion: typeof position.speed === "number" && Number.isFinite(position.speed) ? position.speed < 0 ? "retrograde" : "direct" : position.motion }),
      kind: majorPlanets.has(name) ? "planet" : "point", conditions: []
    });
  }
  const sun = positions.get("Sun"), moon = positions.get("Moon");
  // Traditional day/night formula, using the same calculated solar horizon as
  // the app's sect readings. No noon/whole-sign approximation near the horizon.
  // https://www.astro.com/astrology/in_fortune_e.htm
  if (!positions.has("Lot of Fortune") && ascendant !== null && sect && sun && moon) {
    const longitude = normalizeDegrees(ascendant + (sect === "day" ? moon.longitude - sun.longitude : sun.longitude - moon.longitude));
    positions.set("Lot of Fortune", { name: "Lot of Fortune", longitude, sign: zodiacSigns[Math.floor(longitude / 30)],
      degree: longitude % 30, house: houseOf(longitude), retrograde: false, kind: "point", conditions: [] });
  }
  const planets = [...positions.values()];
  for (const point of planets) {
    const dignity = planetSignDignity(point.name, point.sign);
    point.conditions = dignity.dignities.map(value => ({ label: dignityLabels[value], tone: value === "domicile" || value === "exaltation" ? "good" : "bad" }));
    if (dignity.status === "known" && sect && sun) {
      const diurnal = point.name === "Mercury" ? normalizeDegrees(point.longitude - sun.longitude) > 180 : ["Sun", "Jupiter", "Saturn"].includes(point.name);
      const inSect = diurnal === (sect === "day");
      point.conditions.push({ label: (point.name === "Sun" || point.name === "Moon") && inSect ? "Sect light" : inSect ? "In sect" : "Out of sect", tone: inSect ? "neutral" : "bad" });
    }
    if (dignity.status === "known" && point.name !== "Sun" && sun) {
      const separation = angularSeparation(point.longitude, sun.longitude);
      if (separation < 8.5) point.conditions.push({ label: "Combust", tone: "bad" });
      else if (separation < 15) point.conditions.push({ label: "Under the beams", tone: "bad" });
    }
    if (point.retrograde) point.conditions.push({ label: "Rx", tone: "neutral" });
  }
  const angles: WheelAngle[] = ascendant === null ? [] : [
    { key: "ASC", name: "Ascendant", longitude: ascendant, house: 1 },
    { key: "DSC", name: "Descendant", longitude: normalizeDegrees(ascendant + 180), house: 7 }
  ];
  if (ascendant !== null && typeof snapshot.midheavenLongitude === "number" && Number.isFinite(snapshot.midheavenLongitude)) {
    for (const [key, name, longitude] of [["MC", "Midheaven", snapshot.midheavenLongitude], ["IC", "Imum Coeli", snapshot.midheavenLongitude + 180]] as const) {
      const normalized = normalizeDegrees(longitude);
      angles.push({ key, name, longitude: normalized, house: houseOf(normalized)! });
    }
  }
  const major = planets.filter(point => point.kind === "planet");
  const calculated = (mode === "sky" ? calculateSkyAspects : calculateNatalAspects)(major.map(point => ({ planet: point.name, longitude: point.longitude, speed: point.speed })));
  const aspects: WheelAspect[] = [];
  for (let i = 0; i < major.length; i++) for (const second of major.slice(i + 1)) {
    const first = major[i];
    let distance = Math.abs(Math.floor(first.longitude / 30) - Math.floor(second.longitude / 30));
    if (distance > 6) distance = 12 - distance;
    const type = bySign[distance];
    if (!type) continue;
    const definition = SKY_ASPECT_DEFINITIONS.find(value => value.type === type)!;
    const close = calculated.find(value => value.from === first.name && value.to === second.name && value.type === type);
    aspects.push({ from: first.name, to: second.name, type,
      orb: Math.abs(angularSeparation(first.longitude, second.longitude) - definition.exactAngle), close: Boolean(close),
      applying: Number.isFinite(first.speed) && Number.isFinite(second.speed) ? close?.applying : undefined });
  }
  return { planets, angles, aspects, ascendant, hasHouses, houseOf, signOfHouse };
}

export type ZodiacWheelFacts = ReturnType<typeof zodiacWheelFacts>;
