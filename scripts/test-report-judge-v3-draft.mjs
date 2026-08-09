#!/usr/bin/env node

import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import { assembleReportGenerationPayload } from "../api/_lib/report-generation.ts";
import { verifyReportFactLock } from "../api/_lib/report-fact-lock.ts";
import { REPORT_JUDGE_PROMPT_PATH, REPORT_CRITIQUE_PROMPT_PATH } from "../api/_lib/report-prompt-versions.ts";
import { scopeReportPayloadToUnit } from "../api/_lib/report-unit-scope.ts";
import { enforceReportRevisionStopRule, ReportStopRuleError } from "../api/_lib/report-writer-chain.ts";

if (process.argv.includes("--live")) throw new Error("Report judge v3 is a needs_review draft. Live calls require fresh owner approval and separate run authorization.");

const manifest = JSON.parse(fs.readFileSync(new URL("./fixtures/report-judge-complete-unit-regressions-v3.json", import.meta.url), "utf8"));
const facts = JSON.parse(fs.readFileSync(manifest.factsSourcePath, "utf8"));
const judgeV3 = fs.readFileSync("tldr-astro-phrasebank/TLDR-REPORT-JUDGE-RUBRIC-V3-DRAFT.md", "utf8");
const critiqueV3 = fs.readFileSync("tldr-astro-phrasebank/TLDR-REPORT-CRITIQUE-CHECKLIST-V3-DRAFT.md", "utf8");
const livedProseStandard = fs.readFileSync("tldr-astro-phrasebank/TLDR-REPORT-LIVED-PROSE-STANDARD-OWNER.md", "utf8");
const activeJudgeV2 = fs.readFileSync(REPORT_JUDGE_PROMPT_PATH, "utf8");
const activeCritiqueV2 = fs.readFileSync(REPORT_CRITIQUE_PROMPT_PATH, "utf8");

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
assert.deepEqual(manifest.proposedCalibrationCallBudget, {
  total: 9,
  judgeCalls: 8,
  critiqueCalls: 1,
  description: "One judge call for each positive and negative in four score-level pairs, plus one critique call for the single-sentence finding-level fixture. No retries without new authorization."
});
assert.equal(new Set(manifest.pairs.map((pair) => pair.reportDomain)).size, 4);
assert.ok(manifest.pairs.some((pair) => pair.reportDomain === "personal_health"));
assert.equal(REPORT_JUDGE_PROMPT_PATH, "tldr-astro-phrasebank/TLDR-REPORT-JUDGE-RUBRIC-OWNER.md");
assert.equal(REPORT_CRITIQUE_PROMPT_PATH, "tldr-astro-phrasebank/TLDR-REPORT-CRITIQUE-CHECKLIST-OWNER.md");
assert.match(activeJudgeV2, /^\*\*Status:\*\* `owner_approved`$/mu);
assert.match(activeCritiqueV2, /^\*\*Status:\*\* `owner_approved`$/mu);

for (const [name, document] of [["judge", judgeV3], ["critique", critiqueV3]]) {
  assert.match(document, /^\*\*Status:\*\* `needs_review`$/mu, `${name} v3 must remain needs_review.`);
  assert.match(document, /^\*\*Active in production:\*\* `false`$/mu, `${name} v3 must remain inactive.`);
  assert.match(document, /^\*\*Owner approved:\*\* `false`$/mu, `${name} v3 must remain unapproved.`);
  assert.match(document, /^\*\*Promotion authorized:\*\* `false`$/mu, `${name} v3 must remain unauthorized.`);
  assert.match(document, /COMPLETE_UNIT/u);
  assert.match(document, /UNIT_FACTS/u);
  assert.match(document, /OWNER_COMPARISON_SET/u);
  assert.match(document, /candidate unit itself is forbidden from its own comparison set/iu);
  assert.match(document, /`opening`, `development`, `complication`, `turn`, or `close`/u);
}
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
  const unitFacts = {
    ...payload.frozenFacts,
    unitContext: { unitId: fixture.unitId, startsOn: fixture.unitWindow.startsOn, endsOn: fixture.unitWindow.endsOn }
  };
  assert.deepEqual(verifyReportFactLock({ body: positive, sections: [] }, unitFacts).issues, [], `${fixture.id} positive must match scoped facts.`);
  assert.deepEqual(verifyReportFactLock({ body: negative, sections: [] }, unitFacts).issues, [], `${fixture.id} negative must preserve scoped facts.`);
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
assert.ok(manifest.pairs.find((pair) => pair.reportDomain === "work_money").degradation.replacements.length >= 3);

console.table(rows);
console.log("Report judge v3 draft fixtures passed: four controlled score pairs, one bounded finding fixture, function-tagged non-self comparisons, scoped facts, stop-rule ranges, and no live calls.");
