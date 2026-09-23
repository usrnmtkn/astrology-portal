import { GENERATED_REPORT_JUDGE_CATEGORIES, GENERATED_REPORT_JUDGE_BLOCKING_FINDINGS,
  GENERATED_REPORT_JUDGE_FINDING_CATEGORIES, generatedReportJudgeOverall, generatedReportJudgeVerdict,
  type GeneratedReportJudgeScores, type GeneratedReportJudgeFinding } from "./transit-reading-judge-rules.js";
import { findingScoreCategory } from "./transit-reading-judge-evidence.js";
import { EVIDENCE_DELIVERY_POLICY, isReportDeliveryBlocker } from "./transit-reading-delivery-evidence.js";
import { SOURCE_COMPLETION_POLICY } from "./transit-reading-source-completion.js";

// A policy experiment, not an amendment to the approved owner rubric. Off by default.
export const MATERIAL_REVIEW_POLICY = "report-materiality-candidate-v1";
export type ReportReleasePolicy = "strict" | typeof MATERIAL_REVIEW_POLICY | typeof EVIDENCE_DELIVERY_POLICY | typeof SOURCE_COMPLETION_POLICY;
export function transitReadingReleasePolicy(): ReportReleasePolicy {
  const value = process.env.GENERATED_REPORT_RELEASE_POLICY ?? "strict";
  if (!["strict", MATERIAL_REVIEW_POLICY, EVIDENCE_DELIVERY_POLICY, SOURCE_COMPLETION_POLICY].includes(value)) throw new Error("Unknown report release policy.");
  if (value !== "strict" && process.env.GENERATED_REPORT_REVIEW_MODE === "scoped") {
    throw new Error("The materiality candidate is limited to the combined reviewer; scoped review remains a separate experiment.");
  }
  return value as ReportReleasePolicy;
}

export type ReportReleaseDecision = {
  policy: ReportReleasePolicy;
  action: "accept" | "correct" | "review_required";
  strictVerdict: "pass" | "below_threshold";
  overall: number;
  scores: Record<string, number>;
  blockingFindings: GeneratedReportJudgeFinding[];
  advisoryFindings: GeneratedReportJudgeFinding[];
  reason: string;
};

/** Consume evidence-validated findings; never let the model choose the release action. */
export function decideTransitReadingRelease(input: {
  scores: Record<string, number>; findings: GeneratedReportJudgeFinding[]; threshold: number;
  deliveryPolicy?: string;
}, policy: ReportReleasePolicy): ReportReleaseDecision {
  const scores = input.scores as GeneratedReportJudgeScores;
  const validScores = Object.keys(scores).length === GENERATED_REPORT_JUDGE_CATEGORIES.length
    && GENERATED_REPORT_JUDGE_CATEGORIES.every(key => Number.isInteger(scores[key]) && scores[key] >= 0 && scores[key] <= 4);
  const validFindings = input.findings.every(f => GENERATED_REPORT_JUDGE_FINDING_CATEGORIES.includes(f.category));
  const overall = validScores ? generatedReportJudgeOverall(scores) : 0;
  const strictVerdict = validScores && validFindings ? generatedReportJudgeVerdict(scores, input.threshold, input.findings) : "below_threshold";
  const decision: ReportReleaseDecision = { policy, action: "review_required", strictVerdict, overall,
    scores: { ...scores }, blockingFindings: [], advisoryFindings: [], reason: "invalid_review" };
  if (!validScores || !validFindings || !Number.isFinite(input.threshold)) return decision;
  if (policy === EVIDENCE_DELIVERY_POLICY) {
    if (input.deliveryPolicy !== policy || input.findings.some(f => !Object.hasOwn(f, "delivery"))) return decision;
    const blockingFindings = input.findings.filter(isReportDeliveryBlocker);
    return { ...decision, blockingFindings, advisoryFindings: input.findings.filter(f => !isReportDeliveryBlocker(f)),
      action: blockingFindings.length ? "correct" : "accept",
      reason: blockingFindings.length ? "evidenced_delivery_defect" : "no_evidenced_delivery_defect" };
  }
  if (input.threshold < 0.85 || input.threshold > 1) return decision;
  if (policy === "strict" || policy === SOURCE_COMPLETION_POLICY) return { ...decision, action: strictVerdict === "pass" ? "accept" : "correct",
    blockingFindings: input.findings, reason: "approved_strict_contract" };
  if (policy !== MATERIAL_REVIEW_POLICY) return decision;
  const factual = (key: string) => key === "astrology_chronology" || key === "factual_traceability";
  // Explicit unsupported claims, timing, repetition and owner-rule violations never become advisory.
  const blocking = (f: GeneratedReportJudgeFinding) => factual(f.category)
    || GENERATED_REPORT_JUDGE_BLOCKING_FINDINGS.some(key => key === f.category)
    || scores[findingScoreCategory(f.category)] <= 2;
  decision.blockingFindings = input.findings.filter(blocking);
  decision.advisoryFindings = input.findings.filter(f => !blocking(f));
  if (input.findings.some(f => scores[findingScoreCategory(f.category)] === 4)
    || GENERATED_REPORT_JUDGE_CATEGORIES.some(key => scores[key] < (factual(key) ? 4 : 3)
      && !input.findings.some(f => findingScoreCategory(f.category) === key))) return decision;
  if (decision.blockingFindings.length) return { ...decision, action: "correct", reason: "material_or_factual_defect" };
  // Low aggregate quality without a material diagnosis is an evaluator disagreement, not rewrite instructions.
  if (overall < input.threshold) return { ...decision, reason: "aggregate_without_material_diagnosis" };
  return { ...decision, action: "accept", reason: decision.advisoryFindings.length ? "minor_findings_advisory" : "no_blocking_findings" };
}
