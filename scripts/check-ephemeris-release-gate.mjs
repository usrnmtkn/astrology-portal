#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const DEFAULT_WORKFLOW = "ephemeris-integrity.yml";
const DEFAULT_BRANCH = "main";
const DEFAULT_MAX_AGE_HOURS = 36;
const ALLOWED_EVENTS = new Set(["schedule", "workflow_dispatch"]);

function timestampFor(run) {
  return Date.parse(run.updated_at ?? run.run_started_at ?? run.created_at ?? "");
}

export function evaluateEphemerisReleaseGate(
  runs,
  {
    now = new Date(),
    branch = DEFAULT_BRANCH,
    maxAgeHours = DEFAULT_MAX_AGE_HOURS
  } = {}
) {
  const completed = (Array.isArray(runs) ? runs : [])
    .filter((run) => run?.status === "completed")
    .filter((run) => run.head_branch === branch)
    .filter((run) => ALLOWED_EVENTS.has(run.event))
    .filter((run) => Number.isFinite(timestampFor(run)))
    .sort((first, second) => timestampFor(second) - timestampFor(first));
  const latest = completed[0] ?? null;

  if (!latest) {
    return {
      ok: false,
      reason: `No completed NASA/JPL ephemeris integrity run was found for ${branch}.`,
      latest: null,
      ageHours: null,
      maxAgeHours
    };
  }

  const ageHours = (now.getTime() - timestampFor(latest)) / 3_600_000;
  if (latest.conclusion !== "success") {
    return {
      ok: false,
      reason: `Latest NASA/JPL ephemeris integrity run concluded ${latest.conclusion || "without a conclusion"}.`,
      latest,
      ageHours,
      maxAgeHours
    };
  }

  if (ageHours < 0 || ageHours > maxAgeHours) {
    return {
      ok: false,
      reason: `Latest NASA/JPL ephemeris integrity pass is ${ageHours.toFixed(1)} hours old; maximum is ${maxAgeHours}.`,
      latest,
      ageHours,
      maxAgeHours
    };
  }

  return {
    ok: true,
    reason: `Latest NASA/JPL ephemeris integrity run passed ${ageHours.toFixed(1)} hours ago.`,
    latest,
    ageHours,
    maxAgeHours
  };
}

function argumentValue(args, name) {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : null;
}

async function loadRuns(args) {
  const fixturePath = argumentValue(args, "--runs-file");
  if (fixturePath) {
    const parsed = JSON.parse(fs.readFileSync(fixturePath, "utf8"));
    return parsed.workflow_runs ?? parsed;
  }

  const repository = process.env.GITHUB_REPOSITORY;
  const token = process.env.GITHUB_TOKEN;
  const workflow = process.env.EPHEMERIS_WORKFLOW_FILE ?? DEFAULT_WORKFLOW;
  const branch = process.env.EPHEMERIS_RELEASE_BRANCH ?? DEFAULT_BRANCH;
  if (!repository || !token) {
    throw new Error("GITHUB_REPOSITORY and GITHUB_TOKEN are required outside --runs-file test mode.");
  }

  const url = new URL(`https://api.github.com/repos/${repository}/actions/workflows/${workflow}/runs`);
  url.searchParams.set("branch", branch);
  url.searchParams.set("status", "completed");
  url.searchParams.set("per_page", "20");
  const response = await fetch(url, {
    headers: {
      accept: "application/vnd.github+json",
      authorization: `Bearer ${token}`,
      "x-github-api-version": "2022-11-28",
      "user-agent": "tldrastro-ephemeris-release-gate/1.0"
    }
  });
  if (!response.ok) {
    throw new Error(`GitHub Actions run lookup failed: ${response.status} ${response.statusText}`);
  }
  const payload = await response.json();
  return payload.workflow_runs ?? [];
}

async function main() {
  const args = process.argv.slice(2);
  const branch = process.env.EPHEMERIS_RELEASE_BRANCH ?? DEFAULT_BRANCH;
  const maxAgeHours = Number(process.env.EPHEMERIS_MAX_AGE_HOURS ?? DEFAULT_MAX_AGE_HOURS);
  const nowValue = argumentValue(args, "--now");
  const now = nowValue ? new Date(nowValue) : new Date();
  if (!Number.isFinite(maxAgeHours) || maxAgeHours <= 0) {
    throw new Error("EPHEMERIS_MAX_AGE_HOURS must be a positive number.");
  }
  if (!Number.isFinite(now.getTime())) {
    throw new Error("--now must be a valid date/time.");
  }
  const result = evaluateEphemerisReleaseGate(await loadRuns(args), {
    now,
    branch,
    maxAgeHours
  });
  const output = {
    ok: result.ok,
    reason: result.reason,
    ageHours: result.ageHours === null ? null : Number(result.ageHours.toFixed(2)),
    maxAgeHours: result.maxAgeHours,
    runId: result.latest?.id ?? null,
    runUrl: result.latest?.html_url ?? null,
    headSha: result.latest?.head_sha ?? null,
    conclusion: result.latest?.conclusion ?? null
  };

  console.log(JSON.stringify(output, null, 2));
  if (process.env.GITHUB_STEP_SUMMARY) {
    fs.appendFileSync(
      process.env.GITHUB_STEP_SUMMARY,
      `# NASA/JPL ephemeris release gate: ${result.ok ? "PASS" : "FAIL"}\n\n${result.reason}\n\n${output.runUrl ? `[Verification run](${output.runUrl})` : "No verification run available."}\n`
    );
  }
  if (!result.ok) process.exitCode = 1;
}

if (fileURLToPath(import.meta.url) === path.resolve(process.argv[1] ?? "")) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
