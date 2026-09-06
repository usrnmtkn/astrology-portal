import assert from "node:assert/strict";
import fs from "node:fs";
import { buildAskTldrAnswerPacket, compileEvergreenAskPlan } from "../api/_lib/ask-tldr-model.ts";
import { askTldrEvidenceFromReportWindow } from "../api/_lib/ask-tldr-evidence-adapter.ts";
import { buildAskTldrGovernedAnswerPacket } from "../api/_lib/ask-tldr-governed-evidence.ts";
import { buildAskTldrVoiceEvidenceReceipt } from "../api/_lib/ask-tldr-voice-receipt.ts";
import { buildAskTldrWriterRequest, validateAskTldrWriterOutput } from "../api/_lib/ask-tldr-writer.ts";
import { verifyAskTldrFactLock } from "../api/_lib/ask-tldr-fact-lock.ts";

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
const request = buildAskTldrWriterRequest({ packet: governed, receipt });
const goodValue = {
  answer: "Recognition is more available when you put the work where people can see and respond to it. Jupiter opposing your Midheaven around September 15 can make public opportunity and visibility feel larger, but it can also make other people's reaction seem more important than the result itself.\n\nUse the opening to show the concrete work, ask for the credit or role attached to it, and let the response give you information. You may get more from a visible result and a specific request than from trying to manage how everyone feels about what you are doing.",
  evidenceIdsUsed: [request.primaryEvidenceId],
  primaryEvidenceId: request.primaryEvidenceId,
  whyNowEvidenceId: request.primaryEvidenceId,
  decisionOutcomeClaimed: false
};
const output = validateAskTldrWriterOutput({ request, question: governed.question, evidence: governed.evidence, value: goodValue });
const goodLock = verifyAskTldrFactLock({ output, evidence: governed.evidence });
assert.equal(goodLock.passed, true, JSON.stringify(goodLock.issues));
assert.deepEqual(goodLock.checkedEvidenceIds, [request.primaryEvidenceId]);

for (const [answer, code] of [
  [goodValue.answer.replace("September 15", "September 16"), "untraceable_date"],
  [goodValue.answer.replace("Jupiter opposing your Midheaven", "Jupiter squaring your Midheaven"), "untraceable_attribution"],
  [goodValue.answer.replace("Jupiter opposing your Midheaven", "Jupiter opposing your Ascendant"), "untraceable_attribution"],
  [goodValue.answer.replace("Jupiter opposing your Midheaven around September 15", "Jupiter in your 10th house around September 15"), "untraceable_house_claim"],
  [goodValue.answer.replace("Jupiter opposing your Midheaven around September 15", "Jupiter in Leo around September 15"), "untraceable_sign_claim"]
]) {
  const mutatedOutput = { ...output, answer };
  const locked = verifyAskTldrFactLock({ output: mutatedOutput, evidence: governed.evidence });
  assert.equal(locked.passed, false, `Expected ${code} for ${answer}`);
  assert.ok(locked.issues.some((issue) => issue.code === code), JSON.stringify(locked.issues));
}

const supporting = governed.evidence.find((factor) => factor.id !== request.primaryEvidenceId && factor.governedMeaning.status === "full");
if (supporting) {
  const undeclared = verifyAskTldrFactLock({
    output: {
      ...output,
      answer: `${output.answer}\n\n${supporting.label}.`,
      evidenceIdsUsed: [request.primaryEvidenceId]
    },
    evidence: governed.evidence
  });
  assert.equal(undeclared.checkedEvidenceIds.includes(supporting.id), false, "The fact lock must scope itself to the evidence IDs the writer declared.");
}

console.log("Ask TLDR fact lock passed: dates, named aspects, returns, house claims, and sign claims are checked only against the writer's declared calculated evidence.");
