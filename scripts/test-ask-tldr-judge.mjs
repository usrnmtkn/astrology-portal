import assert from "node:assert/strict";
import fs from "node:fs";
import { buildAskTldrAnswerPacket, compileEvergreenAskPlan } from "../api/_lib/ask-tldr-model.ts";
import { askTldrEvidenceFromReportWindow } from "../api/_lib/ask-tldr-evidence-adapter.ts";
import { buildAskTldrGovernedAnswerPacket } from "../api/_lib/ask-tldr-governed-evidence.ts";
import { buildAskTldrVoiceEvidenceReceipt } from "../api/_lib/ask-tldr-voice-receipt.ts";
import { buildAskTldrWriterRequest, validateAskTldrWriterOutput } from "../api/_lib/ask-tldr-writer.ts";
import { verifyAskTldrFactLock } from "../api/_lib/ask-tldr-fact-lock.ts";
import {
  ASK_TLDR_JUDGE_CATEGORIES,
  ASK_TLDR_JUDGE_SCORE_FLOORS,
  buildAskTldrJudgeRequest,
  validateAskTldrJudgeOutput
} from "../api/_lib/ask-tldr-judge.ts";

const readJson = (relativePath) => JSON.parse(fs.readFileSync(new URL(relativePath, import.meta.url), "utf8"));
const model = readJson("../config/ask-tldr/answer-model-v1.json");
const career = readJson("../config/ask-tldr/pillars/career.json");
const reportWindow = readJson("./fixtures/marie-report-frozen-facts.json");
const now = new Date("2026-09-05T12:00:00Z");
const recognition = career.questions.find((question) => question.id === "career.recognition");
assert.ok(recognition);

const plan = compileEvergreenAskPlan({ model, pillar: career, question: recognition });
const calculated = askTldrEvidenceFromReportWindow(reportWindow, now);
const ranked = buildAskTldrAnswerPacket({ model, plan, candidates: calculated, now });
const governed = buildAskTldrGovernedAnswerPacket(ranked);
const receipt = buildAskTldrVoiceEvidenceReceipt({
  question: governed.question,
  evidence: governed.evidence,
  governedGenerationAllowed: governed.generationAllowed,
  governedGenerationBlockReason: governed.generationBlockReason
});
const writerRequest = buildAskTldrWriterRequest({ packet: governed, receipt });
const writerOutput = validateAskTldrWriterOutput({
  request: writerRequest,
  question: governed.question,
  evidence: governed.evidence,
  value: {
    answer: "Recognition is more available when you put the work where people can see and respond to it. Jupiter opposing your Midheaven around September 15 can make public opportunity and visibility feel larger, but it can also make other people's reaction seem more important than the result itself.\n\nUse the opening to show the concrete work, ask for the credit or role attached to it, and let the response give you information. You may get more from a visible result and a specific request than from trying to manage how everyone feels about what you are doing.",
    evidenceIdsUsed: [writerRequest.primaryEvidenceId],
    primaryEvidenceId: writerRequest.primaryEvidenceId,
    whyNowEvidenceId: writerRequest.primaryEvidenceId,
    decisionOutcomeClaimed: false
  }
});
const factLock = verifyAskTldrFactLock({ output: writerOutput, evidence: governed.evidence });
assert.equal(factLock.passed, true, JSON.stringify(factLock.issues));

const request = buildAskTldrJudgeRequest({ writerRequest, writerOutput, evidence: governed.evidence, receipt, factLock });
assert.equal(request.schema, "ask-tldr-judge-request.v1");
assert.equal(request.runtimeEnabled, false);
assert.deepEqual(request.usedEvidenceIds, writerOutput.evidenceIdsUsed);
assert.equal(request.timingApplicable, true);
assert.match(request.instructions, /Do not output a pass\/fail verdict/u);
assert.match(request.input, /USER QUESTION/u);
assert.match(request.input, /READER ANSWER/u);
assert.match(request.input, /OWNER REGISTER EVIDENCE/u);
assert.match(request.input, /DETERMINISTIC FACT LOCK/u);
assert.ok(request.ownerPassageIds.length >= 3);
assert.ok(request.requestSha256);

const scores = Object.fromEntries(ASK_TLDR_JUDGE_CATEGORIES.map((category) => [category, 4]));
const passing = validateAskTldrJudgeOutput(request, {
  scores,
  timingApplicability: { applicable: true, reason: "The answer uses an upcoming exact transit and names its timing." },
  findings: []
});
assert.equal(passing.verdict, "pass");
assert.equal(passing.overall, 1);

const voiceBelowFloor = validateAskTldrJudgeOutput(request, {
  scores: { ...scores, owner_voice: ASK_TLDR_JUDGE_SCORE_FLOORS.owner_voice - 1 },
  timingApplicability: { applicable: true, reason: "The answer uses upcoming transit timing." },
  findings: [{
    category: "owner_voice",
    location: "paragraph 2",
    finding: "The ending becomes more explanatory than the closest owner passages.",
    evidenceIds: [],
    ownerPassageIds: [request.ownerPassageIds[0]]
  }]
});
assert.equal(voiceBelowFloor.verdict, "below_threshold");

assert.throws(() => validateAskTldrJudgeOutput(request, {
  scores: { ...scores, astrology_fidelity: 2 },
  timingApplicability: { applicable: true, reason: "Temporal evidence is used." },
  findings: [{
    category: "astrology_fidelity",
    location: "paragraph 1",
    finding: "The aspect meaning changed.",
    evidenceIds: [],
    ownerPassageIds: []
  }]
}), /ASK_TLDR_JUDGE_FINDING_EVIDENCE_REQUIRED/u);

assert.throws(() => validateAskTldrJudgeOutput(request, {
  scores: { ...scores, owner_voice: 2 },
  timingApplicability: { applicable: true, reason: "Temporal evidence is used." },
  findings: [{
    category: "owner_voice",
    location: "paragraph 1",
    finding: "The prose does not move like the supplied owner register.",
    evidenceIds: [],
    ownerPassageIds: []
  }]
}), /ASK_TLDR_JUDGE_OWNER_VOICE_PASSAGE_REQUIRED/u);

assert.throws(() => buildAskTldrJudgeRequest({
  writerRequest,
  writerOutput,
  evidence: governed.evidence,
  receipt,
  factLock: { ...factLock, passed: false, issues: [{ code: "fixture" }] }
}), /ASK_TLDR_JUDGE_FACT_LOCK_MUST_PASS/u);

console.log("Ask TLDR judge contract passed: the reviewer cannot self-declare pass, findings must cite the correct evidence lane, and deterministic owner-set score floors decide release quality.");
