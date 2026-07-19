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
  ranking?: RankedAspectPatternContext;
  interpretationContexts?: AspectPatternInterpretationContext[];
  resolvedCopy?: ResolvedAspectPatternCopy[];
  activation?: AspectPatternActivationResult;
}

export interface PatternRankingPolicy {
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
}

export type PatternRankingReasonCode =
  | "tight_geometry"
  | "contains_sun"
  | "contains_moon"
  | "contains_personal_planet"
  | "contains_chart_ruler"
  | "planet_near_angle"
  | "repeated_planet"
  | "parent_pattern"
  | "contained_pattern"
  | string;

export interface RankedAspectPattern {
  patternId: string;
  score: {
    geometry: number;
    natalProminence: number;
    structuralContext: number;
    baseDisplayPriority: number;
  };
  reasons: Array<{
    code: PatternRankingReasonCode;
    planet?: string;
    value: number;
  }>;
}

export interface RankedAspectPatternContext {
  policyId: string;
  rankings: RankedAspectPattern[];
  displayOrder: string[];
}

export type PatternActivationReasonCode =
  | "exact_or_tight"
  | "applying"
  | "targets_apex"
  | "targets_focal_planet"
  | "targets_luminary"
  | "targets_repeated_planet"
  | "activates_parent_pattern"
  | "activates_contained_pattern";

export interface TransitToNatalActivationAspect {
  id?: string;
  sourceAspectId?: string;
  movingBody?: string;
  transitPlanet?: string;
  transitingPlanet?: string;
  targetNatalPlanet?: string;
  natalPoint?: string;
  natalPlanet?: string;
  aspectType?: string;
  type?: string;
  aspect?: string;
  orb?: number | string;
  orbValue?: number;
  orbDegrees?: number;
  applying?: boolean;
  direction?: "applying" | "separating" | string;
  exactAt?: string;
  exact_at?: string;
  bodyA?: string;
  bodyB?: string;
  from?: string;
  to?: string;
  conditions?: {
    applying?: boolean;
  };
}

export interface PatternActivationPolicy {
  id: string;
  version: string;
  weights: {
    aspects: Record<string, number>;
    maximumOrb: number;
    applying: number;
    luminary: number;
    repeatedPlanet: number;
    parentPattern: number;
    containedPattern: number;
    roles: Record<string, number>;
  };
}

export interface PatternActivation {
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
    code: PatternActivationReasonCode;
    value: number;
  }>;
}

export interface ActivatedPatternRanking {
  patternId: string;
  natalBasePriority: number;
  activationScore: number;
  currentDisplayPriority: number;
}

export interface AspectPatternActivationResult {
  version: string;
  policyId: string;
  calculatedFor: string;
  activations: PatternActivation[];
  currentRankings: ActivatedPatternRanking[];
  currentDisplayOrder: string[];
  interpretationContexts?: AspectPatternActivationInterpretationContext[];
}

export type ActivationPrimaryTriggerSelectionReason =
  | "highest_activation_score"
  | "tightest_orb"
  | "applying_over_separating"
  | "deterministic_tiebreak";

export type ActivationTimingState = "exact" | "applying" | "separating" | "mixed";

export type ActivationCopyJob =
  | "describe_current_emphasis"
  | "name_transit_trigger"
  | "explain_target_planet_role"
  | "explain_shared_planet_fanout"
  | "preserve_parent_child_structure"
  | "describe_timing_state";

export type ActivationAvoidClaim =
  | "do_not_predict_event"
  | "do_not_change_natal_geometry"
  | "do_not_treat_activation_as_permanent"
  | "do_not_claim_every_linked_pattern_is_equally_noticeable"
  | "do_not_treat_score_as_life_importance";

