import { createHash } from "node:crypto";
import type { AskTldrQuestionRelevantFactor } from "./ask-tldr-relevance-bound.js";
import {
  assertAskTldrQuestionRelevanceReceipt,
  type AskTldrQuestionRelevanceReceipt
} from "./ask-tldr-relevance-receipt.js";
import type { AskTldrJudgeRequest, AskTldrJudgeResult } from "./ask-tldr-judge.js";
import type { AskTldrVoiceEvidenceReceipt } from "./ask-tldr-voice-receipt.js";
import type { AskTldrWriterOutput, AskTldrWriterRequest } from "./ask-tldr-writer.js";
import {
  buildAskTldrCalibrationReleasePacket,
  type AskTldrCalibrationReleasePacket
} from "./ask-tldr-release.js";

export type AskTldrQuestionBoundCalibrationReleasePacket = Omit<
  AskTldrCalibrationReleasePacket,
  "schema" | "sourceBindings" | "packetSha256"
> & {
  schema: "ask-tldr-question-bound-calibration-release-packet.v1";
  sourceBindings: AskTldrCalibrationReleasePacket["sourceBindings"] & {
    relevanceReceiptSha256: string;
    questionRelevancePacketSha256ByEvidenceId: Record<string, string>;
    baseReleasePacketSha256: string;
  };
  packetSha256: string;
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

export function buildQuestionBoundAskTldrCalibrationReleasePacket(input: {
  question: Record<string, unknown>;
  writerRequest: AskTldrWriterRequest;
  writerOutput: AskTldrWriterOutput;
  evidence: AskTldrQuestionRelevantFactor[];
  receipt: AskTldrVoiceEvidenceReceipt;
  relevanceReceipt: AskTldrQuestionRelevanceReceipt;
  factLock: { passed: boolean; checkedEvidenceIds: string[]; issues: unknown[] };
  judgeRequest: AskTldrJudgeRequest;
  judge: AskTldrJudgeResult;
}): AskTldrQuestionBoundCalibrationReleasePacket {
  assertAskTldrQuestionRelevanceReceipt(input.relevanceReceipt);
  const eligible = new Set(input.relevanceReceipt.eligibleEvidenceIds);
  const usedEvidence = input.evidence.filter((factor) => input.writerOutput.evidenceIdsUsed.includes(factor.id));
  const questionRelevancePacketSha256ByEvidenceId: Record<string, string> = {};
  for (const factor of usedEvidence) {
    if (!eligible.has(factor.id) || factor.questionRelevance.status !== "full" || !words(factor.questionRelevance.packetSha256)) {
      throw new Error(`ASK_TLDR_RELEASE_QUESTION_RELEVANCE_NOT_FULL: ${factor.id}`);
    }
    questionRelevancePacketSha256ByEvidenceId[factor.id] = words(factor.questionRelevance.packetSha256);
  }
  if (Object.keys(questionRelevancePacketSha256ByEvidenceId).length !== input.writerOutput.evidenceIdsUsed.length) {
    throw new Error("ASK_TLDR_RELEASE_QUESTION_RELEVANCE_SCOPE_MISMATCH");
  }
  const base = buildAskTldrCalibrationReleasePacket({
    question: input.question,
    writerRequest: input.writerRequest,
    writerOutput: input.writerOutput,
    evidence: usedEvidence,
    receipt: input.receipt,
    factLock: input.factLock,
    judgeRequest: input.judgeRequest,
    judge: input.judge
  });
  const { schema: _schema, sourceBindings, packetSha256: baseReleasePacketSha256, ...rest } = base;
  const withoutHash = {
    ...rest,
    schema: "ask-tldr-question-bound-calibration-release-packet.v1" as const,
    sourceBindings: {
      ...sourceBindings,
      relevanceReceiptSha256: input.relevanceReceipt.receiptSha256,
      questionRelevancePacketSha256ByEvidenceId,
      baseReleasePacketSha256
    }
  };
  return { ...withoutHash, packetSha256: sha256Json(withoutHash) };
}
