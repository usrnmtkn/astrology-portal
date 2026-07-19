declare module "@tldr/astro-knowledge" {
  const knowledge: unknown;
  export default knowledge;
}

declare module "@tldr/astro-knowledge/sky" {
  const knowledge: unknown;
  export default knowledge;
}

declare module "@tldr/astro-knowledge/sky-web" {
  const knowledge: unknown;
  export default knowledge;
}

declare module "@tldr/astro-knowledge/natal" {
  const knowledge: unknown;
  export default knowledge;
}

declare module "@tldr/astro-knowledge/natal-web" {
  const knowledge: unknown;
  export default knowledge;
}

declare module "@tldr/astro-knowledge/relationships" {
  const knowledge: unknown;
  export default knowledge;
}

declare module "@tldr/astro-knowledge/relationships-web" {
  const knowledge: unknown;
  export default knowledge;
}

declare module "@tldr/astro-knowledge/synastry" {
  const knowledge: unknown;
  export default knowledge;
}

declare module "@tldr/astro-knowledge/composite" {
  const knowledge: unknown;
  export default knowledge;
}

declare module "@tldr/astro-knowledge/web" {
  const knowledge: unknown;
  export default knowledge;
}

declare module "@tldr/astro-knowledge/timing-engine" {
  export type TraditionalPlanet =
    | "sun"
    | "moon"
    | "mercury"
    | "venus"
    | "mars"
    | "jupiter"
    | "saturn";

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

  export type SignificanceLabel =
    | "major theme"
    | "active theme"
    | "background influence"
    | "low priority";

  export type AnnualTimingContext = {
    ageYears: number;
    profectedHouse: number;
    profectedSign: ZodiacSign;
    lordOfYear: TraditionalPlanet;
    chartRuler?: TraditionalPlanet | string;
    houseTopic: string;
    activeNatalPlanetsInProfectedSign: string[];
  };

  export type TransitCandidate = {
    transiting?: string;
    transitingPlanet?: string;
    natalTarget?: string;
    target?: string;
    aspect?: string;
    house?: number;
    sign?: string;
    orbDegrees?: number;
    phase?: string;
    touchesAngle?: boolean;
    repeatsNatalPromise?: boolean;
    repeatsReturnTheme?: boolean;
    isStationary?: boolean;
    conditionScore?: number;
    bonificationMaltreatmentScore?: number;
    [key: string]: unknown;
  };

  export type ScoredTransit = TransitCandidate & {
    score: number;
    label: SignificanceLabel;
    factors: {
      baseScore: number;
      bonusScore: number;
      bonuses: string[];
    };
  };

  export function buildAnnualTimingContext(input: {
    ageYears?: number;
    birthDate?: Date | string;
    currentDate?: Date | string;
    ascendantSign: ZodiacSign | string;
    natalPlanets?: Array<{ planet: string; sign: ZodiacSign | string }>;
  }): AnnualTimingContext;

  export function rankTransits(
    transits: TransitCandidate[],
    timingContext?: Partial<AnnualTimingContext>,
    options?: Record<string, unknown>
  ): ScoredTransit[];
}

declare module "@tldr/astro-knowledge/aspect-pattern-engine" {
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

  export type NormalizedPlanet = {
    id: PlanetId;
    longitude?: number;
    sign?: string;
    house?: number;
  };

  export type NormalizedAspect = {
    id: string;
    pointA: PlanetId;
    pointB: PlanetId;
    type: AspectType;
    exactAngle: number;
    orb: number;
    applying?: boolean;
    outOfSign?: boolean;
    partial?: boolean;
  };

  export type AspectPatternDetectionResult = {
    orbPolicyId: string;
    patterns: Array<{
      id: string;
      type: AspectPatternType;
      planets: PlanetId[];
      sourceAspectIds: string[];
      roles: Record<string, unknown>;
      derivedPoints: Array<Record<string, unknown>>;
      geometry: {
        orbPolicyId: string;
        maximumOrb: number;
        averageOrb: number;
        weakestAspectOrb: number;
        isOutOfSign: boolean;
        confidence: "exact" | "strong" | "wide" | "partial";
        warnings: string[];
      };
    }>;
    relationships: Array<{
      parentPatternId: string;
      childPatternId: string;
      relationship: "contains" | "shares_planet" | "shares_aspect" | "completes";
    }>;
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
    ranking?: {
      policyId: string;
      rankings: Array<{
        patternId: string;
        score: {
          geometry: number;
          natalProminence: number;
          structuralContext: number;
          baseDisplayPriority: number;
        };
        reasons: Array<{
          code:
            | "tight_geometry"
            | "contains_sun"
            | "contains_moon"
            | "contains_personal_planet"
            | "contains_chart_ruler"
            | "planet_near_angle"
            | "repeated_planet"
            | "parent_pattern"
            | "contained_pattern";
          planet?: string;
          value: number;
        }>;
      }>;
      displayOrder: string[];
    };
    interpretationContexts?: AspectPatternInterpretationContext[];
    resolvedCopy?: ResolvedAspectPatternCopy[];
    activation?: AspectPatternActivationResult;
  };

