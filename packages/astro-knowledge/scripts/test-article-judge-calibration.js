#!/usr/bin/env node
//
// Calibration for the long-form article judge. The four owner-published
// fixtures are canonical 3s by definition. Each receives five cold judge
// samples and the median must remain 3.

const assert = require("assert");
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const { judgeLongformArticle } = require("./judge-article-voice.js");

const fixtureRoot = path.join(__dirname, "..", "voice", "tldr-astro", "fixtures", "sky-article-longform");
const manifest = require(path.join(fixtureRoot, "manifest.json"));

function loadOwnerFixtures() {
  return manifest.map((entry) => {
    const filePath = path.join(fixtureRoot, entry.file);
    const text = fs.readFileSync(filePath, "utf8");
    const sha256 = crypto.createHash("sha256").update(text).digest("hex");
    assert.strictEqual(sha256, entry.sha256, `${entry.file} must remain owner-verbatim`);
    return { ...entry, filePath, text };
  });
}

async function runArticleJudgeCalibration({ judgeFn } = {}) {
  const results = [];
  for (const fixture of loadOwnerFixtures()) {
    const result = await judgeLongformArticle(fixture.text, {
      planet: fixture.planet,
      edition: fixture.edition,
      samples: 5,
      judgeFn
    });
    results.push({ fixture, result });
    console.log(`${result.score === 3 ? "OK " : "!! "} owner fixture ${fixture.title} -> ${result.score} (${result.verdict})`);
    assert.strictEqual(
      result.score,
      3,
      `${fixture.title} is an owner-published calibration piece and must score 3; change the spec, not the piece`
    );
  }
  return results;
}

module.exports = { fixtureRoot, loadOwnerFixtures, runArticleJudgeCalibration };

if (require.main === module) {
  runArticleJudgeCalibration().then(() => {
    console.log(`\nLong-form article judge calibrated: ${manifest.length}/${manifest.length} owner fixtures scored 3 (median of 5).`);
  }).catch((error) => {
    console.error(`Calibration could not pass: ${error.message}`);
    console.error("(This test needs the judge model wired - set the generator's API key.)");
    process.exit(1);
  });
}
