#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";

const reviewDir = "packages/astro-knowledge/review/between-you-two-v2-2026-09-05";
const full = JSON.parse(fs.readFileSync(`${reviewDir}/full-authoring-review.json`, "utf8"));
const evidence = JSON.parse(fs.readFileSync(`${reviewDir}/bond-evidence-28.json`, "utf8"));
const batch1 = JSON.parse(fs.readFileSync(`${reviewDir}/owner-approval-batch-1.json`, "utf8"));
const batch2 = JSON.parse(fs.readFileSync(`${reviewDir}/owner-approval-batch-2.json`, "utf8"));

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
  assert.ok(["owner_approved", "proposed"].includes(record.reviewStatusYou));
  assert.ok(["owner_approved", "proposed"].includes(record.reviewStatusThey));
  assert.ok(["partially_owner_approved", "proposed"].includes(record.reviewStatus));
}
for (const record of moon) {
  assert.ok(record.headline.trim());
  assert.ok(record.body.trim());
  assert.ok(["owner_approved", "proposed"].includes(record.reviewStatus));
}

const approvedYou = bond.filter((record) => record.reviewStatusYou === "owner_approved");
const approvedThey = bond.filter((record) => record.reviewStatusThey === "owner_approved");
const approvedMoon = moon.filter((record) => record.reviewStatus === "owner_approved");
assert.equal(approvedYou.length, 11);
assert.equal(approvedThey.length, 0);
assert.equal(approvedMoon.length, 1);
assert.equal(approvedMoon[0].id, "shared-moon-fire");
assert.equal(full.approvalBoundary.bondReaderDirectionApproved, 11);
assert.equal(full.approvalBoundary.bondReverseDirectionApproved, 0);
assert.equal(full.approvalBoundary.sharedMoonApproved, 1);

const approvedIds = new Set([...batch1.records, ...batch2.records]
  .filter((record) => record.family && record.transiting)
  .map((record) => record.id));
assert.equal(approvedIds.size, 11);
assert.deepEqual(new Set(approvedYou.map((record) => record.id)), approvedIds);

for (const batch of [batch1, batch2]) {
  assert.equal(batch.servingAuthority, false);
  for (const approval of batch.records) {
    const record = full.records.find((candidate) => candidate.id === approval.id);
    assert.ok(record, `Missing approved V2 record ${approval.id}`);
    if (record.evidenceTier === "shared-moon") {
      assert.equal(record.headline, approval.headline);
      assert.equal(record.body, approval.body);
      assert.equal(record.reviewStatus, "owner_approved");
      continue;
    }
    assert.equal(record.headline.body_you, approval.headline_body_you, `${record.id} approved headline drifted`);
    assert.equal(record.move.body_you, approval.move_body_you, `${record.id} approved move drifted`);
    assert.equal(record.reviewStatusYou, "owner_approved");
    assert.equal(record.reviewStatusThey, "proposed");
  }
}

console.log("Between You Two V2 full review contract passed: 28 bond families + 4 Moon elements; 11 reader-direction bond mechanisms + Moon Fire owner-approved; 0 reverse-direction approval; 0 serving authority.");
