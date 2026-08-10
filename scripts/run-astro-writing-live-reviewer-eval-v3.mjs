#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { createRequire } from "node:module";
import {
  CARD_JUDGE_V3_ARTIFACT_PATH,
  CARD_JUDGE_V3_CALL_BUDGET,
  CARD_JUDGE_V3_SCHEMA,
  assertCardJudgeV3LiveAuthorization,
  cardJudgeV3PacketPrompt,
  evaluateCardJudgeV3
} from "../src/astro-writing/cardJudgeV3.mjs";
import { loadCardJudgeV3FixtureSet } from "./card-judge-v3-fixtures.mjs";

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

if (process.argv.includes("--authorize-live")) {
  throw new Error("Generic CLI authorization is forbidden. A billed run requires the exact one-use owner authorization token.");
}

loadLocalEnv();
const outputPath = path.resolve(process.env.ASTRO_WRITING_V3_OUTPUT ?? CARD_JUDGE_V3_ARTIFACT_PATH);
const authorization = assertCardJudgeV3LiveAuthorization({ artifactExists: fs.existsSync(outputPath) });
if (!process.env.OPENAI_API_KEY) throw new Error("OPENAI_API_KEY is not configured.");

const { manifest, cases } = loadCardJudgeV3FixtureSet();
if (cases.length !== CARD_JUDGE_V3_CALL_BUDGET || manifest.proposedLiveRun.calls !== CARD_JUDGE_V3_CALL_BUDGET) {
  throw new Error(`V3 live evaluation must contain exactly ${CARD_JUDGE_V3_CALL_BUDGET} frozen calls.`);
}
if (manifest.proposedLiveRun.reasoningEffort !== "high") throw new Error("V3 semantic voice evaluation requires full/high reasoning.");
const rubricPath = "tldr-astro-phrasebank/TLDR-CARD-JUDGE-RUBRIC-V3-DRAFT.md";
const rubric = fs.readFileSync(rubricPath, "utf8");
const rows = [];
const startedAt = new Date().toISOString();

function writeArtifact(status) {
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, `${JSON.stringify({
    version: "card-judge-v3-live-evaluation-run-1",
    status,
    startedAt,
    completedCalls: rows.length,
    authorization,
    model: manifest.proposedLiveRun.model,
    reasoningEffort: manifest.proposedLiveRun.reasoningEffort,
    rubric: {
      sourcePath: rubricPath,
      version: "card-writing-judge-rubric-v3",
      status: "owner_approved",
      ownerApproved: true,
      activeInHarness: true,
      activeInProduction: false,
      approvedSourceSha256: "c7426929d5868847bea263b3c8b7eb3830304657dde2f6f54ebb7b417268e983"
    },
    approval: {
      recordedAt: "2026-08-09",
      registerSourceSha256: "db48c5b42df2afee30faea6141a3417ca1e1d69fc3110586281bdd79e72d29e2",
      critiqueSourceSha256: "3507f41f6c29b6b9abb2216e9f2acddf63be519866b4c88259c852791cbad043",
      rubricSourceSha256: "c7426929d5868847bea263b3c8b7eb3830304657dde2f6f54ebb7b417268e983",
      question13Category: "specificity_ceiling",
      question13RuntimeAction: "FAIL"
    },
    writerPromotionAuthorized: false,
    rows
  }, null, 2)}\n`);
}

writeArtifact("running");
for (const fixture of cases) {
  const prompt = cardJudgeV3PacketPrompt(rubric, fixture.packet);
  const { response, payload } = await callOpenAIResponses({
    apiKey: process.env.OPENAI_API_KEY,
    role: "CARD_REVIEWER_V3",
    request: {
      model: manifest.proposedLiveRun.model,
      input: prompt,
      reasoning: { effort: manifest.proposedLiveRun.reasoningEffort },
      max_output_tokens: 4000,
      text: { format: { type: "json_schema", name: "tldr_card_judge_v3", strict: true, schema: CARD_JUDGE_V3_SCHEMA } }
    }
  });
  if (!response.ok) throw new Error(payload.error?.message ?? `Card judge failed with ${response.status}.`);
  const text = responseText(payload);
  if (!text) throw new Error(`Card judge returned no structured output for ${fixture.fixtureId}.`);
  const evaluation = evaluateCardJudgeV3({ packet: fixture.packet, modelOutput: JSON.parse(text) });
  const categories = [...new Set(evaluation.findings.map((finding) => finding.category))];
  const missingCategories = fixture.targetCategories.filter((category) => !categories.includes(category));
  const passed = evaluation.verdict === fixture.expectedVerdict && missingCategories.length === 0;
  rows.push({
    fixtureId: fixture.fixtureId,
    kind: fixture.kind,
    pairId: fixture.pairId,
    expectedVerdict: fixture.expectedVerdict,
    targetCategories: fixture.targetCategories,
    verdict: evaluation.verdict,
    categories,
    missingCategories,
    passed,
    provider: {
      responseId: payload.id ?? null,
      responseModel: payload.model ?? manifest.proposedLiveRun.model,
      usage: payload.usage ?? null
    }
  });
  writeArtifact("running");
  process.stdout.write(`${rows.length}/${CARD_JUDGE_V3_CALL_BUDGET} ${fixture.fixtureId}: ${evaluation.verdict} contract=${passed}\n`);
}

const passed = rows.every((row) => row.passed);
writeArtifact(passed ? "passed" : "failed");
if (rows.length !== authorization.authorizedCalls) throw new Error("V3 live evaluation did not consume the exact authorized call count.");
if (!passed) process.exitCode = 1;
