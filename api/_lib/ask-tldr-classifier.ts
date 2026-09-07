import type {
  AskTldrIntentClassification,
  AskTldrPillarDefinition,
  AskTldrQuestionType,
  AskTldrTimeWindow
} from "./ask-tldr-model.ts";

export const ASK_TLDR_CLASSIFIER_VERSION = "ask-tldr-intent-classifier-v1" as const;

export type AskTldrClassifierRoute = "in_pillar" | "needs_rephrase";

export type AskTldrClassifierResult = AskTldrIntentClassification & {
  route: AskTldrClassifierRoute;
  confidence: "high" | "medium" | "low";
  reason: string;
};

const QUESTION_TYPES: AskTldrQuestionType[] = [
  "current_state", "pattern", "guidance", "direction", "decision", "timing"
];
const TIME_WINDOWS: AskTldrTimeWindow[] = ["1_month", "4_months", "12_months"];
const ASTROLOGY_TERMS = /\b(?:sun|moon|mercury|venus|mars|jupiter|saturn|uranus|neptune|pluto|chiron|lilith|node|ascendant|midheaven|descendant|\bic\b|house|transit|aspect|conjunction|opposition|square|trine|sextile|eclipse|profection|solar return|retrograde|zodiac|astrology|natal|degree|orb)\b/iu;

function token(value: string) {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/gu, "_").replace(/^_+|_+$/gu, "");
}

function unique<T>(values: T[]) {
  return [...new Set(values)];
}

export function askTldrPillarIntentVocabulary(pillar: AskTldrPillarDefinition) {
  return unique(pillar.questions.flatMap((question) => [
    token(question.primaryIntent),
    ...question.secondaryIntents.map(token)
  ])).sort();
}

export function askTldrClassifierSchema(pillar: AskTldrPillarDefinition) {
  const intents = askTldrPillarIntentVocabulary(pillar);
  if (!intents.length) throw new Error(`ASK_TLDR_CLASSIFIER_INTENT_GAP: ${pillar.id}`);
  return {
    type: "object",
    additionalProperties: false,
    required: ["route", "primaryIntent", "secondaryIntents", "questionTypes", "timeWindow", "confidence", "reason"],
    properties: {
      route: { type: "string", enum: ["in_pillar", "needs_rephrase"] },
      primaryIntent: { type: "string", enum: intents },
      secondaryIntents: {
        type: "array",
        maxItems: 3,
        items: { type: "string", enum: intents }
      },
      questionTypes: {
        type: "array",
        minItems: 1,
        maxItems: 3,
        items: { type: "string", enum: QUESTION_TYPES }
      },
      timeWindow: { type: "string", enum: TIME_WINDOWS },
      confidence: { type: "string", enum: ["high", "medium", "low"] },
      reason: { type: "string" }
    }
  } as const;
}

export function askTldrClassifierPrompt(input: {
  pillar: AskTldrPillarDefinition;
  questionText: string;
}) {
  const questionText = input.questionText.trim();
  if (!questionText) throw new Error("ASK_TLDR_CLASSIFIER_QUESTION_REQUIRED");
  const intents = askTldrPillarIntentVocabulary(input.pillar);
  return [
    `ASK_TLDR_INTENT_CLASSIFIER ${ASK_TLDR_CLASSIFIER_VERSION}`,
    "You classify the user's question. You do not answer it.",
    "The user has already chosen a life pillar. Treat that selected pillar as the routing boundary.",
    `SELECTED_PILLAR: ${input.pillar.id} (${input.pillar.label})`,
    `PILLAR_DESCRIPTION: ${input.pillar.description ?? ""}`,
    `ALLOWED_INTENTS: ${JSON.stringify(intents)}`,
    `ALLOWED_QUESTION_TYPES: ${JSON.stringify(QUESTION_TYPES)}`,
    `ALLOWED_TIME_WINDOWS: ${JSON.stringify(TIME_WINDOWS)}`,
    "CLASSIFICATION RULES:",
    "- Return only intents from ALLOWED_INTENTS.",
    "- primaryIntent is the single strongest reason the user is asking.",
    "- secondaryIntents are useful supporting concerns, maximum three, and must not repeat primaryIntent.",
    "- current_state means 'what is happening now/why now'; pattern means repeated or longstanding pattern; guidance means what to do/consider; direction means where this is going or what to build toward; decision means comparing or choosing; timing means when or whether now is a useful period.",
    "- Use 1_month for immediate/current questions, 4_months for ordinary near-term development or decisions, and 12_months only when the user explicitly asks about a year/longer direction or the question is inherently annual.",
    "- If the question cannot be meaningfully interpreted inside the selected pillar using the allowed intents, route=needs_rephrase. Do not silently move it to another pillar.",
    "- Do not infer astrology. Do not mention planets, signs, houses, aspects, transits, dates, natal placements, or chart factors.",
    "- Do not give advice or answer the user's question.",
    `USER_QUESTION: ${JSON.stringify(questionText)}`
  ].join("\n");
}