export interface AspectPatternActivationInterpretationContext {
  version: string;
  patternId: string;
  patternType: AspectPatternType;
  natalInterpretationContextId: string;
  calculatedFor: string;
  display: {
    natalRank: number;
    currentRank: number;
    isCurrentlyPrimary: boolean;
    parentPatternIds: string[];
    childPatternIds: string[];
  };
  natalPattern?: {
    confidence: "exact" | "strong" | "wide" | "partial";
  };
  triggers: Array<{
    activationId: string;
    sourceAspectId?: string;
    movingBody: string;
    targetNatalPlanet: string;
    targetRoles: string[];
    aspectType: string;
    orb: number;
    applying: boolean;
    exactAt?: string;
    score: number;
    reasons: Array<{
      code: PatternActivationReasonCode;
      value: number;
    }>;
  }>;
  primaryTrigger: {
    activationId: string;
    selectionReason: ActivationPrimaryTriggerSelectionReason;
  };
  activationSummary: {
    triggerCount: number;
    movingBodies: string[];
    targetedNatalPlanets: string[];
    targetedRoles: string[];
    linkedPatternIds: string[];
    timingState: ActivationTimingState;
    sharedPlanetFanout: boolean;
  };
  ranking: {
    natalBasePriority: number;
    activationScore: number;
    currentDisplayPriority: number;
  };
  copyInstructions: {
    jobs: ActivationCopyJob[];
    avoidClaims: ActivationAvoidClaim[];
    allowedCertainty: "qualified";
  };
  provenance: {
    detectorVersion: string;
    rankingPolicyId: string;
    activationPolicyId: string;
    natalContextBuilderVersion: string;
    activationContextBuilderVersion: string;
  };
}

export type AspectPatternActivationContentLevel =
  | "authored"
  | "source_grounded_template"
  | "madlib_fallback"
  | "emergency_fallback";

export interface ActivationCopyCondition {
  slot: keyof AspectPatternActivationCopySlots | string;
  exists?: boolean;
  equals?: string | number | boolean;
}

export interface AspectPatternActivationCopySlots {
  pattern_name: string;
  primary_moving_body: string;
  primary_target_planet: string;
  primary_aspect_name: string;
  primary_aspect_with_article: string;
  primary_target_role?: string;
  primary_orb: string;
  trigger_count: number;
  additional_moving_bodies?: string;
  targeted_planets: string;
  timing_state: ActivationTimingState;
  exact_at?: string;
  shared_planet_fanout: boolean;
  linked_pattern_names?: string;
  parent_pattern_name?: string;
  child_pattern_names?: string;
  pattern_confidence: "exact" | "strong" | "wide" | "partial";
  is_currently_primary: boolean;
}

export interface AspectPatternActivationCopyRecord {
  id: string;
  version: string;
  patternType: AspectPatternType;
  contentLevel: AspectPatternActivationContentLevel;
  status: "draft" | "reviewed" | "approved" | "deprecated";
  eligibility: {
    timingStates?: ActivationTimingState[];
    patternConfidence?: Array<"exact" | "strong" | "wide" | "partial">;
    triggerCount?: { min?: number; max?: number };
    requiresSharedPlanetFanout?: boolean;
    allowedTargetRoles?: string[];
  };
  content: {
    eyebrow?: string;
    headline: string;
    overview: string;
    sections: Array<{
      id:
        | "current_emphasis"
        | "transit_trigger"
        | "pattern_role"
        | "linked_patterns"
        | "timing"
        | "watch_for"
        | "confidence_note";
      template: string;
      required: boolean;
      conditions?: ActivationCopyCondition[];
    }>;
  };
  languageRules: {
    certainty: "qualified";
    prohibitedClaims: string[];
    prohibitedTerms?: string[];
  };
  provenance: {
    sourceIds: string[];
    editorialStatus: "source_grounded" | "editorial_synthesis";
    reviewedBy?: string;
    reviewedAt?: string;
  };
}

