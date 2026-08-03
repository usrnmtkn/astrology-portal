#!/usr/bin/env node
"use strict";

const assert = require("assert");
const fs = require("fs");
const os = require("os");
const path = require("path");
const registry = require(path.join("..", "config", "editorial-model-registry.json"));
const { buildTargetedFixtures } = require("./run-sky-placement-judge-targeted-evaluation.js");
const {
  applyDeterministicPolicy,
  evaluationManifest,
  runTerraEvaluation
} = require("./run-sky-placement-judge-terra-rubric-evaluation.js");

async function main() {
  const fixtures = buildTargetedFixtures();
  assert.strictEqual(fixtures.length, 9);
  assert.strictEqual(evaluationManifest.treatment.model, "gpt-5.6-terra");
  assert.strictEqual(evaluationManifest.treatment.reasoningEffort, "low");
  assert.strictEqual(evaluationManifest.promotionGate.thisRunPromotionEligible, false);
  assert.strictEqual(registry.lanes["judge:sky-placement"].active.model, "gpt-4.1-mini");
  assert.strictEqual(registry.lanes["judge:sky-placement"].candidate.model, "gpt-5.6-sol");
  assert.notStrictEqual(registry.lanes["judge:sky-placement"].candidate.promotionAuthorized, true);

  const unnatural = fixtures.find((fixture) => fixture.caseId === "target-006");
  const policy = applyDeterministicPolicy(unnatural, { score: 2, verdict: "borderline" });
  assert.strictEqual(policy.score, 1);
  assert.deepStrictEqual(policy.appliedRules, ["first-read-natural-english-forces-score-1"]);

  const calls = [];
  const requestFn = async ({ treatment, fixture, prompt }) => {
    calls.push({ caseId: fixture.caseId, prompt });
    const score = {
      ...evaluationManifest.previousTerraScores,
      "target-004": 3,
      "target-006": 1,
      "target-008": 3
    }[fixture.caseId];
    return {
      latencyMs: 100,
      payload: {
        model: treatment.model,
        output_text: JSON.stringify({
          score,
          verdict: score === 3 ? "in-voice" : score === 2 ? "borderline" : "off-voice",
          weakest: score === 3 ? "" : "The targeted line.",
          why: "The rubric was applied."
        }),
        usage: { input_tokens: 1000, output_tokens: 100, total_tokens: 1100 }
      }
    };
  };
  const outDir = fs.mkdtempSync(path.join(os.tmpdir(), "sky-placement-terra-rubric-test-"));
  const run = await runTerraEvaluation({
    requestFn,
    apiKey: "injected-test-key",
    outDir,
    fixtures,
    now: () => new Date("2026-08-02T18:00:00.000Z")
  });
  assert.strictEqual(calls.length, 9);
  assert(calls.every((call) => call.prompt.includes("FIRST-READ NATURAL ENGLISH RULE")));
  assert(calls.every((call) => call.prompt.includes("ALLOWED COLLECTIVE LANGUAGE")));
  assert(calls.every((call) => call.prompt.includes("STACKED ENDING RULE")));
  assert.strictEqual(run.runtimeChanged, false);
  assert.strictEqual(run.promotionAuthorized, false);
  assert.strictEqual(run.summary.expectedEffectiveMatches, 9);
  assert.deepStrictEqual(run.summary.changedFromPrevious, ["target-006", "target-008"]);
  assert.strictEqual(run.results.find((result) => result.caseId === "target-006").effective.score, 1);
  assert(fs.existsSync(path.join(outDir, "terra-review.md")));
  assert(fs.existsSync(path.join(outDir, "results.json")));
  console.log("Terra-low rubric rerun contract passed: nine calls, target-006 severity and target-008 proportional tolerance change as intended, and no runtime promotion path exists.");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