  export type AspectPatternActivationResult = {
    version: string;
    policyId: string;
    calculatedFor: string;
    activations: Array<{
      id: string;
      patternId: string;
      calculatedFor: string;
      trigger: {
        movingBody: string;
        targetNatalPlanet: string;
        targetRoles: string[];
        aspectType: string;
        orb: number;
        applying: boolean;
        exactAt?: string;
        sourceAspectId?: string;
      };
      linkedPatternIds: string[];
      score: {
        aspectWeight: number;
        exactnessWeight: number;
        applyingWeight: number;
        roleWeight: number;
        sharedPlanetWeight: number;
        total: number;
      };
      reasons: Array<{
        code: string;
        value: number;
      }>;
    }>;
    currentRankings: Array<{
      patternId: string;
      natalBasePriority: number;
      activationScore: number;
      currentDisplayPriority: number;
    }>;
    currentDisplayOrder: string[];
    interpretationContexts?: AspectPatternActivationInterpretationContext[];
    resolvedCopy?: ResolvedAspectPatternActivationCopy[];
  };

  export type AspectPatternActivationInterpretationContext = {
    version: string;
    patternId: string;
    patternType: AspectPatternType;
    natalInterpretationContextId: string;
    calculatedFor: string;
    display: Record<string, unknown>;
    natalPattern?: Record<string, unknown>;
    triggers: Array<Record<string, unknown>>;
    primaryTrigger: Record<string, unknown>;
    activationSummary: Record<string, unknown>;
    ranking: Record<string, unknown>;
    copyInstructions: Record<string, unknown>;
    provenance: Record<string, unknown>;
  };

  export type ResolvedAspectPatternActivationCopy = {
    patternId: string;
    patternType: AspectPatternType;
    calculatedFor: string;
    source: Record<string, unknown>;
    triggerSummary: Record<string, unknown>;
    content: {
      eyebrow?: string;
      headline: string;
      overview: string;
      sections: Array<{ id: string; body: string }>;
    };
    diagnostics: Record<string, unknown>;
  };

  export type AspectPatternInterpretationContext = {
    version: string;
    patternId: string;
    patternType: AspectPatternType;
    display: {
      rank: number;
      isPrimary: boolean;
      isContained: boolean;
      parentPatternIds: string[];
      childPatternIds: string[];
    };
    members: Array<Record<string, unknown>>;
    geometry: Record<string, unknown>;
    roles: Record<string, unknown>;
    derivedPoints: Array<Record<string, unknown>>;
    ranking: Record<string, unknown>;
    copyInstructions: Record<string, unknown>;
    provenance: Record<string, unknown>;
  };

  export type ResolvedAspectPatternCopy = {
    patternId: string;
    patternType: AspectPatternType;
    source: {
      recordId: string;
      contentLevel: string;
      status: string;
      resolverVersion: string;
    };
    content: {
      eyebrow?: string;
      headline: string;
      overview: string;
      sections: Array<{
        id: string;
        body: string;
      }>;
    };
    diagnostics: {
      templateId: string;
      usedFallback: boolean;
      missingSlots: string[];
      skippedSections: string[];
      validationWarnings?: string[];
      attemptedRecordIds?: string[];
    };
  };

  export function detectPatterns(input: {
    planets: NormalizedPlanet[];
    aspects: NormalizedAspect[];
  }): AspectPatternDetectionResult;

  export function rankAspectPatterns(
    detectionResult: AspectPatternDetectionResult,
    context?: Record<string, unknown>,
    policy?: Record<string, unknown>
  ): NonNullable<AspectPatternDetectionResult["ranking"]>;

  export function buildAspectPatternInterpretationContexts(
    detectionResult: AspectPatternDetectionResult,
    context?: Record<string, unknown>
  ): AspectPatternInterpretationContext[];

  export function buildAspectPatternActivationInterpretationContexts(
    detectionResult: AspectPatternDetectionResult,
    options?: Record<string, unknown>
  ): AspectPatternActivationInterpretationContext[];

  export function buildPatternActivations(
    detectionResult: AspectPatternDetectionResult,
    transitAspects?: Array<Record<string, unknown>>,
    options?: Record<string, unknown>
  ): AspectPatternActivationResult;

  export function resolveAspectPatternCopies(
    contexts: AspectPatternInterpretationContext[]
  ): ResolvedAspectPatternCopy[];

  export function resolveAspectPatternActivationCopies(
    contexts: AspectPatternActivationInterpretationContext[]
  ): ResolvedAspectPatternActivationCopy[];

  const aspectPatternEngine: {
    detectPatterns: typeof detectPatterns;
    rankAspectPatterns: typeof rankAspectPatterns;
    buildAspectPatternInterpretationContexts: typeof buildAspectPatternInterpretationContexts;
    buildAspectPatternActivationInterpretationContexts: typeof buildAspectPatternActivationInterpretationContexts;
    buildPatternActivations: typeof buildPatternActivations;
    resolveAspectPatternCopies: typeof resolveAspectPatternCopies;
    resolveAspectPatternActivationCopies: typeof resolveAspectPatternActivationCopies;
  };

  export default aspectPatternEngine;
}
