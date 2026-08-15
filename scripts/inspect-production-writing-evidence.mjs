#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const { inspectProductionEvidence } = require("../src/astro-writing/productionEvidenceInspector.cjs");

function option(name) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : null;
}

const inputPath = option("--input");
const outputPath = option("--output");
if (!inputPath) {
  console.error("usage: node scripts/inspect-production-writing-evidence.mjs --input <request.json> [--output <inspection.json>]");
  process.exit(2);
}
const absoluteInput = path.resolve(process.cwd(), inputPath);
const specification = JSON.parse(fs.readFileSync(absoluteInput, "utf8"));
const inspection = inspectProductionEvidence(specification);
const serialized = `${JSON.stringify(inspection, null, 2)}\n`;
if (outputPath) {
  const absoluteOutput = path.resolve(process.cwd(), outputPath);
  if (!absoluteOutput.startsWith(`${root}${path.sep}`)) {
    throw new Error("Inspector output must stay inside the repository.");
  }
  fs.mkdirSync(path.dirname(absoluteOutput), { recursive: true });
  fs.writeFileSync(absoluteOutput, serialized);
  console.log(`Wrote ${path.relative(root, absoluteOutput)}`);
} else {
  process.stdout.write(serialized);
}
