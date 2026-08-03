#!/usr/bin/env node
"use strict";

const assert = require("assert");
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

const corpusRoot = path.join(
  __dirname,
  "..",
  "voice",
  "tldr-astro",
  "fixtures",
  "sky-article-longform",
  "owner-corpus"
);
const activeManifest = require(path.join(corpusRoot, "..", "manifest.json"));
const corpusManifest = require(path.join(corpusRoot, "manifest.json"));

const sha256 = (value) => crypto.createHash("sha256").update(value).digest("hex");
const wordCount = (value) => (value.match(/\b[\p{L}\p{N}][\p{L}\p{N}’'-]*\b/gu) || []).length;

assert.strictEqual(corpusManifest.schemaVersion, 1);
assert.strictEqual(corpusManifest.surface, "sky-article-longform");
assert.strictEqual(corpusManifest.evaluationProfileVersion, "sky-article-longform-owner-corpus-diagnostic-v1");
assert.match(corpusManifest.factualPolicy, /must never supply runtime astrology facts/i);
assert.match(corpusManifest.activationPolicy, /isolated from the active calibration manifest/i);
assert.match(corpusManifest.activationPolicy, /must not enter the planet-article evaluator/i);
assert.deepStrictEqual(
  Object.fromEntries(Object.entries(corpusManifest.cohorts).map(([name, entries]) => [name, entries.length])),
  { calibrationCandidates: 4, diagnosticSameSurface: 4, adjacentFormats: 7, additionalSurfaceReferences: 28 }
);

const files = new Set();
const slugs = new Set();
const hashes = new Set();
for (const [cohort, entries] of Object.entries(corpusManifest.cohorts)) {
  for (const entry of entries) {
    assert.ok(!files.has(entry.file), `${entry.file}: duplicate corpus file`);
    assert.ok(!slugs.has(entry.sourceSlug), `${entry.sourceSlug}: duplicate source slug`);
    assert.ok(!hashes.has(entry.sha256), `${entry.sourceSlug}: duplicate extracted body`);
    files.add(entry.file);
    slugs.add(entry.sourceSlug);
    hashes.add(entry.sha256);

    const filePath = path.join(corpusRoot, entry.file);
    assert.ok(fs.existsSync(filePath), `${entry.file}: missing fixture`);
    const text = fs.readFileSync(filePath, "utf8");
    assert.strictEqual(sha256(text), entry.sha256, `${entry.file}: fixture is not byte-verified`);
    assert.strictEqual(wordCount(text), entry.wordCount, `${entry.file}: word count changed`);
    assert.ok(entry.wordCount >= 1000, `${entry.file}: extracted body is unexpectedly short`);
    assert.doesNotMatch(text, /<(?:div|meta|p|script|section|span|style)\b/i, `${entry.file}: page HTML leaked into fixture`);
    assert.ok(entry.sourceUrl.endsWith(`/blogs/astrology/${entry.sourceSlug}`), `${entry.file}: source URL mismatch`);

    if (cohort === "adjacentFormats" || cohort === "additionalSurfaceReferences") {
      assert.ok(entry.format, `${entry.file}: adjacent format must be named`);
      assert.ok(!entry.planet, `${entry.file}: adjacent format must not masquerade as a planet-article fixture`);
    } else {
      assert.ok(entry.planet && entry.edition, `${entry.file}: same-surface fixture needs planet and edition`);
    }
  }
}

for (const sourceSlug of corpusManifest.activeCalibrationSourceSlugs) {
  assert.ok(!slugs.has(sourceSlug), `${sourceSlug}: active calibration leaked into the new corpus split`);
}
assert.strictEqual(activeManifest.length, 4, "Corpus curation must not silently enlarge paid active calibration.");
assert.strictEqual(slugs.size + activeManifest.length, 47, "Every mirror article must be accounted for exactly once.");

console.log("Owner article corpus verified: all 47 mirror articles accounted for; paid evaluation remains 4 candidates + 4 diagnostics + 4 active fixtures + 2 weak controls.");
