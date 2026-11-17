import { isEphemerisHealthReport } from "../src/shared/ephemerisHealth.mjs";
import fs from "node:fs";
import path from "node:path";

const baseUrl = (process.env.PRODUCTION_BASE_URL || "https://tldrastro.vercel.app").replace(/\/+$/u, "");
const attempts = Number.parseInt(process.env.CALCULATION_MONITOR_ATTEMPTS || "5", 10);
const delayMs = Number.parseInt(process.env.CALCULATION_MONITOR_DELAY_MS || "30000", 10);
const timeoutMs = Number(process.env.CALCULATION_MONITOR_TIMEOUT_MS || "10000");
const reportPath = process.env.CALCULATION_MONITOR_REPORT_PATH || "";
const summaryPath = process.env.CALCULATION_MONITOR_SUMMARY_PATH || "";

if (!Number.isInteger(attempts) || attempts < 1 || !Number.isInteger(delayMs) || delayMs < 0 || !Number.isInteger(timeoutMs) || timeoutMs < 1 || timeoutMs > 60_000 || attempts > 10) {
  throw new Error("Calculation monitor retry configuration is invalid.");
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Recovering instances answered 429 for about ninety seconds on 2026-09-18,
 * so a single probe is not evidence of an outage. Only every attempt failing is.
 */
async function checkOnce() {
  const response = await fetch(`${baseUrl}/api/health?scope=ephemeris`, {
    headers: { accept: "application/json" }, cache: "no-store", signal: AbortSignal.timeout(timeoutMs)
  });
  const payload = await response.json();
  if (!isEphemerisHealthReport(payload)) {
    throw new Error(`Ephemeris health answered ${response.status} with a missing, stale, or invalid readiness report.`);
  }
  if (!response.ok || !payload.ok) {
    const failed = Object.entries(payload.dependencies).filter(([, result]) => !result.ok)
      .map(([name, result]) => `${name}: ${result.code || "unavailable"}`);
    throw new Error(failed.join("; ") || `Ephemeris health answered ${response.status}.`);
  }
  const dependency = payload.dependencies.skyCalculationApi;
  return dependency;
}

function writeSummary(lines) {
  if (!summaryPath) return;
  fs.mkdirSync(path.dirname(path.resolve(summaryPath)), { recursive: true });
  fs.writeFileSync(summaryPath, `${lines.join("\n")}\n`, "utf8");
}

function writeReport(ok, reason) {
  if (!reportPath) return;
  fs.mkdirSync(path.dirname(path.resolve(reportPath)), { recursive: true });
  fs.writeFileSync(reportPath, JSON.stringify({ schema: "ephemeris-monitor/v1", ok,
    checkedAt: new Date().toISOString(), reason, target: `${baseUrl}/api/health?scope=ephemeris` }, null, 2) + "\n");
}

let dependency;
let lastError;

for (let attempt = 1; attempt <= attempts; attempt += 1) {
  try {
    dependency = await checkOnce();
    break;
  } catch (error) {
    lastError = error instanceof Error ? error.message : String(error);
    console.error(`Calculation service attempt ${attempt}/${attempts} failed: ${lastError}`);
    if (attempt < attempts) await wait(delayMs);
  }
}

if (dependency) {
  writeReport(true, "ready");
  const host = dependency.detail?.host ? String(dependency.detail.host) : "the configured calculation host";
  console.log(`Calculation service reachable through ${baseUrl}: ${host} answered in ${dependency.elapsedMs}ms.`);
  writeSummary([
    `The calculation service is answering. ${host} responded in ${dependency.elapsedMs}ms.`,
    "",
    "Current sky placements, report facts, relationship facts, and the Sky generation crons all depend on this service."
  ]);
  process.exit(0);
}

writeReport(false, lastError);
console.error(`Calculation service unreachable through ${baseUrl} after ${attempts} attempts.`);
writeSummary([
  `The calculation service is not answering. Checked ${baseUrl}/api/health?scope=ephemeris ${attempts} times.`,
  "",
  "Reported reason:",
  "",
  "```",
  lastError,
  "```",
  "",
  "While this is failing, current sky placements, report fulfillment, Friends relationship facts,",
  "the Sky generation crons, and Content Studio sky article generation all fail for the same reason.",
  "",
  "Where to look, in the order that found the 2026-09-17 outage:",
  "",
  "```bash",
  "gcloud billing projects describe tldrastro-prod",
  "gcloud run services describe tldrastro-api --region us-central1 --project tldrastro-prod",
  "gcloud logging read 'resource.type=\"cloud_run_revision\" AND resource.labels.service_name=\"tldrastro-api\"' \\",
  "  --project tldrastro-prod --limit 20 --freshness 1h",
  "```",
  "",
  "That outage was a disabled project billing account: the container could not read its startup",
  "secret, so no instance ever became ready and Google's frontend returned an empty 500."
]);
process.exit(1);
