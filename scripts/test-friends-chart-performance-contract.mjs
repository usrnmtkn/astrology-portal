import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import assert from "node:assert/strict";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const appSourcePath = path.join(repoRoot, "apps/web/src/App.tsx");
const appSource = fs.readFileSync(appSourcePath, "utf8");
const manualChartsSourcePath = path.join(repoRoot, "apps/web/src/services/manualCharts.ts");
const manualChartsSource = fs.readFileSync(manualChartsSourcePath, "utf8");

const createManualChartStart = manualChartsSource.indexOf(
  "export async function createManualChart"
);
const createManualChartEnd = manualChartsSource.indexOf(
  "export async function migrateLocalManualChartsToRemote",
  createManualChartStart
);
const createManualChartSource = manualChartsSource.slice(
  createManualChartStart,
  createManualChartEnd
);
const markPendingStart = manualChartsSource.indexOf(
  "function markLocalManualChartSyncError"
);
const markPendingEnd = manualChartsSource.indexOf(
  "function cacheConfirmedManualChart",
  markPendingStart
);
const markPendingSource = manualChartsSource.slice(markPendingStart, markPendingEnd);
const cachedHydrationIndex = appSource.indexOf(
  "const cachedCharts = listCachedManualCharts"
);
const remoteListIndex = appSource.indexOf(
  "listManualCharts(chartOwnerUserId)",
  cachedHydrationIndex
);

assert.ok(
  cachedHydrationIndex >= 0 && remoteListIndex > cachedHydrationIndex,
  "Friends charts must render the local cache before the remote list request can resolve."
);

assert.ok(
  createManualChartStart >= 0 && createManualChartEnd > createManualChartStart,
  "Friends chart sync QA must be able to inspect createManualChart."
);

assert.ok(
  createManualChartSource.indexOf("createLocalManualChart(userId, input)") <
    createManualChartSource.indexOf("await hasRemoteUser(userId)"),
  "Manual chart creation must persist locally before checking the remote session."
);

assert.match(
  createManualChartSource,
  /catch \(error\) \{\s*return markLocalManualChartPending\(userId, localChart, error\);\s*\}/,
  "A failed remote chart write must return the retained pending local chart instead of throwing."
);

assert.match(
  markPendingSource,
  /return writeLocalManualChart\(ownerId,\s*\{[\s\S]*syncStatus,[\s\S]*syncError: syncErrorMessage\(error\)/,
  "A failed remote chart write must keep the chart in local storage with retryable sync state."
);

const repairFunctionMatch = appSource.match(
  /function manualChartNeedsNatalRepair\(chart: ManualChart\) \{(?<body>[\s\S]*?)\n\}/
);

assert.ok(
  repairFunctionMatch?.groups?.body,
  "Friends chart performance QA must be able to inspect manualChartNeedsNatalRepair."
);

const repairBody = repairFunctionMatch.groups.body;

assert.doesNotMatch(
  repairBody,
  /isTldrAstroApiConfigured\s*\|\|/,
  "Friends charts must not repair every known-time chart just because the API is configured."
);

assert.match(
  repairBody,
  /return\s+!chart\.natalChart\s*\|\|\s*!chart\.birthLocation\.timeZone;/,
  "Friends chart repair must only run for records missing natal chart data or timezone data."
);

assert.match(
  appSource,
  /const chartsToRepair = charts\.filter\(manualChartNeedsNatalRepair\);/,
  "Friends chart repair must filter incomplete charts before starting async repair work."
);

console.log(JSON.stringify({
  status: "PASS",
  surface: "friends chart performance",
  contract: "Complete friend charts do not trigger background natal/timezone repair on page load."
}, null, 2));
