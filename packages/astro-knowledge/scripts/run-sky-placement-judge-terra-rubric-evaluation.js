#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");
const { buildJudgePrompt } = require("./judge-placement-voice.js");
const { lintArticle } = require("./lint-placement-voice.js");
const { assertLiveJudgeAuthorized, sha256 } = require("./editorial-judge-runtime.js");
const { judgeConfig } = require("./generate-sky-aspect-cards.js");
const { buildTargetedFixtures } = require("./run-sky-placement-judge-targeted-evaluation.js");
const {
  atomicWrite,
  defaultRequest,
  normalizeResult,
  renderArticle,
  manifest: pricingManifest
} = require("./run-sky-placement-judge-ab-evaluation.js");

const root = path.join(__dirname, "..");
const manifest = JSON.parse(fs.readFileSync(
  path.join(root, "config", "sky-placement-judge-terra-rubric-evaluation-v4.json"),
  "utf8"
));
const evaluationManifest = { ...manifest, pricing: pricingManifest.pricing };
const defaultOutDir = path.join(root, "out", "sky-placement-judge-terra-rubric-v4");

function parseArgs(argv = process.argv.slice(2)) {
  const options = { authorizeLive: false, outDir: defaultOutDir };
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === "--plan") continue;
    if (token === "--authorize-live") options.authorizeLive = true;
    else if (token === "--out") {
      if (!argv[index + 1]) throw new Error("--out requires a directory.");
      options.outDir = path.resolve(argv[++index]);
    } else throw new Error(`Unknown argument '${token}'.`);
  }
  return options;
}

function verdictLabel(score) {
  return score === 3 ? "in-voice" : score === 2 ? "borderline" : "off-voice";
}

function applyDeterministicPolicy(fixture, modelVerdict) {
  const lint = lintArticle({
    ...fixture.article,
    planet: fixture.planet,
    sign: fixture.sign
  });
  const firstReadFailure = lint.findings.some((finding) => finding.source === "first-read-natural-english");
  const secondPersonFailure = lint.findings.some((finding) => finding.term === "second-person");
  let score = Number(modelVerdict.score);
  const appliedRules = [];
  if (firstReadFailure) {
    score = 1;
    appliedRules.push("first-read-natural-english-forces-score-1");
  }
  if (secondPersonFailure && score === 3) {
    score = 2;
    appliedRules.push("current-sky-second-person-caps-score-2");
  }
  return {
    score,
    verdict: verdictLabel(score),
    appliedRules,
    publicationGate: lint.fails ? "blocked" : "pass",
    lintScore: lint.score,
    lintFindings: lint.findings
  };
}

function summarize(results) {
  const total = (field) => results.reduce((sum, result) => sum + field(result), 0);
  return {
    calls: results.length,
    totalLatencyMs: total((result) => result.latencyMs),
    averageLatencyMs: results.length ? total((result) => result.latencyMs) / results.length : 0,
    totalInputTokens: total((result) => result.usage.inputTokens),
    totalOutputTokens: total((result) => result.usage.outputTokens),
    totalReasoningTokens: total((result) => result.usage.reasoningTokens),
    estimatedCostUsd: total((result) => result.estimatedCostUsd),
    estimatedCostPerCallUsd: results.length ? total((result) => result.estimatedCostUsd) / results.length : 0,
    expectedEffectiveMatches: results.filter((result) => result.effective.score === result.expectedEffectiveScore).length,
    changedFromPrevious: results.filter((result) => result.effective.score !== result.previousTerraScore).map((result) => result.caseId)
  };
}

function renderReport(run) {
  const lines = [
    "# Terra-low Sky Placement rubric rerun",
    "",
    `Run: ${run.runId}`,
    "",
    `Runtime changed: ${run.runtimeChanged ? "yes" : "no"}`,
    "",
    `Promotion authorized: ${run.promotionAuthorized ? "yes" : "no"}`,
    "",
    `Calls: ${run.summary.calls}`,
    "",
    `Estimated cost: $${run.summary.estimatedCostUsd.toFixed(6)}`,
    "",
    `Average latency: ${run.summary.averageLatencyMs.toFixed(2)} ms`,
    "",
    `Expected effective-score matches: ${run.summary.expectedEffectiveMatches}/${run.summary.calls}`,
    "",
    `Changed from the prior Terra run: ${run.summary.changedFromPrevious.join(", ") || "none"}`,
    ""
  ];
  for (const result of run.results) {
    lines.push(
      `## ${result.caseId}`,
      "",
      renderArticle(result.article),
      "",
      `Previous Terra score: ${result.previousTerraScore}`,
      "",
      `Terra model score: ${result.verdict.score} (${result.verdict.verdict})`,
      "",
      `Effective score after deterministic policy: ${result.effective.score} (${result.effective.verdict})`,
      "",
      `Publication gate: ${result.effective.publicationGate}`,
      "",
      `Applied deterministic rules: ${result.effective.appliedRules.join(", ") || "none"}`,
      "",
      `Weakest line: ${result.verdict.weakest || "(none identified)"}`,
      "",
      `Reason: ${result.verdict.why || "(none supplied)"}`,
      ""
    );
  }
  return `${lines.join("\n")}\n`;
}

