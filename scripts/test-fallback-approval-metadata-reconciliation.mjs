#!/usr/bin/env node

import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const source = JSON.parse(fs.readFileSync(path.join(
  repoRoot,
  "apps/web/src/content/fallbackArchitectureV3/source-rows/fallback-source-rows-v3.json"
), "utf8"));
const deferredBundle = JSON.parse(fs.readFileSync(path.join(
  repoRoot,
  "apps/web/src/content/fallbackArchitectureV3/bundled-deferred-core-rows-v3.json"
), "utf8"));
const record = JSON.parse(fs.readFileSync(path.join(
  repoRoot,
  "packages/astro-knowledge/review/fallback-approval-metadata-reconciliation-2026-08-13.json"
), "utf8"));
const readerCopyFields = [
  "headline", "body", "body_you", "body_they", "body_sky", "fact_line", "aspect_insert",
  "primary_hook", "opening_heading", "opening", "tension_heading", "tension",
  "development_heading", "development", "close_heading", "close", "try_this",
  "aspect_units", "moon_entry_aspect_units"
];
const sha256 = (value) => crypto.createHash("sha256").update(value).digest("hex");
const readerPayload = (row) => Object.fromEntries(
  readerCopyFields.filter((field) => row[field] !== undefined).map((field) => [field, row[field]])
);

const rows = source.hookRows ?? [];
const levelCounts = rows.reduce((counts, row) => {
  const level = row.approval?.approvalLevel ?? "ungated";
  counts[level] = (counts[level] ?? 0) + 1;
  return counts;
}, {});
const migratedExact = new Map(record.exactRows.map((row) => [row.contentKey, row]));
const migratedUntracedKeys = new Set(
  record.untracedByEvidence.flatMap((group) => group.contentKeys)
);
const migratedUngatedKeys = new Set(Object.values(record.ungatedByReason).flat());

assert.equal(rows.length, 4377);
assert.deepEqual(record.counts, {
  hookRows: 4377,
  alreadyStructured: 1224,
  missingStructuredBefore: 3153,
  exactOwnerApprovedAdded: 226,
  ownerSignoffUntracedAdded: 2320,
  leftUngated: 607
});
assert.equal(levelCounts.exact_owner_approved, 1450);
assert.equal(levelCounts.owner_signoff_untraced, 2320);
assert.equal(levelCounts.ungated, 607);
assert.equal(migratedExact.size, 226);
assert.equal(migratedUntracedKeys.size, 2320);
assert.equal(migratedUngatedKeys.size, 607);

for (const row of rows) {
  const migrated = migratedExact.get(row.contentKey);
  if (!migrated) continue;
  assert.equal(row.approval?.approvalLevel, "exact_owner_approved", `${row.contentKey}: exact level missing`);
  assert.equal(row.approval?.recordPath, migrated.recordPath, `${row.contentKey}: record citation drift`);
  assert.ok(fs.existsSync(path.join(repoRoot, migrated.recordPath)), `${row.contentKey}: cited record missing`);
  assert.equal(
    row.approval?.payloadSha256,
    sha256(JSON.stringify(readerPayload(row))),
    `${row.contentKey}: exact payload hash drift`
  );
}

for (const contentKey of migratedUntracedKeys) {
  const row = rows.find((candidate) => candidate.contentKey === contentKey);
  assert.equal(row?.approval?.approvalLevel, "owner_signoff_untraced", `${contentKey}: untraced level missing`);
  assert.equal(Object.hasOwn(row.approval, "recordPath"), false, `${contentKey}: untraced row fabricates recordPath`);
  assert.equal(Object.hasOwn(row.approval, "payloadSha256"), false, `${contentKey}: untraced row fabricates payload hash`);
}

for (const contentKey of migratedUngatedKeys) {
  const row = rows.find((candidate) => candidate.contentKey === contentKey);
  assert.equal(row?.approval, undefined, `${contentKey}: ungated row gained approval from review_status alone`);
}

const currentReaderPayloadHash = sha256(JSON.stringify(rows.map((row) => [row.contentKey, readerPayload(row)])));
assert.equal(record.invariants.readerPayloadSha256Before, record.invariants.readerPayloadSha256After);
assert.equal(currentReaderPayloadHash, record.invariants.readerPayloadSha256After);

const saturnSeventh = rows.find((row) => row.contentKey === "fallback-hook/placement-house-sentence/saturn/7");
assert.equal(saturnSeventh?.review_status, "approved");
assert.equal(saturnSeventh?.approved_via, "owner chat review 2026-07-21");
assert.equal(saturnSeventh?.approval?.approvalLevel, "owner_signoff_untraced");

const canonicalApprovalByKey = new Map(rows.map((row) => [row.contentKey, row.approval]));
for (const bundledRow of deferredBundle.hookRows ?? []) {
  assert.deepEqual(
    bundledRow.approval,
    canonicalApprovalByKey.get(bundledRow.contentKey),
    `${bundledRow.contentKey}: deferred bundle approval metadata is stale`
  );
}

console.log("Fallback approval metadata reconciliation passed: 226 exact, 2,320 untraced, 607 ungated; reader copy unchanged.");
