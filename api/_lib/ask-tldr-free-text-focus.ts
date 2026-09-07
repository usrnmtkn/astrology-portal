import {
  askTldrFocusSelectors,
  type AskTldrIntentClassification,
  type AskTldrPillarDefinition,
  type AskTldrRetrievalPlan
} from "./ask-tldr-model.js";

function token(value: string) {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/gu, "_").replace(/^_+|_+$/gu, "");
}

function unique<T>(values: T[]) {
  return [...new Set(values)];
}

function questionIntents(question: AskTldrPillarDefinition["questions"][number]) {
  return [token(question.primaryIntent), ...question.secondaryIntents.map(token)];
}

export function askTldrFreeTextFocus(input: {
  pillar: AskTldrPillarDefinition;
  classification: AskTldrIntentClassification;
}) {
  const primary = token(input.classification.primaryIntent);
  const secondary = unique((input.classification.secondaryIntents ?? []).map(token));
  const exactPrimary = input.pillar.questions.filter((question) => token(question.primaryIntent) === primary);
  const primaryMatches = exactPrimary.length
    ? exactPrimary
    : input.pillar.questions.filter((question) => questionIntents(question).includes(primary));
  const secondaryMatches = secondary.flatMap((intent) => {
    const exact = input.pillar.questions.filter((question) => token(question.primaryIntent) === intent);
    return exact.length ? exact : input.pillar.questions.filter((question) => questionIntents(question).includes(intent));
  });
  const selectedQuestions = [...new Map([...primaryMatches, ...secondaryMatches].map((question) => [question.id, question])).values()];
  const selectors = askTldrFocusSelectors(selectedQuestions.flatMap((question) => question.evidenceFocus ?? []));
  return {
    ...selectors,
    sourceQuestionIds: selectedQuestions.map((question) => question.id),
    matchedPrimaryIntent: primaryMatches.length > 0,
    matchedSecondaryIntents: secondary.filter((intent) => selectedQuestions.some((question) => questionIntents(question).includes(intent)))
  };
}

export function applyAskTldrFreeTextFocus(input: {
  plan: AskTldrRetrievalPlan;
  pillar: AskTldrPillarDefinition;
  classification: AskTldrIntentClassification;
}): AskTldrRetrievalPlan {
  if (input.plan.source !== "free_text") throw new Error("ASK_TLDR_FREE_TEXT_FOCUS_SOURCE_REQUIRED");
  if (input.plan.pillarId !== input.pillar.id) throw new Error("ASK_TLDR_FREE_TEXT_FOCUS_PILLAR_MISMATCH");
  const focus = askTldrFreeTextFocus({ pillar: input.pillar, classification: input.classification });
  if (!focus.matchedPrimaryIntent || focus.sourceQuestionIds.length === 0) {
    throw new Error(`ASK_TLDR_FREE_TEXT_FOCUS_INTENT_UNMAPPED: ${input.plan.primaryIntent}`);
  }
  return {
    ...input.plan,
    focus: {
      houses: focus.houses,
      angles: focus.angles,
      points: focus.points
    }
  };
}
