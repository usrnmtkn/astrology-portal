#!/usr/bin/env node

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { assembleReportGenerationPayload } from "../api/_lib/report-generation.ts";
import { judgeModelTarget } from "../api/_lib/report-model-client.ts";
import {
  REPORT_JUDGE_CATEGORIES,
  REPORT_JUDGE_HARD_GATE_CATEGORIES,
  judgeReportUnit,
  reportJudgeVerdict
} from "../api/_lib/report-judge.ts";
import { REPORT_DEFECT_CATEGORIES } from "../api/_lib/report-writer-chain.ts";

const fixturePath = new URL("./fixtures/report-judge-personal-health-regressions.json", import.meta.url);
const factsPath = new URL("./fixtures/marie-report-frozen-facts.json", import.meta.url);
const fixture = JSON.parse(fs.readFileSync(fixturePath, "utf8"));
const live = process.argv.includes("--live");
const judgeCategories = new Set(REPORT_JUDGE_CATEGORIES);
const hardGateCategories = new Set(REPORT_JUDGE_HARD_GATE_CATEGORIES);
const critiqueCategories = new Set(REPORT_DEFECT_CATEGORIES);

assert.equal(fixture.status, "needs_review");
assert.match(fixture.purpose, /do not promote/iu);
assert.equal(fixture.cases.length, 7);
assert.equal(new Set(fixture.cases.map((item) => item.id)).size, fixture.cases.length);

for (const item of fixture.cases) {
  assert.ok(item.text.trim());
  assert.ok(["flat", "successful"].includes(item.comparisonGroup));
  for (const category of item.critiqueExpected) assert.ok(critiqueCategories.has(category), `${item.id} has an unknown critique category: ${category}`);
  for (const [bound, scores] of Object.entries(item.judgeExpected)) {
    assert.ok(["minimum", "maximum"].includes(bound));
    for (const [category, score] of Object.entries(scores)) {
      assert.ok(judgeCategories.has(category), `${item.id} has an unknown judge category: ${category}`);
      assert.ok(Number.isInteger(score) && score >= 0 && score <= 4);
      if (bound === "maximum" && hardGateCategories.has(category) && score < 3) {
        const otherwisePassing = Object.fromEntries(REPORT_JUDGE_CATEGORIES.map((name) => [name, 4]));
        assert.equal(reportJudgeVerdict({ ...otherwisePassing, [category]: score }, 1, 0.9), "below_threshold");
      }
    }
  }
}

const concreteNounFixture = fixture.cases.find((item) => item.id === "concrete_noun_manifestation_list");
assert.ok(concreteNounFixture.text.split(",").length >= 4);
assert.ok(concreteNounFixture.judgeExpected.maximum.lived_experience <= 2);
const interpretiveFixture = fixture.cases.find((item) => item.id === "transit_keyword_interpretive_gap");
assert.ok(interpretiveFixture.text.includes("Uranus squares your Sun"));
assert.ok(interpretiveFixture.judgeExpected.maximum.interpretive_movement <= 2);

if (!live) {
  console.log(`Personal & Health judge regression contract passed: ${fixture.cases.length} calibration-only fixtures; no provider calls.`);
  process.exit(0);
}

const governanceDocuments = [
  "tldr-astro-phrasebank/TLDR-REPORT-JUDGE-RUBRIC-OWNER.md",
  "tldr-astro-phrasebank/TLDR-REPORT-CRITIQUE-CHECKLIST-OWNER.md"
];
for (const sourcePath of governanceDocuments) {
  const text = fs.readFileSync(sourcePath, "utf8");
  if (!/^\*\*Status:\*\* `owner_approved`$/mu.test(text)) {
    throw new Error(`Live calibration requires explicit owner approval recorded in ${sourcePath}.`);
  }
}

const productionTarget = judgeModelTarget();
if (productionTarget.provider === "openai" && !/^sk-/u.test(process.env.OPENAI_API_KEY ?? "")) {
  throw new Error("Live calibration requires a locally available OpenAI API key; Vercel Sensitive placeholders are not credentials.");
}
if (["anthropic", "claude"].includes(productionTarget.provider) && !/^sk-ant-/u.test(process.env.ANTHROPIC_API_KEY ?? "")) {
  throw new Error("Live calibration requires a locally available Anthropic API key; Vercel Sensitive placeholders are not credentials.");
}

