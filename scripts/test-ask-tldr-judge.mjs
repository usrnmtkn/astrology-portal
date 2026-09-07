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
const writerRequest = buildAskTldrWriterRequest({ packet: governed, receipt });
const writerOutput = validateAskTldrWriterOutput({
  request: writerRequest,
  question: governed.question,
  evidence: governed.evidence,
  value: {
    answer: "Recognition is more available when you put the work where people can see and respond to it. Ask for the credit, title, or authority that matches work you can already point to instead of adding more responsibility just to prove the case.\n\nWhy the astrology points here\n\nJupiter opposing your Midheaven around September 15 enlarges questions of public role, recognition, and how much professional territory you are ready to occupy. The useful part of that pressure is not simply being more visible; it is noticing where growth gives you more leverage and where it only gives you more work.",
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
assert.match(request.instructions, /generic coaching advice/u);
assert.match(request.instructions, /Why the astrology points here/u);
assert.match(request.instructions, /historical comparison/u);
assert.ok(request.input.includes(`"referenceDate": "${now.toISOString()}"`), "The judge must receive the same calculation date as the writer.");
assert.match(request.instructions, /Annual evidence can include past events/u);
assert.match(request.input, /USER QUESTION/u);
assert.match(request.input, /READER ANSWER/u);
assert.match(request.input, /OWNER REGISTER EVIDENCE/u);
assert.match(request.input, /DETERMINISTIC FACT LOCK/u);
assert.ok(request.ownerPassageIds.length >= 3);
assert.doesNotThrow(() => assertOpenAiStrictResponseSchema(request.outputSchema, "ask_tldr_judge_v1"), "The actual judge schema must compile against the production provider subset.");
assert.ok(request.requestSha256);
const citationSchema = request.outputSchema.properties.findings.items.properties;
assert.deepEqual(citationSchema.evidenceIds.items.enum, writerOutput.evidenceIdsUsed,
  "Provider schema must constrain citation IDs before the live judge can invent a label or canonical ID.");
assert.deepEqual(citationSchema.ownerPassageIds.items.enum, request.ownerPassageIds);
assert.throws(() => validateAskTldrJudgeOutput(request, {
  scores: Object.fromEntries(ASK_TLDR_JUDGE_CATEGORIES.map((category) => [category, 4])),
  timingApplicability: { applicable: true, reason: "Fixture uses temporal evidence." },
  findings: [{ category: "astrology_fidelity", location: "rationale", finding: "Synthetic invalid citation.", evidenceIds: ["invented-factor"], ownerPassageIds: [] }]
}), /ASK_TLDR_JUDGE_FINDING_EVIDENCE_INVALID/u,
  "Deterministic citation validation remains in place behind the strict provider enum.");
assert.equal(ASK_TLDR_JUDGE_SCORE_FLOORS.practical_usefulness, 4, "Ask TLDR guidance must be fully usable without a reader translation step before release.");

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

const practicalThree = validateAskTldrJudgeOutput(request, {
  scores: { ...scores, practical_usefulness: 3 },
  timingApplicability: { applicable: true, reason: "The answer uses upcoming transit timing." },
  findings: [{
    category: "practical_usefulness",
    location: "closing advice",
    finding: "The answer gives polished guidance but leaves the reader to translate it into the next concrete step.",
    evidenceIds: [],
    ownerPassageIds: []
  }]
});
assert.equal(practicalThree.verdict, "below_threshold", "A fixable application gap must trigger the corrective rewrite instead of releasing the first draft.");

assert.throws(() => validateAskTldrJudgeOutput(request, {
  scores: { ...scores, astrology_fidelity: 2 },
  timingApplicability: { applicable: true, reason: "Temporal evidence is used." },
  findings: [{
    category: "astrology_fidelity",
    location: "astrology support",
    finding: "The aspect meaning changed or the astrology does not support the conclusion.",
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

assert.throws(() => validateAskTldrJudgeOutput(request, {
  scores,
  timingApplicability: { applicable: true, reason: "   " },
  findings: []
}), /ASK_TLDR_JUDGE_TIMING_APPLICABILITY_INVALID/u, "Empty timing reasons remain forbidden by the deterministic validator even though minLength is not sent to the provider.");

assert.throws(() => buildAskTldrJudgeRequest({
  writerRequest,
  writerOutput,
  evidence: governed.evidence,
  receipt,
  factLock: { ...factLock, passed: false, issues: [{ code: "fixture" }] }
}), /ASK_TLDR_JUDGE_FACT_LOCK_MUST_PASS/u);

console.log("Ask TLDR judge contract passed: astrology must materially support the conclusion, the reader-facing astrology section and trajectory are judged when evidence supports them, practical usefulness must be release-quality, historical lookbacks require calculated evidence, and deterministic score floors decide release quality.");
