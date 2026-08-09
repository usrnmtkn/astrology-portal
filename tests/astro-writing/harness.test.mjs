#!/usr/bin/env node

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  buildMeaningPlan,
  canonicalAstrologyReviewInstructions,
  canonicalAstrologyWritingInstructions,
  HARD_REVISE_FIELDS,
  HOUSE_BLEED_NOUNS,
  REVIEW_FIELDS,
  reviewDraft,
  runWritingPipeline,
  validateCopy
} from "../../src/astro-writing/index.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const read = (relativePath) => fs.readFileSync(path.join(repoRoot, relativePath), "utf8");
const jsonl = (relativePath) => read(relativePath).trim().split("\n").filter(Boolean).map(JSON.parse);

const astrologyContract = read("docs/writing/ASTROLOGY_CONTRACT.md");
const voiceContract = read("docs/writing/VOICE_CONTRACT.md");
const literalRules = read("docs/writing/LITERAL_LANGUAGE_RULES.md");
const rubric = read("docs/writing/REVIEW_RUBRIC.md");
const ownerDoctrine = read("packages/astro-knowledge/review/writing-harness-v1/TLDR-Owner-Writing-Doctrine.md");
const normalizedAstrologyContract = astrologyContract.replace(/\s+/gu, " ");
const normalizedLiteralRules = literalRules.replace(/\s+/gu, " ");
for (const required of [
  "FINAL V5 LOCK RULES",
  "CONCRETENESS AMENDMENT",
  "NOUN-LEVEL HOUSE-BLEED TEST",
  "Apply the same noun-level test to every sign before PASS."
]) {
  assert.ok(normalizedAstrologyContract.includes(required), `Astrology contract must contain ${required}.`);
  assert.ok(normalizedLiteralRules.includes(required), `Literal-language contract must contain ${required}.`);
}
assert.ok(voiceContract.includes("CODEX INSTRUCTION (owner-designated canonical form)"));
assert.ok(voiceContract.includes("# Marie voice bank (gold-standard reference)"));
assert.ok(rubric.includes("STAGE 1: ASTROLOGY MEANING PLAN"));
assert.ok(rubric.includes("STAGE 6: DETERMINISTIC VALIDATION"));
assert.ok(read("AGENTS.md").includes("skills/tldr-astro-writer/SKILL.md"));
assert.equal(astrologyContract, read("packages/astro-knowledge/review/writing-harness-v1/TLDR-Horoscope-Template-Canonical.md"));
assert.equal(literalRules, astrologyContract);
assert.equal(rubric, read("packages/astro-knowledge/review/writing-harness-v1/TLDR-Writing-Harness-Owner-Spec.md"));
assert.equal(read("docs/writing/BANNED_PATTERNS.md"), read("tldr-astro-phrasebank/WRITING-STANDARD.md"));
assert.equal(read("data/writing/OWNER_CORRECTIONS.jsonl"), read("packages/astro-knowledge/review/writing-harness-v1/TLDR-Owner-Corrections-Seed.jsonl"));
assert.ok(voiceContract.startsWith(ownerDoctrine));
assert.ok(voiceContract.endsWith(read("tldr-astro-phrasebank/MARIE-VOICE-BANK.md")));

const cjs = await import("../../src/astro-writing/canonicalInstructions.cjs");
assert.equal(cjs.default.canonicalAstrologyWritingInstructions, canonicalAstrologyWritingInstructions);
assert.equal(cjs.default.canonicalAstrologyReviewInstructions, canonicalAstrologyReviewInstructions);
const ownerCodexInstruction = ownerDoctrine.slice(ownerDoctrine.indexOf("CODEX INSTRUCTION (owner-designated canonical form):")).trim();
assert.ok(
  canonicalAstrologyWritingInstructions.replace(/\s+/gu, " ").startsWith(ownerCodexInstruction.replace(/\s+/gu, " ")),
  "Canonical API instructions must begin with the complete verbatim owner-designated doctrine."
);
assert.ok(
  voiceContract.replace(/\s+/gu, " ").includes(canonicalAstrologyWritingInstructions.split("\n\n")[0].replace(/\s+/gu, " ")),
  "Canonical API instructions must begin with the verbatim owner-designated doctrine."
);

