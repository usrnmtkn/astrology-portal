#!/usr/bin/env node
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import fs from "node:fs";

const manifestUrl = new URL(
  "../apps/web/src/content/fallbackArchitectureV3/authored-inputs/calendar-aspect-content-studio-batch-2b-v1.json",
  import.meta.url
);
const approvalUrl = new URL(
  "../packages/astro-knowledge/review/sky-calendar-composed-first-glance-2026-08-31/batch-2b-venus-saturn-trines-owner-approval.json",
  import.meta.url
);
const releaseUrl = new URL(
  "../packages/astro-knowledge/review/sky-calendar-composed-first-glance-2026-08-31/batch-2b-venus-saturn-trines-serving-release.json",
  import.meta.url
);
const sourceUrl = new URL(
  "../apps/web/src/content/fallbackArchitectureV3/source-rows/sky-aspect-phrasebook-v1.json",
  import.meta.url
);
const manifest = JSON.parse(fs.readFileSync(manifestUrl, "utf8"));
const approval = JSON.parse(fs.readFileSync(approvalUrl, "utf8"));
const release = JSON.parse(fs.readFileSync(releaseUrl, "utf8"));
const source = JSON.parse(fs.readFileSync(sourceUrl, "utf8"));
const sourceByKey = new Map((source.hookRows ?? []).map((row) => [row.contentKey, row]));
const sha256 = (value) => createHash("sha256").update(value, "utf8").digest("hex");

assert.equal(manifest.schema, "tldr.calendar-aspect-content-studio-batch.v1");
assert.equal(manifest.review_status, "approved");
assert.equal(manifest.owner_approved, true);
assert.equal(manifest.serving_enabled, false);
assert.equal(manifest.rows.length, 23);
assert.equal(new Set(manifest.rows.map((row) => row.contentKey)).size, 23);
assert.equal(approval.owner_approved, true);
assert.equal(approval.review_status, "approved");
assert.equal(release.schema, "tldr.sky-calendar.aspect-serving-release.v1");
assert.equal(release.batch_id, manifest.batch_id);
assert.equal(release.owner_authorized, true);
assert.equal(release.serving_enabled, true);
assert.equal(release.approved_payload_sha256, approval.draft_payload_sha256);
assert.equal(release.expected_row_count, 23);
assert.equal(sha256(JSON.stringify(manifest.rows)), approval.draft_payload_sha256);
assert.deepEqual(approval.approved_keys, manifest.rows.map((row) => row.contentKey));
assert.ok(!approval.approved_keys.includes(release.protected_key));

for (const row of manifest.rows) {
  assert.match(row.contentKey, /^fallback-hook\/sky-aspect-sign\/venus\/[a-z-]+\/trine\/saturn\/[a-z-]+$/u);
  assert.equal(sha256(row.body), row.bodySha256, `${row.contentKey} hash drift`);
  assert.doesNotMatch(row.body, /—/u, `${row.contentKey} em dash`);
  const baseline = sourceByKey.get(row.contentKey);
  assert.ok(baseline, `Missing source baseline for ${row.contentKey}`);
  assert.equal(baseline.review_status, "approved", `${row.contentKey} release status`);
  assert.equal(row.body, baseline.body_you, `${row.contentKey} released You copy drift`);
  assert.equal(row.body, baseline.body_they, `${row.contentKey} released They copy drift`);
}

const protectedRow = sourceByKey.get(release.protected_key);
assert.ok(protectedRow, "Protected Venus in Virgo trine Saturn in Capricorn row is missing");
assert.equal(protectedRow.body_you, protectedRow.body_they);
assert.equal(sha256(protectedRow.body_you), release.protected_body_sha256, "Protected trine drift");

console.log("Calendar Batch 2B serving contract: PASS (23 owner-approved Venus/Saturn trines released; protected Virgo/Capricorn row unchanged).");
