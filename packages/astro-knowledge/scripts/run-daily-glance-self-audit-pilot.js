"use strict";

// Writer-only pilot for the owner Sol directive. This script never calls Terra,
// selects a winner, mutates serving rows, or changes review_status values.
const fs = require("fs");
const path = require("path");
const childProcess = require("child_process");
const {
  buildPacket,
  estimateCost,
  loadLocalEnv,
  normalizeUsage,
  outputText,
  readJson
} = require("./daily-glance-writer-runtime.js");
const {
  scheduledCandidateConfig,
  servingPairs
} = require("./audit-daily-glance-voice.js");
const {
  approvedGoodExamples,
  lintSelfAuditCandidate,
  parseSelfAuditCandidate,
  renderSelfAuditWriterInput,
  selfAuditPacketLint
} = require("./daily-glance-self-audit-candidates.js");
const { callOpenAIResponses } = require("../../../src/astro-writing/openAIResponses.cjs");
const { loadWriterSceneContextForKey } = require("./daily-glance-scene-context.js");

const packageRoot = path.resolve(__dirname, "..");
const repoRoot = path.resolve(packageRoot, "..", "..");
const dateKey = new Date().toISOString().slice(0, 10);
const sourceRowsPath = path.join(repoRoot, "apps", "web", "src", "content", "fallbackArchitectureV3", "source-rows", "fallback-source-rows-v3.json");
const DEFAULT_KEYS = Object.freeze(["conjunction/neptune", "soft/chiron", "square/uranus", "conjunction/pluto"]);

function writeFile(filePath, value) {
  fs.writeFileSync(filePath, value.endsWith("\n") ? value : `${value}\n`);
}

function emptyUsage() {
  return { inputTokens: 0, cachedInputTokens: 0, cacheWriteTokens: 0, outputTokens: 0, reasoningTokens: 0, totalTokens: 0 };
}

function addUsage(left, right = {}) {
  return Object.fromEntries(Object.keys(left).map((key) => [key, Number(left[key] || 0) + Number(right[key] || 0)]));
}

function parseKeys(args) {
  const index = args.indexOf("--keys");
  if (index < 0) return [...DEFAULT_KEYS];
  if (!args[index + 1]) throw new Error("--keys requires a comma-separated value.");
  const keys = args[index + 1].split(",").map((key) => key.trim()).filter(Boolean);
  if (!keys.length || new Set(keys).size !== keys.length) throw new Error("--keys must contain unique non-empty keys.");
  return keys;
}

function valueAfter(args, flag) {
  const index = args.indexOf(flag);
  if (index < 0) return null;
  if (!args[index + 1]) throw new Error(`${flag} requires a value.`);
  return args[index + 1];
}

function summarizeResults(results) {
  const keys = results.map((result) => ({
    key: result.key,
    calls: result.candidates.length,
    lintClean: result.candidates.filter((candidate) => candidate.lint.passed).length,
    lintCleanRate: result.candidates.filter((candidate) => candidate.lint.passed).length / result.candidates.length,
    noLintCleanCandidate: result.candidates.every((candidate) => !candidate.lint.passed),
    estimatedCostUsd: Number(result.candidates.reduce((sum, candidate) => sum + candidate.provider.estimatedCostUsd, 0).toFixed(6))
  }));
  const usage = results.flatMap((result) => result.candidates).reduce((sum, candidate) => addUsage(sum, candidate.provider.usage), emptyUsage());
  return {
    calls: keys.reduce((sum, key) => sum + key.calls, 0),
    lintClean: keys.reduce((sum, key) => sum + key.lintClean, 0),
    lintCleanRate: keys.reduce((sum, key) => sum + key.lintClean, 0) / keys.reduce((sum, key) => sum + key.calls, 0),
    noLintCleanCandidateKeys: keys.filter((key) => key.noLintCleanCandidate).map((key) => key.key),
    estimatedCostUsd: Number(keys.reduce((sum, key) => sum + key.estimatedCostUsd, 0).toFixed(6)),
    usage,
    keys
  };
}

