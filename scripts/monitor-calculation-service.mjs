import fs from "node:fs";
import path from "node:path";

const baseUrl = (process.env.PRODUCTION_BASE_URL || "https://tldrastro.vercel.app").replace(/\/+$/u, "");
const attempts = Number.parseInt(process.env.CALCULATION_MONITOR_ATTEMPTS || "5", 10);
const delayMs = Number.parseInt(process.env.CALCULATION_MONITOR_DELAY_MS || "30000", 10);
const summaryPath = process.env.CALCULATION_MONITOR_SUMMARY_PATH || "";

if (!Number.isInteger(attempts) || attempts < 1 || !Number.isInteger(delayMs) || delayMs < 0) {
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
  const response = await fetch(`${baseUrl}/api/health`, { headers: { accept: "application/json" } });
  if (response.status !== 200) {
    throw new Error(`${baseUrl}/api/health answered ${response.status}, so the calculation dependency could not be read.`);
  }

  const payload = await response.json().catch(() => null);
  const dependency = payload?.dependencies?.skyCalculationApi;
  if (!dependency || typeof dependency !== "object") {
    throw new Error("Health did not report a skyCalculationApi dependency. The deployed revision predates the calculation check.");
  }
  if (dependency.ok !== true) {
    throw new Error(dependency.error ? String(dependency.error) : "The calculation service reported a failure without a reason.");
  }

  return dependency;
}

function writeSummary(lines) {
  if (!summaryPath) return;
  fs.mkdirSync(path.dirname(path.resolve(summaryPath)), { recursive: true });
  fs.writeFileSync(summaryPath, `${lines.join("\n")}\n`, "utf8");
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
  const host = dependency.detail?.host ? String(dependency.detail.host) : "the configured calculation host";
  console.log(`Calculation service reachable through ${baseUrl}: ${host} answered in ${dependency.elapsedMs}ms.`);
  writeSummary([
    `The calculation service is answering. ${host} responded in ${dependency.elapsedMs}ms.`,
    "",
    "Current sky placements, report facts, relationship facts, and the Sky generation crons all depend on this service."
  ]);
  process.exit(0);
}

console.error(`Calculation service unreachable through ${baseUrl} after ${attempts} attempts.`);
writeSummary([
  `The calculation service is not answering. Checked ${baseUrl}/api/health ${attempts} times.`,
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
