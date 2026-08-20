#!/usr/bin/env node

import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { assembleReportGenerationPayload } from "../api/_lib/report-generation.ts";
import { callReportCalibrationModel, judgeModelTarget } from "../api/_lib/report-model-client.ts";
import { scopeReportPayloadToUnit } from "../api/_lib/report-unit-scope.ts";
import { REPORT_DEFECT_CATEGORIES } from "../api/_lib/report-writer-chain.ts";
import { loadActiveReportCritiquePrompt, loadActiveReportJudgePrompt } from "../api/_lib/report-prompt-versions.ts";
import {
  completeUnitFacts,
  numberedCompleteUnit,
  paragraphLocationToken,
} from "./report-judge-v3-fixture-packets.mjs";

const manifestPath = "scripts/fixtures/report-judge-complete-unit-regressions-v3.json";
const livedProsePath = "tldr-astro-phrasebank/TLDR-REPORT-LIVED-PROSE-STANDARD-OWNER.md";
const promptPaths = {
  general: "tldr-astro-phrasebank/TLDR-REPORT-HORIZONS-GENERATION-PROMPT-V2-OWNER.md",
  work_money: "tldr-astro-phrasebank/TLDR-WORK-MONEY-DEEPDIVE-GENERATION-PROMPT-OWNER.md",
  love_connection: "tldr-astro-phrasebank/TLDR-LOVE-CONNECTION-DEEPDIVE-GENERATION-PROMPT-OWNER.md"
};
const categories = [
  "astrology_chronology", "factual_traceability", "lived_experience",
  "interpretive_movement", "owner_voice", "natural_language", "syntax_variety",
  "emotional_temperature", "density"
];
const hardGates = new Set([
  "astrology_chronology", "factual_traceability", "lived_experience",
  "interpretive_movement", "owner_voice"
]);

function read(sourcePath) {
  return fs.readFileSync(sourcePath, "utf8");
}

const activeJudgePrompt = loadActiveReportJudgePrompt();
const activeCritiquePrompt = loadActiveReportCritiquePrompt();

