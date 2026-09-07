import assert from "node:assert/strict";
import modelJson from "../../config/ask-tldr/answer-model-v1.json";
import selfJson from "../../config/ask-tldr/pillars/self.json";
import loveJson from "../../config/ask-tldr/pillars/love.json";
import careerJson from "../../config/ask-tldr/pillars/career.json";
import moneyJson from "../../config/ask-tldr/pillars/money.json";
import educationJson from "../../config/ask-tldr/pillars/education.json";
import homeFamilyJson from "../../config/ask-tldr/pillars/home_family.json";
import dailyLifeHealthJson from "../../config/ask-tldr/pillars/daily_life_health.json";
import socialJson from "../../config/ask-tldr/pillars/social.json";
import spiritualityJson from "../../config/ask-tldr/pillars/spirituality.json";
import {
  compileEvergreenAskPlan,
  type AskTldrAnswerModelConfig,
  type AskTldrPillarDefinition
} from "./ask-tldr-model.js";
import { buildQuestionFocusedAskTldrAnswerPacket } from "./ask-tldr-relevance.js";
import { askTldrEvidenceFromReportWindow } from "./ask-tldr-evidence-adapter.js";
import { buildAskTldrGovernedAnswerPacket } from "./ask-tldr-governed-evidence.js";
import { bindAskTldrQuestionRelevance } from "./ask-tldr-relevance-bound.js";

const model = modelJson as unknown as AskTldrAnswerModelConfig;
const pillars = [
  selfJson,
  loveJson,
  careerJson,
  moneyJson,
  educationJson,
  homeFamilyJson,
  dailyLifeHealthJson,
  socialJson,
  spiritualityJson
] as unknown as AskTldrPillarDefinition[];

function hasExplicitFocus(plan: ReturnType<typeof compileEvergreenAskPlan>) {
  return plan.focus.houses.length > 0 || plan.focus.angles.length > 0 || plan.focus.points.length > 0;
}

function category(
  plan: ReturnType<typeof compileEvergreenAskPlan>,
  ranked: ReturnType<typeof buildQuestionFocusedAskTldrAnswerPacket>,
  governed: ReturnType<typeof buildAskTldrGovernedAnswerPacket>,
  bound: ReturnType<typeof bindAskTldrQuestionRelevance>
) {
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

export function buildAskTldrEvergreenSupportAudit(input: {
  reportWindow: unknown;
  now: Date;
}) {
  const candidates = askTldrEvidenceFromReportWindow(input.reportWindow, input.now);
  const rows: Array<Record<string, unknown>> = [];

  for (const pillar of pillars) {
    for (const question of pillar.questions) {
      try {
        const plan = compileEvergreenAskPlan({ model, pillar, question });
        const ranked = buildQuestionFocusedAskTldrAnswerPacket({ model, plan, candidates, now: input.now });
        const governed = buildAskTldrGovernedAnswerPacket(ranked);
        const bound = bindAskTldrQuestionRelevance(governed);
        const primary = bound.evidence.find((factor) => factor.role === "primary") ?? null;
        rows.push({
          pillarId: pillar.id,
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
          pillarId: pillar.id,
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
    const primary = row.primary as {
      id: string;
      houses: number[];
      angles: string[];
      points: string[];
      governedMeaningStatus: string;
      questionRelevanceStatus: string;
    } | null;
    const writerEligibleEvidenceIds = row.writerEligibleEvidenceIds as string[];
    const focus = row.focus as { houses: number[]; angles: string[]; points: string[] };
    const relevanceContract = row.relevanceContract as { mode: string };

    assert.equal(primary?.governedMeaningStatus, "full", `${row.questionId} was marked ready without a full primary governed meaning.`);
    assert.equal(primary?.questionRelevanceStatus, "full", `${row.questionId} was marked ready without a full governed question-relevance bridge.`);
    assert.ok(primary && writerEligibleEvidenceIds.includes(primary.id), `${row.questionId} writer-eligible evidence omitted its primary factor.`);
    if (primary && relevanceContract.mode === "question_location_required") {
      const houseMatch = primary.houses.some((house) => focus.houses.includes(house));
      const angleMatch = primary.angles.some((angle) => focus.angles.includes(angle));
      assert.ok(houseMatch || angleMatch, `${row.questionId} primary factor does not touch its required question location.`);
    }
    if (primary && relevanceContract.mode === "question_point_required") {
      assert.ok(primary.points.some((point) => focus.points.includes(point)), `${row.questionId} primary factor does not touch its required question point.`);
    }
  }

  const counts = rows.reduce<Record<string, number>>((acc, row) => {
    const status = String(row.status);
    acc[status] = (acc[status] ?? 0) + 1;
    return acc;
  }, {});
  const byPillar = Object.fromEntries(pillars.map((pillar) => {
    const pillarRows = rows.filter((row) => row.pillarId === pillar.id);
    return [pillar.id, pillarRows.reduce<Record<string, number>>((acc, row) => {
      const status = String(row.status);
      acc[status] = (acc[status] ?? 0) + 1;
      return acc;
    }, {})];
  }));

  type SemanticGap = {
    factorKey: string | null;
    primaryId: string | null;
    kind: string | null;
    governedCanonicalIds: string[];
    questionIds: string[];
  };
  const gapMap = rows
    .filter((row) => row.status === "primary_semantic_gap")
    .reduce<Record<string, SemanticGap>>((acc, row) => {
      const primary = row.primary as {
        factorKey?: string | null;
        id?: string | null;
        kind?: string | null;
        governedCanonicalIds?: string[];
      } | null;
      const authorityKey = primary?.factorKey ?? primary?.id ?? `unknown:${String(row.questionId)}`;
      if (!acc[authorityKey]) {
        acc[authorityKey] = {
          factorKey: primary?.factorKey ?? null,
          primaryId: primary?.id ?? null,
          kind: primary?.kind ?? null,
          governedCanonicalIds: primary?.governedCanonicalIds ?? [],
          questionIds: []
        };
      }
      acc[authorityKey].questionIds.push(String(row.questionId));
      return acc;
    }, {});

  const uniqueSemanticAuthorityGaps = Object.values(gapMap)
    .map((gap) => ({
      ...gap,
      questionIds: gap.questionIds.sort(),
      affectedQuestionCount: gap.questionIds.length
    }))
    .sort((left, right) => String(left.factorKey ?? left.primaryId).localeCompare(String(right.factorKey ?? right.primaryId)));

  assert.equal(
    uniqueSemanticAuthorityGaps.reduce((sum, gap) => sum + gap.affectedQuestionCount, 0),
    counts.primary_semantic_gap ?? 0,
    "Unique semantic authority gap summary must account for every primary semantic-gap question."
  );

  return {
    schema: "ask-tldr-evergreen-support-audit.v4" as const,
    note: "This is a frozen-facts calibration audit, not a promise that every reader has answer-ready astrology for every question at every moment. Every evergreen question must compile to explicit retrieval anchors. A question is ready only when the primary calculated factor touches those anchors, its astrology meaning is fully governed, and the reason it answers the question is separately governed. Supporting factors lacking either full lane are not writer eligible. Question-level semantic gaps are also deduplicated into uniqueSemanticAuthorityGaps so repeated questions do not overstate the number of unresolved governed authorities.",
    totalQuestions: rows.length,
    calculatedCandidateCount: candidates.length,
    counts,
    byPillar,
    uniqueSemanticAuthorityGapCount: uniqueSemanticAuthorityGaps.length,
    uniqueSemanticAuthorityGaps,
    rows
  };
}
