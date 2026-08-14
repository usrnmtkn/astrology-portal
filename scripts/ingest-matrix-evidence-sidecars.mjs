#!/usr/bin/env node

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const resourcesRoot = process.env.TLDR_OWNER_RESOURCES ?? "/Users/mprez/Downloads/Resources";
const sources = Object.freeze([
  {
    name: "TLDR-Matrix-Evidence-Index.jsonl",
    sha256: "0b4aa6ad27819edbe3333beff342392fa4ba646b7f6fdcfd8ff899f77b2759d8",
    validate(bytes) {
      const rows = bytes.toString("utf8").trim().split("\n").filter(Boolean).map(JSON.parse);
      if (rows.length !== 3473) throw new Error(`MATRIX_EVIDENCE_ROW_COUNT:${rows.length}`);
      const allowedRoles = new Set(["meaning", "register", "scene", "argument_candidate"]);
      for (const [index, row] of rows.entries()) {
        if (!row.copy_sha || !row.copy || !Array.isArray(row.roles) || !row.roles.length) {
          throw new Error(`MATRIX_EVIDENCE_SCHEMA:${index + 1}`);
        }
        for (const role of row.roles) if (!allowedRoles.has(role)) throw new Error(`MATRIX_EVIDENCE_ROLE:${role}`);
      }
    }
  },
  {
    name: "TLDR-Matrix-Coverage-By-Placement.json",
    sha256: "4196d48d0a38660e861f4677cbb5d7cb10dcf96301f39bcf0f5b92a91a340be0",
    validate(bytes) {
      const coverage = JSON.parse(bytes.toString("utf8"));
      if (Object.keys(coverage).length !== 179) throw new Error(`MATRIX_COVERAGE_COUNT:${Object.keys(coverage).length}`);
      const zeroScene = Object.values(coverage).filter((row) => row.scene === 0).length;
      if (zeroScene !== 114) throw new Error(`MATRIX_COVERAGE_ZERO_SCENE:${zeroScene}`);
    }
  }
]);

const targetRoot = path.join(repoRoot, "data/writing/matrix-evidence-index");
fs.mkdirSync(targetRoot, { recursive: true });
const results = [];
for (const source of sources) {
  const sourcePath = path.join(resourcesRoot, source.name);
  const bytes = fs.readFileSync(sourcePath);
  const actualSha256 = crypto.createHash("sha256").update(bytes).digest("hex");
  if (actualSha256 !== source.sha256) {
    throw new Error(`MATRIX_SIDECAR_FINGERPRINT:${source.name}:${actualSha256}`);
  }
  source.validate(bytes);
  const targetPath = path.join(targetRoot, source.name);
  fs.writeFileSync(targetPath, bytes);
  results.push({ sourcePath, targetPath: path.relative(repoRoot, targetPath), bytes: bytes.length, sha256: actualSha256 });
}

console.log(JSON.stringify({ status: "ingested-derived-indexes", canonicalWorkbookChanged: false, files: results }, null, 2));
