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
  trimClose?: {
    calls: number;
    fired: number;
    unchanged: number;
    rejected: number;
    errors: number;
  };
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
    trimCloseFn?: (text: string) => Promise<
      string
      | {
        text: string;
        fired?: boolean;
        rejected?: boolean;
        deleted?: string | null;
      }
    >;
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

export function trimClose(
  text: string,
  options?: {
    generateFn?: (prompt: string, options?: { temperature?: number }) => Promise<string>;
  }
): Promise<{
  text: string;
  fired: boolean;
  rejected: boolean;
  deleted: string | null;
}>;

declare const generator: {
  generateCard: typeof generateCard;
  normalizeCardArgs: typeof normalizeCardArgs;
  trimClose: typeof trimClose;
};

export default generator;
