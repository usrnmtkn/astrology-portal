#!/usr/bin/env node

import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  buildMeaningPlan,
  buildCardWriterInstructions,
  applyOwnerApproval,
  applyRenderedSampleApproval,
  assertBatchGenerationAuthorized,
  assertServingAuthorized,
  CARD_WRITER_SEVEN_PASS_LOOP,
  CARD_WRITING_INSTRUCTIONS_VERSION,
  cardCritiqueChecklist,
  cardTransitTopLevelDirection,
  cardTransitWritingStandard,
  candidateCardAstrologyWritingInstructions,
  CANDIDATE_WRITER,
  CANONICAL_REVIEWER_INSTRUCTIONS_VERSION,
  COLD_RENDERED_PROSE_RULE,
  COLD_REVIEW_SCHEMA,
  canonicalAstrologyReviewInstructions,
  canonicalAstrologyWritingInstructions,
  coldRenderedProseReviewInstructions,
  CURRENT_PRODUCTION_WRITER,
  evaluateLilithVerticalSlice,
  extractNeutralExternalMeaning,
  HARD_REVISE_FIELDS,
  HOUSE_BLEED_CLUSTER_MIN_DISTINCT_NOUNS,
  HOUSE_BLEED_NOUNS,
  MEANING_PLAN_SCHEMA,
  generatedApprovalState,
  markPipelineReady,
  promoteCandidateWriter,
  REVIEW_SCHEMA,
  REVIEW_FIELDS,
  reviewDraft,
  runWritingPipeline,
  stageRenderedSample,
  validateWriterPromotion,
  validateCopy
} from "../../src/astro-writing/index.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const read = (relativePath) => fs.readFileSync(path.join(repoRoot, relativePath), "utf8");
const jsonl = (relativePath) => read(relativePath).trim().split("\n").filter(Boolean).map(JSON.parse);
const sha256 = (value) => crypto.createHash("sha256").update(value).digest("hex");

const astrologyContract = read("docs/writing/ASTROLOGY_CONTRACT.md");
const voiceContract = read("docs/writing/VOICE_CONTRACT.md");
const literalRules = read("docs/writing/LITERAL_LANGUAGE_RULES.md");
const rubric = read("docs/writing/REVIEW_RUBRIC.md");
const ownerDoctrine = read("packages/astro-knowledge/review/writing-harness-v1/TLDR-Owner-Writing-Doctrine.md");
const cardStandard = read("tldr-astro-phrasebank/TLDR-CARD-TRANSIT-WRITING-STANDARD-OWNER.md");
const cardChecklist = read("tldr-astro-phrasebank/TLDR-CARD-CRITIQUE-CHECKLIST-V3-DRAFT.md");
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
assert.ok(read("docs/writing/EDITORIAL-GATE-REVIEWER-PROMPT.md").includes("ASSUME THERE IS A DEFECT UNTIL EACH REQUIRED CHECK PASSES."));
assert.ok(read("docs/writing/SOURCE_GOVERNANCE.md").includes("That is derivative laundering."));
assert.ok(read("docs/writing/OWNER_APPROVAL_GOVERNANCE.md").includes("Only an explicit owner ruling may set:"));
assert.ok(read("docs/writing/OWNER_APPROVAL_GOVERNANCE.md").includes("approval-status-transitions.json"));
const implementationReport = read("packages/astro-knowledge/review/writing-harness-v2/implementation-report.md");
for (let item = 1; item <= 17; item += 1) assert.ok(implementationReport.includes(`## ${item}.`), `Implementation report must contain item ${item}.`);
assert.ok(read("AGENTS.md").includes("skills/tldr-astro-writer/SKILL.md"));
assert.equal(astrologyContract, read("packages/astro-knowledge/review/writing-harness-v1/TLDR-Horoscope-Template-Canonical.md"));
assert.equal(literalRules, astrologyContract);
assert.equal(rubric, read("packages/astro-knowledge/review/writing-harness-v1/TLDR-Writing-Harness-Owner-Spec.md"));
assert.equal(read("docs/writing/BANNED_PATTERNS.md"), read("tldr-astro-phrasebank/WRITING-STANDARD.md"));
assert.equal(read("data/writing/owner-corrections.jsonl"), read("packages/astro-knowledge/review/writing-harness-v2/owner-corrections.jsonl"));
assert.ok(voiceContract.startsWith(ownerDoctrine));
assert.ok(voiceContract.endsWith(read("tldr-astro-phrasebank/MARIE-VOICE-BANK.md")));
assert.equal(sha256(cardStandard), "20ebf9edc5143c7f7dc04672bb1d107f7b480dcac61043db17b19432c6491175", "Card transit writing standard must remain byte-for-byte owner supplied.");
assert.equal(cardTransitWritingStandard, cardStandard);
assert.equal(cardCritiqueChecklist, cardChecklist);
assert.match(cardStandard, /Status: owner ruling, 2026-08-09[\s\S]*Generation rule, not reader-facing copy/u);
assert.match(cardChecklist, /^\*\*Surface:\*\* `card`$/mu);
assert.match(cardChecklist, /^\*\*Status:\*\* `owner_approved`$/mu);
assert.match(cardChecklist, /^\*\*Approved source SHA-256:\*\* `3507f41f6c29b6b9abb2216e9f2acddf63be519866b4c88259c852791cbad043`$/mu);
assert.match(cardChecklist, /^\*\*Owner approved:\*\* `true`$/mu);
assert.match(cardChecklist, /^\*\*Active in harness:\*\* `true`$/mu);
assert.match(cardChecklist, /^\*\*Active in production:\*\* `false`$/mu);
assert.match(cardChecklist, /^\*\*Promotion authorized:\*\* `false`$/mu);
assert.match(cardChecklist, /For every complete card, ask:[\s\S]*15\. Does the copy have enough personality/u);
assert.match(cardChecklist, /The model returns findings only; runtime code computes PASS, REVISE, or FAIL\./u);
assert.deepEqual(CARD_WRITER_SEVEN_PASS_LOOP.map((entry) => entry.id), [
  "astrology_integrity",
  "remove_doctrine_prose",
  "voice",
  "lived_consequence",
  "cut",
  "full_family_comparison",
  "full_file_consistency"
]);
assert.match(cardTransitTopLevelDirection, /^23\. Compact instruction to give Codex/u);
const cardWriterInstructions = buildCardWriterInstructions(canonicalAstrologyWritingInstructions);
assert.equal(cardWriterInstructions, candidateCardAstrologyWritingInstructions);
assert.ok(cardWriterInstructions.includes(cardStandard), "Every card writer prompt must load the owner standard verbatim.");
assert.ok(cardWriterInstructions.includes(read("tldr-astro-phrasebank/TLDR-REGISTER-PER-SURFACE-RULING-OWNER.md")), "Every candidate card writer prompt must be surface-scoped.");
assert.ok(cardWriterInstructions.startsWith(cardTransitTopLevelDirection), "Section 23 must be the card writer's top-level direction.");

