#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");
const { assertLiveJudgeAuthorized } = require("./editorial-judge-runtime.js");
const { judgeConfig } = require("./generate-sky-aspect-cards.js");
const {
  manifest: baseManifest,
  runEvaluation
} = require("./run-sky-placement-judge-ab-evaluation.js");

const root = path.join(__dirname, "..");
const targetedManifest = JSON.parse(fs.readFileSync(
  path.join(root, "config", "sky-placement-judge-targeted-evaluation-v2.json"),
  "utf8"
));
const fixtureSet = JSON.parse(fs.readFileSync(
  path.join(root, "voice", "tldr-astro", "fixtures", "sky-placement-judge-targeted-v2.json"),
  "utf8"
));
const evaluationManifest = { ...targetedManifest, pricing: baseManifest.pricing };
const defaultOutDir = path.join(root, "out", "sky-placement-judge-targeted-v2");

function buildTargetedFixtures() {
  return fixtureSet.fixtures.map((fixture) => JSON.parse(JSON.stringify(fixture)));
}

function parseArgs(argv = process.argv.slice(2)) {
  const options = { authorizeLive: false, outDir: defaultOutDir };
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === "--plan") continue;
    if (token === "--authorize-live") options.authorizeLive = true;
    else if (token === "--out") {
      if (!argv[index + 1]) throw new Error("--out requires a directory.");
      options.outDir = path.resolve(argv[++index]);
    } else throw new Error(`Unknown argument '${token}'.`);
  }
  return options;
}

function printPlan() {
  const fixtures = buildTargetedFixtures();
  console.log(JSON.stringify({
    evaluationId: evaluationManifest.evaluationId,
    activeRuntime: evaluationManifest.runtime.activeReleaseId,
    runtimeChanged: false,
    fixtureCount: fixtures.length,
    correctedGoldControls: fixtures.filter((fixture) => fixture.expectedClass === "approved").length,
    targetedRuleControls: fixtures.filter((fixture) => fixture.expectedClass === "known-weak").length,
    treatments: evaluationManifest.treatments,
    requestCount: fixtures.length * Object.keys(evaluationManifest.treatments).length,
    samplesPerFixture: evaluationManifest.samplesPerFixture,
    promotionEligible: false
  }, null, 2));
}

async function main() {
  const options = parseArgs();
  if (!options.authorizeLive) {
    printPlan();
    return;
  }
  assertLiveJudgeAuthorized({ calibration: true });
  const config = judgeConfig("sky-placement");
  if (!config.apiKey) throw new Error("OPENAI_API_KEY is not configured.");
  const result = await runEvaluation({
    apiKey: config.apiKey,
    outDir: options.outDir,
    fixtures: buildTargetedFixtures(),
    evaluationManifest
  });
  const cost = Object.values(result.internal.treatments)
    .reduce((sum, treatment) => sum + treatment.estimatedCostUsd, 0);
  console.log(`Completed ${result.internal.requestCount} targeted blinded evaluation calls.`);
  console.log(`Combined estimated cost: $${cost.toFixed(4)}.`);
  console.log(`Owner packet: ${path.join(options.outDir, "blind-owner-review.md")}`);
  console.log("The targeted model key remains separate; no model was promoted.");
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}

module.exports = {
  buildTargetedFixtures,
  evaluationManifest,
  fixtureSet,
  parseArgs
};
