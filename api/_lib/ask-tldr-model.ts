export type AskTldrPillarId =
  | "self" | "love" | "career" | "money" | "education"
  | "home_family" | "daily_life_health" | "social" | "spirituality";

export type AskTldrQuestionType = "current_state" | "pattern" | "guidance" | "direction" | "decision" | "timing";
export type AskTldrTimeWindow = "1_month" | "4_months" | "12_months";
export type AskTldrTemporalState = "natal" | "active" | "upcoming" | "annual";
export type AskTldrEvidenceKind =
  | "natal_placement" | "natal_aspect" | "transit_to_natal" | "transit_through_house"
  | "eclipse" | "return" | "profection" | "solar_return_overlay";

export type AskTldrQuestionDefinition = {
  id: string;
  displayQuestion: string;
  primaryIntent: string;
  secondaryIntents: string[];
  questionTypes: AskTldrQuestionType[];
  defaultTimeWindow: AskTldrTimeWindow;
  evidenceFocus?: string[];
};

export type AskTldrPillarDefinition = {
  id: AskTldrPillarId;
  label: string;
  description?: string;
  defaultEvidencePriority?: string[];
  questions: AskTldrQuestionDefinition[];
};

export type AskTldrAnswerModelConfig = {
  version: string;
  runtimeEnabled: boolean;
  timeWindowDays: Record<AskTldrTimeWindow, number>;
  temporalWeightsByQuestionType: Record<AskTldrQuestionType, Record<AskTldrTemporalState, number>>;
  matchWeights: {
    primaryIntentTheme: number;
    secondaryIntentTheme: number;
    pillarHouse: number;
    pillarAngle: number;
    pillarPoint: number;
    questionFocusHouse: number;
    questionFocusAngle: number;
    questionFocusPoint: number;
    majorCandidate: number;
    exactOrPeakWithin14Days: number;
    exactOrPeakWithin30Days: number;
    exactOrPeakWithinWindow: number;
  };
  pillarProfiles: Record<AskTldrPillarId, {
    houses: number[];
    angles: string[];
    points: string[];
    themes: string[];
  }>;
  answerContracts: Record<string, unknown>;
};

export type AskTldrIntentClassification = {
  primaryIntent: string;
  secondaryIntents?: string[];
  questionTypes: AskTldrQuestionType[];
  timeWindow?: AskTldrTimeWindow;
};

export type AskTldrEvidenceCandidate = {
  id: string;
  factorKey?: string;
  kind: AskTldrEvidenceKind;
  temporalState: AskTldrTemporalState;
  houses?: number[];
  angles?: string[];
  points?: string[];
  themes?: string[];
  exactAt?: string;
  startsAt?: string;
  endsAt?: string;
  importance?: "major" | "supporting";
  provenance: {
    calculator: string;
    sourceId: string;
  };
};

export type AskTldrRetrievalPlan = {
  schema: "ask-tldr-retrieval-plan.v1";
  questionId: string | null;
  questionText: string;
  source: "evergreen" | "free_text";
  pillarId: AskTldrPillarId;
  primaryIntent: string;
  secondaryIntents: string[];
  questionTypes: AskTldrQuestionType[];
  timeWindow: AskTldrTimeWindow;
  focus: { houses: number[]; angles: string[]; points: string[] };
  answerContract: "default" | AskTldrPillarId;
  decisionMode: "decision_support_not_outcome" | "interpretive_answer";
};

export type AskTldrRankedEvidence = AskTldrEvidenceCandidate & {
  score: number;
  role: "primary" | "supporting";
  reasons: string[];
};

const POINTS = ["Sun", "Moon", "Mercury", "Venus", "Mars", "Jupiter", "Saturn", "Uranus", "Neptune", "Pluto"] as const;
const ANGLES = ["Ascendant", "Midheaven", "Descendant", "IC"] as const;
const ORDINAL_HOUSE = /\b(1st|2nd|3rd|4th|5th|6th|7th|8th|9th|10th|11th|12th)\b/giu;

