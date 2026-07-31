#!/usr/bin/env node

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { evaluateEphemerisReleaseGate } from "./check-ephemeris-release-gate.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const now = new Date("2026-07-31T18:00:00.000Z");
const run = (overrides = {}) => ({
  id: 101,
  status: "completed",
  conclusion: "success",
  event: "schedule",
  head_branch: "main",
  head_sha: "abc123",
  created_at: "2026-07-31T09:17:00.000Z",
  updated_at: "2026-07-31T09:25:00.000Z",
  html_url: "https://github.example/runs/101",
  ...overrides
});

const fresh = evaluateEphemerisReleaseGate([run()], { now, maxAgeHours: 36 });
assert.equal(fresh.ok, true);
assert.match(fresh.reason, /passed/);

const latestFailure = evaluateEphemerisReleaseGate([
  run({ id: 100, updated_at: "2026-07-31T08:00:00.000Z" }),
  run({ id: 102, conclusion: "failure", updated_at: "2026-07-31T12:00:00.000Z" })
], { now, maxAgeHours: 36 });
assert.equal(latestFailure.ok, false);
assert.match(latestFailure.reason, /concluded failure/);

const stale = evaluateEphemerisReleaseGate([
  run({ updated_at: "2026-07-29T05:00:00.000Z" })
], { now, maxAgeHours: 36 });
assert.equal(stale.ok, false);
assert.match(stale.reason, /maximum is 36/);

const ignoresPullRequests = evaluateEphemerisReleaseGate([
  run({ event: "pull_request", updated_at: "2026-07-31T17:00:00.000Z" }),
  run({ id: 99, event: "workflow_dispatch", updated_at: "2026-07-31T10:00:00.000Z" })
], { now, maxAgeHours: 36 });
assert.equal(ignoresPullRequests.ok, true);
assert.equal(ignoresPullRequests.latest.id, 99);

const wrongBranch = evaluateEphemerisReleaseGate([
  run({ head_branch: "feature/not-main" })
], { now, branch: "main", maxAgeHours: 36 });
assert.equal(wrongBranch.ok, false);
assert.match(wrongBranch.reason, /No completed/);

const ambiguousMetadata = evaluateEphemerisReleaseGate([
  run({ head_branch: undefined }),
  run({ id: 98, event: undefined })
], { now, branch: "main", maxAgeHours: 36 });
assert.equal(ambiguousMetadata.ok, false, "runs without explicit main-branch and event provenance must fail closed");

const missing = evaluateEphemerisReleaseGate([], { now, maxAgeHours: 36 });
assert.equal(missing.ok, false);

const integrityWorkflow = fs.readFileSync(path.join(repoRoot, ".github/workflows/ephemeris-integrity.yml"), "utf8");
assert.match(integrityWorkflow, /cron: "17 9 \* \* \*"/, "Horizons comparison must run daily");
assert.match(integrityWorkflow, /issues: write/, "daily workflow must be able to persist its monitor issue");
assert.match(integrityWorkflow, /NASA\/JPL ephemeris integrity status/, "daily workflow must preserve durable status/history");

const releaseWorkflow = fs.readFileSync(path.join(repoRoot, ".github/workflows/ephemeris-release-gate.yml"), "utf8");
assert.match(releaseWorkflow, /pull_request:/, "release gate must run on pull requests");
assert.match(releaseWorkflow, /name: nasa-jpl-freshness/, "required check name must stay stable for branch rules");
assert.match(releaseWorkflow, /EPHEMERIS_MAX_AGE_HOURS: 36/, "release gate must enforce the 36-hour freshness window");

console.log("Ephemeris release gate contract passed: daily durable monitoring wired; fresh success accepted; failures, stale runs, PR runs, and wrong branches rejected.");
