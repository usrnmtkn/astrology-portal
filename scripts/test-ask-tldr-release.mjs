import assert from "node:assert/strict";
import fs from "node:fs";
import { buildAskTldrAnswerPacket, compileEvergreenAskPlan } from "../api/_lib/ask-tldr-model.ts";
import { askTldrEvidenceFromReportWindow } from "../api/_lib/ask-tldr-evidence-adapter.ts";
import { buildAskTldrGovernedAnswerPacket } from "../api/_lib/ask-tldr-governed-evidence.ts";
import { buildAskTldrVoiceEvidenceReceipt } from "../api/_lib/ask-tldr-voice-receipt.ts";
import { buildAskTldrWriterRequest, validateAskTldrWriterOutput } from "../api/_lib/ask-tldr-writer.ts";
import { verifyAskTldrFactLock } from "../api/_lib/ask-tldr-fact-lock.ts";
import { ASK_TLDR_JUDGE_CATEGORIES, buildAskTldrJudgeRequest, validateAskTldrJudgeOutput } from "../api/_lib/ask-tldr-judge.ts";
import { buildAskTldrCalibrationReleasePacket } from "../api/_lib/ask-tldr-release.ts";

const readJson = (relativePath) => JSON.parse(fs.readFileSync(new URL(relativePath, import.meta.url), "utf8"));
const model = readJson("../config/ask-tldr/answer-model-v1.json");
const career = readJson("../config/ask-tldr/pillars/career.json");
const reportWindow = readJson("./fixtures/marie-report-frozen-facts.json");
const now = new Date("2026-09-05T12:00:00Z");
const recognition = career.questions.find((question) => question.id === "career.recognition");
assert.ok(recognition);

const plan = compileEvergreenAskPlan({ model, pillar: career, question: recognition });
const calculated = askTldrEvidenceFromReportWindow(reportWindow, now);
const governed = buildAskTldrGovernedAnswerPacket(buildAskTldrAnswerPacket({ model, plan, candidates: calculated, now }));
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
const judgeRequest = buildAskTldrJudgeRequest({ writerRequest, writerOutput, evidence: governed.evidence, receipt, factLock });
const scores = Object.fromEntries(ASK_TLDR_JUDGE_CATEGORIES.map((category) => [category, 4]));
const judge = validateAskTldrJudgeOutput(judgeRequest, {
  scores,
  timingApplicability: { applicable: true, reason: "The answer uses an upcoming exact transit and names the timing." },
  findings: []
});

const packet = buildAskTldrCalibrationReleasePacket({
  question: governed.question,
  writerRequest,
  writerOutput,
  evidence: governed.evidence,
  receipt,
  factLock,
  judgeRequest,
  judge
});
assert.equal(packet.schema, "ask-tldr-calibration-release-packet.v1");
assert.equal(packet.releaseStatus, "calibration_candidate");
assert.deepEqual(packet.blockers, []);
assert.equal(packet.generatedContent, true);
assert.equal(packet.runtimeEnabled, false);
assert.equal(packet.readerServingEnabled, false);
assert.equal(packet.ownerApproved, false, "Judge pass must never relabel generated copy as owner approved.");
assert.equal(packet.promotionAuthorized, false);
assert.equal(packet.answer, writerOutput.answer);
assert.ok(packet.answerSha256);
assert.equal(packet.sourceBindings.writerRequestSha256, writerRequest.requestSha256);
assert.equal(packet.sourceBindings.judgeRequestSha256, judgeRequest.requestSha256);
assert.equal(packet.sourceBindings.voiceReceiptSha256, receipt.receiptSha256);
assert.deepEqual(Object.keys(packet.sourceBindings.semanticPacketSha256ByEvidenceId), writerOutput.evidenceIdsUsed);
assert.deepEqual(Object.keys(packet.sourceBindings.calculatedFactsSha256ByEvidenceId), writerOutput.evidenceIdsUsed);
assert.ok(packet.packetSha256);

const belowThresholdJudge = { ...judge, verdict: "below_threshold" };
const blockedByJudge = buildAskTldrCalibrationReleasePacket({
  question: governed.question,
  writerRequest,
  writerOutput,
  evidence: governed.evidence,
  receipt,
  factLock,
  judgeRequest,
  judge: belowThresholdJudge
});
assert.equal(blockedByJudge.releaseStatus, "blocked");
assert.ok(blockedByJudge.blockers.includes("judge_below_threshold"));
assert.equal(blockedByJudge.readerServingEnabled, false);

const failedLock = { ...factLock, passed: false, issues: [{ code: "fixture" }] };
const blockedByFacts = buildAskTldrCalibrationReleasePacket({
  question: governed.question,
  writerRequest,
  writerOutput,
  evidence: governed.evidence,
  receipt,
  factLock: failedLock,
  judgeRequest,
  judge
});
assert.equal(blockedByFacts.releaseStatus, "blocked");
assert.ok(blockedByFacts.blockers.includes("deterministic_fact_lock_failed"));

assert.throws(() => buildAskTldrCalibrationReleasePacket({
  question: governed.question,
  writerRequest,
  writerOutput,
  evidence: governed.evidence,
  receipt,
  factLock,
  judgeRequest: { ...judgeRequest, usedEvidenceIds: ["wrong"] },
  judge
}), /ASK_TLDR_RELEASE_JUDGE_SCOPE_MISMATCH/u);

console.log("Ask TLDR calibration release packet passed: deterministic facts + judge quality can create a calibration candidate, but generated copy remains non-serving, non-promoted, and not owner approved.");
