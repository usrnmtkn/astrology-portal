#!/usr/bin/env node

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { readInlineXlsxSheet } from "./lib/read-inline-xlsx.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const workbookRelative = "tldr-astro-phrasebank/TLDR-LL-KNOWLEDGE-MATRIX-V9-DIRECT-SECOND-PERSON-LIVED-PENDING-OWNER.xlsx";
const workbookPath = path.join(repoRoot, workbookRelative);
const outputRelative = "packages/astro-knowledge/data/aspects";
const outputDir = path.join(repoRoot, outputRelative);
const TARGETS = new Set(["ascendant", "midheaven", "north-node", "south-node", "part-of-fortune"]);

function sha256(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function normalize(value) {
  return String(value || "").trim().toLowerCase().replaceAll("_", "-").replace(/\s+/gu, "-");
}

function normalizeAspect(value) {
  const aspect = normalize(value);
  return aspect === "conjunct" ? "conjunction" : aspect === "inconjunct" ? "quincunx" : aspect;
}

function isTargetKey(key) {
  const parts = String(key || "").split("|").map(normalize);
  return parts.length === 3 && (TARGETS.has(parts[0]) || TARGETS.has(parts[2]));
}

function buildRows() {
  const bytes = fs.readFileSync(workbookPath);
  const workbookSha256 = sha256(bytes);
  const rows = readInlineXlsxSheet(workbookPath, "AspectMeanings", { headerRowNumber: 1 })
    .filter((row) => isTargetKey(row.cells.Key))
    .map((row) => {
      const [planetA, aspect, planetB] = row.cells.Key.split("|").map(normalize);
      const astrologySupport = String(row.cells.AstrologySupport || "").trim();
      const pageRef = String(row.cells.PageRef || "").trim();
      if (!astrologySupport) throw new Error(`AspectMeanings!${row.rowNumber} ${row.cells.Key}: blank AstrologySupport.`);
      if (!pageRef) throw new Error(`AspectMeanings!${row.rowNumber} ${row.cells.Key}: blank PageRef.`);
      const key = `${planetA}|${normalizeAspect(aspect)}|${planetB}`;
      return {
        filename: `${key.replaceAll("|", "-")}.json`,
        record: {
          schemaVersion: "natal-point-angle-aspect-doctrine-v1",
          id: key.replaceAll("|", "-"),
          kind: "natal-aspect-doctrine",
          astrologySupport,
          astrologySupportSha256: sha256(astrologySupport),
          sourceFactors: [{ type: "natal-aspect", planetA, aspect: normalizeAspect(aspect), planetB }],
          provenance: {
            sourceWorkbook: workbookRelative,
            sourceWorkbookSha256: workbookSha256,
            sheet: "AspectMeanings",
            workbookRow: row.rowNumber,
            keyCell: `A${row.rowNumber}`,
            pageRef,
            astrologySupportCell: `L${row.rowNumber}`,
            surface: "natal"
          },
          readerCopy: false,
          voiceNeutral: true,
          status: "SOURCE_BACKED"
        }
      };
    });
  const filenames = new Set(rows.map((row) => row.filename));
  if (rows.length !== 392 || filenames.size !== rows.length) {
    throw new Error(`Expected 392 unique natal point/angle aspect records; found ${rows.length} rows and ${filenames.size} files.`);
  }
  return { rows, workbookSha256 };
}

function main() {
  const { rows, workbookSha256 } = buildRows();
  fs.mkdirSync(outputDir, { recursive: true });
  for (const { filename, record } of rows) {
    fs.writeFileSync(path.join(outputDir, filename), `${JSON.stringify(record, null, 2)}\n`);
  }
  const expected = new Set(rows.map((row) => row.filename));
  const unexpected = fs.readdirSync(outputDir).filter((filename) => filename.endsWith(".json") && !expected.has(filename));
  if (unexpected.length) throw new Error(`Unexpected natal aspect registry files: ${unexpected.join(", ")}`);
  console.log(JSON.stringify({ output: outputRelative, records: rows.length, sourceWorkbookSha256: workbookSha256 }, null, 2));
}

main();
