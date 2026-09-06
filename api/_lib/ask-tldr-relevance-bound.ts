import type { AskTldrGovernedFactor } from "./ask-tldr-governed-evidence.js";
import {
  resolveAskTldrQuestionRelevanceEvidence,
  type AskTldrQuestionFocus,
  type AskTldrQuestionRelevanceEvidence
} from "./ask-tldr-relevance-evidence.js";

export type AskTldrQuestionRelevantFactor = AskTldrGovernedFactor & {
  questionRelevance: AskTldrQuestionRelevanceEvidence;
};

type SemanticPacket = {
  schema: "ask-tldr-governed-answer-packet.v1";
  question: Record<string, unknown>;
  decisionMode: string;
  answerContract: Record<string, unknown>;
  evidence: AskTldrGovernedFactor[];
  evidenceIds: string[];
  generationAllowed: boolean;
  generationBlockReason: string | null;
};

function focusFromQuestion(question: Record<string, unknown>): AskTldrQuestionFocus {
  const value = question.focus;
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return { houses: [], angles: [], points: [] };
  }
  const focus = value as Record<string, unknown>;
  return {
    houses: Array.isArray(focus.houses)
      ? focus.houses.filter((item): item is number => typeof item === "number" && Number.isInteger(item) && item >= 1 && item <= 12)
      : [],
    angles: Array.isArray(focus.angles) ? focus.angles.filter((item): item is string => typeof item === "string" && Boolean(item.trim())) : [],
    points: Array.isArray(focus.points) ? focus.points.filter((item): item is string => typeof item === "string" && Boolean(item.trim())) : []
  };
}

export function bindAskTldrQuestionRelevance(packet: SemanticPacket) {
  const focus = focusFromQuestion(packet.question);
  const evidence: AskTldrQuestionRelevantFactor[] = packet.evidence.map((factor) => ({
    ...factor,
    questionRelevance: resolveAskTldrQuestionRelevanceEvidence({ factor, focus })
  }));
  const primary = evidence.find((factor) => factor.role === "primary");
  const semanticReady = packet.generationAllowed && primary?.governedMeaning.status === "full";
  const relevanceReady = primary?.questionRelevance.status === "full";
  const generationAllowed = Boolean(semanticReady && relevanceReady);
  const generationBlockReason = !semanticReady
    ? packet.generationBlockReason ?? "PRIMARY_GOVERNED_INTERPRETATION_INCOMPLETE"
    : !relevanceReady
      ? "PRIMARY_QUESTION_RELEVANCE_UNGOVERNED"
      : null;
  return {
    schema: "ask-tldr-question-relevant-answer-packet.v1" as const,
    question: packet.question,
    decisionMode: packet.decisionMode,
    answerContract: packet.answerContract,
    evidence,
    evidenceIds: packet.evidenceIds,
    focus,
    generationAllowed,
    generationBlockReason,
    relevancePolicy: {
      explicitQuestionFocusRequired: true,
      primaryBridgeRequired: true,
      supportingFactorsWithoutBridgeMayNotEnterWriter: true
    }
  };
}
