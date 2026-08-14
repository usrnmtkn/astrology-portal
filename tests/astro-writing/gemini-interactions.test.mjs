#!/usr/bin/env node

import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import geminiInteractions from "../../src/astro-writing/geminiInteractions.cjs";
import localProviderKeys from "../../src/astro-writing/localProviderKeys.cjs";
import offlineProviderConfig from "../../src/astro-writing/offlineProviderConfig.cjs";

const {
  DEFAULT_GEMINI_MODEL,
  GEMINI_INTERACTIONS_URL,
  GeminiInteractionError,
  callGeminiInteractions
} = geminiInteractions;
const { buildProviderRequest, normalizeProviderConfig } = offlineProviderConfig;
const { readLocalProviderKeys } = localProviderKeys;
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

const calls = [];
const result = await callGeminiInteractions({
  apiKey: "fixture-gemini-key",
  model: "gemini-configured-model",
  systemInstruction: "System contract",
  input: "Owner content",
  thinkingLevel: "low",
  fetchImpl: async (url, init) => {
    calls.push({ url, init });
    return {
      ok: true,
      status: 200,
      json: async () => ({
        id: "interaction-1",
        status: "completed",
        model: "gemini-configured-model-001",
        usage_metadata: { input_tokens: 2, output_tokens: 3 },
        outputs: [
          { content: [{ type: "text", text: "ignore earlier output" }] },
          { content: [{ type: "text", text: "{\"score\":" }, { type: "text", text: "3}" }] }
        ]
      })
    };
  }
});

assert.equal(calls.length, 1);
assert.equal(calls[0].url, GEMINI_INTERACTIONS_URL);
assert.equal(calls[0].init.method, "POST");
assert.equal(calls[0].init.headers["x-goog-api-key"], "fixture-gemini-key");
assert.equal(Object.hasOwn(calls[0].init.headers, "authorization"), false);
assert.deepEqual(JSON.parse(calls[0].init.body), {
  model: "gemini-configured-model",
  system_instruction: "System contract",
  input: "Owner content",
  generation_config: { thinking_level: "low" },
  store: false
});
assert.equal(result.text, "{\"score\":3}", "The adapter must return the last response text blocks.");
assert.equal(result.model, "gemini-configured-model-001");

await assert.rejects(
  () => callGeminiInteractions({
    apiKey: "fixture-gemini-key",
    systemInstruction: "System contract",
    input: "Owner content",
    fetchImpl: async () => ({
      ok: false,
      status: 429,
      json: async () => ({ error: { status: "RESOURCE_EXHAUSTED", message: "Quota unavailable" } })
    })
  }),
  (error) => {
    assert.ok(error instanceof GeminiInteractionError);
    assert.equal(error.status, 429);
    assert.equal(error.code, "RESOURCE_EXHAUSTED");
    assert.match(error.message, /Quota unavailable/u);
    assert.doesNotMatch(error.message, /fixture-gemini-key/u);
    return true;
  }
);

assert.deepEqual(normalizeProviderConfig({}, "writer"), {
  provider: "openai",
  model: "gpt-5.6-sol",
  reasoningEffort: "xhigh",
  thinkingLevel: "high",
  maxOutputTokens: 12000
});
assert.equal(normalizeProviderConfig({ provider: "gemini" }, "judge").model, DEFAULT_GEMINI_MODEL);
assert.deepEqual(buildProviderRequest({
  config: { provider: "gemini", model: "gemini-from-batch", thinkingLevel: "medium" },
  role: "writer",
  systemInstruction: "Writer system",
  input: "Writer input"
}), {
  model: "gemini-from-batch",
  system_instruction: "Writer system",
  input: "Writer input",
  generation_config: { thinking_level: "medium" },
  store: false
});

const envFixtureRoot = fs.mkdtempSync(path.join(os.tmpdir(), "tldr-provider-env-"));
try {
  fs.mkdirSync(path.join(envFixtureRoot, "apps", "web"), { recursive: true });
  fs.writeFileSync(path.join(envFixtureRoot, "apps", "web", ".env.local"), [
    "OPENAI_API_KEY=openai-fixture",
    "GEMINI_API_KEY='gemini-fixture'",
    "UNRELATED_SECRET=must-not-load"
  ].join("\n"));
  assert.deepEqual(readLocalProviderKeys(envFixtureRoot), {
    OPENAI_API_KEY: "openai-fixture",
    GEMINI_API_KEY: "gemini-fixture"
  });
} finally {
  fs.rmSync(envFixtureRoot, { recursive: true, force: true });
}

const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "tldr-gemini-dry-run-"));
try {
  const outputRoot = path.join(tempRoot, "review");
  const targetDir = path.join(outputRoot, "neptune-ascendant", "conjunction");
  fs.mkdirSync(targetDir, { recursive: true });
  fs.copyFileSync(
    path.join(repoRoot, "packages/astro-knowledge/review/ascendant-batch-2-card-drafts-v1/neptune-ascendant/conjunction/draft.json"),
    path.join(targetDir, "draft.json")
  );
  fs.writeFileSync(path.join(targetDir, "writer-provider-response.json"), JSON.stringify({
    provider: "gemini",
    requestedModel: "gemini-writer-fixture",
    model: "gemini-writer-fixture-001"
  }));
  const configPath = path.join(tempRoot, "batch.json");
  fs.writeFileSync(configPath, JSON.stringify({
    batch: "gemini-dry-run-fixture",
    authorization: "fixture only; no billed calls",
    outputDir: path.relative(repoRoot, outputRoot),
    expectedCalls: { writer: 1, judge: 1, total: 2 },
    models: {
      writer: { provider: "gemini", model: "gemini-writer-fixture", thinkingLevel: "low" },
      judge: { provider: "openai", model: "gpt-judge-fixture", reasoningEffort: "medium", maxOutputTokens: 1234 }
    },
    targets: [{
      id: "neptune-ascendant-conjunction",
      planet: "neptune",
      aspectLabel: "conjunction",
      entryFile: "packages/astro-knowledge/data/synastry/aspects/A-neptune_B-ascendant_conjunction.json",
      expectedMode: "matched"
    }]
  }));
  const dryRun = spawnSync(process.execPath, [
    "scripts/run-ascendant-batch-drafts.mjs",
    "--batch", configPath,
    "--only", "neptune-ascendant-conjunction",
    "--reuse-draft",
    "--dry-run"
  ], { cwd: repoRoot, encoding: "utf8", env: {} });
  assert.equal(dryRun.status, 0, dryRun.stderr || dryRun.stdout);
  const writerRequest = JSON.parse(fs.readFileSync(path.join(targetDir, "writer-request.json"), "utf8"));
  assert.equal(writerRequest.model, "gemini-writer-fixture");
  assert.equal(writerRequest.generation_config.thinking_level, "low");
  assert.equal(writerRequest.store, false);
  const judgeRequest = JSON.parse(fs.readFileSync(path.join(targetDir, "judge-request.json"), "utf8"));
  assert.equal(judgeRequest.model, "gpt-judge-fixture");
  assert.equal(judgeRequest.reasoning.effort, "medium");
  assert.equal(judgeRequest.max_output_tokens, 1234);
  assert.equal(JSON.parse(fs.readFileSync(path.join(outputRoot, "billed-call-log.json"), "utf8")).calls.length, 0);
} finally {
  fs.rmSync(tempRoot, { recursive: true, force: true });
}

console.log("Gemini Interactions adapter and provider-selectable unbilled batch requests passed.");
