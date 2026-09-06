import assert from "node:assert/strict";
import fs from "node:fs";
import { prepareEvergreenAskTldrCalibration } from "../api/_lib/ask-tldr-pipeline.ts";

const readJson = (relativePath) => JSON.parse(fs.readFileSync(new URL(relativePath, import.meta.url), "utf8"));
const model = readJson("../config/ask-tldr/answer-model-v1.json");
const reportWindow = readJson("./fixtures/marie-report-frozen-facts.json");
const now = new Date("2026-09-05T12:00:00Z");
const pillarFiles = [
  "self", "love", "career", "money", "education", "home_family", "daily_life_health", "social", "spirituality"
];

function category(prepared) {
  if (prepared.preparationAllowed) return "writer_ready_on_fixture";
  const reason = String(prepared.preparationBlockReason ?? "unknown");
  if (reason === "NO_RELEVANT_CALCULATED_EVIDENCE") return "no_relevant_fixture_evidence";
  if (reason === "PRIMARY_GOVERNED_INTERPRETATION_INCOMPLETE") return "primary_semantic_gap";
  if (/VOICE|OWNER|REGISTER/u.test(reason)) return "voice_receipt_gap";
  return "other_block";
}

const rows = [];
for (const pillarId of pillarFiles) {
  const pillar = readJson(`../config/ask-tldr/pillars/${pillarId}.json`);
  for (const question of pillar.questions) {
    let prepared;
    try {
      prepared = prepareEvergreenAskTldrCalibration({ model, pillar, question, reportWindow, now });
    } catch (error) {
      rows.push({
        pillarId,
        questionId: question.id,
        question: question.displayQuestion,
        status: "pipeline_exception",
        error: error instanceof Error ? error.message : String(error)
      });
      continue;
    }
    const primary = prepared.governedPacket.evidence.find((factor) => factor.role === "primary") ?? null;
    rows.push({
      pillarId,
      questionId: question.id,
      question: question.displayQuestion,
      questionTypes: question.questionTypes,
      timeWindow: question.defaultTimeWindow,
      focus: prepared.plan.focus,
      status: category(prepared),
      preparationAllowed: prepared.preparationAllowed,
      blockReason: prepared.preparationBlockReason,
      candidateCount: prepared.candidateCount,
      rankedEvidenceCount: prepared.rankedPacket.evidence.length,
      governedEvidenceCount: prepared.governedPacket.evidence.length,
      primary: primary ? {
        id: primary.id,
        factorKey: primary.factorKey ?? null,
        kind: primary.kind,
        temporalState: primary.temporalState,
        governedMeaningStatus: primary.governedMeaning.status,
        governedCanonicalIds: primary.governedMeaning.canonicalIds
      } : null,
      writerEvidenceIds: prepared.writerRequest?.evidenceIds ?? []
    });
  }
}

assert.equal(rows.length, 54, `Expected 54 evergreen questions, found ${rows.length}.`);
const exceptions = rows.filter((row) => row.status === "pipeline_exception");
assert.deepEqual(exceptions, [], `Evergreen support audit hit pipeline exceptions:\n${JSON.stringify(exceptions, null, 2)}`);
for (const row of rows.filter((entry) => entry.preparationAllowed)) {
  assert.equal(row.primary?.governedMeaningStatus, "full", `${row.questionId} became writer-ready without a full primary governed meaning.`);
  assert.ok(row.writerEvidenceIds.includes(row.primary.id), `${row.questionId} writer request omitted its primary factor.`);
}

const counts = rows.reduce((acc, row) => {
  acc[row.status] = (acc[row.status] ?? 0) + 1;
  return acc;
}, {});
const byPillar = Object.fromEntries(pillarFiles.map((pillarId) => {
  const pillarRows = rows.filter((row) => row.pillarId === pillarId);
  return [pillarId, pillarRows.reduce((acc, row) => {
    acc[row.status] = (acc[row.status] ?? 0) + 1;
    return acc;
  }, {})];
}));

console.log(JSON.stringify({
  schema: "ask-tldr-evergreen-support-audit.v1",
  note: "This is a calibration-fixture audit, not a claim that every reader should have relevant astrology for every question at every moment.",
  totalQuestions: rows.length,
  counts,
  byPillar,
  rows
}, null, 2));
