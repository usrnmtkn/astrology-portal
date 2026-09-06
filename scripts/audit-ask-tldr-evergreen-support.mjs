import assert from "node:assert/strict";
import fs from "node:fs";
import { buildAskTldrAnswerPacket, compileEvergreenAskPlan } from "../api/_lib/ask-tldr-model.ts";
import { askTldrEvidenceFromReportWindow } from "../api/_lib/ask-tldr-evidence-adapter.ts";
import { buildAskTldrGovernedAnswerPacket } from "../api/_lib/ask-tldr-governed-evidence.ts";

const readJson = (relativePath) => JSON.parse(fs.readFileSync(new URL(relativePath, import.meta.url), "utf8"));
const model = readJson("../config/ask-tldr/answer-model-v1.json");
const reportWindow = readJson("./fixtures/marie-report-frozen-facts.json");
const now = new Date("2026-09-05T12:00:00Z");
const pillarFiles = [
  "self", "love", "career", "money", "education", "home_family", "daily_life_health", "social", "spirituality"
];
const candidates = askTldrEvidenceFromReportWindow(reportWindow, now);

function category(ranked, governed) {
  if (!ranked.generationAllowed) return "no_relevant_fixture_evidence";
  if (governed.generationAllowed) return "primary_semantically_ready";
  if (governed.generationBlockReason === "PRIMARY_GOVERNED_INTERPRETATION_INCOMPLETE") return "primary_semantic_gap";
  return "other_block";
}

const rows = [];
for (const pillarId of pillarFiles) {
  const pillar = readJson(`../config/ask-tldr/pillars/${pillarId}.json`);
  for (const question of pillar.questions) {
    try {
      const plan = compileEvergreenAskPlan({ model, pillar, question });
      const ranked = buildAskTldrAnswerPacket({ model, plan, candidates, now });
      const governed = buildAskTldrGovernedAnswerPacket(ranked);
      const primary = governed.evidence.find((factor) => factor.role === "primary") ?? null;
      rows.push({
        pillarId,
        questionId: question.id,
        question: question.displayQuestion,
        questionTypes: question.questionTypes,
        timeWindow: question.defaultTimeWindow,
        focus: plan.focus,
        status: category(ranked, governed),
        candidateCount: candidates.length,
        rankedEvidenceCount: ranked.evidence.length,
        governedEvidenceCount: governed.evidence.length,
        primary: primary ? {
          id: primary.id,
          factorKey: primary.factorKey ?? null,
          kind: primary.kind,
          temporalState: primary.temporalState,
          governedMeaningStatus: primary.governedMeaning.status,
          governedCanonicalIds: primary.governedMeaning.canonicalIds
        } : null,
        fullGovernedEvidenceIds: governed.evidence
          .filter((factor) => factor.governedMeaning.status === "full")
          .map((factor) => factor.id),
        blockReason: governed.generationBlockReason ?? ranked.generationBlockReason
      });
    } catch (error) {
      rows.push({
        pillarId,
        questionId: question.id,
        question: question.displayQuestion,
        status: "pipeline_exception",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }
}

assert.equal(rows.length, 54, `Expected 54 evergreen questions, found ${rows.length}.`);
const exceptions = rows.filter((row) => row.status === "pipeline_exception");
assert.deepEqual(exceptions, [], `Evergreen support audit hit pipeline exceptions:\n${JSON.stringify(exceptions, null, 2)}`);
for (const row of rows.filter((entry) => entry.status === "primary_semantically_ready")) {
  assert.equal(row.primary?.governedMeaningStatus, "full", `${row.questionId} was marked semantically ready without a full primary governed meaning.`);
  assert.ok(row.fullGovernedEvidenceIds.includes(row.primary.id), `${row.questionId} full evidence list omitted its primary factor.`);
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
  note: "This is a semantic support audit against one rich frozen report-window fixture. It is not a claim that every reader should have relevant astrology for every question at every moment, and it intentionally excludes the separately-tested owner-voice receipt stage.",
  totalQuestions: rows.length,
  calculatedCandidateCount: candidates.length,
  counts,
  byPillar,
  rows
}, null, 2));
