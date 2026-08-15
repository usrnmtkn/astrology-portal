#!/usr/bin/env node

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const cron = fs.readFileSync(path.join(repoRoot, "api/cron/generate-sky-aspects.ts"), "utf8");
const serving = fs.readFileSync(path.join(repoRoot, "apps/web/src/services/skyAspectContent.ts"), "utf8");

assert.match(cron, /type JudgeGate = "human-review" \| "regenerate";/u);
assert.doesNotMatch(cron, /judge_gate\s*===\s*["']auto-publish["']/u);
assert.match(cron, /const gate: Exclude<JudgeGate, "regenerate"> = "human-review";/u);
assert.match(cron, /status: "DRAFT"/u);
assert.match(serving, /content\.status === "LIVE"/u);
assert.match(serving, /content\.judgeGate === "human-review"/u);
assert.doesNotMatch(serving, /content\.judgeGate === "auto-publish"/u);

console.log(JSON.stringify({
  status: "PASS",
  generatedJudgeGate: "human-review",
  generatedWriteStatus: "DRAFT",
  servingRequiresExplicitLiveStatus: true,
  autoPublishServingAuthority: false
}, null, 2));
