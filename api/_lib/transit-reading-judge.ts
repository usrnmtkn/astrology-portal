import { GENERATED_REPORT_JUDGE_SCHEMA } from "./transit-reading-judge-schema.js";
import { judgeScopedGeneratedTransitReading } from "./transit-reading-scoped-judge.js";
import { transitReadingReviewMode } from "./transit-reading-review-contract.js";
import { transitReadingReaderCopy } from "./transit-reading-reader-copy.js";
import { assertGeneratedReportJudgeEvidence, GENERATED_REPORT_JUDGE_EVIDENCE_CONTRACT } from "./transit-reading-judge-evidence.js";
import { transitReadingOwnerVoiceReceipt, transitReadingVoiceContext } from "./transit-reading-owner-voice.js";
import fs from "node:fs";
import { generatedReportWritingContract } from "./transit-reading-writing-contract.js";
import { REPORT_JUDGE_THRESHOLD, reportFulfillmentConfig } from "./report-fulfillment-config.js";
import type { GeneratedTransitReadingDraft } from "./transit-reading-generation.js";
import type { GeneratedTransitReportSurface } from "./transit-reading-owner-evidence.js";
import {
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
import { generatedReportJudgeRubric, GENERATED_REPORT_JUDGE_PACKET_CONTRACT } from "./transit-reading-judge-prompt.js";
import { assertReportReviewReconciliation, reportReviewReconciliationPrompt, RECONCILED_REPORT_JUDGE_SCHEMA,
  type TransitReadingPriorReview } from "./transit-reading-review-reconciliation.js";

export const GENERATED_REPORT_JUDGE_ADAPTER_VERSION = "generated-report-judge-adapter-v1.9";
export const GENERATED_REPORT_JUDGE_ADAPTER_PATH = "tldr-astro-phrasebank/TLDR-GENERATED-REPORT-JUDGE-ADAPTER-V1-OWNER.md";
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

export { GENERATED_REPORT_JUDGE_SCHEMA } from "./transit-reading-judge-schema.js";

function requiredFile(path: string) {
  return fs.readFileSync(path, "utf8");
}

function judgePrompt(input: {
  surface: GeneratedTransitReportSurface;
  reportKind: string;
  brief: unknown;
  draft: GeneratedTransitReadingDraft;
  ownerEvidence: string[];
  priorReview?: TransitReadingPriorReview;
}) {
  const approvedFeedback = input.ownerEvidence.length
    ? input.ownerEvidence.map((text, index) => `${index + 1}. ${text}`).join("\n")
    : "No additional generated-report owner feedback has been explicitly approved yet.";
  return [
    GENERATED_REPORT_JUDGE_PACKET_CONTRACT,
    "",
    generatedReportJudgeRubric(),
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
    GENERATED_REPORT_JUDGE_EVIDENCE_CONTRACT,
    "",
    "GOVERNED BRIEF",
    JSON.stringify(input.brief, null, 2),
    "",
    ...(input.priorReview ? [reportReviewReconciliationPrompt(input.priorReview, input.draft), ""] : [
      "INITIAL REVIEW COVERAGE: Read the TLDR, every body paragraph, the links between paragraphs and the ending before finalizing scores. Collect all supported release-blocking defects in this one review; do not stop at the first example or reserve other known defects for the corrective round. Do not invent a defect to fill a paragraph or category.", ""
    ]),
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
  priorReview?: TransitReadingPriorReview;
}) {
  if (transitReadingReviewMode() === "scoped") return judgeScopedGeneratedTransitReading(input);
  const config = reportFulfillmentConfig();
  const provider = config.judgeProvider;
  const model = config.judgeModel;
  const prompt = judgePrompt({ ...input, ownerEvidence: input.ownerEvidence ?? [] });
  const kernel = prepareTransitReadingProductionKernel({
    productionInput: input.productionInput,
    role: "REVIEWER",
    draftValidated: true
  });
  const evidenceInput = { ...input, ownerComparisonSet: kernel.ownerVoice };
  const response = await callGovernedTransitReadingModel<JudgeProviderPayload>({
    kernel,
    provider,
    model,
    prompt,
    schemaName: "tldr_generated_report_judge",
    schema: (input.priorReview ? RECONCILED_REPORT_JUDGE_SCHEMA : GENERATED_REPORT_JUDGE_SCHEMA) as unknown as Record<string, unknown>,
    validateResponse: (value) => {
      assertGeneratedReportJudgeEvidence(value, evidenceInput);
      if (input.priorReview) assertReportReviewReconciliation(value, input.priorReview, input.draft);
    }
  });
  const providerResult = assertGeneratedReportJudgeEvidence(response.value, evidenceInput);
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
    ...(input.priorReview ? { reconciliation: assertReportReviewReconciliation(response.value, input.priorReview, input.draft) } : {}),
    ownerVoiceEvidence: transitReadingOwnerVoiceReceipt(kernel.ownerVoice,
      transitReadingVoiceContext(kernel.input.facts, kernel.input.surface))
  };
}
