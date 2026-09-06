import assert from "node:assert/strict";
import fs from "node:fs";
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
const primary = prepared.questionBoundPacket.evidence.find((factor) => factor.role === "primary");
assert.ok(primary);
assert.equal(primary.governedMeaning.status, "full");
assert.equal(primary.questionRelevance.status, "full");
assert.ok(primary.questionRelevance.packetSha256);
assert.ok(primary.questionRelevance.promptEvidence);

const supporting = prepared.questionBoundPacket.evidence.find((factor) => factor.role === "supporting" && factor.governedMeaning.status === "full");
assert.ok(supporting, "Fixture should expose at least one full supporting factor for relevance-exclusion regression.");
const supportingMissingPacket = {
  ...prepared.questionBoundPacket,
  evidence: prepared.questionBoundPacket.evidence.map((factor) => factor.id === supporting.id ? {
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
