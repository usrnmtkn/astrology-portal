import assert from "node:assert/strict";
import fs from "node:fs";
import { buildAskTldrAnswerPacket, compileEvergreenAskPlan } from "../api/_lib/ask-tldr-model.ts";
import { askTldrEvidenceFromReportWindow } from "../api/_lib/ask-tldr-evidence-adapter.ts";
import {
  buildAskTldrGovernedAnswerPacket,
  resolveAskTldrGovernedFactor
} from "../api/_lib/ask-tldr-governed-evidence.ts";
import { buildAskTldrVoiceEvidenceReceipt } from "../api/_lib/ask-tldr-voice-receipt.ts";
import { buildAskTldrWriterRequest, validateAskTldrWriterOutput } from "../api/_lib/ask-tldr-writer.ts";
import { assertOpenAiStrictResponseSchema } from "../api/_lib/report-provider-schema.ts";

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

assert.equal(request.schema, "ask-tldr-writer-request.v1");
assert.equal(request.runtimeEnabled, false, "Building the writer contract must not enable Ask TLDR runtime.");
assert.equal(request.primaryEvidenceId, governed.evidence[0].id);
assert.match(request.instructions, /Do not calculate astrology/u);
assert.match(request.instructions, /Every astrology factor supplied to you has passed the governed-meaning gate/u);
assert.match(request.instructions, /GOVERNED SEMANTIC EVIDENCE controls what the astrology means/u);
assert.match(request.instructions, /OWNER REGISTER EVIDENCE controls vocabulary/u);
assert.match(request.instructions, /Do not write generic coaching with astrology pasted onto it/u);
assert.match(request.instructions, /compare and contrast/u);
assert.match(request.instructions, /Why the astrology points here/u);
assert.match(request.instructions, /historical comparison/u);
assert.match(request.input, /USER QUESTION/u);
assert.match(request.input, /Jupiter/u);
assert.match(request.input, /Midheaven/u);
assert.match(request.input, /cms:authored\/transit-aspect\/jupiter\/midheaven\/hard/u);
assert.match(request.input, /OWNER PASSAGE 1/u);
assert.match(request.input, /OWNER CORRECTIONS/u);
assert.match(request.input, /ACTIVE DO-NOT-USE RULES/u);
assert.doesNotMatch(request.input, /OWNER PASSAGE 1; source=undefined/u);
assert.deepEqual(request.outputSchema.properties.primaryEvidenceId, { type: "string", const: request.primaryEvidenceId });
assert.doesNotThrow(() => assertOpenAiStrictResponseSchema(request.outputSchema, "ask_tldr_writer_v1"), "The actual writer schema must compile against the production provider subset.");
assert.ok(request.requestSha256);

