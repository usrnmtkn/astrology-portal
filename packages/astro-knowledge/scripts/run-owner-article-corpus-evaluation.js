#!/usr/bin/env node
"use strict";

const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const { judgeConfig } = require("./generate-sky-aspect-cards.js");
const { judgeLongformArticle } = require("./judge-article-voice.js");
const { readRegistry, resolveCandidateRelease } = require("./editorial-model-registry.js");
const { assertResolvedCandidate, writeJsonAtomic } = require("./run-editorial-model-calibration.js");
const {
  loadOwnerFixtures,
  loadWeakControls
} = require("./test-article-judge-calibration.js");

const SUPPORTED_LANE = "judge:sky-article-longform";
const corpusRoot = path.join(
  __dirname,
  "..",
  "voice",
  "tldr-astro",
  "fixtures",
  "sky-article-longform",
  "owner-corpus"
);
const corpusManifest = require(path.join(corpusRoot, "manifest.json"));

const sha256 = (value) => crypto.createHash("sha256").update(value).digest("hex");
const mean = (values) => values.reduce((sum, value) => sum + value, 0) / Math.max(1, values.length);
const wordCount = (value) => (value.match(/\b[\p{L}\p{N}][\p{L}\p{N}’'-]*\b/gu) || []).length;

function parseArgs(argv) {
  const options = { lane: SUPPORTED_LANE, samples: 1 };
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === "--plan") {
      options.plan = true;
      continue;
    }
    if (token === "--authorize-live") {
      options.authorizeLive = true;
      continue;
    }
    if (!token.startsWith("--")) throw new Error(`Unexpected argument '${token}'.`);
    const key = token.slice(2);
    const value = argv[index + 1];
    if (!value || value.startsWith("--")) throw new Error(`--${key} requires a value.`);
    options[key] = value;
    index += 1;
  }
  options.samples = Number(options.samples);
  if (!Number.isInteger(options.samples) || options.samples < 1) {
    throw new Error("--samples must be a positive integer.");
  }
  if (options.plan && options.authorizeLive) {
    throw new Error("Choose either --plan or --authorize-live, not both.");
  }
  return options;
}

function loadCorpusCohort(name) {
  const entries = corpusManifest.cohorts[name];
  if (!Array.isArray(entries)) throw new Error(`Unknown owner-corpus cohort '${name}'.`);
  return entries.map((entry) => {
    const filePath = path.join(corpusRoot, entry.file);
    const text = fs.readFileSync(filePath, "utf8");
    if (sha256(text) !== entry.sha256) throw new Error(`${entry.file} must remain owner-verbatim.`);
    return { ...entry, id: entry.sourceSlug, filePath, text };
  });
}

function evaluationFixtures() {
  return {
    activeApproved: loadOwnerFixtures(),
    calibrationCandidates: loadCorpusCohort("calibrationCandidates"),
    diagnosticSameSurface: loadCorpusCohort("diagnosticSameSurface"),
    weakControls: loadWeakControls()
  };
}

function excludedSurfaceReferenceCount() {
  return corpusManifest.cohorts.adjacentFormats.length
    + corpusManifest.cohorts.additionalSurfaceReferences.length;
}

function buildEvaluationPlan({ samples = 1, release } = {}) {
  const fixtures = evaluationFixtures();
  const counts = Object.fromEntries(Object.entries(fixtures).map(([name, entries]) => [name, entries.length]));
  const articlesPerSample = Object.values(counts).reduce((sum, count) => sum + count, 0);
  const sourceWordsPerSample = Object.values(fixtures)
    .flat()
    .reduce((sum, fixture) => sum + wordCount(fixture.text), 0);
  return {
    schemaVersion: 1,
    surface: corpusManifest.surface,
    evaluationProfileVersion: corpusManifest.evaluationProfileVersion,
    releaseId: release?.releaseId || null,
    releaseEvaluationSetVersion: release?.evaluationSetVersion || null,
    releaseAligned: release
      ? release.evaluationSetVersion === corpusManifest.evaluationProfileVersion
      : false,
    samplesPerArticle: samples,
    cohorts: counts,
    adjacentFormatsExcluded: excludedSurfaceReferenceCount(),
    excludedReferenceCohorts: {
      adjacentFormats: corpusManifest.cohorts.adjacentFormats.length,
      additionalSurfaceReferences: corpusManifest.cohorts.additionalSurfaceReferences.length
    },
    articlesPerSample,
    totalJudgeCalls: articlesPerSample * samples,
    sourceWordsPerSample,
    liveAuthorizationRequired: true,
    mutatesProduction: false
  };
}

async function evaluateCohort(fixtures, cohort, { samples, judgeFn, quiet }) {
  const ownerVerbatim = cohort !== "weak-control";
  const evaluated = [];
  for (const fixture of fixtures) {
    const result = await judgeLongformArticle(fixture.text, {
      planet: fixture.planet,
      edition: fixture.edition,
      samples,
      judgeFn: judgeFn
        ? (prompt) => judgeFn(prompt, { cohort, fixture })
        : undefined,
      calibration: true,
      ownerVerbatim
    });
    evaluated.push({ fixture, result });
    if (!quiet) console.log(`${cohort}: ${fixture.title || fixture.id || fixture.file} -> ${result.score} (${result.verdict || ""})`);
  }
  return evaluated;
}

async function runOwnerCorpusEvaluation({ judgeFn, samples = 1, minimumSeparation = 1, quiet = false } = {}) {
  if (!Number.isInteger(Number(samples)) || Number(samples) < 1) {
    throw new Error("Evaluation samples must be a positive integer.");
  }
  const fixtures = evaluationFixtures();
  const options = { samples: Number(samples), judgeFn, quiet };
  const activeApproved = await evaluateCohort(fixtures.activeApproved, "active-approved", options);
  const calibrationCandidates = await evaluateCohort(fixtures.calibrationCandidates, "calibration-candidate", options);
  const diagnosticSameSurface = await evaluateCohort(fixtures.diagnosticSameSurface, "diagnostic-same-surface", options);
  const weakControls = await evaluateCohort(fixtures.weakControls, "weak-control", options);

  const approvedScores = [...activeApproved, ...calibrationCandidates].map(({ result }) => result.score);
  const weakScores = weakControls.map(({ result }) => result.score);
  const approvedMean = mean(approvedScores);
  const diagnosticMean = mean(diagnosticSameSurface.map(({ result }) => result.score));
  const weakMean = mean(weakScores);
  const separation = approvedMean - weakMean;
  const all = [...activeApproved, ...calibrationCandidates, ...diagnosticSameSurface, ...weakControls];
  const disagreement = all.some(({ result }) => result.disagreement);
  const contractViolation = all.some(({ result }) => result.contractViolation);
  const scoreFailure = activeApproved.some(({ result }) => result.score !== 3)
    || calibrationCandidates.some(({ result }) => result.score !== 3)
    || diagnosticSameSurface.some(({ result }) => result.score !== 3)
    || weakControls.some(({ result }) => result.score > 2)
    || separation < minimumSeparation;
  const status = disagreement || contractViolation ? "needs-human-review" : scoreFailure ? "failed" : "passed";

  return {
    status,
    evaluationProfileVersion: corpusManifest.evaluationProfileVersion,
    profileSha256: sha256(JSON.stringify(corpusManifest)),
    sampleCount: Number(samples),
    approvedMean,
    diagnosticMean,
    weakMean,
    separation,
    minimumSeparation,
    disagreement,
    contractViolation,
    activeApproved,
    calibrationCandidates,
    diagnosticSameSurface,
    weakControls,
    adjacentFormatsExcluded: excludedSurfaceReferenceCount()
  };
}

function summarizeSamples(samples) {
  return samples.map(({ fixture, result }) => ({
    id: fixture.id || fixture.sourceSlug || fixture.file,
    sourceSha256: fixture.sha256,
    score: result.score,
    verdict: result.verdict || "",
    failedChecks: Array.isArray(result.failedChecks) ? result.failedChecks : [],
    evidenceSummary: Array.isArray(result.evidence) ? result.evidence.map((item) => ({
      checkId: String(item?.checkId || ""),
      sentenceSha256: sha256(String(item?.sentence || "")),
      reasonSha256: sha256(String(item?.reason || "")),
      rewriteSha256: sha256(String(item?.rewrite || ""))
    })) : [],
    contractViolation: Boolean(result.contractViolation),
    contractIssues: Array.isArray(result.contractIssues) ? result.contractIssues : [],
    disagreement: Boolean(result.disagreement)
  }));
}

function buildEvaluationReport({ laneId, release, result, recordedAt = new Date().toISOString(), sourceRevision = "" }) {
  const releaseAligned = release.evaluationSetVersion === result.evaluationProfileVersion;
  return {
    schemaVersion: 1,
    recordedAt,
    sourceRevision,
    laneId,
    registryVersion: release.registryVersion,
    releaseId: release.releaseId,
    provider: release.provider,
    model: release.model,
    reasoningEffort: release.reasoningEffort || null,
    promptVersion: release.promptVersion,
    rubricVersion: release.rubricVersion,
    releaseEvaluationSetVersion: release.evaluationSetVersion,
    evaluationProfileVersion: result.evaluationProfileVersion,
    profileSha256: result.profileSha256,
    policyVersion: release.policyVersion,
    reportKind: result.sampleCount >= 5 ? "expanded-evaluation" : "expanded-smoke",
    sampleCount: result.sampleCount,
    releaseAligned,
    promotionEligible: false,
    status: result.status,
    approvedMean: result.approvedMean,
    diagnosticMean: result.diagnosticMean,
    weakMean: result.weakMean,
    separation: result.separation,
    minimumSeparation: result.minimumSeparation,
    disagreement: result.disagreement,
    contractViolation: result.contractViolation,
    adjacentFormatsExcluded: result.adjacentFormatsExcluded,
    activeApproved: summarizeSamples(result.activeApproved),
    calibrationCandidates: summarizeSamples(result.calibrationCandidates),
    diagnosticSameSurface: summarizeSamples(result.diagnosticSameSurface),
    weakControls: summarizeSamples(result.weakControls)
  };
}

async function resolveStagedCandidate(laneId, registry = readRegistry()) {
  if (laneId !== SUPPORTED_LANE) throw new Error(`This runner supports only ${SUPPORTED_LANE}.`);
  const candidateId = registry.lanes[laneId]?.candidate?.releaseId;
  return resolveCandidateRelease({
    role: "judge",
    surface: "sky-article-longform",
    releaseId: candidateId,
    registry
  });
}

async function main(argv = process.argv.slice(2)) {
  const options = parseArgs(argv);
  const release = await resolveStagedCandidate(options.lane);
  if (options.plan) {
    console.log(JSON.stringify(buildEvaluationPlan({ samples: options.samples, release }), null, 2));
    return;
  }
  if (!options.authorizeLive) {
    throw new Error("Use --plan for a no-call preview or --authorize-live for an explicitly authorized evaluation.");
  }

  const previousCandidateReleaseId = process.env.EDITORIAL_MODEL_CANDIDATE_RELEASE_ID;
  process.env.EDITORIAL_MODEL_CANDIDATE_RELEASE_ID = release.releaseId;
  try {
    assertResolvedCandidate(judgeConfig("sky-article-longform"), release);
    const result = await runOwnerCorpusEvaluation({ samples: options.samples });
    const report = buildEvaluationReport({
      laneId: options.lane,
      release,
      result,
      sourceRevision: process.env.GITHUB_SHA || ""
    });
    if (options.out) writeJsonAtomic(options.out, report);
    console.log(JSON.stringify(report, null, 2));
    if (report.status === "needs-human-review") process.exitCode = 2;
    if (report.status === "failed") process.exitCode = 1;
  } finally {
    if (previousCandidateReleaseId === undefined) delete process.env.EDITORIAL_MODEL_CANDIDATE_RELEASE_ID;
    else process.env.EDITORIAL_MODEL_CANDIDATE_RELEASE_ID = previousCandidateReleaseId;
  }
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}

module.exports = {
  buildEvaluationPlan,
  buildEvaluationReport,
  corpusManifest,
  evaluationFixtures,
  excludedSurfaceReferenceCount,
  loadCorpusCohort,
  parseArgs,
  runOwnerCorpusEvaluation,
  summarizeSamples
};