function unique<T>(values: T[]) {
  return [...new Set(values)];
}

function token(value: string) {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/gu, "_").replace(/^_+|_+$/gu, "");
}

function ordinalHouse(value: string) {
  const numeric = Number.parseInt(value, 10);
  return Number.isFinite(numeric) && numeric >= 1 && numeric <= 12 ? numeric : null;
}

export function askTldrFocusSelectors(evidenceFocus: string[] = []) {
  const text = evidenceFocus.join(" ");
  const houses = [...text.matchAll(ORDINAL_HOUSE)].flatMap((match) => {
    const house = ordinalHouse(match[1]);
    return house === null ? [] : [house];
  });
  const points = POINTS.filter((point) => new RegExp(`\\b${point}\\b`, "iu").test(text));
  const angles = ANGLES.filter((angle) => new RegExp(`\\b${angle}\\b`, "iu").test(text));
  return { houses: unique(houses), points: [...points], angles: [...angles] };
}

function assertPillar(model: AskTldrAnswerModelConfig, pillarId: AskTldrPillarId) {
  const profile = model.pillarProfiles[pillarId];
  if (!profile) throw new Error(`ASK_TLDR_UNKNOWN_PILLAR: ${pillarId}`);
  return profile;
}

function assertQuestionTypes(values: AskTldrQuestionType[]) {
  if (!values.length) throw new Error("ASK_TLDR_QUESTION_TYPE_REQUIRED");
  return unique(values);
}

export function compileEvergreenAskPlan(input: {
  model: AskTldrAnswerModelConfig;
  pillar: AskTldrPillarDefinition;
  question: AskTldrQuestionDefinition;
}): AskTldrRetrievalPlan {
  assertPillar(input.model, input.pillar.id);
  if (!input.pillar.questions.some((question) => question.id === input.question.id)) {
    throw new Error(`ASK_TLDR_QUESTION_PILLAR_MISMATCH: ${input.question.id}`);
  }
  return {
    schema: "ask-tldr-retrieval-plan.v1",
    questionId: input.question.id,
    questionText: input.question.displayQuestion,
    source: "evergreen",
    pillarId: input.pillar.id,
    primaryIntent: token(input.question.primaryIntent),
    secondaryIntents: unique(input.question.secondaryIntents.map(token)),
    questionTypes: assertQuestionTypes(input.question.questionTypes),
    timeWindow: input.question.defaultTimeWindow,
    focus: askTldrFocusSelectors(input.question.evidenceFocus),
    answerContract: input.model.answerContracts[input.pillar.id] ? input.pillar.id : "default",
    decisionMode: input.question.questionTypes.includes("decision") ? "decision_support_not_outcome" : "interpretive_answer"
  };
}

export function compileFreeTextAskPlan(input: {
  model: AskTldrAnswerModelConfig;
  pillarId: AskTldrPillarId;
  questionText: string;
  classification: AskTldrIntentClassification;
}): AskTldrRetrievalPlan {
  assertPillar(input.model, input.pillarId);
  if (!input.questionText.trim()) throw new Error("ASK_TLDR_FREE_TEXT_REQUIRED");
  const questionTypes = assertQuestionTypes(input.classification.questionTypes);
  return {
    schema: "ask-tldr-retrieval-plan.v1",
    questionId: null,
    questionText: input.questionText.trim(),
    source: "free_text",
    pillarId: input.pillarId,
    primaryIntent: token(input.classification.primaryIntent),
    secondaryIntents: unique((input.classification.secondaryIntents ?? []).map(token)),
    questionTypes,
    timeWindow: input.classification.timeWindow ?? "4_months",
    focus: { houses: [], angles: [], points: [] },
    answerContract: input.model.answerContracts[input.pillarId] ? input.pillarId : "default",
    decisionMode: questionTypes.includes("decision") ? "decision_support_not_outcome" : "interpretive_answer"
  };
}

