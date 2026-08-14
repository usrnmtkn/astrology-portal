#!/usr/bin/env node

import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import { REPORT_JUDGE_THRESHOLD, reportFulfillmentConfig } from "../api/_lib/report-fulfillment-config.ts";
import { assembleReportGenerationPayload } from "../api/_lib/report-generation.ts";
import { verifyReportFactLock } from "../api/_lib/report-fact-lock.ts";
import { REPORT_JUDGE_CATEGORIES, judgeReportUnit, reportJudgeVerdict } from "../api/_lib/report-judge.ts";
import { reportOwnerComparisonSet } from "../api/_lib/report-owner-comparison.ts";
import {
  loadActiveReportCritiquePrompt,
  loadActiveReportJudgePrompt,
  loadLegacyReportCritiquePrompt,
  loadLegacyReportJudgePrompt,
  REPORT_CRITIQUE_BASELINE_PROMPT_PATH,
  REPORT_CRITIQUE_FOUNDATION_PROMPT_PATH,
  REPORT_CRITIQUE_PREVIOUS_PROMPT_PATH,
  REPORT_CRITIQUE_PROMPT_PATH,
  REPORT_CRITIQUE_PROMPT_VERSION,
  REPORT_EARNED_SENTENCE_RULING_PATH,
  REPORT_JUDGE_BASELINE_PROMPT_PATH,
  REPORT_JUDGE_FOUNDATION_PROMPT_PATH,
  REPORT_JUDGE_PREVIOUS_PROMPT_PATH,
  REPORT_JUDGE_PROMPT_PATH,
  REPORT_JUDGE_PROMPT_VERSION,
  REPORT_NATURALNESS_RULING_PATH
} from "../api/_lib/report-prompt-versions.ts";
import { scopeReportPayloadToUnit } from "../api/_lib/report-unit-scope.ts";
import { enforceReportRevisionStopRule, ReportStopRuleError } from "../api/_lib/report-writer-chain.ts";
import {
  assertFixtureFactCompleteness,
  completeUnitFacts,
  numberedCompleteUnit,
  paragraphLocationToken,
} from "./report-judge-v3-fixture-packets.mjs";

if (process.argv.includes("--live")) throw new Error("Use calibrate-report-judge-v3.mjs for the separately authorized live run.");

const manifest = JSON.parse(fs.readFileSync(new URL("./fixtures/report-judge-complete-unit-regressions-v3.json", import.meta.url), "utf8"));
const facts = JSON.parse(fs.readFileSync(manifest.factsSourcePath, "utf8"));
const judgeV3 = fs.readFileSync(REPORT_JUDGE_BASELINE_PROMPT_PATH, "utf8");
const critiqueV3 = fs.readFileSync(REPORT_CRITIQUE_BASELINE_PROMPT_PATH, "utf8");
const judgeV32 = fs.readFileSync(REPORT_JUDGE_FOUNDATION_PROMPT_PATH, "utf8");
const critiqueV5 = fs.readFileSync(REPORT_CRITIQUE_FOUNDATION_PROMPT_PATH, "utf8");
const judgeV33 = fs.readFileSync(REPORT_JUDGE_PREVIOUS_PROMPT_PATH, "utf8");
const critiqueV6 = fs.readFileSync(REPORT_CRITIQUE_PREVIOUS_PROMPT_PATH, "utf8");
const judgeV34 = fs.readFileSync(REPORT_JUDGE_PROMPT_PATH, "utf8");
const critiqueV7 = fs.readFileSync(REPORT_CRITIQUE_PROMPT_PATH, "utf8");
const naturalnessRuling = fs.readFileSync(REPORT_NATURALNESS_RULING_PATH, "utf8");
const earnedSentenceRuling = fs.readFileSync(REPORT_EARNED_SENTENCE_RULING_PATH, "utf8");
const livedProseStandard = fs.readFileSync("tldr-astro-phrasebank/TLDR-REPORT-LIVED-PROSE-STANDARD-OWNER.md", "utf8");
const archivedJudgeV2 = fs.readFileSync("tldr-astro-phrasebank/TLDR-REPORT-JUDGE-RUBRIC-V2-OWNER.md", "utf8");
const archivedCritiqueV2 = fs.readFileSync("tldr-astro-phrasebank/TLDR-REPORT-CRITIQUE-CHECKLIST-V2-OWNER.md", "utf8");
const calibrationRunTwo = JSON.parse(fs.readFileSync("artifacts/report-judge-calibration/2026-08-09T22-43-04.385Z-report-judge-v3.json", "utf8"));
const approvedV3Hashes = {
  judge: "8578b86c8bce19b47eef2a668b60a97b91d5de5e91182594da331167e8cc688c",
  critique: "815bc04db2890cb1797ff5ac1979dd1137953775629bf3e933db8f33029418b9",
};

