"use strict";

const assert = require("assert");
const { assertResolvedCandidate, buildCalibrationReport } = require("./run-editorial-model-calibration.js");
const { readRegistry, stageCandidate, validateCalibrationReport } = require("./editorial-model-registry.js");

const laneId = "judge:sky-article-longform";
const registry = readRegistry();
const candidate = {
  ...registry.lanes[laneId].active,
  releaseId: "sky-article-candidate-report-test-v2",
  model: "private-candidate-v2"
};
const staged = stageCandidate(registry, laneId, candidate);
const release = {
  laneId,
  registryVersion: staged.registryVersion,
  registryState: "candidate",
  ...candidate
};
const fixture = (id, score, disagreement = false) => ({
  fixture: {
    id,
    file: `${id}.md`,
    sha256: "a".repeat(64),
    text: "PROPRIETARY TEXT MUST NOT ENTER THE REPORT"
  },
  result: { score, verdict: score === 3 ? "in-voice" : "off-voice", disagreement }
});
const result = {
  status: "passed",
  sampleCount: 5,
  approvedMean: 3,
  weakMean: 1.5,
  separation: 1.5,
  minimumSeparation: 1,
  disagreement: false,
  approved: [fixture("approved-one", 3)],
  weak: [fixture("weak-one", 1)]
};

const report = buildCalibrationReport({
  laneId,
  release,
  result,
  recordedAt: "2026-07-31T20:00:00.000Z",
  sourceRevision: "test-sha"
});
validateCalibrationReport(report, candidate);
assert.doesNotThrow(() => assertResolvedCandidate(release, release));
assert.throws(
  () => assertResolvedCandidate({ ...release, model: "wrong-model" }, release),
  /did not resolve the staged candidate/
);
assert.strictEqual(report.releaseId, candidate.releaseId);
assert.strictEqual(report.reasoningEffort, null);
assert.strictEqual(report.reportKind, "calibration");
assert.strictEqual(report.sampleCount, 5);
assert.strictEqual(report.promotionEligible, true);
assert.strictEqual(report.approved[0].id, "approved-one");
assert.strictEqual(report.weakControls[0].score, 1);
assert.ok(!JSON.stringify(report).includes("PROPRIETARY TEXT"));
assert.ok(!Object.hasOwn(report.approved[0], "text"));

assert.throws(
  () => validateCalibrationReport({ ...report, disagreement: true }, candidate),
  /disagreement/
);

const smokeReport = buildCalibrationReport({
  laneId,
  release,
  result: { ...result, sampleCount: 1 },
  recordedAt: "2026-07-31T20:01:00.000Z",
  sourceRevision: "test-sha"
});
assert.strictEqual(smokeReport.reportKind, "smoke");
assert.strictEqual(smokeReport.promotionEligible, false);
assert.throws(
  () => validateCalibrationReport(smokeReport, candidate),
  /promotion-eligible calibration report/
);

console.log("Editorial calibration report: candidate provenance, promotion contract, and no-copy artifact passed.");