const cjs = await import("../../src/astro-writing/canonicalInstructions.cjs");
assert.equal(cjs.default.canonicalAstrologyWritingInstructions, canonicalAstrologyWritingInstructions);
assert.equal(cjs.default.candidateCardAstrologyWritingInstructions, candidateCardAstrologyWritingInstructions);
assert.equal(cjs.default.canonicalAstrologyReviewInstructions, canonicalAstrologyReviewInstructions);
assert.equal(cjs.default.CANONICAL_REVIEWER_INSTRUCTIONS_VERSION, CANONICAL_REVIEWER_INSTRUCTIONS_VERSION);
assert.equal(cjs.default.COLD_RENDERED_PROSE_RULE, COLD_RENDERED_PROSE_RULE);
assert.equal(cjs.default.coldRenderedProseReviewInstructions, coldRenderedProseReviewInstructions);
const ownerCodexInstruction = ownerDoctrine.slice(ownerDoctrine.indexOf("CODEX INSTRUCTION (owner-designated canonical form):")).trim();
assert.ok(
  canonicalAstrologyWritingInstructions.replace(/\s+/gu, " ").startsWith(ownerCodexInstruction.replace(/\s+/gu, " ")),
  "Canonical API instructions must begin with the complete verbatim owner-designated doctrine."
);
assert.ok(
  voiceContract.replace(/\s+/gu, " ").includes(canonicalAstrologyWritingInstructions.split("\n\n")[0].replace(/\s+/gu, " ")),
  "Canonical API instructions must retain the verbatim owner-designated doctrine."
);
assert.deepEqual(REVIEW_SCHEMA.properties.decision.enum, ["PASS", "REVISE"]);
assert.deepEqual(COLD_REVIEW_SCHEMA.properties.decision.enum, ["PASS", "REVISE"]);
assert.deepEqual(COLD_REVIEW_SCHEMA.properties.violations.items.properties.category.enum, ["cold_rendered_prose"]);
assert.deepEqual(COLD_REVIEW_SCHEMA.properties.violations.items.properties.severity.enum, ["nonblocking"]);
assert.ok(REVIEW_FIELDS.includes("cold_rendered_prose"));
assert.ok(!HARD_REVISE_FIELDS.includes("cold_rendered_prose"));
assert.ok(coldRenderedProseReviewInstructions.replace(/\s+/gu, " ").includes("Do not reward a sentence for being astrologically correct if it is awkward prose."));
assert.ok(canonicalAstrologyReviewInstructions.includes(COLD_RENDERED_PROSE_RULE));
assert.ok(canonicalAstrologyReviewInstructions.includes("DECISION CONTRACT: Return PASS or REVISE only. Never return FAIL."));
for (const sign of ["aries", "taurus", "gemini", "cancer", "leo", "virgo", "libra", "scorpio", "sagittarius", "capricorn", "aquarius", "pisces"]) {
  assert.ok(canonicalAstrologyReviewInstructions.includes(`## gold-lilith-${sign}-v5: PASS`), `Reviewer instructions must include the locked ${sign} PASS exemplar.`);
}

