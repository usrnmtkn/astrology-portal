import { transitReportEditorialReviewGuide } from "./transit-report-editorial-guide.js";
import { GENERATED_REPORT_JUDGE_SCHEMA } from "./transit-reading-judge-schema.js";
import { judgeScopedGeneratedTransitReading } from "./transit-reading-scoped-judge.js";
import { transitReadingReviewMode } from "./transit-reading-review-contract.js";
import { transitReadingReaderCopy } from "./transit-reading-reader-copy.js";
import { assertGeneratedReportJudgeEvidence, generatedReportJudgeEvidenceContract } from "./transit-reading-judge-evidence.js";
import { reportJudgeSourcePointerSchema, resolveReportJudgeSourcePointers } from "./transit-reading-source-citations.js";
import { transitReadingOwnerVoiceReceipt, transitReadingVoiceContext } from "./transit-reading-owner-voice.js";
import fs from "node:fs";
import { transitReadingReleasePolicy } from "./transit-reading-release-policy.js";
import { EVIDENCE_DELIVERY_POLICY, assertReportDeliveryEvidence, reportDeliveryEvidenceSchema, reportDeliveryReviewContract } from "./transit-reading-delivery-evidence.js";
import { generatedReportWritingContract } from "./transit-reading-writing-contract.js";
import { REPORT_JUDGE_THRESHOLD, reportFulfillmentConfig } from "./report-fulfillment-config.js";
import type { GeneratedTransitReadingDraft } from "./transit-reading-generation.js";
import type { GeneratedTransitReportSurface } from "./transit-reading-owner-evidence.js";
import {
  generatedReportJudgeOverall,
  generatedReportJudgeVerdict,
  type GeneratedReportJudgeResult
} from "./transit-reading-judge-rules.js";
import {
  callGovernedTransitReadingModel,
  prepareTransitReadingProductionKernel,
  type TransitReadingProductionInput
} from "./transit-reading-production.js";
import { generatedReportJudgeRubric, GENERATED_REPORT_JUDGE_PACKET_CONTRACT } from "./transit-reading-judge-prompt.js";
import { assertReportReviewReconciliation, reportReviewReconciliationPrompt, RECONCILED_REPORT_JUDGE_SCHEMA,
  type TransitReadingPriorReview } from "./transit-reading-review-reconciliation.js";

export const GENERATED_REPORT_JUDGE_ADAPTER_VERSION = "generated-report-judge-adapter-v1.12";
export const EVIDENCE_DELIVERY_JUDGE_VERSION = "generated-report-judge-adapter-v2.0-candidate";
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

export { GENERATED_REPORT_JUDGE_SCHEMA } from "./transit-reading-judge-schema.js";

function requiredFile(path: string) {
  return fs.readFileSync(path, "utf8");
}

export function judgePrompt(input: {
  surface: GeneratedTransitReportSurface;
  reportKind: string;
  brief: unknown;
  draft: GeneratedTransitReadingDraft;
  ownerEvidence: string[];
  priorReview?: TransitReadingPriorReview;
}) {
  const evidenceDelivery = transitReadingReleasePolicy() === EVIDENCE_DELIVERY_POLICY;
  const approvedFeedback = input.ownerEvidence.length
    ? input.ownerEvidence.map((text, index) => `${index + 1}. ${text}`).join("\n")
    : "No additional generated-report owner feedback has been explicitly approved yet.";
  return [
    ...(evidenceDelivery ? [reportDeliveryReviewContract()] : [GENERATED_REPORT_JUDGE_PACKET_CONTRACT,
      "", generatedReportJudgeRubric(), "", requiredFile(GENERATED_REPORT_JUDGE_ADAPTER_PATH),
      "", generatedReportWritingContract()]),
    "",
    ...(evidenceDelivery ? [] : ["OWNER REVIEW EVIDENCE", requiredFile(REPORT_OWNER_REVIEW_EVIDENCE_PATH)]),
    "",
    "EXPLICITLY APPROVED GENERATED-REPORT OWNER FEEDBACK",
    approvedFeedback,
    "",
    transitReportEditorialReviewGuide(),
    "JUDGE THIS COMPLETE GENERATED REPORT",
    `Surface: ${input.surface}`,
    `Report kind: ${input.reportKind}`,
    "The governed brief is the factual ceiling. Do not ask the writer to invent a fact, chart claim, date, or actual life circumstance. Assess hypothetical illustrations under the current owner report direction.",
    "Return the diagnostic fields required by the supplied schema, including reconciliation when requested. Do not return a verdict, overall score, replacement sentence, rewrite, or suggested prose.",
    generatedReportJudgeEvidenceContract(true, evidenceDelivery),
    "",
    "GOVERNED BRIEF",
    JSON.stringify(input.brief, null, 2),
    "",
    ...(input.priorReview ? [reportReviewReconciliationPrompt(input.priorReview, input.draft, evidenceDelivery), ""] : [
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
  const policy = transitReadingReleasePolicy();
  const evidenceDelivery = policy === EVIDENCE_DELIVERY_POLICY;
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
  const validateEvidence = evidenceDelivery ? assertReportDeliveryEvidence : assertGeneratedReportJudgeEvidence;
  const baseSchema = (input.priorReview ? RECONCILED_REPORT_JUDGE_SCHEMA : GENERATED_REPORT_JUDGE_SCHEMA) as unknown as Record<string, unknown>;
  const response = await callGovernedTransitReadingModel<unknown>({
    kernel,
    provider,
    model,
    prompt,
    schemaName: "tldr_generated_report_judge",
    schema: reportJudgeSourcePointerSchema(evidenceDelivery ? reportDeliveryEvidenceSchema(baseSchema) : baseSchema, input.brief),
    validateResponse: (value) => {
      const resolved = resolveReportJudgeSourcePointers(value, input.brief);
      validateEvidence(resolved, evidenceInput);
      if (input.priorReview) assertReportReviewReconciliation(resolved, input.priorReview, input.draft);
    }
  });
  const resolved = resolveReportJudgeSourcePointers(response.value, input.brief);
  const providerResult = validateEvidence(resolved, evidenceInput);
  const scores = providerResult.scores;
  const overall = generatedReportJudgeOverall(scores);
  return {
    result: {
      scores,
      overall,
      verdict: generatedReportJudgeVerdict(scores, REPORT_JUDGE_THRESHOLD, providerResult.findings),
      findings: providerResult.findings,
      ...(evidenceDelivery ? { deliveryPolicy: policy } : {})
    } satisfies GeneratedReportJudgeResult,
    provider: response.provider,
    model: response.model,
    version: evidenceDelivery ? EVIDENCE_DELIVERY_JUDGE_VERSION : GENERATED_REPORT_JUDGE_ADAPTER_VERSION,
    threshold: REPORT_JUDGE_THRESHOLD,
    ...(input.priorReview ? { reconciliation: assertReportReviewReconciliation(resolved, input.priorReview, input.draft) } : {}),
    ownerVoiceEvidence: transitReadingOwnerVoiceReceipt(kernel.ownerVoice,
      transitReadingVoiceContext(kernel.input.facts, kernel.input.surface))
  };
}
