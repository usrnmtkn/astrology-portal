#!/usr/bin/env node

const assert = require("assert");
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const sourcePath = path.join(root, "data", "manifestation-sets", "year-ahead-v1.json");
const overlaysPath = path.join(root, "data", "manifestation-sets", "sr-overlays-v1.json");
const referenceGapsPath = path.join(root, "data", "manifestation-sets", "owner-reference-gaps-v1.json");
const overlayOwnerSourcePath = path.resolve(root, "..", "..", "tldr-astro-phrasebank", "TLDR-SR-OVERLAY-MANIFESTATION-SETS-V1-NEEDS-REVIEW.md");
const distPath = path.join(root, "dist", "manifestation-sets.json");
const source = JSON.parse(fs.readFileSync(sourcePath, "utf8"));
const overlays = JSON.parse(fs.readFileSync(overlaysPath, "utf8"));
const referenceGaps = JSON.parse(fs.readFileSync(referenceGapsPath, "utf8"));
const overlayOwnerSource = fs.readFileSync(overlayOwnerSourcePath, "utf8");

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

assert.equal(overlays.review_status, "approved");
assert.equal(overlays.approval.status, "owner_approved");
assert.equal(overlays.approval.approvedOn, "2026-08-10");
assert.equal(Object.keys(overlays.records).length, 120);
for (const planet of ["sun", "moon", "mercury", "venus", "mars", "jupiter", "saturn", "uranus", "neptune", "pluto"]) {
  for (let house = 1; house <= 12; house += 1) {
    const id = `sr-overlay/${planet}/${house}`;
    const record = overlays.records[id];
    assert.ok(record, `${id} must be present`);
    assert.equal(record.review_status, "approved");
    assert.equal(record.copyClaim.review_status, "approved");
    assert.ok(record.copyClaim.text.length > 0);
    assert.ok(overlayOwnerSource.includes(`### ${id}`));
    assert.ok(overlayOwnerSource.includes(`**COPY CLAIM:** ${record.copyClaim.text}`), `${id} copy claim must remain byte-identical to the approved source`);
  }
}
assert.equal(referenceGaps.review_status, "approved");
assert.ok(referenceGaps.records["eclipse-house-placement/3"]);
assert.ok(referenceGaps.records["slow-transit-to-natal/jupiter/opposition/midheaven"]);

assert.ok(fs.existsSync(distPath), "build must emit dist/manifestation-sets.json");
const dist = JSON.parse(fs.readFileSync(distPath, "utf8"));
const sourceDist = dist.collections.find((collection) => collection.id === source.id);
const overlaysDist = dist.collections.find((collection) => collection.id === overlays.id);
assert.deepEqual(sourceDist.records, source.records);
assert.deepEqual(overlaysDist.records, overlays.records);

console.log(
  `Manifestation sets passed: ${Object.keys(source.records).length} needs_review records and ${Object.keys(overlays.records).length} owner-approved SR overlays.`
);
