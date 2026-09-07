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
export type GeneratedReportJudgeScores = Record<GeneratedReportJudgeCategory, number>;
export type GeneratedReportJudgeFinding = {
  category: GeneratedReportJudgeCategory;
  location: string;
  finding: string;
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

export function generatedReportJudgeVerdict(scores: GeneratedReportJudgeScores, threshold: number) {
  const hardGatesPass = GENERATED_REPORT_JUDGE_HARD_GATES.every((category) => scores[category] >= 3);
  const releaseFloorsPass = scores.owner_voice >= 4 && scores.natural_language >= 4;
  return generatedReportJudgeOverall(scores) >= threshold && hardGatesPass && releaseFloorsPass
    ? "pass" as const
    : "below_threshold" as const;
}
