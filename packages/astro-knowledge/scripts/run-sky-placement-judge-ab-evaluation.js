#!/usr/bin/env node
"use strict";

const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const { buildJudgePrompt, parseVerdict, TIER_OF } = require("./judge-placement-voice.js");
const { goldExemplars, knownWeak } = require("./test-placement-judge-calibration.js");
const { assertLiveJudgeAuthorized, sha256 } = require("./editorial-judge-runtime.js");
const { judgeConfig } = require("./generate-sky-aspect-cards.js");

const root = path.join(__dirname, "..");
const manifestPath = path.join(root, "config", "sky-placement-judge-ab-evaluation-v1.json");
const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
const defaultOutDir = path.join(root, "out", "sky-placement-judge-ab-v1");

function parseArgs(argv = process.argv.slice(2)) {
  const options = { plan: false, authorizeLive: false, outDir: defaultOutDir };
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === "--plan") options.plan = true;
    else if (token === "--authorize-live") options.authorizeLive = true;
    else if (token === "--out") {
      if (!argv[index + 1]) throw new Error("--out requires a directory.");
      options.outDir = path.resolve(argv[++index]);
    } else throw new Error(`Unknown argument '${token}'.`);
  }
  if (options.plan && options.authorizeLive) throw new Error("Choose --plan or --authorize-live, not both.");
  return options;
}

function articleOf(value) {
  return {
    ...(value.tagline ? { tagline: value.tagline } : {}),
    hook: value.hook,
    lived: value.lived,
    turn: value.turn,
    ...(Array.isArray(value.moves) ? { moves: value.moves } : {})
  };
}

function buildFixtures() {
  const approved = goldExemplars.map((entry, index) => ({
    caseId: `case-${String(index + 1).padStart(3, "0")}`,
    expectedClass: "approved",
    sourceId: entry.sourceId,
    planet: entry.planet,
    sign: entry.sign,
    tier: entry.tier || TIER_OF[entry.planet] || "luminary",
    article: articleOf(entry)
  }));
  const weak = knownWeak.map((entry, index) => ({
    caseId: `case-${String(approved.length + index + 1).padStart(3, "0")}`,
    expectedClass: "known-weak",
    sourceId: entry.label,
    planet: entry.planet,
    sign: entry.sign,
    tier: TIER_OF[entry.planet] || "luminary",
    article: articleOf(entry)
  }));
  return [...approved, ...weak];
}

function openAiOutputText(payload) {
  if (typeof payload.output_text === "string") return payload.output_text;
  return (payload.output || [])
    .flatMap((item) => item.content || [])
    .map((content) => content.text)
    .filter(Boolean)
    .join("\n");
}

function normalizeUsage(payload) {
  const usage = payload.usage || {};
  const inputDetails = usage.input_tokens_details || {};
  const outputDetails = usage.output_tokens_details || {};
  return {
    inputTokens: Number(usage.input_tokens || 0),
    cachedInputTokens: Number(inputDetails.cached_tokens || 0),
    cacheWriteTokens: Number(inputDetails.cache_write_tokens || 0),
    outputTokens: Number(usage.output_tokens || 0),
    reasoningTokens: Number(outputDetails.reasoning_tokens || 0),
    totalTokens: Number(usage.total_tokens || 0)
  };
}

function estimateCost(model, usage, pricing = manifest.pricing) {
  const context = usage.inputTokens > pricing.shortContextMaximumInputTokens
    ? pricing.longContext
    : pricing.shortContext;
  const rates = context[model];
  if (!rates) throw new Error(`No pricing configured for ${model}.`);
  const uncachedInputTokens = Math.max(
    0,
    usage.inputTokens - usage.cachedInputTokens - usage.cacheWriteTokens
  );
  return (
    uncachedInputTokens * rates.input
    + usage.cachedInputTokens * rates.cachedInput
    + usage.cacheWriteTokens * rates.cacheWrite
    + usage.outputTokens * rates.output
  ) / 1_000_000;
}

async function defaultRequest({ treatment, prompt, apiKey }) {
  const startedAt = Date.now();
  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      authorization: `Bearer ${apiKey}`,
      "content-type": "application/json"
    },
    body: JSON.stringify({
      model: treatment.model,
      input: prompt,
      reasoning: { effort: treatment.reasoningEffort },
      max_output_tokens: 1500
    })
  });
  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload.error?.message || `OpenAI request failed with ${response.status}.`);
  }
  return { payload, latencyMs: Date.now() - startedAt };
}

