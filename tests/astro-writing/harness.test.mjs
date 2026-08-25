#!/usr/bin/env node

import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  buildMeaningPlan,
  buildArgumentOutline,
  approveArgumentOutline,
  ARGUMENT_OUTLINE_FIELDS,
  ARGUMENT_OUTLINE_SPINE_QUALITY_FIELDS,
  ARGUMENT_OUTLINE_SLOW_MOVER_QUALITY_FIELDS,
  argumentOutlineFieldsForFamily,
  buildCardWriterInstructions,
  applyOwnerApproval,
  applyRenderedSampleApproval,
  assertSurfaceRegisterContract,
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
  CANONICAL_WRITING_INSTRUCTIONS_VERSION,
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
  MIN_SAME_FAMILY_OWNER_PASSAGES,
  approvedServingSceneCatalog,
  knowledgeMatrixSceneCatalog,
  ownerApprovedMatrixEvidenceForTarget,
  ownerApprovedMatrixRoleEvidenceForTarget,
  ownerRelevantEvidenceFromVoiceIndex,
  exactDelimitedPassage,
  ownerPositiveEvidenceFromApprovedTaskPassages,
  ownerPositiveEvidenceFromSurfaceQualifiedPool,
  ownerLockedLilithV5Evidence,
  generatedApprovalState,
  markPipelineReady,
  promoteCandidateWriter,
  REVIEW_SCHEMA,
  REVIEW_FIELDS,
  reviewDraft,
  resolveSurfaceStrategy,
  retrieveOwnerContext,
  runWritingPipeline,
  samePlanetSignHouseCoreScenes,
  sceneEvidenceForTarget,
  buildSharedEvidenceIndex,
  buildExtendedEvidenceCoverage,
  extractCollocations,
  novelCollocationAdvisories,
  matrixSceneNounLexicon,
  matrixEvidenceForTarget,
  normalizeMatrixToken,
  withoutGenericPlanetEducation,
  evidenceUseReview,
  loadPhraseEvidenceIndex,
  selectPhraseEvidence,
  missingContentSpines,
  getContentSpine,
  spineQualityElementsForFamily,
  selectOwnerCorrectionPairs,
  stageRenderedSample,
  validateWriterPromotion,
  validateCopy,
  validateCopyBatch,
  evaluateSpineQuality
} from "../../src/astro-writing/index.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const read = (relativePath) => fs.readFileSync(path.join(repoRoot, relativePath), "utf8");
const jsonl = (relativePath) => read(relativePath).trim().split("\n").filter(Boolean).map(JSON.parse);
const sha256 = (value) => crypto.createHash("sha256").update(value).digest("hex");
const SKY_PLACEMENT_TARGET = Object.freeze({
  surface: "sky-placement-page",
  route: "sky",
  renderer: "renderSkyPlacement",
  contentKeyFamily: "fallback-hook/sky-sign-copy/{planet}/{sign}",
  temporality: "current_sky",
  voiceMode: "current_sky_direct_address"
});
const runSkyPlacementWritingPipeline = (options) => runWritingPipeline({
  target: SKY_PLACEMENT_TARGET,
  relevantOwnerPassagesAvailableCount: 0,
  ownerPassageRelevanceTier: "none",
  ...options
});

assert.deepEqual(
  assertSurfaceRegisterContract(SKY_PLACEMENT_TARGET, { surface: "sky-placement-page", register: "second_person" }),
  SKY_PLACEMENT_TARGET
);
assert.throws(
  () => assertSurfaceRegisterContract(null, { surface: "sky-placement-page", register: "second_person" }),
  /SURFACE_REGISTER_GAP:unresolved_target/u
);
assert.throws(
  () => assertSurfaceRegisterContract({ ...SKY_PLACEMENT_TARGET, temporality: "natal" }, { surface: "sky-placement-page", register: "second_person" }),
  /SURFACE_REGISTER_GAP:temporality_mismatch:natal/u
);
assert.throws(
  () => assertSurfaceRegisterContract({ ...SKY_PLACEMENT_TARGET, renderer: "renderNatalPlacement" }, { surface: "sky-placement-page", register: "second_person" }),
  /SURFACE_REGISTER_GAP:renderer_mismatch:renderNatalPlacement/u
);
assert.doesNotThrow(() => assertSurfaceRegisterContract({
  surface: "calendar",
  route: "calendar",
  renderer: "renderSkyAspectCard",
  contentKeyFamily: "fallback-hook/sky-aspect-sign/{a}/{aSign}/{aspect}/{b}/{bSign}",
  temporality: "current_sky",
  voiceMode: "collective"
}, { surface: "calendar", register: "collective" }));
assert.throws(() => assertSurfaceRegisterContract({
  surface: "calendar",
  route: "calendar",
  renderer: "renderSkyAspectCard",
  contentKeyFamily: "fallback-hook/sky-aspect-sign/{a}/{aSign}/{aspect}/{b}/{bSign}",
  temporality: "natal",
  voiceMode: "second_person"
}, { surface: "calendar", register: "second_person" }), /SURFACE_REGISTER_GAP:temporality_mismatch:natal/u);

const astrologyContract = read("docs/writing/ASTROLOGY_CONTRACT.md");
const voiceContract = read("docs/writing/VOICE_CONTRACT.md");
const literalRules = read("docs/writing/LITERAL_LANGUAGE_RULES.md");
const rubric = read("docs/writing/REVIEW_RUBRIC.md");
const longFormVoiceStandard = read("docs/writing/MARIE_SATORI_LONG_FORM_VOICE_STANDARD.md");
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
assert.equal(
  sha256(longFormVoiceStandard),
  "8ac0a55bfe7b542204d08595ef13cf2ca49bc92c1f8734a230b5d2249c04afbe",
  "The owner-supplied long-form voice standard must remain byte-for-byte intact."
);
for (const required of [
  "A paragraph composed mostly of 4–12 word sentences is a voice failure.",
  "astrological condition → recognizable situation → learned behavior → underlying reason → consequence",
  "Write the whole thought."
]) {
  assert.ok(longFormVoiceStandard.includes(required), `Long-form owner standard must contain ${required}`);
}
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
assert.equal(sha256(cardStandard), "fb2eea13216bdff25f3c1f1a9940bd1fc92c518a1275815495b86e1517236c02", "Card transit writing standard must remain byte-for-byte owner supplied after the approved CC attribution rename.");
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
const compactCanonicalInstructions = canonicalAstrologyWritingInstructions.replace(/\s+/gu, " ");
const compactVoiceContract = voiceContract.replace(/\s+/gu, " ");
for (const instruction of [
  "A paragraph composed mostly of 4-12 word sentences is a voice failure.",
  "Do not split one connected thought into four or five punchy statements",
  "For Chiron, ask what happened, what the person learned to do because of it",
  "Advice may appear only after the mechanism and consequence are understood"
]) {
  assert.ok(
    compactCanonicalInstructions.includes(instruction),
    `Canonical API instructions must include the 2026-08-22 long-form voice rule: ${instruction}`
  );
}
assert.ok(REVIEW_FIELDS.includes("clipped_sentence_rhythm"));
assert.ok(HARD_REVISE_FIELDS.includes("clipped_sentence_rhythm"));
assert.match(canonicalAstrologyReviewInstructions, /9\. LONG-FORM SENTENCE ARCHITECTURE/u);
for (const instruction of [
  "Astrology may explain why the pattern is easy to enter, but it may not excuse an observable action",
  "A transitive instruction names its object.",
  "The copy becomes more specific after the opening, not more abstract.",
  "Astrology taxonomy is secondary after the opening"
]) {
  assert.ok(
    compactCanonicalInstructions.includes(instruction),
    `Canonical API instructions must include the 2026-08-21 human-pattern rule: ${instruction}`
  );
  assert.ok(
    compactVoiceContract.includes(instruction),
    `Voice contract must include the 2026-08-21 human-pattern rule: ${instruction}`
  );
}
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
assert.equal(corrections.length, 36, "All 36 owner correction fixtures must be seeded.");
const minedOwnerFeedback = jsonl("data/writing/owner-feedback-corpus.jsonl");
const allOwnerCorrections = [...new Map(
  [...corrections, ...minedOwnerFeedback].map((entry) => [entry.bad.trim().toLowerCase(), entry])
).values()];
assert.equal(allOwnerCorrections.length, 73, "The pair selector must receive all 73 deduplicated owner corrections.");
for (const fixture of corrections) {
  for (const field of ["bad", "corrected", "category", "why", "family", "rule"]) assert.ok(fixture[field], `Correction fixture missing ${field}.`);
  const review = await reviewDraft({
    draft: { body: fixture.bad },
    plan: { sign: null, house: null },
    context: { examples: [], corrections: [fixture] },
    family: fixture.family,
    register: fixture.family === "house-horoscope-core" ? "second_person" : "collective",
    surfaceStrategy: resolveSurfaceStrategy({ explicitStrategy: "sky-placement" }),
    requiredFields: ["body"]
  });
  assert.equal(review.decision, "REVISE", `Known bad fixture must be rejected: ${fixture.category}`);
  assert.ok(review.violations.some((violation) => violation.category === fixture.category), `Fixture must retain category ${fixture.category}.`);
  const correctedLint = validateCopy(fixture.corrected, {
    validationProfile: "shared-only",
    family: fixture.family,
    register: fixture.family === "house-horoscope-core" ? "second_person" : "collective",
    ownerCorrections: [fixture]
  });
  assert.ok(!correctedLint.violations.some((violation) => violation.category === fixture.category), `Owner correction must clear its original failure: ${fixture.category}.`);
}

