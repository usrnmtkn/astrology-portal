import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import assert from "node:assert/strict";
import {
  enhanceFriendChartsAtomically,
  scheduleFriendChartRepair
} from "../apps/web/src/features/friends/friendChartLoading.ts";
import {
  clearSharedGeneratedContentCache,
  loadSharedGeneratedContent,
  sharedGeneratedContentCacheKey
} from "../apps/web/src/services/sharedGeneratedContentCache.ts";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const appSourcePath = path.join(repoRoot, "apps/web/src/App.tsx");
const appSource = fs.readFileSync(appSourcePath, "utf8");
const manualChartsControllerPath = path.join(
  repoRoot,
  "apps/web/src/features/friends/useManualChartsController.ts"
);
const manualChartsControllerSource = fs.readFileSync(manualChartsControllerPath, "utf8");
const relationshipCompareHookSource = fs.readFileSync(
  path.join(repoRoot, "apps/web/src/features/friends/useRelationshipCompare.ts"),
  "utf8"
);
const manualChartsSourcePath = path.join(repoRoot, "apps/web/src/services/manualCharts.ts");
const manualChartsSource = fs.readFileSync(manualChartsSourcePath, "utf8");
const authSourcePath = path.join(repoRoot, "apps/web/src/services/auth.ts");
const authSource = fs.readFileSync(authSourcePath, "utf8");
const socialFriendsSourcePath = path.join(repoRoot, "apps/web/src/services/socialFriends.ts");
const socialFriendsSource = fs.readFileSync(socialFriendsSourcePath, "utf8");
const tldrAstroApiSourcePath = path.join(repoRoot, "apps/web/src/services/tldrastroApi.ts");
const tldrAstroApiSource = fs.readFileSync(tldrAstroApiSourcePath, "utf8");
const socialFriendsPanelSourcePath = path.join(
  repoRoot,
  "apps/web/src/features/friends/SocialFriendsPanel.tsx"
);
const socialFriendsPanelSource = fs.readFileSync(socialFriendsPanelSourcePath, "utf8");

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
const cachedHydrationIndex = manualChartsControllerSource.indexOf(
  "const cachedCharts = listCachedManualCharts"
);
const remoteListIndex = manualChartsControllerSource.indexOf(
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

const repairFunctionMatch = manualChartsSource.match(
  /export function manualChartNeedsNatalRepair\(chart: ManualChart\) \{(?<body>[\s\S]*?)\n\}/
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
  manualChartsControllerSource,
  /const chartsToRepair = charts\.filter\(manualChartNeedsNatalRepair\);/,
  "Friends chart repair must filter incomplete charts before starting async repair work."
);

const readyCacheHydrationMatch = manualChartsControllerSource.match(
  /if \(allowCachedChartsWhileLoading && !chartsLoadedRef\.current\) \{(?<body>[\s\S]*?)\n    \}\n\n    if \(!chartsLoadedRef\.current\)/
);

assert.ok(
  readyCacheHydrationMatch?.groups?.body,
  "Friends chart list must hydrate from local cached rows before waiting on the remote chart list."
);

assert.match(
  readyCacheHydrationMatch.groups.body,
  /listCachedManualCharts\(\[chartOwnerUserId, profileId\]\)/,
  "Friends chart ready-load path must paint only the resolved profile's local chart cache before remote refresh."
);

assert.ok(
  manualChartsControllerSource.indexOf("if (allowCachedChartsWhileLoading && !chartsLoadedRef.current)") <
    manualChartsControllerSource.indexOf("listManualCharts(chartOwnerUserId)"),
  "Friends chart cache hydration must run before the Supabase manual chart fetch."
);

assert.match(
  socialFriendsPanelSource,
  /if \(available === null && activeView !== "charts"\)/,
  "The Charts landing view must render cached chart rows without waiting for social-profile availability."
);

assert.doesNotMatch(
  appSource,
  /mode === "friends" && userProfile && sky &&/,
  "The Friends landing page must not wait for current-sky calculation before showing saved charts."
);
assert.match(
  appSource,
  /const shouldLoadRelationships = mode === "friends" && friendRelationshipContentRequested;/,
  "Friends relationship and composite content must wait until a relationship-oriented profile tab requests it."
);
assert.match(
  appSource,
  /const shouldLoadNatal = \["guest", "member", "profile"\]\.includes\(mode\)\s*\|\| \(mode === "friends" && friendNatalContentRequested\);/,
  "Friends natal and You content must wait until the Natal profile tab requests it."
);
assert.doesNotMatch(
  appSource,
  /const shouldLoadRelationships = mode === "friends";$/m,
  "Opening the Friends Circle or Charts landing view must not fetch all relationship content."
);
assert.match(
  appSource,
  /if \(resolvedFriendsMainView === "profile" && selectedChart\) \{\s*onFriendProfileContentRequest\(friendProfileTab\);/,
  "A Friends chart profile must request only the active tab's deferred content after the landing view is usable."
);
assert.match(
  appSource,
  /\|\| \(mode === "friends" && !friendRelationshipContentRequested\)[\s\S]*loadDeferredFallbackArchitectureV3Bundle\(\)/,
  "Bare Friends and Natal-only views must not download the deferred transit and relationship fallback bundle."
);
assert.match(
  appSource,
  /const requestFriendProfileContent = useCallback\(\(tab: FriendProfileTab\) => \{\s*if \(tab === "natal"\) \{\s*setFriendNatalContentRequested\(true\);\s*return;\s*\}\s*setFriendRelationshipContentRequested\(true\);/,
  "Friends must request natal and relationship interpretation payloads independently by active profile tab."
);
assert.match(
  appSource,
  /currentSky: SkySnapshot \| null;[\s\S]*friendProfileWork\.transits && currentSky && selectedChart/,
  "Friends transit calculations must tolerate a chart list that renders before current-sky data is ready."
);
assert.match(
  appSource,
  /\(friendProfileWork\.compatibility \|\| friendProfileWork\.synastry\) && selectedChart && !selectedChartIsEvent/,
  "Compatibility and Synastry wheels must both receive their inspector aspect lines when active."
);

const verifiedAuthUserMatch = authSource.match(
  /export async function getVerifiedAuthUser[\s\S]*?\n\}/
);

assert.ok(
  verifiedAuthUserMatch,
  "Friends data loading must expose a shared verified-user request."
);
assert.match(
  verifiedAuthUserMatch[0],
  /verifiedAuthUserRequest\?\.accessToken !== accessToken/,
  "Friends data loading must reuse authentication verification for the active access token."
);
assert.match(
  authSource,
  /export async function getAuthAccount\(\)[\s\S]*const user = await getVerifiedAuthUser\(supabase\);/,
  "Account bootstrap must reuse the shared verified-user request instead of repeating auth verification."
);
assert.match(
  appSource,
  /setRemoteProfileReady\(true\);\s*await hydrateBootstrapSocialProfile\(accountProfile\);/,
  "Friends chart readiness must publish before the security-gated social-profile header request completes."
);
assert.match(
  manualChartsSource,
  /const user = await getVerifiedAuthUser\(supabase\);/,
  "Manual charts must share the verified-user request instead of starting another auth network call."
);
assert.match(
  socialFriendsSource,
  /const user = await getVerifiedAuthUser\(client\);/,
  "Social friends must share the verified-user request across its parallel data queries."
);

const socialCoreRefreshMatch = socialFriendsPanelSource.match(
  /const refreshSocialData = useCallback\(async \(\) => \{(?<body>[\s\S]*?)\n  \}, \[onPendingRequestCountChange, publishFriends\]\);/
);

assert.ok(
  socialCoreRefreshMatch?.groups?.body,
  "Friends performance QA must be able to inspect the core social refresh."
);
assert.match(
  socialCoreRefreshMatch.groups.body,
  /const profileRequest = loadOwnSocialProfile\(\)[\s\S]*const loadedFriends = await listSocialFriends\(\);/,
  "Own-profile hydration must start in parallel without blocking visible friend rows."
);
assert.doesNotMatch(
  socialCoreRefreshMatch.groups.body,
  /await Promise\.all\(\[\s*loadOwnSocialProfile\(\),\s*listSocialFriends\(\)/,
  "The visible Friends list must not wait for the own-profile query."
);
assert.match(
  socialCoreRefreshMatch.groups.body,
  /publishFriends\(nextFriends\);\s*void profileRequest;\s*void listSocialFriendRequests\(\)/,
  "Pending requests must start only after the visible Friends list is published."
);
assert.doesNotMatch(
  socialCoreRefreshMatch.groups.body,
  /listSocialNotifications|listSocialInvitations/,
  "The core Friends refresh must not fetch Circle-only activity while Charts is active."
);
assert.match(
  socialFriendsPanelSource,
  /if \(!available \|\| activeView === "charts"\) \{\s*return;\s*\}[\s\S]*void refreshSocialActivity\(\)/,
  "Notifications and invitation history must wait until a non-Charts Friends view is active."
);
const globalPendingRequestEffectStart = appSource.lastIndexOf(
  "useEffect(() => {",
  appSource.indexOf("function refreshPendingFriendRequests")
);
const globalPendingRequestEffectEnd = appSource.indexOf(
  "function openSkyDetail",
  globalPendingRequestEffectStart
);
const globalPendingRequestEffect = appSource.slice(
  globalPendingRequestEffectStart,
  globalPendingRequestEffectEnd
);

assert.match(
  globalPendingRequestEffect,
  /if \(mode === "friends"\) \{\s*return;\s*\}/,
  "The app-wide pending-request monitor must pause while the Friends panel owns request refresh."
);
assert.match(
  globalPendingRequestEffect,
  /\}, \[mode, remoteAccountId, remoteProfileReady, userProfile\?\.id\]\);/,
  "The app-wide pending-request monitor must restart when navigation leaves Friends."
);
assert.match(
  socialFriendsPanelSource,
  /onPendingRequestCountChange\?\.\([\s\S]*request\.direction === "incoming"/,
  "The Friends panel must keep publishing its pending-request count while the app-wide monitor is paused."
);
assert.match(
  tldrAstroApiSource,
  /export function compareRelationship\([\s\S]*options\?: TldrAstroRequestOptions[\s\S]*postTldrAstro<RelationshipCompareResponse>\("\/relationship\/compare", request, options\)/,
  "Relationship comparison requests must accept cancellation options."
);
assert.match(
  relationshipCompareHookSource,
  /const controller = new AbortController\(\);[\s\S]*compareRelationship\([\s\S]*signal: controller\.signal[\s\S]*return \(\) => \{\s*cancelled = true;\s*controller\.abort\(\);/,
  "Leaving Composite or changing charts must abort obsolete relationship comparison work."
);
assert.doesNotMatch(
  appSource,
  /setRelationshipCompareStatus|compareRelationship\(\{/,
  "ManualChartsPanel must not re-embed relationship request state or cancellation."
);
assert.match(
  appSource,
  /function openFriendProfile\(chart: ManualChart\) \{[\s\S]*onFriendProfileContentRequest\(chart\.chartType === "event" \? "natal" : "compatibility"\);[\s\S]*setSelectedChartId\(chart\.id\);/,
  "Selecting a chart must start its Compatibility content prefetch before publishing the selection."
);
assert.match(
  appSource,
  /const prefetchAfterPaint = window\.requestAnimationFrame\(\(\) => \{\s*onFriendProfileContentRequest\("natal"\);\s*if \(!selectedChartIsEvent\) \{\s*onFriendProfileContentRequest\("synastry"\);/,
  "Natal and Synastry content must prefetch only after the selected profile has painted."
);
assert.equal(
  appSource.match(/loadSharedGeneratedContent\(/g)?.length,
  2,
  "Natal and relationship consumers must use the shared content cache."
);
let idleCallback = null;
let idleOptions = null;
let cancelledIdleTask = null;
let repairedDuringIdle = false;
const cancelIdleRepair = scheduleFriendChartRepair(
  () => {
    repairedDuringIdle = true;
  },
  {
    requestIdleCallback(callback, options) {
      idleCallback = callback;
      idleOptions = options;
      return 41;
    },
    cancelIdleCallback(handle) {
      cancelledIdleTask = handle;
    },
    setTimeout() {
      throw new Error("The timeout fallback must not run when idle callbacks are available.");
    },
    clearTimeout() {}
  }
);

assert.equal(repairedDuringIdle, false, "Chart repair must yield until the browser grants idle time.");
assert.equal(idleOptions?.timeout, 250, "Idle repair must have a 250 ms maximum wait.");
idleCallback?.({ didTimeout: false, timeRemaining: () => 10 });
assert.equal(repairedDuringIdle, true, "Chart repair must start as soon as the browser grants idle time.");
cancelIdleRepair();
assert.equal(cancelledIdleTask, 41, "Unmounting must cancel a scheduled idle repair.");

let timeoutCallback = null;
let timeoutDelay = null;
let cancelledTimeoutTask = null;
let repairedDuringFallback = false;
const cancelFallbackRepair = scheduleFriendChartRepair(
  () => {
    repairedDuringFallback = true;
  },
  {
    setTimeout(callback, delay) {
      timeoutCallback = callback;
      timeoutDelay = delay ?? 0;
      return 42;
    },
    clearTimeout(handle) {
      cancelledTimeoutTask = handle;
    }
  }
);

assert.equal(timeoutDelay, 16, "Browsers without idle callbacks must use a one-frame fallback delay.");
assert.ok(timeoutDelay < 100, "The repair fallback must not restore a user-visible fixed delay.");
assert.notEqual(timeoutDelay, 1_500, "Incomplete-chart enhancement must never wait 1.5 seconds.");
timeoutCallback?.();
assert.equal(repairedDuringFallback, true, "The timeout fallback must start incomplete-chart repair.");
cancelFallbackRepair();
assert.equal(cancelledTimeoutTask, 42, "Unmounting must cancel a scheduled fallback repair.");

let resolveFirstRepair;
let resolveSecondRepair;
const repairCommits = [];
const atomicRepair = enhanceFriendChartsAtomically(
  [{ id: "first" }, { id: "second" }],
  (chart) => new Promise((resolve) => {
    if (chart.id === "first") resolveFirstRepair = resolve;
    if (chart.id === "second") resolveSecondRepair = resolve;
  }),
  (charts) => repairCommits.push(charts)
);

resolveFirstRepair?.({ id: "first-repaired" });
await Promise.resolve();
assert.equal(repairCommits.length, 0, "Chart enhancement must not publish a partial repair batch.");
resolveSecondRepair?.({ id: "second-repaired" });
await atomicRepair;
assert.deepEqual(
  repairCommits,
  [[{ id: "first-repaired" }, { id: "second-repaired" }]],
  "Incomplete charts must paint their completed enhancements in one atomic commit."
);

clearSharedGeneratedContentCache();
const natalRequest = {
  surface: "natal",
  targetDate: "2026-08-08",
  previewMode: "normal"
};
let natalLoads = 0;
let resolveNatal;
const loadNatal = () => {
  natalLoads += 1;
  return new Promise((resolve) => {
    resolveNatal = resolve;
  });
};
const selectionPrefetch = loadSharedGeneratedContent(natalRequest, loadNatal);
const profileConsumer = loadSharedGeneratedContent(natalRequest, loadNatal);

assert.equal(selectionPrefetch, profileConsumer, "Prefetch and profile render must share the same in-flight request.");
assert.equal(natalLoads, 1, "A surface/date/preview-mode tuple must load only once.");
resolveNatal?.(new Map([["natal-key", { contentKey: "natal-key" }]]));
await profileConsumer;

for (const request of [
  { ...natalRequest, previewMode: "hide-emergency-floor" },
  { ...natalRequest, targetDate: "2026-08-09" },
  { ...natalRequest, surface: "relationship" }
]) {
  await loadSharedGeneratedContent(request, async () => {
    natalLoads += 1;
    return new Map();
  });
}
assert.equal(natalLoads, 4, "Surface, date, and preview mode must each partition the shared cache.");
assert.equal(
  sharedGeneratedContentCacheKey(natalRequest),
  "natal:2026-08-08:normal",
  "The shared cache key must expose all three dimensions."
);

const failedRequest = { surface: "relationship", targetDate: "2026-08-10", previewMode: "normal" };
let attempts = 0;
await assert.rejects(loadSharedGeneratedContent(failedRequest, async () => {
  attempts += 1;
  throw new Error("temporary dashboard failure");
}));
await loadSharedGeneratedContent(failedRequest, async () => {
  attempts += 1;
  return new Map();
});
assert.equal(attempts, 2, "A failed shared load must be evicted so the next request can retry.");

console.log(JSON.stringify({
  status: "PASS",
  surface: "friends chart performance",
  contract: "Friends and chart rows paint from cache/core data first, share auth verification, and defer incomplete-chart repair."
}, null, 2));
