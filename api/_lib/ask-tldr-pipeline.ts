import {
  compileEvergreenAskPlan,
  compileFreeTextAskPlan,
  type AskTldrAnswerModelConfig,
  type AskTldrIntentClassification,
  type AskTldrPillarDefinition,
  type AskTldrQuestionDefinition
} from "./ask-tldr-model.js";
import { applyAskTldrFreeTextFocus } from "./ask-tldr-free-text-focus.js";
import { buildQuestionFocusedAskTldrAnswerPacket } from "./ask-tldr-relevance.js";
import {
  askTldrEvidenceFromPersonalTiming,
  askTldrEvidenceFromReportWindow,
  combineAskTldrCalculatedEvidence
} from "./ask-tldr-evidence-adapter.js";
import { buildAskTldrGovernedAnswerPacket } from "./ask-tldr-governed-evidence.js";
import { buildAskTldrVoiceEvidenceReceipt } from "./ask-tldr-voice-receipt.js";
import { buildAskTldrWriterRequest, validateAskTldrWriterOutput } from "./ask-tldr-writer.js";
import { verifyAskTldrFactLock } from "./ask-tldr-fact-lock.js";
import { buildAskTldrJudgeRequest, validateAskTldrJudgeOutput } from "./ask-tldr-judge.js";
import { buildAskTldrCalibrationReleasePacket } from "./ask-tldr-release.js";

type AskPlan = ReturnType<typeof compileEvergreenAskPlan> | ReturnType<typeof compileFreeTextAskPlan>;

export type AskTldrPreparedCalibration = {
  schema: "ask-tldr-prepared-calibration.v1";
  runtimeEnabled: false;
  source: "evergreen" | "free_text";
  plan: AskPlan;
  candidateCount: number;
  rankedPacket: ReturnType<typeof buildQuestionFocusedAskTldrAnswerPacket>;
  governedPacket: ReturnType<typeof buildAskTldrGovernedAnswerPacket>;
  voiceReceipt: ReturnType<typeof buildAskTldrVoiceEvidenceReceipt>;
  writerRequest: ReturnType<typeof buildAskTldrWriterRequest> | null;
  preparationAllowed: boolean;
  preparationBlockReason: string | null;
};

function prepareFromPlan(input: {
  source: "evergreen" | "free_text";
  model: AskTldrAnswerModelConfig;
  plan: AskPlan;
  personalTiming?: unknown;
  reportWindow?: unknown;
  now?: Date;
}): AskTldrPreparedCalibration {
  const now = input.now ?? new Date();
  const personal = input.personalTiming == null ? [] : askTldrEvidenceFromPersonalTiming(input.personalTiming);
  const future = input.reportWindow == null ? [] : askTldrEvidenceFromReportWindow(input.reportWindow, now);
  const candidates = combineAskTldrCalculatedEvidence(personal, future);
  const rankedPacket = buildQuestionFocusedAskTldrAnswerPacket({ model: input.model, plan: input.plan, candidates, now });
  const governedPacket = buildAskTldrGovernedAnswerPacket(rankedPacket);
  const voiceReceipt = buildAskTldrVoiceEvidenceReceipt({
    question: governedPacket.question,
    evidence: governedPacket.evidence,
    governedGenerationAllowed: governedPacket.generationAllowed,
    governedGenerationBlockReason: governedPacket.generationBlockReason
  });
  let writerRequest: ReturnType<typeof buildAskTldrWriterRequest> | null = null;
  let preparationBlockReason: string | null = null;
  if (governedPacket.generationAllowed && voiceReceipt.generationAllowed) {
    writerRequest = buildAskTldrWriterRequest({ packet: governedPacket, receipt: voiceReceipt });
  } else {
    preparationBlockReason = governedPacket.generationBlockReason
      ?? voiceReceipt.generationBlockReason
      ?? "ASK_TLDR_PREPARATION_BLOCKED";
  }
  return {
    schema: "ask-tldr-prepared-calibration.v1",
    runtimeEnabled: false,
    source: input.source,
    plan: input.plan,
    candidateCount: candidates.length,
    rankedPacket,
    governedPacket,
    voiceReceipt,
    writerRequest,
    preparationAllowed: writerRequest !== null,
    preparationBlockReason
  };
}