const incompleteDoItem = validateCopy("Ask for more.", {
  validationProfile: "shared-only",
  family: "daily-dodont",
  register: "second_person"
});
assert.ok(
  incompleteDoItem.violations.some((violation) => violation.category === "vague_action_object"),
  "A transitive Do item without an object must fail behaviorally."
);
const completeDoItem = validateCopy("Ask for more time.", {
  validationProfile: "shared-only",
  family: "daily-dodont",
  register: "second_person"
});
assert.ok(
  !completeDoItem.violations.some((violation) => violation.category === "vague_action_object"),
  "Naming the governed object must clear the Do-item failure."
);

const relationshipRoomMetaphor = validateCopy("The obligations are eating the warmth out of the room.", {
  validationProfile: "shared-only",
  family: "synastry",
  register: "second_person"
});
assert.ok(
  relationshipRoomMetaphor.violations.some((violation) => violation.category === "relationship_container_metaphor"),
  "A relationship quality may not be located inside a metaphorical room."
);
for (const literalOrSpatialUse of ["Organize one room.", "Give the connection room to change."]) {
  const lint = validateCopy(literalOrSpatialUse, {
    validationProfile: "shared-only",
    family: "synastry",
    register: "second_person"
  });
  assert.ok(
    !lint.violations.some((violation) => violation.category === "relationship_container_metaphor"),
    `Literal or spatial room use must remain valid: ${literalOrSpatialUse}`
  );
}

const approvedCollocations = JSON.parse(read("data/writing/collocations/approved-collocations-v1.json"));
assert.equal(approvedCollocations.governance.status, "experimental-advisory-only");
assert.equal(approvedCollocations.governance.blocking, false);
assert.equal(approvedCollocations.governance.activation, "held-for-owner-review-after-false-positive-measurement");
assert.ok(approvedCollocations.counts.sentences > 49_000);
assert.ok(approvedCollocations.counts.uniquePairs > 48_000);
for (const [text, expectedPair] of [
  ["The clearest voice makes the choice.", "clearest + voice"],
  ["Resentment then grows inside an arrangement that still looks calm.", "calm + arrangement"],
  ["The connection can stay easy.", "stay + connection"]
]) {
  const advisories = novelCollocationAdvisories(text, approvedCollocations);
  assert.ok(advisories.some((entry) => entry.category === "novel_collocation" && entry.detail === expectedPair));
  assert.ok(advisories.every((entry) => entry.advisory === true && entry.blocking === false), "Novel collocations must remain advisory-only.");
}
for (const text of [
  "The loudest voice makes the choice while the more accommodating person takes the extra bill, revisions, or responsibility.",
  "Resentment then grows inside a connection that looks good from the outside."
]) {
  assert.equal(novelCollocationAdvisories(text, approvedCollocations).length, 0, `Owner correction must be in the approved pair table: ${text}`);
}
assert.ok(extractCollocations("The connection can stay easy.").some((entry) => entry.key === "verb_noun|stay|connection"));

for (const text of [
  "Honesty shows whether the connection can stay warm once your answer has equal weight.",
  "The reply tells you whether the arrangement can remain calm after you disagree.",
  "The question is whether the connection can carry a stated preference."
]) {
  const lint = validateCopy(text, {
    family: "fast-mover-article",
    register: "second_person",
    surface: "sky-placement-page"
  });
  assert.ok(
    lint.violations.some((violation) => violation.category === "vague_outcome_clause"),
    `Vague outcome clause must be rejected: ${text}`
  );
}
const concreteOutcomeLint = validateCopy(
  "Their response tells you which one it was: they reopen the decision and split the revisions, or they expect you to keep carrying the plan you never picked.",
  { family: "fast-mover-article", register: "second_person", surface: "sky-placement-page" }
);
assert.ok(!concreteOutcomeLint.violations.some((violation) => violation.category === "vague_outcome_clause"));

