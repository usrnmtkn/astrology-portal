#!/usr/bin/env node
"use strict";

const assert = require("assert");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { buildJudgePrompt } = require("./judge-placement-voice.js");
const { lintArticle } = require("./lint-placement-voice.js");
const { runEvaluation } = require("./run-sky-placement-judge-ab-evaluation.js");
const {
  buildTargetedFixtures,
  evaluationManifest,
  fixtureSet
} = require("./run-sky-placement-judge-targeted-evaluation.js");

const activeSpec = require(path.join("..", "voice", "tldr-astro", "sky-placement.json"));
const historical = require(path.join("..", "voice", "tldr-astro", "fixtures", "sky-placement-historical-second-person.json"));
const ownerReview = require(path.join("..", "review", "sky-placement-judge-targeted-v3-owner-review.json"));
const uranusCancerApprovalCandidate = require(path.join("..", "review", "sky-placement-uranus-cancer-owner-approval-candidate-v1.json"));
const uranusCancerReviewCandidateV2 = require(path.join("..", "review", "sky-placement-uranus-cancer-owner-review-candidate-v2.json"));
const secondPerson = () => /\b(?:you|your|yours|yourself|yourselves|you(?:'|’)?re|you(?:'|’)?ve|you(?:'|’)?ll|you(?:'|’)?d)\b/gi;

function fullText(article) {
  return [article.tagline, article.hook, article.lived, article.turn, ...(article.moves || [])]
    .filter(Boolean)
    .join("\n");
}

