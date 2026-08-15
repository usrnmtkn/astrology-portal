#!/usr/bin/env node

import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { vocabularyBodyForVoice } from "../apps/web/src/content/fallbackArchitectureV3/resolver/renderFallback.mjs";
import { renderDoDont } from "../apps/web/src/content/fallbackArchitectureV3/resolver/renderTransitSynastry.mjs";
import { createTransitSynastryRenderer } from "../apps/web/src/content/fallbackArchitectureV3/dist/tldr-content.js";

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
const rulings = JSON.parse(fs.readFileSync(
  path.join(repoRoot, "packages/astro-knowledge/review/friend-vocabulary-person-inflection-owner-rulings-2026-08-15.json"),
  "utf8"
));
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
assert.equal(approval.servingAuthorized, true);
assert.equal(rulings.servingAuthorized, true);
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
const expectedFriendByKey = new Map([
  ...review.candidates
    .filter((candidate) => candidate.disposition === "ready_for_owner_review")
    .map((candidate) => [candidate.contentKey, candidate.proposedBodyThey]),
  ...rulings.rulings.map((ruling) => [ruling.contentKey, ruling.bodyThey])
]);
assert.equal(expectedFriendByKey.size, 40);

for (const row of source.vocabularyRows) {
  assert.equal(vocabularyBodyForVoice(row, "you"), row.body, `${row.contentKey}: self output changed.`);
  const friendBody = vocabularyBodyForVoice(row, "they");
  assert.ok(friendBody, `${row.contentKey}: Friend output is empty.`);
  assert.doesNotMatch(friendBody, secondPersonPronoun, `${row.contentKey}: Friend output leaks second person.`);
  if (expectedFriendByKey.has(row.contentKey)) {
    assert.equal(row.body_they, expectedFriendByKey.get(row.contentKey), `${row.contentKey}: approved Friend variant missing.`);
    assert.equal(row.body_they_review_status, "approved", `${row.contentKey}: Friend approval state missing.`);
    assert.ok(row.body_they_approved_via, `${row.contentKey}: Friend approval citation missing.`);
  }
}

for (const candidate of review.candidates) {
  const row = sourceByKey.get(candidate.contentKey);
  assert.ok(row, `${candidate.contentKey}: source row missing.`);
  assert.equal(row.body, candidate.sourceBody, `${candidate.contentKey}: source body drifted.`);
  assert.equal(sha256(row.body), candidate.sourceBodySha256, `${candidate.contentKey}: source hash drifted.`);
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
for (const ruling of rulings.rulings) {
  assert.equal(sourceByKey.get(ruling.contentKey)?.body_they, ruling.bodyThey);
  assert.match(ruling.ownerStatement, /approved/u);
}

const doDontFacts = { planet: "saturn", sign: "virgo", house: 4, transiting: "moon", dayKey: 0 };
const nodeSelfDoDont = renderDoDont({ ...doDontFacts, voice: "you" });
const nodeFriendDoDont = renderDoDont({ ...doDontFacts, voice: "they" });
assert.ok(nodeSelfDoDont.do.includes("Feed yourself properly"));
assert.ok(nodeFriendDoDont.do.includes("Eat properly"));
assert.doesNotMatch(nodeFriendDoDont.do.join(" "), secondPersonPronoun);

const browserRenderer = createTransitSynastryRenderer(
  JSON.parse(fs.readFileSync(path.join(repoRoot, "apps/web/src/content/fallbackArchitectureV3/source-rows/transit-synastry-rows-v1.json"), "utf8")),
  JSON.parse(fs.readFileSync(path.join(repoRoot, "apps/web/src/content/fallbackArchitectureV3/templates/fallback-templates-v3.json"), "utf8")),
  source
);
assert.deepEqual(browserRenderer.renderDoDont({ ...doDontFacts, voice: "you" }), nodeSelfDoDont);
assert.deepEqual(browserRenderer.renderDoDont({ ...doDontFacts, voice: "they" }), nodeFriendDoDont);

console.log("Friend vocabulary inflection import passed: all 720 Self bodies are unchanged; 40 approved Friend variants serve; Node/browser do/don't parity holds; no Friend vocabulary output leaks second person.");
