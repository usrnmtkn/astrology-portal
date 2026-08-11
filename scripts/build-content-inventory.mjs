#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { buildCanonicalContentRecords, contentInventoryFingerprint } from "./lib/content-inventory-sources.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outputPath = path.join(repoRoot, "data/content-inventory/content-inventory-v1.json");
const checkOnly = process.argv.includes("--check");
const sourceCommitArg = process.argv.find((argument) => argument.startsWith("--source-commit="));
const sourceCommit = sourceCommitArg?.slice("--source-commit=".length)
  || execFileSync("git", ["rev-parse", "HEAD"], { cwd: repoRoot, encoding: "utf8" }).trim();
const records = buildCanonicalContentRecords(repoRoot);
const countBy = (field) => Object.fromEntries(
  [...new Set(records.map((record) => record[field]))]
    .sort()
    .map((value) => [value, records.filter((record) => record[field] === value).length]),
);
const inventory = {
  schemaVersion: "content-inventory-v1",
  generatedOn: "2026-08-10",
  sourceCommit,
  authorityRule: "Only owner-approved and owner-locked records may serve or export.",
  contentFingerprint: contentInventoryFingerprint(records),
  recordCount: records.length,
  statusCounts: countBy("status"),
  familyCounts: countBy("contentFamily"),
  unresolvedGovernance: [],
  records,
};
const serialized = `${JSON.stringify(inventory, null, 2)}\n`;

if (checkOnly) {
  const current = fs.readFileSync(outputPath, "utf8");
  const parsed = JSON.parse(current);
  const comparableCurrent = { ...parsed, sourceCommit };
  const expected = `${JSON.stringify({ ...inventory, sourceCommit }, null, 2)}\n`;
  const comparable = `${JSON.stringify(comparableCurrent, null, 2)}\n`;
  if (comparable !== expected) {
    throw new Error("Canonical content inventory is stale. Run node scripts/build-content-inventory.mjs.");
  }
  console.log(`Content inventory current: ${inventory.recordCount} records, ${inventory.contentFingerprint}.`);
} else {
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, serialized);
  console.log(`Wrote ${path.relative(repoRoot, outputPath)} (${inventory.recordCount} records, ${inventory.contentFingerprint}).`);
}
