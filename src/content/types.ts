export type ReviewStatus = "DRAFT" | "REVIEW" | "APPROVED" | "SOURCE_BACKED" | "INVALID" | "INCOMPLETE";

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
  type: "natal-aspect" | "transit-to-natal" | "planet-pair" | "placement" | "primitive";
  sourceFactors: SourceFactors;
  knowledgeBasis?: Record<string, string[]>;
  interpretation: Interpretation;
  sources: string[];
  status: ReviewStatus;
};

export type VoiceContentItem = {
  id: string;
  voiceId: string;
  status: ReviewStatus;
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