function normalizeResult({ treatmentKey, treatment, fixture, prompt, response }) {
  const raw = openAiOutputText(response.payload);
  if (!raw) throw new Error(`${treatment.model} returned no judge text for ${fixture.caseId}.`);
  const verdict = parseVerdict(raw);
  if (![1, 2, 3].includes(Number(verdict.score))) {
    throw new Error(`${treatment.model} returned an invalid score for ${fixture.caseId}.`);
  }
  const usage = normalizeUsage(response.payload);
  return {
    caseId: fixture.caseId,
    treatmentKey,
    responseModel: response.payload.model || treatment.model,
    reasoningEffort: treatment.reasoningEffort,
    promptSha256: sha256(prompt),
    latencyMs: response.latencyMs,
    usage,
    estimatedCostUsd: estimateCost(treatment.model, usage),
    verdict: {
      score: Number(verdict.score),
      verdict: verdict.verdict || "",
      weakest: verdict.weakest || "",
      why: verdict.why || ""
    },
    rawOutput: raw
  };
}

function automaticSummary(fixtures, results, treatmentKey) {
  const relevant = results.filter((result) => result.treatmentKey === treatmentKey);
  let approvedFalsePositives = 0;
  let weakMisses = 0;
  let approvedScoreTotal = 0;
  let weakScoreTotal = 0;
  let approvedCount = 0;
  let weakCount = 0;
  for (const result of relevant) {
    const fixture = fixtures.find((item) => item.caseId === result.caseId);
    if (fixture.expectedClass === "approved") {
      approvedCount += 1;
      approvedScoreTotal += result.verdict.score;
      if (result.verdict.score < 3) approvedFalsePositives += 1;
    } else {
      weakCount += 1;
      weakScoreTotal += result.verdict.score;
      if (result.verdict.score === 3) weakMisses += 1;
    }
  }
  const approvedMean = approvedScoreTotal / approvedCount;
  const weakMean = weakScoreTotal / weakCount;
  return {
    sampleCount: relevant.length,
    approvedMean,
    weakMean,
    separation: approvedMean - weakMean,
    approvedFalsePositives,
    weakMisses,
    totalLatencyMs: relevant.reduce((sum, result) => sum + result.latencyMs, 0),
    totalInputTokens: relevant.reduce((sum, result) => sum + result.usage.inputTokens, 0),
    totalOutputTokens: relevant.reduce((sum, result) => sum + result.usage.outputTokens, 0),
    estimatedCostUsd: relevant.reduce((sum, result) => sum + result.estimatedCostUsd, 0)
  };
}

function chooseBlindMapping(seed = crypto.randomBytes(16).toString("hex")) {
  const baselineIsA = Number.parseInt(sha256(seed).slice(0, 2), 16) % 2 === 0;
  return baselineIsA
    ? { A: "baseline", B: "candidate" }
    : { A: "candidate", B: "baseline" };
}

function renderArticle(article) {
  return [
    article.tagline ? `TAGLINE: ${article.tagline}` : "",
    `HOOK: ${article.hook}`,
    `LIVED: ${article.lived}`,
    `TURN: ${article.turn}`,
    Array.isArray(article.moves) ? `MOVES: ${article.moves.join(" / ")}` : ""
  ].filter(Boolean).join("\n");
}

function buildBlindArtifacts({ fixtures, results, blindMapping, runId }) {
  const labelForTreatment = Object.fromEntries(
    Object.entries(blindMapping).map(([label, treatmentKey]) => [treatmentKey, label])
  );
  const resultFor = (caseId, label) => results.find(
    (result) => result.caseId === caseId && labelForTreatment[result.treatmentKey] === label
  );
  const markdown = [
    "# Blinded Sky Placement judge review",
    "",
    `Run: ${runId}`,
    "",
    "Read the draft first, then each review. Score the review—not its length or confidence. Prefer the review that catches real voice failures, preserves strong lines, and stops before unnecessary rewriting.",
    "",
    "Use the companion scorecard for Natural English, astrological scope, owner voice, editorial restraint, rule enforcement, false positives, and unnecessary rewrites.",
    ""
  ];
  const scorecard = {
    schemaVersion: 1,
    runId,
    status: "awaiting-owner-review",
    instructions: "Score each anonymous review independently before opening the model key.",
    cases: []
  };
  for (const fixture of fixtures) {
    markdown.push(`## ${fixture.caseId}`, "", "### Draft", "", renderArticle(fixture.article), "");
    const caseScores = { caseId: fixture.caseId, reviews: {} };
    for (const label of ["A", "B"]) {
      const result = resultFor(fixture.caseId, label);
      markdown.push(
        `### Review ${label}`,
        "",
        `Score: ${result.verdict.score}`,
        "",
        `Verdict: ${result.verdict.verdict}`,
        "",
        `Weakest line: ${result.verdict.weakest || "(none identified)"}`,
        "",
        `Reason: ${result.verdict.why || "(none supplied)"}`,
        ""
      );
      caseScores.reviews[label] = {
        naturalEnglish: null,
        astrologyScope: null,
        ownerVoice: null,
        editorialRestraint: null,
        ruleEnforcement: null,
        unnecessaryRewrite: null,
        falsePositive: null,
        preferred: null,
        notes: ""
      };
    }
    scorecard.cases.push(caseScores);
  }
  return { markdown: `${markdown.join("\n")}\n`, scorecard };
}