export function assertAskTldrClassifierPromptContainsNoAstrologyEvidence(prompt: string) {
  const evidenceMarkers = [
    "UNIT_FACTS", "FROZEN_FACTS", "REPORT_WINDOW", "CURRENT_SKY", "TOP_TRANSITS",
    "TIMING_BOOSTED_TRANSITS", "NATAL_CHART", "EVIDENCE_CANDIDATES", "KNOWLEDGE_IDS"
  ];
  for (const marker of evidenceMarkers) {
    if (prompt.includes(marker)) throw new Error(`ASK_TLDR_CLASSIFIER_ASTROLOGY_EVIDENCE_LEAK: ${marker}`);
  }
  return true;
}

export function validateAskTldrClassifierResult(input: {
  pillar: AskTldrPillarDefinition;
  value: unknown;
}): AskTldrClassifierResult {
  if (!input.value || typeof input.value !== "object" || Array.isArray(input.value)) {
    throw new Error("ASK_TLDR_CLASSIFIER_INVALID_RESULT: object required");
  }
  const value = input.value as Record<string, unknown>;
  const intents = new Set(askTldrPillarIntentVocabulary(input.pillar));
  const route = value.route;
  const primaryIntent = typeof value.primaryIntent === "string" ? token(value.primaryIntent) : "";
  const secondaryIntents = Array.isArray(value.secondaryIntents)
    ? value.secondaryIntents.map((intent) => typeof intent === "string" ? token(intent) : "")
    : [];
  const questionTypes = Array.isArray(value.questionTypes) ? value.questionTypes : [];
  const timeWindow = value.timeWindow;
  const confidence = value.confidence;
  const reason = typeof value.reason === "string" ? value.reason.trim() : "";

  if (route !== "in_pillar" && route !== "needs_rephrase") throw new Error("ASK_TLDR_CLASSIFIER_INVALID_ROUTE");
  if (!intents.has(primaryIntent)) throw new Error(`ASK_TLDR_CLASSIFIER_INVALID_PRIMARY_INTENT: ${primaryIntent}`);
  if (secondaryIntents.length > 3 || secondaryIntents.some((intent) => !intents.has(intent))) {
    throw new Error("ASK_TLDR_CLASSIFIER_INVALID_SECONDARY_INTENTS");
  }
  if (secondaryIntents.includes(primaryIntent) || new Set(secondaryIntents).size !== secondaryIntents.length) {
    throw new Error("ASK_TLDR_CLASSIFIER_DUPLICATE_INTENT");
  }
  if (!questionTypes.length || questionTypes.length > 3
    || questionTypes.some((type) => !QUESTION_TYPES.includes(type as AskTldrQuestionType))
    || new Set(questionTypes).size !== questionTypes.length) {
    throw new Error("ASK_TLDR_CLASSIFIER_INVALID_QUESTION_TYPES");
  }
  if (!TIME_WINDOWS.includes(timeWindow as AskTldrTimeWindow)) throw new Error("ASK_TLDR_CLASSIFIER_INVALID_TIME_WINDOW");
  if (confidence !== "high" && confidence !== "medium" && confidence !== "low") throw new Error("ASK_TLDR_CLASSIFIER_INVALID_CONFIDENCE");
  if (!reason) throw new Error("ASK_TLDR_CLASSIFIER_REASON_REQUIRED");
  if (ASTROLOGY_TERMS.test(reason)) throw new Error("ASK_TLDR_CLASSIFIER_ASTROLOGY_REASON_LEAK");

  return {
    route,
    primaryIntent,
    secondaryIntents,
    questionTypes: questionTypes as AskTldrQuestionType[],
    timeWindow: timeWindow as AskTldrTimeWindow,
    confidence,
    reason
  };
}

export function classifierResultToAskPlanClassification(result: AskTldrClassifierResult): AskTldrIntentClassification {
  if (result.route !== "in_pillar") throw new Error("ASK_TLDR_CLASSIFIER_REPHRASE_REQUIRED");
  return {
    primaryIntent: result.primaryIntent,
    secondaryIntents: [...result.secondaryIntents],
    questionTypes: [...result.questionTypes],
    timeWindow: result.timeWindow
  };
}