const corrections = jsonl("data/writing/owner-corrections.jsonl");
assert.equal(corrections.length, 20, "All 20 owner correction fixtures must be seeded.");
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
  assert.ok(review.violations.some((violation) => violation.category === fixture.category), `Fixture must retain category ${fixture.category}.`);
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
assert.ok(approvedExamples.some((entry) => (
  entry.authority === "owner-approved-v9-governance-labeled"
  && entry.governance === "owner-approved"
  && typeof entry.judgeLineage === "string"
)));
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

const emptyHouseV14ManifestPath = "packages/astro-knowledge/review/empty-house-v14/import-manifest.json";
const emptyHouseV14ProjectionPath = "packages/astro-knowledge/review/empty-house-v14/serving-projection-v14-projection-5.json";
const emptyHouseV14Manifest = JSON.parse(read(emptyHouseV14ManifestPath));
const emptyHouseV14Projection = JSON.parse(read(emptyHouseV14ProjectionPath));
const emptyHouseV14Rows = JSON.parse(read(
  "apps/web/src/content/fallbackArchitectureV3/source-rows/fallback-source-rows-v3.json"
)).hookRows
  .filter((row) => row.contentKey.startsWith("fallback-hook/empty-house/"))
  .sort((first, second) => first.contentKey.localeCompare(second.contentKey));
const emptyHouseV14Examples = approvedExamples.filter((entry) => entry.family === "empty-house-v14");
const emptyHouseV14ExamplesByKey = new Map();
for (const entry of emptyHouseV14Examples) {
  const entries = emptyHouseV14ExamplesByKey.get(entry.contentKey) ?? [];
  entries.push(entry);
  emptyHouseV14ExamplesByKey.set(entry.contentKey, entries);
}
const emptyHouseV14HarnessChecks = Object.fromEntries([
  "projection_manifest",
  "serving_key_coverage",
  "dual_voice_coverage",
  "exact_text_parity",
  "governance",
  "provenance",
  "register_safety",
].map((name) => [name, { passed: 0, failed: 0 }]));
function checkEmptyHouseV14(category, condition, message) {
  emptyHouseV14HarnessChecks[category][condition ? "passed" : "failed"] += 1;
  assert.ok(condition, message);
}

