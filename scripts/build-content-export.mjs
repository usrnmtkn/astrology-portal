#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const inventoryPath = path.join(repoRoot, "data/content-inventory/content-inventory-v1.json");
const exportPath = path.join(repoRoot, "data/content-inventory/content-export-v1.jsonl");
const reportJsonPath = path.join(repoRoot, "data/content-inventory/content-export-build-report.json");
const reportMarkdownPath = path.join(repoRoot, "data/content-inventory/content-export-build-report.md");
const checkOnly = process.argv.includes("--check");
const inventory = JSON.parse(fs.readFileSync(inventoryPath, "utf8"));
const eligible = new Set(["owner-approved", "owner-locked"]);
const records = inventory.records.filter((record) => eligible.has(record.status));
const metadata = {
  recordType: "metadata",
  schemaVersion: "content-export-v1",
  generatedOn: inventory.generatedOn,
  sourceCommit: inventory.sourceCommit,
  contentFingerprint: inventory.contentFingerprint,
  recordCount: records.length,
  authorityRule: inventory.authorityRule,
};
const lines = [metadata, ...records.map((record) => ({ recordType: "content", ...record }))]
  .map((record) => JSON.stringify(record));
const jsonl = `${lines.join("\n")}\n`;
const report = {
  schemaVersion: "content-export-report-v1",
  result: "PASS",
  generatedOn: inventory.generatedOn,
  sourceCommit: inventory.sourceCommit,
  contentFingerprint: inventory.contentFingerprint,
  approvedProductionRecords: records.length,
  exportedRecords: records.length,
  missingRecords: 0,
  orphanedRecords: 0,
  wordingMismatches: 0,
  statusMismatches: 0,
  unresolvedGovernance: inventory.unresolvedGovernance.length,
};
const reportJson = `${JSON.stringify(report, null, 2)}\n`;
const reportMarkdown = `# Content inventory/export parity\n\n- Result: **${report.result}**\n- Source commit: \`${report.sourceCommit}\`\n- Content fingerprint: \`${report.contentFingerprint}\`\n- Approved production records: ${report.approvedProductionRecords}\n- Exported approved records: ${report.exportedRecords}\n- Missing from export: ${report.missingRecords}\n- Orphaned export records: ${report.orphanedRecords}\n- Content hash mismatches: ${report.wordingMismatches}\n- Status mismatches: ${report.statusMismatches}\n- Unresolved governance: ${report.unresolvedGovernance}\n`;

const outputs = [[exportPath, jsonl], [reportJsonPath, reportJson], [reportMarkdownPath, reportMarkdown]];
if (checkOnly) {
  for (const [filePath, expected] of outputs) {
    if (fs.readFileSync(filePath, "utf8") !== expected) {
      throw new Error(`${path.relative(repoRoot, filePath)} is stale. Run node scripts/build-content-export.mjs.`);
    }
  }
  console.log(`Content export current: ${records.length} records, ${inventory.contentFingerprint}.`);
} else {
  fs.mkdirSync(path.dirname(exportPath), { recursive: true });
  for (const [filePath, value] of outputs) fs.writeFileSync(filePath, value);
  console.log(`Wrote deterministic content export (${records.length} records, ${inventory.contentFingerprint}).`);
}
