import assert from "node:assert/strict";
import fs from "node:fs";
import {
  askTldrAnswerCalibrationScope,
  askTldrClassifierCalibrationScope,
  runAskTldrClassifierCalibration,
  runPreparedAskTldrAnswerCalibration
} from "../api/_lib/ask-tldr-provider.ts";
import { prepareEvergreenAskTldrCalibration } from "../api/_lib/ask-tldr-pipeline.ts";
import { ASK_TLDR_JUDGE_CATEGORIES } from "../api/_lib/ask-tldr-judge.ts";

const readJson = (relativePath) => JSON.parse(fs.readFileSync(new URL(relativePath, import.meta.url), "utf8"));
const model = readJson("../config/ask-tldr/answer-model-v1.json");
const career = readJson("../config/ask-tldr/pillars/career.json");
const reportWindow = readJson("./fixtures/marie-report-frozen-facts.json");
const now = new Date("2026-09-05T12:00:00Z");
const recognition = career.questions.find((question) => question.id === "career.recognition");
assert.ok(recognition);

const classifierQuestion = "Why am I doing all the work and nobody notices?";
const classifierScope = askTldrClassifierCalibrationScope({ pillarId: career.id, questionText: classifierQuestion });
const classifierCalls = [];
const classifierResult = await runAskTldrClassifierCalibration({
  pillar: career,
  questionText: classifierQuestion,
  authorization: { authorized: true, purpose: "ask_tldr_calibration", scopeSha256: classifierScope, maxCalls: 1 },
  callModel: async (request) => {
    classifierCalls.push(request);
    assert.equal(request.role, "classifier");
    assert.doesNotMatch(request.prompt, /FROZEN_FACTS|REPORT_WINDOW|TOP_TRANSITS|NATAL_CHART|EVIDENCE_CANDIDATES|KNOWLEDGE_IDS/u);
    return {
      provider: "fixture",
      model: "fixture-classifier",
      responseId: "classifier-1",
      usage: { inputTokens: 10, outputTokens: 5, totalTokens: 15 },
      value: {
        route: "in_pillar",
        primaryIntent: "recognition",
        secondaryIntents: ["credit", "workload"],
        questionTypes: ["current_state", "guidance"],
        timeWindow: "1_month",
        confidence: "high",
        reason: "The user is asking why their work is not being noticed and wants help with recognition."
      }
    };
  }
});
assert.equal(classifierCalls.length, 1);
assert.equal(classifierResult.callsUsed, 1);
assert.equal(classifierResult.runtimeEnabled, false);
assert.equal(classifierResult.classification.primaryIntent, "recognition");
assert.equal(classifierResult.provider, "fixture");

let unauthorizedClassifierCalls = 0;
await assert.rejects(() => runAskTldrClassifierCalibration({
  pillar: career,
  questionText: classifierQuestion,
  authorization: { authorized: true, purpose: "ask_tldr_calibration", scopeSha256: "wrong", maxCalls: 1 },
  callModel: async () => {
    unauthorizedClassifierCalls += 1;
    return { value: {} };
  }
}), /ASK_TLDR_PROVIDER_AUTHORIZATION_SCOPE_MISMATCH/u);
assert.equal(unauthorizedClassifierCalls, 0, "Wrong classifier scope must fail before any provider callback.");

const prepared = prepareEvergreenAskTldrCalibration({ model, pillar: career, question: recognition, reportWindow, now });
assert.equal(prepared.preparationAllowed, true, prepared.preparationBlockReason);
assert.ok(prepared.writerRequest);
const answerScope = askTldrAnswerCalibrationScope(prepared);
const primaryId = prepared.writerRequest.primaryEvidenceId;
const goodWriterValue = {
  answer: "Recognition is more available when you put the work where people can see and respond to it. Ask for the credit, title, or authority that matches work you can already point to instead of adding more responsibility just to prove the case.\n\nWhy the astrology points here\n\nJupiter opposing your Midheaven around September 15 enlarges questions of public role, recognition, and how much professional territory you are ready to occupy. The useful part of that pressure is not simply being more visible; it is noticing where growth gives you more leverage and where it only gives you more work.",
  evidenceIdsUsed: [primaryId],
  primaryEvidenceId: primaryId,
  whyNowEvidenceId: primaryId,
  decisionOutcomeClaimed: false
};
const revisedWriterValue = {
  ...goodWriterValue,
  answer: "Recognition is more useful when it changes what you can actually own. If your work is already visible, use this period to connect a result you can point to with a specific change in title, credit, authority, or scope instead of accepting a larger workload as a substitute for advancement.\n\nWhy the astrology points here\n\nJupiter opposing your Midheaven around September 15 amplifies the public-role question itself: how much space the work takes up, how much of it is clearly yours, and what comes with increased visibility. That makes the distinction between more responsibility and more leverage especially important now."
};
const perfectScores = Object.fromEntries(ASK_TLDR_JUDGE_CATEGORIES.map((category) => [category, 4]));
const roles = [];
const goodResult = await runPreparedAskTldrAnswerCalibration({
  prepared,
  authorization: { authorized: true, purpose: "ask_tldr_calibration", scopeSha256: answerScope, maxCalls: 2 },
  callModel: async (request) => {
    roles.push(request.role);
    if (request.role === "writer") {
      return { provider: "fixture", model: "fixture-writer", responseId: "writer-1", value: goodWriterValue };
    }
    if (request.role === "judge") {
      return {
        provider: "fixture",
        model: "fixture-judge",
        responseId: "judge-1",
        value: {
          scores: perfectScores,
          timingApplicability: { applicable: true, reason: "The answer uses an upcoming exact transit and names its timing." },
          findings: []
        }
      };
    }
    throw new Error(`Unexpected role ${request.role}`);
  }
});
assert.deepEqual(roles, ["writer", "judge"]);
assert.equal(goodResult.callsUsed, 2);
assert.equal(goodResult.status, "calibration_candidate");
assert.equal(goodResult.runtimeEnabled, false);
assert.equal(goodResult.revision, null);
assert.equal(goodResult.releasePacket.readerServingEnabled, false);
assert.equal(goodResult.releasePacket.ownerApproved, false);
assert.equal(goodResult.releasePacket.promotionAuthorized, false);

