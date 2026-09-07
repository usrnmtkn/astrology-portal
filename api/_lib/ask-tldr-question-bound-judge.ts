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

function words(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function questionTypes(receipt: AskTldrVoiceEvidenceReceipt) {
  return Array.isArray(receipt.question.questionTypes)
    ? receipt.question.questionTypes.filter((value): value is string => typeof value === "string")
    : [];
}

function directionalQuestion(receipt: AskTldrVoiceEvidenceReceipt) {
  const types = new Set(questionTypes(receipt));
  return types.has("direction") || types.has("guidance") || types.has("decision");
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
  const isDirectional = directionalQuestion(input.receipt);
  const pillarId = words(input.receipt.question.pillarId);
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
  const instructions = [
    base.instructions,
    "For question_answering and astrology_fidelity, also verify that the reader-facing connection between each used factor and the question follows GOVERNED QUESTION RELEVANCE EVIDENCE rather than an inferred generic house, angle, or pillar meaning.",
    "ASTROLOGY-VALUE STANDARD: A polished piece of common-sense coaching with astrology attached afterward is not a 4. For question_answering, astrology_fidelity, and practical_usefulness, require the chart factors to create the answer's central distinction, timing, or recommendation. The reader should understand what the astrology adds beyond advice they could have received without a chart.",
    "APPLICATION STANDARD FOR practical_usefulness: when the question asks for guidance, help, what to do, how to approach something, or decision support, a score of 4 requires a concrete decision, request, preparation step, boundary, question, or observable action the reader can actually apply. Abstract coaching verbs alone do not earn a 4 if the reader still has to translate them into the next step. Conditional domain examples are good when they clarify application without inventing personal events.",
    isDirectional
      ? "DIRECTIONAL SYNTHESIS STANDARD: A score of 4 for question_answering requires movement through time or state when the supplied evidence supports it: establish the current pattern or pressure, identify what is being amplified, redirected, exposed, or developed, and distinguish the kind of growth the astrology favors from a superficially larger version of the same problem. When two or more governed relevant factors are used, judge whether they form one coherent arc rather than a list of unrelated astrology facts."
      : "",
    pillarId === "career" && isDirectional
      ? "CAREER DIRECTION STANDARD: Prefer specific distinctions involving scope, authority, ownership, leverage, resources, responsibility, visibility, recognition, and control of the outcome. Do not reward generic language about worth, scrutiny, confidence, or ambition when the supplied astrology supports a more concrete professional distinction. Check that the answer distinguishes responsibility growing by itself from responsibility growing alongside authority, resources, ownership, or recognition."
      : "",
    "CHART-RATIONALE STANDARD: The answer must end with a paragraph beginning exactly 'Why your chart points here:' and the paragraph must explain the mechanism behind the recommendation in 2–4 sentences. Merely naming the transit, eclipse, house, or date is insufficient. If the chart rationale could be deleted without changing the logic of the advice, astrology is functioning decoratively and the answer is below release quality.",
    "HISTORICAL-LOOKBACK STANDARD: Do not reward or permit claims about a previous occurrence, recurrence, or 'last time this happened' unless that historical analogue is explicitly supplied in calculated evidence. Absence of a historical analogue is not a defect when none was supplied."
  ].filter(Boolean).join("\n");
  const withoutHash = {
    ...base,
    instructions,
    input: `${base.input}\n\n${relevanceSection}`
  };
  const requestWithoutHash = Object.fromEntries(Object.entries(withoutHash).filter(([key]) => key !== "requestSha256"));
  return { ...requestWithoutHash, requestSha256: sha256Json(requestWithoutHash) } as AskTldrJudgeRequest;
}