import fs from "node:fs";
import type { ReportDraft, ReportGenerationPayload } from "./report-generation.ts";
import { reportDraftMovementApplicable, reportEvaluationPacket } from "./report-evaluation-packet.js";
import { callProductionReportModel, judgeModelTarget, type ReportModelCall, type ReportModelUsage } from "./report-model-client.js";
import { prepareReportProductionKernel, reportProductionValidation } from "./report-production-gate.js";
import { loadActiveReportJudgePrompt, loadLegacyReportJudgePrompt, type ReportPromptMode } from "./report-prompt-versions.js";

export const REPORT_JUDGE_CATEGORIES = [
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
export const REPORT_JUDGE_HARD_GATE_CATEGORIES = [
  "astrology_chronology",
  "factual_traceability",
  "lived_experience",
  "interpretive_movement",
  "owner_voice"
] as const satisfies readonly ReportJudgeCategory[];
export const REPORT_JUDGE_RELEASE_QUALITY_FLOORS = {
  owner_voice: 4,
  natural_language: 4
} as const satisfies Partial<Record<ReportJudgeCategory, number>>;
export type ReportJudgeCategory = typeof REPORT_JUDGE_CATEGORIES[number];
export type ReportJudgeScores = Record<ReportJudgeCategory, number | null>;
export type ReportJudgeResult = {
  scores: ReportJudgeScores;
  applicability: { interpretive_movement: "applicable" | "not_applicable"; reason: string };
  overall: number;
  verdict: "pass" | "below_threshold";
  findings: Array<{ category: ReportJudgeCategory; location: string; finding: string; evidence_ids: string[] }>;
};

export const REPORT_JUDGE_SCHEMA = {
  type: "object", additionalProperties: false, required: ["scores", "applicability", "overall", "verdict", "findings"],
  properties: {
    scores: {
      type: "object", additionalProperties: false, required: [...REPORT_JUDGE_CATEGORIES],
      properties: Object.fromEntries(REPORT_JUDGE_CATEGORIES.map((category) => [category, category === "interpretive_movement"
        ? { anyOf: [{ type: "number", minimum: 0, maximum: 4 }, { type: "null" }] }
        : { type: "number", minimum: 0, maximum: 4 }]))
    },
    applicability: {
      type: "object", additionalProperties: false,
      required: ["interpretive_movement", "reason"],
      properties: {
        interpretive_movement: { type: "string", enum: ["applicable", "not_applicable"] },
        reason: { type: "string" }
      }
    },
    overall: { type: "number", minimum: 0, maximum: 1 },
    verdict: { type: "string", enum: ["pass", "below_threshold"] },
    findings: {
      type: "array",
      items: {
        type: "object", additionalProperties: false,
        required: ["category", "location", "finding", "evidence_ids"],
        properties: {
          category: { type: "string", enum: [...REPORT_JUDGE_CATEGORIES] },
          location: { type: "string" }, finding: { type: "string" },
          evidence_ids: { type: "array", items: { type: "string" } }
        }
      }
    }
  }
};

export async function judgeReportUnit(input: {
  payload: ReportGenerationPayload;
  draft: ReportDraft;
  validatorResults: unknown;
  threshold: number;
  callModel?: ReportModelCall;
  promptMode?: ReportPromptMode;
}): Promise<{ result: ReportJudgeResult; usage: ReportModelUsage; model: string; promptVersion: string }> {
  const promptMode = input.promptMode ?? "active";
  const prompt = promptMode === "active" ? loadActiveReportJudgePrompt() : loadLegacyReportJudgePrompt();
  const target = judgeModelTarget();
  const packet = reportEvaluationPacket(input.payload, input.draft);
  const validatorIssues = Array.isArray(input.validatorResults)
    ? input.validatorResults.map((issue) => issue && typeof issue === "object"
      ? issue as { code?: string; category?: string; message?: string; detail?: string }
      : { category: "report_validation", detail: String(issue) })
    : input.validatorResults == null
      ? []
      : [{ category: "report_validation", detail: String(input.validatorResults) }];
  const response = await (input.callModel ?? callProductionReportModel)<ReportJudgeResult>({
    ...target,
    prompt: [
      prompt.text,
      `CANONICAL_PROMPT\n${input.payload.canonicalOwnerPrompt.text}`,
      `LIVED_PROSE_STANDARD\n${input.payload.livedProseStandard.text}`,
      `NO_CLEVERNESS_TAX_OWNER_RULING\n${input.payload.noClevernessRuling.text}`,
      `OWNER_REVIEW_EVIDENCE\n${input.payload.ownerReviewEvidence.text}`,
      `EARNED_SENTENCE_OWNER_RULING\n${input.payload.earnedSentenceRuling.text}`,
      promptMode === "active"
        ? `NATURALNESS_AND_JUDGING_RESTRAINT_OWNER_RULING\n${input.payload.naturalnessRuling.text}`
        : "",
      `PRODUCTION_LOCATION_CONTRACT\n${packet.locationContract}`,
      `COMPLETE_UNIT\n${packet.completeUnit}`,
      `UNIT_FACTS\n${JSON.stringify(packet.unitFacts)}`,
      `OWNER_COMPARISON_SET\n${JSON.stringify(packet.ownerComparisonSet)}`,
      `TARGET_FUNCTIONS\n${JSON.stringify(packet.targetFunctions)}`,
      `LABELED_NEGATIVE_EXAMPLES\n${JSON.stringify(packet.labeledNegativeExamples)}`,
      `VALIDATOR_RESULTS\n${JSON.stringify(input.validatorResults)}`,
      `CONFIGURED_THRESHOLD\n${input.threshold}`
    ].filter(Boolean).join("\n\n"),
    schemaName: "report_fulfillment_judge",
    schema: REPORT_JUDGE_SCHEMA,
    productionKernel: prepareReportProductionKernel(
      input.payload,
      "REVIEWER",
      reportProductionValidation(validatorIssues)
    )
  });
  const movementApplicable = reportDraftMovementApplicable(input.draft);
  const scores: ReportJudgeScores = {
    ...response.value.scores,
    interpretive_movement: movementApplicable ? response.value.scores.interpretive_movement : null
  };
  if (movementApplicable && typeof scores.interpretive_movement !== "number") {
    throw new Error("V3 judge omitted interpretive_movement for a multi-paragraph unit.");
  }
  const eligibleEvidence = new Set(packet.ownerComparisonSet.map((passage) => passage.evidenceId));
  for (const finding of response.value.findings.filter((candidate) => candidate.category === "owner_voice")) {
    if (!finding.evidence_ids.length || finding.evidence_ids.some((id) => !eligibleEvidence.has(id))) {
      throw new Error("V3 owner_voice finding lacks eligible comparison evidence.");
    }
  }
  const overall = reportJudgeOverall(scores, movementApplicable);
  const result = {
    ...response.value,
    scores,
    applicability: {
      interpretive_movement: movementApplicable ? "applicable" as const : "not_applicable" as const,
      reason: movementApplicable
        ? "The complete unit contains at least two substantive prose paragraphs."
        : "The complete unit contains fewer than two substantive prose paragraphs."
    },
    overall,
    verdict: reportJudgeReleaseVerdict(scores, input.threshold, movementApplicable)
  };
  return { result, usage: response.usage, model: response.model, promptVersion: prompt.version };
}

export function reportJudgeOverall(scores: ReportJudgeScores, movementApplicable = scores.interpretive_movement !== null) {
  const applicable = REPORT_JUDGE_CATEGORIES.filter((category) => category !== "interpretive_movement" || movementApplicable);
  const values = applicable.map((category) => scores[category]);
  if (values.some((score) => typeof score !== "number")) throw new Error("V3 judge returned a null applicable score.");
  return (values as number[]).reduce((sum, score) => sum + score, 0) / (4 * applicable.length);
}

// Historical calibration semantics remain stable here. Production report
// fulfillment uses reportJudgeReleaseVerdict so archived judge artifacts do
// not change meaning when the owner raises the release-quality floor.
export function reportJudgeVerdict(scores: ReportJudgeScores, threshold: number, movementApplicable = scores.interpretive_movement !== null) {
  const overall = reportJudgeOverall(scores, movementApplicable);
  const hardGatePassed = REPORT_JUDGE_HARD_GATE_CATEGORIES
    .filter((category) => category !== "interpretive_movement" || movementApplicable)
    .every((category) => typeof scores[category] === "number" && (scores[category] as number) >= 3);
  return overall >= threshold && hardGatePassed ? "pass" as const : "below_threshold" as const;
}

export function reportJudgeReleaseVerdict(scores: ReportJudgeScores, threshold: number, movementApplicable = scores.interpretive_movement !== null) {
  if (reportJudgeVerdict(scores, threshold, movementApplicable) !== "pass") return "below_threshold" as const;
  const releaseQualityPassed = Object.entries(REPORT_JUDGE_RELEASE_QUALITY_FLOORS)
    .every(([category, floor]) => typeof scores[category as ReportJudgeCategory] === "number"
      && (scores[category as ReportJudgeCategory] as number) >= floor);
  return releaseQualityPassed ? "pass" as const : "below_threshold" as const;
}

export function deterministicCalibrationScore(text: string) {
  const lower = text.toLowerCase();
  const defects = [
    /—/u.test(text) ? "em_dash" : "",
    /\bwhether\b/u.test(lower) ? "whether" : "",
    /\byou will (?:move|marry|get|lose)\b/u.test(lower) ? "certainty" : "",
    /\bpower, transformation, visibility, expansion, alignment\b/u.test(lower) ? "keyword_stack" : ""
  ].filter(Boolean);
  const paragraphs = text.split(/\n\s*\n/u)
    .map((value) => value.trim())
    .filter((value) => value.split(/\s+/u).length >= 6 && !/^(?:---|\*\*[^*]+\*\*|#+\s)/u.test(value));
  const counts = new Map<string, number>();
  for (const paragraph of paragraphs) counts.set(paragraph, (counts.get(paragraph) ?? 0) + 1);
  if ([...counts.values()].some((count) => count >= 3)) defects.push("repeated_menu");
  const overall = Math.max(0, 1 - defects.length * 0.22);
  return { overall, defects };
}

export function reportJudgeCalibrationFixtures() {
  const references = [
    "artifacts/marie-satori-year-ahead-2026-FINAL.md",
    "artifacts/marie-satori-work-money-2026-owner-v1.md",
    "artifacts/marie-satori-love-connection-2026-owner-v1.md"
  ].map((sourcePath) => ({ sourcePath, text: fs.readFileSync(sourcePath, "utf8") }));
  const base = references[0].text;
  const firstParagraph = base.split(/\n\s*\n/u).find((value) => value.trim() && !value.startsWith("#"))?.trim() ?? "FIXTURE_ONLY_PARAGRAPH";
  return {
    references,
    degraded: [
      { id: "em_dash", text: `${base}\n\nFIXTURE_ONLY — FIXTURE_ONLY.` },
      { id: "certainty", text: `${base}\n\nYou will move.` },
      { id: "keyword_stack", text: `${base}\n\npower, transformation, visibility, expansion, alignment.` },
      { id: "repeated_menu", text: `${base}\n\n${firstParagraph}\n\n${firstParagraph}\n\n${firstParagraph}` },
      { id: "whether", text: `${base}\n\nFIXTURE_ONLY whether FIXTURE_ONLY.` }
    ]
  };
}
