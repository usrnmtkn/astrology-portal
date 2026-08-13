#!/usr/bin/env node

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { readInlineXlsxSheet } from "./lib/read-inline-xlsx.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const workbookRelative = "tldr-astro-phrasebank/TLDR-LL-KNOWLEDGE-MATRIX-V9-DIRECT-SECOND-PERSON-LIVED-PENDING-OWNER.xlsx";
const matrixRelative = "packages/astro-knowledge/voice/tldr-astro/marie-satori-writer/ll-matrix-v13/ll-matrix-v13.json";
const outputRelative = "packages/astro-knowledge/voice/tldr-astro/marie-satori-writer/ll-matrix-v13/ll-matrix-v13-astrology-support-v1.json";
const workbookPath = path.join(repoRoot, workbookRelative);
const matrixPath = path.join(repoRoot, matrixRelative);
const outputPath = path.join(repoRoot, outputRelative);
const SHEETS = ["PlacementMeanings", "AspectMeanings", "NodesPhasesFortune"];
const HEADER_ROWS = { PlacementMeanings: 1, AspectMeanings: 1, NodesPhasesFortune: 1 };

function sha256(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function field(cells, names) {
  for (const name of names) {
    const match = Object.keys(cells).find((key) => key.trim().toLowerCase() === name.toLowerCase());
    if (match && String(cells[match] ?? "").trim()) return String(cells[match]).trim();
  }
  return "";
}

function main() {
  const matrix = JSON.parse(fs.readFileSync(matrixPath, "utf8"));
  const supportRows = [];
  for (const sheet of SHEETS) {
    for (const row of readInlineXlsxSheet(workbookPath, sheet, { headerRowNumber: HEADER_ROWS[sheet] })) {
      const key = field(row.cells, ["Key", "row key", "RowKey"]);
      const astrologySupport = field(row.cells, ["AstrologySupport", "Astrology Support"]);
      if (!key && !astrologySupport) continue;
      if (!key) throw new Error(`${sheet}!${row.rowNumber}: AstrologySupport row is missing a key.`);
      if (!astrologySupport) throw new Error(`${sheet}!${row.rowNumber} ${key}: AstrologySupport is blank.`);
      supportRows.push({
        sheet,
        key,
        workbookRow: row.rowNumber,
        astrologySupport,
        astrologySupportSha256: sha256(astrologySupport)
      });
    }
  }

  const supportByIdentity = new Map(supportRows.map((row) => [`${row.sheet}\u0000${row.key}`, row]));
  if (supportByIdentity.size !== supportRows.length) throw new Error("AstrologySupport workbook contains duplicate sheet/key identities.");
  if (matrix.rows.length !== 1014) throw new Error(`Expected 1,014 LL V13 rows; found ${matrix.rows.length}.`);
  const missing = matrix.rows.filter((row) => !supportByIdentity.has(`${row.sheet}\u0000${row.key}`));
  const extra = supportRows.filter((row) => !matrix.rows.some((item) => item.sheet === row.sheet && item.key === row.key));
  if (missing.length || extra.length) {
    throw new Error(`AstrologySupport identity mismatch: ${missing.length} missing, ${extra.length} extra.`);
  }

  const rows = matrix.rows.map((row) => supportByIdentity.get(`${row.sheet}\u0000${row.key}`));
  const unapprovedRows = matrix.rows.filter((row) => row.ownerApproved !== true);
  const unapprovedWithSupport = unapprovedRows.filter((row) => supportByIdentity.has(`${row.sheet}\u0000${row.key}`));
  if (unapprovedRows.length !== 713 || unapprovedWithSupport.length !== 713) {
    throw new Error(`Expected AstrologySupport coverage for 713 unapproved rows; found ${unapprovedWithSupport.length}/${unapprovedRows.length}.`);
  }

  const artifact = {
    schemaVersion: "ll-matrix-v13-astrology-support-v1",
    generatedAt: "2026-08-13T00:00:00.000Z",
    sourceWorkbook: workbookRelative,
    sourceWorkbookSha256: sha256(fs.readFileSync(workbookPath)),
    matrixIdentitySource: matrixRelative,
    matrixIdentitySourceSha256: sha256(fs.readFileSync(matrixPath)),
    policy: {
      use: "authoring mechanism source only",
      readerFacing: false,
      existingCandidateProseIncluded: false,
      approvalEffect: "none"
    },
    counts: { total: rows.length, unapprovedV13Rows: unapprovedRows.length, unapprovedWithSupport: unapprovedWithSupport.length },
    rows
  };
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, `${JSON.stringify(artifact, null, 2)}\n`);
  console.log(JSON.stringify({ output: outputRelative, counts: artifact.counts }, null, 2));
}

main();