function atomicWrite(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  const temporaryPath = `${filePath}.${process.pid}.tmp`;
  fs.writeFileSync(temporaryPath, value, "utf8");
  fs.renameSync(temporaryPath, filePath);
}

async function runEvaluation({ requestFn = defaultRequest, apiKey, outDir = defaultOutDir, blindSeed, now = () => new Date() } = {}) {
  const fixtures = buildFixtures();
  const treatments = manifest.treatments;
  const runId = `sky-placement-blind-${now().toISOString().replace(/[:.]/g, "-")}`;
  const results = [];
  for (const fixture of fixtures) {
    const prompt = buildJudgePrompt(fixture.article, fixture);
    const pair = await Promise.all(Object.entries(treatments).map(async ([treatmentKey, treatment]) => {
      const response = await requestFn({ treatmentKey, treatment, fixture, prompt, apiKey });
      return normalizeResult({ treatmentKey, treatment, fixture, prompt, response });
    }));
    results.push(...pair);
  }
  const blindMapping = chooseBlindMapping(blindSeed || runId);
  const blind = buildBlindArtifacts({ fixtures, results, blindMapping, runId });
  const internal = {
    schemaVersion: 1,
    reportKind: "candidate-evaluation",
    evaluationId: manifest.evaluationId,
    runId,
    recordedAt: now().toISOString(),
    promotionAuthorized: false,
    promotionEligible: false,
    ownerReviewStatus: "pending",
    runtimeChanged: false,
    samplesPerFixture: manifest.samplesPerFixture,
    fixtureCount: fixtures.length,
    requestCount: results.length,
    fixtureManifest: fixtures.map(({ article, ...fixture }) => ({ ...fixture, articleSha256: sha256(JSON.stringify(article)) })),
    treatments: {
      baseline: automaticSummary(fixtures, results, "baseline"),
      candidate: automaticSummary(fixtures, results, "candidate")
    },
    results
  };
  const modelKey = {
    schemaVersion: 1,
    runId,
    warning: "Keep sealed until blinded owner scoring is complete.",
    mapping: Object.fromEntries(Object.entries(blindMapping).map(([label, treatmentKey]) => [label, {
      treatmentKey,
      model: treatments[treatmentKey].model,
      reasoningEffort: treatments[treatmentKey].reasoningEffort
    }]))
  };
  atomicWrite(path.join(outDir, "blind-owner-review.md"), blind.markdown);
  atomicWrite(path.join(outDir, "blind-owner-scorecard.json"), `${JSON.stringify(blind.scorecard, null, 2)}\n`);
  atomicWrite(path.join(outDir, "internal-results.json"), `${JSON.stringify(internal, null, 2)}\n`);
  atomicWrite(path.join(outDir, "model-key.json"), `${JSON.stringify(modelKey, null, 2)}\n`);
  return { fixtures, results, internal, modelKey, blind, outDir };
}

function printPlan() {
  const fixtures = buildFixtures();
  console.log(JSON.stringify({
    evaluationId: manifest.evaluationId,
    activeRuntime: manifest.runtime.activeReleaseId,
    runtimeChanged: false,
    fixtureCount: fixtures.length,
    approvedFixtures: fixtures.filter((fixture) => fixture.expectedClass === "approved").length,
    knownWeakFixtures: fixtures.filter((fixture) => fixture.expectedClass === "known-weak").length,
    treatments: manifest.treatments,
    requestCount: fixtures.length * Object.keys(manifest.treatments).length,
    samplesPerFixture: manifest.samplesPerFixture,
    promotionEligible: false,
    excludedExperiments: manifest.excludedExperiments
  }, null, 2));
}

async function main() {
  const options = parseArgs();
  if (!options.authorizeLive) {
    printPlan();
    return;
  }
  assertLiveJudgeAuthorized({ calibration: true });
  const config = judgeConfig("sky-placement");
  if (!config.apiKey) throw new Error("OPENAI_API_KEY is not configured.");
  const result = await runEvaluation({ apiKey: config.apiKey, outDir: options.outDir });
  const cost = Object.values(result.internal.treatments).reduce((sum, item) => sum + item.estimatedCostUsd, 0);
  console.log(`Completed ${result.internal.requestCount} blinded evaluation calls.`);
  console.log(`Combined estimated cost: $${cost.toFixed(4)}.`);
  console.log(`Owner packet: ${path.join(options.outDir, "blind-owner-review.md")}`);
  console.log("The model key remains separate until owner scoring is complete.");
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}

module.exports = {
  buildBlindArtifacts,
  buildFixtures,
  chooseBlindMapping,
  estimateCost,
  manifest,
  normalizeUsage,
  parseArgs,
  runEvaluation
};
