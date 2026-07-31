export type SkyAspectCardArgs = {
  a: string;
  b: string;
  aspect: string;
  signA: string;
  signB: string;
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
  };
};

export function generateCard(
  args: SkyAspectCardArgs,
  options?: {
    maxRetries?: number;
    withJudge?: boolean;
    judgeFeedback?: string;
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

export function normalizeCardArgs(args: SkyAspectCardArgs): {
  a: string;
  b: string;
  aspect: string;
  signA: string;
  signB: string;
  pairKey: string;
  pairSource: string;
  reversed: boolean;
};

export function closeBank(
  n?: number,
  random?: () => number
): string[];

export function repairCard(
  text: string,
  reason: string,
  options?: {
    generateFn?: (prompt: string, options?: { temperature?: number }) => Promise<string>;
  }
): Promise<string>;

export function repairPlacementTopper(
  text: string,
  reason: string,
  options?: {
    generateFn?: (prompt: string, options?: { temperature?: number }) => Promise<string>;
  }
): Promise<string>;

declare const generator: {
  closeBank: typeof closeBank;
  generateCard: typeof generateCard;
  generatePlacementTopper: typeof generatePlacementTopper;
  normalizeCardArgs: typeof normalizeCardArgs;
  repairCard: typeof repairCard;
  repairPlacementTopper: typeof repairPlacementTopper;
};

export default generator;