function maximumTemporalWeight(model: AskTldrAnswerModelConfig, plan: AskTldrRetrievalPlan, state: AskTldrTemporalState) {
  return Math.max(...plan.questionTypes.map((type) => model.temporalWeightsByQuestionType[type][state]));
}

function daysFrom(now: Date, value?: string) {
  if (!value) return null;
  const parsed = new Date(value);
  if (!Number.isFinite(parsed.getTime())) return null;
  return (parsed.getTime() - now.getTime()) / 86_400_000;
}

function overlaps(values: string[] | undefined, targets: string[]) {
  const wanted = new Set(targets.map(token));
  return unique((values ?? []).map(token)).filter((value) => wanted.has(value));
}

function numericOverlaps(values: number[] | undefined, targets: number[]) {
  const wanted = new Set(targets);
  return unique(values ?? []).filter((value) => wanted.has(value));
}

function candidateWithinWindow(candidate: AskTldrEvidenceCandidate, plan: AskTldrRetrievalPlan, model: AskTldrAnswerModelConfig, now: Date) {
  if (candidate.temporalState !== "upcoming") return true;
  const distance = daysFrom(now, candidate.exactAt ?? candidate.startsAt);
  return distance === null || (distance >= -1 && distance <= model.timeWindowDays[plan.timeWindow]);
}

function scoreCandidate(
  candidate: AskTldrEvidenceCandidate,
  plan: AskTldrRetrievalPlan,
  model: AskTldrAnswerModelConfig,
  now: Date
) {
  if (!candidateWithinWindow(candidate, plan, model, now)) return null;
  const profile = assertPillar(model, plan.pillarId);
  const reasons: string[] = [];
  let score = maximumTemporalWeight(model, plan, candidate.temporalState);
  let relevanceMatches = 0;

  const candidateThemes = (candidate.themes ?? []).map(token);
  if (candidateThemes.includes(plan.primaryIntent)) {
    score += model.matchWeights.primaryIntentTheme;
    relevanceMatches += 1;
    reasons.push(`primary intent: ${plan.primaryIntent}`);
  }
  const secondary = plan.secondaryIntents.filter((intent) => candidateThemes.includes(intent));
  if (secondary.length) {
    score += model.matchWeights.secondaryIntentTheme;
    relevanceMatches += 1;
    reasons.push(`secondary intent: ${secondary.join(", ")}`);
  }

  const pillarHouses = numericOverlaps(candidate.houses, profile.houses);
  if (pillarHouses.length) {
    score += model.matchWeights.pillarHouse;
    relevanceMatches += 1;
    reasons.push(`pillar house: ${pillarHouses.join(", ")}`);
  }
  const pillarAngles = overlaps(candidate.angles, profile.angles);
  if (pillarAngles.length) {
    score += model.matchWeights.pillarAngle;
    relevanceMatches += 1;
    reasons.push(`pillar angle: ${pillarAngles.join(", ")}`);
  }
  const pillarPoints = overlaps(candidate.points, profile.points);
  if (pillarPoints.length) {
    score += model.matchWeights.pillarPoint;
    relevanceMatches += 1;
    reasons.push(`pillar point: ${pillarPoints.join(", ")}`);
  }

  const focusHouses = numericOverlaps(candidate.houses, plan.focus.houses);
  if (focusHouses.length) {
    score += model.matchWeights.questionFocusHouse;
    relevanceMatches += 1;
    reasons.push(`question-focus house: ${focusHouses.join(", ")}`);
  }
  const focusAngles = overlaps(candidate.angles, plan.focus.angles);
  if (focusAngles.length) {
    score += model.matchWeights.questionFocusAngle;
    relevanceMatches += 1;
    reasons.push(`question-focus angle: ${focusAngles.join(", ")}`);
  }
  const focusPoints = overlaps(candidate.points, plan.focus.points);
  if (focusPoints.length) {
    score += model.matchWeights.questionFocusPoint;
    relevanceMatches += 1;
    reasons.push(`question-focus point: ${focusPoints.join(", ")}`);
  }

  if (!relevanceMatches) return null;
  if (candidate.importance === "major") {
    score += model.matchWeights.majorCandidate;
    reasons.push("major calculated factor");
  }
  const distance = daysFrom(now, candidate.exactAt ?? candidate.startsAt);
  if (distance !== null && distance >= -1) {
    if (distance <= 14) {
      score += model.matchWeights.exactOrPeakWithin14Days;
      reasons.push("peaks within 14 days");
    } else if (distance <= 30) {
      score += model.matchWeights.exactOrPeakWithin30Days;
      reasons.push("peaks within 30 days");
    } else if (distance <= model.timeWindowDays[plan.timeWindow]) {
      score += model.matchWeights.exactOrPeakWithinWindow;
      reasons.push(`peaks within ${plan.timeWindow}`);
    }
  }
  return { score, reasons };
}

