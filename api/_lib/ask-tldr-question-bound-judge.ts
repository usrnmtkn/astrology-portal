import { createHash } from "node:crypto";
import type { AskTldrQuestionRelevantFactor } from "./ask-tldr-relevance-bound.js";
import {
  assertAskTldrQuestionRelevanceReceipt,
  type AskTldrQuestionRelevanceReceipt
} from "./ask-tldr-relevance-receipt.js";
import type { AskTldrVoiceEvidenceReceipt } from "./ask-tldr-voice-receipt.js";
import type { AskTldrWriterOutput, AskTldrWriterRequest } from "./ask-tldr-writer.js";
import {
  buildAskTldrJudgeRequest,
  type AskTldrJudgeRequest
} from "./ask-tldr-judge.js";

function sha256(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

function sha256Json(value: unknown) {
  return sha256(JSON.stringify(value));
}

function usedRelevantFactors(input: {
  writerOutput: AskTldrWriterOutput;
  evidence: AskTldrQuestionRelevantFactor[];
  relevanceReceipt: AskTldrQuestionRelevanceReceipt;
}) {
  assertAskTldrQuestionRelevanceReceipt(input.relevanceReceipt);
  const eligible = new Set(input.relevanceReceipt.eligibleEvidenceIds);
  const byId = new Map(input.evidence.map((factor) => [factor.id, factor]));
  return input.writerOutput.evidenceIdsUsed.map((id) => {
    const factor = byId.get(id);
    if (!factor || !eligible.has(id)) throw new Error(`ASK_TLDR_JUDGE_RELEVANCE_EVIDENCE_NOT_ELIGIBLE: ${id}`);
    if (factor.governedMeaning.status !== "full" || factor.questionRelevance.status !== "full") {
      throw new Error(`ASK_TLDR_JUDGE_RELEVANCE_EVIDENCE_NOT_FULL: ${id}`);
    }
    return factor;
  });
}

export function buildQuestionBoundAskTldrJudgeRequest(input: {
  writerRequest: AskTldrWriterRequest;
  writerOutput: AskTldrWriterOutput;
  evidence: AskTldrQuestionRelevantFactor[];
  receipt: AskTldrVoiceEvidenceReceipt;
  relevanceReceipt: AskTldrQuestionRelevanceReceipt;
  factLock: { passed: boolean; issues: unknown[]; checkedEvidenceIds: string[] };
}): AskTldrJudgeRequest {
  const factors = usedRelevantFactors(input);
  const base = buildAskTldrJudgeRequest({
    writerRequest: input.writerRequest,
    writerOutput: input.writerOutput,
    evidence: factors,
    receipt: input.receipt,
    factLock: input.factLock
  });
  const relevanceSection = [
    "GOVERNED QUESTION RELEVANCE EVIDENCE",
    "Use this lane to judge whether the answer connects each astrology factor to the user's actual question for the supplied reason. Do not reward a broad pillar association that is absent from this evidence.",
    ...factors.flatMap((factor) => [
      `--- ${factor.role.toUpperCase()} RELEVANCE ${factor.id}`,
      JSON.stringify({
        matched: factor.questionRelevance.matched,
        canonicalIds: factor.questionRelevance.canonicalIds,
        packetSha256: factor.questionRelevance.packetSha256
      }, null, 2),
      factor.questionRelevance.promptEvidence ?? "NONE"
    ]),
    "QUESTION RELEVANCE RECEIPT",
    JSON.stringify({
      receiptSha256: input.relevanceReceipt.receiptSha256,
      eligibleEvidenceIds: input.relevanceReceipt.eligibleEvidenceIds,
      primaryEvidenceId: input.relevanceReceipt.primaryEvidenceId
    }, null, 2)
  ].join("\n");
  const withoutHash = {
    ...base,
    instructions: `${base.instructions}\nFor question_answering and astrology_fidelity, also verify that the reader-facing connection between each used factor and the question follows GOVERNED QUESTION RELEVANCE EVIDENCE rather than an inferred generic house, angle, or pillar meaning.`,
    input: `${base.input}\n\n${relevanceSection}`
  };
  const requestWithoutHash = Object.fromEntries(Object.entries(withoutHash).filter(([key]) => key !== "requestSha256"));
  return { ...requestWithoutHash, requestSha256: sha256Json(requestWithoutHash) } as AskTldrJudgeRequest;
}
