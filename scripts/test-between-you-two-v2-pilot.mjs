#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const reviewDir = path.join(
  repoRoot,
  "packages/astro-knowledge/review/between-you-two-v2-2026-09-05"
);
const pilot = JSON.parse(fs.readFileSync(path.join(reviewDir, "pilot-review.json"), "utf8"));
const spec = fs.readFileSync(path.join(reviewDir, "BETWEEN-YOU-TWO-V2-SPEC.md"), "utf8");

assert.equal(pilot.status, "proposed");
assert.equal(pilot.servingAuthority, false);
assert.equal(pilot.ownerApprovalRequired, true);
assert.equal(pilot.records.length, 6);
assert.ok(pilot.records.every((record) => record.reviewStatus === "proposed"));
assert.match(spec, /Serving effect: \*\*none\*\*/u);
assert.match(spec, /Do not render a Between You Two daily synthesis/u);
assert.match(spec, /separate `body_you` and `body_they` wording/u);

const approvalPaths = new Map([
  ["fallback-hook/bond-effect-hard/saturn", "bond-effect-hard-saturn-exact-approval.json"],
  ["fallback-hook/bond-effect-hard/mercury", "bond-effect-hard-mercury-exact-approval.json"],
  ["fallback-hook/bond-effect-hard/jupiter", "bond-effect-hard-jupiter-exact-approval.json"],
  ["fallback-hook/bond-effect-soft/venus", "bond-effect-soft-venus-exact-approval.json"],
  ["fallback-hook/bond-effect-soft/jupiter", "bond-effect-soft-jupiter-exact-approval.json"]
]);

const approvalDir = path.join(
  repoRoot,
  "packages/astro-knowledge/review/bond-effect-directional-copy-v1"
);
const bondRecords = pilot.records.filter((record) => record.evidenceTier === "bond");
assert.equal(bondRecords.length, approvalPaths.size);

for (const record of bondRecords) {
  const contentKey = record.bodyAuthority?.contentKey;
  const approvalFile = approvalPaths.get(contentKey);
  assert.ok(approvalFile, `Unexpected pilot bond content key: ${contentKey}`);

  const approval = JSON.parse(fs.readFileSync(path.join(approvalDir, approvalFile), "utf8"));
  assert.equal(approval.approvalLevel, "exact_owner_approved", `${contentKey} must remain exact owner approved`);
  assert.equal(approval.contentKey, contentKey);
  assert.equal(record.bodyAuthority.approvalLevel, approval.approvalLevel);
  assert.equal(record.bodyAuthority.reuseVerbatim, true);
  assert.equal(
    record.bodyAuthority.body_you,
    approval.payload.body_you,
    `${contentKey} pilot body_you must be byte-identical to canonical approval payload`
  );
  assert.equal(
    record.bodyAuthority.body_they,
    approval.payload.body_they,
    `${contentKey} pilot body_they must be byte-identical to canonical approval payload`
  );
  assert.ok(record.candidateHeadline?.body_you?.trim(), `${contentKey} needs candidate headline body_you`);
  assert.ok(record.candidateHeadline?.body_they?.trim(), `${contentKey} needs candidate headline body_they`);
  assert.ok(record.candidateMove?.body_you?.trim(), `${contentKey} needs candidate move body_you`);
  assert.ok(record.candidateMove?.body_they?.trim(), `${contentKey} needs candidate move body_they`);
}

const moonRecord = pilot.records.find((record) => record.evidenceTier === "shared-moon");
assert.ok(moonRecord);
assert.equal(moonRecord.mechanism.element, "fire");
assert.ok(moonRecord.candidateHeadline?.trim());
assert.ok(moonRecord.candidateBody?.trim());
assert.equal(moonRecord.candidateMove, null);
assert.equal(moonRecord.bodyAuthority, undefined);

console.log("Between You Two V2 pilot provenance contract passed: 5 canonical directional bond bodies + 1 dark Moon candidate; 0 serving authority.");
