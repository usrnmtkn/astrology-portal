#!/usr/bin/env node

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { failedRetrievalResult, runWritingPipeline } from "../src/astro-writing/runWritingPipeline.mjs";
import { resolveAstrology } from "../src/astro-writing/resolveAstrology.mjs";
import { retrieveOwnerContext } from "../src/astro-writing/retrieveOwnerContext.mjs";
import { assertPositiveOwnerEvidenceContext, OwnerEvidencePreconditionError } from "../src/astro-writing/ownerEvidencePolicy.mjs";
import {
  exactDelimitedPassage,
  ownerPositiveEvidenceFromApprovedTaskPassages,
  ownerPositiveEvidenceFromSurfaceQualifiedPool,
  ownerLockedLilithV5Evidence,
  ownerApprovedMatrixRoleEvidenceForTarget,
  ownerRelevantEvidenceFromVoiceIndex,
  ownerPositiveEvidenceFromVoiceIndexBySourceIds
} from "../src/astro-writing/ownerPositiveEvidence.mjs";
import { sceneEvidenceForTarget } from "../src/astro-writing/sceneEvidence.mjs";
import { matrixSceneNounLexicon } from "../src/astro-writing/matrixEvidenceIndex.mjs";
import { getContentSpine } from "../src/astro-writing/spineRegistry.mjs";
import { loadPhraseEvidenceIndex } from "../src/astro-writing/phraseEvidence.mjs";
import { withoutOwnerRejectedEvidence } from "../src/astro-writing/ownerEvidenceRejections.mjs";
import geminiInteractions from "../src/astro-writing/geminiInteractions.cjs";
import localProviderKeys from "../src/astro-writing/localProviderKeys.cjs";
import offlineProviderConfig from "../src/astro-writing/offlineProviderConfig.cjs";
import openAIResponses from "../src/astro-writing/openAIResponses.cjs";

const { callGeminiInteractions } = geminiInteractions;
const { readLocalProviderKeys } = localProviderKeys;
const { normalizeProviderConfig } = offlineProviderConfig;
const { callOpenAIResponses } = openAIResponses;
const repoRoot = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");

function argValue(name) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : null;
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

async function providerResponse({ request, config, apiKeys }) {
  const { stage, role, instructions, input, schema } = request;
  if (!instructions) throw new Error(`Harness ${role} call omitted its canonical instruction contract.`);
  if (config.provider === "gemini") {
    const structuredInput = `${input}\n\nOUTPUT JSON SCHEMA\n${JSON.stringify(schema, null, 2)}`;
    const result = await callGeminiInteractions({
      apiKey: apiKeys.GEMINI_API_KEY,
      model: config.model,
      systemInstruction: instructions,
      input: structuredInput,
      thinkingLevel: config.thinkingLevel
    });
    return { text: result.text, usage: result.usage ?? null };
  }
  const { response, payload } = await callOpenAIResponses({
    apiKey: apiKeys.OPENAI_API_KEY,
    role,
    request: {
      model: config.model,
      input,
      reasoning: { effort: config.reasoningEffort },
      max_output_tokens: config.maxOutputTokens,
      text: { format: { type: "json_schema", name: `tldr_astro_${stage}`, strict: true, schema } }
    }
  });
  if (!response.ok) throw new Error(payload.error?.message ?? `OpenAI ${stage} failed with ${response.status}.`);
  const text = outputText(payload);
  if (!text) throw new Error(`OpenAI ${stage} returned no structured output.`);
  return { text, usage: payload.usage ?? null };
}

function modelClient(config, apiKeys, forceRole = null) {
  const client = async (request) => {
    client.lastRequest = request;
    const providerResult = await providerResponse({
      request: forceRole ? { ...request, role: forceRole } : request,
      config,
      apiKeys
    });
    const text = typeof providerResult === "string" ? providerResult : providerResult.text;
    client.lastUsage = providerResult?.usage ?? null;
    return JSON.parse(text.replace(/^```json\s*|```\s*$/gu, ""));
  };
  client.provider = config.provider;
  client.model = config.model;
  client.reasoningEffort = config.provider === "openai" ? config.reasoningEffort : null;
  client.thinkingLevel = config.provider === "gemini" ? config.thinkingLevel : null;
  client.billed = true;
  client.lastUsage = null;
  client.lastRequest = null;
  return client;
}

const requestPath = argValue("--request");
const outputPath = argValue("--out");
const transmittedPacketPath = argValue("--packet-out");
if (!requestPath || !outputPath) throw new Error("Usage: node scripts/run-astro-writing-harness.mjs --request request.json --out result.json [--authorize-live]");

