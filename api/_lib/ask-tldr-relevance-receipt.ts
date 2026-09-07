import { createHash } from "node:crypto";
import type { AskTldrQuestionRelevantFactor } from "./ask-tldr-relevance-bound.js";

type QuestionRelevantPacket = {
  schema: "ask-tldr-question-relevant-answer-packet.v1";
  question: Record<string, unknown>;
  evidence: AskTldrQuestionRelevantFactor[];
  evidenceIds: string[];
  generationAllowed: boolean;
  generationBlockReason: string | null;
};

export type AskTldrQuestionRelevanceReceipt = {
  schema: "ask-tldr-question-relevance-receipt.v1";
  question: Record<string, unknown>;
  evidence: Array<{
    evidenceId: string;
    role: "primary" | "supporting";
    semanticPacketSha256: string | null;
    relevanceStatus: "full" | "missing";
    relevanceCanonicalIds: string[];
    relevancePacketSha256: string | null;
    matched: { houses: number[]; angles: string[]; points: string[] };
  }>;
  eligibleEvidenceIds: string[];
  primaryEvidenceId: string | null;
  generationAllowed: boolean;
  generationBlockReason: string | null;
  receiptSha256: string;
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

export function buildAskTldrQuestionRelevanceReceipt(packet: QuestionRelevantPacket): AskTldrQuestionRelevanceReceipt {
  const evidence = packet.evidence.map((factor) => ({
    evidenceId: factor.id,
    role: factor.role,
    semanticPacketSha256: words(factor.governedMeaning.packetSha256) || null,
    relevanceStatus: factor.questionRelevance.status,
    relevanceCanonicalIds: [...factor.questionRelevance.canonicalIds],
    relevancePacketSha256: words(factor.questionRelevance.packetSha256) || null,
    matched: {
      houses: [...factor.questionRelevance.matched.houses],
      angles: [...factor.questionRelevance.matched.angles],
      points: [...factor.questionRelevance.matched.points]
    }
  }));
  const primary = packet.evidence.find((factor) => factor.role === "primary") ?? null;
  const eligibleEvidenceIds = packet.evidence
    .filter((factor) => factor.governedMeaning.status === "full" && factor.questionRelevance.status === "full")
    .map((factor) => factor.id);
  const primaryReady = Boolean(
    primary
    && primary.governedMeaning.status === "full"
    && primary.questionRelevance.status === "full"
    && eligibleEvidenceIds.includes(primary.id)
  );
  const generationAllowed = Boolean(packet.generationAllowed && primaryReady);
  const generationBlockReason = generationAllowed
    ? null
    : packet.generationBlockReason ?? "PRIMARY_QUESTION_RELEVANCE_UNGOVERNED";
  const withoutHash = {
    schema: "ask-tldr-question-relevance-receipt.v1" as const,
    question: packet.question,
    evidence,
    eligibleEvidenceIds,
    primaryEvidenceId: primary?.id ?? null,
    generationAllowed,
    generationBlockReason
  };
  return { ...withoutHash, receiptSha256: sha256Json(withoutHash) };
}

export function assertAskTldrQuestionRelevanceReceipt(receipt: AskTldrQuestionRelevanceReceipt) {
  if (receipt.schema !== "ask-tldr-question-relevance-receipt.v1") {
    throw new Error("ASK_TLDR_RELEVANCE_RECEIPT_SCHEMA_INVALID");
  }
  const expectedHash = sha256Json(Object.fromEntries(Object.entries(receipt).filter(([key]) => key !== "receiptSha256")));
  if (expectedHash !== receipt.receiptSha256) throw new Error("ASK_TLDR_RELEVANCE_RECEIPT_TAMPERED");
  if (!receipt.generationAllowed) {
    throw new Error(`ASK_TLDR_RELEVANCE_RECEIPT_BLOCKED: ${receipt.generationBlockReason ?? "unknown"}`);
  }
  if (!receipt.primaryEvidenceId || !receipt.eligibleEvidenceIds.includes(receipt.primaryEvidenceId)) {
    throw new Error("ASK_TLDR_RELEVANCE_RECEIPT_PRIMARY_NOT_ELIGIBLE");
  }
  const byId = new Map(receipt.evidence.map((item) => [item.evidenceId, item]));
  for (const id of receipt.eligibleEvidenceIds) {
    const item = byId.get(id);
    if (!item || item.relevanceStatus !== "full" || !item.relevancePacketSha256 || !item.semanticPacketSha256) {
      throw new Error(`ASK_TLDR_RELEVANCE_RECEIPT_EVIDENCE_INVALID: ${id}`);
    }
  }
  return receipt;
}
