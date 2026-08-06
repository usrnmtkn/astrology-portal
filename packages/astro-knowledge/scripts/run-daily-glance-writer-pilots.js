#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");
const {
  batchLint,
  buildPacket,
  configPath,
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

const packageRoot = path.resolve(__dirname, "..");
const defaultOutDir = path.join(packageRoot, "review", "daily-glance-pilots-v1");

function parseCli(argv) {
  const args = argv.slice(2);
  const outIndex = args.indexOf("--out");
  const configIndex = args.indexOf("--config");
  const resolveFromPackage = (value, fallback) => value
    ? (path.isAbsolute(value) ? value : path.resolve(packageRoot, value))
    : fallback;
  return {
    planOnly: args.includes("--plan"),
    authorizeLive: args.includes("--authorize-live"),
    resumeLive: args.includes("--resume-live"),
    lintExisting: args.includes("--lint-existing"),
    archiveFirstRun: args.includes("--archive-first-run"),
    outDir: resolveFromPackage(outIndex >= 0 ? args[outIndex + 1] : null, defaultOutDir),
    configFile: resolveFromPackage(configIndex >= 0 ? args[configIndex + 1] : null, configPath)
  };
}

function archiveFirstRun(outDir) {
  const archiveDir = path.join(outDir, "first-run-rejected");
  const files = fs.readdirSync(outDir, { withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) => entry.name)
    .sort();
  const raws = files.filter((name) => name.endsWith(".raw.txt"));
  if (raws.length !== 7) throw new Error(`Expected seven first-run raws before archive; found ${raws.length}.`);
  if (fs.existsSync(archiveDir) && fs.readdirSync(archiveDir).length) throw new Error(`Archive already contains files: ${archiveDir}`);
  fs.mkdirSync(archiveDir, { recursive: true });
  const manifestFiles = files.map((name) => ({ name, sha256: sha256(fs.readFileSync(path.join(outDir, name))) }));
  for (const name of files) fs.renameSync(path.join(outDir, name), path.join(archiveDir, name));
  writeJson(path.join(archiveDir, "archive-manifest.json"), {
    schemaVersion: 1,
    status: "owner-rejected-first-run",
    authority: "packages/astro-knowledge/review/daily-glance-harvest-wiring-2026-08-04.md",
    reason: "Flat, not lived, and not the owner's voice; failure evidence only.",
    files: manifestFiles
  });
  return { archiveDir, filesArchived: files.length, rawOutputsArchived: raws.length };
}

function slug(key) {
  return key.replace("/", "-");
}

function writeJson(filePath, value) {
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function assertUnusedLiveRun(outDir, keys) {
  const existing = keys.flatMap((key) => [
    path.join(outDir, `${slug(key)}.raw.txt`),
    path.join(outDir, `${slug(key)}.provider.json`)
  ]).filter((filePath) => fs.existsSync(filePath));
  if (existing.length) throw new Error(`Live pilot guard refused to repeat a billed key; existing artifacts: ${existing.join(", ")}`);
}

function existingLiveArtifacts(base) {
  const rawPath = `${base}.raw.txt`;
  const providerPath = `${base}.provider.json`;
  const rawExists = fs.existsSync(rawPath);
  const providerExists = fs.existsSync(providerPath);
  if (rawExists !== providerExists) throw new Error(`Incomplete live artifact pair at ${base}; refusing resume.`);
  return rawExists ? { rawPath, providerPath } : null;
}

async function requestOnce({ config, modelInput, maxOutputTokens = 16000 }) {
  const startedAt = Date.now();
  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: { authorization: `Bearer ${process.env.OPENAI_API_KEY}`, "content-type": "application/json" },
    body: JSON.stringify({
      model: config.routing.model,
      input: modelInput,
      reasoning: { effort: config.routing.reasoningEffort },
      max_output_tokens: maxOutputTokens,
      text: {
        format: {
          type: "json_schema",
          name: "daily_glance_pilot",
          strict: true,
          schema: {
            type: "object",
            additionalProperties: false,
            required: ["headline", "body"],
            properties: {
              headline: { type: "string", minLength: 1, maxLength: 220 },
              body: { type: "string", minLength: 1, maxLength: 800 }
            }
          }
        }
      }
    })
  });
  const payload = await response.json();
  return { response, payload, latencyMs: Date.now() - startedAt };
}