async function main() {
  assert.strictEqual(activeSpec.id, "tldr-astro.voice.sky-placement.v5");
  for (const exemplar of activeSpec.exemplars) {
    assert.doesNotMatch(JSON.stringify(exemplar), secondPerson(), `${exemplar.sourceId} must be collective in every active field`);
    assert.strictEqual(lintArticle({ ...exemplar }).score, 3, `${exemplar.sourceId} must lint clean without a legacy exemption`);
    assert.strictEqual(exemplar.editorialStatus, "collective_adaptation_candidate");
    assert.strictEqual(exemplar.reviewStatus, "needs_review");
    assert.strictEqual(exemplar.ownerApproved, false);
    assert.strictEqual(exemplar.promotionAuthorized, false);
    assert.strictEqual(exemplar.canonical, false);
  }
  assert.strictEqual(activeSpec.exemplars.filter((exemplar) => exemplar.editorialStatus === "current_sky_owner_approved").length, 0);
  assert.strictEqual(activeSpec.ownerApprovedCalibrationExamples.length, 1);
  const approvedCalibration = activeSpec.ownerApprovedCalibrationExamples[0];
  assert.strictEqual(approvedCalibration.editorialStatus, "current_sky_owner_approved");
  assert.strictEqual(approvedCalibration.reviewStatus, "approved");
  assert.strictEqual(approvedCalibration.ownerApproved, true);
  assert.strictEqual(approvedCalibration.promotionAuthorized, false);
  assert.strictEqual(approvedCalibration.canonical, false);
  assert.strictEqual(approvedCalibration.calibrationEligible, true);
  assert.strictEqual(historical.activeCalibration, false);
  assert.strictEqual(historical.generationEvidence, false);
  assert.strictEqual(historical.judgeGoldEvidence, false);
  assert.strictEqual(historical.editorialStatus, "historical_owner_approved");
  assert.strictEqual(historical.ownerApproved, true);
  assert.strictEqual(historical.currentSkyCalibrationEligible, false);
  assert.strictEqual(historical.exemplars.length, activeSpec.exemplars.length);
  assert(historical.exemplars.some((exemplar) => secondPerson().test(JSON.stringify(exemplar))), "historical file must preserve the former perspective");

  const fixtures = buildTargetedFixtures();
  assert.strictEqual(fixtureSet.fixtureSetId, "sky-placement-targeted-provenance-v3");
  assert.strictEqual(fixtures.length, 9);
  assert.strictEqual(fixtures.filter((fixture) => fixture.classification === "positive_collective_control").length, 3);
  assert.strictEqual(fixtures.filter((fixture) => fixture.classification === "single_pronoun_failure").length, 2);
  assert.strictEqual(fixtures.filter((fixture) => fixture.classification === "domain_drift_failure").length, 1);
  assert.strictEqual(fixtures.filter((fixture) => fixture.classification === "natural_english_failure").length, 1);
  assert.strictEqual(fixtures.filter((fixture) => fixture.classification === "editorial_restraint_control").length, 1);
  assert.strictEqual(fixtures.filter((fixture) => fixture.classification === "overwriting_failure").length, 1);
  assert(fixtures.every((fixture) => fixture.ownerApproved === false));
  assert(fixtures.every((fixture) => fixture.promotionAuthorized === false));
  assert.strictEqual(evaluationManifest.treatments.baseline.model, "gpt-5.6-terra");
  assert.strictEqual(evaluationManifest.treatments.baseline.reasoningEffort, "low");
  assert.strictEqual(evaluationManifest.treatments.candidate.model, "gpt-5.6-sol");
  assert.strictEqual(evaluationManifest.treatments.candidate.reasoningEffort, "xhigh");
  assert.strictEqual(evaluationManifest.promotionGate.thisRunPromotionEligible, false);
  assert.strictEqual(evaluationManifest.evaluationSetVersion, "sky-placement-targeted-provenance-v3");
  assert.deepStrictEqual(ownerReview.preferenceTotals, {
    "gpt-5.6-sol": 4,
    "gpt-5.6-terra": 4,
    ties: 1
  });
  assert.strictEqual(ownerReview.modelMapping.A.model, "gpt-5.6-sol");
  assert.strictEqual(ownerReview.modelMapping.B.model, "gpt-5.6-terra");
  assert.strictEqual(ownerReview.decision.promotionRecommended, false);
  assert.strictEqual(ownerReview.decision.activeRuntimeChanged, false);
  assert.strictEqual(ownerReview.calibrationFollowUps[0].caseId, "target-006");
  assert.strictEqual(ownerReview.calibrationFollowUps[0].automaticRubricChangeAuthorized, false);
  assert.strictEqual(ownerReview.adaptationProvenance.ownerApproved, false);
  assert.strictEqual(ownerReview.adaptationProvenance.promotionAuthorized, false);

  const frozenTarget002 = fixtures.find((fixture) => fixture.caseId === "target-002");
  assert.match(frozenTarget002.article.hook, /old arrangement asks one person/);
  assert.match(frozenTarget002.article.turn, /carries the transition alone/);
  assert.strictEqual(uranusCancerApprovalCandidate.editorialStatus, "current_sky_owner_approved");
  assert.strictEqual(uranusCancerApprovalCandidate.reviewStatus, "approved");
  assert.strictEqual(uranusCancerApprovalCandidate.ownerApproved, true);
  assert.strictEqual(uranusCancerApprovalCandidate.promotionAuthorized, false);
  assert.strictEqual(uranusCancerApprovalCandidate.canonical, false);
  assert.strictEqual(uranusCancerApprovalCandidate.provenance.frozenEvaluationPreserved, true);
  assert.deepStrictEqual(uranusCancerApprovalCandidate.article, {
    tagline: approvedCalibration.tagline,
    hook: approvedCalibration.hook,
    lived: approvedCalibration.lived,
    turn: approvedCalibration.turn,
    moves: approvedCalibration.moves
  });
  assert.match(uranusCancerApprovalCandidate.article.hook, /one person has been carrying too much for too long/);
  assert.match(uranusCancerApprovalCandidate.article.turn, /explain it, enforce it, and reorganize the household around it/);
  assert.strictEqual(
    lintArticle({ ...uranusCancerApprovalCandidate.article, planet: "uranus", sign: "cancer" }).score,
    3,
    "the exact owner-approved calibration article must remain lint-clean"
  );
  assert.strictEqual(uranusCancerReviewCandidateV2.editorialStatus, "collective_adaptation_candidate");
  assert.strictEqual(uranusCancerReviewCandidateV2.reviewStatus, "needs_review");
  assert.strictEqual(uranusCancerReviewCandidateV2.ownerApproved, false);
  assert.strictEqual(uranusCancerReviewCandidateV2.promotionAuthorized, false);
  assert.strictEqual(uranusCancerReviewCandidateV2.canonical, false);
  assert.strictEqual(uranusCancerReviewCandidateV2.provenance.replacesApprovedCalibrationEvidence, false);
  assert.strictEqual(uranusCancerReviewCandidateV2.provenance.frozenEvaluationPreserved, true);
  assert.strictEqual(
    lintArticle({ ...uranusCancerReviewCandidateV2.article, planet: "uranus", sign: "cancer" }).score,
    3,
    "the new editorial revision must lint clean without inheriting v1 approval"
  );
  assert.notDeepStrictEqual(uranusCancerReviewCandidateV2.article, uranusCancerApprovalCandidate.article);

  const goldPrompt = buildJudgePrompt(fixtures[0].article, fixtures[0]);
  assert.match(goldPrompt, /CURRENT SKY OWNER-APPROVED FULL-ARTICLE GOLD/);
  assert.match(goldPrompt, /Home changes when one person has been carrying too much for too long/);
  assert.doesNotMatch(goldPrompt, /None yet\. Collective adaptation candidates are deliberately excluded/);
  assert.doesNotMatch(goldPrompt, /Feelings get translated into tasks/);
  assert.match(goldPrompt, /FIRST-READ NATURAL ENGLISH RULE/);
  assert.match(goldPrompt, /The banished want refuses to stay reasonable/);
  assert.match(goldPrompt, /ALLOWED COLLECTIVE LANGUAGE/);
  assert.match(goldPrompt, /STACKED ENDING RULE/);
  assert.match(goldPrompt, /Score 3 does not require flawless prose/);

  const unnatural = fixtures.find((fixture) => fixture.caseId === "target-006");
  const unnaturalLint = lintArticle({ ...unnatural.article, planet: unnatural.planet, sign: unnatural.sign });
  assert.strictEqual(unnaturalLint.score, 1);
  assert(unnaturalLint.findings.some((finding) => finding.source === "first-read-natural-english"));

  for (const caseId of ["target-003", "target-004"]) {
    const fixture = fixtures.find((item) => item.caseId === caseId);
    const hits = fullText(fixture.article).match(secondPerson()) || [];
    assert.strictEqual(hits.length, 1, `${caseId} must contain exactly one prohibited second-person token`);
    const lint = lintArticle({ ...fixture.article, planet: fixture.planet, sign: fixture.sign });
    assert(lint.findings.some((finding) => finding.term === "second-person"), `${caseId} must fail the mechanical rule too`);
  }
  assert.doesNotMatch(fullText(fixtures.find((fixture) => fixture.caseId === "target-009").article), secondPerson());
  assert(fixtures.some((fixture) => fixture.ruleUnderTest === "astrological-domain-drift"));
  assert(fixtures.some((fixture) => fixture.ruleUnderTest === "literal-english"));
  assert(fixtures.some((fixture) => fixture.ruleUnderTest === "one-close-restraint"));
  assert(fixtures.some((fixture) => fixture.ruleUnderTest === "preserve-clear-owner-writing"));
  assert(fixtures.some((fixture) => fixture.ruleUnderTest === "proportional-editorial-restraint"));

  const calls = [];
  const requestFn = async ({ treatmentKey, treatment, fixture, prompt }) => {
    calls.push({ treatmentKey, caseId: fixture.caseId, prompt });
    const score = fixture.expectedScore || fixture.expectedMaximumScore || 2;
    return {
      latencyMs: treatmentKey === "baseline" ? 100 : 200,
      payload: {
        model: treatment.model,
        output_text: JSON.stringify({
          score,
          verdict: score === 3 ? "in-voice" : score === 2 ? "borderline" : "off-voice",
          weakest: score === 3 ? "" : "The targeted line.",
          why: score === 3 ? "Preserve the clear writing." : "The targeted rule is violated."
        }),
        usage: { input_tokens: 900, output_tokens: 90, total_tokens: 990 }
      }
    };
  };
  const outDir = fs.mkdtempSync(path.join(os.tmpdir(), "sky-placement-targeted-test-"));
  const result = await runEvaluation({
    requestFn,
    apiKey: "injected-test-key",
    outDir,
    fixtures,
    evaluationManifest,
    blindSeed: "targeted-test-seed",
    now: () => new Date("2026-08-02T14:00:00.000Z")
  });
  assert.strictEqual(calls.length, 18);
  for (const fixture of fixtures) {
    const pair = calls.filter((call) => call.caseId === fixture.caseId);
    assert.strictEqual(pair.length, 2);
    assert.strictEqual(pair[0].prompt, pair[1].prompt, `${fixture.caseId} must use an identical paired prompt`);
  }
  assert.strictEqual(result.internal.promotionEligible, false);
  assert.strictEqual(result.internal.runtimeChanged, false);
  const blind = fs.readFileSync(path.join(outDir, "blind-owner-review.md"), "utf8")
    + fs.readFileSync(path.join(outDir, "blind-owner-scorecard.json"), "utf8");
  assert.doesNotMatch(blind, /gpt-5\.6|\bterra\b|\bsol\b|reasoningEffort|expectedClass|sourceId|known-weak/i);

  console.log("Targeted Sky Placement evaluation passed: no unapproved golds, three provenance-labeled positive controls, two exact-pronoun failures, 18 paired calls, and no promotion path.");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
