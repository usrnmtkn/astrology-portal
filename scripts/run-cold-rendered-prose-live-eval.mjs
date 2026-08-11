#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { createRequire } from "node:module";
import {
  COLD_REVIEW_SCHEMA
} from "../src/astro-writing/index.mjs";
import openAIResponses from "../src/astro-writing/openAIResponses.cjs";

const require = createRequire(import.meta.url);
const { loadLocalEnv } = require("../packages/astro-knowledge/scripts/daily-glance-writer-runtime.js");
const { callOpenAIResponses } = openAIResponses;
const repoRoot = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const reviewRoot = path.join(repoRoot, "packages/astro-knowledge/review/cold-rendered-prose-governance-v1");
const runPath = path.join(reviewRoot, "live-eval.json");
const summaryPath = path.join(reviewRoot, "summary.md");

function readJsonl(filePath) {
  return fs.readFileSync(filePath, "utf8").trim().split("\n").filter(Boolean).map(JSON.parse);
}

function outputText(payload) {
  return payload.output_text ?? (payload.output ?? [])
    .flatMap((item) => item.content ?? [])
    .map((item) => item.text)
    .filter(Boolean)
    .join("\n");
}

function addUsage(total, usage = {}) {
  total.input_tokens += usage.input_tokens ?? 0;
  total.output_tokens += usage.output_tokens ?? 0;
  total.total_tokens += usage.total_tokens ?? 0;
  total.reasoning_tokens += usage.output_tokens_details?.reasoning_tokens ?? 0;
  total.cached_input_tokens += usage.input_tokens_details?.cached_tokens ?? 0;
}

if (!process.argv.includes("--authorize-live")) {
  throw new Error("No billed call was made. Pass --authorize-live only after explicit owner authorization.");
}
loadLocalEnv();
if (!process.env.OPENAI_API_KEY) throw new Error("OPENAI_API_KEY is not configured.");

const fixtures = readJsonl(path.join(repoRoot, "data/writing/cold-rendered-prose-fixtures.jsonl"));
if (fixtures.length !== 13) throw new Error("Cold-rendered-prose live eval requires 12 V7 negatives and 1 Sun-in-Leo V3 gold.");
const model = process.env.OPENAI_REVIEW_MODEL ?? process.env.OPENAI_JUDGE_MODEL ?? "gpt-5.6-terra";
const reasoningEffort = process.env.OPENAI_REVIEW_REASONING_EFFORT ?? "high";
if (!new Set(["high", "xhigh"]).has(reasoningEffort)) {
  throw new Error("Cold-rendered-prose calibration requires high or xhigh reasoning.");
}

fs.mkdirSync(reviewRoot, { recursive: true });
const results = [];
const usage = { input_tokens: 0, output_tokens: 0, total_tokens: 0, reasoning_tokens: 0, cached_input_tokens: 0 };
for (const fixture of fixtures) {
  const { response, payload } = await callOpenAIResponses({
    apiKey: process.env.OPENAI_API_KEY,
    role: "COLD_REVIEWER",
    request: {
      model,
      input: JSON.stringify({ rendered_copy: fixture.rendered_copy }, null, 2),
      reasoning: { effort: reasoningEffort },
      max_output_tokens: 3000,
      text: {
        format: {
          type: "json_schema",
          name: "tldr_astro_cold_rendered_prose_gate",
          strict: true,
          schema: COLD_REVIEW_SCHEMA
        }
      }
    }
  });
  if (!response.ok) throw new Error(payload.error?.message ?? `OpenAI cold reviewer failed with ${response.status}.`);
  const text = outputText(payload);
  if (!text) throw new Error(`OpenAI cold reviewer returned no output for ${fixture.fixture_id}.`);
  const review = JSON.parse(text);
  const passed = fixture.expected === "PASS"
    ? review.decision === "PASS" && review.cold_rendered_prose?.status === "PASS"
    : review.decision === "REVISE"
      && review.cold_rendered_prose?.status === "FAIL"
      && review.violations?.some((item) => item.category === "cold_rendered_prose" && item.severity === "blocking");
  addUsage(usage, payload.usage);
  results.push({
    fixtureId: fixture.fixture_id,
    fixtureKind: fixture.fixture_kind,
    expected: fixture.expected,
    renderedCopySha256: fixture.rendered_copy_sha256,
    actualDecision: review.decision,
    actualStatus: review.cold_rendered_prose?.status ?? null,
    passed,
    reason: review.cold_rendered_prose?.reason ?? null,
    violations: review.violations ?? [],
    provider: {
      responseId: payload.id ?? null,
      responseModel: payload.model ?? model,
      reasoningEffort: payload.reasoning?.effort ?? reasoningEffort,
      usage: payload.usage ?? null
    }
  });
  fs.writeFileSync(runPath, `${JSON.stringify({
    schemaVersion: "cold-rendered-prose-live-eval-v1",
    status: "running",
    model,
    reasoningEffort,
    authorizedCallCount: 13,
    callCount: results.length,
    usage,
    results
  }, null, 2)}\n`);
  process.stdout.write(`${results.length}/13 ${fixture.fixture_id}: ${review.decision} ${passed ? "PASS" : "MISMATCH"}\n`);
}

const negativePassed = results.filter((item) => item.fixtureKind === "negative" && item.passed).length;
const goldPassed = results.filter((item) => item.fixtureKind === "gold" && item.passed).length;
const report = {
  schemaVersion: "cold-rendered-prose-live-eval-v1",
  status: negativePassed === 12 && goldPassed === 1 ? "PASS" : "FAIL",
  model,
  reasoningEffort,
  authorizedCallCount: 13,
  callCount: results.length,
  usage,
  expected: { v7NegativeRevise: 12, sunLeoV3GoldPass: 1 },
  actual: { v7NegativeRevise: negativePassed, sunLeoV3GoldPass: goldPassed },
  calibrationDelta: {
    priorGate: "The twelve V7 Mercury masters passed the prior gate before the owner rejected them on a cold rendered read.",
    newGate: `${negativePassed}/12 V7 pages rejected; ${goldPassed}/1 Sun-in-Leo V3 gold passed.`,
    additionalCallsPerReviewedUnit: 1,
    contextIsolation: "The cold pass received rendered_copy only; no meaning plan, source note, astrology logic, intended meaning, or drafting context was sent."
  },
  results
};
fs.writeFileSync(runPath, `${JSON.stringify(report, null, 2)}\n`);
fs.writeFileSync(summaryPath, [
  "# Cold rendered prose gate: live evaluation",
  "",
  `- Status: **${report.status}**`,
  `- Model: \`${model}\``,
  `- Reasoning effort: \`${reasoningEffort}\``,
  `- Calls: ${report.callCount}`,
  `- Tokens: ${usage.total_tokens} total (${usage.input_tokens} input, ${usage.output_tokens} output, ${usage.reasoning_tokens} reasoning; ${usage.cached_input_tokens} cached input)`,
  `- V7 Mercury negatives: ${negativePassed}/12 correctly REVISE`,
  `- Sun in Leo V3 gold: ${goldPassed}/1 correctly PASS`,
  "- Context isolation: every model request contained only the rendered prose.",
  "",
  "## Per-fixture results",
  "",
  ...results.map((item) => `- \`${item.fixtureId}\`: expected ${item.expected}, received ${item.actualDecision} (${item.passed ? "correct" : "mismatch"})`),
  ""
].join("\n"));
console.log(JSON.stringify({ status: report.status, model, reasoningEffort, callCount: report.callCount, usage, actual: report.actual }, null, 2));
if (report.status !== "PASS") process.exitCode = 1;