checkEmptyHouseV14("projection_manifest", emptyHouseV14Projection.version === "v14-projection-5", "Empty-house evidence must use projection 5.");
checkEmptyHouseV14("projection_manifest", emptyHouseV14Manifest.serving_projection_contract === path.basename(emptyHouseV14ProjectionPath), "Import manifest must select the projection-5 contract.");
checkEmptyHouseV14("projection_manifest", emptyHouseV14Projection.counts.serving_rows === 541, "Projection 5 must declare 541 serving rows.");
checkEmptyHouseV14("projection_manifest", emptyHouseV14Projection.body_they_approval_payload_sha256 === "6388f0d05e8bba16bce13f25b7faf052047ec0e3f64498595a4f993461c67811", "Friend evidence must remain bound to the owner-approved projection-5 digest.");
checkEmptyHouseV14("projection_manifest", emptyHouseV14Manifest.friend_variants.status === "approved", "Projection-5 Friend variants must be approved.");
checkEmptyHouseV14("serving_key_coverage", emptyHouseV14Rows.length === 541, "Serving source must contain 541 V14 rows.");
for (const row of emptyHouseV14Rows) {
  const entries = emptyHouseV14ExamplesByKey.get(row.contentKey) ?? [];
  checkEmptyHouseV14("serving_key_coverage", entries.length > 0, `${row.contentKey}: missing harness evidence.`);
  checkEmptyHouseV14("dual_voice_coverage", entries.length === 2 && new Set(entries.map((entry) => entry.voice)).size === 2, `${row.contentKey}: harness evidence must contain You and Friend exactly once.`);
  for (const [voice, bodyField, expectedRegister] of [
    ["you", "body_you", "second_person"],
    ["friend", "body_they", "friend"],
  ]) {
    const entry = entries.find((candidate) => candidate.voice === voice);
    checkEmptyHouseV14("exact_text_parity", entry?.text === row[bodyField], `${row.contentKey}/${voice}: indexed text differs from the approved serving row.`);
    checkEmptyHouseV14("governance", entry?.ownerApproved === true && entry?.authority === "serving-review-status-approved", `${row.contentKey}/${voice}: approval governance is incomplete.`);
    checkEmptyHouseV14(
      "provenance",
      entry?.source === "empty-house-v14/projection-5"
        && entry?.sourceManifest === emptyHouseV14ManifestPath
        && entry?.projectionContract === emptyHouseV14ProjectionPath
        && entry?.projectionVersion === "v14-projection-5",
      `${row.contentKey}/${voice}: projection-5 provenance is incomplete.`
    );
    checkEmptyHouseV14(
      "register_safety",
      entry?.register === expectedRegister
        && (voice !== "friend" || !/\b(?:you|your|yours|yourself)\b/iu.test(entry.text)),
      `${row.contentKey}/${voice}: voice register mismatch.`
    );
  }
}
checkEmptyHouseV14("serving_key_coverage", emptyHouseV14ExamplesByKey.size === 541, "Harness index must not include extra empty-house keys.");
checkEmptyHouseV14("dual_voice_coverage", emptyHouseV14Examples.length === 1082, "Harness index must contain 1,082 V14 voice entries.");
assert.ok(Object.values(emptyHouseV14HarnessChecks).every((result) => result.failed === 0));

for (const [sign, nouns] of Object.entries(HOUSE_BLEED_NOUNS)) {
  const legitimateExample = validateCopy(`One example involves ${nouns[0]}.`, {
    plan: { sign, house: null }
  });
  assert.ok(!legitimateExample.violations.some((entry) => entry.category === "sign_house_separation"), `${sign} must allow one legitimate domain example.`);
  const cluster = validateCopy(`${nouns.slice(0, HOUSE_BLEED_CLUSTER_MIN_DISTINCT_NOUNS).join(", ")} keep defining the whole passage.`, {
    plan: { sign, house: null }
  });
  assert.ok(cluster.violations.some((entry) => entry.category === "sign_house_separation"), `${sign} must reject a domain-noun cluster.`);
}

const protectedOwnerLine = "Compassion that was really self-erasure starts coming with limits attached.";
assert.equal(validateCopy(protectedOwnerLine, { protectedOwnerLines: [protectedOwnerLine] }).passed, true);
assert.ok(validateCopy(protectedOwnerLine).violations.some((entry) => entry.category === "banned_language"), "Protected owner vocabulary must remain banned outside its exact approved line.");

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

assert.ok(validateCopy({ body: "Someone checks the source before repeating the claim.", DO_NOT_ASSUME: plan.DO_NOT_ASSUME }, {
  plan,
  requiredFields: ["body"]
}).passed, "Internal guard fields must not be treated as reader copy.");
for (const leaked of [
  "DO NOT ASSUME a specific event.",
  "This transit does not necessarily mean a specific event will happen.",
  "A specific event, motive, relationship type, or biography not present in governed facts."
]) {
  const result = validateCopy(leaked, { plan });
  assert.ok(result.violations.some((entry) => entry.category === "shared_ban"), `Reader-facing guard leakage must fail: ${leaked}`);
}

