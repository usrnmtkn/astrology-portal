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

function words(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function questionTypes(question: Record<string, unknown>) {
  return Array.isArray(question.questionTypes)
    ? question.questionTypes.filter((value): value is string => typeof value === "string")
    : [];
}

function directionalQuestion(question: Record<string, unknown>) {
  const types = new Set(questionTypes(question));
  return types.has("direction") || types.has("guidance") || types.has("decision");
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
  const isDirectional = directionalQuestion(input.packet.question);
  const pillarId = words(input.packet.question.pillarId);
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
  const instructions = [
    base.instructions,
    "QUESTION RELEVANCE EVIDENCE controls why a supplied astrology factor answers this specific question. Do not substitute a broader pillar association, a generic house keyword, or an inferred life-domain meaning for the supplied relevance evidence.",
    "ASTROLOGY MUST CREATE THE VALUE: Do not write ordinary coaching advice first and then cite a transit as justification. The recommendation, distinction, or forecast must follow from the supplied astrology mechanism. Make clear what the chart adds that generic common sense would not tell the reader.",
    "APPLICATION STANDARD: When the question asks for guidance, help, what to do, how to approach something, or decision support, do not stop at abstract coaching language. Translate the central advice into at least one concrete decision, request, preparation step, boundary, question, or observable action the reader could actually take. Conditional examples must stay tightly tied to the question's domain and must not invent a personal event or history. The reader should not have to translate phrases such as 'make your contribution visible' or 'be more intentional' into the next step themselves.",
    isDirectional
      ? "DIRECTIONAL SYNTHESIS: Show movement, not just advice. Establish the current pattern or pressure the supplied evidence describes, then explain what is being amplified, redirected, exposed, or developed during the supplied timing window. Compare the kind of growth that fits the astrology with the kind that only increases volume, obligation, or noise. Compare factors only when their calculated time layers and governed meanings support a relationship. Do not invent a current circumstance or future trajectory from static or unrelated factors. Availability of two factors does not require using both."
      : "",
    pillarId === "career" && isDirectional
      ? "CAREER DIRECTION STANDARD: Prefer concrete professional distinctions such as scope, decision-making authority, ownership, leverage, resources, responsibility, visibility, recognition, and who controls the outcome. Do not default to generic language about worth, scrutiny, confidence, or ambition when the astrology can support a more specific distinction. These are possible distinctions, not a predetermined conclusion for every Career answer. Use only those supported by this question and the supplied meaning; do not force every chart into a negotiation about responsibility and authority."
      : "",
    "HISTORICAL LOOKBACK: Mention a previous occurrence, recurrence cycle, or 'last time this happened' only when an explicit prior occurrence or historical analogue is supplied in CALCULATED EVIDENCE. Never calculate or infer a historical analogue yourself. If none is supplied, omit historical comparison completely."
  ].filter(Boolean).join("\n");
  const withoutHash = {
    ...base,
    instructions,
    input: `${base.input}\n\n${relevanceInput(evidence)}\n\nQUESTION RELEVANCE RECEIPT\n${JSON.stringify({
      receiptSha256: input.relevanceReceipt.receiptSha256,
      eligibleEvidenceIds: input.relevanceReceipt.eligibleEvidenceIds,
      primaryEvidenceId: input.relevanceReceipt.primaryEvidenceId
    }, null, 2)}`
  };
  const requestWithoutHash = Object.fromEntries(Object.entries(withoutHash).filter(([key]) => key !== "requestSha256"));
  return { ...requestWithoutHash, requestSha256: sha256Json(requestWithoutHash) } as AskTldrWriterRequest;
}