const approvedExamples = jsonl("data/writing/OWNER_APPROVED_EXAMPLES.jsonl");
const ownerRegisterGold = JSON.parse(read("data/writing/owner-register-gold.json"));
const ownerPositiveEvidence = ownerPositiveEvidenceFromSurfaceQualifiedPool(JSON.parse(read(
  "packages/astro-knowledge/voice/tldr-astro/satori-writer/surface-qualified-positive-exemplars-v2.json"
)));
const approvedTaskPassageManifest = JSON.parse(read("data/writing/owner-supplied-structural-exemplars.json"));
const ownerApprovedTaskPassages = ownerPositiveEvidenceFromApprovedTaskPassages(
  approvedTaskPassageManifest.entries.map((entry) => ({
    ...entry,
    text: exactDelimitedPassage(entry, read(entry.sourcePath))
  }))
);
const ownerLockedLilithEvidence = ownerLockedLilithV5Evidence(JSON.parse(read(
  "packages/astro-knowledge/review/lilith-placements-v5/lilith-placements-v5-staged-rows.json"
)).rows);
assert.equal(ownerLockedLilithEvidence.length, 48);
assert.ok(ownerPositiveEvidence.some((entry) => entry.sourceFamily === "sky-lunation"));
const lilithSagittariusRetrievalPlan = buildMeaningPlan({
  object: "lilith",
  sign: "sagittarius",
  objectFunction: "refusal, autonomy, and anger that carries information about a crossed limit",
  signMechanics: "belief, meaning, conviction, freedom, and the search for what is true",
  coreTension: "certainty becomes authority before the claim answers to evidence",
  likelyObservableBehaviors: ["a repeated claim is defended as a test of loyalty"],
  likelyConsequences: ["disagreement is treated as a character flaw"],
  risks: ["ninth-house topics replace the sign mechanism"]
});
const lilithSagittariusRetrievalContext = retrieveOwnerContext(lilithSagittariusRetrievalPlan, {
  examples: [...ownerPositiveEvidence, ...ownerLockedLilithEvidence],
  contentFamily: "slow-mover-article",
  register: "second_person",
  relevantOwnerPassagesAvailableCount: 0,
  ownerPassageRelevanceTier: "exact-owner-locked-lilith-placement",
  matrixEvidenceAvailableCount: 0,
  samePlanetSignSceneAvailableCount: 0,
  corrections: allOwnerCorrections,
  phraseEvidence: []
});
assert.ok(lilithSagittariusRetrievalContext.sameFamilyExamples.length >= 3);
assert.ok(lilithSagittariusRetrievalContext.sameFamilyExamples.every((entry) => entry.sourceFamily !== "sky-lunation"));
assert.ok(lilithSagittariusRetrievalContext.sameFamilyExamples.some((entry) => entry.sourceFamily === "owner-locked-lilith-v5-placement"));
const writerVoiceIndex = JSON.parse(read("packages/astro-knowledge/voice/tldr-astro/satori-writer/voice-index.json"));
const sunVirgoRelevantOwnerEvidence = ownerRelevantEvidenceFromVoiceIndex(writerVoiceIndex, { planet: "sun", sign: "virgo" });
assert.ok(sunVirgoRelevantOwnerEvidence.counts.selected >= 3);
assert.match(sunVirgoRelevantOwnerEvidence.tier, /same-sign/u);
assert.ok(sunVirgoRelevantOwnerEvidence.selected.some((entry) => entry.id.includes("virgo-season-2025")));
assert.ok(sunVirgoRelevantOwnerEvidence.selected.every((entry) => entry.ownerAuthored === true && entry.ownerApproved === true));
const sunVirgoRetrievalPlan = buildMeaningPlan({
  object: "sun",
  sign: "virgo",
  objectFunction: "identity, vitality, and the part of life asking to be expressed",
  signMechanics: "notices what can be repaired, clarified, or made more useful",
  coreTension: "discernment becomes self-surveillance when every improvement becomes proof that the present version is inadequate",
  likelyObservableBehaviors: ["someone notices the step that keeps creating avoidable work"],
  likelyConsequences: ["attention moves from fixing everything to changing what actually affects daily life"],
  risks: ["a standard becomes a moving target"]
});
const sunVirgoRetrievalContext = retrieveOwnerContext(sunVirgoRetrievalPlan, {
  examples: [...ownerPositiveEvidence, ...sunVirgoRelevantOwnerEvidence.selected],
  contentFamily: "fast-mover-article",
  register: "second_person",
  relevantOwnerPassagesAvailableCount: sunVirgoRelevantOwnerEvidence.counts.selected,
  ownerPassageRelevanceTier: sunVirgoRelevantOwnerEvidence.tier,
  matrixEvidenceAvailableCount: 0,
  samePlanetSignSceneAvailableCount: 0,
  corrections: allOwnerCorrections,
  phraseEvidence: []
});
assert.ok(sunVirgoRetrievalContext.relevantOwnerPassages.length >= 3);
assert.ok(sunVirgoRetrievalContext.relevantOwnerPassages.some((entry) => entry.id.includes("virgo-season-2025")));
const matrixEvidenceRows = jsonl("data/writing/matrix-evidence-index/TLDR-Matrix-Evidence-Index.jsonl");
const matrixCoverage = JSON.parse(read("data/writing/matrix-evidence-index/TLDR-Matrix-Coverage-By-Placement.json"));
const llMatrixV13Rows = JSON.parse(read("packages/astro-knowledge/voice/tldr-astro/satori-writer/ll-matrix-v13/ll-matrix-v13.json")).rows;
const llMatrixV13ManifestRows = JSON.parse(read("packages/astro-knowledge/review/ll-matrix-v13-runtime-manifest.json")).rows;
const skyPointMeaningRows = JSON.parse(read("tldr-astro-phrasebank/phrasebank/cc-sky-points-authored.json")).reviewed;
const ownerPhraseEvidence = loadPhraseEvidenceIndex(path.join(repoRoot, "data/writing/phrase-evidence-index/owner-phrase-evidence-v1.jsonl"));
const ownerPhraseEvidenceReport = JSON.parse(read("packages/astro-knowledge/review/writing-pipeline-v3/phrase-evidence-v1/phrase-evidence-index-report.json"));
assert.equal(ownerPhraseEvidence.filter((entry) => entry.store === "voice-bank").length, 87);
assert.equal(new Set(ownerPhraseEvidence.filter((entry) => entry.store === "voice-bank").flatMap((entry) => entry.themes)).size, 15);
assert.equal(ownerPhraseEvidence.length, 346);
for (const excludedContentKey of [
  "cc/quote/marie/032-pull-quote",
  "cc/quote/marie/044-pull-quote",
  "cc/quote/marie/058-pull-quote",
  "cc/quote/marie/059-pull-quote",
  "cc/quote/marie/065-pull-quote",
  "cc/quote/marie/068-pull-quote",
  "cc/quote/marie/073-pull-quote",
  "cc/quote/marie/076-pull-quote",
  "cc/quote/marie/080-pull-quote",
  "ms/quote/venus-virgo/daily-practice"
]) assert.ok(!ownerPhraseEvidence.some((entry) => entry.contentKey === excludedContentKey), `Partial PHRASE row was not excluded: ${excludedContentKey}`);
assert.equal(ownerPhraseEvidenceReport.sourceCounts.phrasebankConfirmedRowsExamined, 273);
assert.equal(ownerPhraseEvidenceReport.sourceCounts.phrasebankPartialRowsExcluded, 10);
assert.equal(ownerPhraseEvidenceReport.sourceCounts.phrasebankUniqueAfterCopyDedupe, 259);
assert.equal(ownerPhraseEvidenceReport.integrity.sourceByteMismatches, 0);
assert.equal(ownerPhraseEvidenceReport.integrity.builderCreatedJoinedSegments, 0);
assert.equal(matrixEvidenceRows.length, 3473);
assert.equal(Object.keys(matrixCoverage).length, 179);
assert.equal(Object.values(matrixCoverage).filter((entry) => entry.scene === 0).length, 114);
assert.equal(llMatrixV13Rows.filter((row) => row.ownerApproved === true).length, 302);
assert.equal(llMatrixV13ManifestRows.length, 301);
assert.equal(normalizeMatrixToken("Black Moon Lilith"), "lilith");
assert.equal(normalizeMatrixToken("Lunar Nodes"), "nodes");
assert.equal(normalizeMatrixToken("Any"), null);
assert.ok(matrixEvidenceForTarget(matrixEvidenceRows, { planet: "lilith", sign: "aries" }).meaning.length > 0, "Global Lilith meaning evidence must retrieve for a concrete sign.");
const moonEducation = "Your Moon is your instinctual emotional world: how you feel, what comforts you, how you care for yourself and others, how you react when you are upset, and what helps you recover after stress. Most of it is unconscious, conditioned behavior.";
assert.equal(withoutGenericPlanetEducation(`${moonEducation}\n\nThe message changes the plan.`), "The message changes the plan.");
const venusLibraRoleEvidence = ownerApprovedMatrixRoleEvidenceForTarget(matrixEvidenceRows, { planet: "venus", sign: "libra", eventType: "ingress" });
assert.ok(venusLibraRoleEvidence.meaning.length > 0);
assert.ok(venusLibraRoleEvidence.scene.length > 0);
assert.ok(venusLibraRoleEvidence.argument_candidate.length > 0);
assert.equal(new Set(venusLibraRoleEvidence.meaning.map((entry) => entry.copySha)).size, venusLibraRoleEvidence.meaning.length);
assert.ok(venusLibraRoleEvidence.meaning.every((entry) => entry.planet === "venus" && entry.sign === "libra" && entry.eventType === "ingress"));
assert.ok(venusLibraRoleEvidence.meaning.some((entry) => entry.text.includes("Fair can look very different depending on who keeps adjusting.")));
assert.ok(venusLibraRoleEvidence.argument_candidate.some((entry) => entry.text.includes("Fairness needs better terms") || entry.text.includes("Harmony works best")));
const venusLibraMatrixEvidence = ownerApprovedMatrixEvidenceForTarget(writerVoiceIndex, { planet: "venus", sign: "libra", surface: "sky-placement-page" });
assert.equal(venusLibraMatrixEvidence.filter((entry) => entry.sourcePath.includes("knowledge-matrix-v9")).length, 13);
assert.equal(venusLibraMatrixEvidence.filter((entry) => entry.sourcePath.includes("ll-matrix-v13")).length, 1);
assert.ok(venusLibraMatrixEvidence.some((entry) => entry.text.includes("Fair can look very different depending on who keeps adjusting.")));
assert.ok(venusLibraMatrixEvidence.some((entry) => entry.text.startsWith("Fairness needs better terms, not a prettier version of the old agreement.")));
assert.equal(venusLibraMatrixEvidence[0].precedence, 0, "Owner-approved exact-copy lineage must rank first.");
const venusLibraIngressMatrixEvidence = ownerApprovedMatrixEvidenceForTarget(writerVoiceIndex, { planet: "venus", sign: "libra", eventType: "ingress", surface: "sky-placement-page" });
assert.ok(venusLibraIngressMatrixEvidence.every((entry) => entry.eventType == null || entry.eventType === "ingress"));
const matrixSceneCatalog = knowledgeMatrixSceneCatalog(writerVoiceIndex);
const servingSceneCatalog = approvedServingSceneCatalog(approvedExamples);
const venusLibraHouseCoreScenes = samePlanetSignHouseCoreScenes(approvedExamples, { planet: "venus", sign: "libra" });
const venusLibraSceneEvidence = sceneEvidenceForTarget({
  approvedExamples,
  matrixEvidenceRows,
  registerExamples: [...ownerPositiveEvidence, ...ownerApprovedTaskPassages],
  sceneNounLexicon: matrixSceneNounLexicon(matrixEvidenceRows),
  plan: {
    object: "venus",
    sign: "libra",
    coreTension: "Agreement can look fair while one side keeps adjusting.",
    likelyObservableBehaviors: ["A shared cost stays uneven.", "One side absorbs the follow-up work."],
    risks: []
  }
});
assert.equal(matrixSceneCatalog.primary.length, 41, "Higher-governance matrix scene inventory must remain 41 unique rows.");
assert.equal(servingSceneCatalog.length, 51, "Approved serving scene inventory must include the V3 Moon rows and the owner-approved Sun square Ascendant passage that qualify as scene evidence.");
assert.equal(venusLibraHouseCoreScenes.length, 11);
assert.equal(venusLibraSceneEvidence.counts.samePlanetSignHouseCoreSelected, 11);
assert.equal(venusLibraSceneEvidence.counts.samePlanetSignSceneAvailable, 14);
assert.equal(venusLibraSceneEvidence.counts.servingSelected, 1);
assert.equal(venusLibraSceneEvidence.counts.matrixSelected, 1);
assert.ok(venusLibraSceneEvidence.selected.slice(0, 11).every((entry) => entry.sourceKind === "approved_house_horoscope_core"));
assert.equal(venusLibraSceneEvidence.selected[11]?.sourceKind, "approved_serving_row");
assert.ok(venusLibraSceneEvidence.selected.slice(12).every((entry) => entry.sourceKind === "owner_approved_knowledge_matrix_scene_index"));
for (const expected of [
  "reread the text before you send it",
  "One quick favor turns into your whole afternoon",
  "who makes the plan, who changes it, who follows up, who apologizes first"
]) assert.ok(venusLibraSceneEvidence.selectedPrimary.some((entry) => entry.text.includes(expected)), `Venus scene packet missing: ${expected}`);
assert.ok(venusLibraSceneEvidence.selected.every((entry) => entry.useAsSceneEvidence === true && entry.useAsPositiveVoiceEvidence === false));
assert.ok(approvedExamples.length > 6000, "Owner-approved evidence seed must cover the serving package and locked matrix tier.");
const sharedEvidenceIndex = buildSharedEvidenceIndex({
  matrixEvidenceRows,
  llMatrixV13Rows,
  llMatrixV13ManifestRows,
  approvedExamples,
  registerExamples: [...ownerPositiveEvidence, ...ownerApprovedTaskPassages],
  registerGoldExamples: ownerRegisterGold,
  phraseExamples: ownerPhraseEvidence,
  skyPointMeaningRows
});
const extendedCoverage = buildExtendedEvidenceCoverage({ matrixCoverage, index: sharedEvidenceIndex });
assert.deepEqual(Object.keys(sharedEvidenceIndex.counts).sort(), ["argument", "entries", "meaning", "phrase", "planetSignKeys", "register", "scene"].sort());
assert.ok(sharedEvidenceIndex.counts.meaning > 1800);
assert.ok(sharedEvidenceIndex.counts.scene > 400);
assert.ok(sharedEvidenceIndex.byPlanetSign["venus|libra"].meaning.length >= 20);
assert.ok(sharedEvidenceIndex.byPlanetSign["venus|libra"].scene.length >= 12);
assert.ok(sharedEvidenceIndex.byPlanetSign["venus|libra"].argument.length >= 1);
assert.ok(sharedEvidenceIndex.byPlanetSign["chiron|taurus"].register.includes("register:structural-calibration-chiron-taurus-house-12-2026-08-25"));
const approvedTaskRegister = sharedEvidenceIndex.entries.find((entry) => entry.id === "register:structural-calibration-chiron-taurus-house-12-2026-08-25");
assert.equal(approvedTaskRegister?.ownerAuthored, true);
assert.equal(approvedTaskRegister?.ownerApproved, true);
assert.equal(approvedTaskRegister?.sourceKind, "owner-corpus-passage");
assert.equal(sharedEvidenceIndex.entries.filter((entry) => entry.sourceKind === "owner-approved-ll-matrix-v13").length, 301);
assert.ok(sharedEvidenceIndex.byPlanetSign["moon|cancer"].meaning.some((id) => id.startsWith("ll-matrix-v13:")));
assert.ok(sharedEvidenceIndex.byPlanetSign["moon|aquarius"].meaning.some((id) => id.startsWith("ll-matrix-v13:")));
for (const sign of ["aries", "taurus", "gemini", "cancer", "leo", "virgo", "libra", "scorpio", "sagittarius", "capricorn", "aquarius", "pisces"]) {
  assert.ok(sharedEvidenceIndex.byPlanetSign[`lilith|${sign}`]?.meaning.length > 0, `Lilith ${sign} must retrieve reviewed exact-sign meaning evidence.`);
  assert.ok((sharedEvidenceIndex.byPlanetSign[`lilith|${sign}`]?.scene.length ?? 0) + (sharedEvidenceIndex.byPlanetSign[`lilith|${sign}`]?.argument.length ?? 0) > 0, `Lilith ${sign} must retrieve real scene or argument evidence.`);
}
assert.equal(sharedEvidenceIndex.byPlanetSign["*|*"].phrase.length, 346);
const venusPhraseSelection = selectPhraseEvidence(venusLibraSceneEvidence.plan ?? {
  object: "venus",
  sign: "libra",
  objectFunction: "relationships, attraction, creativity, and value",
  signMechanics: "balance, agreement, compromise, and shared choices",
  coreTension: "Agreement can look fair while one side keeps adjusting."
}, ownerPhraseEvidence);
assert.equal(venusPhraseSelection.themeMatched, true);
assert.ok(venusPhraseSelection.selectedCount >= 5 && venusPhraseSelection.selectedCount <= 10);
assert.ok(venusPhraseSelection.selected.every((entry) => entry.role === "phrase" && entry.ownerApproved === true));
assert.ok(extendedCoverage.counts.placements >= 179);
assert.equal(extendedCoverage.counts.matrixZeroScene, 114);
assert.ok(extendedCoverage.counts.extendedZeroSceneWithinMatrixPlacements <= 114);
assert.ok(matrixSceneNounLexicon(matrixEvidenceRows).length > 20);
assert.equal(MIN_SAME_FAMILY_OWNER_PASSAGES, 3);
assert.equal(ownerRegisterGold.length, 1);
assert.equal(ownerRegisterGold[0].id, "register-gold:sky-placement:saturn-capricorn-v3");
assert.ok(ownerPositiveEvidence.length >= 3);
assert.ok(ownerPositiveEvidence.every((entry) => entry.ownerAuthored === true && entry.family === "sky-placement-current-sky-writer"));
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
    validationProfile: "sky-placement",
    plan: { sign, house: null }
  });
  assert.ok(!legitimateExample.violations.some((entry) => entry.category === "sign_house_separation"), `${sign} must allow one legitimate domain example.`);
  const cluster = validateCopy(`${nouns.slice(0, HOUSE_BLEED_CLUSTER_MIN_DISTINCT_NOUNS).join(", ")} keep defining the whole passage.`, {
    validationProfile: "sky-placement",
    plan: { sign, house: null }
  });
  assert.ok(cluster.violations.some((entry) => entry.category === "sign_house_separation"), `${sign} must reject a domain-noun cluster.`);
}

