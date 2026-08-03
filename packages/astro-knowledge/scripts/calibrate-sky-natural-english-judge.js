#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");
const { readRegistry, resolveCandidateRelease } = require("./editorial-model-registry.js");
const { judgeConfig } = require("./generate-sky-aspect-cards.js");
const { NEGATIVE_CONTROLS, judgeNaturalEnglish } = require("./judge-sky-natural-english.js");
const { OWNER_STYLE_MODELS } = require("./sky-exact-aspect-style.js");

const LANE_ID = "judge:sky-exact-aspect";
const DEFAULT_OUT = path.join("out", "editorial-calibration", "gpt-5.6-sol-sky-natural-english-v1.json");

function parseArgs(argv) {
  const options = { concurrency: 4, samples: 1, out: DEFAULT_OUT };
  for (const token of argv) {
    if (token === "--plan") options.plan = true;
    else if (token === "--authorize-live") options.authorizeLive = true;
    else if (token.startsWith("--concurrency=")) options.concurrency = Number(token.slice(14));
    else if (token.startsWith("--samples=")) options.samples = Number(token.slice(10));
    else if (token.startsWith("--out=")) options.out = token.slice(6);
    else throw new Error(`Unknown argument '${token}'.`);
  }
  if (!Number.isInteger(options.concurrency) || options.concurrency < 1) throw new Error("--concurrency must be a positive integer.");
  if (!Number.isInteger(options.samples) || options.samples < 1) throw new Error("--samples must be a positive integer.");
  return options;
}

function configureCandidate(release) {
  const previous = {};
  const values = {
    EDITORIAL_JUDGE_CANDIDATE_RELEASE_ID: release.releaseId,
    OPENAI_JUDGE_MODEL: release.model,
    OPENAI_JUDGE_REASONING_EFFORT: release.reasoningEffort || "none",
    TLDR_ALLOW_LIVE_LLM_JUDGE: "1",
    TLDR_ALLOW_LIVE_LLM_CALIBRATION: "1"
  };
  for (const [key, value] of Object.entries(values)) {
    previous[key] = process.env[key];
    process.env[key] = value;
  }
  return () => {
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  };
}

async function pool(items, concurrency, fn) {
  const results = new Array(items.length);
  let cursor = 0;
  async function worker() {
    while (cursor < items.length) {
      const index = cursor;
      cursor += 1;
      results[index] = await fn(items[index], index);
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, worker));
  return results;
}

function writeJsonAtomic(filePath, value) {
  const resolved = path.resolve(filePath);
  fs.mkdirSync(path.dirname(resolved), { recursive: true });
  const temporary = `${resolved}.${process.pid}.tmp`;
  fs.writeFileSync(temporary, `${JSON.stringify(value, null, 2)}\n`);
  fs.renameSync(temporary, resolved);
}

async function run(options) {
  const registry = readRegistry();
  const release = resolveCandidateRelease({ role: "judge", surface: "sky-exact-aspect", releaseId: registry.lanes[LANE_ID].candidate.releaseId, registry });
  const work = [
    ...OWNER_STYLE_MODELS.map((entry) => ({ cohort: "owner", id: entry.id, body: entry.body })),
    ...NEGATIVE_CONTROLS.map((entry, index) => ({ cohort: "negative", id: `negative.${index + 1}`, body: entry.reject }))
  ];
  if (options.plan) {
    return {
      laneId: LANE_ID,
      releaseId: release.releaseId,
      model: release.model,
      ownerExamples: OWNER_STYLE_MODELS.length,
      negativeControls: NEGATIVE_CONTROLS.length,
      ownerExactGold: OWNER_STYLE_MODELS.length,
      totalJudgeCalls: NEGATIVE_CONTROLS.length * options.samples,
      serving: false
    };
  }
  if (!options.authorizeLive) throw new Error("Use --plan or explicitly pass --authorize-live.");
  const restore = configureCandidate(release);
  try {
    const configured = judgeConfig("sky-exact-aspect");
    if (configured.releaseId !== release.releaseId || configured.model !== release.model) throw new Error("Natural-English calibration did not resolve the staged exact-aspect judge.");
    const rows = await pool(work, options.concurrency, async (item, index) => {
      const verdict = await judgeNaturalEnglish({ body: item.body }, { samples: options.samples, calibration: true });
      process.stderr.write(`${index + 1}/${work.length} ${item.cohort} ${item.id} -> ${verdict.score}${verdict.contractViolation ? " contract-violation" : ""}\n`);
      return {
        cohort: item.cohort,
        id: item.id,
        score: verdict.score,
        rationale: verdict.rationale || verdict.why || "",
        failedChecks: verdict.failedChecks || [],
        evidence: verdict.evidence || [],
        disagreement: Boolean(verdict.disagreement),
        contractViolation: Boolean(verdict.contractViolation),
        contractIssues: verdict.contractIssues || [],
        exactApprovedGold: Boolean(verdict.exactApprovedGold)
      };
    });
    const owner = rows.filter((row) => row.cohort === "owner");
    const negative = rows.filter((row) => row.cohort === "negative");
    const passed = owner.every((row) => row.score === 3 && row.exactApprovedGold && !row.disagreement && !row.contractViolation)
      && negative.every((row) => row.score <= 2 && row.evidence.length > 0 && !row.disagreement && !row.contractViolation);
    const report = {
      schemaVersion: 1,
      recordedAt: new Date().toISOString(),
      status: passed ? "passed" : "failed",
      serving: false,
      laneId: LANE_ID,
      releaseId: release.releaseId,
      model: release.model,
      reasoningEffort: release.reasoningEffort || null,
      samples: options.samples,
      owner,
      negative
    };
    writeJsonAtomic(options.out, report);
    return report;
  } finally {
    restore();
  }
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const result = await run(options);
  console.log(JSON.stringify(result, null, 2));
  if (!options.plan && result.status !== "passed") process.exitCode = 1;
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.stack : error);
    process.exitCode = 1;
  });
}

module.exports = { LANE_ID, parseArgs, run };
