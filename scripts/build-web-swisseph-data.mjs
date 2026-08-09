#!/usr/bin/env node

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const sourcePath = path.join(repoRoot, "node_modules/swisseph-wasm/wasm/swisseph.data");
const targetPath = path.join(repoRoot, "apps/web/public/wasm/swisseph.data");

const sourceSize = 12_081_426;
const retainedSegments = [
  { name: "seas_18.se1", start: 0, end: 223_002 },
  { name: "seleapsec.txt", start: 10_286_461, end: 10_286_743 },
  { name: "semo_18.se1", start: 10_286_743, end: 11_591_514 },
  { name: "seorbel.txt", start: 11_591_514, end: 11_597_371 },
  { name: "sepl_18.se1", start: 11_597_371, end: 12_081_426 }
];

const source = fs.readFileSync(sourcePath);
assert.equal(
  source.byteLength,
  sourceSize,
  `Unexpected swisseph-wasm data size; review the retained segment map before upgrading the package.`
);

const trimmed = Buffer.concat(
  retainedSegments.map(({ start, end }) => source.subarray(start, end))
);

if (process.argv.includes("--check")) {
  const current = fs.readFileSync(targetPath);
  assert.ok(
    current.equals(trimmed),
    "The web Swiss Ephemeris data package is stale. Run node scripts/build-web-swisseph-data.mjs."
  );
  console.log(`Web Swiss Ephemeris data package is current (${trimmed.byteLength} bytes).`);
  process.exit(0);
}

fs.mkdirSync(path.dirname(targetPath), { recursive: true });
fs.writeFileSync(targetPath, trimmed);
console.log(`Wrote ${targetPath} (${trimmed.byteLength} bytes from ${retainedSegments.length} required files).`);
