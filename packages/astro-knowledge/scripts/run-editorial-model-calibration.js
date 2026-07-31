#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");
const { readRegistry, resolveCandidateRelease, validateCalibrationReport } = require("./editorial-model-registry.js");
const { judgeConfig } = require("./generate-sky-aspect-cards.js");
const { runArticleJudgeCalibration } = require("./test-article-judge-calibration.js");

const SUPPORTED_LANE = "judge:sky-article-longform";

function parseArgs(argv) {
  const options = {};
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (token === "--authorize-live") {
      options.authorizeLive = true;
      continue;
    }
    if (!token.startsWith("--")) throw new Error(`Unexpected argument '${token}'.`);
    const key = token.slice(2);
    const value = argv[i + 1];
    if (!value || value.startsWith("--")) throw new Error(`--${key} requires a value.`);
    options[key] = value;
    i += 1;
  }
  return options;
}

function summarizeSamples(samples) {
  return samples.map(({ fixture, result }) => ({
    id: fixture.id || fixture.file,
    sourceSha256: fixture.sha256,
    score: result.score,
    verdict: result.verdict || "",
    disagreement: Boolean(result.disagreement)
  }));
}

function buildCalibrationReport({ laneId, release, result, recordedAt = new Date().toISOString(), sourceRevision = "" }) {
  return {
    schemaVersion: 1,
    recordedAt,
    sourceRevision,
    laneId,
    registryVersion: release.registryVersion,
    releaseId: release.releaseId,
    provider: release.provider,
    model: release.model,
    promptVersion: release.promptVersion,
    rubricVersion: release.rubricVersion,
    evaluationSetVersion: release.evaluationSetVersion,
    policyVersion: release.policyVersion,
    status: result.status,
    approvedMean: result.approvedMean,
    weakMean: result.weakMean,
    separation: result.separation,
    minimumSeparation: result.minimumSeparation,
    disagreement: Boolean(result.disagreement),
    approved: summarizeSamples(result.approved),
    weakControls: summarizeSamples(result.weak)
  };
}

function writeJsonAtomic(filePath, value) {
  const resolved = path.resolve(filePath);
  fs.mkdirSync(path.dirname(resolved), { recursive: true });
  const temporaryPath = `${resolved}.${process.pid}.tmp`;
  fs.writeFileSync(temporaryPath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  fs.renameSync(temporaryPath, resolved);
}

async function runCandidateCalibration({ laneId, outPath, registry = readRegistry(), judgeFn } = {}) {
  if (laneId !== SUPPORTED_LANE) {
    throw new Error(`This runner currently supports only ${SUPPORTED_LANE}.`);
  }
  const release = resolveCandidateRelease({
    role: "judge",
    surface: "sky-article-longform",
    releaseId: registry.lanes[laneId]?.candidate?.releaseId,
    registry
  });

  const previousCandidateReleaseId = process.env.EDITORIAL_MODEL_CANDIDATE_RELEASE_ID;
  process.env.EDITORIAL_MODEL_CANDIDATE_RELEASE_ID = release.releaseId;
  try {
    const resolved = judgeConfig("sky-article-longform");
    if (resolved.releaseId !== release.releaseId || resolved.registryState !== "candidate") {
      throw new Error("Judge runtime did not resolve the staged candidate release.");
    }

    const result = await runArticleJudgeCalibration({ judgeFn, minimumSeparation: 1 });
    const report = buildCalibrationReport({
      laneId,
      release,
      result,
      sourceRevision: process.env.GITHUB_SHA || ""
    });
    if (report.status === "passed") validateCalibrationReport(report, release);
    if (outPath) writeJsonAtomic(outPath, report);
    return report;
  } finally {
    if (previousCandidateReleaseId === undefined) delete process.env.EDITORIAL_MODEL_CANDIDATE_RELEASE_ID;
    else process.env.EDITORIAL_MODEL_CANDIDATE_RELEASE_ID = previousCandidateReleaseId;
  }
}

async function main(argv = process.argv.slice(2)) {
  const options = parseArgs(argv);
  if (!options.authorizeLive) {
    throw new Error("Live candidate calibration requires --authorize-live.");
  }
  const report = await runCandidateCalibration({
    laneId: options.lane,
    outPath: options.out || path.join("out", "editorial-calibration", "report.json")
  });
  console.log(`Candidate ${report.releaseId}: ${report.status}; separation ${report.separation.toFixed(2)} (minimum ${report.minimumSeparation.toFixed(2)}).`);
  if (report.status === "needs-human-review") process.exitCode = 2;
  if (report.status === "failed") process.exitCode = 1;
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}

module.exports = {
  SUPPORTED_LANE,
  buildCalibrationReport,
  parseArgs,
  runCandidateCalibration,
  summarizeSamples,
  writeJsonAtomic
};
