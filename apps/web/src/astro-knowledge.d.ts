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
