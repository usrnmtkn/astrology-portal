#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");
const {
  batch2ConfigPath,
  buildPacket,
  estimateCost,
  lintOutput,
  loadLocalEnv,
  normalizeUsage,
  outputText,
  packetLint,
  parseOutput,
  readJson,
  renderModelInput,
  sha256
} = require("./daily-glance-writer-runtime.js");
const { requestOnce } = require("./run-daily-glance-writer-pilots.js");

const packageRoot = path.resolve(__dirname, "..");
const outDir = path.join(packageRoot, "review", "daily-glance-batch-2");
const base = path.join(outDir, "square-chiron");
const authority = "packages/astro-knowledge/review/daily-glance-rebuild-plan-2026-08-04.md#batch-2-sitting-rulings";
const key = "square/chiron";
const requiredMaxOutputTokens = 24000;

function writeJson(filePath, value) {
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function parseCli(argv) {
  const args = argv.slice(2);
  const maxIndex = args.indexOf("--max-output-tokens");
  return {
    authorized: args.includes("--authorize-live"),
    maxOutputTokens: Number(maxIndex >= 0 ? args[maxIndex + 1] : NaN)
  };
}

function comparablePreRerunPacket(packet) {
  const value = JSON.parse(JSON.stringify(packet));
  value.packetVersion = "<normalized>";
  value.promptVersion = "<normalized>";
  value.dailyRules = value.dailyRules.filter((entry) => !["DG-R16", "DG-R17"].includes(entry.id));
  value.outputPolicy.ids = value.outputPolicy.ids.filter((id) => !["DG-R16", "DG-R17"].includes(id));
  return value;
}

function preserveFailedArtifact(suffix, archiveSuffix) {
  const source = `${base}.${suffix}`;
  const destination = `${base}.${archiveSuffix}`;
  if (!fs.existsSync(source)) throw new Error(`Missing failed artifact ${source}.`);
  if (fs.existsSync(destination)) {
    if (sha256(fs.readFileSync(source)) !== sha256(fs.readFileSync(destination))) {
      throw new Error(`Preserved artifact differs from current failed artifact: ${destination}.`);
    }
    return destination;
  }
  fs.copyFileSync(source, destination);
  return destination;
}

async function main() {
  const cli = parseCli(process.argv);
  if (!cli.authorized || cli.maxOutputTokens !== requiredMaxOutputTokens) {
    throw new Error(`This command requires --authorize-live --max-output-tokens ${requiredMaxOutputTokens}.`);
  }

  const config = readJson(batch2ConfigPath);
  if (config.routing.model !== "gpt-5.6-sol" || config.routing.reasoningEffort !== "xhigh") {
    throw new Error(`Route must remain gpt-5.6-sol/xhigh; found ${config.routing.model}/${config.routing.reasoningEffort}.`);
  }
  if (config.routing.terraEnabled || config.routing.revisionsEnabled || config.routing.retriesEnabled) {
    throw new Error("Rerun must remain writer-only with Terra, revisions, and retries disabled.");
  }

  const priorProvider = readJson(`${base}.provider.json`);
  if (priorProvider.key !== key
    || priorProvider.status !== "incomplete"
    || priorProvider.incompleteDetails?.reason !== "max_output_tokens"
    || priorProvider.usage?.outputTokens !== 8000) {
    throw new Error("The standard provider artifact is not the authorized failed 8,000-token attempt; refusing a repeat call.");
  }
  const priorPacket = readJson(`${base}.packet.json`);
  const packet = buildPacket(key, config);
  const modelInput = renderModelInput(packet);
  const selfLint = packetLint(packet, modelInput, config);
  if (!selfLint.passed) throw new Error("Packet self-lint failed before billing.");
  const samePacketExceptNewRules = JSON.stringify(comparablePreRerunPacket(priorPacket))
    === JSON.stringify(comparablePreRerunPacket(packet));
  if (!samePacketExceptNewRules) {
    throw new Error("Rerun packet differs from the failed attempt beyond DG-R16/DG-R17 and version labels.");
  }

  const preservedProviderPath = preserveFailedArtifact("provider.json", "provider.failed-max-output-8000.json");
  preserveFailedArtifact("raw.txt", "raw.failed-max-output-8000.txt");
  preserveFailedArtifact("lint.json", "lint.failed-max-output-8000.json");
  writeJson(`${base}.packet.json`, packet);
  fs.writeFileSync(`${base}.model-input.md`, modelInput, "utf8");
  writeJson(`${base}.packet-lint.json`, selfLint);
  writeJson(`${base}.rerun-preflight.json`, {
    schemaVersion: 1,
    authority,
    key,
    packetSelfLintPassed: true,
    samePacketExceptNewRules: true,
    addedRules: ["DG-R16", "DG-R17"],
    maxOutputTokens: requiredMaxOutputTokens,
    priorResponseId: priorProvider.responseId,
    preservedProviderPath: path.relative(packageRoot, preservedProviderPath),
    callsAuthorized: 1,
    revisionsAuthorized: 0,
    retriesAuthorized: 0
  });

  loadLocalEnv();
  if (!process.env.OPENAI_API_KEY) throw new Error("OPENAI_API_KEY is not configured.");
  const { response, payload, latencyMs } = await requestOnce({
    config,
    modelInput,
    maxOutputTokens: requiredMaxOutputTokens
  });
  const raw = outputText(payload);
  const usage = normalizeUsage(payload.usage);
  const provider = {
    schemaVersion: 1,
    key,
    responseId: payload.id || null,
    status: payload.status || null,
    httpStatus: response.status,
    requestedModel: config.routing.model,
    actualModel: payload.model || null,
    requestedReasoningEffort: config.routing.reasoningEffort,
    actualReasoningEffort: payload.reasoning?.effort || null,
    requestedMaxOutputTokens: requiredMaxOutputTokens,
    laneId: config.routing.laneId,
    writerOnly: true,
    terraCalls: 0,
    revisionsMade: 0,
    retriesMade: 0,
    latencyMs,
    usage,
    estimatedCostUsd: estimateCost(usage, config),
    pricingSource: config.pricing.source,
    rawOutputSha256: sha256(raw),
    incompleteDetails: payload.incomplete_details || null,
    authority,
    replacesIncompleteResponseId: priorProvider.responseId,
    preservedFailedProvider: path.relative(packageRoot, preservedProviderPath)
  };
  fs.writeFileSync(`${base}.raw.txt`, raw, "utf8");
  writeJson(`${base}.provider.json`, provider);
  if (!response.ok) throw new Error(payload.error?.message || `OpenAI request failed with ${response.status}.`);
  if (payload.model !== config.routing.model || payload.reasoning?.effort !== config.routing.reasoningEffort) {
    throw new Error(`Provider route mismatch: ${payload.model}/${payload.reasoning?.effort}.`);
  }

  let candidate;
  let lint;
  try {
    candidate = parseOutput(raw);
    lint = lintOutput(candidate, key, config);
  } catch (error) {
    lint = {
      schemaVersion: 1,
      key,
      passed: false,
      immutableRawOutput: true,
      revisionsMade: 0,
      specificityAdvisory: true,
      parseError: error instanceof Error ? error.message : String(error),
      checks: [],
      findings: []
    };
  }
  writeJson(`${base}.lint.json`, lint);
  const summary = {
    schemaVersion: 1,
    status: payload.status === "completed" ? "owner-review-required" : "incomplete-no-retry",
    authority,
    key,
    immutableRawOutput: true,
    callsMadeThisRun: 1,
    revisionsMade: 0,
    retriesMade: 0,
    model: config.routing.model,
    reasoningEffort: config.routing.reasoningEffort,
    maxOutputTokens: requiredMaxOutputTokens,
    responseId: provider.responseId,
    providerStatus: provider.status,
    usage,
    estimatedCostUsd: provider.estimatedCostUsd,
    lintPassed: lint.passed,
    specificityAdvisory: lint.checks?.find((check) => check.id === "OWNER-TEST-specificity") || null,
    priorProviderPreserved: path.relative(packageRoot, preservedProviderPath)
  };
  writeJson(`${base}.rerun-summary.json`, summary);
  process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack : error);
  process.exitCode = 1;
});
