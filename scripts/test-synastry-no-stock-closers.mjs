import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, "..");
const sourcePath = path.join(
  repoRoot,
  "apps/web/src/content/fallbackArchitectureV3/source-rows/fallback-source-rows-v3.json"
);
const manifestPath = path.join(
  repoRoot,
  "packages/astro-knowledge/review/synastry-stock-closer-removal-manifest.json"
);
const synastryPrefix = "fallback-hook/synastry-pair/";
const approvalLabel = "owner-approved stock-closer removal, chat 2026-08-04";
const expectedCounts = { hard: 112, soft: 112, conjunction: 112 };
const suffixes = Object.freeze([
  "until the friction builds muscle.",
  "the same side without trying.",
  "running as one instinct."
]);
const sentenceSegmenter = new Intl.Segmenter("en", { granularity: "sentence" });

function sentences(value) {
  return Array.from(sentenceSegmenter.segment(value), ({ segment }) => segment.trim()).filter(Boolean);
}

function finalSentence(value) {
  return sentences(value).at(-1) ?? "";
}

function hasStockCloser(value) {
  const final = finalSentence(value);
  return suffixes.some((suffix) => final.endsWith(suffix));
}

const sourceText = fs.readFileSync(sourcePath, "utf8");
const source = JSON.parse(sourceText);
const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
const rows = source.hookRows.filter((row) => row.contentKey?.startsWith(synastryPrefix));
const rowsByKey = new Map(rows.map((row) => [row.contentKey, row]));

assert.equal(rows.length, 483, "The stock-closer pass must not add or remove synastry rows");
assert.equal(manifest.synastryRowCountBefore, 483);
assert.equal(manifest.synastryRowCountAfter, 483);
assert.equal(manifest.modifiedCount, 336);
assert.equal(manifest.skippedCount, 0);
assert.deepEqual(manifest.matchedCounts, expectedCounts);
assert.deepEqual(manifest.modifiedCounts, expectedCounts);
assert.equal(manifest.modified.length, 336);
assert.deepEqual(manifest.skipped, []);
assert.equal(crypto.createHash("sha256").update(sourceText).digest("hex"), manifest.sourceSha256After);

const modifiedKeys = new Set(manifest.modified.map((entry) => entry.contentKey));
assert.equal(modifiedKeys.size, 336, "Every modified manifest entry must have a unique contentKey");

for (const row of rows) {
  assert.equal(hasStockCloser(row.body_you), false, `${row.contentKey} body_you retains a stock closer`);
  assert.equal(hasStockCloser(row.body_they), false, `${row.contentKey} body_they retains a stock closer`);
}

for (const entry of manifest.modified) {
  assert.match(entry.contentKey, /^fallback-hook\/synastry-pair\//u);
  assert.ok(suffixes.some((suffix) => entry.removedSentence.endsWith(suffix)));
  assert.ok(suffixes.some((suffix) => entry.removedSentenceThey.endsWith(suffix)));

  const row = rowsByKey.get(entry.contentKey);
  assert.ok(row, `${entry.contentKey} must still exist`);
  assert.equal(row.review_status, entry.reviewStatus, `${entry.contentKey} review_status changed`);
  assert.equal(row.approved_via, entry.approvedViaAfter);
  assert.ok(row.approved_via.split(" | ").includes(approvalLabel));

  for (const field of ["body_you", "body_they"]) {
    assert.match(row[field], /[.!?]$/u, `${entry.contentKey} ${field} lacks terminal punctuation`);
    assert.ok(sentences(row[field]).length >= 2, `${entry.contentKey} ${field} has fewer than two sentences`);
  }
}

console.log("Synastry stock-closer regression passed: 336 closers removed, 483 rows preserved, 0 skipped.");