async function main() {
  const cli = parseCli(process.argv);
  if ([cli.planOnly, cli.authorizeLive, cli.resumeLive, cli.lintExisting, cli.archiveFirstRun].filter(Boolean).length !== 1) {
    throw new Error("Choose exactly one of --plan, --authorize-live, --resume-live, --lint-existing, or --archive-first-run.");
  }
  const config = readJson(cli.configFile);
  const keys = config.keys.map((entry) => entry.key);
  fs.mkdirSync(cli.outDir, { recursive: true });
  if (cli.archiveFirstRun) {
    process.stdout.write(`${JSON.stringify(archiveFirstRun(cli.outDir), null, 2)}\n`);
    return;
  }
  if (cli.authorizeLive) assertUnusedLiveRun(cli.outDir, keys);

  const compiled = keys.map((key) => {
    const packet = buildPacket(key, config);
    const modelInput = renderModelInput(packet);
    const lint = packetLint(packet, modelInput, config);
    const base = path.join(cli.outDir, slug(key));
    writeJson(`${base}.packet.json`, packet);
    fs.writeFileSync(`${base}.model-input.md`, modelInput, "utf8");
    writeJson(`${base}.packet-lint.json`, lint);
    return { key, packet, modelInput, lint, base };
  });
  const failedPackets = compiled.filter((entry) => !entry.lint.passed);
  if (failedPackets.length) throw new Error(`Packet self-lint failed before billing: ${failedPackets.map((entry) => entry.key).join(", ")}.`);

  const preflight = {
    schemaVersion: 1,
    status: cli.planOnly ? "ready-for-authorized-live-run" : (cli.lintExisting ? "packet-self-lint-passed-for-existing-raws" : "packet-self-lint-passed"),
    calls: { plannedWriter: config.routing.writerCalls, plannedJudge: 0, billedMade: 0 },
    routing: config.routing,
    keys: compiled.map((entry) => ({
      key: entry.key,
      ownerSourceIds: entry.packet.ownerPassages.map((passage) => passage.sourceId),
      factSelectors: entry.packet.verifiedAstrology.map((fact) => `${fact.sourcePath}#${fact.selector}`),
      harvestMode: entry.packet.warmthHarvest.harvest_mode,
      warmthSources: entry.packet.warmthHarvest.ownerFoundationLines.map((line) => `${line.sourcePath}#${line.sourceId}`),
      sceneMode: entry.packet.sceneEvidence.mode,
      sceneSources: entry.packet.sceneEvidence.sourceId ? [`${entry.packet.sceneEvidence.sourcePath}#${entry.packet.sceneEvidence.recordId}`] : [entry.packet.sceneEvidence.permission],
      modelInputSha256: sha256(entry.modelInput),
      packetLintPassed: entry.lint.passed
    }))
  };
  writeJson(path.join(cli.outDir, "preflight.json"), preflight);
  if (cli.planOnly) {
    process.stdout.write(`${JSON.stringify(preflight, null, 2)}\n`);
    return;
  }

  if (cli.authorizeLive || cli.resumeLive) {
    loadLocalEnv();
    if (!process.env.OPENAI_API_KEY) throw new Error("OPENAI_API_KEY is not configured.");
  }
  const results = [];
  let callsMadeThisRun = 0;
  for (const entry of compiled) {
    let raw;
    let provider;
    const existing = cli.resumeLive ? existingLiveArtifacts(entry.base) : null;
    if ((cli.authorizeLive || cli.resumeLive) && !existing) {
      const maxOutputTokens = config.routing.maxOutputTokens ?? 16000;
      const { response, payload, latencyMs } = await requestOnce({ config, modelInput: entry.modelInput, maxOutputTokens });
      callsMadeThisRun += 1;
      raw = outputText(payload);
      fs.writeFileSync(`${entry.base}.raw.txt`, raw, "utf8");
      const usage = normalizeUsage(payload.usage);
      provider = {
        schemaVersion: 1,
        key: entry.key,
        responseId: payload.id || null,
        status: payload.status || null,
        httpStatus: response.status,
        requestedModel: config.routing.model,
        actualModel: payload.model || null,
        requestedReasoningEffort: config.routing.reasoningEffort,
        requestedMaxOutputTokens: maxOutputTokens,
        actualReasoningEffort: payload.reasoning?.effort || null,
        laneId: config.routing.laneId,
        writerOnly: true,
        terraCalls: 0,
        latencyMs,
        usage,
        estimatedCostUsd: estimateCost(usage, config),
        pricingSource: config.pricing.source,
        rawOutputSha256: sha256(raw),
        incompleteDetails: payload.incomplete_details || null
      };
      writeJson(`${entry.base}.provider.json`, provider);
      if (!response.ok) throw new Error(payload.error?.message || `OpenAI request failed with ${response.status} for ${entry.key}.`);
      if (payload.model !== config.routing.model || payload.reasoning?.effort !== config.routing.reasoningEffort) {
        throw new Error(`Provider route mismatch for ${entry.key}: ${payload.model}/${payload.reasoning?.effort}.`);
      }
    } else if (existing) {
      raw = fs.readFileSync(existing.rawPath, "utf8");
      provider = readJson(existing.providerPath);
      if (provider.rawOutputSha256 !== sha256(raw)) throw new Error(`Existing raw hash mismatch for ${entry.key}.`);
    } else {
      raw = fs.readFileSync(`${entry.base}.raw.txt`, "utf8");
      provider = readJson(`${entry.base}.provider.json`);
      if (provider.rawOutputSha256 !== sha256(raw)) throw new Error(`Existing raw hash mismatch for ${entry.key}.`);
    }
    let candidate;
    let lint;
    try {
      candidate = parseOutput(raw);
      lint = lintOutput(candidate, entry.key, config);
    } catch (error) {
      lint = {
        schemaVersion: 1,
        key: entry.key,
        passed: false,
        immutableRawOutput: true,
        revisionsMade: 0,
        parseError: error instanceof Error ? error.message : String(error),
        checks: [],
        findings: []
      };
    }
    writeJson(`${entry.base}.lint.json`, lint);
    results.push({ key: entry.key, candidate, lint, provider });
  }

  const batch = batchLint(results.filter((entry) => entry.candidate), { expectedCount: keys.length, config });
  writeJson(path.join(cli.outDir, "batch-lint.json"), batch);
  const summary = {
    schemaVersion: 1,
    status: "owner-review-required",
    lintExistingOnly: cli.lintExisting,
    immutableRawOutputs: true,
    revisionsMade: 0,
    callsMadeThisRun,
    calls: { writer: results.length, judge: 0, terra: 0, total: results.length },
    routing: config.routing,
    results: results.map((entry) => ({
      key: entry.key,
      lintPassed: entry.lint.passed,
      responseId: entry.provider.responseId,
      usage: entry.provider.usage,
      estimatedCostUsd: entry.provider.estimatedCostUsd,
      latencyMs: entry.provider.latencyMs
    })),
    batchLint: batch,
    totals: {
      inputTokens: results.reduce((sum, entry) => sum + entry.provider.usage.inputTokens, 0),
      cachedInputTokens: results.reduce((sum, entry) => sum + entry.provider.usage.cachedInputTokens, 0),
      cacheWriteTokens: results.reduce((sum, entry) => sum + entry.provider.usage.cacheWriteTokens, 0),
      outputTokens: results.reduce((sum, entry) => sum + entry.provider.usage.outputTokens, 0),
      reasoningTokens: results.reduce((sum, entry) => sum + entry.provider.usage.reasoningTokens, 0),
      totalTokens: results.reduce((sum, entry) => sum + entry.provider.usage.totalTokens, 0),
      estimatedCostUsd: results.reduce((sum, entry) => sum + entry.provider.estimatedCostUsd, 0)
    },
    pricing: config.pricing
  };
  writeJson(path.join(cli.outDir, cli.lintExisting ? "summary-lint-existing.json" : "summary.json"), summary);
  process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`);
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.stack : error);
    process.exitCode = 1;
  });
}

module.exports = { archiveFirstRun, parseCli, requestOnce, slug };
