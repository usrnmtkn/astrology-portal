#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import process from "node:process";

import localProviderKeys from "../src/astro-writing/localProviderKeys.cjs";
import openAIResponses from "../src/astro-writing/openAIResponses.cjs";
import {
  NATAL_QA_RUBRIC_PATH,
  NATAL_QA_RUBRIC_SHA256,
  NATAL_QA_VERSION,
  validateNatalQaContract
} from "./validate-natal-chart-content-qa.mjs";

const { readLocalProviderKeys } = localProviderKeys;
const { callOpenAIResponses } = openAIResponses;
const repoRoot = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const verdicts = new Set(["PASS", "EDIT", "CUT", "SOURCE_GAP"]);
const defectClasses = new Set([
  "astrology-restated",
  "translation-required",
  "real-filler",
  "scaffold-grammar",
  "trait-first",
  "decorative-evidence",
  "premature-complication",
  "trait-naming",
  "whether",
  "other-named"
]);
const pricingPerMillion = { input: 2, cachedInput: 0.2, cacheWrite: 2.5, output: 12 };

function arg(name, fallback = null) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : fallback;
}

function integerArg(name, fallback) {
  const value = Number.parseInt(arg(name, String(fallback)), 10);
  if (!Number.isInteger(value) || value < 1) throw new Error(`${name} must be a positive integer.`);
  return value;
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function writeJsonAtomic(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  const temporaryPath = `${filePath}.tmp`;
  fs.writeFileSync(temporaryPath, `${JSON.stringify(value, null, 2)}\n`);
  fs.renameSync(temporaryPath, filePath);
}

function outputText(payload) {
  return payload.output_text ?? (payload.output ?? [])
    .flatMap((item) => item.content ?? [])
    .map((item) => item.text)
    .filter(Boolean)
    .join("\n");
}

function usageZero() {
  return { inputTokens: 0, cachedInputTokens: 0, cacheWriteTokens: 0, outputTokens: 0, totalTokens: 0 };
}

function normalizeUsage(value = {}) {
  return {
    inputTokens: value.input_tokens ?? 0,
    cachedInputTokens: value.input_tokens_details?.cached_tokens ?? 0,
    cacheWriteTokens: value.input_tokens_details?.cache_write_tokens ?? 0,
    outputTokens: value.output_tokens ?? 0,
    totalTokens: value.total_tokens ?? 0
  };
}

function addUsage(total, addition) {
  for (const key of Object.keys(total)) total[key] += addition[key] ?? 0;
  return total;
}

function estimateCostUsd(usage) {
  const uncachedInput = Math.max(0, usage.inputTokens - usage.cachedInputTokens - usage.cacheWriteTokens);
  return (
    uncachedInput * pricingPerMillion.input
    + usage.cachedInputTokens * pricingPerMillion.cachedInput
    + usage.cacheWriteTokens * pricingPerMillion.cacheWrite
    + usage.outputTokens * pricingPerMillion.output
  ) / 1_000_000;
}

function checkpointKey(item) {
  return `${item.renderKey}|${item.renderedTextSha256}`;
}

function sentenceCount(value) {
  return String(value).trim().split(/(?<=[.!?])\s+/u).filter(Boolean).length;
}

function canonicalItem(item) {
  const occurrence = item.occurrences?.[0];
  if (!occurrence?.renderKey) throw new Error(`Inventory item ${item.reviewId} has no stable render key.`);
  return {
    reviewId: item.reviewId,
    family: occurrence.family,
    surface: item.surface,
    renderKey: occurrence.renderKey,
    renderKeys: item.occurrences.map((entry) => entry.renderKey),
    renderedText: item.renderedText,
    renderedTextSha256: item.renderedTextSha256,
    deterministicFindings: item.deterministicFindings ?? []
  };
}

function batchSchema(expectedCount) {
  return {
    type: "object",
    additionalProperties: false,
    properties: {
      results: {
        type: "array",
        minItems: expectedCount,
        maxItems: expectedCount,
        items: {
          type: "object",
          additionalProperties: false,
          properties: {
            passageId: { type: "string", pattern: "^p[0-9]{2}$" },
            coreMessage: { type: "string", minLength: 3, maxLength: 500 },
            verdict: { type: "string", enum: [...verdicts] },
            defectClass: { type: ["string", "null"], enum: [null, ...defectClasses] },
            otherDefectName: { type: ["string", "null"], maxLength: 120 },
            diagnosis: { type: "string", minLength: 3, maxLength: 700 }
          },
          required: ["passageId", "coreMessage", "verdict", "defectClass", "otherDefectName", "diagnosis"]
        }
      }
    },
    required: ["results"]
  };
}

function instructions(rubric) {
  return `ROLE: NATAL WHOLE-PASSAGE SEMANTIC QA JUDGE

This is an advisory cold-reading audit. Read only each supplied rendered_text. Do not infer anything from its opaque passage_id. Do not use source rows, render keys, chart facts, drafting context, or outside astrology knowledge.

For every passage, first state its single core message in one plain sentence. Then assign exactly one verdict:
- PASS: the entire passage develops one coherent, intelligible message.
- EDIT: a coherent message exists, but one or more parts materially interrupt or weaken it and can be repaired.
- CUT: the passage has no recoverable single message, contains fundamentally competing messages, or is assembled rather than written.
- SOURCE_GAP: the rendered text itself is too incomplete to judge; do not use this merely for weak writing.

For EDIT or CUT, select the primary defect class:
- astrology-restated: labels or astrology repeat the setup instead of adding lived meaning.
- translation-required: abstract, clever, compressed, technical, or unclear language must be mentally translated.
- real-filler: a sentence sounds plausible but adds no concrete meaning or evidence.
- scaffold-grammar: frame/slot composition produces mechanical, mismatched, repetitive, or unnatural grammar.
- trait-first: the passage leads with a declared trait instead of making the lived recurring pattern intelligible.
- decorative-evidence: an example decorates the paragraph but does not support its core message.
- premature-complication: a warning, shadow, or exception arrives before the central message is established.
- trait-naming: adjectives or labels substitute for showing behavior and consequence.
- whether: the governed whether construction materially weakens or abstracts the sentence.
- other-named: another primary defect; name it plainly in otherDefectName.

PASS and SOURCE_GAP must use null for defectClass and otherDefectName. EDIT and CUT must use a defectClass. otherDefectName must be non-null only with other-named. diagnosis must explain the whole-passage flow judgment concisely; do not rewrite the passage. Return one result for every supplied passage_id in the same order. Never omit, duplicate, or reorder an id.

VERSIONED WHOLE-PASSAGE RUBRIC
${rubric}`;
}

function validateBatchResponse(batch, response) {
  if (!response || !Array.isArray(response.results) || response.results.length !== batch.length) {
    throw new Error(`Expected ${batch.length} semantic results.`);
  }
  const expectedIds = batch.map((_, index) => `p${String(index + 1).padStart(2, "0")}`);
  response.results.forEach((result, index) => {
    if (result.passageId !== expectedIds[index]) throw new Error(`Semantic result order mismatch at ${expectedIds[index]}.`);
    if (!result.coreMessage?.trim()) throw new Error(`${result.passageId} omitted its core message.`);
    if (sentenceCount(result.coreMessage) !== 1) throw new Error(`${result.passageId} core message must be exactly one sentence.`);
    if (!verdicts.has(result.verdict)) throw new Error(`${result.passageId} returned invalid verdict ${result.verdict}.`);
    if (result.verdict === "EDIT" || result.verdict === "CUT") {
      if (!defectClasses.has(result.defectClass)) throw new Error(`${result.passageId} omitted a valid defect class.`);
      if (result.defectClass === "other-named" && !result.otherDefectName?.trim()) throw new Error(`${result.passageId} must name its other defect.`);
      if (result.defectClass !== "other-named" && result.otherDefectName !== null) throw new Error(`${result.passageId} may not name an extra defect.`);
    } else if (result.defectClass !== null || result.otherDefectName !== null) {
      throw new Error(`${result.passageId} ${result.verdict} must not carry a defect class.`);
    }
    if (!result.diagnosis?.trim()) throw new Error(`${result.passageId} omitted its diagnosis.`);
  });
}

function chunks(items, size) {
  const result = [];
  for (let index = 0; index < items.length; index += size) result.push(items.slice(index, index + size));
  return result;
}

const inventoryPath = path.resolve(arg("--inventory", path.join(repoRoot, "artifacts/natal-chart-content-qa-inventory-2026-08-12.json")));
const checkpointPath = path.resolve(arg("--checkpoint", path.join(repoRoot, "artifacts/natal-chart-content-qa-semantic-checkpoint-2026-08-12.json")));
const resultsPath = path.resolve(arg("--results", path.join(repoRoot, "packages/astro-knowledge/review/natal-chart-content-qa-semantic-results-2026-08-12.json")));
const providerEnvRoot = arg("--provider-env-root");
const batchSize = integerArg("--batch-size", 20);
const concurrency = integerArg("--concurrency", 4);
const maxBatches = process.argv.includes("--max-batches") ? integerArg("--max-batches", 1) : Number.POSITIVE_INFINITY;
const model = arg("--model", "gpt-5.6-terra");
const reasoningEffort = arg("--reasoning-effort", "medium");
const dryRun = process.argv.includes("--dry-run");
const preflightCalls = Number.parseInt(arg("--preflight-calls", "0"), 10);
const preflightInputTokens = Number.parseInt(arg("--preflight-input-tokens", "0"), 10);
const preflightOutputTokens = Number.parseInt(arg("--preflight-output-tokens", "0"), 10);
const abandonedInFlightAttempts = Number.parseInt(arg("--abandoned-in-flight-attempts", "0"), 10);
for (const [name, value] of Object.entries({ preflightCalls, preflightInputTokens, preflightOutputTokens, abandonedInFlightAttempts })) {
  if (!Number.isInteger(value) || value < 0) throw new Error(`${name} must be a non-negative integer.`);
}

validateNatalQaContract();
const inventory = readJson(inventoryPath);
if (inventory.rubric?.sha256 !== NATAL_QA_RUBRIC_SHA256) throw new Error("Inventory rubric hash does not match the active Natal QA rubric.");
const items = inventory.reviewQueue.map(canonicalItem);
const deferred = items.filter((item) => item.surface === "friend" && item.deterministicFindings.includes("friend_second_person_leak"));
const eligible = items.filter((item) => !(item.surface === "friend" && item.deterministicFindings.includes("friend_second_person_leak")));
if (items.length !== 8110 || deferred.length !== 408 || eligible.length !== 7702) {
  throw new Error(`Inventory cardinality mismatch: ${items.length} total, ${deferred.length} deferred, ${eligible.length} eligible.`);
}

const checkpoint = fs.existsSync(checkpointPath)
  ? readJson(checkpointPath)
  : {
      schemaVersion: "natal-chart-content-semantic-checkpoint-v1",
      rubric: { path: NATAL_QA_RUBRIC_PATH, sha256: NATAL_QA_RUBRIC_SHA256 },
      model,
      reasoningEffort,
      completed: {},
      calls: [],
      usage: usageZero()
    };
if (checkpoint.model !== model || checkpoint.reasoningEffort !== reasoningEffort) {
  throw new Error(`Checkpoint model mismatch: ${checkpoint.model}/${checkpoint.reasoningEffort}.`);
}
const pending = eligible.filter((item) => !checkpoint.completed[checkpointKey(item)]);
const pendingBatches = chunks(pending, batchSize).slice(0, maxBatches);

if (dryRun) {
  console.log(JSON.stringify({ total: items.length, deferred: deferred.length, eligible: eligible.length, completed: Object.keys(checkpoint.completed).length, pending: pending.length, plannedBatches: pendingBatches.length, batchSize, concurrency, model, reasoningEffort }, null, 2));
  process.exit(0);
}
if (!process.argv.includes("--authorize-live")) throw new Error("No billed call was made. Pass --authorize-live only after explicit owner authorization.");
if (!providerEnvRoot) throw new Error("--provider-env-root is required so the rotated credential source is explicit.");
const apiKey = readLocalProviderKeys(path.resolve(providerEnvRoot)).OPENAI_API_KEY;
if (!apiKey?.startsWith("sk-") || apiKey.length < 40 || apiKey === "[SENSITIVE]") throw new Error("OPENAI_API_KEY failed structural validation.");
const rubric = fs.readFileSync(path.join(repoRoot, NATAL_QA_RUBRIC_PATH), "utf8");
const taskInstructions = instructions(rubric);

let nextBatchIndex = 0;
let failure = null;
async function worker(workerIndex) {
  while (!failure) {
    const localBatchIndex = nextBatchIndex;
    nextBatchIndex += 1;
    if (localBatchIndex >= pendingBatches.length) return;
    const batch = pendingBatches[localBatchIndex];
    const opaqueInput = batch.map((item, index) => ({
      passage_id: `p${String(index + 1).padStart(2, "0")}`,
      rendered_text: item.renderedText
    }));
    try {
      const startedAt = new Date().toISOString();
      const { response, payload } = await callOpenAIResponses({
        apiKey,
        role: "COLD_REVIEWER",
        taskInstructions,
        request: {
          model,
          input: JSON.stringify({ passages: opaqueInput }),
          reasoning: { effort: reasoningEffort },
          max_output_tokens: Math.max(3000, batch.length * 350),
          text: { format: { type: "json_schema", name: "natal_whole_passage_semantic_batch", strict: true, schema: batchSchema(batch.length) } }
        }
      });
      if (!response.ok) throw new Error(payload.error?.message ?? `OpenAI semantic QA failed with HTTP ${response.status}.`);
      const text = outputText(payload);
      if (!text) throw new Error("OpenAI semantic QA returned no structured output.");
      const parsed = JSON.parse(text);
      validateBatchResponse(batch, parsed);
      const callUsage = normalizeUsage(payload.usage);
      parsed.results.forEach((result, index) => {
        const item = batch[index];
        checkpoint.completed[checkpointKey(item)] = {
          reviewId: item.reviewId,
          family: item.family,
          surface: item.surface,
          renderKey: item.renderKey,
          renderKeys: item.renderKeys,
          renderedTextSha256: item.renderedTextSha256,
          coreMessage: result.coreMessage.trim(),
          verdict: result.verdict,
          defectClass: result.defectClass,
          otherDefectName: result.otherDefectName,
          diagnosis: result.diagnosis.trim(),
          deterministicFindings: item.deterministicFindings,
          provider: { responseId: payload.id ?? null, responseModel: payload.model ?? model }
        };
      });
      addUsage(checkpoint.usage, callUsage);
      checkpoint.calls.push({
        responseId: payload.id ?? null,
        requestedModel: model,
        responseModel: payload.model ?? model,
        reasoningEffort,
        startedAt,
        completedAt: new Date().toISOString(),
        passageCount: batch.length,
        firstKey: checkpointKey(batch[0]),
        lastKey: checkpointKey(batch.at(-1)),
        usage: callUsage
      });
      checkpoint.updatedAt = new Date().toISOString();
      writeJsonAtomic(checkpointPath, checkpoint);
      const complete = Object.keys(checkpoint.completed).length;
      process.stdout.write(`worker ${workerIndex}: call ${checkpoint.calls.length}, ${complete}/${eligible.length} complete, $${estimateCostUsd(checkpoint.usage).toFixed(4)} estimated\n`);
    } catch (error) {
      failure = error;
      return;
    }
  }
}

await Promise.all(Array.from({ length: Math.min(concurrency, pendingBatches.length) }, (_, index) => worker(index + 1)));
if (failure) throw failure;

const completedRows = Object.values(checkpoint.completed).sort((a, b) => a.renderKey.localeCompare(b.renderKey));
const deferredRows = deferred.map((item) => ({
  reviewId: item.reviewId,
  family: item.family,
  surface: item.surface,
  renderKey: item.renderKey,
  renderKeys: item.renderKeys,
  renderedTextSha256: item.renderedTextSha256,
  status: "deferred-pending-pass-2",
  deterministicFindings: item.deterministicFindings,
  verdict: null,
  coreMessage: null,
  defectClass: "friend-second-person-leakage",
  otherDefectName: null,
  diagnosis: "Deferred without a billed judgment because the known Friend second-person leakage changes when the fail-closed repair and pass 2 land."
}));
const finalComplete = completedRows.length === eligible.length;
const preflightUsage = { inputTokens: preflightInputTokens, cachedInputTokens: 0, cacheWriteTokens: 0, outputTokens: preflightOutputTokens, totalTokens: preflightInputTokens + preflightOutputTokens };
const knownUsageIncludingPreflight = addUsage({ ...checkpoint.usage }, preflightUsage);
const knownEstimatedCostUsd = estimateCostUsd(knownUsageIncludingPreflight);
const averageSuccessfulBatchCostUsd = checkpoint.calls.length ? estimateCostUsd(checkpoint.usage) / checkpoint.calls.length : 0;
const result = {
  schemaVersion: "natal-chart-content-semantic-results-v1",
  generatedAt: new Date().toISOString(),
  status: finalComplete ? "complete" : "running",
  rubric: { path: NATAL_QA_RUBRIC_PATH, sha256: NATAL_QA_RUBRIC_SHA256 },
  inventory: { path: path.relative(repoRoot, inventoryPath), distinctPassages: items.length, eligiblePassages: eligible.length, deferredPassages: deferred.length },
  provider: {
    provider: "openai",
    requestedModel: model,
    reasoningEffort,
    successfulBatchCalls: checkpoint.calls.length,
    preflightCalls,
    abandonedInFlightAttempts,
    totalRequestsIssued: checkpoint.calls.length + preflightCalls + abandonedInFlightAttempts,
    batchUsage: checkpoint.usage,
    preflightUsage,
    knownUsageIncludingPreflight,
    estimatedCostUsd: knownEstimatedCostUsd,
    estimatedCostUpperBoundUsd: knownEstimatedCostUsd + abandonedInFlightAttempts * averageSuccessfulBatchCostUsd,
    pricingPerMillion
  },
  governance: { advisoryOnly: true, servingChanges: false, copyChanges: false, approvalChanges: false, autoPublish: false, writerPromotion: false },
  summary: { completed: completedRows.length, pending: eligible.length - completedRows.length, deferredPendingPass2: deferredRows.length },
  results: [...completedRows, ...deferredRows].sort((a, b) => a.renderKey.localeCompare(b.renderKey))
};
writeJsonAtomic(resultsPath, result);
console.log(JSON.stringify({ resultsPath, checkpointPath, status: result.status, ...result.summary, successfulBatchCalls: checkpoint.calls.length, preflightCalls, abandonedInFlightAttempts, totalRequestsIssued: result.provider.totalRequestsIssued, knownUsageIncludingPreflight, estimatedCostUsd: result.provider.estimatedCostUsd, estimatedCostUpperBoundUsd: result.provider.estimatedCostUpperBoundUsd }, null, 2));
