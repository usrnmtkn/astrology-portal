#!/usr/bin/env node

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  shouldHydrateCompatibilityDashboardContent,
  shouldHydrateFallbackDashboardContent,
  shouldLoadDeferredFallbackContent,
  shouldLoadEmptyHouseFallbackContent,
  shouldLoadRelationshipFallbackContent,
  shouldStartRelationshipFallbackEnhancement,
  friendTransitsCopyReady
} from "../apps/web/src/features/friends/friendsContentLoading.ts";
import {
  initialFriendProfileContentRequest
} from "../apps/web/src/features/friends/friendsRouting.ts";
import {
  initialFriendCalculationReadiness,
  idleFriendCalculationReadiness,
  shouldPreloadInitialFriendCalculationRuntime
} from "../apps/web/src/features/friends/friendCalculationReadiness.ts";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const packageRoot = path.join(repoRoot, "apps/web/src/content/fallbackArchitectureV3");
const readJson = (relativePath) => JSON.parse(fs.readFileSync(path.join(packageRoot, relativePath), "utf8"));
const generatedContentSource = fs.readFileSync(
  path.join(repoRoot, "apps/web/src/services/generatedContent.ts"),
  "utf8"
);
const relationshipTabs = (...tabs) => new Set(tabs);
const loadingState = (tabs = [], overrides = {}) => ({
  mode: "friends",
  friendNatalContentRequested: false,
  friendRelationshipContentRequests: relationshipTabs(...tabs),
  ...overrides
});

assert.equal(
  initialFriendProfileContentRequest("https://tldrastro.vercel.app/#friends?tab=charts"),
  null,
  "A bare Friends list must not seed a profile content request."
);
assert.equal(
  initialFriendProfileContentRequest("https://tldrastro.vercel.app/#friends?tab=charts&chart=friend-nikki&view=synastry"),
  "synastry",
  "A direct Synastry link must seed relationship content during initial route processing."
);
assert.equal(
  initialFriendProfileContentRequest("https://tldrastro.vercel.app/friends?tab=charts&chart=friend-nikki&view=natal"),
  "natal",
  "A path-based direct Natal link must seed Natal content during initial route processing."
);

assert.deepEqual(
  initialFriendCalculationReadiness(
    initialFriendProfileContentRequest("https://tldrastro.vercel.app/#friends?tab=charts")
  ),
  idleFriendCalculationReadiness,
  "A bare Friends list must not seed chart calculations."
);
assert.deepEqual(
  initialFriendCalculationReadiness(
    initialFriendProfileContentRequest("https://tldrastro.vercel.app/#friends?tab=charts&chart=friend-nikki&view=compatibility")
  ),
  { currentSky: true, profileNatal: true },
  "A direct Compatibility link must load today's Sky for the Pair Daily card."
);
assert.deepEqual(
  initialFriendCalculationReadiness(
    initialFriendProfileContentRequest("https://tldrastro.vercel.app/#friends?tab=charts&chart=friend-nikki&view=synastry")
  ),
  { currentSky: false, profileNatal: true },
  "A direct Synastry link must start the required profile Natal calculation during initial route processing."
);
assert.deepEqual(
  initialFriendCalculationReadiness(
    initialFriendProfileContentRequest("https://tldrastro.vercel.app/friends?tab=charts&chart=friend-nikki&view=transits")
  ),
  { currentSky: true, profileNatal: true },
  "A direct Transits link must start both required calculations during initial route processing."
);
assert.deepEqual(
  initialFriendCalculationReadiness(
    initialFriendProfileContentRequest("https://tldrastro.vercel.app/friends?tab=charts&chart=friend-nikki&view=natal")
  ),
  idleFriendCalculationReadiness,
  "A direct Natal link must not start unrelated Sky or profile Natal calculations."
);
assert.equal(
  shouldPreloadInitialFriendCalculationRuntime(
    initialFriendProfileContentRequest("https://tldrastro.vercel.app/#friends?tab=charts")
  ),
  false,
  "A bare Friends list must not warm the chart-calculation runtime."
);
assert.equal(
  shouldPreloadInitialFriendCalculationRuntime(
    initialFriendProfileContentRequest("https://tldrastro.vercel.app/#friends?tab=charts&chart=friend-nikki&view=synastry")
  ),
  true,
  "A direct Synastry link must warm its required chart-calculation runtime."
);
assert.equal(
  shouldPreloadInitialFriendCalculationRuntime(
    initialFriendProfileContentRequest("https://tldrastro.vercel.app/friends?tab=charts&chart=friend-nikki&view=natal")
  ),
  false,
  "A direct Natal link must not warm the relationship chart-calculation runtime."
);

