import type { LocationInput, SkySnapshot } from "../types";

export type AstrologyFactKind = "position" | "angle" | "house-cusp" | "aspect" | "event";
export type AstrologyTargetType = "planet" | "node" | "angle" | "cusp" | "other-point";
export type AstrologyRole = "natal" | "transiting" | "current-sky" | "synastry" | "composite";
export type AstrologyValidationStatus = "verified-primary" | "verified-independent" | "blocked-independent-missing" | "invalid";
export type AstrologyApplyingState = "applying" | "separating" | "exact" | "unknown";

export type AstrologyCalculationProvenance = {
  source: string;
  library: string;
  libraryVersion: string;
  ephemerisFiles: string[];
  zodiac: "tropical" | "sidereal";
  frame: "geocentric" | "topocentric";
  houseSystem: "whole_sign";
  planetHouseSystem: "whole_sign";
  nodeType: "mean" | "true";
  calculationVersion: string;
};

export type AstrologyFact = {
  id: string;
  kind: AstrologyFactKind;
  calculatedAt: string;
  timeZone: string;
  location?: LocationInput;
  provenance: AstrologyCalculationProvenance;
  validationStatus: AstrologyValidationStatus;
  planetOrPointId?: string;
  targetType?: AstrologyTargetType;
  longitude?: number;
  latitude?: number | null;
  normalizedSign?: string;
  normalizedDegree?: number;
  directRetrograde?: "direct" | "retrograde";
  retrogradePhase?: string | null;
  stationStart?: string | null;
  stationEnd?: string | null;
  shadowStart?: string | null;
  shadowEnd?: string | null;
  aspectType?: string;
  exactAngularSeparation?: number;
  orb?: number;
  applyingSeparating?: AstrologyApplyingState;
  role?: AstrologyRole;
  targetRole?: AstrologyRole;
  targetId?: string;
  house?: number;
  houseSystem?: "whole_sign";
  canonicalAxisId?: string;
  exactDate?: string | null;
  activeWindow?: {
    startsAt: string | null;
    endsAt: string | null;
  } | null;
  passNumber?: number | null;
  totalPasses?: number | null;
  contentRecordId?: string | null;
  snapshotSource?: "local" | "live" | "api" | "none";
  hydrationState?: "server" | "hydrated" | "not-applicable";
  cacheAgeMs?: number | null;
  diagnostics?: string[];
};

export const ASTROLOGY_CALCULATION_PROVENANCE: AstrologyCalculationProvenance = {
  source: "local-swisseph-wasm",
  library: "swisseph-wasm",
  libraryVersion: "0.0.5",
  ephemerisFiles: ["swisseph.wasm"],
  zodiac: "tropical",
  frame: "geocentric",
  houseSystem: "whole_sign",
  planetHouseSystem: "whole_sign",
  nodeType: "true",
  calculationVersion: "tldrastro-calculation-v2"
};

