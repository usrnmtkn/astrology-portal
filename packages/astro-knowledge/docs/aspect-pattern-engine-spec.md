# Aspect Pattern Engine Spec

This document is the controlling scope for the first TLDR Astro aspect-pattern implementation. The first pass is math-only. It must not add interpretation copy, phrasebank content, admin editing, reader cards, AI generation, or planetary chart-shape detection.

## Source Boundary

Aspect patterns and planetary chart-shape patterns are separate systems.

Aspect patterns are mathematically defined configurations made from three or more planets connected by aspects. Planetary chart-shape patterns describe the overall distribution of planets around the chart, such as Bowl, Bucket, Fan, Locomotive, Seesaw, Splash, and Splay.

The aspect pattern engine must only detect aspect patterns. A planetary shape engine may be added later as a separate optional pass.

## Locked Pipeline

```text
raw chart math
-> normalized aspects
-> aspect pattern engine
-> canonicalization and deduplication
-> structural relationship graph
-> pattern-specific roles
-> derived points
-> geometry confidence
-> natal prominence
-> optional planetary shape engine
-> date-specific transit/progression activation
-> display ranking
-> copy resolver
```

The first implementation covers only:

```text
normalized aspects
-> aspect graph
-> canonical aspect-pattern detection
-> canonicalization and deduplication
-> structural relationship graph
-> pattern-specific roles
-> derived points
-> geometry confidence
-> structured output
```

## Supported Patterns

```ts
type AspectPatternType =
  | "grand_square"
  | "t_square"
  | "grand_trine"
  | "kite"
  | "yod"
  | "mystic_rectangle";
```

Use `grand_square` as the canonical internal name. `grand_cross` may be accepted only as an external alias.

## Core Rules

1. Aspect patterns and planetary chart-shape patterns are separate engines.
2. Detect all six supported aspect patterns from the beginning.
3. Detect every valid pattern before suppressing, ranking, or choosing display priority.
4. Grand Squares retain their component T-squares.
5. Kites retain their underlying Grand Trines.
6. Only planets may complete aspect patterns.
7. Ascendant, MC, IC, Descendant, nodes, and other calculated points cannot be pattern members.
8. Angles, houses, and rulers may affect prominence, but never geometry.
9. Structural relationships are permanent; transit and progression activation is date-specific.
10. Wide, partial, and out-of-sign patterns must be labeled with explicit confidence and warning metadata.
11. The copy resolver receives structured facts. It must not rebuild pattern logic from prose.
12. No detector may infer interpretation text.

## Input Model

The detector receives normalized planet positions and normalized aspects.

```ts
type PlanetId =
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

type ZodiacPoint = {
  longitude: number;
  sign: string;
  house?: number;
};

type NormalizedPlanet = {
  id: PlanetId;
  longitude: number;
  sign: string;
  house?: number;
};

type AspectType =
  | "conjunction"
  | "opposition"
  | "trine"
  | "square"
  | "sextile"
  | "quincunx";

type NormalizedAspect = {
  id: string;
  pointA: PlanetId;
  pointB: PlanetId;
  type: AspectType;
  exactAngle: number;
  orb: number;
  applying?: boolean;
  outOfSign?: boolean;
};
```

Only aspects between `PlanetId` members are eligible for pattern geometry.

## Orb Policy

Orb policy must be named and configurable. Every detected pattern records the policy used.

```ts
type OrbPolicy = {
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
};
```

Pattern geometry must store:

```ts
type PatternGeometry = {
  orbPolicyId: string;
  maximumOrb: number;
  averageOrb: number;
  weakestAspectOrb: number;
  isOutOfSign: boolean;
  confidence: "exact" | "strong" | "wide" | "partial";
  warnings: string[];
};
```

Partial patterns cannot silently become full patterns. Wide and out-of-sign configurations remain detectable only when policy allows them, and they must carry warnings.

## Pattern Roles

Use pattern-specific roles instead of one generic role bag.

```ts
type PatternRoles =
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
```

Mystic Rectangle has no apex.

## Derived Points

Derived points must be stored explicitly and typed by pattern function.

```ts
type DerivedPatternPoint = {
  type:
    | "empty_leg"
    | "fallout_point"
    | "open_sextile_midpoint"
    | "opposite_apex"
    | "pattern_midpoint";
  longitude: number;
  sign: string;
  house?: number;
};
```

For a T-square, calculate the empty leg opposite the apex.

For a Yod, distinguish the apex planet, sextile base, and fallout point. The fallout point is opposite the apex.

## Structural Relationships

Structural relationships describe permanent relationships between natal patterns. They do not include transit or progression activation.

```ts
type PatternRelationship = {
  parentPatternId: string;
  childPatternId: string;
  relationship:
    | "contains"
    | "shares_planet"
    | "shares_aspect"
    | "completes";
};
```

Examples:

- A Grand Square contains its component T-squares.
- A Kite contains or completes its underlying Grand Trine.
- Patterns sharing a planet receive a `shares_planet` relationship.
- Patterns sharing one or more source aspect IDs receive a `shares_aspect` relationship.

## Activation Model

Activation is date-specific and must not be stored as a structural relationship.