assert.equal(
  shouldLoadEmptyHouseFallbackContent(loadingState()),
  false,
  "A bare Friends list must not download empty-house content."
);
assert.equal(
  shouldLoadEmptyHouseFallbackContent(loadingState([], { friendNatalContentRequested: true })),
  true,
  "A requested Friends Natal view must load empty-house content."
);
assert.equal(
  shouldLoadEmptyHouseFallbackContent(loadingState([], { mode: "profile" })),
  true,
  "The You profile must retain empty-house content."
);

assert.equal(
  shouldHydrateFallbackDashboardContent(loadingState()),
  false,
  "A bare Friends list must not download the complete dashboard mirror."
);
assert.equal(
  shouldHydrateFallbackDashboardContent(loadingState([], { friendNatalContentRequested: true })),
  true,
  "Friends Natal must hydrate approved Content Studio overrides once the detail view is requested."
);
for (const tab of ["compatibility", "transits", "synastry", "composite"]) {
  assert.equal(
    shouldHydrateFallbackDashboardContent(loadingState([tab])),
    true,
    `Friends ${tab} must hydrate approved Content Studio overrides after the detail view opens.`
  );
}
for (const mode of ["guest", "member", "profile", "calendar", "account", "settings"]) {
  assert.equal(
    shouldHydrateFallbackDashboardContent(loadingState([], { mode })),
    true,
    `${mode} must retain dashboard hydration.`
  );
}
assert.equal(
  shouldHydrateFallbackDashboardContent(loadingState([], { mode: "learn" })),
  false,
  "Learn must not hydrate natal fallback dashboard rows."
);

assert.equal(
  shouldHydrateCompatibilityDashboardContent(loadingState(["compatibility"])),
  true,
  "Friends Compatibility must hydrate its focused approved dashboard rows."
);
assert.equal(
  shouldHydrateCompatibilityDashboardContent(loadingState(["synastry"])),
  false,
  "Friends Synastry must not download Compatibility dashboard rows."
);
assert.equal(
  shouldHydrateCompatibilityDashboardContent(loadingState(["compatibility"], { mode: "profile" })),
  false,
  "The You profile must not run the Friends Compatibility hydration path."
);