const request = JSON.parse(fs.readFileSync(path.resolve(requestPath), "utf8"));
const willDraft = request.approvedArgumentOutline?.ownerApproved === true;
const corrections = [
  ...readJsonl(path.resolve("data/writing/owner-corrections.jsonl")),
  ...readJsonl(path.resolve("data/writing/owner-feedback-corpus.jsonl"))
];
const registerGoldExamples = JSON.parse(fs.readFileSync(path.resolve("data/writing/owner-register-gold.json"), "utf8"));
const surfaceQualifiedPool = JSON.parse(fs.readFileSync(
  path.resolve("packages/astro-knowledge/voice/tldr-astro/satori-writer/surface-qualified-positive-exemplars-v2.json"),
  "utf8"
));
const approvedTaskPassageManifest = JSON.parse(fs.readFileSync(
  path.resolve("data/writing/owner-supplied-structural-exemplars.json"),
  "utf8"
));
const approvedTaskPassages = ownerPositiveEvidenceFromApprovedTaskPassages(
  approvedTaskPassageManifest.entries.map((entry) => ({
    ...entry,
    text: (() => {
      const text = exactDelimitedPassage(entry, fs.readFileSync(path.resolve(entry.sourcePath), "utf8"));
      const digest = crypto.createHash("sha256").update(text).digest("hex");
      if (digest !== entry.exactTextSha256) throw new Error(`OWNER_TASK_PASSAGE_HASH_MISMATCH:${entry.id}`);
      return text;
    })()
  }))
);
const rawVoiceIndex = JSON.parse(fs.readFileSync(
  path.resolve("packages/astro-knowledge/voice/tldr-astro/satori-writer/voice-index.json"),
  "utf8"
));
const voiceIndex = {
  ...rawVoiceIndex,
  entries: withoutOwnerRejectedEvidence(rawVoiceIndex.entries, corrections)
};
const approvedExamples = withoutOwnerRejectedEvidence(
  readJsonl(path.resolve("data/writing/OWNER_APPROVED_EXAMPLES.jsonl")),
  corrections
);
const matrixEvidenceRows = withoutOwnerRejectedEvidence(
  readJsonl(path.resolve("data/writing/matrix-evidence-index/TLDR-Matrix-Evidence-Index.jsonl")),
  corrections,
  "copy"
);
const lilithV5Rows = JSON.parse(fs.readFileSync(
  path.resolve("packages/astro-knowledge/review/lilith-placements-v5/lilith-placements-v5-staged-rows.json"),
  "utf8"
)).rows;
const phraseEvidence = loadPhraseEvidenceIndex(path.resolve("data/writing/phrase-evidence-index/owner-phrase-evidence-v1.jsonl"));
const relevantOwnerEvidence = ownerRelevantEvidenceFromVoiceIndex(voiceIndex, {
  planet: request.meaningInput?.object,
  sign: request.meaningInput?.sign
});
const examples = [
  ...ownerPositiveEvidenceFromSurfaceQualifiedPool(surfaceQualifiedPool),
  ...approvedTaskPassages,
  ...ownerLockedLilithV5Evidence(lilithV5Rows),
  ...relevantOwnerEvidence.selected,
  ...ownerPositiveEvidenceFromVoiceIndexBySourceIds(
    voiceIndex,
    request.additionalOwnerEvidenceSourceIds,
    surfaceQualifiedPool.surface
  )
];
const matrixRoleEvidence = ownerApprovedMatrixRoleEvidenceForTarget(matrixEvidenceRows, {
  planet: request.meaningInput?.object,
  sign: request.meaningInput?.sign,
  house: request.meaningInput?.house ?? null,
  eventType: request.meaningInput?.eventType ?? (request.meaningInput?.contentType === "placement_article" ? "ingress" : null),
  surface: request.surface
});
const matrixExamples = matrixRoleEvidence.meaning;
const sceneEvidence = sceneEvidenceForTarget({
  approvedExamples,
  matrixEvidenceRows,
  registerExamples: examples,
  sceneNounLexicon: matrixSceneNounLexicon(matrixEvidenceRows),
  plan: await resolveAstrology(request.meaningInput)
});
if (willDraft) {
  const plan = await resolveAstrology(request.meaningInput);
  let context = null;
  try {
    context = retrieveOwnerContext(plan, {
      examples,
      matrixExamples,
      matrixArgumentCandidates: matrixRoleEvidence.argument_candidate,
      matrixEvidenceAvailableCount: matrixExamples.length,
      relevantOwnerPassagesAvailableCount: relevantOwnerEvidence.counts.selected,
      ownerPassageRelevanceTier: relevantOwnerEvidence.tier,
      sceneExamples: sceneEvidence.selected,
      samePlanetSignSceneAvailableCount: sceneEvidence.counts.samePlanetSignSceneAvailable,
      sceneEvidenceInventoryCounts: sceneEvidence.counts,
      argumentSource: request.argumentSource,
      registerGoldExamples,
      corrections,
      contentFamily: request.family,
      register: request.register,
      excludedEvidenceContentKeys: request.excludedEvidenceContentKeys,
      preferredEvidenceContentKeys: request.preferredEvidenceContentKeys,
      phraseEvidence
    });
    assertPositiveOwnerEvidenceContext(context, { family: request.family });
  } catch (error) {
    if (!(error instanceof OwnerEvidencePreconditionError)) throw error;
    const failed = failedRetrievalResult({
      plan,
      context,
      argumentOutline: request.approvedArgumentOutline,
      spine: getContentSpine(request.family),
      error
    });
    failed.ownerStatus = "PENDING OWNER";
    failed.candidateHistory = {
      writer: null,
      proseModelGate: "none_owner_gate_permanent",
      ownerStatus: "PENDING OWNER",
      approvalEffect: "none"
    };
    fs.mkdirSync(path.dirname(path.resolve(outputPath)), { recursive: true });
    fs.writeFileSync(path.resolve(outputPath), `${JSON.stringify(failed, null, 2)}\n`);
    console.log(JSON.stringify(failed.report, null, 2));
    process.exit(0);
  }
}
if (willDraft && !process.argv.includes("--authorize-live")) {
  throw new Error("No billed call was made. Pass --authorize-live only after explicit owner authorization.");
}
const writerConfig = willDraft ? normalizeProviderConfig(request.models?.writer, "writer") : null;
const apiKeys = willDraft ? readLocalProviderKeys(repoRoot) : {};
for (const config of willDraft ? [writerConfig] : []) {
  const keyName = config.provider === "gemini" ? "GEMINI_API_KEY" : "OPENAI_API_KEY";
  if (!apiKeys[keyName]) throw new Error(`${keyName} is not configured in apps/web/.env.local.`);
}
const writerClient = willDraft ? modelClient(writerConfig, apiKeys) : null;
const result = await runWritingPipeline({
  ...request,
  examples,
  matrixExamples,
  matrixArgumentCandidates: matrixRoleEvidence.argument_candidate,
  matrixEvidenceAvailableCount: matrixExamples.length,
  relevantOwnerPassagesAvailableCount: relevantOwnerEvidence.counts.selected,
  ownerPassageRelevanceTier: relevantOwnerEvidence.tier,
  sceneExamples: sceneEvidence.selected,
  samePlanetSignSceneAvailableCount: sceneEvidence.counts.samePlanetSignSceneAvailable,
  sceneEvidenceInventoryCounts: sceneEvidence.counts,
  argumentSource: request.argumentSource,
  registerGoldExamples,
  corrections,
  phraseEvidence,
  writerClient
});
if (result.report && writerClient?.lastUsage) result.report.modelUsage = writerClient.lastUsage;
if (result.report && transmittedPacketPath && writerClient?.lastRequest) {
  const packetRecord = {
    transmittedAt: new Date().toISOString(),
    provider: writerConfig.provider,
    model: writerConfig.model,
    reasoningEffort: writerConfig.reasoningEffort,
    maxOutputTokens: writerConfig.maxOutputTokens,
    reviewerCalls: 0,
    retries: 0,
    request: writerClient.lastRequest
  };
  fs.mkdirSync(path.dirname(path.resolve(transmittedPacketPath)), { recursive: true });
  fs.writeFileSync(path.resolve(transmittedPacketPath), `${JSON.stringify(packetRecord, null, 2)}\n`);
  result.report.transmittedPacket = path.relative(repoRoot, path.resolve(transmittedPacketPath));
}
result.ownerStatus = "PENDING OWNER";
result.candidateHistory = {
  writer: writerConfig ? { provider: writerConfig.provider, model: writerConfig.model } : null,
  proseModelGate: "none_owner_gate_permanent",
  ownerStatus: "PENDING OWNER",
  approvalEffect: "none"
};
fs.mkdirSync(path.dirname(path.resolve(outputPath)), { recursive: true });
fs.writeFileSync(path.resolve(outputPath), `${JSON.stringify(result, null, 2)}\n`);
console.log(JSON.stringify(result.report, null, 2));