const protectedOwnerLine = "Compassion that was really self-erasure starts coming with limits attached.";
assert.equal(
  validateCopy(protectedOwnerLine, {
    validationProfile: "shared-only",
    protectedOwnerLines: [protectedOwnerLine]
  }).passed,
  true
);
const unprotectedEditorialReview = validateCopy(protectedOwnerLine, { validationProfile: "shared-only" });
assert.equal(unprotectedEditorialReview.passed, true, "Editorial-review vocabulary must not hard-fail copy.");
assert.ok(
  unprotectedEditorialReview.advisories.some((entry) => entry.category === "editorial_word_policy" && entry.detail === "self-erasure"),
  "Editorial-review vocabulary must remain visible as a non-blocking advisory."
);

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
const indexedLilithSagittariusMatrixEvidence = ownerApprovedMatrixEvidenceForTarget(writerVoiceIndex, {
  planet: "lilith",
  sign: "sagittarius",
  surface: "sky-placement-page"
});
const lilithSagittariusMatrixEvidence = indexedLilithSagittariusMatrixEvidence.length
  ? indexedLilithSagittariusMatrixEvidence
  : [{
      id: "test-owner-matrix:lilith:sagittarius",
      contentKey: "test-owner-matrix:lilith:sagittarius",
      family: "knowledge-matrix-positive-evidence",
      sourceFamily: "test-fixture",
      text: "Lilith in Sagittarius tests whether conviction can still answer to evidence.",
      sourcePath: "tests/astro-writing/harness.test.mjs",
      planet: "lilith",
      sign: "sagittarius",
      authorityClass: "exact_owner_approved",
      governance: "test-fixture-owner-approved",
      evidenceRole: "knowledge_matrix_positive",
      ownerApproved: true,
      useAsPositiveVoiceEvidence: true
    }];
const lilithSagittariusSceneEvidence = sceneEvidenceForTarget({
  approvedExamples,
  matrixEvidenceRows,
  registerExamples: ownerPositiveEvidence,
  sceneNounLexicon: matrixSceneNounLexicon(matrixEvidenceRows),
  plan
});
assert.equal(plan.house, null);
assert.ok(plan.prohibitedDomainAssumptions.includes("travel/education/legal"));
assert.ok(plan.DO_NOT_ASSUME.includes("a house or life domain that was not supplied"));

assert.ok(validateCopy({ body: "Someone checks the source before repeating the claim.", DO_NOT_ASSUME: plan.DO_NOT_ASSUME }, {
  validationProfile: "shared-only",
  plan,
  requiredFields: ["body"]
}).passed, "Internal guard fields must not be treated as reader copy.");
for (const leaked of [
  "DO NOT ASSUME a specific event.",
  "This transit does not necessarily mean a specific event will happen.",
  "A specific event, motive, relationship type, or biography not present in governed facts."
]) {
  const result = validateCopy(leaked, { validationProfile: "shared-only", plan });
  assert.ok(result.violations.some((entry) => entry.category === "shared_ban"), `Reader-facing guard leakage must fail: ${leaked}`);
}

