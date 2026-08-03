#!/usr/bin/env node
"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");

const packageRoot = path.resolve(__dirname, "..");
const repoRoot = path.resolve(packageRoot, "..", "..");
const skillRoot = path.join(repoRoot, ".agents", "skills", "marie-satori-writer");
const { buildIndex } = require(path.join(skillRoot, "scripts", "build-voice-index.js"));
const { buildPacket } = require(path.join(skillRoot, "scripts", "compile-writing-packet.js"));
const { audit } = require(path.join(skillRoot, "scripts", "audit-authorship.js"));
const { approvalLevel, validatePayload } = require(path.join(skillRoot, "scripts", "record-owner-feedback.js"));

function main() {
  const index = buildIndex();
  assert(index.entries.length > 3000, "the owner corpus must be indexed at paragraph level");
  assert(index.summary.positiveVoiceEvidenceCount > 2500);
  assert(index.entries.filter((entry) => entry.useAsPositiveVoiceEvidence).every((entry) =>
    ["owner_authored_final", "exact_owner_approved"].includes(entry.authorityClass)
  ));
  assert(index.entries.filter((entry) => entry.authorityClass === "ai_candidate_unreviewed").every((entry) => !entry.useAsPositiveVoiceEvidence));
  assert(index.entries.filter((entry) => entry.authorityClass === "third_party_source").every((entry) => !entry.useAsPositiveVoiceEvidence));
  const calibrationV3 = index.entries.filter((entry) => entry.sourceId.startsWith("sky-placement-uranus-cancer-collective-owner-approval-candidate-v3:"));
  assert(calibrationV3.length >= 5);
  assert(calibrationV3.every((entry) => entry.authorityClass === "exact_owner_approved" && entry.ownerApproved && !entry.useAsPositiveVoiceEvidence));

  const taxonomy = require(path.join("..", "voice", "tldr-astro", "marie-satori-writer", "failure-tags.json"));
  const requiredTags = [
    "polished_but_flat", "abstract_hook", "abstract_consequence", "requires_interpretation",
    "unnatural_personification", "behavior_missing", "generic_coverage_sentence",
    "explanatory_before_observable", "administrative_move", "category_inventory", "repeated_beat",
    "stacked_ending", "second_conclusion", "unsupported_domain_drift", "collective_second_person",
    "generic_new_age", "swappable_astrology", "overbalanced_structure"
  ];
  assert(requiredTags.every((tag) => Object.hasOwn(taxonomy.tags, tag)));

  const packet = buildPacket({
    surface: "sky-placement",
    planet: "saturn",
    sign: "capricorn",
    beat: "hook",
    goal: "replace polished abstraction with the exact cost of overwork",
    failureTags: ["abstract_consequence", "requires_interpretation", "polished_but_flat"],
    keywords: ["burnout", "overtime", "rest", "work", "achievement", "indispensable", "deadline", "exhaustion"],
    candidateFile: "packages/astro-knowledge/review/sky-placement-voice-pass-v6-targeted-candidates.json",
    candidateId: "sky-placement-v6-saturn-capricorn"
  });
  assert.strictEqual(packet.positiveExamples.length, 5);
  assert(packet.positiveExamples.every((entry) => entry.authorityClass === "owner_authored_final" || entry.authorityClass === "exact_owner_approved"));
  assert(packet.positiveExamples.every((entry) => !entry.sourceId.includes("uranus-cancer-collective-owner-approval-candidate-v3")));
  assert(packet.contrastiveEdits.length >= 2 && packet.contrastiveEdits.length <= 4);
  assert.strictEqual(packet.contrastiveEdits[0].id, "sky-placement-saturn-capricorn-name-lost-time");
  assert(packet.negativeExamples.some((entry) => entry.id === "polished-disappearance"));
  assert.match(packet.currentCandidate.article.hook, /giving up every evening, weekend, and day off/);
  assert.strictEqual(packet.writerLane.runtimeRegistered, false);
  assert.strictEqual(packet.governance.mayUseCalibrationOnlyV3AsGenerationEvidence, false);
  assert(packet.astrologyFacts.meaning.source.endsWith("saturn-capricorn.json"));

  const target = {
    sourceId: packet.currentCandidate.candidateId,
    planet: "saturn",
    sign: "capricorn",
    article: packet.currentCandidate.article
  };
  const cleanAudit = audit(target);
  assert.strictEqual(cleanAudit.gate, "authorship_review_required", "semantic authorship review cannot be skipped even when deterministic checks pass");
  const badAudit = audit({
    sourceId: "bad",
    planet: "venus",
    sign: "virgo",
    article: {
      tagline: "Trust the process",
      hook: "The banished want refuses to stay reasonable. Venus in Virgo creates change.",
      lived: "This transit brings growth and transformation for everyone.",
      turn: "Embrace the change and trust the process. Wishing you a beautiful transit.",
      moves: ["Trust the process.", "Step into your power."]
    }
  });
  assert.strictEqual(badAudit.gate, "rewrite_required");
  assert(badAudit.deterministicFindings.some((finding) => finding.rule === "known-negative-exact-match"));

  const directional = {
    feedbackKind: "directional_approval",
    surface: "sky-placement",
    articleBeat: "hook",
    after: "A preferred line.",
    ownerStatement: "This is better.",
    sourcePaths: ["review/example.json"]
  };
  assert.doesNotThrow(() => validatePayload(directional, { confirmExact: false }));
  assert.throws(() => validatePayload({ ...directional, feedbackKind: "exact_wording_approval" }, { confirmExact: false }), /confirm-exact-approval/);
  assert.throws(() => validatePayload({ ...directional, feedbackKind: "governed_content_promotion_approval" }, { confirmExact: false }), /cannot promote/);
  assert.strictEqual(approvalLevel("rejection"), "owner_rejected");
  assert.strictEqual(approvalLevel("exact_wording_approval"), "exact_owner_approved");

  const v7 = require(path.join("..", "review", "sky-placement-voice-pass-v7-writer-candidates.json"));
  const attestations = require(path.join("..", "review", "sky-placement-voice-pass-v7-authorship-attestations.json"));
  assert.strictEqual(v7.candidates.length, 3);
  for (const candidate of v7.candidates) {
    assert.strictEqual(candidate.status, "needs_review");
    assert.strictEqual(candidate.ownerApproved, false);
    assert.strictEqual(candidate.promotionAuthorized, false);
    assert.strictEqual(candidate.canonical, false);
    const report = audit({
      sourceId: candidate.candidateId,
      planet: candidate.planet,
      sign: candidate.sign,
      article: candidate.article
    }, attestations.attestations[candidate.candidateId]);
    assert.strictEqual(report.gate, "authorship_pass");
    assert.strictEqual(report.deterministicLint.score, 3);
    assert.strictEqual(report.deterministicLint.fails, 0);
  }

  const registry = require(path.join("..", "config", "editorial-model-registry.json"));
  assert(!registry.lanes["writer:sky-placement"], "environment build must not alter the live model registry");
  assert.strictEqual(registry.lanes["judge:sky-placement"].active.model, "gpt-5.6-terra");
  assert.strictEqual(registry.lanes["judge:sky-placement"].active.reasoningEffort, "low");

  const agents = fs.readFileSync(path.join(repoRoot, "AGENTS.md"), "utf8");
  assert.match(agents, /\.agents\/skills\/marie-satori-writer\/SKILL\.md/);
  const skill = fs.readFileSync(path.join(skillRoot, "SKILL.md"), "utf8");
  assert.doesNotMatch(skill, /\[TODO/);
  assert.match(skill, /name: marie-satori-writer/);
  assert.match(skill, /Terra only at the end/);
  console.log(`Marie Satori writer environment passed: ${index.entries.length} indexed excerpts, governed retrieval, authorship gate, feedback safety, and separated writer/judge roles.`);
}

try { main(); } catch (error) {
  console.error(error instanceof Error ? error.stack : error);
  process.exitCode = 1;
}
