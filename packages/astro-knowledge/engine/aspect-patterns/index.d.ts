export type PlanetId =
  | "sun"
  | "moon"
  | "mercury"
  | "venus"
  | "mars"
  | "jupiter"
  | "saturn"
  | "uranus"
  | "neptune"
  | "pluto";

export type AspectPatternType =
  | "grand_square"
  | "t_square"
  | "grand_trine"
  | "kite"
  | "yod"
  | "mystic_rectangle";

export type AspectType =
  | "opposition"
  | "trine"
  | "square"
  | "sextile"
  | "quincunx";

export interface ZodiacPoint {
  longitude: number;
  sign: string;
  house?: number;
}

export interface NormalizedPlanet {
  id: PlanetId;
  longitude?: number;
  sign?: string;
  house?: number;
}

export interface NormalizedAspect {
  id: string;
  pointA: PlanetId;
  pointB: PlanetId;
  type: AspectType;
  exactAngle: number;
  orb: number;
  applying?: boolean;
  outOfSign?: boolean;
  partial?: boolean;
}

export interface OrbPolicy {
  id: string;
  aspects: {
    opposition: number;
    square: number;
    trine: number;
    sextile: number;
    quincunx: number;
  };
  patternTolerance: number;
  allowOutOfSign: boolean;
}

export interface PatternGeometry {
  orbPolicyId: string;
  maximumOrb: number;
  averageOrb: number;
  weakestAspectOrb: number;
  isOutOfSign: boolean;
  confidence: "exact" | "strong" | "wide" | "partial";
  warnings: string[];
}

export type DerivedPatternPointType =
  | "empty_leg"
  | "fallout_point"
  | "open_sextile_midpoint"
  | "opposite_apex"
  | "pattern_midpoint";

export interface DerivedPatternPoint extends ZodiacPoint {
  type: DerivedPatternPointType;
}

export type PatternRoles =
  | {
      type: "t_square";
      oppositionAxis: [PlanetId, PlanetId];
      apex: PlanetId;
      emptyLeg: ZodiacPoint;
    }
  | {
      type: "grand_square";
      planets: [PlanetId, PlanetId, PlanetId, PlanetId];
      oppositionAxes: [[PlanetId, PlanetId], [PlanetId, PlanetId]];
    }
  | {
      type: "grand_trine";
      planets: [PlanetId, PlanetId, PlanetId];
      elementConsistency: "same_element" | "mixed_element" | "out_of_sign";
    }
  | {
      type: "kite";
      grandTrinePlanets: [PlanetId, PlanetId, PlanetId];
      focalPlanet: PlanetId;
      opposedTrinePlanet: PlanetId;
      spine: [PlanetId, PlanetId];
      resourcePlanets: [PlanetId, PlanetId];
    }
  | {
      type: "yod";
      basePlanets: [PlanetId, PlanetId];
      apex: PlanetId;
      falloutPoint: ZodiacPoint;
    }
  | {
      type: "mystic_rectangle";
      oppositionAxes: [[PlanetId, PlanetId], [PlanetId, PlanetId]];
      supportiveAspects: NormalizedAspect[];
      variant: "trine_sextile" | "other_harmonic";
    };

export interface AspectPattern {
  id: string;
  type: AspectPatternType;
  planets: PlanetId[];
  sourceAspectIds: string[];
  roles: PatternRoles;
  derivedPoints: DerivedPatternPoint[];
  geometry: PatternGeometry;
}

export interface PatternRelationship {
  parentPatternId: string;
  childPatternId: string;
  relationship: "contains" | "shares_planet" | "shares_aspect" | "completes";
}

export interface AspectPatternDetectionResult {
  orbPolicyId: string;
  patterns: AspectPattern[];
  relationships: PatternRelationship[];
  diagnostics: {
    inputPlanetCount: number;
    inputAspectCount: number;
    eligibleAspectCount: number;
    skippedAspects: Array<{
      aspectId: string;
      reason: string;
    }>;
    warnings: string[];
  };
}

export const DEFAULT_ORB_POLICY: OrbPolicy;
export const PLANET_IDS: readonly PlanetId[];
export const SUPPORTED_ASPECTS: readonly AspectType[];

export function normalizeOrbPolicy(policy?: Partial<OrbPolicy>): OrbPolicy;
export function detectPatterns(
  input: {
    planets: NormalizedPlanet[];
    aspects: Array<NormalizedAspect | Record<string, unknown>>;
  },
  policy?: Partial<OrbPolicy>
): AspectPatternDetectionResult;
