import assert from "node:assert/strict";
import fs from "node:fs";
import { ASK_TLDR_JUDGE_CATEGORIES } from "../api/_lib/ask-tldr-judge.ts";
import {
  finalizeAskTldrCalibration,
  prepareEvergreenAskTldrCalibration,
  prepareFreeTextAskTldrCalibration
} from "../api/_lib/ask-tldr-pipeline.ts";

const readJson = (relativePath) => JSON.parse(fs.readFileSync(new URL(relativePath, import.meta.url), "utf8"));
const model = readJson("../config/ask-tldr/answer-model-v1.json");
const career = readJson("../config/ask-tldr/pillars/career.json");
const reportWindow = readJson("./fixtures/marie-report-frozen-facts.json");
const now = new Date("2026-09-05T12:00:00Z");
const recognition = career.questions.find((question) => question.id === "career.recognition");
assert.ok(recognition);

const evergreen = prepareEvergreenAskTldrCalibration({
  model,
  pillar: career,
  question: recognition,
  reportWindow,
  now
});
assert.equal(evergreen.schema, "ask-tldr-prepared-calibration.v1");
assert.equal(evergreen.runtimeEnabled, false);
assert.equal(evergreen.source, "evergreen");
assert.equal(evergreen.preparationAllowed, true, evergreen.preparationBlockReason);
assert.ok(evergreen.writerRequest);
assert.ok(evergreen.candidateCount > 0);
assert.equal(evergreen.governedPacket.evidence[0].factorKey, "transit:jupiter:opposition:midheaven");

const freeText = prepareFreeTextAskTldrCalibration({
  model,
  pillar: career,
  questionText: "Why am I doing all the work and nobody notices?",
  classification: {
    primaryIntent: "recognition",
    secondaryIntents: ["credit", "workload"],
    questionTypes: ["current_state", "guidance"],
    timeWindow: "1_month"
  },
  reportWindow,
  now
});
assert.equal(freeText.source, "free_text");
assert.deepEqual(freeText.plan.focus, {
  houses: [10, 6],
  points: ["Sun", "Saturn"],
  angles: ["Midheaven"]
}, "Free-text recognition/credit/workload must inherit the matching evergreen retrieval focus instead of using only the broad Career profile.");
assert.equal(freeText.preparationAllowed, true, freeText.preparationBlockReason);
assert.equal(freeText.governedPacket.evidence[0].factorKey, evergreen.governedPacket.evidence[0].factorKey, "Equivalent evergreen and free-text questions should reach the same primary astrology when the facts support it.");

const renegotiationFreeText = prepareFreeTextAskTldrCalibration({
  model,
  pillar: career,
  questionText: "Should I leave this job or ask for different terms?",
  classification: {
    primaryIntent: "renegotiation",
    secondaryIntents: ["role_change", "terms"],
    questionTypes: ["decision", "timing"],
    timeWindow: "4_months"
  },
  reportWindow,
  now
});
assert.deepEqual(renegotiationFreeText.plan.focus, {
  houses: [6, 10],
  points: ["Saturn", "Uranus", "Pluto"],
  angles: []
}, "A role-change free-text question must inherit its own evergreen Saturn/Uranus/Pluto and 6th/10th focus instead of the recognition focus.");

const primaryId = evergreen.writerRequest.primaryEvidenceId;
const writerValue = {
  answer: "Recognition is more available when you put the work where people can see and respond to it. Jupiter opposing your Midheaven around September 15 can make public opportunity and visibility feel larger, but it can also make other people's reaction seem more important than the result itself.\n\nUse the opening to show the concrete work, ask for the credit or role attached to it, and let the response give you information. You may get more from a visible result and a specific request than from trying to manage how everyone feels about what you are doing.",
  evidenceIdsUsed: [primaryId],
  primaryEvidenceId: primaryId,
  whyNowEvidenceId: primaryId,
  decisionOutcomeClaimed: false
};
const judgeScores = Object.fromEntries(ASK_TLDR_JUDGE_CATEGORIES.map((category) => [category, 4]));
const finalized = finalizeAskTldrCalibration({
  prepared: evergreen,
  writerValue,
  judgeValue: {
    scores: judgeScores,
    timingApplicability: { applicable: true, reason: "The answer uses an upcoming exact transit and names the timing." },
    findings: []
  }
});
assert.equal(finalized.schema, "ask-tldr-finalized-calibration.v1");
assert.equal(finalized.runtimeEnabled, false);
assert.equal(finalized.finalized, true);
assert.equal(finalized.factLock.passed, true);
assert.equal(finalized.judge.verdict, "pass");
assert.equal(finalized.releasePacket.releaseStatus, "calibration_candidate");
assert.equal(finalized.releasePacket.readerServingEnabled, false);
assert.equal(finalized.releasePacket.ownerApproved, false);

const badFacts = finalizeAskTldrCalibration({
  prepared: evergreen,
  writerValue: { ...writerValue, answer: writerValue.answer.replace("September 15", "September 16") },
  judgeValue: {
    scores: judgeScores,
    timingApplicability: { applicable: true, reason: "fixture" },
    findings: []
  }
});
assert.equal(badFacts.finalized, false);
assert.equal(badFacts.blockReason, "deterministic_fact_lock_failed");
assert.equal(badFacts.judgeRequest, null, "A factually invalid writer answer must not spend a judge call.");
assert.equal(badFacts.releasePacket, null);

console.log("Ask TLDR end-to-end calibration pipeline passed: evergreen and free-text share one astrology engine with intent-specific retrieval focus, invalid facts stop before judging, and a fully passing answer remains a non-serving calibration candidate.");
