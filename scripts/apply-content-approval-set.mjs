#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import {
  buildApprovalApplication,
  writeJsonAtomically
} from "./lib/content-approval-governance.mjs";

function argument(name) {
  return process.argv.find((value) => value.startsWith(`${name}=`))?.slice(name.length + 1) ?? null;
}

const queuePath = argument("--queue");
const approvalsPath = argument("--approvals");
const outputPath = argument("--out");
const checkOnly = process.argv.includes("--check");

if (!queuePath || !approvalsPath || (!checkOnly && !outputPath)) {
  throw new Error(
    "Usage: node scripts/apply-content-approval-set.mjs --queue=<approval-queue.json> --approvals=<approvals.json> [--out=<approval-application.json>] [--check]"
  );
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(path.resolve(filePath), "utf8"));
}

const queue = readJson(queuePath);
const approvals = readJson(approvalsPath);
const application = buildApprovalApplication(queue, approvals);

if (checkOnly) {
  console.log(`Approval set is valid: ${application.decisions.length} decided, ${application.unresolved.length} unresolved.`);
} else {
  writeJsonAtomically(path.resolve(outputPath), application);
  console.log(`Applied approval set atomically: ${application.decisions.length} decided, ${application.unresolved.length} unresolved.`);
  console.log(`application=${path.resolve(outputPath)}`);
}
