import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import assert from "node:assert/strict";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const appSourcePath = path.join(repoRoot, "apps/web/src/App.tsx");
const appSource = fs.readFileSync(appSourcePath, "utf8");
const manualChartsSourcePath = path.join(repoRoot, "apps/web/src/services/manualCharts.ts");
const manualChartsSource = fs.readFileSync(manualChartsSourcePath, "utf8");
const authSourcePath = path.join(repoRoot, "apps/web/src/services/auth.ts");
const authSource = fs.readFileSync(authSourcePath, "utf8");
const socialFriendsSourcePath = path.join(repoRoot, "apps/web/src/services/socialFriends.ts");
const socialFriendsSource = fs.readFileSync(socialFriendsSourcePath, "utf8");
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
  appSource,
  /const chartsToRepair = charts\.filter\(manualChartNeedsNatalRepair\);/,
  "Friends chart repair must filter incomplete charts before starting async repair work."
);

const readyCacheHydrationMatch = appSource.match(
  /if \(allowCachedChartsWhileLoading && !chartsLoadedRef\.current\) \{(?<body>[\s\S]*?)\n    \}\n\n    if \(!chartsLoadedRef\.current\)/
);

assert.ok(
  readyCacheHydrationMatch?.groups?.body,
  "Friends chart list must hydrate from local cached rows before waiting on the remote chart list."
);

assert.match(
  readyCacheHydrationMatch.groups.body,
  /listCachedManualCharts\(\[\s*chartOwnerUserId,\s*profile\.id\s*\]\)/,
  "Friends chart ready-load path must paint only the resolved profile's local chart cache before remote refresh."
);

assert.ok(
  appSource.indexOf("if (allowCachedChartsWhileLoading && !chartsLoadedRef.current)") <
    appSource.indexOf("listManualCharts(chartOwnerUserId)"),
  "Friends chart cache hydration must run before the Supabase manual chart fetch."
);

assert.match(
  appSource,
  /allowCachedChartsWhileLoading=\{!isAuthConfigured \|\| authAccountChecked\}/,
  "Friends charts must paint their account-scoped cache after authentication resolves."
);
assert.doesNotMatch(
  appSource,
  /mode === "friends" && userProfile && sky &&/,
  "The Friends landing page must not wait for current-sky calculation before showing saved charts."
);
assert.match(
  appSource,
  /const shouldLoadRelationships = mode === "friends" && friendProfileContentRequested;/,
  "Friends relationship and composite content must wait until a chart profile requests it."
);
assert.match(
  appSource,
  /const shouldLoadNatal = \["guest", "member", "profile"\]\.includes\(mode\)\s*\|\| \(mode === "friends" && friendProfileContentRequested\);/,
  "Friends natal and You content must also wait until a chart profile requests it."
);
assert.doesNotMatch(
  appSource,
  /const shouldLoadRelationships = mode === "friends";$/m,
  "Opening the Friends Circle or Charts landing view must not fetch all relationship content."
);
assert.match(
  appSource,
  /if \(resolvedFriendsMainView === "profile" && selectedChart\) \{\s*onFriendProfileContentRequest\(\);/,
  "Opening a Friends chart profile must request deferred natal and relationship content after the landing view is usable."
);
assert.match(
  appSource,
  /currentSky: SkySnapshot \| null;[\s\S]*friendProfileWork\.transits && currentSky && selectedChart/,
  "Friends transit calculations must tolerate a chart list that renders before current-sky data is ready."
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
assert.match(
  appSource,
  /const repairTimer = window\.setTimeout\(\(\) => \{\s*void repairCharts\(\);\s*\}, 1_500\);/,
  "Incomplete chart repair must wait until after initial interaction instead of competing with first paint."
);

console.log(JSON.stringify({
  status: "PASS",
  surface: "friends chart performance",
  contract: "Friends and chart rows paint from cache/core data first, share auth verification, and defer incomplete-chart repair."
}, null, 2));