async function writerCall(config, modelInput) {
  const { response, payload } = await callOpenAIResponses({
    apiKey: process.env.OPENAI_API_KEY,
    role: "WRITER",
    surface: "daily",
    family: "daily",
    request: {
      model: config.routing.model,
      input: modelInput,
      reasoning: { effort: config.routing.reasoningEffort },
      max_output_tokens: config.routing.maxOutputTokens
    }
  });
  if (!response.ok) throw new Error(`writer http ${response.status}: ${JSON.stringify(payload).slice(0, 500)}`);
  return {
    responseId: payload.id || null,
    status: payload.status || null,
    raw: outputText(payload),
    usage: normalizeUsage(payload.usage)
  };
}

function renderMarkdown(report) {
  return [
    "# Daily-glance owner-directive Sol pilot",
    "",
    `Date: ${report.date}`,
    `Source revision: \`${report.sourceRevision}\``,
    "",
    "> Writer-only pilot. Terra was disabled. Every output remains UNAPPROVED; no serving row or review status changed.",
    "",
    "## Results",
    "",
    "| Key | Lint-clean | Rate | NO_LINT_CLEAN_CANDIDATE | Estimated cost |",
    "|---|---:|---:|---|---:|",
    ...report.summary.keys.map((entry) => `| ${entry.key} | ${entry.lintClean}/${entry.calls} | ${(entry.lintCleanRate * 100).toFixed(1)}% | ${entry.noLintCleanCandidate ? "yes" : "no"} | $${entry.estimatedCostUsd.toFixed(6)} |`),
    "",
    `- Calls: ${report.summary.calls}`,
    `- Lint-clean outputs: ${report.summary.lintClean}/${report.summary.calls} (${(report.summary.lintCleanRate * 100).toFixed(1)}%)`,
    `- NO_LINT_CLEAN_CANDIDATE keys: ${report.summary.noLintCleanCandidateKeys.length ? report.summary.noLintCleanCandidateKeys.join(", ") : "none"}`,
    `- Estimated total cost: $${report.summary.estimatedCostUsd.toFixed(6)}`,
    `- Usage: ${report.summary.usage.inputTokens} input tokens (${report.summary.usage.cachedInputTokens} cached), ${report.summary.usage.outputTokens} output tokens (${report.summary.usage.reasoningTokens} reasoning)`,
    "- Terra calls: 0",
    "- Winners selected: 0",
    "- Revisions made: 0",
    ""
  ].join("\n");
}

