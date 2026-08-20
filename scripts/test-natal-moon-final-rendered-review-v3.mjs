#!/usr/bin/env node

import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";

const review = JSON.parse(fs.readFileSync("packages/astro-knowledge/review/natal-moon-final-rendered-review-v3.json", "utf8"));
const approval = JSON.parse(fs.readFileSync(review.authority.draftingApproval, "utf8"));
const readiness = JSON.parse(fs.readFileSync(review.authority.readinessArtifact, "utf8"));
const sha256 = (value) => crypto.createHash("sha256").update(value).digest("hex");

assert.equal(approval.scope.argumentCoresApproved, 12);
assert.equal(approval.scope.draftingOnly, true);
assert.equal(approval.scope.childhoodExcludedFromCurrentDraft, true);
assert.equal(approval.scope.finishedRenderedSamplesRequireOwnerApproval, true);
assert.equal(approval.scope.readerCopyApproved, false);
assert.equal(approval.scope.servingAuthorized, false);
assert.equal(review.governance.readerCopyApproved, false);
assert.equal(review.governance.servingChanges, false);
assert.equal(review.governance.compatibilityChanges, false);
assert.equal(review.counts.signRows, 12);
assert.equal(review.counts.houseRows, 12);
assert.equal(review.counts.renderedSamples, 144);
assert.equal(review.counts.childhoodBlocksExcluded, 12);
assert.equal(review.counts.deterministicFailures, 0);
assert.equal(review.counts.ownerReaderCopyVerdicts, 0);

for (const source of readiness.sourceFiles) {
  const bytes = fs.readFileSync(source.path);
  assert.equal(bytes.length, source.byteLength, `${source.path} byte drift`);
  assert.equal(sha256(bytes), source.sha256, `${source.path} hash drift`);
}

for (const row of review.signRows) {
  assert.equal(row.reviewStatus, "needs_review");
  assert.equal(row.ownerReaderCopyVerdict, "");
  assert.equal(row.ownerReaderCopyEdit, "");
  assert.equal(row.deterministicPrecheck.length, 0);
  assert.equal(row.childhoodStatus, "excluded_from_current_batch_preserved_for_later_review");
  assert.doesNotMatch(row.body, /\b(?:grew up|growing up|childhood)\b/iu);
  assert.equal(sha256(row.body), row.bodySha256);
}

for (const row of review.houseRows) {
  assert.equal(row.argumentOwnerDecision, "approve_argument_core_for_drafting_only");
  assert.equal(row.reviewStatus, "needs_review");
  assert.equal(row.ownerReaderCopyVerdict, "");
  assert.equal(row.deterministicPrecheck.length, 0, row.runtimeKey);
  assert.match(row.bridge, /^It's in your \d+(?:st|nd|rd|th) house, meaning/u);
  assert.doesNotMatch(row.body, /^Moon in /u);
  assert.doesNotMatch(row.body, /\b(?:grew up|growing up|childhood)\b/iu);
  assert.equal(sha256(row.body), row.bodySha256);
  assert.equal(sha256(row.rendered), row.renderedSha256);
}

const keys = new Set();
for (const row of review.renderRows) {
  assert.equal(row.reviewStatus, "needs_review");
  assert.equal(row.ownerRenderedVerdict, "");
  assert.equal(row.ownerRenderedEdit, "");
  assert.equal(row.deterministicPrecheck.length, 0, row.renderKey);
  assert.doesNotMatch(row.rendered, /\b(?:grew up|growing up|childhood)\b/iu);
  assert.equal(sha256(row.rendered), row.renderedSha256);
  assert.ok(!keys.has(row.renderKey), `duplicate render key ${row.renderKey}`);
  keys.add(row.renderKey);
}

assert.equal(keys.size, 144);
assert.ok(fs.statSync("outputs/019fedfe-d553-75e3-be16-8abaa96cdf44/TLDR-NATAL-MOON-FINAL-RENDERED-REVIEW-V3.xlsx").size > 10000);
console.log("Moon final rendered review passed: 12 sign sections, 12 house sections, 144 no-childhood samples, zero deterministic failures, zero serving approvals.");
