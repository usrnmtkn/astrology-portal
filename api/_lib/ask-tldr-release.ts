import { createHash } from "node:crypto";
import type { AskTldrGovernedFactor } from "./ask-tldr-governed-evidence.js";
import type { AskTldrJudgeRequest, AskTldrJudgeResult } from "./ask-tldr-judge.js";
import type { AskTldrVoiceEvidenceReceipt } from "./ask-tldr-voice-receipt.js";
import type { AskTldrWriterOutput, AskTldrWriterRequest } from "./ask-tldr-writer.js";

export type AskTldrCalibrationReleasePacket = {
  schema: "ask-tldr-calibration-release-packet.v1";
  generatedContent: true;
  runtimeEnabled: false;
  readerServingEnabled: false;
  ownerApproved: false;
  promotionAuthorized: false;
  releaseStatus: "calibration_candidate" | "blocked";
  blockers: string[];
  question: Record<string, unknown>;
  answer: string;
  answerSha256: string;
  evidenceIdsUsed: string[];
  primaryEvidenceId: string;
  whyNowEvidenceId: string | null;
  sourceBindings: {
    writerRequestSha256: string;
    judgeRequestSha256: string;
    voiceReceiptSha256: string;
    semanticPacketSha256ByEvidenceId: Record<string, string>;
    calculatedFactsSha256ByEvidenceId: Record<string, string>;
  };
  deterministicFactLock: {
    passed: boolean;
    checkedEvidenceIds: string[];
    issueCount: number;
  };
  judge: AskTldrJudgeResult;
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

function semanticBindings(evidenceIds: string[], evidence: AskTldrGovernedFactor[]) {
  const byId = new Map(evidence.map((factor) => [factor.id, factor]));
  const semanticPacketSha256ByEvidenceId: Record<string, string> = {};
  const calculatedFactsSha256ByEvidenceId: Record<string, string> = {};
  for (const id of evidenceIds) {
    const factor = byId.get(id);
    if (!factor) throw new Error(`ASK_TLDR_RELEASE_EVIDENCE_MISSING: ${id}`);
    if (factor.governedMeaning.status !== "full" || !words(factor.governedMeaning.packetSha256)) {
      throw new Error(`ASK_TLDR_RELEASE_EVIDENCE_NOT_FULL: ${id}`);
    }
    semanticPacketSha256ByEvidenceId[id] = words(factor.governedMeaning.packetSha256);
    calculatedFactsSha256ByEvidenceId[id] = sha256Json(factor.facts);
  }
  return { semanticPacketSha256ByEvidenceId, calculatedFactsSha256ByEvidenceId };
}

export function buildAskTldrCalibrationReleasePacket(input: {
  question: Record<string, unknown>;
  writerRequest: AskTldrWriterRequest;
  writerOutput: AskTldrWriterOutput;
  evidence: AskTldrGovernedFactor[];
  receipt: AskTldrVoiceEvidenceReceipt;
  factLock: { passed: boolean; checkedEvidenceIds: string[]; issues: unknown[] };
  judgeRequest: AskTldrJudgeRequest;
  judge: AskTldrJudgeResult;
}): AskTldrCalibrationReleasePacket {
  if (input.writerRequest.runtimeEnabled !== false || input.judgeRequest.runtimeEnabled !== false) {
    throw new Error("ASK_TLDR_RELEASE_RUNTIME_MUST_REMAIN_DISABLED");
  }
  if (JSON.stringify(input.writerOutput.evidenceIdsUsed) !== JSON.stringify(input.factLock.checkedEvidenceIds)) {
    throw new Error("ASK_TLDR_RELEASE_FACT_LOCK_SCOPE_MISMATCH");
  }
  if (JSON.stringify(input.writerOutput.evidenceIdsUsed) !== JSON.stringify(input.judgeRequest.usedEvidenceIds)) {
    throw new Error("ASK_TLDR_RELEASE_JUDGE_SCOPE_MISMATCH");
  }
  if (!input.writerOutput.evidenceIdsUsed.includes(input.writerOutput.primaryEvidenceId)
    || input.writerOutput.primaryEvidenceId !== input.writerRequest.primaryEvidenceId) {
    throw new Error("ASK_TLDR_RELEASE_PRIMARY_EVIDENCE_MISMATCH");
  }
  if (JSON.stringify(input.receipt.question) !== JSON.stringify(input.question)) {
    throw new Error("ASK_TLDR_RELEASE_QUESTION_RECEIPT_MISMATCH");
  }
  const blockers: string[] = [];
  if (!input.factLock.passed) blockers.push("deterministic_fact_lock_failed");
  if (input.judge.verdict !== "pass") blockers.push("judge_below_threshold");
  if (!input.receipt.generationAllowed) blockers.push(input.receipt.generationBlockReason ?? "voice_receipt_blocked");
  const bindings = semanticBindings(input.writerOutput.evidenceIdsUsed, input.evidence);
  const packetWithoutHash = {
    schema: "ask-tldr-calibration-release-packet.v1" as const,
    generatedContent: true as const,
    runtimeEnabled: false as const,
    readerServingEnabled: false as const,
    ownerApproved: false as const,
    promotionAuthorized: false as const,
    releaseStatus: blockers.length ? "blocked" as const : "calibration_candidate" as const,
    blockers,
    question: input.question,
    answer: input.writerOutput.answer,
    answerSha256: sha256(input.writerOutput.answer),
    evidenceIdsUsed: [...input.writerOutput.evidenceIdsUsed],
    primaryEvidenceId: input.writerOutput.primaryEvidenceId,
    whyNowEvidenceId: input.writerOutput.whyNowEvidenceId,
    sourceBindings: {
      writerRequestSha256: input.writerRequest.requestSha256,
      judgeRequestSha256: input.judgeRequest.requestSha256,
      voiceReceiptSha256: input.receipt.receiptSha256,
      ...bindings
    },
    deterministicFactLock: {
      passed: input.factLock.passed,
      checkedEvidenceIds: [...input.factLock.checkedEvidenceIds],
      issueCount: input.factLock.issues.length
    },
    judge: input.judge
  };
  return { ...packetWithoutHash, packetSha256: sha256Json(packetWithoutHash) };
}
