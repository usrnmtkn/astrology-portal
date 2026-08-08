#!/usr/bin/env node
// Applies the owner-authored, hash-pinned bond-effect directional payloads to
// their full content keys and writes one exact-approval record per row.
// Deterministic; no model calls.

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const payloadsPath = path.join(
  repoRoot,
  "packages/astro-knowledge/review/bond-effect-directional-payloads.json",
);
const sourcePath = path.join(
  repoRoot,
  "apps/web/src/content/fallbackArchitectureV3/source-rows/fallback-source-rows-v3.json",
);
const reviewDir = "packages/astro-knowledge/review/bond-effect-directional-copy-v1";
const approvedAt = "2026-08-07";

const sha256 = (value) => crypto.createHash("sha256").update(value).digest("hex");
const payloads = JSON.parse(fs.readFileSync(payloadsPath, "utf8"));
const source = JSON.parse(fs.readFileSync(sourcePath, "utf8"));
const rowsByKey = new Map(source.hookRows.map((row) => [row.contentKey, row]));
const keys = Object.keys(payloads);

if (keys.length !== 139 || new Set(keys).size !== 139) {
  throw new Error(`Expected 139 unique bond-effect payloads; received ${keys.length}.`);
}

const recordDir = path.join(repoRoot, reviewDir);
fs.mkdirSync(recordDir, { recursive: true });
const manifestRows = [];

for (const contentKey of keys) {
  if (!contentKey.startsWith("fallback-hook/bond-effect-")) {
    throw new Error(`Out-of-scope content key: ${contentKey}`);
  }
  const entry = payloads[contentKey];
  const payloadHash = sha256(JSON.stringify(entry.payload));
  if (payloadHash !== entry.sha256) {
    throw new Error(`Payload hash mismatch: ${contentKey}`);
  }
  const row = rowsByKey.get(contentKey);
  if (!row) throw new Error(`Missing serving row: ${contentKey}`);

  const recordName = `${contentKey.slice("fallback-hook/".length).replaceAll("/", "-")}-exact-approval.json`;
  const recordPath = `${reviewDir}/${recordName}`;
  const previousPayloadSha256 = sha256(JSON.stringify({
    body_you: row.body_you,
    body_they: row.body_they,
  }));
  const record = {
    schemaVersion: 1,
    id: `bond-effect-directional-copy-v1-${contentKey.slice("fallback-hook/".length).replaceAll("/", "-")}`,
    approvalLevel: "exact_owner_approved",
    authorship: "owner_authored",
    provenanceNote: "Owner-authored directional bond-effect copy supplied verbatim; no Sol writer or Terra judge artifacts exist for this payload by design.",
    approvalSource: "packages/astro-knowledge/review/bond-effect-owner-rewrite-raw-2026-08-07.md",
    contentKey,
    payloadSha256: entry.sha256,
    payloadHashAlgorithm: "sha256(JSON.stringify(payload))",
    payload: entry.payload,
    approvedAt,
    approvalEffect: "exact_wording_approval",
    additionalBilledCalls: 0,
  };
  fs.writeFileSync(path.join(repoRoot, recordPath), `${JSON.stringify(record, null, 2)}\n`);

  row.body_you = entry.payload.body_you;
  row.body_they = entry.payload.body_they;
  row.review_status = "approved";
  row.approval = {
    approvalLevel: "exact_owner_approved",
    recordPath,
    payloadSha256: entry.sha256,
    approvedAt,
  };
  delete row.approved_via;

  manifestRows.push({
    contentKey,
    recordPath,
    payloadSha256: entry.sha256,
    previousPayloadSha256,
  });
}

fs.writeFileSync(sourcePath, `${JSON.stringify(source, null, 1)}\n`);
fs.writeFileSync(
  path.join(recordDir, "shipping-manifest.json"),
  `${JSON.stringify({
    schemaVersion: 1,
    id: "bond-effect-directional-copy-v1",
    approvedAt,
    payloadSource: "packages/astro-knowledge/review/bond-effect-directional-payloads.json",
    provenanceSource: "packages/astro-knowledge/review/bond-effect-owner-rewrite-raw-2026-08-07.md",
    rowCount: manifestRows.length,
    rows: manifestRows,
  }, null, 2)}\n`,
);

const written = JSON.parse(fs.readFileSync(sourcePath, "utf8"));
const writtenRows = new Map(written.hookRows.map((row) => [row.contentKey, row]));
for (const contentKey of keys) {
  const entry = payloads[contentKey];
  const row = writtenRows.get(contentKey);
  if (
    row?.body_you !== entry.payload.body_you
    || row?.body_they !== entry.payload.body_they
    || row?.approval?.payloadSha256 !== entry.sha256
  ) {
    throw new Error(`Post-write verification failed: ${contentKey}`);
  }
}

console.log(`shipped ${keys.length}/${keys.length} bond-effect rows; records + manifest in ${reviewDir}`);
