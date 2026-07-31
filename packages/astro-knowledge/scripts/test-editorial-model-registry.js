"use strict";

const assert = require("assert");
const fs = require("fs");
const os = require("os");
const path = require("path");
const {
  promoteCandidate,
  readRegistry,
  resolveActiveRelease,
  resolveCandidateRelease,
  rollbackActive,
  stageCandidate,
  validateRegistry,
  writeRegistry
} = require("./editorial-model-registry.js");

const originalPromotionAuth = process.env.TLDR_ALLOW_MODEL_PROMOTION;
const originalJudgeProvider = process.env.CONTENT_JUDGE_PROVIDER;
const originalJudgeModel = process.env.OPENAI_JUDGE_MODEL;
const originalCandidateReleaseId = process.env.EDITORIAL_MODEL_CANDIDATE_RELEASE_ID;
const originalCalibrationAuth = process.env.TLDR_ALLOW_LIVE_LLM_CALIBRATION;

function restoreEnv(name, value) {
  if (value === undefined) delete process.env[name];
  else process.env[name] = value;
}

try {
  const registry = readRegistry();
  validateRegistry(registry);
  assert.strictEqual(Object.keys(registry.lanes).length, 6);

  const release = resolveActiveRelease({
    role: "judge",
    surface: "sky-article-longform",
    registry
  });
  assert.strictEqual(release.laneId, "judge:sky-article-longform");
  assert.strictEqual(release.model, "gpt-4.1-mini");

  const laneId = "judge:sky-article-longform";
  const candidate = {
    ...registry.lanes[laneId].active,
    releaseId: "sky-article-judge-test-candidate-v2",
    model: "test-private-model-v2",
    evaluationSetVersion: "sky-article-longform-heldout-v2"
  };
  const staged = stageCandidate(registry, laneId, candidate);
  assert.deepStrictEqual(registry.lanes[laneId].candidate, null, "staging must not mutate its input");
  assert.strictEqual(staged.lanes[laneId].active.releaseId, release.releaseId);
  assert.strictEqual(staged.lanes[laneId].candidate.releaseId, candidate.releaseId);
  assert.strictEqual(resolveCandidateRelease({
    role: "judge",
    surface: "sky-article-longform",
    releaseId: candidate.releaseId,
    registry: staged
  }).registryState, "candidate");
  assert.throws(
    () => resolveCandidateRelease({
      role: "judge",
      surface: "sky-article-longform",
      releaseId: "not-the-candidate",
      registry: staged
    }),
    /does not match/
  );

  const report = {
    status: "passed",
    disagreement: false,
    separation: 1.4,
    minimumSeparation: 1,
    releaseId: candidate.releaseId
  };

  delete process.env.TLDR_ALLOW_MODEL_PROMOTION;
  assert.throws(
    () => promoteCandidate(staged, laneId, { approvedBy: "owner", calibrationReport: report }),
    /disabled/
  );

  process.env.TLDR_ALLOW_MODEL_PROMOTION = "1";
  assert.throws(
    () => promoteCandidate(staged, laneId, {
      approvedBy: "owner",
      calibrationReport: { ...report, disagreement: true }
    }),
    /disagreement/
  );
  assert.throws(
    () => promoteCandidate(staged, laneId, {
      approvedBy: "owner",
      calibrationReport: { ...report, separation: 0.5 }
    }),
    /below/
  );
  assert.throws(
    () => promoteCandidate(staged, laneId, {
      approvedBy: "owner",
      calibrationReport: { ...report, releaseId: undefined }
    }),
    /does not match/
  );
  assert.throws(
    () => promoteCandidate(staged, laneId, {
      approvedBy: "owner",
      calibrationReport: { ...report, minimumSeparation: undefined }
    }),
    /numeric separation/
  );
  assert.throws(
    () => promoteCandidate(staged, laneId, {
      approvedBy: "owner",
      calibrationReport: { ...report, releaseId: "different-release" }
    }),
    /does not match/
  );

  const promoted = promoteCandidate(staged, laneId, {
    approvedBy: "owner",
    calibrationReport: report,
    recordedAt: "2026-07-31T18:00:00.000Z"
  });
  assert.strictEqual(promoted.lanes[laneId].active.releaseId, candidate.releaseId);
  assert.strictEqual(promoted.lanes[laneId].rollback.releaseId, release.releaseId);
  assert.strictEqual(promoted.lanes[laneId].candidate, null);
  assert.strictEqual(promoted.lanes[laneId].history.at(-1).approvedBy, "owner");
  assert.match(promoted.lanes[laneId].history.at(-1).calibrationReportSha256, /^[a-f0-9]{64}$/);

  const rolledBack = rollbackActive(promoted, laneId, {
    approvedBy: "owner",
    recordedAt: "2026-07-31T18:05:00.000Z"
  });
  assert.strictEqual(rolledBack.lanes[laneId].active.releaseId, release.releaseId);
  assert.strictEqual(rolledBack.lanes[laneId].rollback.releaseId, candidate.releaseId);
  assert.strictEqual(rolledBack.lanes[laneId].history.at(-1).action, "rollback");

  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "tldr-model-registry-"));
  const tempRegistryPath = path.join(tempRoot, "registry.json");
  writeRegistry(rolledBack, tempRegistryPath);
  validateRegistry(readRegistry(tempRegistryPath));

  delete process.env.CONTENT_JUDGE_PROVIDER;
  delete process.env.OPENAI_JUDGE_MODEL;
  delete process.env.EDITORIAL_MODEL_CANDIDATE_RELEASE_ID;
  delete process.env.TLDR_ALLOW_LIVE_LLM_CALIBRATION;
  const { judgeConfig } = require("./generate-sky-aspect-cards.js");
  const configured = judgeConfig("sky-article-longform");
  assert.strictEqual(configured.laneId, laneId);
  assert.strictEqual(configured.releaseId, release.releaseId);
  assert.strictEqual(configured.registryOverride, false);

  process.env.OPENAI_JUDGE_MODEL = "temporary-evaluation-model";
  const overridden = judgeConfig("sky-article-longform");
  assert.strictEqual(overridden.model, "temporary-evaluation-model");
  assert.strictEqual(overridden.releaseId, release.releaseId);
  assert.strictEqual(overridden.registryOverride, true);

  process.env.EDITORIAL_MODEL_CANDIDATE_RELEASE_ID = "unapproved-candidate";
  assert.throws(
    () => judgeConfig("sky-article-longform"),
    /explicitly authorized judge calibration/
  );

  console.log("Editorial model registry: 6 lanes valid; stage, gated promotion, rollback, and override audit passed.");
} finally {
  restoreEnv("TLDR_ALLOW_MODEL_PROMOTION", originalPromotionAuth);
  restoreEnv("CONTENT_JUDGE_PROVIDER", originalJudgeProvider);
  restoreEnv("OPENAI_JUDGE_MODEL", originalJudgeModel);
  restoreEnv("EDITORIAL_MODEL_CANDIDATE_RELEASE_ID", originalCandidateReleaseId);
  restoreEnv("TLDR_ALLOW_LIVE_LLM_CALIBRATION", originalCalibrationAuth);
}
