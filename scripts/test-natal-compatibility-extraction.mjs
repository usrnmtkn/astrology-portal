#!/usr/bin/env node

import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";

const manifestPath = "packages/astro-knowledge/review/natal-compatibility-evidence-manifest-v1.json";
const reviewPath = "packages/astro-knowledge/review/natal-moon-compatibility-derived-review-v1.json";
const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
const review = JSON.parse(fs.readFileSync(reviewPath, "utf8"));
const sha256 = (value) => crypto.createHash("sha256").update(value).digest("hex");

assert.equal(manifest.counts.planetIntros, 7);
assert.equal(manifest.counts.youPlanetSignEvidenceRows, 84);
assert.equal(review.rows.length, 12);
assert.equal(review.governance.compatibilityChanges, false);
assert.equal(review.governance.servingChanges, false);

for (const source of manifest.sourceFiles) {
  const bytes = fs.readFileSync(source.path);
  assert.equal(bytes.length, source.byteLength, `${source.path} byte length drift`);
  assert.equal(sha256(bytes), source.sha256, `${source.path} hash drift`);
}

for (const row of review.rows) {
  assert.equal(row.reviewStatus, "needs_review", `${row.runtimeKey} must remain review-gated`);
  assert.equal(row.ownerApproved, false, `${row.runtimeKey} cannot be owner-approved by generation`);
  assert.equal(row.servingAuthorized, false, `${row.runtimeKey} cannot serve`);
  assert.equal(row.ownerYouVerdict, "");
  assert.match(row.youCandidate, /^Your Moon is in /u);
  assert.match(row.friendSourceExcerpt, /^\{\{name\}\}'s Moon is in /u);
  assert.equal(row.friendAuthoringStatus, "evidence_only_requires_separate_observer_entry_authoring");
  assert.doesNotMatch(`${row.youCandidate} ${row.friendSourceExcerpt}`, /\b(?:grew up|growing up|childhood|people who raised|adults around|in your house)\b/iu);
  assert.doesNotMatch(`${row.youCandidate} ${row.friendSourceExcerpt}`, /\bwhether\b/iu);
  assert.doesNotMatch(row.friendSourceExcerpt, /\b(?:you|your|yours|yourself|you're|you'll|you'd)\b/iu);
  assert.equal(row.youRemovedHistorySentences.length, 2);
  assert.equal(row.friendRemovedHistorySentences.length, 2);
  assert.equal(sha256(row.youCandidate), row.youCandidateSha256);
  assert.equal(sha256(row.friendSourceExcerpt), row.friendSourceExcerptSha256);
}

assert.equal(review.counts.friendCandidates, 0);
assert.equal(review.counts.friendEvidenceRows, 12);
console.log("Natal compatibility extraction guard passed: 84 evidence rows, 12 Moon You candidates, 12 Friend evidence rows, source bytes unchanged, no childhood history or Friend second-person leakage.");