function sha256(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function paragraphs(value) {
  return value.split(/\n\s*\n/u);
}

function extractRange(locator) {
  const source = fs.readFileSync(locator.sourcePath, "utf8");
  const start = source.indexOf(locator.startMarker);
  const end = source.indexOf(locator.endMarker, start + locator.startMarker.length);
  assert.ok(start >= 0, `${locator.id} start marker is missing.`);
  assert.ok(end > start, `${locator.id} end marker is missing or precedes the start.`);
  return source.slice(start, end).trim();
}

function extractUnit(fixture) {
  const unit = extractRange(fixture);
  assert.equal(sha256(unit), fixture.sourceSha256, `${fixture.id} owner-authored source range drifted.`);
  return unit;
}

function materializeNegative(fixture, positive) {
  const blocks = paragraphs(positive);
  for (const replacement of fixture.degradation.replacements) {
    assert.equal(sha256(blocks[replacement.paragraphIndex]), replacement.sourceSha256, `${fixture.id} paragraph ${replacement.paragraphIndex} drifted.`);
    blocks[replacement.paragraphIndex] = replacement.replacement;
  }
  return blocks.join("\n\n");
}

function wordCount(value) {
  return value.trim().split(/\s+/u).length;
}

const functionVocabulary = new Set(["opening", "development", "complication", "turn", "close"]);
const ownerPassages = new Map(manifest.ownerPassages.map((passage) => {
  assert.ok(functionVocabulary.has(passage.function), `${passage.id} has an unknown function tag.`);
  assert.equal(passage.sourceType, "owner_authored_final");
  const text = paragraphs(extractRange(passage))[passage.paragraphIndex];
  assert.ok(text, `${passage.id} paragraph is missing.`);
  assert.equal(sha256(text), passage.sourceSha256, `${passage.id} owner comparison passage drifted.`);
  return [passage.id, { ...passage, text }];
}));

function comparisonPacket(fixture, positive) {
  assert.ok(fixture.ownerComparisonSet.length >= 2 && fixture.ownerComparisonSet.length <= 3);
  return fixture.ownerComparisonSet.map((id) => {
    const passage = ownerPassages.get(id);
    assert.ok(passage, `${fixture.id} references missing owner passage ${id}.`);
    assert.notEqual(passage.sourcePath === fixture.sourcePath && passage.startMarker === fixture.startMarker && passage.endMarker === fixture.endMarker, true, `${fixture.id} comparison set contains its own positive source unit.`);
    assert.notEqual(sha256(passage.text), sha256(positive), `${fixture.id} comparison set contains its exact positive unit.`);
    assert.ok(fixture.targetFunctions.includes(passage.function), `${fixture.id} comparison passage ${passage.id} has non-comparable function ${passage.function}.`);
    return {
      evidenceId: passage.id,
      function: passage.function,
      provenance: { sourcePath: passage.sourcePath, sourceType: passage.sourceType, sourceSha256: passage.sourceSha256 },
      text: passage.text
    };
  });
}

function assertFixtureGovernance(fixture) {
  assert.equal(fixture.sourceType, "owner_authored_final");
  assert.equal(fixture.degradation.review_status, "needs_review");
  assert.equal(fixture.degradation.ownerApproved, false);
  assert.equal(fixture.degradation.promotionAuthorized, false);
  assert.equal(fixture.movementApplicable, true);
  assert.ok(fixture.substantiveParagraphIndices.length >= 2);
  assert.ok(fixture.targetFunctions.every((tag) => functionVocabulary.has(tag)));
}

function assertPairedStructure(fixture, positive, negative) {
  const positiveBlocks = paragraphs(positive);
  const negativeBlocks = paragraphs(negative);
  assert.equal(negativeBlocks.length, positiveBlocks.length, `${fixture.id} degradation changed paragraph structure.`);
  assert.equal(negativeBlocks[0], positiveBlocks[0], `${fixture.id} degradation changed the heading.`);
  assert.equal(negativeBlocks[fixture.attributionParagraphIndex], positiveBlocks[fixture.attributionParagraphIndex], `${fixture.id} degradation changed attribution.`);
  assert.equal(negativeBlocks[fixture.keyDatesParagraphIndex], positiveBlocks[fixture.keyDatesParagraphIndex], `${fixture.id} degradation changed key dates.`);
  const changed = positiveBlocks.flatMap((block, index) => block === negativeBlocks[index] ? [] : [index]);
  assert.deepEqual(changed, fixture.degradation.replacements.map((replacement) => replacement.paragraphIndex), `${fixture.id} changed an unnamed paragraph.`);
}

assert.equal(manifest.status, "needs_review");
assert.equal(manifest.ownerApproved, false);
assert.equal(manifest.promotionAuthorized, false);
assert.match(manifest.purpose, /must never become positive voice evidence/iu);
assert.deepEqual(new Set(manifest.functionVocabulary), functionVocabulary);
assert.equal(manifest.observedLifeContracts.length, 4);
assert.equal(manifest.pairs.length, 4);
assert.equal(manifest.findingLevelFixtures.length, 1);
assert.deepEqual(manifest.completeUnitParagraphIndexing, {
  convention: "zero_based_supplied_indices",
  marker: "[PARAGRAPH_INDEX={index}]",
  instruction: "Locations must copy the supplied PARAGRAPH_INDEX value. The model never counts paragraphs.",
});
assert.deepEqual(manifest.proposedCalibrationCallBudget, {
  total: 9,
  judgeCalls: 8,
  critiqueCalls: 1,
  description: "One judge call for each positive and negative in four score-level pairs, plus one critique call for the single-sentence finding-level fixture. No retries without new authorization."
});
assert.equal(new Set(manifest.pairs.map((pair) => pair.reportDomain)).size, 4);
assert.ok(manifest.pairs.some((pair) => pair.reportDomain === "personal_health"));
assert.equal(REPORT_JUDGE_PROMPT_PATH, "tldr-astro-phrasebank/TLDR-REPORT-JUDGE-RUBRIC-V3.4-OWNER.md");
assert.equal(REPORT_CRITIQUE_PROMPT_PATH, "tldr-astro-phrasebank/TLDR-REPORT-CRITIQUE-CHECKLIST-V7-OWNER.md");
assert.equal(REPORT_JUDGE_PROMPT_VERSION, "report-judge-rubric-v3.4");
assert.equal(REPORT_CRITIQUE_PROMPT_VERSION, "report-critique-checklist-v7");
assert.match(archivedJudgeV2, /^\*\*Active in production:\*\* `false`$/mu);
assert.match(archivedCritiqueV2, /^\*\*Active in production:\*\* `false`$/mu);
assert.equal(REPORT_JUDGE_THRESHOLD, 0.85);
assert.equal(reportFulfillmentConfig().judgeThreshold, 0.85);
assert.ok(naturalnessRuling.includes("**Approved source SHA-256:** `d14433fb6bdee571a36460792f6527b98d3ad94072a178dfdb3d876aed8476db`"));
for (const [name, document, version] of [
  ["judge", judgeV34, "report-judge-rubric-v3.4"],
  ["critique", critiqueV7, "report-critique-checklist-v7"]
]) {
  assert.match(document, /^\*\*Status:\*\* `owner_approved`$/mu, `${name} activation must record owner approval.`);
  assert.ok(document.includes(`**Version:** \`${version}\``));
  assert.match(document, /^\*\*Active in production:\*\* `true`$/mu);
  assert.match(document, /^\*\*Owner approved:\*\* `true`$/mu);
  assert.match(document, /^\*\*Promotion authorized:\*\* `true`$/mu);
}
const governingNaturalnessLine = "Do not flag a sentence because it is stylish. Flag it when the style makes the reader work harder than the meaning requires.";
assert.ok(judgeV34.includes(governingNaturalnessLine));
for (const diagnostic of ["constructed_phrasing", "double_hedging", "abstract_proof_language", "vagueness_that_matters"]) {
  assert.ok(critiqueV7.includes(diagnostic), `Critique v7 must contain ${diagnostic}.`);
}
for (const restraint of ["landed_compact_rhetoric", "clear_pronoun_antecedent", "maximum_useful_specificity", "stop_after_landing"]) {
  assert.ok(critiqueV7.includes(restraint), `Critique v7 must contain do-not-flag diagnostic ${restraint}.`);
}
for (const item of ["Unnatural verb for an ordinary action", "Double hedging weakens a supported consequence", "Abstract proof language instead of the observable test", "KEEP EXACTLY", "Pronoun: conditional, not mechanical", "Ordinary verb, concrete object"]) {
  assert.ok(naturalnessRuling.includes(item), `Naturalness ruling must preserve evidence item '${item}'.`);
}
for (const document of [judgeV34, critiqueV7]) {
  assert.match(document, /The reply you wanted can still create more work than the silence did\./u);
  assert.match(document, /Pronoun (?:judgment|findings) (?:is|are) contextual/u);
}

for (const [name, document] of [["judge", judgeV3], ["critique", critiqueV3]]) {
  assert.match(document, /^\*\*Status:\*\* `owner_approved`$/mu, `${name} v3 approval must be recorded.`);
  assert.match(document, /^\*\*Active in production:\*\* `true`$/mu, `${name} v3 must be active.`);
  assert.match(document, /^\*\*Owner approved:\*\* `true`$/mu, `${name} v3 must record owner approval.`);
  assert.match(document, /^\*\*Promotion authorized:\*\* `true`$/mu, `${name} v3 must record promotion authorization.`);
  assert.match(document, /COMPLETE_UNIT/u);
  assert.match(document, /UNIT_FACTS/u);
  assert.match(document, /OWNER_COMPARISON_SET/u);
  assert.match(document, /candidate unit itself is forbidden from its own comparison set/iu);
  assert.match(document, /`opening`, `development`, `complication`, `turn`, or `close`/u);
  assert.equal(sha256(document), approvedV3Hashes[name], `${name} active v3 changed after owner approval.`);
}
assert.match(judgeV3, /^\*\*Version:\*\* `report-judge-rubric-v3\.1`$/mu);
assert.match(judgeV3, /^\*\*Approved threshold:\*\* `0\.85`$/mu);
assert.match(critiqueV3, /^\*\*Version:\*\* `report-critique-checklist-v3`$/mu);
for (const [name, document, version, approvedSourceSha] of [
  ["judge", judgeV32, "report-judge-rubric-v3.2", "bce4534c7f0f6a5689afbf3305fac73ff8b2024669b5639e776fa77efd5a1e5f"],
  ["critique", critiqueV5, "report-critique-checklist-v5", "64f161623fb8f071056bb41b124626e502735a569cc880ba39e0c0932f15981f"]
]) {
  assert.match(document, /^\*\*Status:\*\* `owner_approved`$/mu, `${name} successor approval must be recorded.`);
  assert.ok(document.includes("**Version:** `" + version + "`"));
  assert.match(document, /^\*\*Active in production:\*\* `true`$/mu);
  assert.match(document, /^\*\*Owner approved:\*\* `true`$/mu);
  assert.match(document, /^\*\*Promotion authorized:\*\* `true`$/mu);
  assert.ok(document.includes("**Approved source SHA-256:** `" + approvedSourceSha + "`"));
}
for (const [name, document, version, approvedSourceSha] of [
  ["judge", judgeV33, "report-judge-rubric-v3.3", "9f74b1ad1c4057286ca7acc6687b7ab8349e93d8b0e5de7f94c354ad83ea7f03"],
  ["critique", critiqueV6, "report-critique-checklist-v6", "73a575734822ae895bf67e940bb00f591cb381762d55d4a45cc8c1cdf910ff6e"],
  ["earned sentence", earnedSentenceRuling, "report-earned-sentence-ruling-v1", "e9a56a474f0ac6a94724d43a425fc1a887f5f79e266b7c8a37a6c2ac0e0ca5ce"]
]) {
  assert.match(document, /^\*\*Status:\*\* `owner_approved`$/mu, `${name} activation approval must be recorded.`);
  assert.ok(document.includes("**Version:** `" + version + "`"));
  assert.match(document, /^\*\*Active in production:\*\* `true`$/mu);
  assert.match(document, /^\*\*Owner approved:\*\* `true`$/mu);
  assert.match(document, /^\*\*Promotion authorized:\*\* `true`$/mu);
  assert.ok(document.includes("**Approved source SHA-256:** `" + approvedSourceSha + "`"));
}
const activeJudgePrompt = loadActiveReportJudgePrompt();
const activeCritiquePrompt = loadActiveReportCritiquePrompt();
const legacyJudgePrompt = loadLegacyReportJudgePrompt();
const legacyCritiquePrompt = loadLegacyReportCritiquePrompt();
assert.deepEqual(activeJudgePrompt.sourcePaths, [
  REPORT_JUDGE_BASELINE_PROMPT_PATH,
  REPORT_JUDGE_FOUNDATION_PROMPT_PATH,
  REPORT_JUDGE_PREVIOUS_PROMPT_PATH,
  REPORT_JUDGE_PROMPT_PATH
]);
assert.match(activeJudgePrompt.text, /report-judge-rubric-v3\.1/u);
assert.match(activeJudgePrompt.text, /report-judge-rubric-v3\.2/u);
assert.match(activeJudgePrompt.text, /report-judge-rubric-v3\.3/u);
assert.deepEqual(activeCritiquePrompt.sourcePaths, [
  REPORT_CRITIQUE_BASELINE_PROMPT_PATH,
  REPORT_CRITIQUE_FOUNDATION_PROMPT_PATH,
  REPORT_CRITIQUE_PREVIOUS_PROMPT_PATH,
  REPORT_CRITIQUE_PROMPT_PATH
]);
assert.match(activeCritiquePrompt.text, /report-critique-checklist-v3/u);
assert.match(activeCritiquePrompt.text, /report-critique-checklist-v5/u);
assert.match(activeCritiquePrompt.text, /report-critique-checklist-v6/u);
assert.match(activeCritiquePrompt.text, /no_earned_sentence/u);
assert.match(activeJudgePrompt.text, /report-judge-rubric-v3\.4/u);
assert.match(activeCritiquePrompt.text, /report-critique-checklist-v7/u);
assert.doesNotMatch(legacyJudgePrompt.text, /report-judge-rubric-v3\.4/u);
assert.doesNotMatch(legacyCritiquePrompt.text, /report-critique-checklist-v7/u);
assert.match(activeJudgePrompt.text, /same unit-level function: overview with overview, season with season/iu);
assert.equal(calibrationRunTwo.status, "passed");
assert.equal(calibrationRunTwo.completedCalls, 9);
assert.deepEqual(calibrationRunTwo.failures, []);
assert.equal(calibrationRunTwo.authorization.threshold, 0.9, "The completed calibration artifact remains immutable historical evidence.");
for (const row of calibrationRunTwo.rows.filter((candidate) => candidate.type === "judge")) {
  assert.equal(
    reportJudgeVerdict(row.result.scores, 0.85, true),
    row.variant === "positive" ? "pass" : "below_threshold",
    `${row.fixtureId}.${row.variant} must classify correctly at the owner-approved 0.85 threshold.`
  );
}
for (const [domain, prefix] of [["general", "general_"], ["work_money", "work_"], ["love_connection", "love_"], ["personal_health", "personal_"]]) {
  const comparisonSet = reportOwnerComparisonSet(domain);
  assert.ok(comparisonSet.length >= 2 && comparisonSet.length <= 3);
  assert.equal(new Set(comparisonSet.map((passage) => passage.evidenceId)).size, comparisonSet.length);
  assert.ok(comparisonSet.every((passage) => passage.provenance.sourceType === "owner_authored_final"));
  assert.deepEqual(
    comparisonSet.map((passage) => passage.evidenceId),
    manifest.ownerPassages.filter((passage) => passage.id.startsWith(prefix)).map((passage) => passage.id),
    `${domain} runtime comparison evidence must match the calibrated manifest.`
  );
}
const runtimePayload = assembleReportGenerationPayload({
  reportId: "00000000-0000-0000-0000-000000000085",
  reportDomain: "general",
  reportHorizon: "12_months",
  unitId: "spring",
  frozenFacts: facts
});
const runtimeScores = Object.fromEntries(REPORT_JUDGE_CATEGORIES.map((category) => [category, category === "natural_language" ? 3 : 4]));
let runtimePrompt = "";
const runtimeJudge = await judgeReportUnit({
  payload: runtimePayload,
  draft: { headline: "FIXTURE_ONLY", body: "FIRST SUBSTANTIVE PARAGRAPH.\n\nSECOND SUBSTANTIVE PARAGRAPH.", sections: [] },
  validatorResults: [],
  threshold: 0.85,
  callModel: async (input) => {
    runtimePrompt = input.prompt;
    return {
      value: {
        scores: runtimeScores,
        applicability: { interpretive_movement: "not_applicable", reason: "MODEL_REPORTED_VALUE_IS_NOT_AUTHORITY" },
        overall: 0,
        verdict: "below_threshold",
        findings: []
      },
      model: "FIXTURE_ONLY_MODEL",
      provider: "FIXTURE_ONLY_PROVIDER",
      usage: { inputTokens: 0, outputTokens: 0, totalTokens: 0 }
    };
  }
});
assert.match(runtimePrompt, /COMPLETE_UNIT[\s\S]*UNIT_FACTS[\s\S]*OWNER_COMPARISON_SET[\s\S]*TARGET_FUNCTIONS[\s\S]*LABELED_NEGATIVE_EXAMPLES[\s\S]*VALIDATOR_RESULTS/u);
assert.equal(runtimeJudge.result.applicability.interpretive_movement, "applicable");
assert.equal(runtimeJudge.result.overall, 35 / 36);
assert.equal(runtimeJudge.result.verdict, "pass", "Runtime recomputation must override model-reported overall and verdict.");
const candidateRuntimePayload = assembleReportGenerationPayload({
  reportId: "00000000-0000-0000-0000-000000000086",
  reportDomain: "general",
  reportHorizon: "12_months",
  unitId: "spring",
  frozenFacts: facts
});
let candidateRuntimePrompt = "";
await judgeReportUnit({
  payload: candidateRuntimePayload,
  draft: { headline: "SPRING 2026: FIXTURE_ONLY", timing: "Mar 20 - Jun 21", body: "FIRST SUBSTANTIVE PARAGRAPH.\n\nSECOND SUBSTANTIVE PARAGRAPH.", sections: [] },
  validatorResults: [],
  threshold: 0.85,
  promptMode: "active",
  callModel: async (input) => {
    candidateRuntimePrompt = input.prompt;
    return {
      value: {
        scores: Object.fromEntries(REPORT_JUDGE_CATEGORIES.map((category) => [category, 4])),
        applicability: { interpretive_movement: "applicable", reason: "FIXTURE_ONLY" },
        overall: 1,
        verdict: "pass",
        findings: []
      },
      model: "FIXTURE_ONLY_MODEL",
      provider: "FIXTURE_ONLY_PROVIDER",
      usage: { inputTokens: 0, outputTokens: 0, totalTokens: 0 }
    };
  }
});
assert.match(candidateRuntimePrompt, /report-judge-rubric-v3\.4/u);
assert.ok(candidateRuntimePrompt.includes(governingNaturalnessLine));
assert.match(candidateRuntimePrompt, /NATURALNESS_AND_JUDGING_RESTRAINT_OWNER_RULING/u);
const shortJudge = await judgeReportUnit({
  payload: runtimePayload,
  draft: { body: "ONE SUBSTANTIVE PARAGRAPH.", sections: [] },
  validatorResults: [],
  threshold: 0.85,
  callModel: async () => ({
    value: {
      scores: { ...runtimeScores, natural_language: 4, interpretive_movement: 0 },
      applicability: { interpretive_movement: "applicable", reason: "MODEL_REPORTED_VALUE_IS_NOT_AUTHORITY" },
      overall: 0,
      verdict: "below_threshold",
      findings: []
    },
    model: "FIXTURE_ONLY_MODEL",
    provider: "FIXTURE_ONLY_PROVIDER",
    usage: { inputTokens: 0, outputTokens: 0, totalTokens: 0 }
  })
});
assert.equal(shortJudge.result.scores.interpretive_movement, null);
assert.equal(shortJudge.result.applicability.interpretive_movement, "not_applicable");
assert.equal(shortJudge.result.overall, 1);
assert.equal(shortJudge.result.verdict, "pass");
const amendedQuestion9 = "Could the interpretive passage move unchanged into a generic wellness, HR, or horoscope article because it lacks the unit-specific circumstance, cause, or consequence? If so, identify what is missing. This diagnostic alone cannot establish a defect.";
assert.ok(judgeV3.includes(amendedQuestion9));
assert.ok(critiqueV3.includes(amendedQuestion9));
assert.ok(livedProseStandard.includes(amendedQuestion9));
assert.match(judgeV3, /corroborative only[\s\S]*never be the sole basis for a finding or score reduction/iu);
assert.match(critiqueV3, /corroborative only[\s\S]*never establish a defect by itself/iu);
assert.match(judgeV3, /The appointment is still at ten\./u);
assert.match(critiqueV3, /The appointment is still at ten\./u);
assert.match(critiqueV3, /When several categories describe the same underlying defect and require the same correction, return the narrowest causal defect as primary\. Add a second defect only when it identifies a materially different problem requiring a separate correction\./u);
assert.match(critiqueV3, /scope_start/u);
assert.match(critiqueV3, /scope_end/u);
assert.match(judgeV3, /scores\.interpretive_movement` to `null`/u);
assert.match(judgeV3, /runtime, not the model, recomputes applicability, overall score, hard gates, and verdict/iu);

assert.equal(manifest.ownerFinalityRuling.date, "2026-08-09");
assert.equal(manifest.ownerFinalityRuling.verbatim, [
  "WORK & MONEY: final / owner-authored-final reference",
  "LOVE & CONNECTION: final / owner-authored-final reference",
  "PERSONAL & HEALTH: final / owner-authored-final reference",
].join("\n"));
for (const [domain, reference] of Object.entries(manifest.ownerFinalityRuling.references)) {
  assert.equal(reference.sourceType, "owner_authored_final");
  assert.equal(sha256(fs.readFileSync(reference.sourcePath)), reference.sha256, `${domain} final owner reference drifted.`);
}
for (const [domain, prefix] of [["work_money", "work_"], ["love_connection", "love_"], ["personal_health", "personal_"]]) {
  const finalReference = manifest.ownerFinalityRuling.references[domain].sourcePath;
  for (const source of [
    ...[...manifest.pairs, ...manifest.findingLevelFixtures].filter((fixture) => fixture.reportDomain === domain),
    ...manifest.ownerPassages.filter((passage) => passage.id.startsWith(prefix)),
  ]) {
    assert.equal(source.sourcePath, finalReference, `${source.id} must use the ruled final ${domain} reference.`);
    assert.equal(source.sourceType, "owner_authored_final");
  }
}

const scopedDraft = { headline: "FIXTURE_ONLY.", body: "ONE.\n\nTWO.\n\nTHREE.\n\nFOUR.", sections: [] };
const scopedRevision = { ...scopedDraft, body: "ONE.\n\nTWO_CHANGED.\n\nTHREE_CHANGED.\n\nFOUR." };
assert.equal(enforceReportRevisionStopRule(scopedDraft, scopedRevision, [{
  id: "scope-1", category: "interpretive_gap", location: "body", sentence_index: 1, scope_start: 1, scope_end: 2,
  quote: "TWO. THREE.", evidence: "FIXTURE_ONLY", instruction: "FIXTURE_ONLY"
}]).body, scopedRevision.body);
assert.throws(() => enforceReportRevisionStopRule(scopedDraft, scopedRevision, [{
  id: "scope-1", category: "interpretive_gap", location: "body", sentence_index: 1,
  quote: "TWO.", evidence: "FIXTURE_ONLY", instruction: "FIXTURE_ONLY"
}]), ReportStopRuleError);

const rows = [];
const factRows = [];
for (const fixture of [...manifest.pairs, ...manifest.findingLevelFixtures]) {
  assertFixtureGovernance(fixture);
  const positive = extractUnit(fixture);
  const negative = materializeNegative(fixture, positive);
  assertPairedStructure(fixture, positive, negative);
  const lengthRatio = wordCount(negative) / wordCount(positive);
  assert.ok(lengthRatio >= 0.8 && lengthRatio <= 1.2, `${fixture.id} length ratio ${lengthRatio.toFixed(3)} is outside tolerance.`);
  const ownerComparisonSet = comparisonPacket(fixture, positive);
  assert.equal(ownerComparisonSet.every((passage) => functionVocabulary.has(passage.function)), true);

  const payload = scopeReportPayloadToUnit(assembleReportGenerationPayload({
    reportId: "00000000-0000-0000-0000-000000000003",
    reportDomain: fixture.reportDomain === "personal_health" ? "general" : fixture.reportDomain,
    reportHorizon: fixture.reportHorizon,
    unitId: fixture.unitId,
    frozenFacts: facts
  }));
  assert.equal(payload.livedProseStandard.sourcePath, "tldr-astro-phrasebank/TLDR-REPORT-LIVED-PROSE-STANDARD-OWNER.md");
  const unitFacts = completeUnitFacts({ manifest, fixture, scopedFacts: payload.frozenFacts, fullFacts: facts });
  factRows.push(...assertFixtureFactCompleteness({ manifest, fixture, unit: positive, unitFacts }));
  assert.deepEqual(verifyReportFactLock({ body: positive, sections: [] }, unitFacts).issues, [], `${fixture.id} positive must match scoped facts.`);
  assert.deepEqual(verifyReportFactLock({ body: negative, sections: [] }, unitFacts).issues, [], `${fixture.id} negative must preserve scoped facts.`);
  const numberedPositive = numberedCompleteUnit(manifest, positive);
  const numberedNegative = numberedCompleteUnit(manifest, negative);
  paragraphs(positive).forEach((_, index) => {
    assert.ok(numberedPositive.includes(paragraphLocationToken(manifest, index)), `${fixture.id} positive packet is missing supplied paragraph index ${index}.`);
    assert.ok(numberedNegative.includes(paragraphLocationToken(manifest, index)), `${fixture.id} negative packet is missing supplied paragraph index ${index}.`);
  });
  rows.push({
    fixture: fixture.id,
    kind: fixture.kind ?? "score_pair",
    dimension: fixture.dimension,
    paragraphs: paragraphs(positive).length,
    lengthRatio: Number(lengthRatio.toFixed(3)),
    functions: fixture.targetFunctions.join(","),
    positiveMinimum: fixture.expected.positiveMinimum ? JSON.stringify(fixture.expected.positiveMinimum) : "n/a",
    negativeMaximum: fixture.expected.negativeMaximum ? JSON.stringify(fixture.expected.negativeMaximum) : "n/a",
    minimumPairDelta: fixture.expected.minimumPairDelta ? JSON.stringify(fixture.expected.minimumPairDelta) : "n/a"
  });
}

const findingFixture = manifest.findingLevelFixtures[0];
assert.equal(findingFixture.expected.requiredFindingCategory, "owner_voice_drift");
assert.equal(findingFixture.expected.wholeUnitScoreRequirement, null);
assert.equal(findingFixture.degradation.replacements.length, 1);
assert.equal(findingFixture.degradation.replacements[0].paragraphIndex, findingFixture.expected.requiredParagraphIndex);
assert.ok(numberedCompleteUnit(manifest, materializeNegative(findingFixture, extractUnit(findingFixture))).includes(
  `${paragraphLocationToken(manifest, findingFixture.expected.requiredParagraphIndex)}\n${findingFixture.degradation.replacements[0].replacement}`
));
assert.ok(manifest.pairs.find((pair) => pair.reportDomain === "work_money").degradation.replacements.length >= 3);

console.table(rows);
console.table(factRows);
console.log("Active report judge v3 contracts passed: threshold 0.85, four controlled score pairs, complete audited UNIT_FACTS, supplied paragraph indices, owner-final comparison evidence, byte-locked active documents, runtime recomputation, stop-rule ranges, and no live calls.");
