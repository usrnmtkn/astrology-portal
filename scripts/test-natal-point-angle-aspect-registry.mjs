#!/usr/bin/env node

import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { readInlineXlsxSheet } from "./lib/read-inline-xlsx.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const workbookRelative = "tldr-astro-phrasebank/TLDR-LL-KNOWLEDGE-MATRIX-V9-DIRECT-SECOND-PERSON-LIVED-PENDING-OWNER.xlsx";
const workbookPath = path.join(repoRoot, workbookRelative);
const registryDir = path.join(repoRoot, "packages/astro-knowledge/data/aspects");
const TARGETS = new Set(["ascendant", "midheaven", "north-node", "south-node", "part-of-fortune"]);
const sha256 = (value) => crypto.createHash("sha256").update(value).digest("hex");
const normalize = (value) => String(value || "").trim().toLowerCase().replaceAll("_", "-").replace(/\s+/gu, "-");

const workbookSha256 = sha256(fs.readFileSync(workbookPath));
const sourceRows = readInlineXlsxSheet(workbookPath, "AspectMeanings", { headerRowNumber: 1 }).filter((row) => {
  const parts = String(row.cells.Key || "").split("|").map(normalize);
  return parts.length === 3 && (TARGETS.has(parts[0]) || TARGETS.has(parts[2]));
});
const files = fs.readdirSync(registryDir).filter((filename) => filename.endsWith(".json")).sort();
assert.equal(sourceRows.length, 392);
assert.equal(files.length, 392);
for (const row of sourceRows) {
  const [planetA, aspectRaw, planetB] = row.cells.Key.split("|").map(normalize);
  const aspect = aspectRaw === "conjunct" ? "conjunction" : aspectRaw === "inconjunct" ? "quincunx" : aspectRaw;
  const filename = `${planetA}-${aspect}-${planetB}.json`;
  const record = JSON.parse(fs.readFileSync(path.join(registryDir, filename), "utf8"));
  assert.equal(record.status, "SOURCE_BACKED", filename);
  assert.equal(record.readerCopy, false, filename);
  assert.equal(record.astrologySupport, row.cells.AstrologySupport, filename);
  assert.equal(record.astrologySupportSha256, sha256(row.cells.AstrologySupport), filename);
  assert.deepEqual(record.sourceFactors, [{ type: "natal-aspect", planetA, aspect, planetB }], filename);
  assert.equal(record.provenance.sourceWorkbook, workbookRelative, filename);
  assert.equal(record.provenance.sourceWorkbookSha256, workbookSha256, filename);
  assert.equal(record.provenance.workbookRow, row.rowNumber, filename);
  assert.equal(record.provenance.pageRef, row.cells.PageRef, filename);
  assert.equal(record.provenance.surface, "natal", filename);
  assert.equal("copy" in record, false, `${filename}: reader copy is forbidden in doctrine registry.`);
  assert.doesNotMatch(JSON.stringify(record.provenance), /synastry/iu, `${filename}: synastry provenance is forbidden.`);
}
console.log("Natal point/angle aspect registry passed: 392 source-backed natal-only mechanisms with exact workbook provenance.");
