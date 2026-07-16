import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import assert from "node:assert/strict";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const appSourcePath = path.join(repoRoot, "apps/web/src/App.tsx");
const manualChartsPath = path.join(repoRoot, "apps/web/src/services/manualCharts.ts");
const appSource = fs.readFileSync(appSourcePath, "utf8");
const manualChartsSource = fs.readFileSync(manualChartsPath, "utf8");

assert.match(
  manualChartsSource,
  /const localManualChartsKeyPrefix = "tldrastro:manualCharts:";/,
  "Friends data-retention QA requires a stable local manual-chart key prefix."
);
assert.match(
  manualChartsSource,
  /export function listLocalManualChartUserIds\(\)/,
  "Friends data-retention QA requires a helper that enumerates all legacy local manual-chart owner ids."
);
assert.match(
  manualChartsSource,
  /window\.localStorage\.length/,
  "Legacy local manual-chart owner discovery must use the Storage API length, not only enumerable object keys."
);
assert.match(
  manualChartsSource,
  /window\.localStorage\.key\(index\)/,
  "Legacy local manual-chart owner discovery must read each Storage key."
);
assert.match(
  manualChartsSource,
  /key\?\.startsWith\(localManualChartsKeyPrefix\)/,
  "Legacy local manual-chart owner discovery must only include TLDR manual-chart keys."
);
assert.match(
  appSource,
  /migrateLocalManualChartsToRemote\(account\.id,\s*\[\s*cachedLocalProfile\?\.id,\s*persistedProfileId,\s*account\.id,\s*\.\.\.listLocalManualChartUserIds\(\)\s*\]\s*\)/s,
  "Successful auth/profile loading must migrate charts from active, persisted, account, and legacy local owner ids before remote charts render."
);
assert.match(
  appSource,
  /migrateLocalManualChartsToRemote\(account\.id,\s*\[\s*cachedLocalProfile\?\.id,\s*account\.id,\s*\.\.\.listLocalManualChartUserIds\(\)\s*\]\s*\)/s,
  "Fallback auth/profile loading must still migrate charts from legacy local owner ids."
);
assert.match(
  appSource,
  /chartsReady=\{remoteAccountId \? remoteProfileReady : authAccountChecked\}/,
  "Friends chart UI must wait for remote profile loading and migration before replacing local chart state."
);
assert.match(
  appSource,
  /allowCachedChartsWhileLoading=\{!isAuthConfigured\}/,
  "Configured auth must not show stale local chart rows while remote chart migration/loading is unresolved."
);

console.log(JSON.stringify({
  status: "PASS",
  surface: "friends chart data retention",
  contract: "Legacy local manual-chart keys are swept into the signed-in account before the remote Friends chart list replaces local state."
}, null, 2));
