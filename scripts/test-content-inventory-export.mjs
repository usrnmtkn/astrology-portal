#!/usr/bin/env node

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { buildCanonicalContentRecords, contentInventoryFingerprint } from "./lib/content-inventory-sources.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const inventory = JSON.parse(fs.readFileSync(path.join(repoRoot, "data/content-inventory/content-inventory-v1.json"), "utf8"));
const exportLines = fs.readFileSync(path.join(repoRoot, "data/content-inventory/content-export-v1.jsonl"), "utf8").trim().split("\n").map(JSON.parse);
const report = JSON.parse(fs.readFileSync(path.join(repoRoot, "data/content-inventory/content-export-build-report.json"), "utf8"));
const canonical = buildCanonicalContentRecords(repoRoot);
const fingerprint = contentInventoryFingerprint(canonical);
const exported = exportLines.slice(1);

assert.deepEqual(inventory.records, canonical, "Inventory records must equal the live canonical serving inventory.");
assert.equal(inventory.contentFingerprint, fingerprint, "Inventory fingerprint must cover sorted keys, wording, and status.");
assert.equal(exportLines[0].contentFingerprint, fingerprint, "JSONL metadata must carry the canonical fingerprint.");
assert.equal(exported.length, canonical.length, "Every approved production record must export exactly once.");
assert.deepEqual(exported.map(({ recordType: _type, ...record }) => record), canonical, "Export rows must equal inventory rows byte-for-byte after JSON parsing.");
assert.equal(new Set(canonical.map((record) => record.contentKey)).size, canonical.length, "Canonical runtime addresses must be unique.");
assert.ok(canonical.every((record) => ["owner-approved", "owner-locked"].includes(record.status)), "No unapproved record may serve or export.");
assert.deepEqual(inventory.unresolvedGovernance, [], "Serving inventory may not contain unresolved governance.");
assert.deepEqual(report, {
  schemaVersion: "content-export-report-v1",
  result: "PASS",
  generatedOn: inventory.generatedOn,
  sourceCommit: inventory.sourceCommit,
  contentFingerprint: fingerprint,
  approvedProductionRecords: canonical.length,
  exportedRecords: canonical.length,
  missingRecords: 0,
  orphanedRecords: 0,
  wordingMismatches: 0,
  statusMismatches: 0,
  unresolvedGovernance: 0,
});

console.log(`Content inventory/export parity: PASS (${canonical.length} records, ${fingerprint}).`);