async function main() {
  const args = process.argv.slice(2);
  if (!args.includes("--authorize-live")) throw new Error("Pass --authorize-live to authorize the billed Sol calls.");
  if (args.includes("--terra")) throw new Error("Terra is prohibited in the writer-only pilot.");
  const keys = parseKeys(args);
  const config = scheduledCandidateConfig(keys);
  const sceneContextDir = valueAfter(args, "--scene-context-dir");
  if (config.candidateSamplesPerKey !== 3) throw new Error(`Pilot requires exactly 3 independent calls per key; config has ${config.candidateSamplesPerKey}.`);
  if (config.routing.model !== "gpt-5.6-sol" || config.routing.reasoningEffort !== "xhigh" || config.routing.terraEnabled !== false) {
    throw new Error("Pilot routing must be gpt-5.6-sol xhigh with Terra disabled.");
  }
  if (!config.sceneContextGate?.required || !config.sceneContextGate?.requiresExplicitOwnerLicenseApproval || !config.sceneContextGate?.requiresResolvedChartContext) {
    throw new Error("Active writer config must enforce the owner-ruled scene-context gate.");
  }
  const sceneContexts = new Map(keys.map((key) => [key, loadWriterSceneContextForKey(key, sceneContextDir)]));
  loadLocalEnv();
  if (!process.env.OPENAI_API_KEY) throw new Error("OPENAI_API_KEY is not configured.");

  const sourceRows = readJson(sourceRowsPath);
  const currentPairs = new Map(servingPairs(sourceRows).map((pair) => [pair.key, pair]));
  const outputDir = path.join(packageRoot, "review", `daily-glance-sol-directive-pilot-${dateKey}`);
  fs.mkdirSync(outputDir, { recursive: true });
  const prepared = config.keys.map((target) => {
    const packet = buildPacket(target.key, config);
    const examples = approvedGoodExamples(target.key, sourceRows);
    const resolvedSceneContext = sceneContexts.get(target.key);
    const modelInput = renderSelfAuditWriterInput(packet, config, examples, resolvedSceneContext.packet);
    packet.selfAuditDirectivePath = config.selfAuditDirectivePath;
    packet.resolvedSceneContextPath = path.relative(repoRoot, resolvedSceneContext.contextPath);
    packet.resolvedSceneContext = resolvedSceneContext.packet;
    packet.selfAuditGoodExamples = examples.map((example) => ({ key: example.key, headlineSourceId: example.headlineSourceId, bodySourceId: example.bodySourceId }));
    const lint = selfAuditPacketLint(packet, modelInput, config, examples, currentPairs.get(target.key), resolvedSceneContext.packet);
    if (!lint.passed) throw new Error(`Packet self-lint failed for ${target.key}; refusing to bill.`);
    packet.selfAuditModelInputSha256 = lint.modelInputSha256;
    packet.selfAuditLintRulesSha256 = lint.rulesSha256;
    const slug = target.key.replace(/\//gu, "-");
    writeFile(path.join(outputDir, `${slug}.packet.json`), JSON.stringify(packet, null, 2));
    writeFile(path.join(outputDir, `${slug}.packet-lint.json`), JSON.stringify(lint, null, 2));
    return { key: target.key, slug, modelInput };
  });
  process.stdout.write(`packet self-lint passed for ${prepared.length}/${keys.length} keys; Terra disabled\n`);

  const results = [];
  for (const item of prepared) {
    const writers = await Promise.all(Array.from({ length: config.candidateSamplesPerKey }, () => writerCall(config, item.modelInput)));
    const candidates = writers.map((writer, index) => {
      let candidate = null;
      let parseError = null;
      try { candidate = parseSelfAuditCandidate(writer.raw, item.key); } catch (error) { parseError = error.message; }
      const lint = candidate
        ? lintSelfAuditCandidate(candidate, item.key, config)
        : { passed: false, checks: [], findings: [{ id: "unparseable", reason: parseError || "Unparseable writer output." }] };
      process.stdout.write(`pilot ${item.key} ${index + 1}/${config.candidateSamplesPerKey} lint=${lint.passed}\n`);
      return {
        sample: index + 1,
        approvalStatus: "UNAPPROVED",
        lintDisposition: lint.passed ? "LINT_CLEAN" : "DISCARDED_LINT_FAILURE",
        candidate,
        raw: writer.raw,
        parseError,
        lint,
        provider: {
          model: config.routing.model,
          reasoningEffort: config.routing.reasoningEffort,
          responseId: writer.responseId,
          status: writer.status,
          usage: writer.usage,
          estimatedCostUsd: Number(estimateCost(writer.usage, config).toFixed(6))
        },
        terraJudged: false,
        revisionsMade: 0
      };
    });
    const result = { schemaVersion: 1, key: item.key, status: "UNAPPROVED", terraCalls: 0, winnersSelected: 0, candidates };
    writeFile(path.join(outputDir, `${item.slug}.candidates.json`), JSON.stringify(result, null, 2));
    results.push(result);
  }

  const report = {
    schemaVersion: 1,
    date: dateKey,
    sourceRevision: childProcess.execFileSync("git", ["rev-parse", "HEAD"], { cwd: repoRoot, encoding: "utf8" }).trim(),
    status: "UNAPPROVED",
    writerModel: config.routing.model,
    writerReasoningEffort: config.routing.reasoningEffort,
    candidateSamplesPerKey: config.candidateSamplesPerKey,
    terraCalls: 0,
    winnersSelected: 0,
    servingChanges: 0,
    reviewStatusChanges: 0,
    results,
    summary: summarizeResults(results)
  };
  writeFile(path.join(outputDir, "summary.json"), JSON.stringify(report, null, 2));
  writeFile(path.join(outputDir, "summary.md"), renderMarkdown(report));
  process.stdout.write(`report=${path.relative(repoRoot, path.join(outputDir, "summary.md"))}\n`);
  process.stdout.write(`calls=${report.summary.calls} lintClean=${report.summary.lintClean} noLintClean=${report.summary.noLintCleanCandidateKeys.join(",") || "none"} costUsd=${report.summary.estimatedCostUsd}\n`);
}

if (require.main === module) {
  main().catch((error) => { console.error(error.stack || error.message); process.exit(1); });
}

module.exports = { DEFAULT_KEYS, parseKeys, renderMarkdown, summarizeResults, valueAfter };