async function runTerraEvaluation({
  requestFn = defaultRequest,
  apiKey,
  outDir = defaultOutDir,
  fixtures = buildTargetedFixtures(),
  now = () => new Date()
} = {}) {
  const treatment = evaluationManifest.treatment;
  const results = [];
  for (const fixture of fixtures) {
    const prompt = buildJudgePrompt(fixture.article, fixture);
    const response = await requestFn({ treatmentKey: "terra", treatment, fixture, prompt, apiKey });
    const normalized = normalizeResult({
      treatmentKey: "terra",
      treatment,
      fixture,
      prompt,
      response,
      pricing: evaluationManifest.pricing
    });
    results.push({
      ...normalized,
      article: fixture.article,
      expectedEffectiveScore: evaluationManifest.expectedEffectiveScores[fixture.caseId],
      previousTerraScore: evaluationManifest.previousTerraScores[fixture.caseId],
      effective: applyDeterministicPolicy(fixture, normalized.verdict)
    });
  }
  const recordedAt = now().toISOString();
  const run = {
    schemaVersion: 1,
    reportKind: "single-model-rubric-evaluation",
    evaluationId: evaluationManifest.evaluationId,
    runId: `sky-placement-terra-rubric-${recordedAt.replace(/[:.]/g, "-")}`,
    recordedAt,
    model: treatment.model,
    reasoningEffort: treatment.reasoningEffort,
    promptVersion: evaluationManifest.promptVersion,
    rubricVersion: evaluationManifest.rubricVersion,
    fixtureSetVersion: evaluationManifest.evaluationSetVersion,
    fixtureSetSha256: sha256(JSON.stringify(fixtures)),
    runtimeChanged: false,
    promotionAuthorized: false,
    promotionEligible: false,
    summary: summarize(results),
    results
  };
  atomicWrite(path.join(outDir, "terra-review.md"), renderReport(run));
  atomicWrite(path.join(outDir, "results.json"), `${JSON.stringify(run, null, 2)}\n`);
  return run;
}

function printPlan() {
  const fixtures = buildTargetedFixtures();
  console.log(JSON.stringify({
    evaluationId: evaluationManifest.evaluationId,
    actualActiveRuntime: evaluationManifest.runtime.activeReleaseId,
    treatment: evaluationManifest.treatment,
    runtimeChanged: false,
    fixtureCount: fixtures.length,
    requestCount: fixtures.length,
    expectedChangedCases: Object.keys(evaluationManifest.expectedEffectiveScores).filter(
      (caseId) => evaluationManifest.expectedEffectiveScores[caseId] !== evaluationManifest.previousTerraScores[caseId]
    ),
    promotionEligible: false
  }, null, 2));
}

async function main() {
  const options = parseArgs();
  if (!options.authorizeLive) {
    printPlan();
    return;
  }
  if (evaluationManifest.liveRerunAllowed === false) {
    throw new Error(`Evaluation ${evaluationManifest.evaluationId} is complete and may not be rerun.`);
  }
  assertLiveJudgeAuthorized({ calibration: true });
  const config = judgeConfig("sky-placement");
  if (!config.apiKey) throw new Error("OPENAI_API_KEY is not configured.");
  const run = await runTerraEvaluation({ apiKey: config.apiKey, outDir: options.outDir });
  console.log(`Completed ${run.summary.calls} Terra-low rubric calls.`);
  console.log(`Estimated cost: $${run.summary.estimatedCostUsd.toFixed(4)}.`);
  console.log(`Changed from the prior Terra run: ${run.summary.changedFromPrevious.join(", ") || "none"}.`);
  console.log(`Review: ${path.join(options.outDir, "terra-review.md")}`);
  console.log("The active runtime registry was not changed; no model was promoted.");
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}

module.exports = {
  applyDeterministicPolicy,
  evaluationManifest,
  parseArgs,
  renderReport,
  runTerraEvaluation,
  summarize
};
