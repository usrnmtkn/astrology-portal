#!/usr/bin/env node

import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath, pathToFileURL } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const modulePath = process.env.ARTIFACT_TOOL_MODULE;
if (!modulePath) {
  throw new Error("ARTIFACT_TOOL_MODULE must point to the Codex workspace dependency @oai/artifact-tool/dist/artifact_tool.mjs.");
}
const { SpreadsheetFile, Workbook } = await import(pathToFileURL(modulePath).href);
const lines = (await fs.readFile(path.join(repoRoot, "data/content-inventory/content-export-v1.jsonl"), "utf8"))
  .trim().split("\n").map(JSON.parse);
const metadata = lines[0];
const records = lines.slice(1);
const report = JSON.parse(await fs.readFile(path.join(repoRoot, "data/content-inventory/content-export-build-report.json"), "utf8"));
const outputPath = path.join(repoRoot, "data/content-inventory/content-export-v1.xlsx");
const workbook = Workbook.create();
const navy = "#172033";
const blue = "#2F5D8C";
const paleBlue = "#EAF1F8";
const border = "#D0D5DD";

const summary = workbook.worksheets.add("Summary");
summary.showGridLines = false;
summary.getRange("A1:H2").merge();
summary.getRange("A1").values = [["TLDR Astro Canonical Content Export"]];
summary.getRange("A1:H2").format = { fill: navy, font: { bold: true, color: "#FFFFFF", size: 20 }, verticalAlignment: "center" };
summary.getRange("A4:B10").values = [
  ["Export version", metadata.schemaVersion],
  ["Generated on", metadata.generatedOn],
  ["Source commit", metadata.sourceCommit],
  ["Content fingerprint", metadata.contentFingerprint],
  ["Approved production records", report.approvedProductionRecords],
  ["Exported records", report.exportedRecords],
  ["Parity result", report.result],
];
summary.getRange("A4:A10").format = { fill: paleBlue, font: { bold: true, color: navy }, borders: { preset: "all", style: "thin", color: border } };
summary.getRange("B4:B10").format = { borders: { preset: "all", style: "thin", color: border }, wrapText: true };
summary.getRange("A12:H12").merge();
summary.getRange("A12").values = [["This workbook is a generated human-readable view. The JSONL export and content fingerprint are the artifact of record; edits here never flow back into production."]];
summary.getRange("A12:H12").format = { fill: "#FFF7E6", font: { italic: true, color: "#7A4D00" }, wrapText: true, rowHeight: 42 };
summary.getRange("A:A").format.columnWidth = 30;
summary.getRange("B:B").format.columnWidth = 92;

const inventory = workbook.worksheets.add("Content Inventory");
inventory.showGridLines = false;
inventory.freezePanes.freezeRows(1);
inventory.freezePanes.freezeColumns(2);
const headers = ["Content key", "Family", "Status", "Provenance", "Source author", "Runtime source", "Runtime bucket", "Approval record", "Approval version/date", "Content hash", "Wording (JSON)", "Astrology (JSON)", "Source status", "Judge lineage", "Source row"];
const rows = records.map((record) => [record.contentKey, record.contentFamily, record.status, record.provenance, record.sourceAuthor, record.runtimeSource, record.runtimeBucket, record.approvalRecord, record.approvalVersionDate, record.contentHash, JSON.stringify(record.wording), JSON.stringify(record.astrology), record.sourceStatus ?? "", record.judgeLineage ?? "", record.sourceRow ?? ""]);
inventory.getRangeByIndexes(0, 0, 1, headers.length).values = [headers];
inventory.getRangeByIndexes(1, 0, rows.length, headers.length).values = rows;
inventory.getRangeByIndexes(0, 0, 1, headers.length).format = { fill: navy, font: { bold: true, color: "#FFFFFF" }, wrapText: true, borders: { preset: "all", style: "thin", color: border } };
inventory.getRangeByIndexes(1, 0, rows.length, headers.length).format = { verticalAlignment: "top", wrapText: true, borders: { preset: "all", style: "thin", color: "#EAECF0" } };
inventory.tables.add(`A1:O${rows.length + 1}`, true, "CanonicalContentInventory");
[54, 25, 18, 18, 16, 52, 24, 52, 22, 68, 100, 48, 26, 34, 12].forEach((width, index) => {
  inventory.getRangeByIndexes(0, index, rows.length + 1, 1).format.columnWidth = width;
});

const parity = workbook.worksheets.add("Parity Report");
parity.showGridLines = false;
parity.getRange("A1:D2").merge();
parity.getRange("A1").values = [["Two-way completeness verification"]];
parity.getRange("A1:D2").format = { fill: blue, font: { bold: true, color: "#FFFFFF", size: 18 }, verticalAlignment: "center" };
parity.getRange("A4:B10").values = [
  ["Approved production records", report.approvedProductionRecords],
  ["Exported approved records", report.exportedRecords],
  ["Missing from export", report.missingRecords],
  ["Orphaned export records", report.orphanedRecords],
  ["Content hash mismatches", report.wordingMismatches],
  ["Unresolved governance", report.unresolvedGovernance],
  ["Result", report.result],
];
parity.getRange("A4:A10").format = { fill: paleBlue, font: { bold: true, color: navy }, borders: { preset: "all", style: "thin", color: border } };
parity.getRange("B4:B10").format = { borders: { preset: "all", style: "thin", color: border } };
parity.getRange("A10:B10").format = { fill: "#E8F5ED", font: { bold: true, color: "#176B3A", size: 14 }, borders: { preset: "all", style: "thin", color: border } };
parity.getRange("A:A").format.columnWidth = 34;
parity.getRange("B:B").format.columnWidth = 28;

const output = await SpreadsheetFile.exportXlsx(workbook);
await output.save(outputPath);
await fs.rm(`${outputPath}.inspect.ndjson`, { force: true });
console.log(`Wrote ${path.relative(repoRoot, outputPath)} from canonical JSONL (${records.length} records).`);
