import assert from "node:assert/strict";
import fs from "node:fs";
import { compileEvergreenAskPlan } from "../api/_lib/ask-tldr-model.ts";
import { buildQuestionFocusedAskTldrAnswerPacket } from "../api/_lib/ask-tldr-relevance.ts";
import { askTldrEvidenceFromReportWindow } from "../api/_lib/ask-tldr-evidence-adapter.ts";
import { buildAskTldrGovernedAnswerPacket } from "../api/_lib/ask-tldr-governed-evidence.ts";
import { bindAskTldrQuestionRelevance } from "../api/_lib/ask-tldr-relevance-bound.ts";

const readJson = (relativePath) => JSON.parse(fs.readFileSync(new URL(relativePath, import.meta.url), "utf8"));
const model = readJson("../config/ask-tldr/answer-model-v1.json");
const reportWindow = readJson("./fixtures/marie-report-frozen-facts.json");
const now = new Date("2026-09-05T12:00:00Z");
const pillarFiles = [
  "self", "love", "career", "money", "education", "home_family", "daily_life_health", "social", "spirituality"
];
const candidates = askTldrEvidenceFromReportWindow(reportWindow, now);

function hasExplicitFocus(plan) {
  return plan.focus.houses.length > 0 || plan.focus.angles.length > 0 || plan.focus.points.length > 0;
}

function category(plan, ranked, governed, bound) {
  if (!hasExplicitFocus(plan)) return "missing_explicit_question_focus";
  if (!ranked.generationAllowed) return "no_relevant_fixture_evidence";
  if (!governed.generationAllowed) {
    if (governed.generationBlockReason === "PRIMARY_GOVERNED_INTERPRETATION_INCOMPLETE") return "primary_semantic_gap";
    return "other_semantic_block";
  }
  if (!bound.generationAllowed) {
    if (bound.generationBlockReason === "PRIMARY_QUESTION_RELEVANCE_UNGOVERNED") return "primary_question_relevance_gap";
    return "other_relevance_block";
  }
  return "primary_question_ready";
}

const rows = [];
for (const pillarId of pillarFiles) {
  const pillar = readJson(`../config/ask-tldr/pillars/${pillarId}.json`);
  for (const question of pillar.questions) {
    try {
      const plan = compileEvergreenAskPlan({ model, pillar, question });
      const ranked = buildQuestionFocusedAskTldrAnswerPacket({ model, plan, candidates, now });
      const governed = buildAskTldrGovernedAnswerPacket(ranked);
      const bound = bindAskTldrQuestionRelevance(governed);
      const primary = bound.evidence.find((factor) => factor.role === "primary") ?? null;
      rows.push({
        pillarId,
        questionId: question.id,
        question: question.displayQuestion,
        questionTypes: question.questionTypes,
        timeWindow: question.defaultTimeWindow,
        focus: plan.focus,
        relevanceContract: ranked.relevanceContract,
        status: category(plan, ranked, governed, bound),
        candidateCount: candidates.length,
        questionRelevantCandidateCount: ranked.relevanceContract.questionRelevantCandidates,
        rankedEvidenceCount: ranked.evidence.length,
        governedEvidenceCount: governed.evidence.length,
        boundEvidenceCount: bound.evidence.length,
        writerEligibleEvidenceIds: bound.evidence
          .filter((factor) => factor.governedMeaning.status === "full" && factor.questionRelevance.status === "full")
          .map((factor) => factor.id),
        primary: primary ? {
          id: primary.id,
          factorKey: primary.factorKey ?? null,
          kind: primary.kind,
          temporalState: primary.temporalState,
          houses: primary.houses ?? [],
          angles: primary.angles ?? [],
          points: primary.points ?? [],
          governedMeaningStatus: primary.governedMeaning.status,
          governedCanonicalIds: primary.governedMeaning.canonicalIds,
          questionRelevanceStatus: primary.questionRelevance.status,
          questionRelevanceCanonicalIds: primary.questionRelevance.canonicalIds,
          questionRelevanceMatched: primary.questionRelevance.matched
        } : null,
        blockReason: bound.generationBlockReason ?? governed.generationBlockReason ?? ranked.generationBlockReason
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
const missingFocus = rows.filter((row) => row.status === "missing_explicit_question_focus");
assert.deepEqual(missingFocus, [], `Every evergreen question must compile to an explicit house, angle, or point focus:\n${JSON.stringify(missingFocus, null, 2)}`);
for (const row of rows.filter((entry) => entry.status === "primary_question_ready")) {
  assert.equal(row.primary?.governedMeaningStatus, "full", `${row.questionId} was marked ready without a full primary governed meaning.`);
  assert.equal(row.primary?.questionRelevanceStatus, "full", `${row.questionId} was marked ready without a full governed question-relevance bridge.`);
  assert.ok(row.writerEligibleEvidenceIds.includes(row.primary.id), `${row.questionId} writer-eligible evidence omitted its primary factor.`);
  if (row.relevanceContract.mode === "question_location_required") {
    const houseMatch = row.primary.houses.some((house) => row.focus.houses.includes(house));
    const angleMatch = row.primary.angles.some((angle) => row.focus.angles.includes(angle));
    assert.ok(houseMatch || angleMatch, `${row.questionId} primary factor does not touch its required question location.`);
  }
  if (row.relevanceContract.mode === "question_point_required") {
    assert.ok(row.primary.points.some((point) => row.focus.points.includes(point)), `${row.questionId} primary factor does not touch its required question point.`);
  }
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
  schema: "ask-tldr-evergreen-support-audit.v3",
  note: "This is a frozen-facts calibration audit, not a promise that every reader has answer-ready astrology for every question at every moment. Every evergreen question must compile to explicit retrieval anchors. A question is ready only when the primary calculated factor touches those anchors, its astrology meaning is fully governed, and the reason it answers the question is separately governed. Supporting factors lacking either full lane are not writer eligible.",
  totalQuestions: rows.length,
  calculatedCandidateCount: candidates.length,
  counts,
  byPillar,
  rows
}, null, 2));
