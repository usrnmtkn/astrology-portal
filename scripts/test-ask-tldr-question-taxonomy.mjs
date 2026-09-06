import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const taxonomyDir = path.join(repoRoot, "config/ask-tldr");
const pillarDir = path.join(taxonomyDir, "pillars");
const taxonomy = JSON.parse(fs.readFileSync(path.join(taxonomyDir, "manifest.json"), "utf8"));
const pillars = taxonomy.pillarFiles.map((file) => JSON.parse(fs.readFileSync(path.join(pillarDir, file), "utf8")));

assert.equal(taxonomy.schemaVersion, 1);
assert.equal(taxonomy.recordType, "ask_tldr_evergreen_question_taxonomy");
assert.equal(taxonomy.version, "ask-tldr-question-taxonomy-v1");
assert.equal(taxonomy.status, "needs_review");
assert.equal(taxonomy.ownerApproved, false);
assert.equal(taxonomy.promotionAuthorized, false);
assert.equal(taxonomy.runtimeEnabled, false);
assert.equal(taxonomy.pillarCount, 9);
assert.equal(taxonomy.questionCount, 54);
assert.equal(pillars.length, 9);

const expectedPillars = [
  ["self", "Self"],
  ["love", "Love"],
  ["career", "Career"],
  ["money", "Money"],
  ["education", "Education"],
  ["home_family", "Home & Family"],
  ["daily_life_health", "Daily Life & Health"],
  ["social", "Social"],
  ["spirituality", "Spirituality"]
];
assert.deepEqual(pillars.map(({ id, label }) => [id, label]), expectedPillars);
assert.deepEqual(taxonomy.pillarFiles, expectedPillars.map(([id]) => `${id}.json`));

const allowedTypes = new Set(taxonomy.allowedQuestionTypes);
const allowedWindows = new Set(taxonomy.allowedTimeWindows);
assert.deepEqual([...allowedTypes], ["current_state", "pattern", "guidance", "direction", "decision", "timing"]);
assert.deepEqual([...allowedWindows], ["1_month", "4_months", "12_months"]);

const questions = pillars.flatMap((pillar) => {
  assert.equal(pillar.questions.length, 6, `${pillar.id} must contain exactly six evergreen questions.`);
  assert.ok(pillar.description.trim(), `${pillar.id} needs a description.`);
  assert.ok(pillar.defaultEvidencePriority.length >= 2, `${pillar.id} needs default evidence priorities.`);
  return pillar.questions.map((question) => ({ pillar, question }));
});

assert.equal(questions.length, 54);
assert.equal(new Set(questions.map(({ question }) => question.id)).size, 54, "Question IDs must be unique.");
assert.equal(new Set(questions.map(({ question }) => question.displayQuestion)).size, 54, "Evergreen question text must be unique.");

for (const { pillar, question } of questions) {
  assert.ok(question.id.startsWith(`${pillar.id}.`), `${question.id} must use its pillar ID prefix.`);
  assert.ok(question.displayQuestion.endsWith("?"), `${question.id} must remain a reader-facing question.`);
  assert.ok(question.primaryIntent.trim(), `${question.id} needs a primary intent.`);
  assert.ok(question.secondaryIntents.length >= 1, `${question.id} needs secondary intents.`);
  assert.ok(question.questionTypes.length >= 1, `${question.id} needs at least one question type.`);
  assert.ok(question.questionTypes.every((type) => allowedTypes.has(type)), `${question.id} has an unsupported question type.`);
  assert.ok(allowedWindows.has(question.defaultTimeWindow), `${question.id} has an unsupported time window.`);
  assert.ok(question.evidenceFocus.length >= 1, `${question.id} needs question-specific evidence focus.`);
}

assert.equal(taxonomy.routingPolicy.evergreenAndFreeTextShareIntentLayer, true);
assert.equal(taxonomy.routingPolicy.pillarIsUserFacingAndDoesNotEqualHouse, true);
assert.equal(taxonomy.routingPolicy.astrologyRetrievedAfterIntentClassification, true);
assert.equal(taxonomy.routingPolicy.llmMustNotCalculateAstrology, true);
assert.equal(taxonomy.routingPolicy.evergreenQuestionTextIsIntentNotEvidence, true);
assert.equal(taxonomy.routingPolicy.answerMustNotTreatQuestionPremiseAsProvenFact, true);

const money = pillars.find((pillar) => pillar.id === "money");
assert.ok(money?.answerBoundary?.includes("Do not recommend or guarantee"), "Money must retain the financial-decision boundary.");
const health = pillars.find((pillar) => pillar.id === "daily_life_health");
assert.ok(health?.answerBoundary?.includes("Do not diagnose illness"), "Daily Life & Health must retain the medical-diagnosis boundary.");
const spirituality = pillars.find((pillar) => pillar.id === "spirituality");
assert.ok(spirituality?.answerBoundary?.includes("without asserting psychic certainty"), "Spirituality must retain the discernment boundary.");

const readerQuestionText = questions.map(({ question }) => question.displayQuestion).join("\n");
assert.doesNotMatch(readerQuestionText, /\balign(?:ed|ment)?\b/iu, "Evergreen questions should not use generic alignment language.");
assert.doesNotMatch(readerQuestionText, /Is this a good time to take a financial risk\?/u, "Evergreen questions must not ask astrology to green-light financial risk.");
assert.doesNotMatch(readerQuestionText, /\bthis person\b/iu, "Evergreen questions cannot depend on an undefined person.");
assert.doesNotMatch(readerQuestionText, /\bthis (?:relationship|friendship|course|degree|certification|program|position)\b/iu, "Evergreen questions cannot depend on an undefined object or relationship.");
assert.doesNotMatch(readerQuestionText, /^(?:Should I|Is this a good time to)/gimu, "Evergreen prompts should ask for context, tradeoffs, or timing evidence instead of asking astrology for a yes/no decision.");

console.log(`Ask TLDR taxonomy contract passed: ${taxonomy.pillarCount} pillars, ${questions.length} unique evergreen questions; review wall remains closed.`);
