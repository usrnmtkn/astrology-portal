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
  manualChartsSource,
  /function dedupeManualCharts\(charts: ManualChart\[\]\)/,
  "Friends chart loading must share one dedupe path for local cache and remote rows."
);
assert.match(
  manualChartsSource,
  /const key = chartIdentity\(chart\);/,
  "Friends chart dedupe must use chart identity so copied legacy rows with different generated ids do not render twice."
);
assert.doesNotMatch(
  manualChartsSource,
  /const key = chart\.id \|\| chartIdentity\(chart\);/,
  "Friends chart dedupe must not prefer generated ids over the stable chart identity."
);
assert.match(
  manualChartsSource,
  /return dedupeManualCharts\(userIds\.flatMap\(\(userId\) => readLocalManualCharts\(userId\)\)\);/,
  "Cached Friends chart loading must dedupe duplicate charts across all local owner keys."
);
assert.match(
  manualChartsSource,
  /return dedupeManualCharts\(\(data as ManualChartRow\[\]\)\.map\(rowToManualChart\)\);/,
  "Remote Friends chart loading must hide already-imported duplicate chart rows."
);
assert.match(
  manualChartsSource,
  /function chartIdentityFromInput\(input: ManualChartInput\)/,
  "Friends chart CRUD must have a typed identity helper for input payloads."
);
assert.match(
  manualChartsSource,
  /const existingChart = localManualChartOwnerIds\(userId\)[\s\S]*\.find\(\(chart\) => chartIdentity\(chart\) === chartIdentityFromInput\(normalizedInput\)\);/,
  "Creating a local Friends chart must reuse an exact existing chart across current and legacy owner keys."
);
assert.match(
  manualChartsSource,
  /function localManualChartOwnerIds\(userId: string\)/,
  "Local Friends chart CRUD must include current and legacy owner keys."
);
assert.match(
  manualChartsSource,
  /function findLocalManualChart\(userId: string, chartId: string\)/,
  "Local Friends chart update/delete must resolve the owner key that actually stores the selected chart."
);
assert.match(
  manualChartsSource,
  /function removeLocalManualChartsByIdentity\(userIds: string\[\], identities: Set<string>\)/,
  "Local Friends chart update/delete must be able to sweep duplicates across owner keys by identity."
);
assert.match(
  manualChartsSource,
  /const existingRemoteChart = \(await listRemoteManualCharts\(userId\)\)[\s\S]*\.find\(\(chart\) => chartIdentity\(chart\) === chartIdentityFromInput\(input\)\);/,
  "Creating a remote Friends chart must reuse an exact existing chart instead of adding a duplicate row."
);
assert.match(
  manualChartsSource,
  /function updateLocalManualChart\(userId: string, chartId: string, input: ManualChartInput\)[\s\S]*const targetOwnerId = foundChart\?\.ownerId \?\? userId;[\s\S]*const existingIdentity = existingChart \? chartIdentity\(existingChart\) : null;/,
  "Updating a local Friends chart must know its previous identity so hidden old duplicates can be removed."
);
assert.match(
  manualChartsSource,
  /const updatedIdentity = chartIdentityFromInput\(normalizedInput\);/,
  "Updating a local Friends chart must know its new identity so hidden new duplicates can be removed."
);
assert.match(
  manualChartsSource,
  /chartIdentity\(chart\) !== updatedIdentity/,
  "Updating a local Friends chart must remove duplicate rows matching the edited chart's new identity."
);
assert.match(
  manualChartsSource,
  /removeLocalManualChartsByIdentity\(\s*ownerIds\.filter\(\(ownerId\) => ownerId !== targetOwnerId\),\s*new Set\(\[\.\.\.\(existingIdentity \? \[existingIdentity\] : \[\]\), updatedIdentity\]\)\s*\);/s,
  "Updating a local Friends chart must clear old and new duplicate identities from other local owner keys."
);
assert.match(
  manualChartsSource,
  /const \{ data: existingChartData, error: existingLookupError \} = await client[\s\S]*\.maybeSingle\(\);/,
  "Updating a remote Friends chart must look up the previous row before editing."
);
assert.match(
  manualChartsSource,
  /\(chartIdentity\(chart\) === existingIdentity \|\| chartIdentity\(chart\) === updatedIdentity\)/,
  "Updating a remote Friends chart must delete hidden duplicates matching either the old or new identity."
);
assert.match(
  manualChartsSource,
  /function deleteLocalManualChart\(userId: string, chartId: string\)[\s\S]*const deletedChart = findLocalManualChart\(userId, chartId\)\?\.chart \?\? null;[\s\S]*const deletedIdentity = deletedChart \? chartIdentity\(deletedChart\) : null;/,
  "Deleting a local Friends chart must identify duplicate local copies by stable chart identity."
);
assert.match(
  manualChartsSource,
  /localManualChartOwnerIds\(userId\)\.forEach\(\(ownerId\) => \{/,
  "Deleting a local Friends chart must sweep current and legacy local owner keys."
);
assert.match(
  manualChartsSource,
  /let chartIdsToDelete = \[chartId\];/,
  "Remote Friends chart delete must track every matching duplicate chart id."
);
assert.match(
  manualChartsSource,
  /\.filter\(\(chart\) => chart\.id === chartId \|\| chartIdentity\(chart\) === deletedIdentity\)/,
  "Remote Friends chart delete must include duplicate rows with the same chart identity."
);
assert.match(
  manualChartsSource,
  /\.in\("manual_chart_id", chartIdsToDelete\)/,
  "Remote Friends chart delete must remove connection rows for every duplicate chart id."
);
assert.match(
  manualChartsSource,
  /\.in\("id", chartIdsToDelete\)/,
  "Remote Friends chart delete must remove every duplicate manual_charts row so refresh cannot restore it."
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
