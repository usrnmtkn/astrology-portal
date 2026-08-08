import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import assert from "node:assert/strict";
import { resolveFriendChartLoadingState } from "../apps/web/src/features/friends/friendChartLoading.ts";

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
const loadingStateCases = [
  {
    name: "local auth without Supabase",
    input: {
      authAccountChecked: false,
      isAuthConfigured: false,
      remoteAccountId: null,
      remoteProfileReady: false
    },
    expected: { allowCachedChartsWhileLoading: true, chartsReady: false }
  },
  {
    name: "configured auth before account resolution",
    input: {
      authAccountChecked: false,
      isAuthConfigured: true,
      remoteAccountId: null,
      remoteProfileReady: false
    },
    expected: { allowCachedChartsWhileLoading: false, chartsReady: false }
  },
  {
    name: "configured auth with no remote account",
    input: {
      authAccountChecked: true,
      isAuthConfigured: true,
      remoteAccountId: null,
      remoteProfileReady: false
    },
    expected: { allowCachedChartsWhileLoading: true, chartsReady: true }
  },
  {
    name: "remote account before profile migration",
    input: {
      authAccountChecked: true,
      isAuthConfigured: true,
      remoteAccountId: "account-1",
      remoteProfileReady: false
    },
    expected: { allowCachedChartsWhileLoading: false, chartsReady: false }
  },
  {
    name: "remote account after profile migration",
    input: {
      authAccountChecked: true,
      isAuthConfigured: true,
      remoteAccountId: "account-1",
      remoteProfileReady: true
    },
    expected: { allowCachedChartsWhileLoading: true, chartsReady: true }
  }
];

for (const testCase of loadingStateCases) {
  assert.deepEqual(
    resolveFriendChartLoadingState(testCase.input),
    testCase.expected,
    `Friends chart loading state failed for ${testCase.name}.`
  );
}
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
