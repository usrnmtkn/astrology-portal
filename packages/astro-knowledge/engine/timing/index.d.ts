export type ZodiacSign =
  | "aries"
  | "taurus"
  | "gemini"
  | "cancer"
  | "leo"
  | "virgo"
  | "libra"
  | "scorpio"
  | "sagittarius"
  | "capricorn"
  | "aquarius"
  | "pisces";

export type TraditionalPlanet =
  | "sun"
  | "moon"
  | "mercury"
  | "venus"
  | "mars"
  | "jupiter"
  | "saturn";

export type TransitPhase = "applying" | "exact" | "separating";
export type SignificanceLabel =
  | "major theme"
  | "active theme"
  | "background influence"
  | "low priority";

export interface NatalPlacement {
  planet: string;
  sign: ZodiacSign | string;
}

export interface AnnualTimingInput {
  ageYears?: number;
  birthDate?: Date | string;
  currentDate?: Date | string;
  ascendantSign: ZodiacSign | string;
  natalPlanets?: NatalPlacement[];
}

export interface AnnualTimingContext {
  ageYears: number;
  profectedHouse: number;
  profectedSign: ZodiacSign;
  lordOfYear: TraditionalPlanet;
  chartRuler?: TraditionalPlanet | string;
  houseTopic: string;
  activeNatalPlanetsInProfectedSign: string[];
}

export interface TransitCandidate {
  transiting?: string;
  transitingPlanet?: string;
  natalTarget?: string;
  target?: string;
  aspect?: string;
  house?: number;
  sign?: string;
  orbDegrees?: number;
  phase?: TransitPhase | string;
  touchesAngle?: boolean;
  repeatsNatalPromise?: boolean;
  repeatsReturnTheme?: boolean;
  isStationary?: boolean;
  conditionScore?: number;
  bonificationMaltreatmentScore?: number;
  [key: string]: unknown;
}

export interface ScoredTransit extends TransitCandidate {
  score: number;
  label: SignificanceLabel;
  factors: {
    baseScore: number;
    bonusScore: number;
    bonuses: string[];
  };
}

export const SIGNS: readonly ZodiacSign[];
export const TRADITIONAL_PLANETS: readonly TraditionalPlanet[];
export const TRADITIONAL_RULERS: Readonly<Record<ZodiacSign, TraditionalPlanet>>;
export const HOUSE_TOPICS: Readonly<Record<number, string>>;
export const TRANSIT_WEIGHTS: Readonly<Record<string, Readonly<Record<string, number>>>>;

export function normalizeSign(sign: string): ZodiacSign;
export function calculateCompletedAge(birthDate: Date | string, currentDate: Date | string): number;
export function getProfectedHouse(ageYears: number): number;
export function getProfectedSign(ascendantSign: string, ageYears: number): ZodiacSign;
export function getLordOfYear(profectedSign: string): TraditionalPlanet;
export function activeNatalPlanetsInSign(natalPlanets: NatalPlacement[], sign: string): string[];
export function buildAnnualTimingContext(input: AnnualTimingInput): AnnualTimingContext;

export function tightnessFactor(orbDegrees?: number): number;
export function applyingFactor(phase?: string): number;
export function significanceLabel(score: number): SignificanceLabel;
export function scoreTransit(
  transit: TransitCandidate,
  timingContext?: Partial<AnnualTimingContext>,
  options?: Record<string, unknown>
): ScoredTransit;
export function rankTransits(
  transits: TransitCandidate[],
  timingContext?: Partial<AnnualTimingContext>,
  options?: Record<string, unknown>
): ScoredTransit[];

export function effectiveOrb(aspect: string, profile?: string, bodies?: string[]): number;
export function isAspectActive(input: {
  degreesA: number;
  degreesB: number;
  aspect: string;
  profile?: string;
  bodies?: string[];
}): { active: boolean; orb: number; effectiveOrb: number };
export function sameMomentAspectKey(bodyA: string, bodyB: string, aspect: string): string | null;
export function transitToNatalAspectKey(transiting: string, natal: string, aspect: string): string;

export function moonPhase(moonDegrees: number, sunDegrees: number): {
  phase: string;
  separation: number;
  waxing: boolean;
  waning: boolean;
  exactnessFromNewOrFull: number;
};
export function ritualWindow(input: {
  phase: string;
  hoursAfterExact: number;
  isEclipse?: boolean;
}): { mode: string; allowed: boolean; strongest?: boolean; reason?: string };

export function dignityScore(planet: string, sign: string): { score: number; reasons: string[] };
export function angularity(house: number): { type: string; score: number };
export function sectStatus(planet: string, chartSect: string): string;
export function solarCondition(planetDegrees: number, sunDegrees: number): {
  condition: string;
  score: number;
  distance: number;
};
export function conditionScore(input: Record<string, unknown>): Record<string, unknown>;
export function bonificationMaltreatment(contact: Record<string, unknown>, chartSect?: string): {
  score: number;
  flags: string[];
  sectStatus: string | null;
};

export function saturnLifecycle(ageYears: number, transitingSaturnDegrees: number, natalSaturnDegrees: number): Record<string, unknown>;
export function uranusLifecycle(ageYears: number, transitingUranusDegrees: number, natalUranusDegrees: number): Record<string, unknown>;
export function nodalLifecycle(ageYears: number, transitingNodeDegrees: number, natalNodeDegrees: number): Record<string, unknown>;
export function jupiterLifecycle(ageYears: number, transitingJupiterDegrees: number, natalJupiterDegrees: number): Record<string, unknown>;
export function chironLifecycle(ageYears: number, transitingChironDegrees: number, natalChironDegrees: number): Record<string, unknown>;
export function progressedLunationPhase(progressedMoonDegrees: number, progressedSunDegrees: number): Record<string, unknown>;

export function shouldDisplayModernPoint(input: Record<string, unknown>): {
  display: boolean;
  reason: string;
};
export function eventConfidence(indicatorCount: number): "none" | "low" | "medium" | "high";
export function classifyEventSignals(signals: Array<Record<string, unknown>>): Array<Record<string, unknown>>;
