import assert from "node:assert/strict";
import fs from "node:fs";
import {
  ASK_TLDR_CLASSIFIER_VERSION,
  askTldrClassifierPrompt,
  askTldrClassifierSchema,
  askTldrPillarIntentVocabulary,
  assertAskTldrClassifierPromptContainsNoAstrologyEvidence,
  classifierResultToAskPlanClassification,
  validateAskTldrClassifierResult
} from "../api/_lib/ask-tldr-classifier.ts";
import { compileFreeTextAskPlan } from "../api/_lib/ask-tldr-model.ts";

const readJson = (relativePath) => JSON.parse(fs.readFileSync(new URL(relativePath, import.meta.url), "utf8"));
const model = readJson("../config/ask-tldr/answer-model-v1.json");
const career = readJson("../config/ask-tldr/pillars/career.json");
const love = readJson("../config/ask-tldr/pillars/love.json");
const money = readJson("../config/ask-tldr/pillars/money.json");

assert.equal(ASK_TLDR_CLASSIFIER_VERSION, "ask-tldr-intent-classifier-v1");
const careerIntents = askTldrPillarIntentVocabulary(career);
assert.ok(careerIntents.includes("recognition"));
assert.ok(careerIntents.includes("credit"));
assert.ok(careerIntents.includes("authority"));
assert.ok(careerIntents.includes("professional_direction"));
assert.equal(new Set(careerIntents).size, careerIntents.length);

const schema = askTldrClassifierSchema(career);
assert.deepEqual(schema.properties.primaryIntent.enum, careerIntents);
assert.deepEqual(schema.properties.route.enum, ["in_pillar", "needs_rephrase"]);
assert.equal(schema.properties.secondaryIntents.maxItems, 3);
assert.equal("uniqueItems" in schema.properties.secondaryIntents, false, "Keep provider schema inside the supported strict subset; runtime validation owns uniqueness.");

const prompt = askTldrClassifierPrompt({
  pillar: career,
  questionText: "Why am I doing all the work and nobody notices?"
});
assert.match(prompt, /SELECTED_PILLAR: career \(Career\)/u);
assert.match(prompt, /USER_QUESTION: "Why am I doing all the work and nobody notices\?"/u);
assert.match(prompt, /You classify the user's question\. You do not answer it\./u);
assert.match(prompt, /Do not infer astrology/u);
assert.doesNotMatch(prompt, /Jupiter opposition Midheaven|2026-09-15|natalHouse|slowTransitArcs/u, "Classifier prompt must not contain calculated astrology evidence.");
assert.doesNotThrow(() => assertAskTldrClassifierPromptContainsNoAstrologyEvidence(prompt));
assert.throws(
  () => assertAskTldrClassifierPromptContainsNoAstrologyEvidence(`${prompt}\nFROZEN_FACTS: {}`),
  /ASK_TLDR_CLASSIFIER_ASTROLOGY_EVIDENCE_LEAK/u
);

const careerResult = validateAskTldrClassifierResult({
  pillar: career,
  value: {
    route: "in_pillar",
    primaryIntent: "recognition",
    secondaryIntents: ["credit", "workload"],
    questionTypes: ["current_state", "guidance"],
    timeWindow: "1_month",
    confidence: "high",
    reason: "The question is about being noticed for work already being done and the amount of work involved."
  }
});
assert.deepEqual(careerResult, {
  route: "in_pillar",
  primaryIntent: "recognition",
  secondaryIntents: ["credit", "workload"],
  questionTypes: ["current_state", "guidance"],
  timeWindow: "1_month",
  confidence: "high",
  reason: "The question is about being noticed for work already being done and the amount of work involved."
});

const careerPlan = compileFreeTextAskPlan({
  model,
  pillarId: "career",
  questionText: "Why am I doing all the work and nobody notices?",
  classification: classifierResultToAskPlanClassification(careerResult)
});
assert.equal(careerPlan.primaryIntent, "recognition");
assert.deepEqual(careerPlan.secondaryIntents, ["credit", "workload"]);
assert.equal(careerPlan.timeWindow, "1_month");

const lovePattern = validateAskTldrClassifierResult({
  pillar: love,
  value: {
    route: "in_pillar",
    primaryIntent: "patterns",
    secondaryIntents: ["reciprocity"],
    questionTypes: ["pattern", "guidance"],
    timeWindow: "4_months",
    confidence: "high",
    reason: "The user is describing something that repeats in relationships and wants to understand what to do with it."
  }
});
assert.ok(lovePattern.questionTypes.includes("pattern"));

const moneyDecision = validateAskTldrClassifierResult({
  pillar: money,
  value: {
    route: "in_pillar",
    primaryIntent: "financial_decision",
    secondaryIntents: ["priorities"],
    questionTypes: ["decision", "guidance"],
    timeWindow: "4_months",
    confidence: "high",
    reason: "The user is weighing a significant money choice and wants to know which practical considerations deserve attention."
  }
});
assert.ok(moneyDecision.questionTypes.includes("decision"));

const offPillar = validateAskTldrClassifierResult({
  pillar: career,
  value: {
    route: "needs_rephrase",
    primaryIntent: "professional_direction",
    secondaryIntents: [],
    questionTypes: ["guidance"],
    timeWindow: "4_months",
    confidence: "low",
    reason: "The question does not contain enough information about work or professional direction to classify it confidently inside Career."
  }
});
assert.equal(offPillar.route, "needs_rephrase");
assert.throws(() => classifierResultToAskPlanClassification(offPillar), /ASK_TLDR_CLASSIFIER_REPHRASE_REQUIRED/u);

for (const badValue of [
  {
    route: "in_pillar", primaryIntent: "made_up_intent", secondaryIntents: [],
    questionTypes: ["guidance"], timeWindow: "4_months", confidence: "high", reason: "Work question."
  },
  {
    route: "in_pillar", primaryIntent: "recognition", secondaryIntents: ["recognition"],
    questionTypes: ["guidance"], timeWindow: "4_months", confidence: "high", reason: "Work question."
  },
  {
    route: "in_pillar", primaryIntent: "recognition", secondaryIntents: [],
    questionTypes: ["guidance", "guidance"], timeWindow: "4_months", confidence: "high", reason: "Work question."
  },
  {
    route: "in_pillar", primaryIntent: "recognition", secondaryIntents: [],
    questionTypes: ["guidance"], timeWindow: "4_months", confidence: "high", reason: "Jupiter in the 10th house explains it."
  }
]) {
  assert.throws(() => validateAskTldrClassifierResult({ pillar: career, value: badValue }));
}

console.log("Ask TLDR classifier contract passed: free text is classified inside the selected pillar, uses only governed intents, contains no astrology evidence, and can fail closed to rephrase.");
