import { transitReadingReaderCopy } from "./transit-reading-reader-copy.js";
import { transitReadingOwnerVoiceReceipt } from "./transit-reading-owner-voice.js";
import fs from "node:fs";
import { generatedReportWritingContract } from "./transit-reading-writing-contract.js";
import { REPORT_JUDGE_THRESHOLD, reportFulfillmentConfig } from "./report-fulfillment-config.js";
import type { GeneratedTransitReadingDraft } from "./transit-reading-generation.js";
import type { GeneratedTransitReportSurface } from "./transit-reading-owner-evidence.js";
import {
  GENERATED_REPORT_JUDGE_CATEGORIES,
  GENERATED_REPORT_JUDGE_FINDING_CATEGORIES,
  generatedReportJudgeOverall,
  generatedReportJudgeVerdict,
  type GeneratedReportJudgeFinding,
  type GeneratedReportJudgeResult,
  type GeneratedReportJudgeScores
} from "./transit-reading-judge-rules.js";
import {
  callGovernedTransitReadingModel,
  prepareTransitReadingProductionKernel,
  type TransitReadingProductionInput
} from "./transit-reading-production.js";
import { instructionsForRole } from "../../src/astro-writing/openAIResponses.cjs";

export const GENERATED_REPORT_JUDGE_ADAPTER_VERSION = "generated-report-judge-adapter-v1.4";
export const GENERATED_REPORT_JUDGE_ADAPTER_PATH = "tldr-astro-phrasebank/TLDR-GENERATED-REPORT-JUDGE-ADAPTER-V1-OWNER.md";
const REPORT_JUDGE_PATH = "tldr-astro-phrasebank/TLDR-REPORT-JUDGE-RUBRIC-V3.4-OWNER.md";
const REPORT_OWNER_REVIEW_EVIDENCE_PATH = "tldr-astro-phrasebank/TLDR-REPORT-OWNER-REVIEW-EVIDENCE-2026-08-11.md";

export type GeneratedReportJudgeAudit = {
  version: typeof GENERATED_REPORT_JUDGE_ADAPTER_VERSION;
  threshold: number;
  verdict: "pass";
  overall: number;
  provider: string;
  model: string;
  attempts: 1 | 2;
};

type JudgeProviderPayload = {
  scores: GeneratedReportJudgeScores;
  findings: GeneratedReportJudgeFinding[];
};

export const GENERATED_REPORT_JUDGE_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["scores", "findings"],
  properties: {
    scores: {
      type: "object",
      additionalProperties: false,
      required: [...GENERATED_REPORT_JUDGE_CATEGORIES],
      properties: Object.fromEntries(GENERATED_REPORT_JUDGE_CATEGORIES.map((category) => [
        category,
        { type: "number", minimum: 0, maximum: 4 }
      ]))
    },
    findings: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["category", "location", "finding"],
        properties: {
          category: { type: "string", enum: [...GENERATED_REPORT_JUDGE_FINDING_CATEGORIES] },
          location: { type: "string" },
          finding: { type: "string" }
        }
      }
    }
  }
} as const;

function requiredFile(path: string) {
  return fs.readFileSync(path, "utf8");
}

function assertProviderPayload(value: unknown): JudgeProviderPayload {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Generated report judge returned invalid structured output.");
  const payload = value as Partial<JudgeProviderPayload>;
  if (!payload.scores || typeof payload.scores !== "object" || Array.isArray(payload.scores) || !Array.isArray(payload.findings)) {
    throw new Error("Generated report judge omitted scores or findings.");
  }
  for (const category of GENERATED_REPORT_JUDGE_CATEGORIES) {
    const score = (payload.scores as Partial<GeneratedReportJudgeScores>)[category];
    if (typeof score !== "number" || score < 0 || score > 4) throw new Error(`Generated report judge returned an invalid ${category} score.`);
  }
  for (const finding of payload.findings) {
    if (!finding || !GENERATED_REPORT_JUDGE_FINDING_CATEGORIES.includes(finding.category) || !finding.location?.trim() || !finding.finding?.trim()) {
      throw new Error("Generated report judge returned an invalid finding.");
    }
  }
  return payload as JudgeProviderPayload;
}