const corrections = jsonl("data/writing/OWNER_CORRECTIONS.jsonl");
assert.equal(corrections.length, 13, "All 13 owner correction fixtures must be seeded.");
for (const fixture of corrections) {
  for (const field of ["bad", "corrected", "category", "why", "family", "rule"]) assert.ok(fixture[field], `Correction fixture missing ${field}.`);
  const review = await reviewDraft({
    draft: { body: fixture.bad },
    plan: { sign: null, house: null },
    context: { examples: [], corrections: [fixture] },
    family: fixture.family,
    register: fixture.family === "house-horoscope-core" ? "second_person" : "collective",
    requiredFields: ["body"]
  });
  assert.equal(review.decision, "REVISE", `Known bad fixture must be rejected: ${fixture.category}`);
  assert.ok(review.violations.some((violation) => violation.startsWith(`${fixture.category}:`)), `Fixture must retain category ${fixture.category}.`);
  const correctedLint = validateCopy(fixture.corrected, {
    family: fixture.family,
    register: fixture.family === "house-horoscope-core" ? "second_person" : "collective",
    ownerCorrections: [fixture]
  });
  assert.ok(!correctedLint.violations.some((violation) => violation.category === fixture.category), `Owner correction must clear its original failure: ${fixture.category}.`);
}

const approvedExamples = jsonl("data/writing/OWNER_APPROVED_EXAMPLES.jsonl");
assert.ok(approvedExamples.length > 6000, "Owner-approved evidence seed must cover the serving package and locked matrix tier.");
assert.ok(approvedExamples.every((entry) => entry.ownerApproved === true && entry.family && entry.register));
assert.ok(approvedExamples.some((entry) => entry.authority === "serving-review-status-approved"));
assert.ok(approvedExamples.some((entry) => entry.authority === "owner-approved-v8-locked"));
const fallbackRoot = path.join(repoRoot, "apps/web/src/content/fallbackArchitectureV3");
const servingKeys = new Set(
  JSON.parse(fs.readFileSync(path.join(fallbackRoot, "bundled-manifest-v3.json"), "utf8"))
    .keys.map((key) => key.slice(key.indexOf(":") + 1))
);
const approvedServingKeys = new Set();
function collectApprovedServingKeys(value) {
  if (Array.isArray(value)) return value.forEach(collectApprovedServingKeys);
  if (!value || typeof value !== "object") return;
  if (value.contentKey && value.review_status === "approved" && servingKeys.has(value.contentKey)) {
    approvedServingKeys.add(value.contentKey);
  }
  Object.values(value).forEach(collectApprovedServingKeys);
}
for (const directory of ["source-rows", "templates"]) {
  for (const name of fs.readdirSync(path.join(fallbackRoot, directory)).filter((entry) => entry.endsWith(".json"))) {
    collectApprovedServingKeys(JSON.parse(fs.readFileSync(path.join(fallbackRoot, directory, name), "utf8")));
  }
}
const indexedServingKeys = new Set(
  approvedExamples
    .filter((entry) => entry.authority === "serving-review-status-approved")
    .map((entry) => entry.contentKey)
);
assert.deepEqual(
  [...approvedServingKeys].filter((key) => !indexedServingKeys.has(key)),
  [],
  "Every currently serving source row with exact review_status approved must be indexed."
);
assert.equal(indexedServingKeys.size, approvedServingKeys.size);

for (const [sign, nouns] of Object.entries(HOUSE_BLEED_NOUNS)) {
  const result = validateCopy(`${nouns[0]} and ${nouns[1]} keep defining the whole passage.`, {
    plan: { sign, house: null }
  });
  assert.ok(result.violations.some((entry) => entry.category === "sign_house_separation"), `${sign} must receive the noun-level house-bleed test.`);
}

const meaningInput = {
  object: "lilith",
  sign: "sagittarius",
  objectFunction: "the preference or refusal that was kept quiet",
  signMechanics: "belief becomes more certain and harder to challenge",
  coreTension: "certainty starts replacing evidence",
  likelyObservableBehaviors: ["a repeated claim is checked against its source"],
  likelyConsequences: ["the belief either survives new information or loses authority"],
  risks: ["disagreement gets treated as bad character"]
};
const plan = buildMeaningPlan(meaningInput);
assert.equal(plan.house, null);
assert.ok(plan.prohibitedDomainAssumptions.includes("travel/education/legal"));
assert.ok(plan.DO_NOT_ASSUME.includes("a house or life domain that was not supplied"));

