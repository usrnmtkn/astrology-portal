#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { createRequire } from "node:module";
import {
  CARD_JUDGE_V3_1_RUN_2C_ARTIFACT_PATH,
  CARD_JUDGE_V3_1_RUN_2C_CALL_BUDGET,
  CARD_JUDGE_V3_1_SCHEMA,
  assertCardJudgeV31Run2cAuthorization,
  cardJudgeV31PacketPrompt,
  evaluateCardJudgeV31
} from "../src/astro-writing/cardJudgeV31.mjs";
import {
  evaluateCardJudgeV31Contract,
  loadCardJudgeV31FixtureSet
} from "./card-judge-v3-1-fixtures.mjs";

const require = createRequire(import.meta.url);
const { loadLocalEnv } = require("../packages/astro-knowledge/scripts/daily-glance-writer-runtime.js");
const { callOpenAIResponses } = require("../src/astro-writing/openAIResponses.cjs");

function responseText(payload) {
  return payload.output_text ?? (payload.output ?? [])
    .flatMap((item) => item.content ?? [])
    .map((item) => item.text)
    .filter(Boolean)
    .join("\n");
}

loadLocalEnv();
const calibrationEnvPath = process.env.ASTRO_WRITING_CALIBRATION_ENV_FILE;
if (!process.env.OPENAI_API_KEY && calibrationEnvPath) {
  const calibrationEnv = fs.readFileSync(path.resolve(calibrationEnvPath), "utf8");
  const keyMatch = calibrationEnv.match(/^OPENAI_API_KEY=(.*)$/mu);
  if (keyMatch) process.env.OPENAI_API_KEY = keyMatch[1].trim().replace(/^(["'])(.*)\1$/u, "$2");
}
if (!process.env.OPENAI_API_KEY?.startsWith("sk-") || process.env.OPENAI_API_KEY.length < 40 || process.env.OPENAI_API_KEY === "[SENSITIVE]") {
  throw new Error("OPENAI_API_KEY failed the local structural preflight. No artifact or billed call was created.");
}

const outputPath = path.resolve(process.env.ASTRO_WRITING_V3_1_RUN_2C_OUTPUT ?? CARD_JUDGE_V3_1_RUN_2C_ARTIFACT_PATH);
const authorization = assertCardJudgeV31Run2cAuthorization({ artifactExists: fs.existsSync(outputPath) });
const { manifest, cases } = loadCardJudgeV31FixtureSet();
const fixture = cases.find((entry) => entry.fixtureId === "neg-gemini-advocacy" && entry.kind === "negative");
if (!fixture || CARD_JUDGE_V3_1_RUN_2C_CALL_BUDGET !== 1 || manifest.proposedLiveRun.calls !== 1) {
  throw new Error("V3.1 run 2c must contain exactly the frozen neg-gemini-advocacy call.");
}
if (manifest.proposedLiveRun.model !== "gpt-5.6-terra" || manifest.proposedLiveRun.reasoningEffort !== "high" || manifest.proposedLiveRun.retries !== 0) {
  throw new Error("V3.1 run 2c model, reasoning, or retry contract drifted.");
}

const rubricPath = "tldr-astro-phrasebank/TLDR-CARD-JUDGE-RUBRIC-V3-1-DRAFT.md";
const rubric = fs.readFileSync(rubricPath, "utf8");
const startedAt = new Date().toISOString();
const rows = [];

function writeArtifact(status, error = null) {
  fs.writeFileSync(outputPath, `${JSON.stringify({
    version: "card-judge-v3.1-live-evaluation-run-2c",
    status,
    startedAt,
    completedAt: status === "running" ? null : new Date().toISOString(),
    completedCalls: rows.length,
    authorization,
    model: manifest.proposedLiveRun.model,
    reasoningEffort: manifest.proposedLiveRun.reasoningEffort,
    retries: manifest.proposedLiveRun.retries,
    preserves: manifest.preservedErroredRuns.concat(manifest.preservedEvaluationRuns.map((run) => run.path)),
    writerPromotionAuthorized: false,
    error,
    rows
  }, null, 2)}\n`);
}

writeArtifact("running");
try {
  const prompt = cardJudgeV31PacketPrompt(rubric, fixture.packet);
  const { response, payload } = await callOpenAIResponses({
    apiKey: process.env.OPENAI_API_KEY,
    role: "CARD_REVIEWER_V3",
    request: {
      model: manifest.proposedLiveRun.model,
      input: prompt,
      reasoning: { effort: manifest.proposedLiveRun.reasoningEffort },
      max_output_tokens: 4000,
      text: { format: { type: "json_schema", name: "tldr_card_judge_v3_1_run_2c", strict: true, schema: CARD_JUDGE_V3_1_SCHEMA } }
    }
  });
  if (!response.ok) throw new Error(payload.error?.message ?? `Card judge failed with ${response.status}.`);
  const text = responseText(payload);
  if (!text) throw new Error("Card judge returned no structured output for neg-gemini-advocacy.");
  const evaluation = evaluateCardJudgeV31({ packet: fixture.packet, modelOutput: JSON.parse(text) });
  const categories = [...new Set(evaluation.findings.map((finding) => finding.category))];
  const contract = evaluateCardJudgeV31Contract({ fixture, verdict: evaluation.verdict, categories });
  const validMechanismIds = new Set(fixture.packet.mechanismRecord.elements.map((element) => element.id));
  const citationCompliance = evaluation.findings.every((finding) =>
    finding.mechanism_citations.length > 0
    && finding.mechanism_citations.every((citation) => validMechanismIds.has(citation))
  );
  rows.push({
    call: 1,
    fixtureId: fixture.fixtureId,
    expectedVerdict: fixture.expectedVerdict,
    requiredCategories: fixture.targetCategories,
    verdict: evaluation.verdict,
    categories,
    contract: { ...contract, passed: contract.passed && citationCompliance },
    citationCompliance,
    findings: evaluation.findings,
    provider: { responseId: payload.id ?? null, responseModel: payload.model ?? manifest.proposedLiveRun.model, usage: payload.usage ?? null }
  });
  writeArtifact(rows[0].contract.passed ? "passed" : "failed");
  if (!rows[0].contract.passed) process.exitCode = 1;
} catch (error) {
  writeArtifact("errored", error instanceof Error ? error.message : String(error));
  throw error;
}
