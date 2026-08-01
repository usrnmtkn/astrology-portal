#!/usr/bin/env node
//
// Calibration for the long-form article judge. Owner-published fixtures are
// canonical 3s; intentionally weak controls must remain materially below
// them. Live calls are an explicit CI/admin action, never an ordinary test.

const assert = require("assert");
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const { judgeLongformArticle } = require("./judge-article-voice.js");

const fixtureRoot = path.join(__dirname, "..", "voice", "tldr-astro", "fixtures", "sky-article-longform");
const manifest = require(path.join(fixtureRoot, "manifest.json"));
const weakRoot = path.join(fixtureRoot, "weak-controls");
const weakManifest = require(path.join(weakRoot, "manifest.json"));

function loadOwnerFixtures() {
  return manifest.map((entry) => {
    const filePath = path.join(fixtureRoot, entry.file);
    const text = fs.readFileSync(filePath, "utf8");
    const sha256 = crypto.createHash("sha256").update(text).digest("hex");
    assert.strictEqual(sha256, entry.sha256, `${entry.file} must remain owner-verbatim`);
    return { ...entry, filePath, text };
  });
}

function loadWeakControls() {
  return weakManifest.map((entry) => {
    const filePath = path.join(weakRoot, entry.file);
    const text = fs.readFileSync(filePath, "utf8");
    const sha256 = crypto.createHash("sha256").update(text).digest("hex");
    assert.strictEqual(sha256, entry.sha256, `${entry.file} weak control must remain byte-verified`);
    return { ...entry, filePath, text };
  });
}

const mean = (values) => values.reduce((sum, value) => sum + value, 0) / Math.max(1, values.length);

async function runArticleJudgeCalibration({ judgeFn, minimumSeparation = 1, samples = 5 } = {}) {
  const sampleCount = Number(samples);
  if (!Number.isInteger(sampleCount) || sampleCount < 1) {
    throw new Error("Calibration samples must be a positive integer.");
  }
  const approved = [];
  for (const fixture of loadOwnerFixtures()) {
    const result = await judgeLongformArticle(fixture.text, {
      planet: fixture.planet,
      edition: fixture.edition,
      samples: sampleCount,
      judgeFn: judgeFn ? (prompt) => judgeFn(prompt, { cohort: "approved", fixture }) : undefined,
      calibration: true
    });
    approved.push({ fixture, result });
    console.log(`${result.score === 3 ? "OK " : "!! "} owner fixture ${fixture.title} -> ${result.score} (${result.verdict})`);
  }

  const weak = [];
  for (const fixture of loadWeakControls()) {
    const result = await judgeLongformArticle(fixture.text, {
      planet: fixture.planet,
      edition: fixture.edition,
      samples: sampleCount,
      judgeFn: judgeFn ? (prompt) => judgeFn(prompt, { cohort: "weak", fixture }) : undefined,
      calibration: true
    });
    weak.push({ fixture, result });
    console.log(`${result.score <= 2 ? "OK " : "!! "} weak control ${fixture.title} -> ${result.score} (${result.verdict})`);
  }

  const approvedMean = mean(approved.map(({ result }) => result.score));
  const weakMean = mean(weak.map(({ result }) => result.score));
  const separation = approvedMean - weakMean;
  const disagreement = [...approved, ...weak].some(({ result }) => result.disagreement);
  const scoreFailure = approved.some(({ result }) => result.score !== 3)
    || weak.some(({ result }) => result.score > 2)
    || separation < minimumSeparation;
  const status = disagreement ? "needs-human-review" : scoreFailure ? "failed" : "passed";

  return {
    status,
    approved,
    weak,
    approvedMean,
    weakMean,
    separation,
    minimumSeparation,
    disagreement,
    sampleCount
  };
}

module.exports = { fixtureRoot, loadOwnerFixtures, loadWeakControls, runArticleJudgeCalibration };

if (require.main === module) {
  if (!process.argv.includes("--authorize-live")) {
    loadOwnerFixtures();
    loadWeakControls();
    console.log(`Calibration contract verified: ${manifest.length} approved examples and ${weakManifest.length} weak controls. Live judging was not run.`);
    process.exit(0);
  }

  runArticleJudgeCalibration().then((result) => {
    console.log(`\nCalibration ${result.status}: approved mean ${result.approvedMean.toFixed(2)}, weak mean ${result.weakMean.toFixed(2)}, separation ${result.separation.toFixed(2)} (minimum ${result.minimumSeparation.toFixed(2)}).`);
    if (result.status === "needs-human-review") process.exitCode = 2;
    if (result.status === "failed") process.exitCode = 1;
  }).catch((error) => {
    console.error(`Calibration could not pass: ${error.message}`);
    console.error("This command requires an explicitly authorized judge provider and API key.");
    process.exit(1);
  });
}
