#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { runWritingPipeline } from "../src/astro-writing/runWritingPipeline.mjs";
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
    return result.text;
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
  return text;
}

function modelClient(config, apiKeys, forceRole = null) {
  const client = async (request) => {
    const text = await providerResponse({
      request: forceRole ? { ...request, role: forceRole } : request,
      config,
      apiKeys
    });
    return JSON.parse(text.replace(/^```json\s*|```\s*$/gu, ""));
  };
  client.provider = config.provider;
  client.model = config.model;
  client.reasoningEffort = config.provider === "openai" ? config.reasoningEffort : null;
  client.thinkingLevel = config.provider === "gemini" ? config.thinkingLevel : null;
  return client;
}

const requestPath = argValue("--request");
const outputPath = argValue("--out");
if (!requestPath || !outputPath) throw new Error("Usage: node scripts/run-astro-writing-harness.mjs --request request.json --out result.json --authorize-live");
if (!process.argv.includes("--authorize-live")) throw new Error("No billed call was made. Pass --authorize-live only after explicit owner authorization.");

const request = JSON.parse(fs.readFileSync(path.resolve(requestPath), "utf8"));
const writerConfig = normalizeProviderConfig(request.models?.writer, "writer");
const judgeConfig = normalizeProviderConfig(request.models?.judge, "judge");
const apiKeys = readLocalProviderKeys(repoRoot);
for (const config of [writerConfig, judgeConfig]) {
  const keyName = config.provider === "gemini" ? "GEMINI_API_KEY" : "OPENAI_API_KEY";
  if (!apiKeys[keyName]) throw new Error(`${keyName} is not configured in apps/web/.env.local.`);
}
const writerClient = modelClient(writerConfig, apiKeys);
const reviewerClient = modelClient(judgeConfig, apiKeys, "REVIEWER");
const reviserClient = writerClient;
const result = await runWritingPipeline({
  ...request,
  examples: readJsonl(path.resolve("data/writing/OWNER_APPROVED_EXAMPLES.jsonl")),
  corrections: readJsonl(path.resolve("data/writing/owner-corrections.jsonl")),
  writerClient,
  reviewerClient,
  reviserClient
});
result.ownerStatus = "PENDING OWNER";
result.candidateHistory = {
  writer: { provider: writerConfig.provider, model: writerConfig.model },
  judge: { provider: judgeConfig.provider, model: judgeConfig.model },
  ownerStatus: "PENDING OWNER",
  approvalEffect: "none"
};
fs.mkdirSync(path.dirname(path.resolve(outputPath)), { recursive: true });
fs.writeFileSync(path.resolve(outputPath), `${JSON.stringify(result, null, 2)}\n`);
console.log(JSON.stringify(result.report, null, 2));
