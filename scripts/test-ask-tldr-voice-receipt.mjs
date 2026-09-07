import assert from "node:assert/strict";
import fs from "node:fs";
import { createHash } from "node:crypto";
import { buildAskTldrAnswerPacket, compileEvergreenAskPlan } from "../api/_lib/ask-tldr-model.ts";
import { askTldrEvidenceFromReportWindow } from "../api/_lib/ask-tldr-evidence-adapter.ts";
import {
  buildAskTldrGovernedAnswerPacket,
  resolveAskTldrGovernedFactor
} from "../api/_lib/ask-tldr-governed-evidence.ts";
import {
  ASK_TLDR_OWNER_PASSAGE_MINIMUM,
  assertAskTldrVoiceEvidenceReceipt,
  buildAskTldrVoiceEvidenceReceipt
} from "../api/_lib/ask-tldr-voice-receipt.ts";

const readJson = (relativePath) => JSON.parse(fs.readFileSync(new URL(relativePath, import.meta.url), "utf8"));
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
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
assert.equal(governed.generationAllowed, true);

const receipt = buildAskTldrVoiceEvidenceReceipt({
  question: governed.question,
  evidence: governed.evidence,
  governedGenerationAllowed: governed.generationAllowed,
  governedGenerationBlockReason: governed.generationBlockReason
});
assert.equal(receipt.schema, "ask-tldr-voice-evidence-receipt.v1");
assert.equal(receipt.surface, "ask-tldr");
assert.equal(receipt.register, "second_person_answer");
assert.equal(receipt.generationAllowed, true);
assert.equal(receipt.generationBlockReason, null);
assert.ok(receipt.ownerPassages.length >= ASK_TLDR_OWNER_PASSAGE_MINIMUM);
assert.ok(receipt.ownerPassages.length <= 5);
assert.ok(new Set(receipt.ownerPassages.map((passage) => passage.sourcePath)).size >= 2, "Voice receipt should not be five excerpts from one source file.");
assert.ok(receipt.ownerPassages.some((passage) => passage.register === "second_person"), "The second-person Ask register should prefer at least one second-person owner passage.");
for (const passage of receipt.ownerPassages) {
  assert.ok(passage.id);
  assert.ok(passage.sourcePath);
  assert.equal(sha256(passage.text), passage.passageSha256, `Owner passage hash drifted: ${passage.id}`);
}
assert.ok(receipt.ownerCorrections.length > 0);
assert.ok(receipt.ownerCorrections.every((pair) => pair.before && pair.after && pair.sourcePath));
assert.match(receipt.doNotUse.text, /Em dashes/u);
assert.match(receipt.doNotUse.text, /This placement becomes/u);
assert.ok(receipt.doNotUse.sourceFileSha256);
assert.ok(receipt.doNotUse.sectionSha256);
assert.equal(receipt.semanticSources[0].factorKey, "transit:jupiter:opposition:midheaven");
assert.equal(receipt.semanticSources[0].governedSourceKind, "owner_approved_cms_snapshot");
assert.doesNotThrow(() => assertAskTldrVoiceEvidenceReceipt(receipt));

const runtimeCorrection = {
  before: "Make your contribution easy to identify and ask directly for recognition.",
  after: "For guidance questions, translate the advice into a decision, request, preparation step, boundary, or observable action the reader can actually take.",
  ownerReason: "The reader should not have to translate polished coaching language into the next step.",
  category: "owner_feedback",
  family: "ask-tldr:career",
  rule: "owner_approved_runtime_guidance",
  sourcePath: "content-studio:ask-tldr-preview/test-preview",
  relevanceScore: 100
};
const learnedReceipt = buildAskTldrVoiceEvidenceReceipt({
  question: governed.question,
  evidence: governed.evidence,
  governedGenerationAllowed: governed.generationAllowed,
  governedGenerationBlockReason: governed.generationBlockReason,
  ownerCorrections: [runtimeCorrection]
});
assert.deepEqual(learnedReceipt.ownerCorrections[0], runtimeCorrection, "Explicitly approved runtime owner feedback must outrank packaged corrections.");
assert.ok(learnedReceipt.ownerCorrections.length <= 8);
assert.doesNotThrow(() => assertAskTldrVoiceEvidenceReceipt(learnedReceipt));
assert.notEqual(learnedReceipt.receiptSha256, receipt.receiptSha256, "Promoted owner feedback must be part of the hashed voice receipt.");

const tampered = structuredClone(learnedReceipt);
tampered.ownerCorrections[0].after += " changed";
assert.throws(() => assertAskTldrVoiceEvidenceReceipt(tampered), /ASK_TLDR_VOICE_RECEIPT_TAMPERED/u);

const profectionCandidate = calculated.find((factor) => factor.kind === "profection");
assert.ok(profectionCandidate);
const profection = resolveAskTldrGovernedFactor({
  ...profectionCandidate,
  score: 100,
  role: "primary",
  reasons: ["fixture"]
});
assert.equal(profection.governedMeaning.status, "partial");
const blocked = buildAskTldrVoiceEvidenceReceipt({
  question: governed.question,
  evidence: [profection],
  governedGenerationAllowed: false,
  governedGenerationBlockReason: "PRIMARY_GOVERNED_INTERPRETATION_INCOMPLETE"
});
assert.equal(blocked.generationAllowed, false);
assert.equal(blocked.generationBlockReason, "PRIMARY_GOVERNED_INTERPRETATION_INCOMPLETE");
assert.throws(() => assertAskTldrVoiceEvidenceReceipt(blocked), /ASK_TLDR_VOICE_RECEIPT_BLOCKED/u);

console.log(`Ask TLDR voice receipt passed: ${receipt.ownerPassages.length} exact owner-authored passages, packaged corrections, explicitly approved runtime owner feedback, semantic provenance, and active do-not-use rules are hashed before writing.`);