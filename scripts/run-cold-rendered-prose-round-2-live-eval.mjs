#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { createRequire } from "node:module";
import { COLD_REVIEW_SCHEMA } from "../src/astro-writing/index.mjs";
import openAIResponses from "../src/astro-writing/openAIResponses.cjs";

const require = createRequire(import.meta.url);
const { loadLocalEnv } = require("../packages/astro-knowledge/scripts/daily-glance-writer-runtime.js");
const { callOpenAIResponses } = openAIResponses;
const repoRoot = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const reviewRoot = path.join(repoRoot, "packages/astro-knowledge/review/cold-rendered-prose-governance-v1");
const runPath = path.join(reviewRoot, "round-2-live-eval.json");
const summaryPath = path.join(reviewRoot, "round-2-summary.md");
const readJsonl = (filePath) => fs.readFileSync(filePath, "utf8").trim().split("\n").filter(Boolean).map(JSON.parse);
const outputText = (payload) => payload.output_text ?? (payload.output ?? []).flatMap((item) => item.content ?? []).map((item) => item.text).filter(Boolean).join("\n");
const usage = { input_tokens: 0, output_tokens: 0, total_tokens: 0, reasoning_tokens: 0, cached_input_tokens: 0 };
const addUsage = (value = {}) => {
  usage.input_tokens += value.input_tokens ?? 0;
  usage.output_tokens += value.output_tokens ?? 0;
  usage.total_tokens += value.total_tokens ?? 0;
  usage.reasoning_tokens += value.output_tokens_details?.reasoning_tokens ?? 0;
  usage.cached_input_tokens += value.input_tokens_details?.cached_tokens ?? 0;
};

if (!process.argv.includes("--authorize-live")) throw new Error("No billed call was made. Pass --authorize-live only after explicit owner authorization.");
loadLocalEnv();
if (!process.env.OPENAI_API_KEY) throw new Error("OPENAI_API_KEY is not configured.");
const fixtures = readJsonl(path.join(repoRoot, "data/writing/cold-rendered-prose-round-2-holdout.jsonl"));
const trainingBriefing = fs.readFileSync(path.join(reviewRoot, "round-2-reviewer-briefing.md"), "utf8");
if (fixtures.length !== 13) throw new Error("Round 2 requires 8 negative holdouts, 2 gold holdouts, and 3 probes.");
for (const fixture of fixtures) {
  if (trainingBriefing.includes(fixture.fixture_id) || trainingBriefing.includes(fixture.rendered_copy)) throw new Error(`HOLDOUT leakage detected for ${fixture.fixture_id}.`);
}
const model = process.env.OPENAI_REVIEW_MODEL ?? process.env.OPENAI_JUDGE_MODEL ?? "gpt-5.6-terra";
const reasoningEffort = process.env.OPENAI_REVIEW_REASONING_EFFORT ?? "high";
const results = [];
for (const fixture of fixtures) {
  const { response, payload } = await callOpenAIResponses({
    apiKey: process.env.OPENAI_API_KEY,
    role: "COLD_REVIEWER",
    taskInstructions: trainingBriefing,
    request: {
      model,
      input: JSON.stringify({ rendered_copy: fixture.rendered_copy }),
      reasoning: { effort: reasoningEffort },
      max_output_tokens: 3000,
      text: { format: { type: "json_schema", name: "tldr_astro_cold_rendered_prose_round_2", strict: true, schema: COLD_REVIEW_SCHEMA } }
    }
  });
  if (!response.ok) throw new Error(payload.error?.message ?? `OpenAI cold reviewer failed with ${response.status}.`);
  const text = outputText(payload);
  if (!text) throw new Error(`OpenAI cold reviewer returned no output for ${fixture.fixture_id}.`);
  const review = JSON.parse(text);
  const scored = fixture.expected !== null;
  const passed = !scored || (fixture.expected === "PASS"
    ? review.decision === "PASS" && review.cold_rendered_prose?.status === "PASS"
    : review.decision === "REVISE" && review.cold_rendered_prose?.status === "FAIL");
  addUsage(payload.usage);
  results.push({
    fixtureId: fixture.fixture_id,
    fixtureKind: fixture.fixture_kind,
    expected: fixture.expected,
    actualDecision: review.decision,
    actualStatus: review.cold_rendered_prose?.status ?? null,
    scored,
    passed,
    reason: review.cold_rendered_prose?.reason ?? null,
    violations: review.violations ?? [],
    renderedCopySha256: fixture.rendered_copy_sha256,
    provider: { responseId: payload.id ?? null, responseModel: payload.model ?? model, reasoningEffort: payload.reasoning?.effort ?? reasoningEffort, usage: payload.usage ?? null }
  });
  fs.writeFileSync(runPath, `${JSON.stringify({ schemaVersion: "cold-rendered-prose-round-2-live-eval-v1", status: "running", model, reasoningEffort, callCount: results.length, usage, results }, null, 2)}\n`);
  process.stdout.write(`${results.length}/13 ${fixture.fixture_id}: ${review.decision}${scored ? ` ${passed ? "CORRECT" : "MISMATCH"}` : " PROBE"}\n`);
}
const negativePassed = results.filter((row) => row.fixtureKind === "holdout-negative" && row.passed).length;
const goldPassed = results.filter((row) => row.fixtureKind === "holdout-gold" && row.passed).length;
const success = negativePassed === 8 && goldPassed === 2;
const report = {
  schemaVersion: "cold-rendered-prose-round-2-live-eval-v1",
  status: success ? "PASS" : "FAIL",
  acceptedFinalCalibrationResult: true,
  model,
  reasoningEffort,
  callCount: results.length,
  usage,
  train: { negativeExamples: 4, goldExamples: 2, holdoutTextIncluded: false },
  expected: { negativeRevise: 8, goldPass: 2, probes: 3 },
  actual: { negativeRevise: negativePassed, goldPass: goldPassed, probeVerdicts: Object.fromEntries(results.filter((row) => row.fixtureKind === "borderline-probe").map((row) => [row.fixtureId, row.actualDecision])) },
  governanceOutcome: success ? "trusted_blocking_candidate" : "permanently_advisory_only_owner_prose_gate",
  results
};
fs.writeFileSync(runPath, `${JSON.stringify(report, null, 2)}\n`);
fs.writeFileSync(summaryPath, [
  "# Cold rendered prose: final TRAIN/HOLDOUT calibration",
  "",
  `- Status: **${report.status}**`,
  `- Governance outcome: **${report.governanceOutcome}**`,
  `- Model: \`${model}\` at \`${reasoningEffort}\``,
  `- Calls: ${report.callCount}`,
  `- Tokens: ${usage.total_tokens} total (${usage.input_tokens} input, ${usage.output_tokens} output, ${usage.reasoning_tokens} reasoning; ${usage.cached_input_tokens} cached input)`,
  `- Negative holdouts: ${negativePassed}/8 correctly REVISE`,
  `- Gold holdouts: ${goldPassed}/2 correctly PASS`,
  "- TRAIN/HOLDOUT full-text leakage: none",
  "",
  "## Results",
  "",
  ...results.map((row) => `- \`${row.fixtureId}\`: ${row.actualDecision}${row.expected === null ? " (unscored probe)" : `; expected ${row.expected}; ${row.passed ? "correct" : "mismatch"}`}`),
  ""
].join("\n"));
console.log(JSON.stringify({ status: report.status, governanceOutcome: report.governanceOutcome, model, reasoningEffort, callCount: report.callCount, usage, actual: report.actual }, null, 2));
if (!success) process.exitCode = 1;