export interface ResolvedAspectPatternActivationCopy {
  patternId: string;
  patternType: AspectPatternType;
  calculatedFor: string;
  source: {
    recordId: string;
    contentLevel: AspectPatternActivationContentLevel;
    status: string;
    resolverVersion: string;
  };
  triggerSummary: {
    primaryActivationId: string;
    triggerCount: number;
    movingBodies: string[];
    targetedNatalPlanets: string[];
    timingState: ActivationTimingState;
  };
  content: {
    eyebrow?: string;
    headline: string;
    overview: string;
    sections: Array<{ id: string; body: string }>;
  };
  diagnostics: {
    templateId: string;
    usedFallback: boolean;
    missingSlots: string[];
    skippedSections: string[];
    validationWarnings: string[];
    attemptedRecordIds?: string[];
  };
}

export type AspectPatternMemberRole =
  | "apex"
  | "base"
  | "opposition_axis"
  | "focal_planet"
  | "resource_planet"
  | "spine";

export interface AspectPatternInterpretationContext {
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
  members: Array<{
    planet: string;
    sign: string;
    house?: number;
    longitude: number;
    roles: AspectPatternMemberRole[];
    isLuminary: boolean;
    isPersonalPlanet: boolean;
    isChartRuler?: boolean;
    angularProximity?: {
      angle: "asc" | "mc" | "dsc" | "ic";
      orb: number;
    };
  }>;
  geometry: {
    confidence: "exact" | "strong" | "wide" | "partial";
    maximumOrb: number;
    averageOrb: number;
    warnings: string[];
    sourceAspectIds: string[];
  };
  roles: PatternRoles;
  derivedPoints: Array<{
    type: "empty_leg" | "fallout_point" | "opposite_apex" | "pattern_midpoint";
    longitude: number;
    sign: string;
    house?: number;
  }>;
  ranking: {
    geometry: number;
    natalProminence: number;
    structuralContext: number;
    baseDisplayPriority: number;
    reasons: RankedAspectPattern["reasons"];
  };
  copyInstructions: {
    primaryJob: string;
    supportingJobs: string[];
    avoidClaims: string[];
    allowedCertainty: "direct" | "qualified";
  };
  provenance: {
    detectorVersion: string;
    orbPolicyId: string;
    rankingPolicyId: string;
    contextBuilderVersion: string;
  };
}

export interface PatternCopyJob {
  primaryJob: string;
  supportingJobs: readonly string[];
  avoidClaims: readonly string[];
}

export type AspectPatternContentLevel =
  | "authored"
  | "source_grounded_template"
  | "madlib_fallback"
  | "emergency_fallback";

export interface AspectPatternCopySlots {
  pattern_name: string;
  member_planets: string;
  member_count: number;
  apex_planet?: string;
  base_planets?: string;
  opposition_axis_one?: string;
  opposition_axis_two?: string;
  focal_planet?: string;
  opposed_trine_planet?: string;
  resource_planets?: string;
  empty_leg_sign?: string;
  empty_leg_house?: string;
  fallout_sign?: string;
  fallout_house?: string;
  element_consistency?: string;
  rectangle_variant?: string;
  confidence: string;
  maximum_orb: string;
  is_primary: boolean;
  parent_pattern_name?: string;
  child_pattern_names?: string;
}

export interface CopyCondition {
  slot: keyof AspectPatternCopySlots | string;
  exists?: boolean;
  equals?: string | number | boolean;
}

export interface AspectPatternCopyRecord {
  id: string;
  version: string;
  patternType: AspectPatternType;
  contentLevel: AspectPatternContentLevel;
  status: "draft" | "reviewed" | "approved" | "deprecated";
  eligibility: {
    confidence?: Array<"exact" | "strong" | "wide" | "partial">;
    requiresHouses?: boolean;
    requiresAngles?: boolean;
    allowedVariants?: string[];
  };
  templates: {
    eyebrow?: string;
    headline: string;
    overview: string;
    sections: Array<{
      id:
        | "how_it_works"
        | "planet_roles"
        | "pressure_or_support"
        | "derived_point"
        | "watch_for"
        | "confidence_note";
      template: string;
      required: boolean;
      conditions?: CopyCondition[];
    }>;
  };
  languageRules: {
    allowedCertainty: "direct" | "qualified";
    prohibitedClaims: string[];
    prohibitedTerms?: string[];
  };
  provenance: {
    sourceIds: string[];
    reviewedBy?: string;
    reviewedAt?: string;
  };
}

