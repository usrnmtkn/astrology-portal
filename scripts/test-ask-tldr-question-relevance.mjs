import assert from "node:assert/strict";
import fs from "node:fs";
import { askTldrEvidenceFromReportWindow } from "../api/_lib/ask-tldr-evidence-adapter.ts";
import { askTldrCandidateMatchesQuestionFocus } from "../api/_lib/ask-tldr-relevance.ts";
import { prepareEvergreenAskTldrCalibration } from "../api/_lib/ask-tldr-pipeline.ts";
import { buildAskTldrQuestionRelevanceReceipt } from "../api/_lib/ask-tldr-relevance-receipt.ts";
import { buildQuestionBoundAskTldrWriterRequest } from "../api/_lib/ask-tldr-question-bound-writer.ts";

const readJson = (relativePath) => JSON.parse(fs.readFileSync(new URL(relativePath, import.meta.url), "utf8"));
const model = readJson("../config/ask-tldr/answer-model-v1.json");
const career = readJson("../config/ask-tldr/pillars/career.json");
const reportWindow = readJson("./fixtures/marie-report-frozen-facts.json");
const recognition = career.questions.find((question) => question.id === "career.recognition");
assert.ok(recognition);

const prepared = prepareEvergreenAskTldrCalibration({
  model,
  pillar: career,
  question: recognition,
  reportWindow,
  now: new Date("2026-09-05T12:00:00Z")
});
assert.equal(prepared.preparationAllowed, true, prepared.preparationBlockReason);
assert.ok(prepared.writerRequest);
assert.equal(prepared.writerRequest.outputSchema.properties.evidenceIdsUsed.minItems, 1,
  "Eligible supporting evidence must not force an unsupported synthesis.");
assert.doesNotMatch(prepared.writerRequest.instructions, /Why your chart points here:/u,
  "The question-bound prompt must not contradict the shared section heading.");
const lunar = askTldrEvidenceFromReportWindow(reportWindow).find((factor) =>
  factor.kind === "eclipse" && factor.facts.kind === "lunar_eclipse" && factor.houses.includes(10));
assert.ok(lunar);
assert.equal(askTldrCandidateMatchesQuestionFocus(lunar, prepared.plan), true,
  "Calculated lunar eclipses with hyphenated IDs must remain eligible.");
assert.equal(askTldrCandidateMatchesQuestionFocus({ ...lunar, id: "opaque-calculator-id" }, prepared.plan), true);
assert.equal(askTldrCandidateMatchesQuestionFocus({ ...lunar, id: "lunar_eclipse_fake", facts: { ...lunar.facts, kind: "solar_eclipse" } }, prepared.plan), false,
  "An ID cannot authorize unsupported solar-eclipse meaning.");
assert.equal(askTldrCandidateMatchesQuestionFocus({ ...lunar, facts: undefined }, prepared.plan), false);
const selectedLunar = prepared.questionBoundPacket.evidence.find((factor) => factor.id === lunar.id);
assert.ok(selectedLunar, "The eligible career lunar eclipse must reach the actual prepared packet.");
assert.equal(selectedLunar.governedMeaning.status, "full");
assert.equal(selectedLunar.governedMeaning.sourceKind, "owner_approved_eclipse_snapshot");
const primary = prepared.questionBoundPacket.evidence.find((factor) => factor.role === "primary");
assert.ok(primary);
assert.equal(primary.governedMeaning.status, "full");
assert.equal(primary.questionRelevance.status, "full");
assert.ok(primary.questionRelevance.packetSha256);
assert.ok(primary.questionRelevance.promptEvidence);

const supporting = {
  ...primary,
  id: `${primary.id}:supporting-relevance-regression`,
  role: "supporting"
};
const supportingFixturePacket = {
  ...prepared.questionBoundPacket,
  evidence: [...prepared.questionBoundPacket.evidence, supporting],
  evidenceIds: [...prepared.questionBoundPacket.evidenceIds, supporting.id]
};
const supportingMissingPacket = {
  ...supportingFixturePacket,
  evidence: supportingFixturePacket.evidence.map((factor) => factor.id === supporting.id ? {
    ...factor,
    questionRelevance: {
      status: "missing",
      matched: { houses: [], angles: [], points: [] },
      canonicalIds: [],
      packet: null,
      promptEvidence: null,
      packetSha256: null
    }
  } : factor)
};
const supportingMissingReceipt = buildAskTldrQuestionRelevanceReceipt(supportingMissingPacket);
assert.equal(supportingMissingReceipt.generationAllowed, true, "A missing supporting bridge must not invalidate an otherwise governed primary answer.");
assert.ok(!supportingMissingReceipt.eligibleEvidenceIds.includes(supporting.id));
const supportingMissingWriter = buildQuestionBoundAskTldrWriterRequest({
  packet: supportingMissingPacket,
  voiceReceipt: prepared.voiceReceipt,
  relevanceReceipt: supportingMissingReceipt
});
assert.ok(!supportingMissingWriter.evidenceIds.includes(supporting.id), "Supporting evidence without a question bridge must not reach the writer.");
assert.ok(!supportingMissingWriter.input.includes(`RELEVANCE ${supporting.id}`), "Supporting relevance evidence marked missing must not be serialized into the writer request.");

const primaryMissingPacket = {
  ...prepared.questionBoundPacket,
  evidence: prepared.questionBoundPacket.evidence.map((factor) => factor.id === primary.id ? {
    ...factor,
    questionRelevance: {
      status: "missing",
      matched: { houses: [], angles: [], points: [] },
      canonicalIds: [],
      packet: null,
      promptEvidence: null,
      packetSha256: null
    }
  } : factor)
};
const primaryMissingReceipt = buildAskTldrQuestionRelevanceReceipt(primaryMissingPacket);
assert.equal(primaryMissingReceipt.generationAllowed, false);
assert.equal(primaryMissingReceipt.generationBlockReason, "PRIMARY_QUESTION_RELEVANCE_UNGOVERNED");
assert.throws(() => buildQuestionBoundAskTldrWriterRequest({
  packet: primaryMissingPacket,
  voiceReceipt: prepared.voiceReceipt,
  relevanceReceipt: primaryMissingReceipt
}), /ASK_TLDR_RELEVANCE_RECEIPT_BLOCKED|ASK_TLDR_WRITER_RELEVANCE_BLOCKED/u);

const tamperedReceipt = {
  ...prepared.relevanceReceipt,
  eligibleEvidenceIds: prepared.relevanceReceipt.eligibleEvidenceIds.slice(1)
};
assert.throws(() => buildQuestionBoundAskTldrWriterRequest({
  packet: prepared.questionBoundPacket,
  voiceReceipt: prepared.voiceReceipt,
  relevanceReceipt: tamperedReceipt
}), /ASK_TLDR_RELEVANCE_RECEIPT_TAMPERED/u);

console.log("Ask TLDR question relevance contract passed: primary question relevance is mandatory, unsupported supporting relevance is excluded before writing, and relevance receipts are tamper-evident.");
