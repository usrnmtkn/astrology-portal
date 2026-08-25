#!/usr/bin/env node

import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  CANONICAL_WRITING_INSTRUCTIONS_VERSION,
  canonicalAstrologyReviewInstructions,
  canonicalAstrologyWritingInstructions
} from "../../src/astro-writing/canonicalInstructions.mjs";
import { buildDraftInput } from "../../src/astro-writing/generateDraft.mjs";
import {
  exactDelimitedPassage,
  ownerPositiveEvidenceFromApprovedTaskPassages
} from "../../src/astro-writing/ownerPositiveEvidence.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), "utf8");
const standardPath = "docs/writing/ARGUMENT_DEVELOPMENT_STANDARD.md";
const manifestPath = "data/writing/owner-supplied-structural-exemplars.json";
const standard = read(standardPath);
const manifest = JSON.parse(read(manifestPath));
const startMarker = "<!-- BEGIN EXACT CALIBRATION PASSAGE -->\n";
const endMarker = "\n<!-- END EXACT CALIBRATION PASSAGE -->";
const exactPassage = standard.split(startMarker)[1]?.split(endMarker)[0];

assert.ok(exactPassage, "The structural calibration passage must remain delimited and extractable.");
assert.equal(manifest.schemaVersion, 2);
assert.equal(manifest.entries.length, 1);
const exemplar = manifest.entries[0];
assert.equal(exemplar.sourcePath, standardPath);
assert.equal(
  crypto.createHash("sha256").update(exactPassage).digest("hex"),
  exemplar.exactTextSha256,
  "The task-supplied calibration passage must remain byte-for-byte intact."
);
assert.equal(exemplar.authorityClass, "owner_authored_final");
assert.equal(exemplar.ownerAuthorshipAsserted, true);
assert.equal(exemplar.ownerExactApprovalAsserted, true);
assert.equal(exemplar.ownerApprovedServingCopy, false);
assert.equal(exemplar.readerEligible, false);
assert.equal(exemplar.positiveRegisterEvidence, true);
assert.equal(exemplar.phraseEvidence, false);
for (const prohibitedUse of [
  "reader serving",
  "phrase mining",
  "mechanical paragraph templating",
  "copying memorable lines into another placement"
]) {
  assert.ok(exemplar.prohibitedUses.includes(prohibitedUse), `Missing prohibited use: ${prohibitedUse}`);
}
assert.deepEqual(exemplar.semanticMovement, [
  "placement mechanism",
  "adaptation",
  "earned competence",
  "continued operation after circumstances change",
  "hidden cost",
  "placement-specific contradiction",
  "house mechanism",
  "behavioral change"
]);
const taskPassageEvidence = ownerPositiveEvidenceFromApprovedTaskPassages([{ ...exemplar, text: exactPassage }]);
assert.equal(taskPassageEvidence.length, 1);
assert.equal(taskPassageEvidence[0].ownerAuthored, true);
assert.equal(taskPassageEvidence[0].ownerApproved, true);
assert.equal(taskPassageEvidence[0].useAsPositiveVoiceEvidence, true);
assert.equal(taskPassageEvidence[0].useAsPhraseEvidence, false);
assert.equal(taskPassageEvidence[0].readerEligible, false);
assert.equal(taskPassageEvidence[0].planet, "chiron");
assert.equal(taskPassageEvidence[0].sign, "taurus");
assert.equal(taskPassageEvidence[0].house, 12);
assert.equal(exactDelimitedPassage(exemplar, standard), exactPassage);

for (const required of [
  "Accurate information about a placement is not yet a developed interpretation.",
  "Show adaptation before pathology",
  "Let competence become the hinge",
  "Make the house alter the mechanism",
  "End with changed operation, not generic advice",
  "These are semantic movements, not paragraph slots."
]) {
  assert.ok(standard.includes(required), `Argument-development standard must retain: ${required}`);
}

assert.equal(
  CANONICAL_WRITING_INSTRUCTIONS_VERSION,
  "tldr-astro-writing-v7-argument-developed-interpretation-2026-08-25"
);
for (const required of [
  "ARGUMENT-DEVELOPED INTERPRETATION STANDARD",
  "plausible adaptation",
  "competence earned through that adaptation",
  "Find the placement-specific contradiction",
  "End with what changes in a decision, assumption, request, or repeated behavior",
  "Short cards compress to mechanism, behavior, and consequence"
]) {
  assert.ok(canonicalAstrologyWritingInstructions.includes(required), `Canonical writer prompt must retain: ${required}`);
}
assert.match(canonicalAstrologyReviewInstructions, /10\. ARGUMENT DEVELOPMENT/u);
assert.match(canonicalAstrologyReviewInstructions, /trait list followed by generic advice/u);
assert.doesNotMatch(
  canonicalAstrologyWritingInstructions,
  /survival skills do not automatically retire|scarcity feel more trustworthy than abundance|life you built to protect yourself/iu,
  "The canonical prompt must carry the reasoning rule without mining memorable exemplar phrases."
);

const draftInput = buildDraftInput({
  plan: { object: "chiron", sign: "taurus", house: 12 },
  context: {
    sharedEvidencePacket: { version: "fixture", roles: {} },
    relevantOwnerPassages: [],
    knowledgeMatrixExamples: [],
    knowledgeMatrixArgumentCandidates: [],
    registerGoldExamples: [],
    sceneExamples: [],
    supportingOwnerPassages: [],
    phraseExamples: [],
    corrections: []
  },
  task: "Fixture only.",
  target: { surface: "natal-placement-detail" },
  family: "natal-placement-detail",
  register: "second_person",
  surface: "natal-placement-detail",
  argumentOutline: { status: "owner-approved" },
  spine: { status: "recorded" }
});
assert.match(draftInput, /ARGUMENT DEVELOPMENT IS A REASONING AUDIT, NOT A PROSE TEMPLATE/u);
assert.match(draftInput, /Do not invent biography/u);

const skill = read("skills/tldr-astro-writer/SKILL.md");
assert.ok(skill.includes("docs/writing/ARGUMENT_DEVELOPMENT_STANDARD.md"));
const evidenceStandard = read("docs/writing/SHARED_EVIDENCE_STANDARD.md");
assert.ok(evidenceStandard.includes(manifestPath));
assert.match(evidenceStandard, /REGISTER evidence only/u);

console.log("Argument-developed interpretation standard passed: exact owner-approved register evidence preserved, non-serving/phrase boundaries locked, and writer/reviewer prompts wired.");