export function prepareEvergreenAskTldrCalibration(input: {
  model: AskTldrAnswerModelConfig;
  pillar: AskTldrPillarDefinition;
  question: AskTldrQuestionDefinition;
  personalTiming?: unknown;
  reportWindow?: unknown;
  now?: Date;
}) {
  const plan = compileEvergreenAskPlan({ model: input.model, pillar: input.pillar, question: input.question });
  return prepareFromPlan({
    source: "evergreen",
    model: input.model,
    plan,
    personalTiming: input.personalTiming,
    reportWindow: input.reportWindow,
    now: input.now
  });
}

export function prepareFreeTextAskTldrCalibration(input: {
  model: AskTldrAnswerModelConfig;
  pillar: AskTldrPillarDefinition;
  questionText: string;
  classification: AskTldrIntentClassification;
  personalTiming?: unknown;
  reportWindow?: unknown;
  now?: Date;
}) {
  const basePlan = compileFreeTextAskPlan({
    model: input.model,
    pillarId: input.pillar.id,
    questionText: input.questionText,
    classification: input.classification
  });
  const plan = applyAskTldrFreeTextFocus({
    plan: basePlan,
    pillar: input.pillar,
    classification: input.classification
  });
  return prepareFromPlan({
    source: "free_text",
    model: input.model,
    plan,
    personalTiming: input.personalTiming,
    reportWindow: input.reportWindow,
    now: input.now
  });
}

export function finalizeAskTldrCalibration(input: {
  prepared: AskTldrPreparedCalibration;
  writerValue: unknown;
  judgeValue: unknown;
}) {
  if (!input.prepared.preparationAllowed || !input.prepared.writerRequest) {
    throw new Error(`ASK_TLDR_FINALIZE_PREPARATION_BLOCKED: ${input.prepared.preparationBlockReason ?? "unknown"}`);
  }
  const writerOutput = validateAskTldrWriterOutput({
    request: input.prepared.writerRequest,
    question: input.prepared.governedPacket.question,
    evidence: input.prepared.governedPacket.evidence,
    value: input.writerValue
  });
  const factLock = verifyAskTldrFactLock({
    output: writerOutput,
    evidence: input.prepared.governedPacket.evidence
  });
  if (!factLock.passed) {
    return {
      schema: "ask-tldr-finalized-calibration.v1" as const,
      runtimeEnabled: false as const,
      writerOutput,
      factLock,
      judgeRequest: null,
      judge: null,
      releasePacket: null,
      finalized: false,
      blockReason: "deterministic_fact_lock_failed"
    };
  }
  const judgeRequest = buildAskTldrJudgeRequest({
    writerRequest: input.prepared.writerRequest,
    writerOutput,
    evidence: input.prepared.governedPacket.evidence,
    receipt: input.prepared.voiceReceipt,
    factLock
  });
  const judge = validateAskTldrJudgeOutput(judgeRequest, input.judgeValue);
  const releasePacket = buildAskTldrCalibrationReleasePacket({
    question: input.prepared.governedPacket.question,
    writerRequest: input.prepared.writerRequest,
    writerOutput,
    evidence: input.prepared.governedPacket.evidence,
    receipt: input.prepared.voiceReceipt,
    factLock,
    judgeRequest,
    judge
  });
  return {
    schema: "ask-tldr-finalized-calibration.v1" as const,
    runtimeEnabled: false as const,
    writerOutput,
    factLock,
    judgeRequest,
    judge,
    releasePacket,
    finalized: true,
    blockReason: releasePacket.releaseStatus === "blocked" ? releasePacket.blockers.join(",") : null
  };
}