let reviewCount = 0;
const writerClient = async ({ stage, instructions }) => {
  assert.equal(instructions, canonicalAstrologyWritingInstructions);
  if (stage === "revision") return { hook: "Someone checks the claim before repeating it." };
  return {
    tagline: "Certainty is not evidence",
    hook: "The claim sounds convincing but nobody checks it.",
    lived: "A familiar answer keeps getting repeated after the facts change.",
    turn: "A belief can matter and still need to survive new information."
  };
};
const reviewValue = (decision) => ({
  ...Object.fromEntries(REVIEW_FIELDS.map((field) => [field, "PASS"])),
  ...(decision === "REVISE" ? { literal_first_read_clarity: "REVISE" } : {}),
  decision,
  violations: decision === "REVISE" ? ["literal_first_read_clarity: name the action"] : [],
  required_revisions: decision === "REVISE" ? [{ field: "hook", instruction: "Name the action." }] : []
});
const reviewerClient = async ({ instructions }) => {
  assert.equal(instructions, canonicalAstrologyReviewInstructions);
  reviewCount += 1;
  return reviewValue(reviewCount === 1 ? "REVISE" : "PASS");
};
const pipeline = await runWritingPipeline({
  meaningInput,
  examples: approvedExamples.filter((entry) => entry.family === "sky-placement" && entry.register === "collective").slice(0, 5),
  corrections: [],
  task: "Write one Lilith in Sagittarius placement.",
  writerClient,
  reviewerClient
});
assert.ok(pipeline.context.counts.examples > 0, "The default placement pipeline must retrieve owner-approved sky-placement examples.");
assert.equal(pipeline.draft.hook, "Someone checks the claim before repeating it.");
assert.equal(pipeline.draft.lived, "A familiar answer keeps getting repeated after the facts change.", "Surgical revision must preserve successful fields.");
assert.equal(pipeline.draft.ownerApproved, false, "Generated copy must never be labeled owner-approved.");
assert.equal(pipeline.draft.reviewStatus, "needs_review");
assert.equal(pipeline.report.automaticallyRevised, 1);
assert.equal(pipeline.report.finalLintStatus, "PASS");

for (const field of HARD_REVISE_FIELDS) assert.ok(REVIEW_FIELDS.includes(field));

const inconsistentReviewer = await reviewDraft({
  draft: {
    tagline: "A clear tension",
    hook: "The answer changes after the facts do.",
    lived: "A familiar claim gets repeated until someone checks the source.",
    turn: "Certainty can matter and still need evidence."
  },
  plan,
  context: { examples: [], corrections: [] },
  modelClient: async () => ({
    ...reviewValue("PASS"),
    voice_match: "REVISE",
    decision: "PASS",
    violations: ["voice_match: the sentence does not match the owner register"],
    required_revisions: [{ field: "hook", instruction: "Restore the owner register." }]
  })
});
assert.equal(inconsistentReviewer.decision, "REVISE", "Any reviewer field marked REVISE must block PASS.");

const directCallFiles = [
  "api/_lib/content-generation.ts",
  "packages/astro-knowledge/scripts/generate-sky-aspect-cards.js",
  "packages/astro-knowledge/scripts/judge-daily-glance.js",
  "packages/astro-knowledge/scripts/run-daily-glance-judged.js",
  "packages/astro-knowledge/scripts/run-daily-glance-writer-pilots.js",
  "packages/astro-knowledge/scripts/run-sky-placement-judge-ab-evaluation.js",
  "packages/astro-knowledge/scripts/run-sky-placement-writer-sample.js"
];
for (const file of directCallFiles) {
  const source = read(file);
  assert.ok(source.includes("api.openai.com/v1/responses"));
  assert.ok(source.includes("instructions:"), `${file} must load canonical instructions on every Responses API request.`);
  assert.ok(source.includes("canonicalAstrology"), `${file} must use the canonical shared instruction module.`);
}
const apiGeneration = read("api/_lib/content-generation.ts");
assert.ok(apiGeneration.includes("reviewGeneratedContentWithOpenAI"), "Application generation must run a separate review pass.");
assert.ok(apiGeneration.includes("data/writing/OWNER_APPROVED_EXAMPLES.jsonl"), "Application generation must retrieve from canonical owner-approved evidence.");
assert.ok(!apiGeneration.includes('status: "in.(LIVE,REVIEWED)"'), "Generic generated LIVE/REVIEWED rows must not be treated as owner voice.");
assert.ok(apiGeneration.includes('status: "DRAFT"'), "Generated application prose must remain DRAFT until owner approval.");
assert.ok(!apiGeneration.includes("previous_response_id"), "No call may rely on prior-response instruction persistence.");

console.log(JSON.stringify({
  corrections: corrections.length,
  ownerApprovedExamples: approvedExamples.length,
  apiCallSites: directCallFiles.length,
  pipeline: pipeline.report,
  status: "PASS"
}, null, 2));
