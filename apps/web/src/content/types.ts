export type ReviewStatus = "DRAFT" | "REVIEW" | "APPROVED" | "SOURCE_BACKED" | "INVALID" | "INCOMPLETE" | "LIVE";

export type ContentSurface =
  | "chart_profile"
  | "natal_insights"
  | "core_traits"
  | "love_patterns"
  | "career_patterns"
  | "emotional_needs"
  | "shadow_work"
  | "growth"
  | "daily_forecast"
  | "behind_forecast"
  | "areas_of_life"
  | "transit_detail"
  | "synastry"
  | "admin_review";

export type ContentArea =
  | "identity"
  | "love"
  | "career"
  | "money"
  | "communication"
  | "emotions"
  | "home"
  | "family"
  | "health"
  | "creativity"
  | "friendship"
  | "power"
  | "growth"
  | "spirituality"
  | "relationships"
  | "daily-life";

export type SourceFactors = {
  planetA?: string;
  aspect?: string;
  planetB?: string;
  sign?: string;
  house?: string;
};

export type Interpretation = {
  coreTheme: string;
  displaySummary?: string;
  detailParagraphs?: string[];
  livedExperience: string;
  gift: string;
  challenge: string;
};

export type KnowledgeItem = {
  id: string;
  type: "natal-aspect" | "current-sky-aspect" | "transit-to-natal" | "planet-pair" | "placement" | "synastry-aspect" | "synastry-overlay" | "composite" | "primitive";
  sourceFactors: SourceFactors;
  surfaceTags?: ContentSurface[];
  contentAreas?: ContentArea[];
  collectionHints?: string[];
  priority?: number;
  intensity?: number;
  knowledgeBasis?: Record<string, string[]>;
  interpretation: Interpretation;
  sources: string[];
  status: ReviewStatus;
};

export type VoiceContentItem = {
  id: string;
  voiceId: string;
  status: ReviewStatus;
  surface?: ContentSurface;
  summary: string;
  body: string;
  sourceId: string;
};

export type ContentBundle = {
  id: string;
  knowledge: KnowledgeItem | null;
  voice: VoiceContentItem | null;
  status: "READY" | "MISSING_VOICE" | "MISSING_KNOWLEDGE" | "INCOMPLETE";
};

export type SurfaceRule = {
  surface: ContentSurface;
  label: string;
  eligibleTypes: KnowledgeItem["type"][];
  preferredAreas: ContentArea[];
  preferredPlanets: string[];
  preferredHouses: string[];
  preferredAspects: string[];
  requiresVoice: boolean;
  userFacing: boolean;
  defaultLimit: number;
};

export type SurfaceSelectionOptions = {
  voiceId?: string;
  includeReviewContent?: boolean;
  limit?: number;
};

export type SurfaceContentResult = {
  surface: ContentSurface;
  rule: SurfaceRule;
  bundles: ContentBundle[];
};