function sha256(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function paragraphs(value) {
  return value.split(/\n\s*\n/u);
}

function extractRange(locator) {
  const source = read(locator.sourcePath);
  const start = source.indexOf(locator.startMarker);
  const end = source.indexOf(locator.endMarker, start + locator.startMarker.length);
  assert.ok(start >= 0 && end > start, `${locator.id} source range is missing.`);
  return source.slice(start, end).trim();
}

function extractUnit(fixture) {
  const unit = extractRange(fixture);
  assert.equal(sha256(unit), fixture.sourceSha256, `${fixture.id} owner unit drifted.`);
  return unit;
}

function negativeUnit(fixture, positive) {
  const blocks = paragraphs(positive);
  for (const replacement of fixture.degradation.replacements) {
    assert.equal(sha256(blocks[replacement.paragraphIndex]), replacement.sourceSha256);
    blocks[replacement.paragraphIndex] = replacement.replacement;
  }
  return blocks.join("\n\n");
}

const manifestText = read(manifestPath);
const manifest = JSON.parse(manifestText);
const judgeText = activeJudgePrompt.text;
const critiqueText = activeCritiquePrompt.text;
const livedProseText = read(livedProsePath);
const facts = JSON.parse(read(manifest.factsSourcePath));

for (const [name, document] of [["judge", judgeText], ["critique", critiqueText]]) {
  assert.match(document, /^\*\*Status:\*\* `owner_approved`$/mu, `${name} v3 is not owner-approved.`);
  assert.match(document, /^\*\*Active in production:\*\* `true`$/mu, `${name} v3 must be active.`);
  assert.match(document, /^\*\*Owner approved:\*\* `true`$/mu);
  assert.match(document, /^\*\*Promotion authorized:\*\* `true`$/mu);
}
assert.deepEqual(manifest.proposedCalibrationCallBudget, {
  total: 9,
  judgeCalls: 8,
  critiqueCalls: 1,
  description: "One judge call for each positive and negative in four score-level pairs, plus one critique call for the single-sentence finding-level fixture. No retries without new authorization."
});

const ownerPassages = new Map(manifest.ownerPassages.map((passage) => {
  const text = paragraphs(extractRange(passage))[passage.paragraphIndex];
  assert.equal(sha256(text), passage.sourceSha256, `${passage.id} comparison evidence drifted.`);
  return [passage.id, {
    evidenceId: passage.id,
    function: passage.function,
    provenance: {
      sourcePath: passage.sourcePath,
      sourceType: passage.sourceType,
      sourceSha256: passage.sourceSha256
    },
    text
  }];
}));

function comparisonSet(fixture) {
  return fixture.ownerComparisonSet.map((id) => ownerPassages.get(id));
}

function scopedFacts(fixture) {
  const payload = scopeReportPayloadToUnit(assembleReportGenerationPayload({
    reportId: "00000000-0000-0000-0000-000000000003",
    reportDomain: fixture.reportDomain === "personal_health" ? "general" : fixture.reportDomain,
    reportHorizon: fixture.reportHorizon,
    unitId: fixture.unitId,
    frozenFacts: facts
  }));
  return completeUnitFacts({ manifest, fixture, scopedFacts: payload.frozenFacts, fullFacts: facts });
}

function canonicalPrompt(fixture) {
  const sourcePath = promptPaths[fixture.reportDomain];
  return sourcePath
    ? { status: "owner_ruled", sourcePath, text: read(sourcePath) }
    : {
        status: "owner_pending",
        sourcePath: "tldr-astro-phrasebank/TLDR-PERSONAL-HEALTH-DEEPDIVE-GENERATION-PROMPT-OWNER.md",
        text: null,
        note: "The Personal & Health domain prompt is not supplied or inferred for this judge calibration."
      };
}

const labeledNegativeExamples = [
  {
    evidenceId: "labeled-negative-flat-recovery",
    label: "negative calibration evidence only",
    text: "A long day may still be completely possible and need more recovery afterward."
  },
  {
    evidenceId: "labeled-negative-concrete-noun-list",
    label: "negative calibration evidence only",
    text: "Work, appointments, travel, caregiving, and recovery may all affect your capacity this month."
  }
];

const scoreProperties = Object.fromEntries(categories.map((category) => [category,
  category === "interpretive_movement"
    ? { anyOf: [{ type: "number", minimum: 0, maximum: 4 }, { type: "null" }] }
    : { type: "number", minimum: 0, maximum: 4 }
]));
const judgeSchema = {
  type: "object",
  additionalProperties: false,
  required: ["scores", "applicability", "overall", "verdict", "findings"],
  properties: {
    scores: { type: "object", additionalProperties: false, required: categories, properties: scoreProperties },
    applicability: {
      type: "object", additionalProperties: false,
      required: ["interpretive_movement", "reason"],
      properties: {
        interpretive_movement: { type: "string", enum: ["applicable", "not_applicable"] },
        reason: { type: "string" }
      }
    },
    overall: { type: "number", minimum: 0, maximum: 1 },
    verdict: { type: "string", enum: ["pass", "below_threshold"] },
    findings: {
      type: "array",
      items: {
        type: "object", additionalProperties: false,
        required: ["category", "location", "finding", "evidence_ids"],
        properties: {
          category: { type: "string", enum: categories },
          location: { type: "string" },
          finding: { type: "string" },
          evidence_ids: { type: "array", items: { type: "string" } }
        }
      }
    }
  }
};
const critiqueSchema = {
  type: "object",
  additionalProperties: false,
  required: ["result", "applicability", "defects"],
  properties: {
    result: { type: "string", enum: ["no_defects", "defects"] },
    applicability: {
      type: "object", additionalProperties: false,
      required: ["interpretive_movement", "reason"],
      properties: {
        interpretive_movement: { type: "string", enum: ["applicable", "not_applicable"] },
        reason: { type: "string" }
      }
    },
    defects: {
      type: "array",
      items: {
        type: "object", additionalProperties: false,
        required: ["id", "category", "location", "sentence_index", "scope_start", "scope_end", "quote", "evidence", "evidence_ids", "instruction"],
        properties: {
          id: { type: "string" },
          category: { type: "string", enum: [...REPORT_DEFECT_CATEGORIES] },
          location: { type: "string" },
          sentence_index: { type: "integer", minimum: 0 },
          scope_start: { type: "integer", minimum: 0 },
          scope_end: { type: "integer", minimum: 0 },
          quote: { type: "string" },
          evidence: { type: "string" },
          evidence_ids: { type: "array", items: { type: "string" } },
          instruction: { type: "string" }
        }
      }
    }
  }
};

function recomputeJudge(value, fixture, threshold) {
  const movementApplicable = fixture.substantiveParagraphIndices.length >= 2;
  const applicable = categories.filter((category) => category !== "interpretive_movement" || movementApplicable);
  for (const category of applicable) {
    if (typeof value.scores[category] !== "number") throw new Error(`${fixture.id}.${category} did not receive a numeric score.`);
  }
  const overall = applicable.reduce((sum, category) => sum + value.scores[category], 0) / (4 * applicable.length);
  const gatesPassed = applicable.filter((category) => hardGates.has(category)).every((category) => value.scores[category] >= 3);
  return {
    ...value,
    applicability: {
      interpretive_movement: movementApplicable ? "applicable" : "not_applicable",
      reason: movementApplicable
        ? "The fixture contains at least two substantive prose paragraphs."
        : "The fixture contains fewer than two substantive prose paragraphs."
    },
    overall,
    verdict: overall >= threshold && gatesPassed ? "pass" : "below_threshold",
    modelReported: { overall: value.overall, verdict: value.verdict, applicability: value.applicability }
  };
}

function judgePrompt(fixture, unit) {
  const indexedUnit = numberedCompleteUnit(manifest, unit);
  return [
    judgeText,
    `DOMAIN_CANONICAL_PROMPT\n${JSON.stringify(canonicalPrompt(fixture))}`,
    `LIVED_PROSE_STANDARD\n${livedProseText}`,
    `COMPLETE_UNIT_PARAGRAPH_INDEX_CONVENTION\n${manifest.completeUnitParagraphIndexing.instruction}\nEvery finding location must include the exact supplied token ${manifest.completeUnitParagraphIndexing.marker}.`,
    `COMPLETE_UNIT\n${indexedUnit}`,
    `UNIT_FACTS\n${JSON.stringify(scopedFacts(fixture))}`,
    `OWNER_COMPARISON_SET\n${JSON.stringify(comparisonSet(fixture))}`,
    `TARGET_FUNCTIONS\n${JSON.stringify(fixture.targetFunctions)}`,
    `LABELED_NEGATIVE_EXAMPLES\n${JSON.stringify(labeledNegativeExamples)}`,
    `VALIDATOR_RESULTS\n${JSON.stringify({ calibrationOnly: true, factLockPassed: true, deterministicIssues: [] })}`,
    "Return the v3 judge output contract as JSON. Do not write or revise prose."
  ].join("\n\n");
}

function critiquePrompt(fixture, unit) {
  const indexedUnit = numberedCompleteUnit(manifest, unit);
  return [
    critiqueText,
    `DOMAIN_CANONICAL_PROMPT\n${JSON.stringify(canonicalPrompt(fixture))}`,
    `LIVED_PROSE_STANDARD\n${livedProseText}`,
    `COMPLETE_UNIT_PARAGRAPH_INDEX_CONVENTION\n${manifest.completeUnitParagraphIndexing.instruction}\nEvery defect location must include the exact supplied token ${manifest.completeUnitParagraphIndexing.marker}.`,
    `COMPLETE_UNIT\n${indexedUnit}`,
    `UNIT_FACTS\n${JSON.stringify(scopedFacts(fixture))}`,
    `OWNER_COMPARISON_SET\n${JSON.stringify(comparisonSet(fixture))}`,
    `TARGET_FUNCTIONS\n${JSON.stringify(fixture.targetFunctions)}`,
    `LABELED_NEGATIVE_EXAMPLES\n${JSON.stringify(labeledNegativeExamples)}`,
    `VALIDATOR_RESULTS\n${JSON.stringify({ calibrationOnly: true, factLockPassed: true, deterministicIssues: [] })}`,
    "Return the v3 critique output contract as JSON. Name defects only; do not write replacement prose."
  ].join("\n\n");
}

delete process.env.REPORT_FALLBACK_PROVIDER;
delete process.env.REPORT_FALLBACK_MODEL;
if (process.env.REPORT_JUDGE_V3_RUN_AUTHORIZATION !== "owner-authorized-run-2") {
  throw new Error("Calibration run two is not authorized. Record separate owner authorization before setting REPORT_JUDGE_V3_RUN_AUTHORIZATION=owner-authorized-run-2.");
}
const completedRunTwoArtifact = "artifacts/report-judge-calibration/2026-08-09T22-43-04.385Z-report-judge-v3.json";
if (fs.existsSync(completedRunTwoArtifact)) {
  throw new Error("Calibration run two authorization has already been consumed. A future run requires a new version and fresh owner authorization.");
}
const target = judgeModelTarget();
if (target.provider !== "openai") throw new Error(`The authorized run is for OpenAI, but REPORT_JUDGE_PROVIDER resolved to ${target.provider}.`);
if (!/^sk-/u.test(process.env.OPENAI_API_KEY ?? "")) throw new Error("The production OpenAI credential is not locally available.");

const threshold = 0.9;
const runAt = new Date().toISOString();
const outputPath = process.env.REPORT_JUDGE_V3_OUTPUT
  ? path.resolve(process.env.REPORT_JUDGE_V3_OUTPUT)
  : path.resolve("artifacts/report-judge-calibration", `${runAt.replaceAll(":", "-")}-report-judge-v3.json`);
const rows = [];
const failures = [];
const artifactBase = {
  version: "report-judge-v3-calibration-v2",
  runAt,
  authorization: {
    approvedDocuments: ["report-judge-rubric-v3.3", "report-critique-checklist-v6"],
    threshold,
    requestedCalls: 9,
    judgeCalls: 8,
    critiqueCalls: 1,
    retriesAuthorized: 0
  },
  inputs: {
    manifest: { sourcePath: manifestPath, sha256: sha256(manifestText) },
    judge: { sourcePaths: activeJudgePrompt.sourcePaths, sha256: sha256(judgeText) },
    critique: { sourcePaths: activeCritiquePrompt.sourcePaths, sha256: sha256(critiqueText) },
    livedProse: { sourcePath: livedProsePath, sha256: sha256(livedProseText) }
  },
  provider: target.provider,
  model: target.model
};

function writeArtifact(status, extra = {}) {
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, `${JSON.stringify({
    ...artifactBase,
    status,
    completedCalls: rows.length,
    rows,
    failures,
    ...extra
  }, null, 2)}\n`);
}

