#!/usr/bin/env node

const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");

const packageRoot = path.resolve(__dirname, "..");
const repoRoot = path.resolve(packageRoot, "..", "..");
const sourceRelativePath = "tldr-astro-phrasebank/TLDR-JUPITER-TRANSIT-NATAL-FAMILY-OWNER.md";
const source = fs.readFileSync(path.join(repoRoot, sourceRelativePath), "utf8");
const sourceSha256 = crypto.createHash("sha256").update(source).digest("hex");
const dataRoot = path.join(packageRoot, "data", "transits", "natal");
const records = fs.readdirSync(dataRoot)
  .filter((fileName) => /^jupiter_.+\.json$/u.test(fileName))
  .map((fileName) => JSON.parse(fs.readFileSync(path.join(dataRoot, fileName), "utf8")));

assert.equal(records.length, 60);
assert.equal(new Set(records.map((record) => `${record.natal}/${record.aspect}`)).size, 60);
assert.deepEqual(
  [...new Set(records.map((record) => record.natal))].sort(),
  ["ascendant", "jupiter", "mars", "mercury", "midheaven", "moon", "neptune", "pluto", "saturn", "sun", "uranus", "venus"]
);
assert.deepEqual(
  [...new Set(records.map((record) => record.aspect))].sort(),
  ["conjunction", "opposition", "sextile", "square", "trine"]
);

for (const record of records) {
  assert.equal(record.transiting, "jupiter");
  assert.equal(record.kind, "transit-to-natal");
  assert.equal(record.status, "LIVE");
  assert.equal(record.readerCopy.sourcePath, sourceRelativePath);
  assert.equal(record.readerCopy.sourceSha256, sourceSha256);
  assert.equal(record.readerCopy.approvedVia, "Owner approval recorded 2026-08-09");
  assert.equal(record.readerCopy.doNotAssume.length, 1);
  assert.equal(record.policy, record.readerCopy.doNotAssume[0]);
  assert.equal(record.plainTranslation, record.readerCopy.headline);
  assert.equal(record.readerCopy.body.split("\n\n").length, 2);
  assert.ok(source.includes(`### ${record.aspect[0].toUpperCase() + record.aspect.slice(1)}: ${record.readerCopy.headline}`));
  assert.ok(source.includes(record.readerCopy.body));
  assert.ok(source.includes(`**The astro:** ${record.readerCopy.attribution}`));
  assert.ok(source.includes(`**Do not assume:** ${record.readerCopy.doNotAssume[0]}`));
  assert.doesNotMatch(record.readerCopy.sourcePath, /MIDHEAVEN-ASPECT-FAMILY-REVIEW/iu);
}

const midheaven = records.filter((record) => record.natal === "midheaven");
assert.equal(midheaven.length, 5);
const opposition = midheaven.find((record) => record.aspect === "opposition");
assert.equal(opposition.readerCopy.headline, "Work is asking for more. Home may be doing the same.");
assert.equal(opposition.readerCopy.attribution, "Jupiter opposition your Midheaven");

console.log("Jupiter transit-to-natal doctrine passed: 60 approved entries, 60 guards, five Midheaven entries.");
