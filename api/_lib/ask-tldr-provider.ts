import { createHash } from "node:crypto";
import {
  askTldrClassifierPrompt,
  askTldrClassifierSchema,
  assertAskTldrClassifierPromptContainsNoAstrologyEvidence,
  validateAskTldrClassifierResult,
  type AskTldrClassifierResult
} from "./ask-tldr-classifier.js";
import type { AskTldrPillarDefinition } from "./ask-tldr-model.js";
import type { AskTldrPreparedCalibration } from "./ask-tldr-pipeline.js";
import { validateAskTldrWriterOutput } from "./ask-tldr-writer.js";
import { verifyAskTldrFactLock } from "./ask-tldr-fact-lock.js";
import { validateAskTldrJudgeOutput } from "./ask-tldr-judge.js";
import { buildQuestionBoundAskTldrJudgeRequest } from "./ask-tldr-question-bound-judge.js";
import { buildQuestionBoundAskTldrCalibrationReleasePacket } from "./ask-tldr-question-bound-release.js";

export type AskTldrProviderRole = "classifier" | "writer" | "judge";
export type AskTldrProviderUsage = {
  inputTokens?: number;
  cachedInputTokens?: number;
  outputTokens?: number;
  totalTokens?: number;
};
export type AskTldrProviderCall = (input: {
  role: AskTldrProviderRole;
  prompt: string;
  schemaName: string;
  schema: Record<string, unknown>;
}) => Promise<{ value: unknown; provider?: string; model?: string; responseId?: string; usage?: AskTldrProviderUsage }>;

export type AskTldrCalibrationAuthorization = {
  authorized: true;
  purpose: "ask_tldr_calibration";
  scopeSha256: string;
  maxCalls: number;
};