export interface AuthoredAspectPatternRecord {
  id: string;
  version: string;
  patternType: AspectPatternType;
  status: "draft" | "reviewed" | "approved" | "deprecated";
  eligibility: {
    confidence: Array<"exact" | "strong" | "wide" | "partial">;
    houseMode: "any" | "with_houses" | "without_houses";
    variants?: string[];
  };
  content: {
    eyebrow?: string;
    headline: string;
    overview: string;
    sections: Array<{
      id:
        | "how_it_works"
        | "planet_roles"
        | "pressure_or_support"
        | "derived_point"
        | "watch_for"
        | "confidence_note";
      template: string;
      required: boolean;
      conditions?: CopyCondition[];
    }>;
  };
  languageRules: {
    certainty: "direct" | "qualified";
    prohibitedClaims: string[];
    prohibitedTerms?: string[];
  };
  provenance: {
    sourceIds: string[];
    editorialStatus: "source_grounded" | "editorial_synthesis";
    reviewedBy?: string;
    reviewedAt?: string;
  };
}

export interface ResolvedAspectPatternCopy {
  patternId: string;
  patternType: AspectPatternType;
  source: {
    recordId: string;
    contentLevel: AspectPatternContentLevel;
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
}

export interface AspectPatternRankingInput {
  planets?: NormalizedPlanet[];
  ascendantSign?: string;
  ascendant?: string;
  chartRuler?: string;
  ascendantRuler?: string;
  ascendantLongitude?: number;
  descendantLongitude?: number;
  midheavenLongitude?: number;
  imumCoeliLongitude?: number;
  icLongitude?: number;
  ranking?: RankedAspectPatternContext;
}

export const ASPECT_PATTERN_DETECTOR_VERSION: string;
export const ASPECT_PATTERN_CONTEXT_BUILDER_VERSION: string;
export const ASPECT_PATTERN_COPY_RESOLVER_VERSION: string;
export const ASPECT_PATTERN_ACTIVATION_VERSION: string;
export const ASPECT_PATTERN_ACTIVATION_CONTEXT_BUILDER_VERSION: string;
export const ASPECT_PATTERN_ACTIVATION_COPY_RESOLVER_VERSION: string;
export const ASPECT_PATTERN_ACTIVATION_CONTENT_LEVELS: readonly AspectPatternActivationContentLevel[];
export const ASPECT_PATTERN_CONTENT_LEVELS: readonly AspectPatternContentLevel[];
export const APPROVED_ACTIVATION_COPY_SLOTS: readonly string[];
export const APPROVED_COPY_SLOTS: readonly string[];
export const AUTHORED_ASPECT_PATTERN_ACTIVATION_RECORDS: readonly AspectPatternActivationCopyRecord[];
export const AUTHORED_ASPECT_PATTERN_RECORDS: readonly AuthoredAspectPatternRecord[];
export const DEFAULT_ACTIVATION_POLICY: PatternActivationPolicy;
export const DEFAULT_ORB_POLICY: OrbPolicy;
export const DEFAULT_RANKING_POLICY: PatternRankingPolicy;
export const GOVERNED_COPY_RECORDS: readonly AspectPatternCopyRecord[];
export const GOVERNED_ACTIVATION_COPY_RECORDS: readonly AspectPatternActivationCopyRecord[];
export const PATTERN_COPY_JOBS: Readonly<Record<AspectPatternType, PatternCopyJob>>;
export const PLANET_IDS: readonly PlanetId[];
export const SUPPORTED_ASPECTS: readonly AspectType[];

export function normalizeOrbPolicy(policy?: Partial<OrbPolicy>): OrbPolicy;
export function normalizeActivationPolicy(policy?: Partial<PatternActivationPolicy>): PatternActivationPolicy;
export function normalizeRankingPolicy(policy?: Partial<PatternRankingPolicy>): PatternRankingPolicy;
export function detectPatterns(
  input: {
    planets: NormalizedPlanet[];
    aspects: Array<NormalizedAspect | Record<string, unknown>>;
  },
  policy?: Partial<OrbPolicy>
): AspectPatternDetectionResult;
export function rankAspectPatterns(
  detectionResult: AspectPatternDetectionResult,
  context?: AspectPatternRankingInput,
  policy?: Partial<PatternRankingPolicy>
): RankedAspectPatternContext;
export function buildAspectPatternInterpretationContexts(
  detectionResult: AspectPatternDetectionResult,
  context?: AspectPatternRankingInput
): AspectPatternInterpretationContext[];
export function buildAspectPatternActivationInterpretationContexts(
  detectionResult: AspectPatternDetectionResult,
  options?: {
    activation?: AspectPatternActivationResult;
    natalContexts?: AspectPatternInterpretationContext[];
  }
): AspectPatternActivationInterpretationContext[];
export function buildPatternActivations(
  detectionResult: AspectPatternDetectionResult,
  transitAspects?: TransitToNatalActivationAspect[],
  options?: {
    calculatedFor?: string;
    policy?: Partial<PatternActivationPolicy>;
  }
): AspectPatternActivationResult;
export function resolveAspectPatternCopy(
  context: AspectPatternInterpretationContext,
  options?: { records?: Array<AspectPatternCopyRecord | AuthoredAspectPatternRecord>; authoredRecords?: AuthoredAspectPatternRecord[] }
): ResolvedAspectPatternCopy;
export function resolveAspectPatternCopies(
  contexts: AspectPatternInterpretationContext[],
  options?: { records?: Array<AspectPatternCopyRecord | AuthoredAspectPatternRecord>; authoredRecords?: AuthoredAspectPatternRecord[] }
): ResolvedAspectPatternCopy[];
export function resolveAspectPatternActivationCopy(
  context: AspectPatternActivationInterpretationContext,
  options?: { records?: AspectPatternActivationCopyRecord[]; authoredRecords?: AspectPatternActivationCopyRecord[] }
): ResolvedAspectPatternActivationCopy;
export function resolveAspectPatternActivationCopies(
  contexts: AspectPatternActivationInterpretationContext[],
  options?: { records?: AspectPatternActivationCopyRecord[]; authoredRecords?: AspectPatternActivationCopyRecord[] }
): ResolvedAspectPatternActivationCopy[];
export function validateAspectPatternActivationCopyRecord(
  record: AspectPatternActivationCopyRecord,
  context: AspectPatternActivationInterpretationContext,
  slots?: Partial<AspectPatternActivationCopySlots>
): {
  ok: boolean;
  errors: string[];
  warnings: string[];
  missingSlots: string[];
  unknownSlots: string[];
};
export function validateAuthoredAspectPatternRecord(
  record: AuthoredAspectPatternRecord,
  context: AspectPatternInterpretationContext,
  slots?: Partial<AspectPatternCopySlots>
): {
  ok: boolean;
  errors: string[];
  warnings: string[];
  missingSlots: string[];
  unknownSlots: string[];
};
export function validateAspectPatternCopyRecord(
  record: AspectPatternCopyRecord | AuthoredAspectPatternRecord,
  context: AspectPatternInterpretationContext,
  slots?: Partial<AspectPatternCopySlots>
): {
  ok: boolean;
  errors: string[];
  warnings: string[];
  missingSlots: string[];
  unknownSlots: string[];
};