const ownerPassageId = prepared.voiceReceipt.ownerPassages[0]?.id;
assert.ok(ownerPassageId);
const belowThresholdScores = { ...perfectScores, owner_voice: 3 };
const revisionRoles = [];
let writerPass = 0;
let judgePass = 0;
const revisedResult = await runPreparedAskTldrAnswerCalibration({
  prepared,
  authorization: { authorized: true, purpose: "ask_tldr_calibration", scopeSha256: answerScope, maxCalls: 4 },
  callModel: async (request) => {
    revisionRoles.push(request.role);
    if (request.role === "writer") {
      writerPass += 1;
      if (writerPass === 2) {
        assert.match(request.prompt, /CORRECTIVE REVISION PASS/u);
        assert.match(request.prompt, /JUDGE FINDINGS TO FIX/u);
      }
      return {
        provider: "fixture",
        model: "fixture-writer",
        responseId: `writer-${writerPass}`,
        value: writerPass === 1 ? goodWriterValue : revisedWriterValue
      };
    }
    if (request.role === "judge") {
      judgePass += 1;
      return {
        provider: "fixture",
        model: "fixture-judge",
        responseId: `judge-${judgePass}`,
        value: judgePass === 1 ? {
          scores: belowThresholdScores,
          timingApplicability: { applicable: true, reason: "The answer uses the supplied upcoming transit timing." },
          findings: [{
            category: "owner_voice",
            location: "overall structure",
            finding: "The draft reads like distilled coaching copy and needs a more human decision point.",
            evidenceIds: [],
            ownerPassageIds: [ownerPassageId]
          }]
        } : {
          scores: perfectScores,
          timingApplicability: { applicable: true, reason: "The revised answer keeps the supplied timing and makes the decision point concrete." },
          findings: []
        }
      };
    }
    throw new Error(`Unexpected role ${request.role}`);
  }
});
assert.deepEqual(revisionRoles, ["writer", "judge", "writer", "judge"]);
assert.deepEqual(revisedResult.calls.map((call) => call.stage), ["initial_writer", "initial_judge", "revision_writer", "revision_judge"]);
assert.equal(revisedResult.callsUsed, 4);
assert.equal(revisedResult.revision?.attempted, true);
assert.equal(revisedResult.revision?.trigger, "judge_below_threshold");
assert.equal(revisedResult.revision?.initialJudge.verdict, "below_threshold");
assert.equal(revisedResult.writerOutput.answer, revisedWriterValue.answer);
assert.equal(revisedResult.judge.verdict, "pass");
assert.equal(revisedResult.status, "calibration_candidate");

let wrongScopeCalls = 0;
await assert.rejects(() => runPreparedAskTldrAnswerCalibration({
  prepared,
  authorization: { authorized: true, purpose: "ask_tldr_calibration", scopeSha256: "wrong", maxCalls: 4 },
  callModel: async () => {
    wrongScopeCalls += 1;
    return { value: {} };
  }
}), /ASK_TLDR_PROVIDER_AUTHORIZATION_SCOPE_MISMATCH/u);
assert.equal(wrongScopeCalls, 0, "Wrong answer scope must fail before any provider callback.");

let callCapCalls = 0;
await assert.rejects(() => runPreparedAskTldrAnswerCalibration({
  prepared,
  authorization: { authorized: true, purpose: "ask_tldr_calibration", scopeSha256: answerScope, maxCalls: 1 },
  callModel: async () => {
    callCapCalls += 1;
    return { value: {} };
  }
}), /ASK_TLDR_PROVIDER_AUTHORIZATION_CALL_CAP/u);
assert.equal(callCapCalls, 0, "Insufficient call authorization must fail before any provider callback.");

const badFactRoles = [];
const badFactResult = await runPreparedAskTldrAnswerCalibration({
  prepared,
  authorization: { authorized: true, purpose: "ask_tldr_calibration", scopeSha256: answerScope, maxCalls: 4 },
  callModel: async (request) => {
    badFactRoles.push(request.role);
    if (request.role !== "writer") throw new Error("Judge must not be called after deterministic fact failure.");
    return {
      value: {
        ...goodWriterValue,
        answer: goodWriterValue.answer.replace("September 15", "September 16")
      }
    };
  }
});
assert.deepEqual(badFactRoles, ["writer"]);
assert.equal(badFactResult.callsUsed, 1);
assert.equal(badFactResult.status, "blocked");
assert.equal(badFactResult.blockReason, "deterministic_fact_lock_failed");
assert.equal(badFactResult.judgeRequest, null);
assert.equal(badFactResult.judge, null);
assert.equal(badFactResult.releasePacket, null);

console.log("Ask TLDR provider harness passed: exact authorization scope gates every injected provider call, classifier uses one call, a passing draft uses writer+judge, a judge-blocked draft gets one bounded rewrite and final re-judge, astrology must drive both drafts, and factual failure stops before the judge call.");