let contextualReviewCount = 0;
let coldReviewCount = 0;
const writerClient = async ({ stage, instructions, input }) => {
  assert.equal(instructions, cardWriterInstructions);
  assert.ok(instructions.includes(cardStandard));
  if (stage === "draft") {
    assert.match(input, /CARD WRITER SEVEN-PASS CHAIN[\s\S]*full_file_consistency/u);
    assert.match(input, /CARD CRITIQUE CHECKLIST[\s\S]*Fifteen-question editorial test/u);
    assert.match(input, /DO_NOT_ASSUME and do_not_assume values are internal generation constraints/u);
  } else {
    assert.match(input, /"writerChain"[\s\S]*"full_file_consistency"/u);
    assert.match(input, /"cardCritiqueChecklist"/u);
  }
  if (stage === "revision") return { hook: "Someone checks the claim before repeating it." };
  return {
    tagline: "Certainty is not evidence",
    hook: "The claim sounds convincing but nobody checks it.",
    lived: "A familiar answer keeps getting repeated after the facts change.",
    turn: "A belief can matter and still need to survive new information."
  };
};
const reviewValue = (decision) => ({
  ...Object.fromEntries(REVIEW_FIELDS.map((field) => [field, {
    status: "PASS",
    reason: "No defect found for this check."
  }])),
  ...(decision === "REVISE" ? { literal_first_read_clarity: {
    status: "FAIL",
    reason: "Name the action."
  } } : {}),
  decision,
  violations: decision === "REVISE" ? [{
    category: "literal_first_read_clarity",
    severity: "blocking",
    location: "hook",
    text: "The claim sounds convincing but nobody checks it.",
    reason: "Name the action.",
    revision_instruction: "Name the action."
  }] : []
});
const coldReviewValue = (decision = "PASS") => ({
  cold_rendered_prose: {
    status: decision === "PASS" ? "PASS" : "FAIL",
    reason: decision === "PASS" ? "The rendered prose makes sense cold." : "The rendered prose requires translation."
  },
  decision,
  violations: decision === "PASS" ? [] : [{
    category: "cold_rendered_prose",
    severity: "nonblocking",
    location: "hook",
    text: "An opaque line.",
    reason: "The rendered prose requires translation.",
    revision_instruction: "State the meaning in ordinary language."
  }]
});
const reviewerClient = async ({ stage, instructions, input }) => {
  if (stage === "cold-review") {
    assert.equal(instructions, coldRenderedProseReviewInstructions);
    const parsed = JSON.parse(input);
    assert.deepEqual(Object.keys(parsed), ["rendered_copy"], "Cold review must receive rendered prose only.");
    assert.equal(typeof parsed.rendered_copy, "string");
    coldReviewCount += 1;
    return coldReviewValue("PASS");
  }
  assert.equal(stage, "review");
  assert.equal(instructions, canonicalAstrologyReviewInstructions);
  contextualReviewCount += 1;
  return reviewValue(contextualReviewCount === 1 ? "REVISE" : "PASS");
};
writerClient.provider = "gemini";
writerClient.model = "gemini-writer-fixture";
writerClient.thinkingLevel = "high";
reviewerClient.provider = "openai";
reviewerClient.model = "gpt-judge-fixture";
reviewerClient.reasoningEffort = "medium";
const pipeline = await runWritingPipeline({
  meaningInput,
  examples: approvedExamples.filter((entry) => entry.family === "sky-placement" && entry.register === "collective").slice(0, 5),
  corrections: [],
  task: "Write one Lilith in Sagittarius placement.",
  writerClient,
  reviewerClient,
  reviserClient: writerClient
});
assert.ok(pipeline.context.counts.examples > 0, "The default placement pipeline must retrieve owner-approved sky-placement examples.");
assert.equal(pipeline.draft.hook, "Someone checks the claim before repeating it.");
assert.equal(pipeline.draft.lived, "A familiar answer keeps getting repeated after the facts change.", "Surgical revision must preserve successful fields.");
assert.equal(pipeline.draft.ownerApproved, false, "Generated copy must never be labeled owner-approved.");
assert.equal(pipeline.draft.reviewStatus, "needs_review");
assert.equal(pipeline.draft.ownerStatus, "PENDING OWNER");
assert.equal(pipeline.draft.approvalStatus, "owner-review-pending");
assert.equal(pipeline.draft.generation_metadata.role, "CARD_WRITER_V3");
assert.equal(pipeline.draft.generation_metadata.provider, "gemini");
assert.equal(pipeline.draft.generation_metadata.model, "gemini-writer-fixture");
assert.equal(pipeline.draft.generation_metadata.thinkingLevel, "high");
assert.equal(pipeline.draft.generation_metadata.components.writer_prompt, CARD_WRITING_INSTRUCTIONS_VERSION);
assert.equal(pipeline.report.automaticallyRevised, 1);
assert.equal(pipeline.report.finalLintStatus, "PASS");
assert.equal(coldReviewCount, 2, "Every draft and revision must receive its own context-isolated cold read.");
assert.equal(contextualReviewCount, 2);

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
  modelClient: async ({ stage, input }) => {
    if (stage === "cold-review") {
      assert.deepEqual(Object.keys(JSON.parse(input)), ["rendered_copy"]);
      return coldReviewValue("PASS");
    }
    return {
      ...reviewValue("PASS"),
      voice_match: { status: "FAIL", reason: "The sentence does not match the owner register." },
      decision: "PASS",
      violations: [{
        category: "voice_match",
        severity: "nonblocking",
        location: "hook",
        text: "The answer changes after the facts do.",
        reason: "The sentence does not match the owner register.",
        revision_instruction: "Restore the owner register."
      }]
    };
  }
});
assert.equal(inconsistentReviewer.decision, "REVISE", "Any reviewer field marked REVISE must block PASS.");

