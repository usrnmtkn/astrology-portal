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
import { validateAskTldrWriterOutput, type AskTldrWriterOutput } from "./ask-tldr-writer.js";
import { verifyAskTldrFactLock } from "./ask-tldr-fact-lock.js";
import { validateAskTldrJudgeOutput, type AskTldrJudgeResult } from "./ask-tldr-judge.js";
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

type CallStage = "classifier" | "initial_writer" | "initial_judge" | "revision_writer" | "revision_judge";
type CallRecord = {
  role: AskTldrProviderRole;
  stage: CallStage;
  provider: string | null;
  model: string | null;
  responseId: string | null;
  usage: AskTldrProviderUsage | null;
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

function recordCall(calls: CallRecord[], stage: CallStage, role: AskTldrProviderRole, response: Awaited<ReturnType<AskTldrProviderCall>>) {
  calls.push({
    role,
    stage,
    provider: response.provider ?? null,
    model: response.model ?? null,
    responseId: response.responseId ?? null,
    usage: response.usage ?? null
  });
}

function validateWriter(prepared: AskTldrPreparedCalibration, value: unknown) {
  if (!prepared.writerRequest) throw new Error("ASK_TLDR_PROVIDER_PREPARATION_BLOCKED");
  const writerOutput = validateAskTldrWriterOutput({
    request: prepared.writerRequest,
    question: prepared.questionBoundPacket.question,
    evidence: prepared.questionBoundPacket.evidence,
    value
  });
  const factLock = verifyAskTldrFactLock({
    output: writerOutput,
    evidence: prepared.questionBoundPacket.evidence
  });
  return { writerOutput, factLock };
}

async function judgeWriter(input: {
  prepared: AskTldrPreparedCalibration;
  writerOutput: AskTldrWriterOutput;
  factLock: ReturnType<typeof verifyAskTldrFactLock>;
  stage: "initial_judge" | "revision_judge";
  calls: CallRecord[];
  callModel: AskTldrProviderCall;
}) {
  if (!input.prepared.writerRequest) throw new Error("ASK_TLDR_PROVIDER_PREPARATION_BLOCKED");
  const judgeRequest = buildQuestionBoundAskTldrJudgeRequest({
    writerRequest: input.prepared.writerRequest,
    writerOutput: input.writerOutput,
    evidence: input.prepared.questionBoundPacket.evidence,
    receipt: input.prepared.voiceReceipt,
    relevanceReceipt: input.prepared.relevanceReceipt,
    factLock: input.factLock
  });
  const judgeResponse = await input.callModel({
    role: "judge",
    prompt: `${judgeRequest.instructions}\n\n${judgeRequest.input}`,
    schemaName: "ask_tldr_answer_judge_v1",
    schema: judgeRequest.outputSchema
  });
  recordCall(input.calls, input.stage, "judge", judgeResponse);
  const judge = validateAskTldrJudgeOutput(judgeRequest, judgeResponse.value);
  const releasePacket = buildQuestionBoundAskTldrCalibrationReleasePacket({
    question: input.prepared.questionBoundPacket.question,
    writerRequest: input.prepared.writerRequest,
    writerOutput: input.writerOutput,
    evidence: input.prepared.questionBoundPacket.evidence,
    receipt: input.prepared.voiceReceipt,
    relevanceReceipt: input.prepared.relevanceReceipt,
    factLock: input.factLock,
    judgeRequest,
    judge
  });
  return { judgeRequest, judge, releasePacket };
}

function revisionPrompt(input: {
  prepared: AskTldrPreparedCalibration;
  initialWriterOutput: AskTldrWriterOutput;
  initialJudge: AskTldrJudgeResult;
}) {
  if (!input.prepared.writerRequest) throw new Error("ASK_TLDR_PROVIDER_PREPARATION_BLOCKED");
  return [
    input.prepared.writerRequest.instructions,
    "",
    input.prepared.writerRequest.input,
    "",
    "CORRECTIVE REVISION PASS",
    "The first draft was blocked by the release judge. Rewrite the reader-facing answer once from the same governed evidence. Do not defend the first draft and do not mention the judge, scores, or revision process.",
    "Resolve every supplied judge finding. Preserve all correct astrology facts, dates, evidence IDs, and boundary constraints. Do not introduce a new chart fact, event, motive, outcome, or timing window.",
    "Return a complete replacement answer, not a patch or commentary on the previous version.",
    "",
    "FIRST DRAFT",
    input.initialWriterOutput.answer,
    "",
    "JUDGE FINDINGS TO FIX",
    JSON.stringify({
      scores: input.initialJudge.scores,
      overall: input.initialJudge.overall,
      findings: input.initialJudge.findings
    }, null, 2)
  ].join("\n");
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
  const calls: CallRecord[] = [];

  const writerResponse = await input.callModel({
    role: "writer",
    prompt: `${input.prepared.writerRequest.instructions}\n\n${input.prepared.writerRequest.input}`,
    schemaName: "ask_tldr_writer_v1",
    schema: input.prepared.writerRequest.outputSchema
  });
  recordCall(calls, "initial_writer", "writer", writerResponse);
  const initial = validateWriter(input.prepared, writerResponse.value);
  if (!initial.factLock.passed) {
    return {
      schema: "ask-tldr-provider-calibration-result.v2" as const,
      runtimeEnabled: false as const,
      scopeSha256: expectedScopeSha256,
      callsUsed: calls.length,
      calls,
      writerOutput: initial.writerOutput,
      factLock: initial.factLock,
      judgeRequest: null,
      judge: null,
      releasePacket: null,
      revision: null,
      status: "blocked" as const,
      blockReason: "deterministic_fact_lock_failed"
    };
  }

  const initialJudgment = await judgeWriter({
    prepared: input.prepared,
    writerOutput: initial.writerOutput,
    factLock: initial.factLock,
    stage: "initial_judge",
    calls,
    callModel: input.callModel
  });
  if (initialJudgment.releasePacket.releaseStatus !== "blocked") {
    return {
      schema: "ask-tldr-provider-calibration-result.v2" as const,
      runtimeEnabled: false as const,
      scopeSha256: expectedScopeSha256,
      callsUsed: calls.length,
      calls,
      writerOutput: initial.writerOutput,
      factLock: initial.factLock,
      judgeRequest: initialJudgment.judgeRequest,
      judge: initialJudgment.judge,
      releasePacket: initialJudgment.releasePacket,
      revision: null,
      status: initialJudgment.releasePacket.releaseStatus,
      blockReason: null
    };
  }

  if (input.authorization.maxCalls < 4) {
    return {
      schema: "ask-tldr-provider-calibration-result.v2" as const,
      runtimeEnabled: false as const,
      scopeSha256: expectedScopeSha256,
      callsUsed: calls.length,
      calls,
      writerOutput: initial.writerOutput,
      factLock: initial.factLock,
      judgeRequest: initialJudgment.judgeRequest,
      judge: initialJudgment.judge,
      releasePacket: initialJudgment.releasePacket,
      revision: { attempted: false as const, reason: "authorization_call_cap_below_4" as const },
      status: "blocked" as const,
      blockReason: initialJudgment.releasePacket.blockers.join(",")
    };
  }

  assertAuthorization({ authorization: input.authorization, expectedScopeSha256, requiredCalls: 4 });
  const revisionResponse = await input.callModel({
    role: "writer",
    prompt: revisionPrompt({
      prepared: input.prepared,
      initialWriterOutput: initial.writerOutput,
      initialJudge: initialJudgment.judge
    }),
    schemaName: "ask_tldr_writer_v1",
    schema: input.prepared.writerRequest.outputSchema
  });
  recordCall(calls, "revision_writer", "writer", revisionResponse);
  const revised = validateWriter(input.prepared, revisionResponse.value);
  const revisionBase = {
    attempted: true as const,
    trigger: "judge_below_threshold" as const,
    initialWriterOutput: initial.writerOutput,
    initialFactLock: initial.factLock,
    initialJudge: initialJudgment.judge,
    initialReleasePacket: initialJudgment.releasePacket
  };

  if (!revised.factLock.passed) {
    return {
      schema: "ask-tldr-provider-calibration-result.v2" as const,
      runtimeEnabled: false as const,
      scopeSha256: expectedScopeSha256,
      callsUsed: calls.length,
      calls,
      writerOutput: revised.writerOutput,
      factLock: revised.factLock,
      judgeRequest: null,
      judge: null,
      releasePacket: null,
      revision: revisionBase,
      status: "blocked" as const,
      blockReason: "revision_deterministic_fact_lock_failed"
    };
  }

  const finalJudgment = await judgeWriter({
    prepared: input.prepared,
    writerOutput: revised.writerOutput,
    factLock: revised.factLock,
    stage: "revision_judge",
    calls,
    callModel: input.callModel
  });
  return {
    schema: "ask-tldr-provider-calibration-result.v2" as const,
    runtimeEnabled: false as const,
    scopeSha256: expectedScopeSha256,
    callsUsed: calls.length,
    calls,
    writerOutput: revised.writerOutput,
    factLock: revised.factLock,
    judgeRequest: finalJudgment.judgeRequest,
    judge: finalJudgment.judge,
    releasePacket: finalJudgment.releasePacket,
    revision: revisionBase,
    status: finalJudgment.releasePacket.releaseStatus,
    blockReason: finalJudgment.releasePacket.releaseStatus === "blocked"
      ? finalJudgment.releasePacket.blockers.join(",")
      : null
  };
}