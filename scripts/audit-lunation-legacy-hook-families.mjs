#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const sourcePath = path.join(
  repoRoot,
  "apps/web/src/content/fallbackArchitectureV3/source-rows/fallback-source-rows-v3.json",
);
const outputPath = path.join(
  repoRoot,
  "packages/astro-knowledge/review/lunation-card-assembly-v1/legacy-lunation-hook-audit.json",
);
const familyPrefixes = [
  "fallback-hook/lunation-release/",
  "fallback-hook/lunation-shows/",
  "fallback-hook/lunation-higher-path/",
  "fallback-hook/lunation-intention/",
  "fallback-hook/lunation-moment/",
];
const codeRoots = [
  path.join(repoRoot, "apps/web/src"),
  path.join(repoRoot, "scripts"),
];
const codeExtensions = new Set([".js", ".mjs", ".cjs", ".ts", ".tsx"]);
const excludedFiles = new Set([
  path.resolve(fileURLToPath(import.meta.url)),
  path.join(repoRoot, "apps/web/src/content/fallbackArchitectureV3/dist/tldr-content.js"),
]);

function codeFilesUnder(root) {
  const files = [];
  const visit = (directory) => {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      if (["node_modules", "dist", "build", ".git"].includes(entry.name)) continue;
      const absolute = path.join(directory, entry.name);
      if (entry.isDirectory()) visit(absolute);
      else if (codeExtensions.has(path.extname(entry.name)) && !excludedFiles.has(absolute)) files.push(absolute);
    }
  };
  visit(root);
  return files;
}

function scopeFromKey(contentKey) {
  const suffix = contentKey.split("/").slice(2);
  if (suffix[0] === "full" || suffix[0] === "new") {
    return { kind: suffix[0], house: Number(suffix[1]) };
  }
  return { house: Number(suffix[0]) };
}

const source = JSON.parse(fs.readFileSync(sourcePath, "utf8"));
const codeFiles = codeRoots.flatMap(codeFilesUnder);
const codeText = new Map(codeFiles.map((file) => [file, fs.readFileSync(file, "utf8")]));
const rows = source.hookRows
  .filter((row) => familyPrefixes.some((prefix) => row.contentKey.startsWith(prefix)))
  .sort((a, b) => a.contentKey.localeCompare(b.contentKey, "en"))
  .map((row) => {
    const references = [...codeText.entries()]
      .filter(([, text]) => text.includes(row.contentKey))
      .map(([file]) => path.relative(repoRoot, file));
    return {
      contentKey: row.contentKey,
      body_you: row.body_you,
      scope: scopeFromKey(row.contentKey),
      review_status: row.review_status,
      approval: row.approval ?? null,
      code_reference_count: references.length,
      code_references: references,
    };
  });

const familyCounts = Object.fromEntries(familyPrefixes.map((prefix) => [
  prefix.replace(/^fallback-hook\//u, "").replace(/\/$/u, ""),
  rows.filter((row) => row.contentKey.startsWith(prefix)).length,
]));
const output = {
  schema: "lunation-legacy-hook-audit/v1",
  source: path.relative(repoRoot, sourcePath),
  families: familyCounts,
  total_rows: rows.length,
  total_code_references: rows.reduce((sum, row) => sum + row.code_reference_count, 0),
  rows,
};

fs.writeFileSync(outputPath, `${JSON.stringify(output, null, 2)}\n`);
console.log(JSON.stringify({
  output: path.relative(repoRoot, outputPath),
  families: familyCounts,
  totalRows: rows.length,
  totalCodeReferences: output.total_code_references,
}, null, 2));
