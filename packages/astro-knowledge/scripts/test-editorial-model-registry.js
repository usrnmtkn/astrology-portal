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
  sha256,
  stageCandidate,
  validateCalibrationReport,
  validateRegistry,
  writeRegistry
} = require("./editorial-model-registry.js");

const originalPromotionAuth = process.env.TLDR_ALLOW_MODEL_PROMOTION;
const originalJudgeProvider = process.env.CONTENT_JUDGE_PROVIDER;
const originalGenerationProvider = process.env.CONTENT_GENERATION_PROVIDER_SKY_ASPECT;
const originalJudgeModel = process.env.OPENAI_JUDGE_MODEL;
const originalCandidateReleaseId = process.env.EDITORIAL_MODEL_CANDIDATE_RELEASE_ID;
const originalCalibrationAuth = process.env.TLDR_ALLOW_LIVE_LLM_CALIBRATION;
const originalJudgeReasoningEffort = process.env.OPENAI_JUDGE_REASONING_EFFORT;
const originalGenerationModel = process.env.OPENAI_GENERATION_MODEL;
const originalGenerationReasoningEffort = process.env.OPENAI_GENERATION_REASONING_EFFORT;
const originalGenerationCalibrationAuth = process.env.TLDR_ALLOW_LIVE_LLM_GENERATION_CALIBRATION;
const originalWriterCandidateReleaseId = process.env.EDITORIAL_WRITER_CANDIDATE_RELEASE_ID;
const originalWriterCalibrationAuth = process.env.TLDR_ALLOW_LIVE_LLM_WRITER_CALIBRATION;
const originalWriterModel = process.env.OPENAI_SKY_PLACEMENT_WRITER_MODEL;
const originalWriterReasoningEffort = process.env.OPENAI_SKY_PLACEMENT_WRITER_REASONING_EFFORT;

function restoreEnv(name, value) {
  if (value === undefined) delete process.env[name];
  else process.env[name] = value;
}

