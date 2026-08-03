#!/usr/bin/env node
"use strict";

const { judgeConfig } = require("./generate-sky-aspect-cards.js");
const { judgeLongformArticle } = require("./judge-article-voice.js");
const { readRegistry, resolveCandidateRelease } = require("./editorial-model-registry.js");
const { assertResolvedCandidate, writeJsonAtomic } = require("./run-editorial-model-calibration.js");
const { evaluationFixtures, summarizeSamples } = require("./run-owner-article-corpus-evaluation.js");

const LANE_ID = "judge:sky-article-longform";
const PROFILE_VERSION = "sky-article-longform-v5-false-negative-probe-v1";
const TARGET_IDS = [
  "TLDR-Article-Edition-Uranus-Rx-Gemini-2025-OWNER.md",
  "venus-in-cancer",
  "mars-direct-in-cancer",
  "venus-retrograde-2025"
];

function fixtureId(fixture) {
  return fixture.id || fixture.sourceSlug || fixture.file;
}

function parseArgs(argv) {
  const options = {};
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === "--plan") options.plan = true;
    else if (token === "--authorize-live") options.authorizeLive = true;
    else if (token === "--show-evidence") options.showEvidence = true;
    else if (token === "--out") {
      if (!argv[index + 1] || argv[index + 1].startsWith("--")) throw new Error("--out requires a path.");
      options.out = argv[index + 1];
      index += 1;
    } else throw new Error(`Unexpected argument '${token}'.`);
  }
  if (options.plan && options.authorizeLive) throw new Error("Choose either --plan or --authorize-live, not both.");
  return options;
}

function selectTargets() {
  const fixtures = evaluationFixtures();
  const ownerFixtures = [
    ...fixtures.activeApproved,
    ...fixtures.calibrationCandidates,
    ...fixtures.diagnosticSameSurface
  ];
  const byId = new Map(ownerFixtures.map((fixture) => [fixtureId(fixture), fixture]));
  return TARGET_IDS.map((id) => {
    const fixture = byId.get(id);
    if (!fixture) throw new Error(`Missing targeted owner fixture '${id}'.`);
    return { ...fixture, id };
  });
}

function resolveCandidate(registry = readRegistry()) {
  const releaseId = registry.lanes[LANE_ID]?.candidate?.releaseId;
  return resolveCandidateRelease({ role: "judge", surface: "sky-article-longform", releaseId, registry });
}

function buildTargetedPlan(release = resolveCandidate()) {
  return {
    schemaVersion: 1,
    laneId: LANE_ID,
    profileVersion: PROFILE_VERSION,
    releaseId: release.releaseId,
    model: release.model,
    reasoningEffort: release.reasoningEffort || null,
    promptVersion: release.promptVersion,
    rubricVersion: release.rubricVersion,
    targetIds: [...TARGET_IDS],
    totalJudgeCalls: TARGET_IDS.length,
    samplesPerArticle: 1,
    promotionEligible: false,
    liveAuthorizationRequired: true,
    mutatesProduction: false
  };
}

async function runTargetedProbe({ judgeFn, showEvidence = false } = {}) {
  const evaluated = [];
  for (const fixture of selectTargets()) {
    const result = await judgeLongformArticle(fixture.text, {
      planet: fixture.planet,
      edition: fixture.edition,
      samples: 1,
      calibration: true,
      ownerVerbatim: true,
      judgeFn: judgeFn ? (prompt) => judgeFn(prompt, { fixture }) : undefined
    });
    evaluated.push({ fixture, result });
    if (showEvidence) {
      console.log(`${fixture.title} -> ${result.score} (${result.verdict})`);
      for (const item of Array.isArray(result.evidence) ? result.evidence : []) {
        console.log(`  [${item.checkId}] ${item.sentence}`);
        console.log(`  Reason: ${item.reason}`);
        console.log(`  Rewrite: ${item.rewrite}`);
      }
    }
  }
  const contractViolation = evaluated.some(({ result }) => result.contractViolation);
  const allPassed = evaluated.every(({ result }) => result.score === 3);
  return {
    status: contractViolation ? "needs-human-review" : allPassed ? "passed-diagnostic" : "failed-diagnostic",
    contractViolation,
    evaluated
  };
}

function buildTargetedReport({ release, result, recordedAt = new Date().toISOString() }) {
  return {
    schemaVersion: 1,
    recordedAt,
    laneId: LANE_ID,
    registryVersion: release.registryVersion,
    releaseId: release.releaseId,
    provider: release.provider,
    model: release.model,
    reasoningEffort: release.reasoningEffort || null,
    promptVersion: release.promptVersion,
    rubricVersion: release.rubricVersion,
    profileVersion: PROFILE_VERSION,
    reportKind: "targeted-diagnostic-probe",
    samplesPerArticle: 1,
    totalJudgeCalls: TARGET_IDS.length,
    promotionEligible: false,
    mutatesProduction: false,
    status: result.status,
    contractViolation: result.contractViolation,
    results: summarizeSamples(result.evaluated)
  };
}

async function main(argv = process.argv.slice(2)) {
  const options = parseArgs(argv);
  const release = resolveCandidate();
  if (options.plan) {
    console.log(JSON.stringify(buildTargetedPlan(release), null, 2));
    return;
  }
  if (!options.authorizeLive) throw new Error("Use --plan for a no-call preview or --authorize-live for the explicit four-call probe.");

  const previousCandidateReleaseId = process.env.EDITORIAL_MODEL_CANDIDATE_RELEASE_ID;
  process.env.EDITORIAL_MODEL_CANDIDATE_RELEASE_ID = release.releaseId;
  try {
    assertResolvedCandidate(judgeConfig("sky-article-longform"), release);
    const result = await runTargetedProbe({ showEvidence: options.showEvidence });
    const report = buildTargetedReport({ release, result });
    if (options.out) writeJsonAtomic(options.out, report);
    console.log(JSON.stringify(report, null, 2));
    if (report.status === "needs-human-review") process.exitCode = 2;
    if (report.status === "failed-diagnostic") process.exitCode = 1;
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
  PROFILE_VERSION,
  TARGET_IDS,
  buildTargetedPlan,
  buildTargetedReport,
  parseArgs,
  runTargetedProbe,
  selectTargets
};
