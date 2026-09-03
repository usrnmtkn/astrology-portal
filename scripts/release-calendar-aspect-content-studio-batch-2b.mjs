#!/usr/bin/env node

import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const batchRel = "apps/web/src/content/fallbackArchitectureV3/authored-inputs/calendar-aspect-content-studio-batch-2b-v1.json";
const approvalRel = "packages/astro-knowledge/review/sky-calendar-composed-first-glance-2026-08-31/batch-2b-venus-saturn-trines-owner-approval.json";
const releaseRel = "packages/astro-knowledge/review/sky-calendar-composed-first-glance-2026-08-31/batch-2b-venus-saturn-trines-serving-release.json";
const sourceRel = "apps/web/src/content/fallbackArchitectureV3/source-rows/sky-aspect-phrasebook-v1.json";

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(path.join(repoRoot, relativePath), "utf8"));
}

function sha256(value) {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

function sameArray(a, b) {
  return JSON.stringify(a) === JSON.stringify(b);
}

const batch = readJson(batchRel);
const approval = readJson(approvalRel);
const release = readJson(releaseRel);
const sourcePath = path.join(repoRoot, sourceRel);
const source = readJson(sourceRel);

if (batch.batch_id !== release.batch_id || approval.batch_id !== release.batch_id) {
  throw new Error("Batch 2B release identity mismatch.");
}
if (approval.owner_approved !== true || approval.review_status !== "approved") {
  throw new Error("Batch 2B exact owner approval is missing.");
}
if (release.serving_enabled !== true || release.owner_authorized !== true) {
  throw new Error("Batch 2B serving release is not owner-authorized.");
}
if (release.approved_payload_sha256 !== approval.draft_payload_sha256) {
  throw new Error("Batch 2B serving release does not match the approved payload hash.");
}
if (!Array.isArray(batch.rows) || batch.rows.length !== 23 || release.expected_row_count !== 23) {
  throw new Error("Batch 2B release must contain exactly 23 rewritten trine rows.");
}
if (sha256(JSON.stringify(batch.rows)) !== approval.draft_payload_sha256) {
  throw new Error("Batch 2B approved payload hash drifted.");
}
const batchKeys = batch.rows.map((row) => row.contentKey);
if (!sameArray(batchKeys, approval.approved_keys)) {
  throw new Error("Batch 2B approved key list does not match the release payload.");
}
if (batchKeys.includes(release.protected_key)) {
  throw new Error("Protected Venus in Virgo trine Saturn in Capricorn row must not be included in Batch 2B.");
}

for (const row of batch.rows) {
  if (!/^fallback-hook\/sky-aspect-sign\/venus\/[a-z-]+\/trine\/saturn\/[a-z-]+$/u.test(row.contentKey)) {
    throw new Error(`Unexpected Batch 2B key ${row.contentKey}.`);
  }
  if (sha256(row.body) !== row.bodySha256) {
    throw new Error(`${row.contentKey} approved body hash mismatch.`);
  }
}

const sourceByKey = new Map((source.hookRows ?? []).map((row) => [row.contentKey, row]));
const protectedRow = sourceByKey.get(release.protected_key);
if (!protectedRow) throw new Error(`Missing protected row ${release.protected_key}.`);
if (sha256(protectedRow.body_you) !== release.protected_body_sha256 || protectedRow.body_you !== protectedRow.body_they) {
  throw new Error("Protected Venus in Virgo trine Saturn in Capricorn row drifted.");
}

const alreadyReleased = batch.rows.every((approved) => {
  const current = sourceByKey.get(approved.contentKey);
  return current
    && current.body_you === approved.body
    && current.body_they === approved.body
    && current.review_status === "approved";
});

if (!alreadyReleased) {
  const currentBlobSha = execFileSync("git", ["hash-object", sourcePath], { encoding: "utf8" }).trim();
  if (currentBlobSha !== release.source_file_blob_sha_before_release) {
    throw new Error(`Source phrasebook drifted before release: expected ${release.source_file_blob_sha_before_release}, found ${currentBlobSha}.`);
  }
}

for (const approved of batch.rows) {
  const current = sourceByKey.get(approved.contentKey);
  if (!current) throw new Error(`Missing source row ${approved.contentKey}.`);
  if (!["reviewed", "approved"].includes(current.review_status)) {
    throw new Error(`${approved.contentKey} has unexpected review status ${current.review_status}.`);
  }
  current.body_you = approved.body;
  current.body_they = approved.body;
  current.review_status = "approved";
  current.source_keys = [...new Set([...(current.source_keys ?? []), approvalRel, releaseRel])];
  current.note = "sky aspect sign-specific; exact owner-approved 2026-09-03; serving release authorized 2026-09-03";
}

fs.writeFileSync(sourcePath, `${JSON.stringify(source, null, 2)}\n`);

console.log(JSON.stringify({
  ok: true,
  batchId: release.batch_id,
  releasedRows: batch.rows.length,
  protectedKey: release.protected_key,
  source: sourceRel,
  alreadyReleased
}, null, 2));