try {
  const registry = readRegistry();
  const writerEvaluation = require("../config/sky-placement-writer-evaluation-v2.json");
  validateRegistry(registry);
  assert.strictEqual(Object.keys(registry.lanes).length, 9);
  assert.strictEqual(registry.lanes["writer:sky-placement"].active, null);
  assert.strictEqual(registry.lanes["writer:sky-placement"].candidate.model, "gpt-5.6-sol");
  assert.strictEqual(registry.lanes["writer:sky-placement"].candidate.reasoningEffort, "xhigh");
  assert.strictEqual(writerEvaluation.candidateReleaseId, registry.lanes["writer:sky-placement"].candidate.releaseId);
  assert.throws(() => resolveActiveRelease({ role: "writer", surface: "sky-placement", registry }), /no active release/);

  const release = resolveActiveRelease({
    role: "judge",
    surface: "sky-article-longform",
    registry
  });
  assert.strictEqual(release.laneId, "judge:sky-article-longform");
  assert.strictEqual(release.model, "gpt-4.1-mini");

  const laneId = "judge:sky-article-longform";
  assert.strictEqual(registry.lanes["generation:default"].candidate.model, "gpt-5.6-terra");
  assert.strictEqual(registry.lanes["generation:sky-exact-aspect"].candidate.model, "gpt-5.6-sol");
  assert.strictEqual(registry.lanes["judge:sky-exact-aspect"].candidate.model, "gpt-5.6-sol");
  assert.strictEqual(registry.lanes["judge:sky-placement"].active.releaseId, "sky-placement-judge-openai-gpt-5.6-terra-v2");
  assert.strictEqual(registry.lanes["judge:sky-placement"].active.model, "gpt-5.6-terra");
  assert.strictEqual(registry.lanes["judge:sky-placement"].active.reasoningEffort, "low");
  assert.strictEqual(registry.lanes["judge:sky-placement"].candidate.model, "gpt-5.6-sol");
  assert.strictEqual(registry.lanes["judge:sky-placement"].candidate.reasoningEffort, "xhigh");
  assert.strictEqual(registry.lanes["judge:sky-placement"].rollback.model, "gpt-4.1-mini");
  assert.strictEqual(registry.lanes["judge:sky-placement"].history[0].action, "promote");
  assert.strictEqual(registry.lanes["judge:sky-placement"].history.at(-1).action, "promote");
  assert.strictEqual(registry.lanes["judge:sky-placement"].history.at(-1).approvedBy, "owner");
  const placementPromotionReport = require(path.join("..", "review", "sky-placement-judge-terra-promotion-calibration-v1.json"));
  const placementPromotionReportV2 = require(path.join("..", "review", "sky-placement-judge-terra-promotion-calibration-v2.json"));
  const placementPromotionInvalidation = require(path.join("..", "review", "sky-placement-judge-terra-promotion-provenance-invalidation-v1.json"));
  assert.strictEqual(placementPromotionInvalidation.promotionAuthorityValid, false);
  assert.strictEqual(placementPromotionInvalidation.promotionEligibleAfterProvenanceAudit, false);
  assert.strictEqual(
    registry.lanes["judge:sky-placement"].history[0].calibrationReportSha256,
    sha256(JSON.stringify(placementPromotionReport)),
    "the historical promotion entry must retain the exact technical report hash even after provenance invalidation"
  );
  assert.strictEqual(
    registry.lanes["judge:sky-placement"].history.at(-1).calibrationReportSha256,
    sha256(JSON.stringify(placementPromotionReportV2)),
    "the active Terra v2 promotion must point to the valid owner-approved calibration report"
  );
  assert.strictEqual(registry.lanes[laneId].candidate.model, "gpt-5.6-sol");
  assert.strictEqual(registry.lanes[laneId].candidate.reasoningEffort, "low");
  const candidate = {
    ...registry.lanes[laneId].active,
    releaseId: "sky-article-judge-test-candidate-v2",
    model: "test-private-model-v2",
    evaluationSetVersion: "sky-article-longform-heldout-v2"
  };
  const stageInput = JSON.parse(JSON.stringify(registry));
  stageInput.lanes[laneId].candidate = null;
  const staged = stageCandidate(stageInput, laneId, candidate);
  assert.deepStrictEqual(stageInput.lanes[laneId].candidate, null, "staging must not mutate its input");
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
  assert.throws(
    () => stageCandidate(stageInput, laneId, { ...candidate, reasoningEffort: "automatic" }),
    /reasoningEffort/
  );

  const report = {
    status: "passed",
    reportKind: "calibration",
    sampleCount: 5,
    promotionEligible: true,
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
  delete process.env.OPENAI_JUDGE_REASONING_EFFORT;
  delete process.env.EDITORIAL_MODEL_CANDIDATE_RELEASE_ID;
  delete process.env.TLDR_ALLOW_LIVE_LLM_CALIBRATION;
  const {
    generationConfig,
    judgeConfig,
    judgeConfigForOptions,
    openAiRequestSettings,
    skyPlacementWriterConfig,
    writerConfig
  } = require("./generate-sky-aspect-cards.js");
  const exactAspectActive = generationConfig("sky-exact-aspect");
  assert.strictEqual(exactAspectActive.laneId, "generation:sky-exact-aspect");
  assert.strictEqual(exactAspectActive.model, "gpt-4.1-mini");

  assert.throws(() => writerConfig("sky-placement"), /no active release/);
  const placementLegacyFallback = skyPlacementWriterConfig();
  assert.strictEqual(placementLegacyFallback.laneId, "generation:default");
  assert.strictEqual(placementLegacyFallback.model, "gpt-4.1-mini");
  assert.strictEqual(placementLegacyFallback.writerLaneId, "writer:sky-placement");
  assert.strictEqual(placementLegacyFallback.writerLaneState, "inactive-legacy-generation-fallback");

  process.env.EDITORIAL_WRITER_CANDIDATE_RELEASE_ID = registry.lanes["writer:sky-placement"].candidate.releaseId;
  delete process.env.TLDR_ALLOW_LIVE_LLM_WRITER_CALIBRATION;
  assert.throws(
    () => skyPlacementWriterConfig(),
    /explicitly authorized writer calibration/
  );
  process.env.TLDR_ALLOW_LIVE_LLM_WRITER_CALIBRATION = "1";
  process.env.CONTENT_GENERATION_PROVIDER_SKY_ASPECT = "claude";
  process.env.OPENAI_GENERATION_MODEL = "gpt-4.1-mini";
  const placementWriterCandidate = skyPlacementWriterConfig();
  assert.strictEqual(placementWriterCandidate.laneId, "writer:sky-placement");
  assert.strictEqual(placementWriterCandidate.registryState, "candidate");
  assert.strictEqual(placementWriterCandidate.model, "gpt-5.6-sol");
  assert.strictEqual(placementWriterCandidate.reasoningEffort, "xhigh");
  assert.strictEqual(placementWriterCandidate.registryOverride, false);
  assert.deepStrictEqual(
    openAiRequestSettings(placementWriterCandidate),
    { reasoning: { effort: "xhigh" } }
  );
  restoreEnv("CONTENT_GENERATION_PROVIDER_SKY_ASPECT", originalGenerationProvider);
  restoreEnv("OPENAI_GENERATION_MODEL", originalGenerationModel);
  delete process.env.EDITORIAL_WRITER_CANDIDATE_RELEASE_ID;
  delete process.env.TLDR_ALLOW_LIVE_LLM_WRITER_CALIBRATION;

  const configured = judgeConfig("sky-article-longform");
  assert.strictEqual(configured.laneId, laneId);
  assert.strictEqual(configured.releaseId, release.releaseId);
  assert.strictEqual(configured.registryOverride, false);
  const placementActive = judgeConfig("sky-placement");
  assert.strictEqual(placementActive.model, "gpt-5.6-terra");
  assert.strictEqual(placementActive.reasoningEffort, "low");
  assert.strictEqual(placementActive.registryState, "active");
  assert.strictEqual(placementActive.registryOverride, false, "generic OPENAI_MODEL must not override a surface-specific judge lane");

  process.env.OPENAI_JUDGE_MODEL = "temporary-evaluation-model";
  const overridden = judgeConfig("sky-article-longform");
  assert.strictEqual(overridden.model, "temporary-evaluation-model");
  assert.strictEqual(overridden.releaseId, release.releaseId);
  assert.strictEqual(overridden.registryOverride, true);

  process.env.OPENAI_JUDGE_MODEL = registry.lanes[laneId].candidate.model;
  process.env.OPENAI_JUDGE_REASONING_EFFORT = registry.lanes[laneId].candidate.reasoningEffort;
  process.env.EDITORIAL_MODEL_CANDIDATE_RELEASE_ID = registry.lanes[laneId].candidate.releaseId;
  process.env.TLDR_ALLOW_LIVE_LLM_CALIBRATION = "1";
  const candidateConfig = judgeConfig("sky-article-longform");
  assert.strictEqual(candidateConfig.model, "gpt-5.6-sol");
  assert.strictEqual(candidateConfig.reasoningEffort, "low");
  assert.strictEqual(candidateConfig.registryState, "candidate");
  assert.strictEqual(
    judgeConfigForOptions({ surface: "sky-article-longform" }).releaseId,
    registry.lanes[laneId].candidate.releaseId,
    "the request helper must preserve the long-form surface instead of falling back to sky-aspect"
  );
  assert.deepStrictEqual(
    openAiRequestSettings(candidateConfig),
    { reasoning: { effort: "low" } }
  );

  delete process.env.EDITORIAL_MODEL_CANDIDATE_RELEASE_ID;
  delete process.env.TLDR_ALLOW_LIVE_LLM_CALIBRATION;
  delete process.env.OPENAI_JUDGE_REASONING_EFFORT;
  process.env.OPENAI_JUDGE_MODEL = "gpt-5.6-terra";
  const temporaryGpt56 = judgeConfig("sky-article-longform");
  assert.strictEqual(temporaryGpt56.reasoningEffort, "none");
  assert.strictEqual(temporaryGpt56.registryOverride, true);

  delete process.env.OPENAI_JUDGE_MODEL;
  process.env.EDITORIAL_MODEL_CANDIDATE_RELEASE_ID = registry.lanes["generation:default"].candidate.releaseId;
  assert.throws(
    () => generationConfig(),
    /explicitly authorized generation calibration/
  );
  process.env.TLDR_ALLOW_LIVE_LLM_GENERATION_CALIBRATION = "1";
  process.env.OPENAI_GENERATION_MODEL = registry.lanes["generation:default"].candidate.model;
  process.env.OPENAI_GENERATION_REASONING_EFFORT = registry.lanes["generation:default"].candidate.reasoningEffort;
  const generationCandidate = generationConfig();
  assert.strictEqual(generationCandidate.model, "gpt-5.6-terra");
  assert.strictEqual(generationCandidate.reasoningEffort, "none");
  assert.strictEqual(generationCandidate.registryState, "candidate");

  process.env.EDITORIAL_MODEL_CANDIDATE_RELEASE_ID = "unapproved-candidate";
  assert.throws(
    () => judgeConfig("sky-article-longform"),
    /explicitly authorized judge calibration/
  );

  console.log("Editorial model registry: 9 lanes valid; inactive writer candidate, stage, gated promotion, rollback, and override audit passed.");
} finally {
  restoreEnv("TLDR_ALLOW_MODEL_PROMOTION", originalPromotionAuth);
  restoreEnv("CONTENT_JUDGE_PROVIDER", originalJudgeProvider);
  restoreEnv("CONTENT_GENERATION_PROVIDER_SKY_ASPECT", originalGenerationProvider);
  restoreEnv("OPENAI_JUDGE_MODEL", originalJudgeModel);
  restoreEnv("OPENAI_JUDGE_REASONING_EFFORT", originalJudgeReasoningEffort);
  restoreEnv("OPENAI_GENERATION_MODEL", originalGenerationModel);
  restoreEnv("OPENAI_GENERATION_REASONING_EFFORT", originalGenerationReasoningEffort);
  restoreEnv("TLDR_ALLOW_LIVE_LLM_GENERATION_CALIBRATION", originalGenerationCalibrationAuth);
  restoreEnv("EDITORIAL_WRITER_CANDIDATE_RELEASE_ID", originalWriterCandidateReleaseId);
  restoreEnv("TLDR_ALLOW_LIVE_LLM_WRITER_CALIBRATION", originalWriterCalibrationAuth);
  restoreEnv("OPENAI_SKY_PLACEMENT_WRITER_MODEL", originalWriterModel);
  restoreEnv("OPENAI_SKY_PLACEMENT_WRITER_REASONING_EFFORT", originalWriterReasoningEffort);
  restoreEnv("EDITORIAL_MODEL_CANDIDATE_RELEASE_ID", originalCandidateReleaseId);
  restoreEnv("TLDR_ALLOW_LIVE_LLM_CALIBRATION", originalCalibrationAuth);
}
