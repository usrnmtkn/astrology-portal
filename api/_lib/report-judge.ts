import fs from "node:fs";
import type { ReportDraft, ReportGenerationPayload } from "./report-generation.ts";
import { callReportModel, judgeModelTarget, type ReportModelCall, type ReportModelUsage } from "./report-model-client.ts";
import { loadVersionedReportPrompt, REPORT_JUDGE_PROMPT_PATH } from "./report-prompt-versions.ts";

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
export type ReportJudgeCategory = typeof REPORT_JUDGE_CATEGORIES[number];
export type ReportJudgeResult = {
  scores: Record<ReportJudgeCategory, number>;
  overall: number;
  verdict: "pass" | "below_threshold";
  findings: Array<{ category: ReportJudgeCategory; location: string; finding: string }>;
};

const judgeSchema = {
  type: "object", additionalProperties: false, required: ["scores", "overall", "verdict", "findings"],
  properties: {
    scores: { type: "object", additionalProperties: false, required: [...REPORT_JUDGE_CATEGORIES], properties: Object.fromEntries(REPORT_JUDGE_CATEGORIES.map((category) => [category, { type: "number", minimum: 0, maximum: 4 }])) },
    overall: { type: "number", minimum: 0, maximum: 1 },
    verdict: { type: "string", enum: ["pass", "below_threshold"] },
    findings: { type: "array", items: { type: "object", additionalProperties: false, required: ["category", "location", "finding"], properties: { category: { type: "string", enum: [...REPORT_JUDGE_CATEGORIES] }, location: { type: "string" }, finding: { type: "string" } } } }
  }
};

export async function judgeReportUnit(input: {
  payload: ReportGenerationPayload;
  draft: ReportDraft;
  validatorResults: unknown;
  threshold: number;
  callModel?: ReportModelCall;
}): Promise<{ result: ReportJudgeResult; usage: ReportModelUsage; model: string; promptVersion: string }> {
  const prompt = loadVersionedReportPrompt(REPORT_JUDGE_PROMPT_PATH);
  const target = judgeModelTarget();
  const response = await (input.callModel ?? callReportModel)<ReportJudgeResult>({
    ...target,
    prompt: `${prompt.text}\n\nCANONICAL_PROMPT\n${input.payload.canonicalOwnerPrompt.text}\n\nFACTS\n${JSON.stringify(input.payload.frozenFacts)}\n\nOWNER_REFERENCE_EVIDENCE\n${JSON.stringify(input.payload.voiceEvidence)}\n\nVALIDATORS\n${JSON.stringify(input.validatorResults)}\n\nDRAFT\n${JSON.stringify(input.draft)}\n\nConfigured threshold: ${input.threshold}.`,
    schemaName: "report_fulfillment_judge",
    schema: judgeSchema
  });
  const result = {
    ...response.value,
    verdict: reportJudgeVerdict(response.value.scores, response.value.overall, input.threshold)
  };
  return { result, usage: response.usage, model: response.model, promptVersion: prompt.version };
}

export function reportJudgeVerdict(scores: Record<ReportJudgeCategory, number>, overall: number, threshold: number) {
  const hardGatePassed = REPORT_JUDGE_HARD_GATE_CATEGORIES.every((category) => scores[category] >= 3);
  return overall >= threshold && hardGatePassed ? "pass" as const : "below_threshold" as const;
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
