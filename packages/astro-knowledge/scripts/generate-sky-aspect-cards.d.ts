export type SkyAspectCardArgs = {
  a: string;
  b: string;
  aspect: string;
  signA: string;
  signB: string;
};

export type SkyAspectReviewPairSource = {
  id: string;
  planetA: string;
  planetB: string;
  status: "needs_review";
  sourceText: string;
  blend: string;
  harmonious: string;
  hard: string;
  provenance: {
    source: string;
    reviewState: "needs_review";
  };
};

export type SkyPlacementTopperArgs = {
  planet: string;
  sign: string;
  aspect: string;
  other: string;
  otherSign: string;
  orb: number;
  baseText: string;
};

export type SkyAspectCardLint = {
  score: number;
  fails: number;
  warns: number;
  registerDraw: number;
  findings: Array<Record<string, unknown>>;
  notes: string[];
};

export type AspectWarmthFoundationLine = {
  sourceArticleId: string;
  sourcePath: string;
  originalLine: string;
  suppliedLine: string;
  selectionReasons: string[];
};

export type AspectWarmthFlag = {
  id: "owner-corpus-warmth-none-found" | "missing-human-moment-beat";
  severity: "info" | "editorial";
  blocking: boolean;
  reason: string;
};

export type AspectWarmthHarvest = {
  schemaVersion: number;
  status: "ready" | "editorial_required";
  generationAllowed: boolean;
  surface: string;
  voice: "collective" | "second_person";
  harvest_mode: "matched" | "vocabulary_only" | "none_found" | null;
  humanMoment: string | null;
  searchTerms: string[];
  ownerFoundationLines: AspectWarmthFoundationLine[];
  flags: AspectWarmthFlag[];
  insertInstruction: string | null;
  placementInstruction: string | null;
};

export type SkyAspectCardResult = {
  status: "clean" | "needs-review" | "skipped";
  reason?: string;
  note?: string;
  text?: string;
  lint?: SkyAspectCardLint | null;
  attempts?: number;
  provider?: string;
  model?: string;
  temperature?: number | null;
  reasoningEffort?: "none" | "low" | "medium" | "high" | "xhigh" | "max" | null;
  repair?: {
    fired: boolean;
    result: "not-needed" | "unchanged" | "2→3" | "2→2" | "2→1" | "lint-failed" | "error";
    reason: string;
    originalScore: 1 | 2 | 3 | null;
    repairedScore: 1 | 2 | 3 | null;
    kept: "original" | "repaired";
    error?: string;
  };
  lintRetryAvoidTerms?: string[][];
  harvest_mode?: "matched" | "vocabulary_only" | "none_found" | null;
  warmthHarvest?: AspectWarmthHarvest;
  warmthSource?: {
    sourceArticleId: string;
    originalLine: string;
    usedForm: string;
  };
  evidenceClass?: "owner-corpus-derived";
  flags?: AspectWarmthFlag[];
  gate?: "auto-publish" | "human-review" | "regenerate";
  judge?: {
    score: 1 | 2 | 3;
    verdict: string;
    weakest: string;
    why: string;
    gate: "auto-publish" | "human-review" | "regenerate";
    recommendation: "approve" | "revise" | "regenerate" | "resolve-judge-disagreement" | "approved-exact-match";
    approvalSource: "llm-advisory" | "approved-exact-match";
    disagreement: boolean;
    audit: {
      schemaVersion: number;
      recordedAt: string;
      promptVersion: string;
      rubricVersion: string;
      promptSha256: string | null;
      rubricSha256: string;
      contentSha256: string;
      provider: string;
      model: string;
      releaseId: string | null;
      registryVersion: string | null;
      registryLaneId: string | null;
      registryState: "active" | "candidate" | null;
      registryOverride: boolean;
      evaluationSetVersion: string | null;
      policyVersion: string | null;
      reasoningEffort: "none" | "low" | "medium" | "high" | "xhigh" | "max" | null;
      temperature: number | null;
      samples: number;
      scores: number[];
      verdicts: Array<Record<string, unknown>>;
      disagreement: boolean;
      privacyMode: string;
      redactionCount: number;
      context: Record<string, unknown>;
    };
  };
  facts?: {
    a?: string;
    b?: string;
    aspect?: string;
    signA?: string;
    signB?: string;
    pairKey?: string;
    pairSource?: string;
    exactAspectSource?: string | null;
  };
};

export function generateCard(
  args: SkyAspectCardArgs,
  options?: {
    maxRetries?: number;
    withJudge?: boolean;
    judgeFeedback?: string;
    allowReviewSources?: boolean;
    generateFn?: (prompt: string, options?: { temperature?: number }) => Promise<string>;
    repairFn?: (text: string, reason: string) => Promise<string>;
    judgeFn?: (prompt: string) => Promise<string>;
  }
): Promise<SkyAspectCardResult>;

export function generatePlacementTopper(
  args: SkyPlacementTopperArgs,
  options?: {
    maxRetries?: number;
    withJudge?: boolean;
    judgeFeedback?: string;
    generateFn?: (prompt: string, options?: { temperature?: number }) => Promise<string>;
    repairFn?: (text: string, reason: string) => Promise<string>;
    judgeFn?: (prompt: string) => Promise<string>;
  }
): Promise<SkyAspectCardResult>;

export function normalizeCardArgs(
  args: SkyAspectCardArgs,
  options?: { allowReviewSources?: boolean }
): {
  a: string;
  b: string;
  aspect: string;
  signA: string;
  signB: string;
  pairKey: string;
  pairSource: string;
  exactAspectSource: string | null;
  reversed: boolean;
};

export function reviewPairSources(): Map<string, SkyAspectReviewPairSource>;

export function closeBank(
  n?: number,
  random?: () => number
): string[];

export function repairCard(
  text: string,
  reason: string,
  options?: {
    generateFn?: (prompt: string, options?: { temperature?: number }) => Promise<string>;
    warmthHarvest?: AspectWarmthHarvest | null;
  }
): Promise<string>;

export function aspectWarmthHarvest(
  normalized: ReturnType<typeof normalizeCardArgs>,
  format?: string
): AspectWarmthHarvest;

export function repairPlacementTopper(
  text: string,
  reason: string,
  options?: {
    generateFn?: (prompt: string, options?: { temperature?: number }) => Promise<string>;
  }
): Promise<string>;

declare const generator: {
  aspectWarmthHarvest: typeof aspectWarmthHarvest;
  closeBank: typeof closeBank;
  generateCard: typeof generateCard;
  generatePlacementTopper: typeof generatePlacementTopper;
  normalizeCardArgs: typeof normalizeCardArgs;
  repairCard: typeof repairCard;
  repairPlacementTopper: typeof repairPlacementTopper;
  reviewPairSources: typeof reviewPairSources;
};

export default generator;