function sha256(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

function sha256Json(value: unknown) {
  return sha256(JSON.stringify(value));
}

export function askTldrClassifierCalibrationScope(input: { pillarId: string; questionText: string }) {
  return sha256Json({ purpose: "ask_tldr_classifier_calibration", pillarId: input.pillarId, questionText: input.questionText.trim() });
}

export function askTldrAnswerCalibrationScope(prepared: AskTldrPreparedCalibration) {
  if (!prepared.writerRequest) throw new Error("ASK_TLDR_PROVIDER_PREPARATION_BLOCKED");
  return sha256Json({ purpose: "ask_tldr_answer_calibration", writerRequestSha256: prepared.writerRequest.requestSha256 });
}

function assertAuthorization(input: {
  authorization: AskTldrCalibrationAuthorization;
  expectedScopeSha256: string;
  requiredCalls: number;
}) {
  const auth = input.authorization;
  if (auth?.authorized !== true || auth.purpose !== "ask_tldr_calibration") {
    throw new Error("ASK_TLDR_PROVIDER_AUTHORIZATION_REQUIRED");
  }
  if (auth.scopeSha256 !== input.expectedScopeSha256) {
    throw new Error("ASK_TLDR_PROVIDER_AUTHORIZATION_SCOPE_MISMATCH");
  }
  if (!Number.isInteger(auth.maxCalls) || auth.maxCalls < input.requiredCalls) {
    throw new Error(`ASK_TLDR_PROVIDER_AUTHORIZATION_CALL_CAP: requires ${input.requiredCalls}`);
  }
}

export async function runAskTldrClassifierCalibration(input: {
  pillar: AskTldrPillarDefinition;
  questionText: string;
  authorization: AskTldrCalibrationAuthorization;
  callModel: AskTldrProviderCall;
}) {
  const expectedScopeSha256 = askTldrClassifierCalibrationScope({ pillarId: input.pillar.id, questionText: input.questionText });
  assertAuthorization({ authorization: input.authorization, expectedScopeSha256, requiredCalls: 1 });
  const prompt = askTldrClassifierPrompt({ pillar: input.pillar, questionText: input.questionText });
  assertAskTldrClassifierPromptContainsNoAstrologyEvidence(prompt);
  const response = await input.callModel({
    role: "classifier",
    prompt,
    schemaName: "ask_tldr_intent_classifier_v1",
    schema: askTldrClassifierSchema(input.pillar) as unknown as Record<string, unknown>
  });
  const classification = validateAskTldrClassifierResult({ pillar: input.pillar, value: response.value });
  return {
    schema: "ask-tldr-classifier-calibration-result.v1" as const,
    runtimeEnabled: false as const,
    scopeSha256: expectedScopeSha256,
    callsUsed: 1,
    classification,
    provider: response.provider ?? null,
    model: response.model ?? null,
    responseId: response.responseId ?? null,
    usage: response.usage ?? null
  };
}

export async function runPreparedAskTldrAnswerCalibration(input: {
  prepared: AskTldrPreparedCalibration;
  authorization: AskTldrCalibrationAuthorization;
  callModel: AskTldrProviderCall;
}) {
  if (!input.prepared.preparationAllowed || !input.prepared.writerRequest) {
    throw new Error(`ASK_TLDR_PROVIDER_PREPARATION_BLOCKED: ${input.prepared.preparationBlockReason ?? "unknown"}`);
  }
  const expectedScopeSha256 = askTldrAnswerCalibrationScope(input.prepared);
  assertAuthorization({ authorization: input.authorization, expectedScopeSha256, requiredCalls: 2 });
  const calls = [] as Array<{ role: AskTldrProviderRole; provider: string | null; model: string | null; responseId: string | null; usage: AskTldrProviderUsage | null }>;
  const writerResponse = await input.callModel({
    role: "writer",
    prompt: `${input.prepared.writerRequest.instructions}\n\n${input.prepared.writerRequest.input}`,
    schemaName: "ask_tldr_writer_v1",
    schema: input.prepared.writerRequest.outputSchema
  });
  calls.push({
    role: "writer",
    provider: writerResponse.provider ?? null,
    model: writerResponse.model ?? null,
    responseId: writerResponse.responseId ?? null,
    usage: writerResponse.usage ?? null
  });
  const writerOutput = validateAskTldrWriterOutput({
    request: input.prepared.writerRequest,
    question: input.prepared.questionBoundPacket.question,
    evidence: input.prepared.questionBoundPacket.evidence,
    value: writerResponse.value
  });
  const factLock = verifyAskTldrFactLock({
    output: writerOutput,
    evidence: input.prepared.questionBoundPacket.evidence
  });
  if (!factLock.passed) {
    return {
      schema: "ask-tldr-provider-calibration-result.v1" as const,
      runtimeEnabled: false as const,
      scopeSha256: expectedScopeSha256,
      callsUsed: 1,
      calls,
      writerOutput,
      factLock,
      judgeRequest: null,
      judge: null,
      releasePacket: null,
      status: "blocked" as const,
      blockReason: "deterministic_fact_lock_failed"
    };
  }
  const judgeRequest = buildQuestionBoundAskTldrJudgeRequest({
    writerRequest: input.prepared.writerRequest,
    writerOutput,
    evidence: input.prepared.questionBoundPacket.evidence,
    receipt: input.prepared.voiceReceipt,
    relevanceReceipt: input.prepared.relevanceReceipt,
    factLock
  });
  const judgeResponse = await input.callModel({
    role: "judge",
    prompt: `${judgeRequest.instructions}\n\n${judgeRequest.input}`,
    schemaName: "ask_tldr_answer_judge_v1",
    schema: judgeRequest.outputSchema
  });
  calls.push({
    role: "judge",
    provider: judgeResponse.provider ?? null,
    model: judgeResponse.model ?? null,
    responseId: judgeResponse.responseId ?? null,
    usage: judgeResponse.usage ?? null
  });
  const judge = validateAskTldrJudgeOutput(judgeRequest, judgeResponse.value);
  const releasePacket = buildQuestionBoundAskTldrCalibrationReleasePacket({
    question: input.prepared.questionBoundPacket.question,
    writerRequest: input.prepared.writerRequest,
    writerOutput,
    evidence: input.prepared.questionBoundPacket.evidence,
    receipt: input.prepared.voiceReceipt,
    relevanceReceipt: input.prepared.relevanceReceipt,
    factLock,
    judgeRequest,
    judge
  });
  return {
    schema: "ask-tldr-provider-calibration-result.v1" as const,
    runtimeEnabled: false as const,
    scopeSha256: expectedScopeSha256,
    callsUsed: 2,
    calls,
    writerOutput,
    factLock,
    judgeRequest,
    judge,
    releasePacket,
    status: releasePacket.releaseStatus,
    blockReason: releasePacket.releaseStatus === "blocked" ? releasePacket.blockers.join(",") : null
  };
}