const coldFailureReview = await reviewDraft({
  draft: {
    tagline: "A clear tension",
    hook: "The mechanism speaks through the answer.",
    lived: "A familiar claim gets repeated until someone checks the source.",
    turn: "Certainty can matter and still need evidence."
  },
  plan,
  context: { examples: [], corrections: [] },
  modelClient: async ({ stage, input }) => {
    if (stage === "cold-review") {
      assert.deepEqual(Object.keys(JSON.parse(input)), ["rendered_copy"]);
      return coldReviewValue("REVISE");
    }
    return reviewValue("PASS");
  }
});
assert.equal(coldFailureReview.decision, "PASS", "The permanently advisory cold check cannot block otherwise acceptable copy.");
assert.equal(coldFailureReview.cold_rendered_prose.status, "FAIL");
assert.ok(coldFailureReview.violations.some((entry) => entry.category === "cold_rendered_prose" && entry.severity === "nonblocking"));

const initialApproval = generatedApprovalState();
const documentApproved = applyOwnerApproval(markPipelineReady(initialApproval), {
  status: "owner-approved",
  exactOwnerRuling: "I approve the exact document wording."
});
assert.equal(documentApproved.batchGenerationAuthorized, false);
assert.equal(documentApproved.servingAuthorized, false);
assert.throws(() => assertBatchGenerationAuthorized(documentApproved), /RENDERED_SAMPLE_OWNER_APPROVAL_REQUIRED/);
assert.throws(() => assertServingAuthorized(documentApproved), /RENDERED_SAMPLE_OWNER_APPROVAL_REQUIRED/);
const renderedPending = stageRenderedSample(documentApproved, {
  sampleId: "rendered-sample-1",
  surface: "sky-placement"
});
assert.equal(renderedPending.renderedSampleStatus, "owner-review-pending");
assert.throws(() => assertServingAuthorized(renderedPending), /RENDERED_SAMPLE_OWNER_APPROVAL_REQUIRED/);
const renderedApproved = applyRenderedSampleApproval(renderedPending, {
  sampleId: "rendered-sample-1",
  exactOwnerRuling: "I approve this fully rendered product sample."
});
assert.equal(assertBatchGenerationAuthorized(renderedApproved), true);
assert.equal(assertServingAuthorized(renderedApproved), true);
const transitionContract = JSON.parse(read("data/writing/approval-status-transitions.json"));
assert.deepEqual(transitionContract.capabilityRequirements.batch_generation, ["rendered_sample_owner_approved"]);
assert.deepEqual(transitionContract.capabilityRequirements.serving, ["rendered_sample_owner_approved"]);

