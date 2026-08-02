#!/usr/bin/env node
"use strict";

const assert = require("assert");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { lintArticle } = require("./lint-placement-voice.js");
const { runEvaluation } = require("./run-sky-placement-judge-ab-evaluation.js");
const {
  buildTargetedFixtures,
  evaluationManifest,
  fixtureSet
} = require("./run-sky-placement-judge-targeted-evaluation.js");

const activeSpec = require(path.join("..", "voice", "tldr-astro", "sky-placement.json"));
const historical = require(path.join("..", "voice", "tldr-astro", "fixtures", "sky-placement-historical-second-person.json"));
const secondPerson = () => /\b(?:you|your|yours|yourself|you(?:'|’)?re|you(?:'|’)?ve|you(?:'|’)?ll|you(?:'|’)?d)\b/gi;

function fullText(article) {
  return [article.tagline, article.hook, article.lived, article.turn, ...(article.moves || [])]
    .filter(Boolean)
    .join("\n");
}

async function main() {
  assert.strictEqual(activeSpec.id, "tldr-astro.voice.sky-placement.v3");
  for (const exemplar of activeSpec.exemplars) {
    assert.doesNotMatch(JSON.stringify(exemplar), secondPerson(), `${exemplar.sourceId} must be collective in every active field`);
    assert.strictEqual(lintArticle({ ...exemplar }).score, 3, `${exemplar.sourceId} must lint clean without a legacy exemption`);
  }
  assert.strictEqual(historical.activeCalibration, false);
  assert.strictEqual(historical.generationEvidence, false);
  assert.strictEqual(historical.judgeGoldEvidence, false);
  assert.strictEqual(historical.exemplars.length, activeSpec.exemplars.length);
  assert(historical.exemplars.some((exemplar) => secondPerson().test(JSON.stringify(exemplar))), "historical file must preserve the former perspective");

  const fixtures = buildTargetedFixtures();
  assert.strictEqual(fixtureSet.fixtureSetId, "sky-placement-targeted-rules-v2");
  assert.strictEqual(fixtures.length, 8);
  assert.strictEqual(fixtures.filter((fixture) => fixture.expectedClass === "approved").length, 2);
  assert.strictEqual(fixtures.filter((fixture) => fixture.expectedClass === "known-weak").length, 6);
  assert.strictEqual(evaluationManifest.treatments.baseline.model, "gpt-5.6-terra");
  assert.strictEqual(evaluationManifest.treatments.baseline.reasoningEffort, "low");
  assert.strictEqual(evaluationManifest.treatments.candidate.model, "gpt-5.6-sol");
  assert.strictEqual(evaluationManifest.treatments.candidate.reasoningEffort, "xhigh");
  assert.strictEqual(evaluationManifest.promotionGate.thisRunPromotionEligible, false);

  for (const caseId of ["target-003", "target-004"]) {
    const fixture = fixtures.find((item) => item.caseId === caseId);
    const hits = fullText(fixture.article).match(secondPerson()) || [];
    assert.strictEqual(hits.length, 1, `${caseId} must contain exactly one prohibited second-person token`);
    const lint = lintArticle({ ...fixture.article, planet: fixture.planet, sign: fixture.sign });
    assert(lint.findings.some((finding) => finding.term === "second-person"), `${caseId} must fail the mechanical rule too`);
  }
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
  assert.strictEqual(calls.length, 16);
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

  console.log("Targeted Sky Placement evaluation passed: conflict-free golds, historical originals isolated, two exact-pronoun controls, 16 paired calls, and no promotion path.");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
