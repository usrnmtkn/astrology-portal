#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import {
  applyContentPromotionPlan,
  buildContentPromotionPlan,
  writeJsonAtomically
} from "./lib/content-approval-governance.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
function argument(name) {
  return process.argv.find((value) => value.startsWith(`${name}=`))?.slice(name.length + 1) ?? null;
}

const applicationPath = argument("--application");
const receiptPath = argument("--receipt");
const expectedPlanSha256 = argument("--expected-plan-sha256");
const write = process.argv.includes("--write");
if (!applicationPath || !receiptPath || (write && !expectedPlanSha256)) {
  throw new Error("Usage: node scripts/promote-content-approval.mjs --application=<application.json> --receipt=<receipt.json> [--write --expected-plan-sha256=<dry-run hash>]");
}

const application = JSON.parse(fs.readFileSync(path.resolve(applicationPath), "utf8"));
let baseCommitSha = null;
try {
  baseCommitSha = execFileSync("git", ["rev-parse", "HEAD"], { cwd: repoRoot, encoding: "utf8" }).trim();
} catch {
  // A detached fixture directory may not have Git metadata.
}
const plan = buildContentPromotionPlan({ repoRoot, application, baseCommitSha });

if (!write) {
  const { sourceAfter: _sourceAfter, ...receipt } = plan;
  writeJsonAtomically(path.resolve(receiptPath), { ...receipt, mode: "dry-run" });
  console.log(`Promotion dry-run ready: ${plan.changes.length} change(s), source untouched.`);
  console.log(`planSha256=${plan.planSha256}`);
} else {
  const receipt = applyContentPromotionPlan({ repoRoot, plan, expectedPlanSha256 });
  writeJsonAtomically(path.resolve(receiptPath), receipt);
  console.log(`Promotion applied atomically to ${receipt.sourcePath}: ${receipt.changes.length} change(s).`);
  console.log(`receipt=${path.resolve(receiptPath)}`);
}
