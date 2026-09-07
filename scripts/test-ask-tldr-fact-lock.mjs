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
  answer: "Recognition is more available when you put the work where people can see and respond to it. Ask for the credit, title, or authority that matches work you can already point to instead of adding more responsibility just to prove the case.\n\nWhy the astrology points here\n\nJupiter opposing your Midheaven around September 15 enlarges questions of public role, recognition, and how much professional territory you are ready to occupy. The useful part of that pressure is not simply being more visible; it is noticing where growth gives you more leverage and where it only gives you more work.",
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

// A matching month/day must not authorize an invented previous cycle's year.
for (const date of ["September 15, 2014", "Sep 15 2038", "September 15th, 2014"]) {
  const locked = verifyAskTldrFactLock({
    output: { ...output, answer: goodValue.answer.replace("September 15", date) },
    evidence: governed.evidence
  });
  assert.equal(locked.passed, false, `Invented lookback/future date must fail: ${date}`);
  assert.ok(locked.issues.some((issue) => issue.code === "untraceable_date"));
}
for (const date of ["September 15, 2026", "Sep 15 2026", "September 15th, 2026"]) {
  const locked = verifyAskTldrFactLock({
    output: { ...output, answer: goodValue.answer.replace("September 15", date) },
    evidence: governed.evidence
  });
  assert.equal(locked.passed, true, JSON.stringify(locked.issues));
}

const supporting = governed.evidence.find((factor) => factor.id !== request.primaryEvidenceId && factor.governedMeaning.status === "full");
if (supporting) {
  const reordered = verifyAskTldrFactLock({
    output: { ...output, evidenceIdsUsed: [supporting.id, request.primaryEvidenceId] },
    evidence: governed.evidence
  });
  assert.equal(reordered.passed, true, JSON.stringify(reordered.issues));
  assert.deepEqual(reordered.checkedEvidenceIds, [supporting.id, request.primaryEvidenceId],
    "A valid writer declaration order must survive the fact lock for judge scope validation.");
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

const lunarCandidate = calculated.find((factor) => factor.kind === "eclipse" && factor.facts.kind === "lunar_eclipse");
assert.ok(lunarCandidate);
// Explicit synthetic facts distinguish the event house from a contacted point's house.
const lunarEvidence = { ...lunarCandidate, houses: [4, 10], facts: { ...lunarCandidate.facts, natalHouse: 4 } };
for (const [answer, passed] of [
  ["A lunar eclipse in your 4th house.", true],
  ["A lunar eclipse in your 10th house.", false],
  ["A solar eclipse in your 4th house.", false]
]) {
  const locked = verifyAskTldrFactLock({
    output: { ...output, answer, evidenceIdsUsed: [lunarEvidence.id] },
    evidence: [lunarEvidence]
  });
  assert.equal(locked.passed, passed, JSON.stringify(locked.issues));
}
assert.equal(verifyAskTldrFactLock({
  output: { ...output, answer: "A lunar eclipse supports the answer." },
  evidence: governed.evidence.filter((factor) => factor.kind !== "eclipse")
}).passed, false, "An undeclared eclipse must not enter the rationale.");

console.log("Ask TLDR fact lock passed: dates, named aspects, returns, house claims, and sign claims are checked only against the writer's declared calculated evidence.");
