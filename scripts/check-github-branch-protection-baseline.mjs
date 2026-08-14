#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const baselinePath = path.join(repoRoot, "config/github-main-protection-baseline.json");

function argValue(name) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : null;
}

export function protectionReviewSettings(payload) {
  const source = payload?.required_pull_request_reviews ?? payload;
  return {
    required_approving_review_count: source?.required_approving_review_count,
    dismiss_stale_reviews: source?.dismiss_stale_reviews,
    require_code_owner_reviews: source?.require_code_owner_reviews,
    require_last_push_approval: source?.require_last_push_approval
  };
}

export function compareProtectionToBaseline(payload, baseline) {
  const actual = protectionReviewSettings(payload);
  const mismatches = Object.entries(baseline)
    .filter(([key, expected]) => actual[key] !== expected)
    .map(([key, expected]) => ({ key, expected, actual: actual[key] }));
  return { actual, baseline, mismatches, matches: mismatches.length === 0 };
}

function readActualProtection() {
  const inputPath = argValue("--input");
  if (inputPath) return JSON.parse(fs.readFileSync(path.resolve(inputPath), "utf8"));
  const repository = argValue("--repo") ?? "usrnmtkn/astrology-portal";
  const branch = argValue("--branch") ?? "main";
  const response = execFileSync(
    "gh",
    ["api", `repos/${repository}/branches/${branch}/protection`],
    { encoding: "utf8", stdio: ["ignore", "pipe", "inherit"] }
  );
  return JSON.parse(response);
}

function main() {
  const baseline = JSON.parse(fs.readFileSync(baselinePath, "utf8"));
  const result = compareProtectionToBaseline(readActualProtection(), baseline);
  if (!result.matches) {
    console.error(JSON.stringify({ status: "DRIFT", ...result }, null, 2));
    process.exitCode = 1;
    return;
  }
  console.log(JSON.stringify({ status: "PASS", actual: result.actual }, null, 2));
}

if (path.resolve(process.argv[1] ?? "") === fileURLToPath(import.meta.url)) main();