const coldFixtures = jsonl("data/writing/cold-rendered-prose-fixtures.jsonl");
assert.equal(coldFixtures.length, 13);
assert.equal(coldFixtures.filter((entry) => entry.fixture_kind === "negative" && entry.expected === "REVISE").length, 12);
assert.equal(coldFixtures.filter((entry) => entry.fixture_kind === "gold" && entry.expected === "PASS").length, 1);
for (const fixture of coldFixtures) assert.equal(sha256(fixture.rendered_copy), fixture.rendered_copy_sha256);
const coldRound2Train = jsonl("data/writing/cold-rendered-prose-round-2-train.jsonl");
const coldRound2Holdout = jsonl("data/writing/cold-rendered-prose-round-2-holdout.jsonl");
const coldRound2Briefing = read("packages/astro-knowledge/review/cold-rendered-prose-governance-v1/round-2-reviewer-briefing.md");
assert.equal(coldRound2Train.length, 6);
assert.equal(coldRound2Train.filter((entry) => entry.label === "FAIL").length, 4);
assert.equal(coldRound2Train.filter((entry) => entry.label === "PASS").length, 2);
assert.equal(coldRound2Holdout.filter((entry) => entry.fixture_kind === "holdout-negative").length, 8);
assert.equal(coldRound2Holdout.filter((entry) => entry.fixture_kind === "holdout-gold").length, 2);
assert.equal(coldRound2Holdout.filter((entry) => entry.fixture_kind === "borderline-probe").length, 3);
for (const fixture of [...coldRound2Train, ...coldRound2Holdout]) {
  assert.equal(sha256(fixture.rendered_copy), fixture.rendered_copy_sha256);
}
for (const fixture of coldRound2Holdout) {
  assert.ok(!coldRound2Briefing.includes(fixture.fixture_id), `${fixture.fixture_id} leaked into the TRAIN briefing.`);
  assert.ok(!coldRound2Briefing.includes(fixture.rendered_copy), `${fixture.fixture_id} full text leaked into the TRAIN briefing.`);
  assert.ok(!coldRound2Train.some((training) => training.rendered_copy_sha256 === fixture.rendered_copy_sha256));
}
const coldCalibration = JSON.parse(read("packages/astro-knowledge/review/cold-rendered-prose-governance-v1/calibration-status.json"));
const coldLiveEval = JSON.parse(read("packages/astro-knowledge/review/cold-rendered-prose-governance-v1/live-eval.json"));
const coldRound2LiveEval = JSON.parse(read("packages/astro-knowledge/review/cold-rendered-prose-governance-v1/round-2-live-eval.json"));
assert.equal(coldCalibration.trusted, false, "A failed cold-read calibration must remain untrusted.");
assert.equal(coldCalibration.promotionAuthorized, false, "A failed cold-read calibration may not be promoted.");
assert.equal(coldCalibration.mode, "permanently_advisory_only");
assert.equal(coldCalibration.proseJudgmentAuthority, "owner");
assert.equal(coldCalibration.furtherCalibrationAuthorized, false);
assert.equal(coldLiveEval.status, "FAIL");
assert.equal(coldRound2LiveEval.status, "FAIL");
assert.equal(coldRound2LiveEval.actual.negativeRevise, 8);
assert.equal(coldRound2LiveEval.actual.goldPass, 1);
assert.equal(coldCalibration.finalRound.holdout.negativeRevise, coldRound2LiveEval.actual.negativeRevise);
assert.equal(coldCalibration.finalRound.holdout.goldPass, coldRound2LiveEval.actual.goldPass);
assert.equal(transitionContract.proseJudgment.authority, "owner");
assert.equal(transitionContract.proseJudgment.semanticColdReview, "permanently_advisory_only");
assert.equal(transitionContract.proseJudgment.semanticColdReviewMayAuthorizeTransition, false);

const gold = jsonl("data/writing/owner-approved-examples.jsonl");
const negatives = jsonl("data/writing/negative-regression-fixtures.jsonl");
for (const fixture of gold) {
  const draft = Object.fromEntries(["tagline", "hook", "lived", "turn"].map((field) => [field, fixture[field]]));
  const lint = validateCopy(draft, {
    family: fixture.content_family,
    register: "collective",
    plan: { sign: fixture.astrology_context.sign, house: null },
    expectedPlaceholders: ["exitDate"],
    requiredFields: ["tagline", "hook", "lived", "turn"],
    protectedOwnerLines: Object.values(draft)
  });
  assert.equal(lint.passed, true, `${fixture.fixture_id} must pass the complete deterministic gate: ${JSON.stringify(lint.violations)}`);
}
const negativeCapricorn = negatives.find((fixture) => fixture.fixture_id === "neg-capricorn-career");
const negativeCapricornLint = validateCopy(negativeCapricorn.bad_text, {
  family: negativeCapricorn.content_family,
  register: "collective",
  plan: { sign: "capricorn", house: null }
});
assert.ok(negativeCapricornLint.violations.some((entry) => entry.category === "sign_house_separation"), "The all-career Capricorn negative must still fail the cluster rule.");
const verticalSlice = evaluateLilithVerticalSlice({ gold, negatives });
assert.equal(gold.length, 12);
assert.equal(negatives.length, 8);
assert.equal(verticalSlice.passed, true);
assert.equal(verticalSlice.goldPassed, 12);
assert.equal(verticalSlice.negativePassed, 8);
assert.equal(verticalSlice.falsePositives, 0);
assert.equal(verticalSlice.falseNegatives, 0);
const liveSemanticReport = JSON.parse(read("packages/astro-knowledge/review/writing-harness-v2/lilith-live-semantic-review-eval.json"));
assert.equal(liveSemanticReport.callCount, 20);
assert.equal(liveSemanticReport.model, "gpt-5.6-terra");
assert.equal(liveSemanticReport.reasoningEffort, "low");
assert.equal(liveSemanticReport.status, "FAIL", "The first live semantic result must remain an honest failed baseline.");
assert.equal(liveSemanticReport.modelGoldPassed, 5);
assert.equal(liveSemanticReport.modelNegativePassed, 4);
assert.equal(liveSemanticReport.modelFalsePositives, 7);
assert.equal(liveSemanticReport.modelFalseNegatives, 4);