let writerCallCount = 0;
const writerClient = async ({ stage, instructions, input }) => {
  assert.equal(stage, "draft");
  assert.equal(instructions, canonicalAstrologyWritingInstructions);
  assert.match(input, /OWNER-APPROVED ARGUMENT OUTLINE/u);
  assert.match(input, /RECORDED STRUCTURAL SPINE/u);
  assert.match(input, /SHARED FIVE-ROLE EVIDENCE PACKET/u);
  assert.match(input, /AVAILABLE LINES — OWNER PHRASE EVIDENCE/u);
  assert.match(input, /OWNER-APPROVED SCENE EVIDENCE — DISTINCT FROM REGISTER EVIDENCE/u);
  assert.match(input, /OWNER BEFORE\/AFTER PAIRS/u);
  writerCallCount += 1;
  if (/CONTENT FAMILY\n(?:fast-mover-article|slow-mover-article)/u.test(input)) {
    const slowMover = /CONTENT FAMILY\nslow-mover-article/u.test(input);
    const opening = "After moving through Virgo from July 9 to August 6, Venus enters Libra and the question shifts from what needs fixing to which side keeps carrying the extra weight. The scales become the test. Venus rules Libra, so agreement comes easily enough to expose who pays for it.";
    const tension = "You are taught that easy agreement is fair, while the accommodating person absorbs the extra cost.";
    const lived = "A shared bill is divided unevenly, and the same person sends the reminder. You say yes before naming a preference, then carry the missing money.\n\nA draft is approved quickly, then every correction returns to the person who first said yes.";
    const strategy = "State the preference. Split the follow-up work.";
    const eraFrame = "Across a company or family, easy agreement can hide who keeps paying. The smooth answer has a cost.";
    const recurrence = "Venus last moved through Libra from September 2019 to October 2019, and that period revealed which agreements depended on one side adjusting.";
    const olderAnalogs = "";
    const collectiveLesson = "The group test is simple: check what happens when the accommodating person stops absorbing the difference.";
    const close = "An agreement fails when fairness depends on one person staying accommodating.";
    const slowDevelopment = slowMover
      ? `${lived}\n\n${strategy}\n\n${eraFrame}\n\n${recurrence}\n\n${collectiveLesson}`
      : `${lived}\n\n${strategy}`;
    return {
      opening,
      tension,
      development: slowDevelopment,
      close,
      spine_quality_evidence: {
        planet: "Venus enters Libra and the question shifts from what needs fixing to which side keeps carrying the extra weight.",
        condition: "The scales become the test. Venus rules Libra, so agreement comes easily enough to expose who pays for it.",
        handoff: opening,
        thesis: tension,
        lived_evidence: lived,
        failure_mechanism: "You say yes before naming a preference, then carry the missing money.",
        strategy,
        ...(slowMover ? {
          era_frame: eraFrame,
          recurrence,
          older_analogs: olderAnalogs,
          collective_lesson: collectiveLesson
        } : {}),
        close
      }
    };
  }
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
  decision,
  violations: []
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
writerClient.provider = "gemini";
writerClient.model = "gemini-writer-fixture";
writerClient.thinkingLevel = "high";
writerClient.billed = false;
const argumentInput = {
  scope_breadth: {
    broad_mechanism: "Jupiter in Sagittarius expands conviction, meaning, exploration, and the confidence to act on a larger view.",
    chosen_expression: "The page develops certainty outrunning the evidence that supports it.",
    other_valid_expressions: [
      "A plan grows because someone can finally see a larger possibility.",
      "A belief changes after new information complicates the old explanation.",
      "Confidence makes an unfamiliar choice feel possible before every detail is settled."
    ]
  },
  thesis: "Certainty is not evidence.",
  cultural_rule: "A confident claim is treated as a reliable claim.",
  transit_job: "Make beliefs answer to the information they are based on.",
  failure_mechanism: "Disagreement gets treated as bad character, so nobody checks the source.",
  lived_scene_1: "A repeated claim is checked against its original source.",
  lived_scene_2: "A confident explanation changes after one missing fact arrives.",
  lived_scene_3: "A group stops defending the speaker and compares the available evidence.",
  strategy: "Keep the belief that survives new information and revise the one that does not.",
  intended_close: "Conviction becomes certainty when the belief stops making room for evidence.",
  scope_guard: "Do not turn Sagittarius into travel, education, publishing, or law.",
  planet_quality_intent: "Show the planet through a deadline, bill, choice, or other observable consequence rather than a domain list.",
  condition_quality_intent: "Explain dignity through its consequence and make the sign symbol interpret the mechanism.",
  handoff_quality_intent: "Name what changes from the prior sign after giving its dates.",
  thesis_quality_intent: "Name the cultural rule and the person or system benefiting from it.",
  lived_evidence_quality_intent: "Use two or three distinct situations with nameable objects and one short pull-quote line.",
  failure_mechanism_quality_intent: "Show the useful skill becoming the problem through behavior the reader performs.",
  strategy_quality_intent: "Use at least two short imperative sentences in sequence.",
  close_quality_intent: "Land the consequence without a hedging modal or date-bound ending.",
  era_frame_quality_intent: "Name the multi-year collective era and include one short line the reader can carry.",
  recurrence_quality_intent: "State the prior transit dates and what that period revealed.",
  older_analogs_quality_intent: "Include only verified, sourced analogs that advance the thesis; otherwise record that the conditional layer does not trigger.",
  collective_lesson_quality_intent: "Name the group-scale lesson and the test the reader can apply."
};
assert.throws(
  () => buildArgumentOutline({ ...argumentInput, scope_breadth: undefined }, {
    plan,
    family: "fast-mover-article",
    surface: "sky-placement-page"
  }),
  /ARGUMENT_SCOPE_REQUIRES_THREE_OTHER_VALID_EXPRESSIONS/u
);
assert.throws(
  () => buildArgumentOutline({
    ...argumentInput,
    scope_breadth: {
      ...argumentInput.scope_breadth,
      chosen_expression: argumentInput.scope_breadth.broad_mechanism
    }
  }, {
    plan,
    family: "fast-mover-article",
    surface: "sky-placement-page"
  }),
  /ARGUMENT_SCOPE_COLLAPSES_MECHANISM_INTO_EXPRESSION/u
);
const argumentSourceFixture = {
  contentKey: "fallback-hook/sky-sign-copy/lilith/sagittarius",
  sourcePath: "apps/web/src/content/fallbackArchitectureV3/source-rows/lilith-placements-v5.json",
  authority: "exact-current-owner-approved",
  ownerApproved: true,
  opening: "Certainty is not evidence.",
  tension: "A confident claim is treated as a reliable claim.",
  development: "A repeated claim is checked against its source.",
  close: "Conviction still has to answer to evidence."
};
const venusPipelineRequest = JSON.parse(read("packages/astro-knowledge/review/writing-pipeline-v3/venus-libra-v2-rewrite-request-pending.json"));
const venusPipelineArgumentInput = {
  scope_breadth: {
    broad_mechanism: "Venus in Libra makes agreement, exchange, attraction, and aesthetic judgment easier to coordinate, while ease can hide whose preference or contribution keeps moving.",
    chosen_expression: "The page develops automatic accommodation inside a shared choice.",
    other_valid_expressions: [
      "Creative taste becomes easier to share without requiring identical preferences.",
      "A price, exchange, or division of responsibility exposes what each side considers fair.",
      "Attraction changes when politeness and genuine interest stop being treated as the same thing."
    ]
  },
  ...Object.fromEntries(argumentOutlineFieldsForFamily("slow-mover-article").map((field) => [
  field,
  venusPipelineRequest.approvedArgumentOutline[field] ?? argumentInput[field]
  ]))
};
const pendingPipeline = await runSkyPlacementWritingPipeline({
  meaningInput: venusPipelineRequest.meaningInput,
  examples: [...ownerPositiveEvidence, ...ownerLockedLilithEvidence],
  matrixExamples: venusLibraRoleEvidence.meaning,
  matrixArgumentCandidates: venusLibraRoleEvidence.argument_candidate,
  matrixEvidenceAvailableCount: venusLibraRoleEvidence.meaning.length,
  sceneExamples: venusLibraSceneEvidence.selected,
  samePlanetSignSceneAvailableCount: venusLibraSceneEvidence.counts.samePlanetSignSceneAvailable,
  registerGoldExamples: ownerRegisterGold,
  corrections: allOwnerCorrections,
  phraseEvidence: ownerPhraseEvidence,
  task: "Write one Lilith in Sagittarius placement.",
  family: "slow-mover-article",
  surface: "sky-placement-page",
  argumentInput: venusPipelineArgumentInput,
  writerClient
});
assert.equal(pendingPipeline.status, "argument-review-pending");
assert.equal(pendingPipeline.draft, null);
assert.equal(pendingPipeline.report.billedCalls, 0);
assert.equal(ARGUMENT_OUTLINE_FIELDS.length, 18);
assert.equal(ARGUMENT_OUTLINE_SPINE_QUALITY_FIELDS.length, 8);
assert.equal(ARGUMENT_OUTLINE_SLOW_MOVER_QUALITY_FIELDS.length, 4);
assert.equal(argumentOutlineFieldsForFamily("slow-mover-article").length, 22);
assert.ok(ARGUMENT_OUTLINE_FIELDS.every((field) => typeof pendingPipeline.argumentOutline[field] === "string" && !pendingPipeline.argumentOutline[field].includes("\n")));
assert.equal(writerCallCount, 0, "Writer must not run before owner argument approval.");
const approvedArgumentOutline = approveArgumentOutline(pendingPipeline.argumentOutline, {
  exactOwnerRuling: "I approve this exact argument outline."
});
const pipeline = await runSkyPlacementWritingPipeline({
  meaningInput: venusPipelineRequest.meaningInput,
  examples: [...ownerPositiveEvidence, ...ownerLockedLilithEvidence],
  matrixExamples: venusLibraRoleEvidence.meaning,
  matrixArgumentCandidates: venusLibraRoleEvidence.argument_candidate,
  matrixEvidenceAvailableCount: venusLibraRoleEvidence.meaning.length,
  sceneExamples: venusLibraSceneEvidence.selected,
  samePlanetSignSceneAvailableCount: venusLibraSceneEvidence.counts.samePlanetSignSceneAvailable,
  registerGoldExamples: ownerRegisterGold,
  corrections: allOwnerCorrections,
  phraseEvidence: ownerPhraseEvidence,
  task: "Write one Lilith in Sagittarius placement.",
  family: "slow-mover-article",
  surface: "sky-placement-page",
  argumentInput: venusPipelineArgumentInput,
  approvedArgumentOutline,
  argumentSource: venusPipelineRequest.argumentSource,
  writerClient
});
assert.equal(pipeline.context.counts.corrections, 8);
assert.deepEqual(pipeline.context.sharedEvidencePacket.counts, {
  meaning: venusLibraRoleEvidence.meaning.length,
  register: pipeline.context.counts.sameFamilyExamples + pipeline.context.counts.registerGoldExamples,
  scene: pipeline.context.counts.sceneExamples,
  argument: 1,
  phrase: pipeline.context.counts.phraseExamples
});
assert.ok(pipeline.context.sharedEvidencePacket.roles.argument.every((entry) => entry.role === "argument" && entry.sourceKind === "current-approved-argument-and-close"));
const sharedPacketReview = evidenceUseReview(pipeline.context.sharedEvidencePacket);
assert.equal(sharedPacketReview.packetHasAllFourRoles, true, JSON.stringify({ counts: pipeline.context.sharedEvidencePacket.counts, roles: Object.keys(pipeline.context.sharedEvidencePacket.roles), review: sharedPacketReview }));
assert.equal(sharedPacketReview.sceneTraceRequired, true);
assert.equal(sharedPacketReview.inventedScenePermitted, false);
assert.ok(sharedPacketReview.availableOwnerApprovedSentencesUnused.length > 0);
assert.match(pipeline.draft.opening, /The scales become the test/u);
assert.equal(pipeline.draft.ownerApproved, false, "Generated copy must never be labeled owner-approved.");
assert.equal(pipeline.draft.reviewStatus, "needs_review");
assert.equal(pipeline.draft.ownerStatus, "PENDING OWNER");
assert.equal(pipeline.draft.approvalStatus, "owner-review-pending", JSON.stringify(pipeline.lint.spineQuality));
assert.equal(pipeline.draft.generation_metadata.role, "WRITER");
assert.equal(pipeline.draft.generation_metadata.provider, "gemini");
assert.equal(pipeline.draft.generation_metadata.model, "gemini-writer-fixture");
assert.equal(pipeline.draft.generation_metadata.thinkingLevel, "high");
assert.equal(pipeline.draft.generation_metadata.components.writer_prompt, CANONICAL_WRITING_INSTRUCTIONS_VERSION);
assert.equal(pipeline.draft.generation_metadata.components.shared_evidence, "shared-evidence-standard-v1-2026-08-13");
assert.deepEqual(Object.keys(pipeline.draft.generation_metadata.evidencePacket.roles).sort(), ["argument", "meaning", "phrase", "register", "scene"]);
assert.equal(pipeline.report.automaticallyRevised, 0);
assert.equal(pipeline.report.finalLintStatus, "PASS");
assert.equal(pipeline.report.proseModelGateCalls, 0);
assert.equal(writerCallCount, 1);
assert.deepEqual(missingContentSpines(), ["cards", "lunations", "aspects", "house-cores"]);
assert.equal(selectOwnerCorrectionPairs(allOwnerCorrections, { family: "lilith-placement-lived", count: 6 }).pairs.length, 6);
assert.ok(validateCopy("You can name the actual preference.", { register: "collective", surface: "sky-placement-page" }).passed);
assert.ok(!validateCopy("You can name the actual preference.", { register: "collective", surface: "card" }).passed);
assert.ok(validateCopy("You can name the actual preference.", { register: "second_person", surface: "sky-placement-page" }).passed);
assert.ok(!validateCopy("The preference stays hidden.", { register: "second_person", surface: "sky-placement-page" }).passed);
const literalEvidenceContract = {
  field: "development",
  forbiddenAbstractPlaceholders: ["one collaboration", "one person", "the other"],
  requiredConceptTerms: {
    decision: ["decision", "choice"],
    cost: ["cost", "expense"],
    follow_up_work: ["revision", "revisions", "follow-up"]
  }
};
assert.ok(validateCopy({ development: "You name the decision, split the extra cost, and finish the revisions." }, {
  register: "second_person",
  surface: "sky-placement-page",
  literalEvidenceRequirements: literalEvidenceContract
}).passed);
assert.ok(!validateCopy({ development: "One collaboration leaves one person accommodating the other." }, {
  register: "second_person",
  surface: "sky-placement-page",
  literalEvidenceRequirements: literalEvidenceContract
}).passed);
assert.ok(validateCopy("Leo is the sign of visibility and being seen.").advisories.some((entry) => entry.category === "synonym_redundancy"));
assert.ok(validateCopyBatch(Array.from({ length: 4 }, () => "You may answer the message.")).advisories.some((entry) => entry.category === "opening_syntax_repetition"));
const onePivot = validateCopy("The agreement is not neutral. It is cheaper for the person who keeps getting their way.");
assert.equal(onePivot.counts.negationPivots, 1);
assert.ok(onePivot.passed, "One negation pivot remains available on a page.");
assert.equal(validateCopy("The agreement isn't neutral. It's cheaper for one side.").counts.negationPivots, 1);
assert.equal(validateCopy("The problem is not compromise.").counts.negationPivots, 1);
assert.equal(validateCopy("Compromise is not the problem.").counts.negationPivots, 1);
assert.equal(validateCopy("The answer is not silence but a stated preference.").counts.negationPivots, 1);
const reservedPivotOnly = validateCopy("The cost appears when keeping the agreement easy matters more than saying what you actually want.", {
  reservedNegationPivots: 1,
  register: "second_person",
  surface: "sky-placement-page"
});
assert.equal(reservedPivotOnly.counts.negationPivots, 1);
assert.equal(reservedPivotOnly.counts.negationPivotsDetected, 0);
assert.equal(reservedPivotOnly.counts.negationPivotsReserved, 1);
assert.ok(reservedPivotOnly.passed);
const reservedPlusGeneratedPivot = validateCopy("The answer is not silence but a stated preference.", {
  reservedNegationPivots: 1,
  register: "second_person",
  surface: "sky-placement-page"
});
assert.equal(reservedPlusGeneratedPivot.counts.negationPivots, 2);
assert.ok(reservedPlusGeneratedPivot.violations.some((entry) => entry.category === "negation_pivot_cap"));
const twoPivots = validateCopy("The agreement is not neutral. It is cheaper for one side. The problem is not compromise. The extra work keeps landing with the same person.");
assert.equal(twoPivots.counts.negationPivots, 2);
assert.ok(twoPivots.violations.some((entry) => entry.category === "negation_pivot_cap"));
const threePivotSet = validateCopyBatch([
  "The plan is not neutral. It is more expensive for one person.",
  "The answer is not agreement. It is an honest preference.",
  "The problem is not the stated price. The follow-up work was never divided.",
  ...Array.from({ length: 9 }, (_, index) => `Direct consequence ${index + 1}.`)
]);
assert.equal(threePivotSet.counts.negationPivots, 3);
assert.ok(threePivotSet.passed, "Three pivots remain available across a twelve-item set.");
const fourPivotSet = validateCopyBatch([
  "The plan is not neutral. It is more expensive for one person.",
  "The answer is not agreement. It is an honest preference.",
  "The problem is not the stated price. The follow-up work was never divided.",
  "This is not the problem. The repeated concession is.",
  ...Array.from({ length: 8 }, (_, index) => `Another direct consequence ${index + 1}.`)
]);
assert.equal(fourPivotSet.counts.negationPivots, 4);
assert.ok(fourPivotSet.violations.some((entry) => entry.category === "negation_pivot_set_cap"));
assert.ok(validateCopy("The job of Venus in Libra is to make agreement fair.").advisories.some((entry) => entry.category === "spine_scaffold_grammar"));
assert.ok(validateCopyBatch([
  "This is a period for repair.",
  "This is a period for clearer agreements."
]).advisories.some((entry) => entry.category === "spine_scaffold_repetition"));
const fastMoverPending = await runSkyPlacementWritingPipeline({
  meaningInput: venusPipelineRequest.meaningInput,
  examples: [...ownerPositiveEvidence, ...ownerLockedLilithEvidence],
  matrixExamples: venusLibraRoleEvidence.meaning,
  matrixArgumentCandidates: venusLibraRoleEvidence.argument_candidate,
  matrixEvidenceAvailableCount: venusLibraRoleEvidence.meaning.length,
  sceneExamples: venusLibraSceneEvidence.selected,
  samePlanetSignSceneAvailableCount: venusLibraSceneEvidence.counts.samePlanetSignSceneAvailable,
  registerGoldExamples: ownerRegisterGold,
  corrections: allOwnerCorrections,
  phraseEvidence: ownerPhraseEvidence,
  task: "Prepare one fast-mover article.",
  family: "fast-mover-article",
  surface: "sky-placement-page",
  argumentInput: venusPipelineArgumentInput,
  writerClient
});
const fastMoverApprovedArgument = approveArgumentOutline(fastMoverPending.argumentOutline, { exactOwnerRuling: "I approve this outline." });
const fastMoverPipeline = await runSkyPlacementWritingPipeline({
  meaningInput: venusPipelineRequest.meaningInput,
  examples: [...ownerPositiveEvidence, ...ownerLockedLilithEvidence],
  matrixExamples: venusLibraRoleEvidence.meaning,
  matrixArgumentCandidates: venusLibraRoleEvidence.argument_candidate,
  matrixEvidenceAvailableCount: venusLibraRoleEvidence.meaning.length,
  sceneExamples: venusLibraSceneEvidence.selected,
  samePlanetSignSceneAvailableCount: venusLibraSceneEvidence.counts.samePlanetSignSceneAvailable,
  registerGoldExamples: ownerRegisterGold,
  corrections: allOwnerCorrections,
  phraseEvidence: ownerPhraseEvidence,
  task: "Prepare one fast-mover article.",
  family: "fast-mover-article",
  surface: "sky-placement-page",
  argumentInput: venusPipelineArgumentInput,
  approvedArgumentOutline: fastMoverApprovedArgument,
  argumentSource: venusPipelineRequest.argumentSource,
  writerClient
});
assert.equal(fastMoverPipeline.spine.id, "sky-placement-article-fast-mover-v1");
assert.equal(fastMoverPipeline.spine.satisfactionMode, "semantic_presence_plus_element_quality_not_reader_facing_template");
assert.deepEqual(fastMoverPipeline.spine.fields, [
  "planet",
  "condition",
  "handoff",
  "thesis",
  "lived_evidence",
  "failure_mechanism",
  "strategy",
  "close"
]);
assert.equal(Object.hasOwn(fastMoverPipeline.spine.rules, "retrograde_degree_lookback"), false, "Unapproved retrograde proposal must not enter the recorded spine.");
assert.equal(Object.keys(fastMoverPipeline.spine.qualityRequirements).length, 8);
assert.deepEqual(spineQualityElementsForFamily("slow-mover-article"), [
  "planet",
  "condition",
  "handoff",
  "thesis",
  "lived_evidence",
  "failure_mechanism",
  "strategy",
  "era_frame",
  "recurrence",
  "older_analogs",
  "collective_lesson",
  "close"
]);
assert.deepEqual(getContentSpine("slow-mover-article").fields, [
  "planet",
  "condition",
  "handoff",
  "thesis",
  "lived_evidence",
  "failure_mechanism",
  "strategy",
  "era_frame",
  "recurrence",
  "older_analogs",
  "collective_lesson",
  "close"
]);
assert.equal(Object.keys(getContentSpine("slow-mover-article").qualityRequirements).length, 12);
assert.ok(validateCopy("On this page, your transit is explained.", {
  family: "fast-mover-article",
  register: "second_person",
  surface: "sky-placement-page"
}).violations.some((entry) => entry.category === "fourth_wall"));
assert.ok(validateCopy("The job of Venus is to make your preference visible.", {
  family: "fast-mover-article",
  register: "second_person",
  surface: "sky-placement-page"
}).violations.some((entry) => entry.category === "structural_spine_vocabulary"));
assert.equal(writerCallCount, 2, "Recorded fast-mover spine permits the writer only after argument approval.");
let partialWriterRequest = null;
const partialWriterClient = async (request) => {
  partialWriterRequest = request;
  return {
    development: "You reread the message before sending it. A quick favor takes the afternoon, and the follow-up still lands with you. A shared bill shows which costs were never actually divided."
  };
};
partialWriterClient.provider = "test";
partialWriterClient.model = "partial-writer-fixture";
partialWriterClient.billed = false;
const protectedPartialFields = {
  opening: "After moving through Virgo from July 9 to August 6, Venus enters Libra and the focus shifts from what needs fixing to how two people make a choice together.",
  tension: "The cost appears when keeping the agreement easy matters more than saying what you actually want. You ask what works for everyone else first, then shape your answer around what is left.",
  close: "Before {{exitDate}}, an arrangement may strain when the person who kept agreeing can no longer accept what they do not want."
};
const partialFastMoverPipeline = await runSkyPlacementWritingPipeline({
  meaningInput: venusPipelineRequest.meaningInput,
  examples: [...ownerPositiveEvidence, ...ownerLockedLilithEvidence],
  matrixExamples: venusLibraRoleEvidence.meaning,
  matrixArgumentCandidates: venusLibraRoleEvidence.argument_candidate,
  matrixEvidenceAvailableCount: venusLibraRoleEvidence.meaning.length,
  sceneExamples: venusLibraSceneEvidence.selected,
  samePlanetSignSceneAvailableCount: venusLibraSceneEvidence.counts.samePlanetSignSceneAvailable,
  registerGoldExamples: ownerRegisterGold,
  corrections: allOwnerCorrections,
  phraseEvidence: ownerPhraseEvidence,
  task: "Return the lived section only.",
  family: "fast-mover-article",
  register: "second_person",
  surface: "sky-placement-page",
  argumentInput: venusPipelineArgumentInput,
  approvedArgumentOutline: fastMoverApprovedArgument,
  argumentSource: venusPipelineRequest.argumentSource,
  partialRewrite: {
    mode: "lived-section-only",
    protectedFields: protectedPartialFields
  },
  reservedNegationPivots: 1,
  expectedPlaceholders: ["exitDate"],
  protectedOwnerLines: Object.values(protectedPartialFields),
  writerClient: partialWriterClient
});
assert.deepEqual(partialWriterRequest.schema.required, ["development"]);
assert.deepEqual(Object.keys(partialWriterRequest.schema.properties), ["development"]);
assert.equal(partialFastMoverPipeline.draft.opening, protectedPartialFields.opening);
assert.equal(partialFastMoverPipeline.draft.tension, protectedPartialFields.tension);
assert.equal(partialFastMoverPipeline.draft.close, protectedPartialFields.close);
assert.equal(partialFastMoverPipeline.draft.partialRewrite.mode, "lived-section-only");
assert.equal(partialFastMoverPipeline.lint.counts.negationPivots, 1);
assert.equal(partialFastMoverPipeline.lint.counts.negationPivotsReserved, 1);
assert.equal(partialFastMoverPipeline.status, "spine-quality-incomplete");
assert.ok(partialFastMoverPipeline.lint.spineQuality.failedElementCount >= 3);
assert.equal(partialFastMoverPipeline.draft.editorialStatus, "spine-quality-incomplete");

const structuralPresenceWithoutQuality = evaluateSpineQuality({
  family: "fast-mover-article",
  plan: { object: "venus", sign: "libra" },
  copy: {},
  spineElements: {
    planet: "Venus governs relationships, creativity, attraction, and values.",
    condition: "Venus rules Libra.",
    handoff: "After moving through Virgo from July 9 to August 6, Venus enters Libra.",
    thesis: "Compromise becomes difficult.",
    lived_evidence: { text: "One project keeps changing for several paragraphs.", scenarioCount: 1, scenarioParagraphSpans: [2] },
    failure_mechanism: "Compromise creates imbalance.",
    strategy: "Consider a fairer arrangement.",
    close: "Before {{exitDate}}, an arrangement may strain."
  },
  inheritedElements: ["close"]
});
assert.equal(structuralPresenceWithoutQuality.status, "spine-quality-incomplete");
assert.ok(structuralPresenceWithoutQuality.failedElementCount >= 3);
assert.deepEqual(structuralPresenceWithoutQuality.failedElements, [
  "planet",
  "condition",
  "handoff",
  "thesis",
  "lived_evidence",
  "failure_mechanism",
  "strategy",
  "close"
]);
assert.ok(structuralPresenceWithoutQuality.failures.find((entry) => entry.element === "close")?.inheritedElement);

const sameFamilyOwnerExamples = ownerLockedLilithEvidence;
assert.ok(sameFamilyOwnerExamples.length >= 3);
const genericSameFamilyOwnerExamples = sameFamilyOwnerExamples.slice(0, 3).map((entry, index) => ({
  ...entry,
  id: `generic-same-family-${index + 1}`,
  contentKey: `generic-same-family-${index + 1}`,
  planet: null,
  sign: null
}));
const failedRetrievalRuns = [];
for (const fixture of [
  {
    label: "target theme matched but phrase packet omitted",
    family: "fast-mover-article",
    examples: genericSameFamilyOwnerExamples,
    registerGoldExamples: ownerRegisterGold,
    phraseEvidence: [],
    expectedCode: "OWNER_PHRASE_EVIDENCE_MISSING"
  },
  {
    label: "same-planet-sign house-core scenes available but packet omitted them",
    family: "fast-mover-article",
    examples: sameFamilyOwnerExamples.slice(0, 3),
    registerGoldExamples: ownerRegisterGold,
    sceneExamples: [],
    samePlanetSignSceneAvailableCount: 12,
    expectedCode: "OWNER_SAME_PLANET_SIGN_SCENE_EVIDENCE_MISSING"
  },
  {
    label: "approved matrix rows available but packet omitted them",
    family: "fast-mover-article",
    examples: sameFamilyOwnerExamples.slice(0, 3),
    registerGoldExamples: ownerRegisterGold,
    matrixExamples: [],
    matrixEvidenceAvailableCount: 1,
    expectedCode: "OWNER_MATRIX_EVIDENCE_MISSING"
  },
  {
    label: "relevant published owner passages available but packet contains only generic voice examples",
    family: "fast-mover-article",
    examples: genericSameFamilyOwnerExamples,
    registerGoldExamples: ownerRegisterGold,
    relevantOwnerPassagesAvailableCount: 3,
    ownerPassageRelevanceTier: "same-sign-then-same-planet",
    expectedCode: "OWNER_RELEVANT_PASSAGES_MISSING"
  },
  {
    label: "empty positive pool",
    family: "fast-mover-article",
    examples: [],
    registerGoldExamples: ownerRegisterGold,
    expectedCode: "OWNER_POSITIVE_EVIDENCE_EMPTY"
  },
  {
    label: "owner-approved generated rows are not owner-authored voice evidence",
    family: "fast-mover-article",
    examples: approvedExamples.filter((entry) => entry.family === "fallback-hook/sky-sign-copy").slice(0, 4),
    registerGoldExamples: ownerRegisterGold,
    expectedCode: "OWNER_POSITIVE_EVIDENCE_EMPTY"
  },
  {
    label: "generated copy presented as owner-authored evidence",
    family: "fast-mover-article",
    examples: [
      ...sameFamilyOwnerExamples.slice(0, 2),
      {
        ...sameFamilyOwnerExamples[2],
        id: "generated-owner-evidence-fixture",
        contentKey: "generated-owner-evidence-fixture",
        generated: true,
        sourceKind: "generated-candidate"
      }
    ],
    registerGoldExamples: ownerRegisterGold,
    expectedCode: "GENERATED_COPY_AS_OWNER_EVIDENCE"
  },
  {
    label: "below-floor positive pool",
    family: "fast-mover-article",
    examples: sameFamilyOwnerExamples.slice(0, 2),
    registerGoldExamples: ownerRegisterGold,
    expectedCode: "OWNER_POSITIVE_EVIDENCE_BELOW_FLOOR"
  },
  {
    label: "missing register gold",
    family: "fast-mover-article",
    examples: sameFamilyOwnerExamples.slice(0, 3),
    registerGoldExamples: [],
    expectedCode: "OWNER_REGISTER_GOLD_BELOW_FLOOR"
  },
  {
    label: "unmapped new family",
    family: "new-unmapped-writer-family",
    examples: sameFamilyOwnerExamples.slice(0, 3),
    registerGoldExamples: ownerRegisterGold,
    expectedCode: "OWNER_EVIDENCE_FAMILY_MAPPING_REQUIRED"
  }
]) {
  const pending = await runSkyPlacementWritingPipeline({
    meaningInput,
    examples: fixture.examples,
    matrixExamples: fixture.matrixExamples ?? [],
    matrixEvidenceAvailableCount: fixture.matrixEvidenceAvailableCount ?? 0,
    relevantOwnerPassagesAvailableCount: fixture.relevantOwnerPassagesAvailableCount ?? 0,
    ownerPassageRelevanceTier: fixture.ownerPassageRelevanceTier ?? "none",
    sceneExamples: fixture.sceneExamples ?? [],
    samePlanetSignSceneAvailableCount: fixture.samePlanetSignSceneAvailableCount ?? 0,
    registerGoldExamples: fixture.registerGoldExamples,
    corrections: allOwnerCorrections,
    phraseEvidence: fixture.phraseEvidence ?? ownerPhraseEvidence,
    task: `Precondition regression: ${fixture.label}`,
    family: fixture.family,
    surface: "sky-placement-page",
    argumentInput,
    argumentSource: argumentSourceFixture,
    writerClient
  });
  const approved = approveArgumentOutline(pending.argumentOutline, { exactOwnerRuling: "Fixture-only argument approval." });
  const failed = await runSkyPlacementWritingPipeline({
    meaningInput,
    examples: fixture.examples,
    matrixExamples: fixture.matrixExamples ?? [],
    matrixEvidenceAvailableCount: fixture.matrixEvidenceAvailableCount ?? 0,
    relevantOwnerPassagesAvailableCount: fixture.relevantOwnerPassagesAvailableCount ?? 0,
    ownerPassageRelevanceTier: fixture.ownerPassageRelevanceTier ?? "none",
    sceneExamples: fixture.sceneExamples ?? [],
    samePlanetSignSceneAvailableCount: fixture.samePlanetSignSceneAvailableCount ?? 0,
    registerGoldExamples: fixture.registerGoldExamples,
    corrections: allOwnerCorrections,
    phraseEvidence: fixture.phraseEvidence ?? ownerPhraseEvidence,
    task: `Precondition regression: ${fixture.label}`,
    family: fixture.family,
    surface: "sky-placement-page",
    argumentInput,
    approvedArgumentOutline: approved,
    argumentSource: argumentSourceFixture,
    writerClient
  });
  assert.equal(failed.status, "failed-retrieval", fixture.label);
  assert.equal(failed.failure.code, fixture.expectedCode, fixture.label);
  assert.equal(failed.failure.classification, "failed-retrieval", fixture.label);
  assert.equal(failed.failure.voiceEvidenceEligible, false, fixture.label);
  assert.equal(failed.failure.draftEligible, false, fixture.label);
  assert.equal(failed.failure.baselineEligible, false, fixture.label);
  assert.equal(failed.failure.rewriteRequired, true, fixture.label);
  assert.equal(failed.draft, null, fixture.label);
  assert.equal(failed.report.writerCalls, 0, fixture.label);
  assert.equal(failed.report.billedCalls, 0, fixture.label);
  failedRetrievalRuns.push(failed);
}
assert.equal(failedRetrievalRuns.length, 10);
assert.equal(writerCallCount, 2, "Evidence-precondition failures must never reach the writer.");
const venusFailedRetrievalRecord = JSON.parse(read(
  "packages/astro-knowledge/review/writing-pipeline-v3/venus-libra-v2-failed-retrieval/run-record.json"
));
assert.equal(venusFailedRetrievalRecord.status, "failed-retrieval");
assert.equal(venusFailedRetrievalRecord.classification, "diagnostic-only");
assert.equal(venusFailedRetrievalRecord.voiceEvidenceEligible, false);
assert.equal(venusFailedRetrievalRecord.draftEligible, false);
assert.equal(venusFailedRetrievalRecord.baselineEligible, false);
assert.equal(venusFailedRetrievalRecord.rewriteRequired, true);
assert.deepEqual(venusFailedRetrievalRecord.failure.sourceIds, []);
const venusPacketAudit = JSON.parse(read(
  "packages/astro-knowledge/review/writing-pipeline-v3/venus-libra-v2-rewrite-packet-audit.json"
));
assert.equal(venusPacketAudit.governance.registerRequirement, "second_person_direct_address");
assert.equal(venusPacketAudit.governance.concretenessModelPriority, "register_gold_primary");
assert.ok(venusPacketAudit.governance.concretenessEvidenceGap.includes("separate governed scene-evidence lane"));
assert.equal(venusPacketAudit.governance.sceneRuleImplemented, true);
assert.equal(venusPacketAudit.counts.knowledgeMatrixExamples, 15);
assert.equal(venusPacketAudit.counts.knowledgeMatrixArgumentCandidates, 14);
assert.equal(venusPacketAudit.counts.primarySceneExamples, 12);
assert.ok(venusPacketAudit.counts.phraseExamples >= 5 && venusPacketAudit.counts.phraseExamples <= 10);
assert.equal(venusPacketAudit.sceneEvidenceCounts.matrixPrimaryCatalog, 166);
assert.equal(venusPacketAudit.sceneEvidenceCounts.servingCatalog, 225);
assert.equal(venusPacketAudit.approvedFamilyRetrieval.excludedFamilies.length, 133);
assert.deepEqual(venusPacketAudit.approvedStoreRetrieval.approvedExampleStoresOutsideRetrieval, []);
assert.ok(venusPacketAudit.selectedSceneEvidence.some((entry) => entry.text.includes("reread the text before you send it")));
assert.ok(venusPacketAudit.selectedSceneEvidence.some((entry) => entry.text.includes("One quick favor turns into your whole afternoon")));
assert.ok(venusPacketAudit.selectedSceneEvidence.some((entry) => entry.text.includes("who makes the plan, who changes it")));
assert.ok(venusPacketAudit.evidence.some((entry) => entry.text.includes("Fair can look very different depending on who keeps adjusting.")));
assert.ok(venusPacketAudit.evidence.some((entry) => entry.text.startsWith("Fairness needs better terms, not a prettier version of the old agreement.")));
assert.ok(venusPacketAudit.evidence.some((entry) => entry.contentKey === "owner-article:libra-season-autumn-equinox:p095"));
assert.ok(venusPacketAudit.evidence.some((entry) => entry.contentKey === "owner-article:libra-season-autumn-equinox:p016"));
assert.ok(!venusPacketAudit.evidence.some((entry) => entry.contentKey === "owner-article:gemini-season-2025:p018"));
assert.equal(venusPacketAudit.selectedPhraseEvidence.length, venusPacketAudit.counts.phraseExamples);
assert.ok(venusPacketAudit.selectedPhraseEvidence.every((entry) => entry.role === "phrase" && entry.ownerApproved === true));
const venusPhraseRetroCheck = JSON.parse(read(
  "packages/astro-knowledge/review/writing-pipeline-v3/phrase-evidence-v1/venus-libra-retro-check.json"
));
assert.equal(venusPhraseRetroCheck.target, "venus|libra");
assert.equal(venusPhraseRetroCheck.billedCalls, 0);
assert.ok(venusPhraseRetroCheck.selectedCount >= 5 && venusPhraseRetroCheck.selectedCount <= 10);

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
  surfaceStrategy: resolveSurfaceStrategy({ explicitStrategy: "sky-placement" }),
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
  surfaceStrategy: resolveSurfaceStrategy({ explicitStrategy: "sky-placement" }),
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
    validationProfile: "sky-placement",
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
  validationProfile: "sky-placement",
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
