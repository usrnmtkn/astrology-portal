#!/usr/bin/env node

import { spawnSync } from "node:child_process";

const checks = [
  ["node", ["scripts/assert-vercel-production-source.mjs"]],
  ["node", ["scripts/test-content-studio-component-consistency.mjs"]],
  ["node", ["scripts/test-content-studio-timeout-recovery.mjs"]],
  ["node", ["scripts/test-generation-runtime-contract.mjs"]],
  ["node", ["--import", "tsx", "scripts/test-sky-summary-hydration-stability.mts"]],
  ["node", ["scripts/test-reader-deployment-recovery.mjs"]]
];

for (const [command, args] of checks) {
  const result = spawnSync(command, args, { stdio: "inherit", env: process.env });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}