writeArtifact("running");
try {
  for (const fixture of manifest.pairs) {
    const positive = extractUnit(fixture);
    const negative = negativeUnit(fixture, positive);
    for (const [variant, unit] of [["positive", positive], ["negative", negative]]) {
      const response = await callReportCalibrationModel({
        ...target,
        prompt: judgePrompt(fixture, unit),
        schemaName: "report_judge_v3_calibration",
        schema: judgeSchema
      });
      rows.push({
        call: rows.length + 1,
        type: "judge",
        fixtureId: fixture.id,
        variant,
        targetDimension: fixture.dimension,
        result: recomputeJudge(response.value, fixture, threshold),
        model: response.model,
        responseId: response.responseId,
        usage: response.usage
      });
      writeArtifact("running");
    }
  }

  const findingFixture = manifest.findingLevelFixtures[0];
  const positive = extractUnit(findingFixture);
  const unit = negativeUnit(findingFixture, positive);
  const response = await callReportCalibrationModel({
    ...target,
    prompt: critiquePrompt(findingFixture, unit),
    schemaName: "report_critique_v3_calibration",
    schema: critiqueSchema
  });
  rows.push({
    call: rows.length + 1,
    type: "critique",
    fixtureId: findingFixture.id,
    variant: "single_aphorism_negative",
    result: response.value,
    model: response.model,
    responseId: response.responseId,
    usage: response.usage
  });

  for (const fixture of manifest.pairs) {
    const positiveRow = rows.find((row) => row.fixtureId === fixture.id && row.variant === "positive");
    const negativeRow = rows.find((row) => row.fixtureId === fixture.id && row.variant === "negative");
    for (const [category, minimum] of Object.entries(fixture.expected.positiveMinimum)) {
      if (positiveRow.result.scores[category] < minimum) failures.push(`${fixture.id}.positive.${category}=${positiveRow.result.scores[category]} expected >=${minimum}`);
    }
    for (const [category, maximum] of Object.entries(fixture.expected.negativeMaximum)) {
      if (negativeRow.result.scores[category] > maximum) failures.push(`${fixture.id}.negative.${category}=${negativeRow.result.scores[category]} expected <=${maximum}`);
    }
    for (const [category, delta] of Object.entries(fixture.expected.minimumPairDelta)) {
      const actual = positiveRow.result.scores[category] - negativeRow.result.scores[category];
      if (actual < delta) failures.push(`${fixture.id}.${category}.delta=${actual} expected >=${delta}`);
    }
  }
  const critiqueRow = rows.at(-1);
  const required = manifest.findingLevelFixtures[0].expected;
  const requiredDefect = critiqueRow.result.defects.find((defect) => defect.category === required.requiredFindingCategory);
  if (!requiredDefect) failures.push(`${critiqueRow.fixtureId} missing ${required.requiredFindingCategory}`);
  const requiredLocationToken = paragraphLocationToken(manifest, required.requiredParagraphIndex);
  if (requiredDefect && !requiredDefect.location.includes(requiredLocationToken)) {
    failures.push(`${critiqueRow.fixtureId} finding location '${requiredDefect.location}' does not copy supplied token ${requiredLocationToken}`);
  }
  writeArtifact(failures.length ? "category_failure" : "passed");
} catch (error) {
  const safeMessage = /api key|credential|authorization/iu.test(error instanceof Error ? error.message : String(error))
    ? "The configured production provider credential was rejected."
    : (error instanceof Error ? error.message : String(error));
  writeArtifact("provider_or_contract_error", { error: safeMessage });
  console.error(`Calibration artifact: ${outputPath}`);
  throw new Error(safeMessage);
}

console.table(rows.map((row) => row.type === "judge" ? {
  call: row.call,
  fixture: row.fixtureId,
  variant: row.variant,
  target: row.targetDimension,
  targetScore: row.result.scores[row.targetDimension],
  overall: row.result.overall.toFixed(3),
  verdict: row.result.verdict
} : {
  call: row.call,
  fixture: row.fixtureId,
  variant: row.variant,
  target: "owner_voice_drift",
  targetScore: row.result.defects.some((defect) => defect.category === "owner_voice_drift") ? "found" : "missing",
  overall: "n/a",
  verdict: row.result.result
}));
console.log(`Calibration artifact: ${outputPath}`);
if (failures.length) throw new Error(`V3 calibration category contracts failed:\n${failures.join("\n")}`);
console.log("V3 live calibration passed: exactly eight judge calls and one critique call; no retries.");