console.log(`LIVE CALIBRATION: ${fixture.cases.length} billed judge calls will run.`);
const runAt = new Date().toISOString();
const threshold = Number(process.env.REPORT_JUDGE_THRESHOLD ?? 0.9);
const datedName = `${runAt.replaceAll(":", "-").replace(/\.\d{3}Z$/u, "Z")}-${fixture.version}.json`;
const outputPath = process.env.REPORT_JUDGE_PERSONAL_HEALTH_OUTPUT
  ? path.resolve(process.env.REPORT_JUDGE_PERSONAL_HEALTH_OUTPUT)
  : path.resolve("artifacts/report-judge-calibration", datedName);
fs.mkdirSync(path.dirname(outputPath), { recursive: true });
const frozenFacts = JSON.parse(fs.readFileSync(factsPath, "utf8"));
const payload = assembleReportGenerationPayload({
  reportId: "00000000-0000-0000-0000-000000000129",
  reportDomain: "general",
  reportHorizon: "12_months",
  unitId: "spring",
  frozenFacts
});
const rows = [];

function writeArtifact(status, extra = {}) {
  fs.writeFileSync(outputPath, `${JSON.stringify({
    version: fixture.version,
    fixtureStatus: fixture.status,
    runAt,
    status,
    requestedCallCount: fixture.cases.length,
    completedCallCount: rows.length,
    threshold,
    governanceDocuments,
    rows,
    ...extra
  }, null, 2)}\n`);
}

writeArtifact("running");
try {
  for (const item of fixture.cases) {
    const judged = await judgeReportUnit({
      payload,
      draft: { body: item.text, sections: [] },
      validatorResults: { calibrationOnly: true, deterministicIssues: [] },
      threshold
    });
    rows.push({
      id: item.id,
      scores: judged.result.scores,
      verdict: judged.result.verdict,
      findings: judged.result.findings,
      model: judged.model,
      promptVersion: judged.promptVersion,
      usage: judged.usage
    });
    writeArtifact("running");
  }
} catch (error) {
  const providerError = error instanceof Error ? error.message : String(error);
  const sanitizedError = /api key|credential/iu.test(providerError)
    ? "The configured production provider credential was rejected."
    : "The production provider call failed before calibration completed.";
  writeArtifact("provider_error", { error: sanitizedError });
  console.error(`Calibration artifact: ${outputPath}`);
  throw new Error(sanitizedError);
}

const failures = [];
for (const item of fixture.cases) {
  const row = rows.find((candidate) => candidate.id === item.id);
  for (const [category, minimum] of Object.entries(item.judgeExpected.minimum ?? {})) {
    if (row.scores[category] < minimum) failures.push(`${item.id}.${category}=${row.scores[category]} expected >= ${minimum}`);
  }
  for (const [category, maximum] of Object.entries(item.judgeExpected.maximum ?? {})) {
    if (row.scores[category] > maximum) failures.push(`${item.id}.${category}=${row.scores[category]} expected <= ${maximum}`);
  }
}

for (const category of ["lived_experience", "owner_voice"]) {
  const successful = rows.filter((row) => fixture.cases.find((item) => item.id === row.id).comparisonGroup === "successful");
  const flat = rows.filter((row) => fixture.cases.find((item) => item.id === row.id).comparisonGroup === "flat" && fixture.cases.find((item) => item.id === row.id).judgeExpected.maximum?.[category] !== undefined);
  const successfulAverage = successful.reduce((sum, row) => sum + row.scores[category], 0) / successful.length;
  const flatAverage = flat.reduce((sum, row) => sum + row.scores[category], 0) / flat.length;
  if (successfulAverage - flatAverage < fixture.minimumSuccessfulSeparation) {
    failures.push(`${category} separation=${(successfulAverage - flatAverage).toFixed(2)} expected >= ${fixture.minimumSuccessfulSeparation}`);
  }
}

console.table(rows.map((row) => ({ fixture: row.id, verdict: row.verdict, ...row.scores })));
writeArtifact(failures.length ? "category_failure" : "passed", { failures });
console.log(`Calibration artifact: ${outputPath}`);
if (failures.length) throw new Error(`Personal & Health judge calibration failed:\n${failures.join("\n")}`);
console.log(`Personal & Health live judge calibration passed: ${fixture.cases.length} fixtures.`);
