#!/usr/bin/env node
"use strict";

const assert = require("assert");
const { readRegistry, resolveCandidateRelease } = require("./editorial-model-registry.js");
const {
  buildEvaluationPlan,
  buildEvaluationReport,
  parseArgs,
  runOwnerCorpusEvaluation
} = require("./run-owner-article-corpus-evaluation.js");
const {
  TARGET_IDS,
  buildTargetedPlan,
  buildTargetedReport,
  parseArgs: parseTargetedArgs,
  runTargetedProbe,
  selectTargets
} = require("./run-owner-article-targeted-probe.js");

const laneId = "judge:sky-article-longform";
const registry = readRegistry();
const release = resolveCandidateRelease({
  role: "judge",
  surface: "sky-article-longform",
  releaseId: registry.lanes[laneId].candidate.releaseId,
  registry
});

assert.deepStrictEqual(parseArgs(["--plan", "--samples", "5"]), {
  lane: laneId,
  samples: 5,
  plan: true
});
assert.deepStrictEqual(parseArgs([]), { lane: laneId, samples: 1 });
assert.throws(() => parseArgs(["--plan", "--authorize-live"]), /either --plan or --authorize-live/);

const plan = buildEvaluationPlan({ samples: 5, release });
assert.deepStrictEqual(plan.cohorts, {
  activeApproved: 4,
  calibrationCandidates: 4,
  diagnosticSameSurface: 4,
  weakControls: 2
});
assert.strictEqual(plan.articlesPerSample, 14);
assert.strictEqual(plan.totalJudgeCalls, 70);
assert.strictEqual(plan.adjacentFormatsExcluded, 35);
assert.deepStrictEqual(plan.excludedReferenceCohorts, {
  adjacentFormats: 7,
  additionalSurfaceReferences: 28
});
assert.strictEqual(plan.liveAuthorizationRequired, true);
assert.strictEqual(plan.mutatesProduction, false);
assert.strictEqual(plan.releaseAligned, true);

assert.deepStrictEqual(parseTargetedArgs(["--plan"]), { plan: true });
assert.throws(() => parseTargetedArgs(["--plan", "--authorize-live"]), /either --plan or --authorize-live/);
assert.strictEqual(selectTargets().length, 4);
assert.deepStrictEqual(selectTargets().map((fixture) => fixture.id), TARGET_IDS);
const targetedPlan = buildTargetedPlan(release);
assert.strictEqual(targetedPlan.totalJudgeCalls, 4);
assert.strictEqual(targetedPlan.samplesPerArticle, 1);
assert.strictEqual(targetedPlan.promotionEligible, false);
assert.strictEqual(targetedPlan.mutatesProduction, false);

function evidenceVerdict(score, fixture, checkId = "direct-lived-register") {
  const passing = score === 3;
  return {
    score,
    verdict: passing ? "in-voice" : score === 2 ? "borderline" : "off-voice",
    failedChecks: passing ? [] : [checkId],
    evidence: passing ? [] : [{
      checkId,
      sentence: fixture.text.split("\n").find(Boolean),
      reason: "Fixture-controlled evidence for the named check.",
      rewrite: "You can see the concrete situation and the available choice clearly."
    }],
    why: "fixture-controlled response"
  };
}

let calls = 0;
const cleanJudge = async (prompt, { cohort, fixture }) => {
  calls += 1;
  if (cohort === "weak-control") assert.ok(prompt.includes("OWNER-VERBATIM PROVENANCE: No exemption is asserted."));
  else assert.ok(prompt.includes("OWNER-VERBATIM PROVENANCE: This is owner-published text."));
  const score = cohort === "weak-control" ? 1 : 3;
  return JSON.stringify(evidenceVerdict(score, fixture));
};

(async () => {
  const result = await runOwnerCorpusEvaluation({
    judgeFn: cleanJudge,
    samples: 5,
    quiet: true
  });
  assert.strictEqual(calls, 70);
  assert.strictEqual(result.status, "passed");
  assert.strictEqual(result.approvedMean, 3);
  assert.strictEqual(result.diagnosticMean, 3);
  assert.strictEqual(result.weakMean, 1);
  assert.strictEqual(result.separation, 2);
  assert.strictEqual(result.disagreement, false);

  const report = buildEvaluationReport({
    laneId,
    release,
    result,
    recordedAt: "2026-08-01T12:00:00.000Z",
    sourceRevision: "test-revision"
  });
  assert.strictEqual(report.reportKind, "expanded-evaluation");
  assert.strictEqual(report.releaseAligned, true);
  assert.strictEqual(report.promotionEligible, false);
  assert.strictEqual(report.activeApproved.length, 4);
  assert.strictEqual(report.calibrationCandidates.length, 4);
  assert.strictEqual(report.diagnosticSameSurface.length, 4);
  assert.strictEqual(report.weakControls.length, 2);
  assert.deepStrictEqual(report.activeApproved[0].failedChecks, []);
  assert.deepStrictEqual(report.weakControls[0].failedChecks, ["direct-lived-register"]);
  assert.deepStrictEqual(report.activeApproved[0].evidenceSummary, []);
  assert.strictEqual(report.weakControls[0].evidenceSummary[0].checkId, "direct-lived-register");
  assert.match(report.weakControls[0].evidenceSummary[0].sentenceSha256, /^[a-f0-9]{64}$/);
  assert.ok(!JSON.stringify(report).includes("fixture-controlled response"));
  assert.ok(!JSON.stringify(report).includes("Fixture-controlled evidence"));
  assert.ok(!JSON.stringify(report).includes("You can see the concrete situation"));
  assert.ok(!Object.hasOwn(report.diagnosticSameSurface[0], "text"));

  const failed = await runOwnerCorpusEvaluation({
    samples: 1,
    quiet: true,
    judgeFn: async (_prompt, { cohort, fixture }) => {
      const score = cohort === "weak-control" ? 1 : cohort === "diagnostic-same-surface" ? 2 : 3;
      return JSON.stringify(evidenceVerdict(score, fixture, "recognizability"));
    }
  });
  assert.strictEqual(failed.status, "failed", "Diagnostic owner-piece misses must fail expanded evaluation.");

  let targetedCalls = 0;
  const targeted = await runTargetedProbe({
    judgeFn: async (_prompt, { fixture }) => {
      targetedCalls += 1;
      return JSON.stringify(evidenceVerdict(3, fixture));
    }
  });
  assert.strictEqual(targetedCalls, 4);
  assert.strictEqual(targeted.status, "passed-diagnostic");
  const targetedReport = buildTargetedReport({
    release,
    result: targeted,
    recordedAt: "2026-08-01T12:30:00.000Z"
  });
  assert.strictEqual(targetedReport.totalJudgeCalls, 4);
  assert.strictEqual(targetedReport.promotionEligible, false);
  assert.strictEqual(targetedReport.results.length, 4);
  assert.ok(!JSON.stringify(targetedReport).includes("fixture-controlled response"));

  console.log("Owner article expanded evaluation: cohort isolation, 70-call plan, four-call targeted probe, diagnostic gate, and no-copy report passed.");
})().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