export function rankAskTldrEvidence(input: {
  model: AskTldrAnswerModelConfig;
  plan: AskTldrRetrievalPlan;
  candidates: AskTldrEvidenceCandidate[];
  now?: Date;
}): AskTldrRankedEvidence[] {
  const now = input.now ?? new Date();
  const ranked = input.candidates.flatMap((candidate) => {
    if (!candidate.id || !candidate.provenance?.calculator || !candidate.provenance?.sourceId) {
      throw new Error(`ASK_TLDR_INVALID_EVIDENCE_CANDIDATE: ${candidate.id || "missing-id"}`);
    }
    const scored = scoreCandidate(candidate, input.plan, input.model, now);
    return scored ? [{ ...candidate, ...scored }] : [];
  }).sort((left, right) => (
    right.score - left.score
    || (Date.parse(left.exactAt ?? left.startsAt ?? "9999-12-31") - Date.parse(right.exactAt ?? right.startsAt ?? "9999-12-31"))
    || left.id.localeCompare(right.id)
  ));

  const selected: Array<Omit<AskTldrRankedEvidence, "role">> = [];
  const factorKeys = new Set<string>();
  for (const candidate of ranked) {
    const factorKey = candidate.factorKey?.trim() || candidate.id;
    if (factorKeys.has(factorKey)) continue;
    selected.push(candidate);
    factorKeys.add(factorKey);
    if (selected.length >= 3) break;
  }
  return selected.map((candidate, index) => ({
    ...candidate,
    role: index === 0 ? "primary" as const : "supporting" as const
  }));
}

export function buildAskTldrAnswerPacket(input: {
  model: AskTldrAnswerModelConfig;
  plan: AskTldrRetrievalPlan;
  candidates: AskTldrEvidenceCandidate[];
  now?: Date;
}) {
  const evidence = rankAskTldrEvidence(input);
  return {
    schema: "ask-tldr-answer-packet.v1" as const,
    question: {
      id: input.plan.questionId,
      text: input.plan.questionText,
      source: input.plan.source,
      pillarId: input.plan.pillarId,
      primaryIntent: input.plan.primaryIntent,
      secondaryIntents: input.plan.secondaryIntents,
      questionTypes: input.plan.questionTypes,
      timeWindow: input.plan.timeWindow
    },
    decisionMode: input.plan.decisionMode,
    answerContract: {
      default: input.model.answerContracts.default,
      pillar: input.model.answerContracts[input.plan.pillarId] ?? null
    },
    evidence,
    evidenceIds: evidence.map((item) => item.id),
    generationAllowed: evidence.length > 0,
    generationBlockReason: evidence.length ? null : "NO_RELEVANT_CALCULATED_EVIDENCE"
  };
}
