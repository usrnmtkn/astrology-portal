import { createHash } from "node:crypto";
import type { AskTldrQuestionRelevantFactor } from "./ask-tldr-relevance-bound.js";
import {
  assertAskTldrQuestionRelevanceReceipt,
  type AskTldrQuestionRelevanceReceipt
} from "./ask-tldr-relevance-receipt.js";
import type { AskTldrVoiceEvidenceReceipt } from "./ask-tldr-voice-receipt.js";
import {
  buildAskTldrWriterRequest,
  type AskTldrWriterRequest
} from "./ask-tldr-writer.js";

type QuestionRelevantPacket = {
  schema: "ask-tldr-question-relevant-answer-packet.v1";
  question: Record<string, unknown>;
  decisionMode: string;
  answerContract: Record<string, unknown>;
  evidence: AskTldrQuestionRelevantFactor[];
  evidenceIds: string[];
  generationAllowed: boolean;
  generationBlockReason: string | null;
};

function sha256(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

function sha256Json(value: unknown) {
  return sha256(JSON.stringify(value));
}

function eligibleEvidence(packet: QuestionRelevantPacket, receipt: AskTldrQuestionRelevanceReceipt) {
  assertAskTldrQuestionRelevanceReceipt(receipt);
  if (JSON.stringify(receipt.question) !== JSON.stringify(packet.question)) {
    throw new Error("ASK_TLDR_WRITER_RELEVANCE_QUESTION_MISMATCH");
  }
  const allowed = new Set(receipt.eligibleEvidenceIds);
  const evidence = packet.evidence.filter((factor) => (
    allowed.has(factor.id)
    && factor.governedMeaning.status === "full"
    && factor.questionRelevance.status === "full"
  ));
  const primary = evidence.find((factor) => factor.role === "primary");
  if (!packet.generationAllowed || !primary || primary.id !== receipt.primaryEvidenceId) {
    throw new Error(`ASK_TLDR_WRITER_RELEVANCE_BLOCKED: ${packet.generationBlockReason ?? receipt.generationBlockReason ?? "unknown"}`);
  }
  return evidence;
}

function relevanceInput(evidence: AskTldrQuestionRelevantFactor[]) {
  return [
    "GOVERNED QUESTION RELEVANCE EVIDENCE (why each supplied astrology factor belongs to this question; do not infer a different life-domain connection)",
    ...evidence.flatMap((factor) => [
      `--- ${factor.role.toUpperCase()} RELEVANCE ${factor.id}`,
      JSON.stringify({
        matched: factor.questionRelevance.matched,
        canonicalIds: factor.questionRelevance.canonicalIds,
        packetSha256: factor.questionRelevance.packetSha256
      }, null, 2),
      factor.questionRelevance.promptEvidence ?? "NONE"
    ])
  ].join("\n");
}

export function buildQuestionBoundAskTldrWriterRequest(input: {
  packet: QuestionRelevantPacket;
  voiceReceipt: AskTldrVoiceEvidenceReceipt;
  relevanceReceipt: AskTldrQuestionRelevanceReceipt;
}): AskTldrWriterRequest {
  const evidence = eligibleEvidence(input.packet, input.relevanceReceipt);
  const semanticPacket = {
    schema: "ask-tldr-governed-answer-packet.v1" as const,
    question: input.packet.question,
    decisionMode: input.packet.decisionMode,
    answerContract: input.packet.answerContract,
    evidence,
    evidenceIds: evidence.map((factor) => factor.id),
    generationAllowed: true,
    generationBlockReason: null
  };
  const base = buildAskTldrWriterRequest({ packet: semanticPacket, receipt: input.voiceReceipt });
  const withoutHash = {
    ...base,
    instructions: `${base.instructions}\nQUESTION RELEVANCE EVIDENCE controls why a supplied astrology factor answers this specific question. Do not substitute a broader pillar association, a generic house keyword, or an inferred life-domain meaning for the supplied relevance evidence.`,
    input: `${base.input}\n\n${relevanceInput(evidence)}\n\nQUESTION RELEVANCE RECEIPT\n${JSON.stringify({
      receiptSha256: input.relevanceReceipt.receiptSha256,
      eligibleEvidenceIds: input.relevanceReceipt.eligibleEvidenceIds,
      primaryEvidenceId: input.relevanceReceipt.primaryEvidenceId
    }, null, 2)}`
  };
  const requestWithoutHash = Object.fromEntries(Object.entries(withoutHash).filter(([key]) => key !== "requestSha256"));
  return { ...requestWithoutHash, requestSha256: sha256Json(requestWithoutHash) } as AskTldrWriterRequest;
}