const profectionCandidate = calculated.find((factor) => factor.kind === "profection");
assert.ok(profectionCandidate);
const partialProfection = resolveAskTldrGovernedFactor({
  ...profectionCandidate,
  score: 1,
  role: "supporting",
  reasons: ["partial-evidence-regression"]
});
assert.equal(partialProfection.governedMeaning.status, "partial");
const auditPacketWithPartial = {
  ...governed,
  evidence: [...governed.evidence.filter((factor) => factor.id !== partialProfection.id), partialProfection],
  evidenceIds: [...new Set([...governed.evidenceIds.filter((id) => id !== partialProfection.id), partialProfection.id])]
};
const auditReceiptWithPartial = buildAskTldrVoiceEvidenceReceipt({
  question: auditPacketWithPartial.question,
  evidence: auditPacketWithPartial.evidence,
  governedGenerationAllowed: true,
  governedGenerationBlockReason: null
});
const requestWithPartialAudit = buildAskTldrWriterRequest({
  packet: auditPacketWithPartial,
  receipt: auditReceiptWithPartial
});
assert.equal(requestWithPartialAudit.evidenceIds.includes(partialProfection.id), false, "Partial governed evidence must never be exposed to the writer's evidence enum.");
assert.doesNotMatch(requestWithPartialAudit.input, new RegExp(partialProfection.id.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&"), "u"), "Partial governed evidence must never appear in the writer prompt.");
assert.throws(() => validateAskTldrWriterOutput({
  request: requestWithPartialAudit,
  question: auditPacketWithPartial.question,
  evidence: auditPacketWithPartial.evidence,
  value: {
    answer: "This is a fixture with enough sentences to satisfy the mechanical validator. It should still fail because it cites evidence the writer was never allowed to use.\n\nWhy the astrology points here\n\nThe astrology section is present so the evidence-id failure is isolated. It does not change which evidence the writer is allowed to cite.",
    evidenceIdsUsed: [requestWithPartialAudit.primaryEvidenceId, partialProfection.id],
    primaryEvidenceId: requestWithPartialAudit.primaryEvidenceId,
    whyNowEvidenceId: requestWithPartialAudit.primaryEvidenceId,
    decisionOutcomeClaimed: false
  }
}), /ASK_TLDR_WRITER_EVIDENCE_IDS_INVALID/u);

const goodValue = {
  answer: "Recognition is more available when you put the work where people can see and respond to it. Ask for the credit, title, or authority that matches work you can already point to instead of adding more responsibility just to prove the case.\n\nWhy the astrology points here\n\nJupiter opposing your Midheaven around September 15 enlarges questions of public role, recognition, and how much professional territory you are ready to occupy. The useful part of that pressure is not simply being more visible; it is noticing where growth gives you more leverage and where it only gives you more work.",
  evidenceIdsUsed: [request.primaryEvidenceId],
  primaryEvidenceId: request.primaryEvidenceId,
  whyNowEvidenceId: request.primaryEvidenceId,
  decisionOutcomeClaimed: false
};
const validated = validateAskTldrWriterOutput({
  request,
  question: governed.question,
  evidence: governed.evidence,
  value: goodValue
});
assert.equal(validated.answer, goodValue.answer);
assert.deepEqual(validated.evidenceIdsUsed, [request.primaryEvidenceId]);
assert.equal(validated.whyNowEvidenceId, request.primaryEvidenceId);

assert.throws(() => validateAskTldrWriterOutput({
  request,
  question: governed.question,
  evidence: governed.evidence,
  value: { ...goodValue, evidenceIdsUsed: ["made-up-evidence"] }
}), /ASK_TLDR_WRITER_EVIDENCE_IDS_INVALID/u);

assert.throws(() => validateAskTldrWriterOutput({
  request,
  question: governed.question,
  evidence: governed.evidence,
  value: { ...goodValue, decisionOutcomeClaimed: true }
}), /ASK_TLDR_WRITER_DECISION_OUTCOME_FLAG_INVALID/u);

assert.throws(() => validateAskTldrWriterOutput({
  request,
  question: governed.question,
  evidence: governed.evidence,
  value: { ...goodValue, answer: goodValue.answer.replace("public role", "public role — and certainty") }
}), /ASK_TLDR_WRITER_PROSE_INVALID/u);

assert.throws(() => validateAskTldrWriterOutput({
  request,
  question: governed.question,
  evidence: governed.evidence,
  value: { ...goodValue, answer: goodValue.answer.replace("\n\nWhy the astrology points here\n\nJupiter", "\n\nJupiter") }
}), /astrology_support_section_missing/u);

assert.throws(() => validateAskTldrWriterOutput({
  request,
  question: governed.question,
  evidence: governed.evidence,
  value: { ...goodValue, whyNowEvidenceId: null }
}), /ASK_TLDR_WRITER_WHY_NOW_REQUIRED/u);

assert.throws(() => validateAskTldrWriterOutput({
  request,
  question: governed.question,
  evidence: governed.evidence,
  value: { ...goodValue, answer: "   " }
}), /ASK_TLDR_WRITER_EVIDENCE_IDS_INVALID/u, "Empty reader prose remains forbidden by the deterministic validator even though minLength is not sent to the provider.");

for (const answer of [
  goodValue.answer.split("\n\nWhy the astrology points here")[0],
  goodValue.answer.split("\n\nWhy the astrology points here")[0] + "\n\nWhy the astrology points here",
  "Why the astrology points here\n\n" + goodValue.answer,
  goodValue.answer + "\n\nWhy the astrology points here"
]) {
  assert.throws(() => validateAskTldrWriterOutput({
    request, question: governed.question, evidence: governed.evidence,
    value: { ...goodValue, answer }
  }), /astrology_support_section_(?:missing|structure_invalid)/u,
  "Missing, empty, duplicated, and misplaced support sections must fail.");
}

const mismatchedReceipt = structuredClone(receipt);
mismatchedReceipt.semanticSources[0].packetSha256 = "bad";
assert.throws(() => buildAskTldrWriterRequest({ packet: governed, receipt: mismatchedReceipt }), /ASK_TLDR_VOICE_RECEIPT_TAMPERED|ASK_TLDR_WRITER_SEMANTIC_RECEIPT_MISMATCH/u);

console.log("Ask TLDR writer contract passed: astrology must materially drive the answer, temporal contrast and reinforcement are available when evidence supports them, a reader-facing astrology section is mandatory, historical recurrence cannot be invented, and only fully governed evidence can reach the writer.");
