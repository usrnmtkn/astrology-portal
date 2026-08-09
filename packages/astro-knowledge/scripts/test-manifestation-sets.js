#!/usr/bin/env node

const assert = require("assert");
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const sourcePath = path.join(root, "data", "manifestation-sets", "year-ahead-v1.json");
const distPath = path.join(root, "dist", "manifestation-sets.json");
const source = JSON.parse(fs.readFileSync(sourcePath, "utf8"));

assert.equal(source.review_status, "needs_review");
assert.ok(source.coverageDomains.includes("career/work"));
assert.ok(source.coverageDomains.includes("love/dating"));
assert.ok(source.coverageDomains.includes("spirituality/faith"));
assert.ok(source.records["eclipse-on-saturn-house-4"]);
assert.ok(source.records["slow-transit-to-moon-house-6"]);
assert.ok(source.records["eclipse-on-midheaven-house-10"]);
assert.ok(source.records["return-jupiter-house-3"]);

for (const [id, record] of Object.entries(source.records)) {
  assert.equal(record.review_status, "needs_review", `${id} must await owner review`);
  assert.equal(record.copyClaim.text, null, `${id} must not contain reader copy`);
  assert.equal(record.copyClaim.review_status, "needs_review");
  assert.ok(record.domain.length > 0);
  assert.ok(record.possibleLivedManifestations.length > 0);
  assert.ok(record.doNotAssume.length > 0);
}

assert.ok(fs.existsSync(distPath), "build must emit dist/manifestation-sets.json");
const dist = JSON.parse(fs.readFileSync(distPath, "utf8"));
assert.equal(dist.collections[0].id, source.id);
assert.deepEqual(dist.collections[0].records, source.records);

console.log(
  `Manifestation sets passed: ${Object.keys(source.records).length} needs_review records, zero copy claims.`
);
