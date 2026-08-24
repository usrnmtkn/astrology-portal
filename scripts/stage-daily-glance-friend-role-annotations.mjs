#!/usr/bin/env node
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";

import { lintDailyGlanceFriendVoice } from "../apps/web/src/content/fallbackArchitectureV3/resolver/dailyGlanceVoice.mjs";

const repoRoot = new URL("../", import.meta.url);
const sourceUrl = new URL("apps/web/src/content/fallbackArchitectureV3/source-rows/fallback-source-rows-v3.json", repoRoot);
const reviewUrl = new URL("packages/astro-knowledge/review/friends-daily-glance-68-role-annotated-2026-08-15.json", repoRoot);
const stage = process.argv.includes("--stage-for-owner-review");
const sha256 = (value) => crypto.createHash("sha256").update(value).digest("hex");

if (!stage) {
  throw new Error("Refusing to write without --stage-for-owner-review. This payload is not merge-authorized.");
}

const source = JSON.parse(fs.readFileSync(sourceUrl, "utf8"));
const review = JSON.parse(fs.readFileSync(reviewUrl, "utf8"));
assert.equal(review.schema, "tldrastro-friends-daily-glance-role-annotated-v1");
assert.equal(review.status, "PENDING_OWNER_EXACT_RECUT_REVIEW");
assert.equal(review.promotionAuthorized, false);
assert.equal(review.records.length, 68);

const byKey = new Map(source.hookRows.map((row) => [row.contentKey, row]));
let changedFields = 0;

for (const entry of review.records) {
  assert.equal(entry.status, "PENDING_OWNER");
  const headline = byKey.get(entry.headlineContentKey);
  const body = byKey.get(entry.bodyContentKey);
  assert.ok(headline, `${entry.key}: missing headline source row`);
  assert.ok(body, `${entry.key}: missing body source row`);
  assert.equal(headline.review_status, "approved", `${entry.key}: headline review state drift`);
  assert.equal(body.review_status, "approved", `${entry.key}: body review state drift`);
  assert.equal(sha256(headline.body_you), entry.sourceSelf.headlineSha256, `${entry.key}: Self headline drift`);
  assert.equal(sha256(body.body_you), entry.sourceSelf.bodySha256, `${entry.key}: Self body drift`);

  for (const [row, value, label] of [
    [headline, entry.roleAnnotatedFriend.headline, "headline"],
    [body, entry.roleAnnotatedFriend.body, "body"]
  ]) {
    const findings = lintDailyGlanceFriendVoice(value);
    assert.deepEqual(findings, [], `${entry.key} ${label}: ${JSON.stringify(findings)}`);
    if (row.body_they !== value) changedFields += 1;
    row.body_they = value;
  }
}

assert.ok(changedFields === 0 || changedFields === 136, `Expected an idempotent pass or all 136 Friend fields to change, got ${changedFields}`);
fs.writeFileSync(sourceUrl, `${JSON.stringify(source, null, 1)}\n`, "utf8");
console.log(`Staged ${changedFields} body_they fields across ${review.records.length} Daily Glance keys for owner review.`);
console.log("No body_you, review_status, or row metadata field was changed.");
