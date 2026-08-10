#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { createRequire } from "node:module";
import { HOUSE_BLEED_NOUNS } from "../src/astro-writing/validateCopy.mjs";
import { reviewDraft } from "../src/astro-writing/reviewDraft.mjs";
import openAIResponses from "../src/astro-writing/openAIResponses.cjs";

const require = createRequire(import.meta.url);
const { loadLocalEnv } = require("../packages/astro-knowledge/scripts/daily-glance-writer-runtime.js");
const { callOpenAIResponses } = openAIResponses;

function argValue(flag) {
  const index = process.argv.indexOf(flag);
  return index >= 0 ? process.argv[index + 1] : null;
}

function loadExplicitEnv(filePath) {
  if (!filePath) return;
  for (const line of fs.readFileSync(path.resolve(filePath), "utf8").split(/\r?\n/u)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const separator = trimmed.indexOf("=");
    if (separator <= 0) continue;
    const key = trimmed.slice(0, separator).trim();
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/u.test(key) || process.env[key] !== undefined) continue;
    let value = trimmed.slice(separator + 1).trim();
    if (/^["'].*["']$/u.test(value)) value = value.slice(1, -1);
    process.env[key] = value;
  }
}

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

function signFromFixture(fixture) {
  return fixture.astrology_context?.sign
    ?? String(fixture.fixture_id).match(/^neg-([a-z]+)-/u)?.[1]
    ?? null;
}

function governedPlan(sign, goldBySign) {
  const gold = goldBySign.get(sign);
  if (!gold) throw new Error(`No owner-locked Lilith reference exists for ${sign}.`);
  return {
    content_type: "lilith-sign-placement",
    object: "lilith",
    sign,
    house: null,
    event_type: "placement",
    object_function: ["brings buried, rejected, or defended wants and refusals into view"],
    sign_mechanics: [gold.hook],
    actual_house_domain: null,
    core_tension: gold.tagline,
    what_changes: gold.turn,
    constructive_expression: gold.turn,
    overcorrection: gold.lived,
    observable_behaviors: [gold.hook, gold.lived],
    possible_consequences: [gold.turn],
    allowed_life_domain_examples: [],
    do_not_assume: ["a house, motive, biography, or relationship status not supplied by governed facts"],
    house_bleed_risks: HOUSE_BLEED_NOUNS[sign] ?? [],
    stock_trope_risks: ["generic domestic props", "generic dating scenes", "generic workplace shorthand"],
    unearned_motives: ["a specific psychological explanation not supplied by governed facts"]
  };
}

function withExactOutcome(result) {
  const modelPassed = result.fixtureKind === "gold"
    ? result.modelDecision === "PASS"
    : result.modelDecision === "REVISE" && result.modelMissedCategories.length === 0;
  const pipelinePassed = result.fixtureKind === "gold"
    ? result.finalDecision === "PASS"
    : result.finalDecision === "REVISE" && result.finalMissedCategories.length === 0;
  return { ...result, modelPassed, pipelinePassed, passed: modelPassed };
}

function summarize(results, metadata = {}) {
  const exactResults = results.map(withExactOutcome);
  const modelFalsePositives = exactResults.filter((result) => result.fixtureKind === "gold" && !result.modelPassed).length;
  const modelFalseNegatives = exactResults.filter((result) => result.fixtureKind === "negative" && !result.modelPassed).length;
  const pipelineFalsePositives = exactResults.filter((result) => result.fixtureKind === "gold" && !result.pipelinePassed).length;
  const pipelineFalseNegatives = exactResults.filter((result) => result.fixtureKind === "negative" && !result.pipelinePassed).length;
  return {
    schemaVersion: 2,
    status: modelFalsePositives === 0 && modelFalseNegatives === 0 ? "PASS" : "FAIL",
    ...metadata,
    modelGoldPassed: exactResults.filter((result) => result.fixtureKind === "gold" && result.modelPassed).length,
    modelNegativePassed: exactResults.filter((result) => result.fixtureKind === "negative" && result.modelPassed).length,
    modelFalsePositives,
    modelFalseNegatives,
    pipelineGoldPassed: exactResults.filter((result) => result.fixtureKind === "gold" && result.pipelinePassed).length,
    pipelineNegativePassed: exactResults.filter((result) => result.fixtureKind === "negative" && result.pipelinePassed).length,
    pipelineFalsePositives,
    pipelineFalseNegatives,
    results: exactResults
  };
}

const round = argValue("--round");
const outputName = round
  ? `lilith-live-semantic-review-calibration-round-${round}.json`
  : "lilith-live-semantic-review-eval.json";
const outputPath = path.resolve("packages/astro-knowledge/review/writing-harness-v2", outputName);
if (process.argv.includes("--recompute-existing")) {
  const existing = JSON.parse(fs.readFileSync(outputPath, "utf8"));
  const report = summarize(existing.results, {
    model: existing.model,
    reasoningEffort: existing.reasoningEffort,
    callCount: existing.callCount,
    authorizedCallCount: existing.authorizedCallCount,
    note: "Recomputed from the preserved 20 live responses; no additional model calls. Negative exact-match requires REVISE plus every expected category."
  });
  fs.writeFileSync(outputPath, `${JSON.stringify(report, null, 2)}\n`);
  console.log(JSON.stringify(report, null, 2));
  process.exit(0);
}

if (!process.argv.includes("--authorize-live")) {
  throw new Error("No billed call was made. Pass --authorize-live only after explicit owner authorization.");
}
loadLocalEnv();
loadExplicitEnv(argValue("--env-file"));
if (!process.env.OPENAI_API_KEY) throw new Error("OPENAI_API_KEY is not configured.");

const model = process.env.OPENAI_REVIEW_MODEL ?? process.env.OPENAI_JUDGE_MODEL ?? "gpt-5.6-terra";
const reasoningEffort = argValue("--reasoning-effort") ?? process.env.OPENAI_REVIEW_REASONING_EFFORT ?? "medium";
if (!new Set(["medium", "high", "xhigh"]).has(reasoningEffort)) throw new Error("Live calibration reasoning effort must be medium, high, or xhigh.");
const gold = readJsonl(path.resolve("data/writing/owner-approved-examples.jsonl"));
const negatives = readJsonl(path.resolve("data/writing/negative-regression-fixtures.jsonl"));
if (gold.length !== 12 || negatives.length !== 8) throw new Error("Live vertical slice requires exactly 12 gold and 8 negative fixtures.");
const goldBySign = new Map(gold.map((fixture) => [signFromFixture(fixture), fixture]));
const fixtures = [
  ...gold.map((fixture) => ({ ...fixture, fixtureKind: "gold" })),
  ...negatives.map((fixture) => ({ ...fixture, fixtureKind: "negative" }))
];
const results = [];
let callCount = 0;

for (const fixture of fixtures) {
  const sign = signFromFixture(fixture);
  const plan = governedPlan(sign, goldBySign);
  const draft = fixture.fixtureKind === "gold"
    ? { tagline: fixture.tagline, hook: fixture.hook, lived: fixture.lived, turn: fixture.turn }
    : { body: fixture.bad_text };
  let liveModelReview = null;
  let providerRecord = null;
  const modelClient = async ({ input, schema }) => {
    callCount += 1;
    const { response, payload } = await callOpenAIResponses({
      apiKey: process.env.OPENAI_API_KEY,
      role: "REVIEWER",
      taskInstructions: "For every violation category, use the exact lowercase snake_case check ID from the strict output schema and reviewer contract.",
      request: {
        model,
        input,
        reasoning: { effort: reasoningEffort },
        max_output_tokens: 4000,
        text: {
          format: {
            type: "json_schema",
            name: "tldr_astro_live_editorial_gate",
            strict: true,
            schema
          }
        }
      }
    });
    if (!response.ok) throw new Error(payload.error?.message ?? `OpenAI reviewer failed with ${response.status}.`);
    const text = outputText(payload);
    if (!text) throw new Error(`OpenAI reviewer returned no output for ${fixture.fixture_id}.`);
    liveModelReview = JSON.parse(text);
    providerRecord = {
      responseId: payload.id ?? null,
      responseModel: payload.model ?? model,
      reasoningEffort: payload.reasoning?.effort ?? reasoningEffort,
      usage: payload.usage ?? null
    };
    return liveModelReview;
  };
  const finalReview = await reviewDraft({
    draft,
    plan,
    context: { corrections: [] },
    family: fixture.content_family,
    register: "collective",
    modelClient,
    expectedPlaceholders: fixture.fixtureKind === "gold" ? ["exitDate"] : [],
    requiredFields: fixture.fixtureKind === "gold" ? ["tagline", "hook", "lived", "turn"] : ["body"],
    protectedOwnerLines: fixture.fixtureKind === "gold" ? Object.values(draft) : []
  });
  const modelCategories = [...new Set((liveModelReview?.violations ?? []).map((item) => item.category))];
  const finalCategories = [...new Set(finalReview.violations.map((item) => item.category))];
  const expectedCategories = fixture.expected_failures ?? [];
  const modelMissedCategories = expectedCategories.filter((category) => !modelCategories.includes(category));
  const finalMissedCategories = expectedCategories.filter((category) => !finalCategories.includes(category));
  const modelPassed = fixture.fixtureKind === "gold"
    ? liveModelReview?.decision === "PASS"
    : liveModelReview?.decision === "REVISE" && modelMissedCategories.length === 0;
  const pipelinePassed = fixture.fixtureKind === "gold"
    ? finalReview.decision === "PASS"
    : finalReview.decision === "REVISE" && finalMissedCategories.length === 0;
  results.push({
    fixtureId: fixture.fixture_id,
    fixtureKind: fixture.fixtureKind,
    expected: fixture.fixtureKind === "gold" ? "PASS" : "REVISE",
    expectedCategories,
    modelDecision: liveModelReview?.decision ?? null,
    finalDecision: finalReview.decision,
    modelCategories,
    finalCategories,
    modelMissedCategories,
    finalMissedCategories,
    modelPassed,
    pipelinePassed,
    passed: modelPassed,
    provider: providerRecord
  });
  fs.writeFileSync(outputPath, `${JSON.stringify({
    schemaVersion: 1,
    status: "running",
    round: round ?? null,
    model,
    reasoningEffort,
    callCount,
    authorizedCallCount: 20,
    results
  }, null, 2)}\n`);
  process.stdout.write(`${callCount}/20 ${fixture.fixture_id}: model=${liveModelReview?.decision} final=${finalReview.decision} modelPass=${modelPassed}\n`);
}

const report = summarize(results, {
  round: round ?? null,
  model,
  reasoningEffort,
  callCount,
  authorizedCallCount: 20
});
fs.writeFileSync(outputPath, `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify(report, null, 2));
if (callCount !== 20) throw new Error(`Live reviewer call count was ${callCount}; expected exactly 20.`);
if (report.status !== "PASS") process.exitCode = 1;
