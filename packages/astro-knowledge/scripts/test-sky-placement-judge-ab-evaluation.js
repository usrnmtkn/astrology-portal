#!/usr/bin/env node
"use strict";

const assert = require("assert");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { buildJudgePrompt } = require("./judge-placement-voice.js");
const { REASONING_EFFORTS, readRegistry } = require("./editorial-model-registry.js");
const {
  buildFixtures,
  estimateCost,
  manifest,
  runEvaluation
} = require("./run-sky-placement-judge-ab-evaluation.js");

async function main() {
  const registry = readRegistry();
  const lane = registry.lanes["judge:sky-placement"];
  assert.strictEqual(lane.active.model, "gpt-5.6-terra", "the later passing promotion calibration must activate Terra-low");
  assert.strictEqual(lane.active.reasoningEffort, "low");
  assert.strictEqual(manifest.runtime.activeReleaseId, lane.rollback.releaseId, "the archived experiment records the runtime that was active when it ran");
  assert.strictEqual(manifest.status, "completed-superseded");
  assert.strictEqual(manifest.liveRerunAllowed, false);
  assert.strictEqual(manifest.promotionAuthorized, false);
  assert.strictEqual(manifest.treatments.baseline.model, "gpt-5.6-terra");
  assert.strictEqual(manifest.treatments.baseline.reasoningEffort, "low");
  assert.strictEqual(manifest.treatments.candidate.model, "gpt-5.6-sol");
  assert.strictEqual(manifest.treatments.candidate.reasoningEffort, "xhigh");
  assert.strictEqual(manifest.excludedExperiments.pro.included, false);
  assert.strictEqual(manifest.excludedExperiments.max.included, false);
  assert.strictEqual(manifest.excludedExperiments.max.supportedByRegistry, true);
  assert(REASONING_EFFORTS.has("max"), "registry must record max reasoning support");

  const fixtures = buildFixtures();
  assert.strictEqual(fixtures.length, 14);
  assert.strictEqual(fixtures.filter((fixture) => fixture.expectedClass === "historical-owner-approved-v1").length, 7);
  assert.strictEqual(fixtures.filter((fixture) => fixture.expectedOutcome === "positive").length, 7);
  assert.strictEqual(fixtures.filter((fixture) => fixture.expectedClass === "known-weak").length, 7);
  assert(fixtures.some((fixture) => fixture.article.hook.includes("banished want")));
  assert(fixtures.some((fixture) => fixture.article.hook.includes("career, productivity")));

  const prompt = buildJudgePrompt(fixtures[0].article, fixtures[0]);
  assert.match(prompt, /OWNER VOCABULARY PALETTE/);
  assert.match(prompt, /Words shared by Marie and Spirit Daughter/);
  assert.match(prompt, /Words shared by Marie and AC/);

  assert.strictEqual(estimateCost("gpt-5.6-terra", {
    inputTokens: 100_000,
    cachedInputTokens: 0,
    cacheWriteTokens: 0,
    outputTokens: 100_000
  }), 1.4);
  assert.strictEqual(estimateCost("gpt-5.6-sol", {
    inputTokens: 1_000_000,
    cachedInputTokens: 0,
    cacheWriteTokens: 0,
    outputTokens: 1_000_000
  }), 55, "one million input tokens triggers the documented long-context rates");
  assert.strictEqual(estimateCost("gpt-5.6-sol", {
    inputTokens: 100_000,
    cachedInputTokens: 20_000,
    cacheWriteTokens: 10_000,
    outputTokens: 10_000
  }), 0.7225);

  const calls = [];
  const requestFn = async ({ treatmentKey, treatment, fixture, prompt: requestPrompt }) => {
    calls.push({ treatmentKey, treatment, caseId: fixture.caseId, prompt: requestPrompt });
    const score = fixture.expectedOutcome === "positive" ? 3 : 2;
    return {
      latencyMs: treatmentKey === "baseline" ? 100 : 200,
      payload: {
        model: treatment.model,
        output_text: JSON.stringify({
          score,
          verdict: score === 3 ? "in-voice" : "borderline",
          weakest: score === 3 ? "" : "A sentence that needs revision.",
          why: score === 3 ? "The language is clear and specific." : "The draft contains one substantive voice failure."
        }),
        usage: {
          input_tokens: 1000,
          input_tokens_details: { cached_tokens: 100, cache_write_tokens: 0 },
          output_tokens: 100,
          output_tokens_details: { reasoning_tokens: 40 },
          total_tokens: 1100
        }
      }
    };
  };
  const outDir = fs.mkdtempSync(path.join(os.tmpdir(), "sky-placement-ab-test-"));
  const result = await runEvaluation({
    requestFn,
    apiKey: "injected-test-key",
    outDir,
    blindSeed: "fixed-test-seed",
    now: () => new Date("2026-08-02T12:00:00.000Z")
  });
  assert.strictEqual(calls.length, 28);
  for (const fixture of fixtures) {
    const pair = calls.filter((call) => call.caseId === fixture.caseId);
    assert.strictEqual(pair.length, 2);
    assert.strictEqual(pair[0].prompt, pair[1].prompt, "both treatments must receive byte-identical prompts");
  }
  assert.strictEqual(result.internal.promotionAuthorized, false);
  assert.strictEqual(result.internal.promotionEligible, false);
  assert.strictEqual(result.internal.runtimeChanged, false);
  assert.strictEqual(result.internal.requestCount, 28);

  const blindReview = fs.readFileSync(path.join(outDir, "blind-owner-review.md"), "utf8");
  const blindScorecard = fs.readFileSync(path.join(outDir, "blind-owner-scorecard.json"), "utf8");
  for (const text of [blindReview, blindScorecard]) {
    assert.doesNotMatch(text, /gpt-5\.6|\bterra\b|\bsol\b|reasoningEffort|expectedClass|sourceId|known-weak/i);
  }
  assert.match(blindReview, /Review A/);
  assert.match(blindReview, /Review B/);
  assert.strictEqual(JSON.parse(blindScorecard).cases.length, 14);
  assert(fs.existsSync(path.join(outDir, "model-key.json")));

  console.log("Sky Placement judge A/B evaluation contract passed: 14 frozen fixtures, 28 paired calls, identical prompts, sealed model key, and no promotion path.");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