```ts
type PatternActivation = {
  patternId: string;
  movingBody: string;
  target: {
    type: "planet" | "derived_point";
    id: string;
    role?:
      | "apex"
      | "base"
      | "opposition_axis"
      | "focal_planet"
      | "empty_leg"
      | "fallout_point"
      | "shared_planet";
  };
  aspectType: string;
  orb: number;
  applying: boolean;
  exactAt?: string;
  linkedPatternIds: string[];
  score: number;
};
```

A transit or progression to a planet shared by several patterns may activate every pattern containing it.

## Scoring

Keep permanent natal strength separate from current activation.

```ts
type NatalPatternScore = {
  geometry: {
    orbAccuracy: number;
    completion: number;
    harmonicConsistency: number;
    confidence: number;
  };
  natalProminence: {
    luminaryWeight: number;
    personalPlanetWeight: number;
    angularityWeight: number;
    rulerWeight: number;
    repeatedPlanetWeight: number;
  };
  baseDisplayPriority: number;
};

type RankedPatternContext = {
  pattern: AspectPattern;
  natalScore: NatalPatternScore;
  activation?: PatternActivation;
  displayPriority: number;
};
```

Geometry determines whether a pattern exists and how cleanly it is formed. Natal prominence is a separate ranking layer. Current activation changes by date and must not alter the permanent natal score.

## Output Model

```ts
type AspectPattern = {
  id: string;
  type: AspectPatternType;
  planets: PlanetId[];
  sourceAspectIds: string[];
  roles: PatternRoles;
  derivedPoints: DerivedPatternPoint[];
  geometry: PatternGeometry;
};

type AspectPatternDetectionResult = {
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
};
```

IDs and planet ordering must be deterministic. Reversing input aspect order must produce identical IDs and output.

## Base Ranking

Ranking is a separate versioned layer. It must not mutate, reorder, delete, or suppress the canonical `patterns` array.

```ts
type PatternRankingPolicy = {
  id: string;
  version: string;
  weights: {
    geometryConfidence: number;
    tightness: number;
    luminary: number;
    personalPlanet: number;
    angularity: number;
    chartRuler: number;
    repeatedPlanet: number;
    parentPattern: number;
    containedPattern: number;
  };
};

type RankedAspectPattern = {
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
};

type RankedAspectPatternContext = {
  policyId: string;
  rankings: RankedAspectPattern[];
  displayOrder: string[];
};
```

Ranking may use only permanent natal facts:

- geometry confidence and orb tightness
- Sun and Moon involvement
- personal-planet involvement
- chart ruler or Ascendant ruler involvement when available
- member planet proximity to ASC, MC, DSC, or IC
- repeated planets across detected patterns
- parent and child structural relationships

Ranking must not use transits, progressions, current activation, interpretation copy, phrasebank routing, UI state, or admin state.

When birth time is unknown, angularity and Ascendant-ruler contributions are zero. Missing angles do not reduce geometric confidence and do not make a pattern incomplete.

## Detector Requirements

### Grand Square

- Detect four planets connected by four squares and two oppositions.
- Emit one `grand_square`.
- Retain all four component `t_square` patterns.
- Record structural containment from the Grand Square to each component T-square.
- Assign two opposition axes.
- Do not assign a single apex.

### T-square

- Detect one opposition with a third planet squaring both opposition planets.
- Assign the opposition axis.
- Assign the squaring planet as apex.
- Calculate the empty leg opposite the apex.

### Grand Trine

- Detect three planets mutually connected by trines.
- Assign element consistency.
- Preserve out-of-sign warnings when applicable.

### Kite

- Detect a Grand Trine plus a fourth planet opposing one trine planet and sextile to the other two.
- Retain the underlying Grand Trine.
- Assign focal planet, opposed trine planet, spine, and resource planets.

### Yod

- Detect two planets in sextile, both quincunx a third planet.
- Assign sextile base planets.
- Assign the quincunx target as apex.
- Calculate the fallout point opposite the apex.

### Mystic Rectangle

- Detect two opposition axes connected by supportive side aspects.
- The classical variant uses alternating trines and sextiles.
- Support `variant: "other_harmonic"` only when explicitly allowed by detector policy.
- Do not assign an apex.

## Test Requirements

Create synthetic fixtures for:

1. `grand_square`
2. `t_square`
3. `grand_trine`
4. `kite`
5. `yod`
6. `mystic_rectangle`

Also test:

1. Grand Square returns one Grand Square and four component T-squares.
2. Kite returns both the Kite and its Grand Trine.
3. Mystic Rectangle has two opposition axes and no apex.
4. Yod calculates its apex, sextile base, and fallout point.
5. Angles cannot complete any pattern.
6. The same pattern is not emitted multiple times because traversal started from different planets.
7. Reversing input aspect order produces identical IDs and output.
8. Wide and out-of-sign configurations receive warnings.
9. Invalid near-patterns do not pass as exact patterns.
10. Shared planets and shared aspects produce structural relationship records.

## Acceptance Criteria

The math-only implementation is complete when fixtures produce deterministic JSON containing:

- patterns
- pattern roles
- source aspect IDs
- derived points
- confidence metadata
- structural relationships
- diagnostics

No implementation may connect these detections to interpretation copy, phrasebanks, admin editing, reader cards, AI generation, or planetary chart-shape detection until fixture output has been reviewed.
