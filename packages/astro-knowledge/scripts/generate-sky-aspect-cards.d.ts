export type SkyAspectCardArgs = {
  a: string;
  b: string;
  aspect: string;
  signA: string;
  signB: string;
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
  gate?: "auto-publish" | "human-review" | "regenerate";
  judge?: {
    score: 1 | 2 | 3;
    verdict: string;
    weakest: string;
    why: string;
    gate: "auto-publish" | "human-review" | "regenerate";
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
    generateFn?: (prompt: string) => Promise<string>;
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

declare const generator: {
  generateCard: typeof generateCard;
  normalizeCardArgs: typeof normalizeCardArgs;
};

export default generator;