const compatibilityLoaderStart = generatedContentSource.indexOf(
  "export async function loadFallbackArchitectureV3CompatibilityDashboardBundle"
);
const compatibilityLoaderEnd = generatedContentSource.indexOf(
  "export async function loadFallbackArchitectureV3SkyPlacementDashboardBundle",
  compatibilityLoaderStart
);
const compatibilityLoaderSource = generatedContentSource.slice(
  compatibilityLoaderStart,
  compatibilityLoaderEnd
);
assert.ok(compatibilityLoaderStart >= 0 && compatibilityLoaderEnd > compatibilityLoaderStart);
assert.match(
  compatibilityLoaderSource,
  /loadReaderRows\(\{ prefix: "authored\/compat-pair\/" \}\)/,
  "Compatibility hydration must select the exact authored Compatibility namespace."
);
assert.doesNotMatch(
  compatibilityLoaderSource,
  /loadReaderRows\(\{[^}]*provider:/,
  "Compatibility hydration must accept the approved materialization providers used by authored cards."
);
assert.match(
  compatibilityLoaderSource,
  /return packageFallbackArchitectureV3CompatibilityRows\(rows\);/,
  "Compatibility hydration must delegate row packaging to the governed compatibility helper."
);
const compatibilityPackagerStart = generatedContentSource.indexOf(
  "function packageFallbackArchitectureV3CompatibilityRows"
);
const compatibilityPackagerEnd = generatedContentSource.indexOf(
  "async function loadContentStudioLastKnownGoodCompatibilityBundle",
  compatibilityPackagerStart
);
const compatibilityPackagerSource = generatedContentSource.slice(
  compatibilityPackagerStart,
  compatibilityPackagerEnd
);
assert.ok(compatibilityPackagerStart >= 0 && compatibilityPackagerEnd > compatibilityPackagerStart);
assert.match(
  compatibilityPackagerSource,
  /isApprovedFallbackArchitectureV3Row\(row, row\.provider\)/,
  "Compatibility packaging must retain package approval checks for each row's actual provider."
);
assert.match(
  fs.readFileSync(path.join(repoRoot, "apps/web/src/services/fallbackArchitectureV3CorePackaging.ts"), "utf8"),
  /const recordBody = stringFrom\(row\.body, record\.body\);/,
  "A saved top-level body must override the stale packaged body when reader cards are hydrated."
);

assert.equal(shouldLoadDeferredFallbackContent(loadingState(["compatibility"])), false);
assert.equal(shouldLoadDeferredFallbackContent(loadingState(["synastry"])), false);
assert.equal(shouldLoadDeferredFallbackContent(loadingState(["composite"])), false);
assert.equal(
  shouldLoadDeferredFallbackContent(loadingState(["transits"])),
  true,
  "Friends Transits must retain the Natal/Transit fallback partition."
);
assert.equal(
  shouldLoadDeferredFallbackContent(loadingState([], { friendNatalContentRequested: true })),
  true,
  "Friends Natal must retain the Natal/Transit fallback partition."
);
assert.equal(
  shouldLoadDeferredFallbackContent(loadingState([], {
    mode: "member",
    skyPlacementPersonalizationRequested: true
  })),
  true,
  "A signed-in personalized Sky placement must load its approved transit-aspect writing."
);
assert.equal(
  shouldLoadDeferredFallbackContent(loadingState([], { mode: "member" })),
  false,
  "The signed-in Sky landing page must not load transit-aspect writing before a personalized placement opens."
);

for (const tab of ["compatibility", "transits", "synastry", "composite"]) {
  assert.equal(
    shouldLoadRelationshipFallbackContent(loadingState([tab])),
    true,
    `${tab} must load the relationship-only fallback partition.`
  );
}
assert.equal(shouldLoadRelationshipFallbackContent(loadingState()), false);
assert.equal(
  shouldStartRelationshipFallbackEnhancement({
    ...loadingState(["synastry"]),
    currentSkyReady: false,
    profileNatalReady: false
  }),
  true,
  "Explicit relationship intent must fetch its package independently of chart calculation readiness."
);
assert.equal(
  shouldStartRelationshipFallbackEnhancement({
    ...loadingState(["synastry"]),
    currentSkyReady: false,
    profileNatalReady: true
  }),
  true,
  "A relationship fallback package must enhance Synastry as soon as its natal comparison is ready."
);
assert.equal(
  shouldStartRelationshipFallbackEnhancement({
    ...loadingState(["transits"]),
    currentSkyReady: true,
    profileNatalReady: false
  }),
  true,
  "A relationship fallback package must enhance Transits as soon as the current sky is ready."
);

assert.equal(
  friendTransitsCopyReady({ deferredLoaded: false, relationshipLoaded: false }),
  false,
  "Friends transits must wait until both copy packages have loaded."
);
assert.equal(
  friendTransitsCopyReady({ deferredLoaded: true, relationshipLoaded: false }),
  false,
  "Friends transits must wait for Between-you-two copy after personal-transit copy arrives."
);
assert.equal(
  friendTransitsCopyReady({ deferredLoaded: true, relationshipLoaded: true }),
  true,
  "Friends transits may render cards only after both copy packages are present."
);

const sourceRows = readJson("source-rows/fallback-source-rows-v3.json").hookRows;
const pairDailyFrames = readJson("source-rows/pair-daily-frames-v1.json").rows;
const pairDailyClauses = readJson("source-rows/pair-daily-clauses-v1.json").rows;
const canonicalRows = [...sourceRows, ...pairDailyFrames, ...pairDailyClauses];
const canonicalRowBytes = new Set(canonicalRows.map((row) => JSON.stringify(row)));
const deferredRows = readJson("bundled-deferred-core-rows-v3.json").hookRows;
const sharedPlacementRows = readJson("bundled-shared-placement-rows-v3.json").hookRows;
const relationshipRows = readJson("bundled-relationship-hook-rows-v3.json").hookRows;
const partitionRows = [
  ["deferred", deferredRows],
  ["shared-placement", sharedPlacementRows],
  ["relationship", relationshipRows]
];

for (const [partition, rows] of partitionRows) {
  for (const row of rows) {
    assert.ok(
      canonicalRowBytes.has(JSON.stringify(row)),
      `${partition}:${row.contentKey} must remain byte-identical to a canonical source row.`
    );
  }
}

const deferredKeys = new Set(deferredRows.map((row) => row.contentKey));
const sharedPlacementKeys = new Set(sharedPlacementRows.map((row) => row.contentKey));
const relationshipKeys = new Set(relationshipRows.map((row) => row.contentKey));
for (const key of deferredKeys) {
  assert.equal(sharedPlacementKeys.has(key), false, `${key} duplicated across deferred and shared placement.`);
  assert.equal(relationshipKeys.has(key), false, `${key} duplicated across deferred and relationship.`);
}
for (const key of sharedPlacementKeys) {
  assert.equal(relationshipKeys.has(key), false, `${key} duplicated across shared placement and relationship.`);
}

assert.ok(
  relationshipRows.some((row) => row.contentKey.startsWith("fallback-hook/synastry-pair/")),
  "The relationship partition must carry Synastry rows."
);
assert.ok(
  relationshipRows.some((row) => row.contentKey.startsWith("fallback-hook/pair-daily/")),
  "The relationship partition must carry Pair Daily rows."
);
assert.ok(
  sharedPlacementRows.every((row) => row.contentKey.startsWith("fallback-hook/placement-sentence/")),
  "The shared placement partition must contain only placement sentences."
);

const appSource = fs.readFileSync(path.join(repoRoot, "apps/web/src/App.tsx"), "utf8");
const friendTransitsSource = fs.readFileSync(
  path.join(repoRoot, "apps/web/src/features/friends/FriendTransitsTab.tsx"),
  "utf8"
);
assert.match(
  appSource,
  /transitCopyLoading=\{!friendTransitsCopyReady\(\{[\s\S]*deferredLoaded: isDeferredFallbackArchitectureV3BundleLoaded\(\),[\s\S]*relationshipLoaded: isRelationshipFallbackArchitectureV3BundleLoaded\(\)[\s\S]*\}\)\}/u,
  "Friends must not treat transits as ready until personal-transit and bond-effect copy packages have loaded."
);
assert.match(
  appSource,
  /reloadReaderRouteOnce\(\);/u,
  "A stale transit copy chunk after deploy must reload the reader route once."
);
assert.match(
  friendTransitsSource,
  /\{!isLoading && daily\?\.forecast \?/u,
  "Friends must not show the daily forecast as a finished page while transit cards are still loading."
);

console.log("Friends content loading policy passed (on-demand dashboard, domain partitions, byte-identical rows).");
