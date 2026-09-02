#!/usr/bin/env node
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import fs from "node:fs";

const manifestUrl = new URL(
  "../apps/web/src/content/fallbackArchitectureV3/authored-inputs/calendar-aspect-content-studio-batch-2a-v1.json",
  import.meta.url
);
const approvalUrl = new URL(
  "../packages/astro-knowledge/review/sky-calendar-composed-first-glance-2026-08-31/batch-2a-venus-saturn-squares-owner-approval.json",
  import.meta.url
);
const releaseUrl = new URL(
  "../packages/astro-knowledge/review/sky-calendar-composed-first-glance-2026-08-31/batch-2a-venus-saturn-squares-serving-release.json",
  import.meta.url
);
const sourceUrl = new URL(
  "../apps/web/src/content/fallbackArchitectureV3/source-rows/sky-aspect-phrasebook-v1.json",
  import.meta.url
);
const seederUrl = new URL("./seed-calendar-aspect-content-studio-drafts.mjs", import.meta.url);
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
assert.equal(manifest.rows.length, 24);
assert.equal(new Set(manifest.rows.map((row) => row.contentKey)).size, 24);
assert.equal(approval.owner_approved, true);
assert.equal(approval.review_status, "approved");
assert.equal(release.schema, "tldr.sky-calendar.aspect-serving-release.v1");
assert.equal(release.batch_id, manifest.batch_id);
assert.equal(release.owner_authorized, true);
assert.equal(release.serving_enabled, true);
assert.equal(release.approved_payload_sha256, approval.draft_payload_sha256);
assert.equal(release.expected_row_count, 24);
assert.deepEqual(approval.approved_keys, manifest.rows.map((row) => row.contentKey));

for (const row of manifest.rows) {
  assert.match(row.contentKey, /^fallback-hook\/sky-aspect-sign\/venus\/[a-z-]+\/square\/saturn\/[a-z-]+$/u);
  assert.equal(sha256(row.body), row.bodySha256, `${row.contentKey} hash drift`);
  assert.doesNotMatch(row.body, /—/u, `${row.contentKey} em dash`);
  const baseline = sourceByKey.get(row.contentKey);
  assert.ok(baseline, `Missing source baseline for ${row.contentKey}`);
  if (release.serving_enabled) {
    assert.equal(baseline.review_status, "approved", `${row.contentKey} release status`);
    assert.equal(row.body, baseline.body_you, `${row.contentKey} released You copy drift`);
    assert.equal(row.body, baseline.body_they, `${row.contentKey} released They copy drift`);
  } else {
    assert.ok(["reviewed", "approved"].includes(baseline.review_status));
    assert.notEqual(row.body, baseline.body_you, `${row.contentKey} unexpectedly matches the old baseline`);
  }
}

const sagittariusVirgo = manifest.rows.find((row) => row.contentKey.endsWith("venus/sagittarius/square/saturn/virgo"));
assert.ok(sagittariusVirgo);
assert.match(sagittariusVirgo.body, /Asking how a project will actually get done is not pessimism\./u);
assert.match(sagittariusVirgo.body, /count the actual hours it will take to maintain it\./u);

const piscesGemini = manifest.rows.find((row) => row.contentKey.endsWith("venus/pisces/square/saturn/gemini"));
assert.ok(piscesGemini);
assert.match(piscesGemini.body, /talking past the practical question\./u);
assert.match(piscesGemini.body, /Ask what happens next and get the answer in plain language\./u);

const dryRun = JSON.parse(execFileSync(process.execPath, [seederUrl.pathname], { encoding: "utf8" }));
assert.equal(dryRun.mode, "dry-run");
assert.equal(dryRun.rowCount, 24);
assert.equal(dryRun.servingEnabled, false);
assert.equal(dryRun.batchId, manifest.batch_id);

const seederSource = fs.readFileSync(seederUrl, "utf8");
assert.match(seederSource, /mode: "studio-draft"/u);
assert.match(seederSource, /status: "DRAFT"/u);
assert.match(seederSource, /review_state: "serving-disabled"/u);
assert.match(seederSource, /serving_enabled: false/u);
assert.match(seederSource, /owner-content-studio/u);
assert.doesNotMatch(seederSource, /status: "LIVE"/u);

console.log("Calendar Batch 2A Content Studio contract: PASS (24 owner-approved drafts with controlled serving release).");
