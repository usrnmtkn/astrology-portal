#!/usr/bin/env node

import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { vocabularyBodyForVoice } from "../apps/web/src/content/fallbackArchitectureV3/resolver/renderFallback.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const source = JSON.parse(fs.readFileSync(
  path.join(repoRoot, "apps/web/src/content/fallbackArchitectureV3/source-rows/fallback-source-rows-v3.json"),
  "utf8"
));
const review = JSON.parse(fs.readFileSync(
  path.join(repoRoot, "packages/astro-knowledge/review/friend-vocabulary-person-inflection-candidates-2026-08-15.json"),
  "utf8"
));
const approvalPath = path.join(
  repoRoot,
  "packages/astro-knowledge/review/friend-vocabulary-person-inflection-owner-approval-2026-08-15.json"
);
const approval = JSON.parse(fs.readFileSync(approvalPath, "utf8"));
const sha256 = (value) => crypto.createHash("sha256").update(value).digest("hex");
const secondPersonPronoun = /(?:^|[\s,.;:!?()])(?:you|your|yours|yourself|yourselves|you(?:'re|'ve|'ll|'d))(?=$|[\s,.;:!?()])/iu;

assert.equal(source.vocabularyRows.length, 720);
assert.equal(review.candidates.length, 41);
assert.deepEqual(review.counts, {
  ready_for_owner_review: 38,
  needs_owner_ruling: 2,
  not_a_person_reference: 1
});
assert.equal(review.governance.reviewState, "needs_review");
assert.equal(review.governance.ownerApproved, false);
assert.equal(review.governance.servingAuthorized, false);
assert.equal(approval.ownerStatement, "i approve");
assert.equal(approval.approvedCount, 38);
assert.equal(approval.servingAuthorized, false);
assert.equal(
  sha256(fs.readFileSync(path.join(repoRoot, approval.candidateRecord.path))),
  approval.candidateRecord.sha256,
  "Owner approval must remain locked to the exact reviewed candidate packet."
);

const approvedCandidates = review.candidates
  .filter((candidate) => candidate.disposition === approval.approvedDisposition)
  .map((candidate) => candidate.contentKey);
assert.deepEqual(approval.approvedContentKeys, approvedCandidates);

const sourceByKey = new Map(source.vocabularyRows.map((row) => [row.contentKey, row]));
for (const row of source.vocabularyRows) {
  assert.equal(vocabularyBodyForVoice(row, "you"), row.body, `${row.contentKey}: self output changed.`);
}

for (const candidate of review.candidates) {
  const row = sourceByKey.get(candidate.contentKey);
  assert.ok(row, `${candidate.contentKey}: source row missing.`);
  assert.equal(row.body, candidate.sourceBody, `${candidate.contentKey}: source body drifted.`);
  assert.equal(sha256(row.body), candidate.sourceBodySha256, `${candidate.contentKey}: source hash drifted.`);
  assert.equal(row.body_they, undefined, `${candidate.contentKey}: unapproved body_they entered serving source.`);

  if (candidate.disposition === "ready_for_owner_review") {
    assert.ok(candidate.proposedBodyThey);
    assert.doesNotMatch(candidate.proposedBodyThey, secondPersonPronoun, `${candidate.contentKey}: Friend candidate leaks second person.`);
    const stagedRow = { ...row, body_they: candidate.proposedBodyThey };
    assert.equal(vocabularyBodyForVoice(stagedRow, "you"), row.body, `${candidate.contentKey}: staged variant changes self output.`);
    assert.equal(vocabularyBodyForVoice(stagedRow, "they"), candidate.proposedBodyThey);
  }
}

const unresolved = review.candidates.filter((candidate) => candidate.disposition === "needs_owner_ruling");
assert.deepEqual(unresolved.map((candidate) => candidate.contentKey), [
  "fallback-vocab/placement-gerund/chiron/capricorn/0",
  "fallback-vocab/dodont-reward/moon"
]);
assert.deepEqual(approval.unresolvedContentKeys, unresolved.map((candidate) => candidate.contentKey));

console.log("Friend vocabulary inflection candidates: canonical self bodies unchanged across 720 rows; 38 exact Friend variants are owner-approved and pronoun-safe; 2 remain owner-blocked and nothing is serving.");
