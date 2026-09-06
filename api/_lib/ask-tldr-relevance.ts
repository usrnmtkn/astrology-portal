import {
  buildAskTldrAnswerPacket,
  type AskTldrAnswerModelConfig,
  type AskTldrEvidenceCandidate,
  type AskTldrRetrievalPlan
} from "./ask-tldr-model.js";

function token(value: string) {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/gu, "_").replace(/^_+|_+$/gu, "");
}

function stringOverlap(values: string[] | undefined, targets: string[]) {
  const wanted = new Set(targets.map(token));
  return (values ?? []).some((value) => wanted.has(token(value)));
}

function numberOverlap(values: number[] | undefined, targets: number[]) {
  const wanted = new Set(targets);
  return (values ?? []).some((value) => wanted.has(value));
}

export function askTldrCandidateMatchesQuestionFocus(candidate: AskTldrEvidenceCandidate, plan: AskTldrRetrievalPlan) {
  const hasLocationFocus = plan.focus.houses.length > 0 || plan.focus.angles.length > 0;
  const hasPointFocus = plan.focus.points.length > 0;
  const locationMatch = numberOverlap(candidate.houses, plan.focus.houses)
    || stringOverlap(candidate.angles, plan.focus.angles);
  const pointMatch = stringOverlap(candidate.points, plan.focus.points);
  if (hasLocationFocus) return locationMatch;
  if (hasPointFocus) return pointMatch;
  return true;
}

export function filterAskTldrCandidatesForQuestion(input: {
  plan: AskTldrRetrievalPlan;
  candidates: AskTldrEvidenceCandidate[];
}) {
  return input.candidates.filter((candidate) => askTldrCandidateMatchesQuestionFocus(candidate, input.plan));
}

export function buildQuestionFocusedAskTldrAnswerPacket(input: {
  model: AskTldrAnswerModelConfig;
  plan: AskTldrRetrievalPlan;
  candidates: AskTldrEvidenceCandidate[];
  now?: Date;
}) {
  const candidates = filterAskTldrCandidatesForQuestion({ plan: input.plan, candidates: input.candidates });
  const packet = buildAskTldrAnswerPacket({ ...input, candidates });
  return {
    ...packet,
    relevanceContract: {
      mode: input.plan.focus.houses.length || input.plan.focus.angles.length
        ? "question_location_required" as const
        : input.plan.focus.points.length
          ? "question_point_required" as const
          : "pillar_fallback" as const,
      totalCalculatedCandidates: input.candidates.length,
      questionRelevantCandidates: candidates.length,
      focus: input.plan.focus
    }
  };
}
