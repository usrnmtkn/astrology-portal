#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { createRequire } from "node:module";
import {
  CARD_JUDGE_V3_1_ARTIFACT_PATH,
  CARD_JUDGE_V3_1_CALL_BUDGET,
  CARD_JUDGE_V3_1_SCHEMA,
  assertCardJudgeV31LiveAuthorization,
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

if (process.argv.includes("--authorize-live")) {
  throw new Error("Generic CLI authorization is forbidden. The billed run requires the exact one-use owner authorization token.");
}

loadLocalEnv();
const outputPath = path.resolve(process.env.ASTRO_WRITING_V3_1_OUTPUT ?? CARD_JUDGE_V3_1_ARTIFACT_PATH);
const authorization = assertCardJudgeV31LiveAuthorization({ artifactExists: fs.existsSync(outputPath) });
if (!process.env.OPENAI_API_KEY) throw new Error("OPENAI_API_KEY is not configured.");

const { manifest, cases } = loadCardJudgeV31FixtureSet();
if (cases.length !== CARD_JUDGE_V3_1_CALL_BUDGET || manifest.proposedLiveRun.calls !== CARD_JUDGE_V3_1_CALL_BUDGET) {
  throw new Error(`V3.1 live evaluation must contain exactly ${CARD_JUDGE_V3_1_CALL_BUDGET} frozen calls.`);
}
if (manifest.proposedLiveRun.model !== "gpt-5.6-terra") throw new Error("V3.1 run 2 requires gpt-5.6-terra.");
if (manifest.proposedLiveRun.reasoningEffort !== "high") throw new Error("V3.1 run 2 requires high reasoning.");
if (manifest.proposedLiveRun.retries !== 0) throw new Error("V3.1 run 2 forbids retries.");

const rubricPath = "tldr-astro-phrasebank/TLDR-CARD-JUDGE-RUBRIC-V3-1-DRAFT.md";
const critiquePath = "tldr-astro-phrasebank/TLDR-CARD-CRITIQUE-CHECKLIST-V3-1-DRAFT.md";
const mechanismPath = "packages/astro-knowledge/review/writing-harness-v3/card-judge-v3-1-mechanism-records.json";
const rubric = fs.readFileSync(rubricPath, "utf8");
const rows = [];
const startedAt = new Date().toISOString();

function writeArtifact(status, error = null) {
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, `${JSON.stringify({
    version: "card-judge-v3.1-live-evaluation-run-2a",
    status,
    startedAt,
    completedAt: status === "running" ? null : new Date().toISOString(),
    completedCalls: rows.length,
    authorization,
    model: manifest.proposedLiveRun.model,
    reasoningEffort: manifest.proposedLiveRun.reasoningEffort,
    retries: manifest.proposedLiveRun.retries,
    approvedSources: {
      rubric: { path: rubricPath, sha256: manifest.approvedSourceSha256.judgeRubric },
      critique: { path: critiquePath, sha256: manifest.approvedSourceSha256.critiqueChecklist },
      mechanisms: { path: mechanismPath, sha256: manifest.approvedSourceSha256.mechanismRecords }
    },
    candidateWriterActive: false,
    writerPromotionAuthorized: false,
    error,
    rows
  }, null, 2)}\n`);
}

writeArtifact("running");
try {
  for (const fixture of cases) {
    const prompt = cardJudgeV31PacketPrompt(rubric, fixture.packet);
    const { response, payload } = await callOpenAIResponses({
      apiKey: process.env.OPENAI_API_KEY,
      role: "CARD_REVIEWER_V3",
      request: {
        model: manifest.proposedLiveRun.model,
        input: prompt,
        reasoning: { effort: manifest.proposedLiveRun.reasoningEffort },
        max_output_tokens: 4000,
        text: { format: { type: "json_schema", name: "tldr_card_judge_v3_1", strict: true, schema: CARD_JUDGE_V3_1_SCHEMA } }
      }
    });
    if (!response.ok) throw new Error(payload.error?.message ?? `Card judge failed with ${response.status}.`);
    const text = responseText(payload);
    if (!text) throw new Error(`Card judge returned no structured output for ${fixture.fixtureId}.`);
    const evaluation = evaluateCardJudgeV31({ packet: fixture.packet, modelOutput: JSON.parse(text) });
    const categories = [...new Set(evaluation.findings.map((finding) => finding.category))];
    const contract = evaluateCardJudgeV31Contract({ fixture, verdict: evaluation.verdict, categories });
    const validMechanismIds = new Set(fixture.packet.mechanismRecord.elements.map((element) => element.id));
    const citationCompliance = evaluation.findings.every((finding) =>
      finding.mechanism_citations.length > 0
      && finding.mechanism_citations.every((citation) => validMechanismIds.has(citation))
    );
    rows.push({
      call: rows.length + 1,
      fixtureId: fixture.fixtureId,
      kind: fixture.kind,
      pairId: fixture.pairId,
      expectedVerdict: fixture.expectedVerdict,
      requiredCategories: fixture.targetCategories,
      verdict: evaluation.verdict,
      categories,
      contract: { ...contract, passed: contract.passed && citationCompliance },
      citationCompliance,
      findings: evaluation.findings,
      provider: {
        responseId: payload.id ?? null,
        responseModel: payload.model ?? manifest.proposedLiveRun.model,
        usage: payload.usage ?? null
      }
    });
    writeArtifact("running");
    process.stdout.write(`${rows.length}/${CARD_JUDGE_V3_1_CALL_BUDGET} ${fixture.fixtureId}: ${evaluation.verdict} contract=${contract.passed && citationCompliance}\n`);
  }
  const passed = rows.every((row) => row.contract.passed);
  writeArtifact(passed ? "passed" : "failed");
  if (rows.length !== authorization.authorizedCalls) throw new Error("V3.1 run 2 did not consume the exact authorized call count.");
  if (!passed) process.exitCode = 1;
} catch (error) {
  writeArtifact("errored", error instanceof Error ? error.message : String(error));
  throw error;
}
