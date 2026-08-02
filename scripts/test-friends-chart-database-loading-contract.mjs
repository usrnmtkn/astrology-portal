import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import assert from "node:assert/strict";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const appSourcePath = path.join(repoRoot, "apps/web/src/App.tsx");
const manualChartsPath = path.join(repoRoot, "apps/web/src/services/manualCharts.ts");
const authPath = path.join(repoRoot, "apps/web/src/services/auth.ts");
const manualChartsControllerPath = path.join(
  repoRoot,
  "apps/web/src/features/friends/useManualChartsController.ts"
);
const appSource = fs.readFileSync(appSourcePath, "utf8");
const manualChartsSource = fs.readFileSync(manualChartsPath, "utf8");
const manualChartsControllerSource = fs.readFileSync(manualChartsControllerPath, "utf8");
const authSource = fs.readFileSync(authPath, "utf8");

assert.match(
  manualChartsSource,
  /from\("manual_charts"\)/,
  "Friend chart database QA must cover the Supabase manual_charts table."
);
assert.match(
  authSource,
  /supabase\.auth\.getUser\(\)/,
  "Friend chart database QA must cover the signed-in remote-user branch."
);
assert.match(
  manualChartsSource,
  /getVerifiedAuthUser\(supabase\)/,
  "Friend chart database QA must reuse the shared remote-user verification."
);
assert.match(
  appSource,
  /chartsReady=\{remoteAccountId \? remoteProfileReady : authAccountChecked\}/,
  "Friends chart UI must not query/replace with remote database rows until the remote profile and migration step are ready."
);
assert.doesNotMatch(
  appSource,
  /chartsReady=\{Boolean\(remoteAccountId\) \|\| authAccountChecked\}/,
  "Friends chart UI must not treat an auth account id alone as database readiness."
);
assert.match(
  appSource,
  /allowCachedChartsWhileLoading=\{!isAuthConfigured \|\| authAccountChecked\}/,
  "Friends chart UI must hide cached charts until configured Supabase auth resolves."
);
assert.doesNotMatch(
  manualChartsControllerSource,
  /const cachedCharts = listCachedManualCharts\(\[\s*chartOwnerUserId,\s*profileId,\s*\.\.\.listLocalManualChartUserIds\(\)/,
  "Friends chart UI must not paint cached rows owned by unrelated local accounts."
);
assert.match(
  manualChartsControllerSource,
  /allowCachedChartsWhileLoading && cachedCharts\.length > 0/,
  "ManualChartsPanel must only render cached charts during loading when explicitly allowed."
);
assert.match(
  manualChartsControllerSource,
  /setCharts\(\[\]\);\s*setStatus\("loading"\);/s,
  "ManualChartsPanel must clear visible chart rows while waiting for the database-ready state."
);
assert.match(
  manualChartsControllerSource,
  /chartOwnerUserIdRef\.current !== chartOwnerUserId/,
  "ManualChartsPanel must detect owner changes so one user's visible chart list cannot linger for another owner."
);
assert.match(
  manualChartsSource,
  /export function listLocalManualChartUserIds\(\)/,
  "Friend chart database QA must include a recovery path for older local manual-chart owner keys."
);
assert.match(
  appSource,
  /\.\.\.listLocalManualChartUserIds\(\)/,
  "Auth migration must sweep older local manual-chart keys before showing the remote Friends chart list."
);
assert.match(
  appSource,
  /account && appliedAuthAccountIdRef\.current === account\.id && remoteProfileReadyRef\.current/,
  "Repeated same-account auth wakeups must not reset remote profile readiness or reload Friends charts."
);
assert.match(
  appSource,
  /function refreshSky\(event: PageTransitionEvent\)\s*{\s*if \(event\.persisted\) {\s*setSkyRefreshKey\(Date\.now\(\)\);/s,
  "Ordinary tab focus/pageshow events must not refresh the sky and cascade a Friends page reload."
);

console.log(JSON.stringify({
  status: "PASS",
  surface: "friends chart database loading",
  contract: "Remote friend charts wait for database readiness; local cache does not silently swap with Supabase rows while the app is mounted."
}, null, 2));