const externalFacts = extractNeutralExternalMeaning({
  sourceId: "external-reference",
  provenance: "A named external reference.",
  facts: ["Jupiter spends roughly one year in each sign."]
});
assert.deepEqual(externalFacts.neutralFacts, ["Jupiter spends roughly one year in each sign."]);
assert.equal(externalFacts.draftingText, null);
assert.throws(() => extractNeutralExternalMeaning({
  sourceId: "external-reference",
  provenance: "A named external reference.",
  facts: ["Jupiter spends roughly one year in each sign."],
  externalProse: "Use this publication's phrasing as a model."
}), /Derivative-laundering guard/iu);

assert.equal(CURRENT_PRODUCTION_WRITER, null, "No writer is promoted without owner authorization.");
assert.equal(CANDIDATE_WRITER.promoted, false);
const promotionReport = {
  goldPassed: 12,
  negativePassed: 8,
  falsePositives: 0,
  falseNegatives: 0,
  blockingRegressions: 0
};
assert.equal(validateWriterPromotion(promotionReport).passed, true);
assert.throws(() => promoteCandidateWriter(promotionReport), /owner authorization/iu);

for (const field of MEANING_PLAN_SCHEMA.required) assert.ok(Object.hasOwn(plan, field), `Meaning plan must contain ${field}.`);

const directCallFiles = [
  "scripts/run-astro-writing-harness.mjs",
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
  assert.ok(source.includes("callOpenAIResponses"), `${file} must use the canonical Responses wrapper.`);
  assert.ok(!source.includes("api.openai.com/v1/responses"), `${file} may not bypass the canonical Responses wrapper.`);
}
const { callOpenAIResponses, instructionsForRole } = await import("../../src/astro-writing/openAIResponses.cjs").then((module) => module.default);
assert.equal(instructionsForRole("WRITER"), canonicalAstrologyWritingInstructions);
assert.equal(instructionsForRole("CARD_WRITER_V3"), candidateCardAstrologyWritingInstructions);
assert.equal(instructionsForRole("CARD_REVISER_V3"), candidateCardAstrologyWritingInstructions);
assert.ok(instructionsForRole("CARD_WRITER_V3").includes(cardStandard), "Every candidate CARD_WRITER_V3 call must load the card standard verbatim.");
assert.ok(instructionsForRole("CARD_REVISER_V3").includes(cardStandard), "Every candidate CARD_REVISER_V3 call must load the card standard verbatim.");
assert.equal(instructionsForRole("REVIEWER"), canonicalAstrologyReviewInstructions);
assert.equal(instructionsForRole("COLD_REVIEWER"), coldRenderedProseReviewInstructions);
let capturedWrapperBody = null;
await callOpenAIResponses({
  apiKey: "test-key",
  role: "REVIEWER",
  request: { model: "test-model", input: "Review this." },
  fetchImpl: async (_url, init) => {
    capturedWrapperBody = JSON.parse(init.body);
    return { json: async () => ({ id: "test-response" }), ok: true, status: 200 };
  }
});
assert.equal(capturedWrapperBody.instructions, canonicalAstrologyReviewInstructions);
await assert.rejects(() => callOpenAIResponses({
  apiKey: "test-key",
  role: "WRITER",
  request: { model: "test-model", input: "Write this.", previous_response_id: "forbidden" }
}), /previous-response instruction persistence/iu);
const apiGeneration = read("api/_lib/content-generation.ts");
assert.ok(apiGeneration.includes("reviewGeneratedContentWithOpenAI"), "Application generation must run a separate review pass.");
assert.ok(apiGeneration.includes('role: "COLD_REVIEWER"'), "Application generation must run the isolated cold-rendered-prose pass.");
assert.ok(apiGeneration.includes("renderedGeneratedCopy(draft)"), "The cold pass must receive rendered copy rather than drafting context.");
assert.ok(apiGeneration.includes("data/writing/OWNER_APPROVED_EXAMPLES.jsonl"), "Application generation must retrieve from canonical owner-approved evidence.");
assert.ok(!apiGeneration.includes('status: "in.(LIVE,REVIEWED)"'), "Generic generated LIVE/REVIEWED rows must not be treated as owner voice.");
assert.ok(apiGeneration.includes('status: "DRAFT"'), "Generated application prose must remain DRAFT until owner approval.");
assert.ok(!apiGeneration.includes("previous_response_id"), "No call may rely on prior-response instruction persistence.");

console.log(JSON.stringify({
  corrections: corrections.length,
  ownerApprovedExamples: approvedExamples.length,
  emptyHouseV14: {
    servingKeys: emptyHouseV14Rows.length,
    dualVoiceExamples: emptyHouseV14Examples.length,
    checks: emptyHouseV14HarnessChecks,
  },
  apiCallSites: directCallFiles.length,
  pipeline: pipeline.report,
  status: "PASS"
}, null, 2));
