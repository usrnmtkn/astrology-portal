export const GENERATED_REPORT_JUDGE_CATEGORIES = [
  "astrology_chronology",
  "factual_traceability",
  "lived_experience",
  "interpretive_movement",
  "owner_voice",
  "natural_language",
  "syntax_variety",
  "emotional_temperature",
  "density"
] as const;

export const GENERATED_REPORT_JUDGE_HARD_GATES = [
  "astrology_chronology",
  "factual_traceability",
  "lived_experience",
  "interpretive_movement",
  "owner_voice"
] as const;

export type GeneratedReportJudgeCategory = typeof GENERATED_REPORT_JUDGE_CATEGORIES[number];
export const GENERATED_REPORT_JUDGE_BLOCKING_FINDINGS = [
  "over_specification", "narrative_repetition", "unsupported_interpretation", "unsupported_timing", "owner_language"
] as const;
export const GENERATED_REPORT_JUDGE_FINDING_CATEGORIES = [...GENERATED_REPORT_JUDGE_CATEGORIES, ...GENERATED_REPORT_JUDGE_BLOCKING_FINDINGS] as const;
export type GeneratedReportJudgeScores = Record<GeneratedReportJudgeCategory, number>;
export type GeneratedReportJudgeFinding = {
  category: typeof GENERATED_REPORT_JUDGE_FINDING_CATEGORIES[number];
  location: string;
  finding: string;
  // Older checkpoints may predate the evidence protocol. New judge responses
  // require the evidence fields; optional here permits diagnostic history reads.
  draftQuote?: string;
  sourcePath?: string | null;
  sourceQuote?: string | null;
  ownerComparisons?: Array<{ evidenceId: string; quote: string; difference: string }>;
};
export type GeneratedReportJudgeResult = {
  scores: GeneratedReportJudgeScores;
  overall: number;
  verdict: "pass" | "below_threshold";
  findings: GeneratedReportJudgeFinding[];
};

export function generatedReportJudgeOverall(scores: GeneratedReportJudgeScores) {
  return GENERATED_REPORT_JUDGE_CATEGORIES.reduce((sum, category) => sum + scores[category], 0)
    / (4 * GENERATED_REPORT_JUDGE_CATEGORIES.length);
}

export function generatedReportJudgeVerdict(scores: GeneratedReportJudgeScores, threshold: number, findings: GeneratedReportJudgeFinding[] = []) {
  if (findings.some((finding) => GENERATED_REPORT_JUDGE_BLOCKING_FINDINGS.some((category) => category === finding.category))) return "below_threshold" as const;
  const hardGatesPass = GENERATED_REPORT_JUDGE_HARD_GATES.every((category) => scores[category] >= 3);
  const releaseFloorsPass = scores.owner_voice >= 4 && scores.natural_language >= 4;
  return generatedReportJudgeOverall(scores) >= threshold && hardGatesPass && releaseFloorsPass
    ? "pass" as const
    : "below_threshold" as const;
}
