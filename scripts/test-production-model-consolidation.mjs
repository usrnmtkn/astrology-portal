#!/usr/bin/env node

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const generator = require("../packages/astro-knowledge/scripts/generate-sky-aspect-cards.js");

const prior = {
  provider: process.env.CONTENT_GENERATION_PROVIDER_SKY_ASPECT,
  key: process.env.OPENAI_API_KEY,
  fetch: globalThis.fetch
};
let fetchCalls = 0;
let gateCalls = 0;
try {
  process.env.CONTENT_GENERATION_PROVIDER_SKY_ASPECT = "openai";
  process.env.OPENAI_API_KEY = "FIXTURE_ONLY_NEVER_SENT";
  globalThis.fetch = async () => {
    fetchCalls += 1;
    throw new Error("A blocked provider call reached fetch.");
  };
  await assert.rejects(
    () => generator.generate("FIXTURE_ONLY", {
      beforeProviderCall: () => {
        gateCalls += 1;
        throw new Error("FIXTURE_GATE_BLOCK");
      }
    }),
    /FIXTURE_GATE_BLOCK/u
  );
} finally {
  if (prior.provider === undefined) delete process.env.CONTENT_GENERATION_PROVIDER_SKY_ASPECT;
  else process.env.CONTENT_GENERATION_PROVIDER_SKY_ASPECT = prior.provider;
  if (prior.key === undefined) delete process.env.OPENAI_API_KEY;
  else process.env.OPENAI_API_KEY = prior.key;
  globalThis.fetch = prior.fetch;
}
assert.equal(gateCalls, 1);
assert.equal(fetchCalls, 0, "Sky Aspect must gate before provider fetch");

const skyCron = fs.readFileSync(path.join(root, "api/cron/generate-sky-aspects.ts"), "utf8");
assert.match(skyCron, /prepareProductionPreCallGate\(input\)/u);
assert.match(skyCron, /assertProductionPreCallGate\(gate, \{ role: "WRITER"/u);
assert.match(skyCron, /assertProductionPreCallGate\(gate, \{ role: "REVIEWER"/u);
assert.match(skyCron, /judgeBeforeProviderCall/u);
assert.match(skyCron, /generationConfig\("sky-exact-aspect"\)/u, "Sky aspects must resolve their surface-specific generation lane");

const skyPlacementCron = fs.readFileSync(path.join(root, "api/cron/generate-sky-placements.ts"), "utf8");
assert.match(skyPlacementCron, /skyPlacementWriterConfig\(\)/u, "Sky placements must resolve the dedicated writer lane or its explicit legacy fallback");

const reportClient = fs.readFileSync(path.join(root, "api/_lib/report-model-client.ts"), "utf8");
const reportFulfillment = fs.readFileSync(path.join(root, "api/_lib/report-fulfillment.ts"), "utf8");
for (const endpoint of ["https://api.openai.com/v1/responses", "https://api.anthropic.com/v1/messages"]) {
  assert.match(reportClient, new RegExp(endpoint.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&"), "u"));
}
assert.match(reportClient, /callProductionReportModel[\s\S]*assertReportProductionKernel\(input\.productionKernel\)[\s\S]*callReportModel/u);
assert.match(reportClient, /const callReportModel: ReportModelCall/u);
assert.doesNotMatch(reportClient, /export const callReportModel/u, "The bare report model client must not be importable by production call sites.");
assert.match(reportClient, /export const callReportCalibrationModel: ReportModelCall = callReportModel/u);
const ledgerOpen = reportFulfillment.indexOf("beginAuthorizedCall(");
const kernelAssert = reportFulfillment.lastIndexOf("assertReportProductionKernel(", ledgerOpen);
assert.ok(kernelAssert >= 0 && kernelAssert < ledgerOpen, "report gate must run before the billed ledger opens");

for (const file of ["report-writer-chain.ts", "report-judge.ts", "report-assembly.ts"]) {
  const source = fs.readFileSync(path.join(root, "api/_lib", file), "utf8");
  assert.match(source, /prepareReportProductionKernel\(/u, `${file} does not attach a governed report kernel`);
}

console.log(JSON.stringify({
  status: "pass",
  skyWriterAndJudgeGated: true,
  reportWriterReviewerReviserGated: true,
  reportGateRunsBeforeBillingLedger: true,
  providerFetchesAttempted: fetchCalls,
  liveCallsMade: 0
}, null, 2));
