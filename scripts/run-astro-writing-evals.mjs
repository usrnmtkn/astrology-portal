#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { evaluateLilithVerticalSlice } from "../src/astro-writing/verticalSliceEval.mjs";

function readJsonl(filePath) {
  return fs.readFileSync(filePath, "utf8").trim().split("\n").filter(Boolean).map(JSON.parse);
}

const result = evaluateLilithVerticalSlice({
  gold: readJsonl(path.resolve("data/writing/owner-approved-examples.jsonl")),
  negatives: readJsonl(path.resolve("data/writing/negative-regression-fixtures.jsonl"))
});
const report = {
  ...result,
  modelCallCount: 0,
  note: "Executable deterministic and structured-contract evaluation; no billed model call was required."
};
if (process.argv.includes("--write-report")) {
  const out = path.resolve("packages/astro-knowledge/review/writing-harness-v2/lilith-vertical-slice-eval.json");
  fs.writeFileSync(out, `${JSON.stringify(report, null, 2)}\n`);
}
console.log(JSON.stringify(report, null, 2));
if (!result.passed) process.exitCode = 1;