export function slugFactPart(value: string | number | null | undefined) {
  return String(value ?? "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

export function axisIdForPoint(point: string) {
  const normalized = slugFactPart(point);

  if (normalized === "ascendant" || normalized === "descendant") {
    return "axis.ascendant_descendant";
  }

  if (normalized === "midheaven" || normalized === "imum_coeli" || normalized === "ic") {
    return "axis.midheaven_imum_coeli";
  }

  return null;
}

function targetTypeForPoint(point: string): AstrologyTargetType {
  if (/node/i.test(point)) return "node";
  if (/ascendant|descendant|midheaven|imum coeli|^ic$/i.test(point)) return "angle";
  if (/cusp/i.test(point)) return "cusp";
  if (/lilith|chiron/i.test(point)) return "other-point";
  return "planet";
}

function applyingState(value?: boolean) {
  if (value === true) return "applying";
  if (value === false) return "separating";
  return "unknown";
}

function baseFact(snapshot: SkySnapshot, kind: AstrologyFactKind): Pick<AstrologyFact, "kind" | "calculatedAt" | "timeZone" | "location" | "provenance" | "validationStatus"> {
  return {
    kind,
    calculatedAt: snapshot.generatedAt,
    timeZone: snapshot.location.timeZone ?? "UTC",
    location: snapshot.location,
    provenance: snapshot.calculationProvenance ?? ASTROLOGY_CALCULATION_PROVENANCE,
    validationStatus: "verified-primary"
  };
}

export function factsFromSkySnapshot(snapshot: SkySnapshot): AstrologyFact[] {
  const facts: AstrologyFact[] = [];

  for (const position of snapshot.positions) {
    const pointId = slugFactPart(position.planet);

    facts.push({
      ...baseFact(snapshot, "position"),
      id: `fact.position.${pointId}.${snapshot.generatedAt}`,
      planetOrPointId: pointId,
      targetType: targetTypeForPoint(position.planet),
      longitude: position.longitude,
      latitude: position.latitude ?? null,
      normalizedSign: position.sign,
      normalizedDegree: position.degree,
      directRetrograde: position.motion,
      retrogradePhase: position.retrogradePhase ?? null,
      stationStart: position.retrogradeStart ?? null,
      stationEnd: position.retrogradeEnd ?? null,
      shadowStart: position.retrogradeShadowStart ?? null,
      shadowEnd: position.retrogradeShadowEnd ?? null,
      role: "current-sky",
      house: position.house,
      houseSystem: position.houseSystem ?? snapshot.calculationProvenance?.planetHouseSystem ?? ASTROLOGY_CALCULATION_PROVENANCE.planetHouseSystem,
      activeWindow: {
        startsAt: position.transitStart ?? null,
        endsAt: position.transitEnd ?? null
      },
      passNumber: null,
      totalPasses: null,
      snapshotSource: "api",
      hydrationState: "not-applicable",
      cacheAgeMs: null
    });
  }

  const angleFacts = [
    ["Ascendant", snapshot.ascendantLongitude, snapshot.ascendant],
    ["Descendant", typeof snapshot.ascendantLongitude === "number" ? (snapshot.ascendantLongitude + 180) % 360 : undefined, undefined],
    ["Midheaven", snapshot.midheavenLongitude, snapshot.midheaven],
    ["Imum Coeli", typeof snapshot.midheavenLongitude === "number" ? (snapshot.midheavenLongitude + 180) % 360 : undefined, undefined]
  ] as const;

  for (const [angle, longitude, sign] of angleFacts) {
    if (typeof longitude !== "number") continue;

    facts.push({
      ...baseFact(snapshot, "angle"),
      id: `fact.angle.${slugFactPart(angle)}.${snapshot.generatedAt}`,
      planetOrPointId: slugFactPart(angle),
      targetType: "angle",
      longitude: Number(longitude.toFixed(4)),
      normalizedSign: sign,
      role: "current-sky",
      canonicalAxisId: axisIdForPoint(angle) ?? undefined,
      houseSystem: snapshot.calculationProvenance?.houseSystem ?? ASTROLOGY_CALCULATION_PROVENANCE.houseSystem,
      snapshotSource: "api",
      hydrationState: "not-applicable",
      cacheAgeMs: null
    });
  }

  for (const cusp of snapshot.houseCusps ?? []) {
    facts.push({
      ...baseFact(snapshot, "house-cusp"),
      id: `fact.house_cusp.${cusp.house}.${snapshot.generatedAt}`,
      planetOrPointId: `house_${cusp.house}_cusp`,
      targetType: "cusp",
      longitude: cusp.longitude,
      normalizedSign: cusp.sign,
      normalizedDegree: cusp.degree,
      role: "current-sky",
      house: cusp.house,
      houseSystem: cusp.houseSystem,
      snapshotSource: "api",
      hydrationState: "not-applicable",
      cacheAgeMs: null
    });
  }

  for (const aspect of snapshot.aspects) {
    facts.push({
      ...baseFact(snapshot, "aspect"),
      id: `fact.aspect.${slugFactPart(aspect.from)}.${slugFactPart(aspect.type)}.${slugFactPart(aspect.to)}.${snapshot.generatedAt}`,
      planetOrPointId: slugFactPart(aspect.from),
      targetId: slugFactPart(aspect.to),
      targetType: targetTypeForPoint(aspect.to),
      aspectType: aspect.type,
      exactAngularSeparation: aspect.exactAngle ?? aspect.separation,
      orb: aspect.orb,
      applyingSeparating: applyingState(aspect.applying ?? aspect.conditions?.applying),
      role: "current-sky",
      targetRole: "current-sky",
      snapshotSource: "api",
      hydrationState: "not-applicable",
      cacheAgeMs: null
    });
  }

  return facts;
}

export function validateAstrologyFacts(facts: AstrologyFact[]) {
  const diagnostics: string[] = [];

  for (const fact of facts) {
    if (!fact.id || !fact.calculatedAt || !fact.provenance?.calculationVersion) {
      diagnostics.push(`${fact.id || "(missing id)"} is missing required provenance fields.`);
    }

    if ((fact.kind === "position" || fact.kind === "angle" || fact.kind === "house-cusp") && typeof fact.longitude !== "number") {
      diagnostics.push(`${fact.id} is missing longitude.`);
    }

    if (fact.kind === "aspect" && (typeof fact.exactAngularSeparation !== "number" || typeof fact.orb !== "number")) {
      diagnostics.push(`${fact.id} is missing aspect separation/orb.`);
    }
  }

  return {
    ok: diagnostics.length === 0,
    diagnostics
  };
}
