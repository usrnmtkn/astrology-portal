import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import assert from "node:assert/strict";
import { resolveFriendChartLoadingState } from "../apps/web/src/features/friends/friendChartLoading.ts";
import { listLocalManualChartUserIds } from "../apps/web/src/services/manualChartLocalOwners.ts";
import {
  accountProfileBootstrapAction,
  profileBootstrapLocalOwnerIds
} from "../apps/web/src/services/profileBootstrap.ts";

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
const originalWindow = globalThis.window;
const localStorageKeys = [
  "tldrastro:manualCharts:legacy-a",
  "unrelated:storage:key",
  "tldrastro:manualCharts:legacy-b"
];
globalThis.window = {
  localStorage: {
    get length() { return localStorageKeys.length; },
    key(index) { return localStorageKeys[index] ?? null; }
  }
};
const legacyOwnerIds = listLocalManualChartUserIds();
if (originalWindow === undefined) {
  delete globalThis.window;
} else {
  globalThis.window = originalWindow;
}
assert.deepEqual(legacyOwnerIds, ["legacy-a", "legacy-b"]);
assert.deepEqual(
  profileBootstrapLocalOwnerIds({
    accountId: "account-id",
    cachedProfileId: "cached-id",
    persistedProfileId: "persisted-id",
    legacyOwnerIds
  }),
  ["cached-id", "persisted-id", "account-id", "legacy-a", "legacy-b"],
  "Auth migration must behaviorally sweep older local manual-chart keys before showing the remote Friends chart list."
);
assert.equal(
  accountProfileBootstrapAction({
    accountId: "account-id",
    appliedAccountId: "account-id",
    remoteProfileReady: true
  }),
  "reuse-ready",
  "Repeated same-account auth wakeups must behaviorally retain the ready profile instead of reloading Friends charts."
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