function judgePrompt(input: {
  surface: GeneratedTransitReportSurface;
  reportKind: string;
  brief: unknown;
  draft: GeneratedTransitReadingDraft;
  ownerEvidence: string[];
}) {
  const approvedFeedback = input.ownerEvidence.length
    ? input.ownerEvidence.map((text, index) => `${index + 1}. ${text}`).join("\n")
    : "No additional generated-report owner feedback has been explicitly approved yet.";
  return [
    instructionsForRole("REVIEWER"),
    "",
    requiredFile(REPORT_JUDGE_PATH),
    "",
    requiredFile(GENERATED_REPORT_JUDGE_ADAPTER_PATH),
    "",
    generatedReportWritingContract(),
    "",
    "OWNER REVIEW EVIDENCE",
    requiredFile(REPORT_OWNER_REVIEW_EVIDENCE_PATH),
    "",
    "EXPLICITLY APPROVED GENERATED-REPORT OWNER FEEDBACK",
    approvedFeedback,
    "",
    "JUDGE THIS COMPLETE GENERATED REPORT",
    `Surface: ${input.surface}`,
    `Report kind: ${input.reportKind}`,
    "The governed brief is the factual ceiling. Do not ask the writer to invent a scene, fact, chart claim, date, or life circumstance that is absent from it.",
    "Return scores and diagnostic findings only. Do not return a verdict, overall score, replacement sentence, rewrite, or suggested prose.",
    "",
    "GOVERNED BRIEF",
    JSON.stringify(input.brief, null, 2),
    "",
    "COMPLETE READER-VISIBLE DRAFT",
    "The summary field is the one TLDR displayed before the body. Storage aliases and provider metadata are not additional prose. Judge actual repetition between this TLDR and body, not imagined duplicate fields.",
    JSON.stringify(transitReadingReaderCopy(input.draft), null, 2)
  ].join("\n");
}

export async function judgeGeneratedTransitReading(input: {
  surface: GeneratedTransitReportSurface;
  reportKind: string;
  brief: unknown;
  draft: GeneratedTransitReadingDraft;
  productionInput: TransitReadingProductionInput;
  ownerEvidence?: string[];
}) {
  const config = reportFulfillmentConfig();
  const provider = config.judgeProvider;
  const model = config.judgeModel;
  const prompt = judgePrompt({ ...input, ownerEvidence: input.ownerEvidence ?? [] });
  const kernel = prepareTransitReadingProductionKernel({
    productionInput: input.productionInput,
    role: "REVIEWER",
    draftValidated: true
  });
  const response = await callGovernedTransitReadingModel<JudgeProviderPayload>({
    kernel,
    provider,
    model,
    prompt,
    schemaName: "tldr_generated_report_judge",
    schema: GENERATED_REPORT_JUDGE_SCHEMA as unknown as Record<string, unknown>,
    validateResponse: (value) => { assertProviderPayload(value); }
  });
  const providerResult = assertProviderPayload(response.value);
  const scores = providerResult.scores;
  const overall = generatedReportJudgeOverall(scores);
  return {
    result: {
      scores,
      overall,
      verdict: generatedReportJudgeVerdict(scores, REPORT_JUDGE_THRESHOLD, providerResult.findings),
      findings: providerResult.findings
    } satisfies GeneratedReportJudgeResult,
    provider: response.provider,
    model: response.model,
    version: GENERATED_REPORT_JUDGE_ADAPTER_VERSION,
    threshold: REPORT_JUDGE_THRESHOLD,
    ownerVoiceEvidence: transitReadingOwnerVoiceReceipt(kernel.ownerVoice)
  };
}
