#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";

const reviewDir = "packages/astro-knowledge/review/between-you-two-v2-2026-09-05";
const full = JSON.parse(fs.readFileSync(`${reviewDir}/full-authoring-review.json`, "utf8"));
const pilot = JSON.parse(fs.readFileSync(`${reviewDir}/pilot-review.json`, "utf8"));
const evidence = JSON.parse(fs.readFileSync(`${reviewDir}/bond-evidence-28.json`, "utf8"));

assert.equal(full.servingAuthority, false);
assert.equal(full.records.length, 32);
assert.equal(evidence.rowCount, 28);
assert.equal(new Set(full.records.map((record) => record.id)).size, 32);

const bond = full.records.filter((record) => record.family && record.transiting);
const moon = full.records.filter((record) => record.evidenceTier === "shared-moon");
assert.equal(bond.length, 28);
assert.equal(moon.length, 4);
assert.deepEqual(new Set(moon.map((record) => record.element)), new Set(["fire", "earth", "air", "water"]));

const evidenceKeys = new Set(evidence.rows.map((row) => row.contentKey));
for (const record of bond) {
  assert.ok(evidenceKeys.has(record.bodyContentKey), `Missing canonical evidence for ${record.id}`);
  assert.ok(record.headline.body_you.trim());
  assert.ok(record.headline.body_they.trim());
  assert.ok(record.move.body_you.trim());
  assert.ok(record.move.body_they.trim());
  assert.ok(["owner_approved", "proposed"].includes(record.reviewStatus));
}
for (const record of moon) {
  assert.ok(record.headline.trim());
  assert.ok(record.body.trim());
  assert.ok(["owner_approved", "proposed"].includes(record.reviewStatus));
}

const approved = full.records.filter((record) => record.reviewStatus === "owner_approved");
const proposed = full.records.filter((record) => record.reviewStatus === "proposed");
assert.equal(approved.length, 6);
assert.equal(proposed.length, 26);
assert.deepEqual(
  new Set(approved.map((record) => record.id)),
  new Set(["hard-saturn", "hard-mercury", "hard-jupiter", "soft-venus", "soft-jupiter", "shared-moon-fire"])
);

const pilotById = new Map(pilot.records.map((record) => [record.id, record]));
for (const record of approved) {
  const calibration = pilotById.get(record.id);
  assert.ok(calibration, `Approved full-review record ${record.id} must originate in owner-approved pilot`);
  if (record.evidenceTier === "shared-moon") {
    assert.equal(record.headline, calibration.candidateHeadline);
    assert.equal(record.body, calibration.candidateBody);
    continue;
  }
  assert.deepEqual(record.headline, calibration.candidateHeadline, `${record.id} headline drifted from owner-approved pilot`);
  assert.deepEqual(record.move, calibration.candidateMove, `${record.id} move drifted from owner-approved pilot`);
  assert.equal(record.bodyContentKey, calibration.bodyAuthority.contentKey);
}

console.log("Between You Two V2 full review contract passed: 28 bond families + 4 Moon elements; 6 owner-approved calibration rows; 26 proposed rows; 0 serving authority.");
