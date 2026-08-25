#!/usr/bin/env node

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const appSource = fs.readFileSync(path.join(repoRoot, "apps/web/src/App.tsx"), "utf8");
const signupViewSource = fs.readFileSync(
  path.join(repoRoot, "apps/web/src/features/auth/SignupView.tsx"),
  "utf8"
);
const manualChartsPanelSource = fs.readFileSync(
  path.join(repoRoot, "apps/web/src/features/friends/ManualChartsPanel.tsx"),
  "utf8"
);
const profileViewSource = appSource.slice(appSource.indexOf("function ProfileView"));
const natalSkyEffectStart = appSource.indexOf("    const natalSkyRequestKey = [");
const natalSkyEffectEnd = appSource.indexOf("\n\n  useEffect(() => {", natalSkyEffectStart);
const natalSkyEffectSource = appSource.slice(natalSkyEffectStart, natalSkyEffectEnd);
const mainSource = fs.readFileSync(path.join(repoRoot, "apps/web/src/main.tsx"), "utf8");
const indexSource = fs.readFileSync(path.join(repoRoot, "apps/web/index.html"), "utf8");
const viteSource = fs.readFileSync(path.join(repoRoot, "apps/web/vite.config.ts"), "utf8");
const ephemerisSource = fs.readFileSync(path.join(repoRoot, "apps/web/src/services/ephemeris.ts"), "utf8");
const webSwissEphemerisData = fs.readFileSync(path.join(repoRoot, "apps/web/public/wasm/swisseph.data"));
const readerStylesSource = fs.readFileSync(path.join(repoRoot, "apps/web/src/styles.css"), "utf8");
const friendsStylesSource = fs.readFileSync(path.join(repoRoot, "apps/web/src/styles/friends.css"), "utf8");
const friendDetailStylesSource = fs.readFileSync(path.join(repoRoot, "apps/web/src/styles/friends-detail.css"), "utf8");
const friendChartModalStylesSource = fs.readFileSync(path.join(repoRoot, "apps/web/src/styles/friends-chart-modal.css"), "utf8");
const calendarRouteSource = fs.readFileSync(path.join(repoRoot, "apps/web/src/routes/CalendarRoute.tsx"), "utf8");
const friendsRouteSource = fs.readFileSync(path.join(repoRoot, "apps/web/src/routes/FriendsRoute.tsx"), "utf8");
const friendDetailSource = fs.readFileSync(path.join(repoRoot, "apps/web/src/features/friends/FriendDetail.tsx"), "utf8");
const youPageSource = fs.readFileSync(path.join(repoRoot, "apps/web/src/features/you/YouPage.tsx"), "utf8");
const friendsPageShellSource = fs.readFileSync(path.join(repoRoot, "apps/web/src/components/FriendsPageShell.tsx"), "utf8");
const skyDetailArticleSource = fs.readFileSync(
  path.join(repoRoot, "apps/web/src/features/sky/SkyDetailArticle.tsx"),
  "utf8"
);
const friendsWorkspaceShellSource = fs.readFileSync(
  path.join(repoRoot, "apps/web/src/features/friends/FriendsWorkspaceShell.tsx"),
  "utf8"
);
const friendChartModelSource = fs.readFileSync(
  path.join(repoRoot, "apps/web/src/features/friends/friendChartModel.ts"),
  "utf8"
);
const chartProfileSource = fs.readFileSync(
  path.join(repoRoot, "apps/web/src/services/chartProfile.ts"),
  "utf8"
);
const locationLabelsSource = fs.readFileSync(
  path.join(repoRoot, "apps/web/src/utils/locationLabels.ts"),
  "utf8"
);
const friendChartModalSource = fs.readFileSync(path.join(repoRoot, "apps/web/src/features/friends/FriendChartModal.tsx"), "utf8");
const wheelSource = fs.readFileSync(path.join(repoRoot, "apps/web/src/components/charts/Wheels.tsx"), "utf8");
const synastryWheelSource = fs.readFileSync(path.join(repoRoot, "apps/web/src/components/charts/SynastryWheel.tsx"), "utf8");
const placementRowsSource = fs.readFileSync(path.join(repoRoot, "apps/web/src/components/charts/PlacementRows.tsx"), "utf8");
const friendPlacementTablesSource = fs.readFileSync(
  path.join(repoRoot, "apps/web/src/features/friends/FriendPlacementTables.tsx"),
  "utf8"
);
const natalChartTableRowsSource = fs.readFileSync(
  path.join(repoRoot, "apps/web/src/components/charts/natalChartTableRows.ts"),
  "utf8"
);
const relationshipApiSummarySource = fs.readFileSync(
  path.join(repoRoot, "apps/web/src/features/friends/RelationshipApiSummary.tsx"),
  "utf8"
);
const friendCompositeTabSource = fs.readFileSync(
  path.join(repoRoot, "apps/web/src/features/friends/FriendCompositeTab.tsx"),
  "utf8"
);
const friendSynastryTabSource = fs.readFileSync(
  path.join(repoRoot, "apps/web/src/features/friends/FriendSynastryTab.tsx"),
  "utf8"
);
const friendNatalTabSource = fs.readFileSync(
  path.join(repoRoot, "apps/web/src/features/friends/FriendNatalTab.tsx"),
  "utf8"
);
const friendTransitsTabSource = fs.readFileSync(
  path.join(repoRoot, "apps/web/src/features/friends/FriendTransitsTab.tsx"),
  "utf8"
);
const friendProfileChartRailSource = fs.readFileSync(
  path.join(repoRoot, "apps/web/src/features/friends/FriendProfileChartRail.tsx"),
  "utf8"
);
const relationshipChartFullscreenSource = fs.readFileSync(
  path.join(repoRoot, "apps/web/src/features/friends/RelationshipChartFullscreen.tsx"),
  "utf8"
);
const manualChartFormSource = fs.readFileSync(
  path.join(repoRoot, "apps/web/src/features/friends/manualChartForm.ts"),
  "utf8"
);
const manualChartsControllerSource = fs.readFileSync(
  path.join(repoRoot, "apps/web/src/features/friends/useManualChartsController.ts"),
  "utf8"
);
const relationshipCompareHookSource = fs.readFileSync(
  path.join(repoRoot, "apps/web/src/features/friends/useRelationshipCompare.ts"),
  "utf8"
);
const personalTimingHookSource = fs.readFileSync(
  path.join(repoRoot, "apps/web/src/features/you/usePersonalTiming.ts"),
  "utf8"
);
const tldrAstroApiSource = fs.readFileSync(
  path.join(repoRoot, "apps/web/src/services/tldrastroApi.ts"),
  "utf8"
);
const friendProfileWorkSource = fs.readFileSync(
  path.join(repoRoot, "apps/web/src/features/friends/friendProfileWork.ts"),
  "utf8"
);
const settingsControlsSource = fs.readFileSync(path.join(repoRoot, "apps/web/src/components/SettingsControls.tsx"), "utf8");
const citySearchSource = fs.readFileSync(path.join(repoRoot, "apps/web/src/components/CitySearchField.tsx"), "utf8");
const guestSettingsSource = fs.readFileSync(path.join(repoRoot, "apps/web/src/features/settings/GuestSettingsView.tsx"), "utf8");
const memberSettingsSource = fs.readFileSync(path.join(repoRoot, "apps/web/src/features/settings/MemberSettingsView.tsx"), "utf8");
const accountViewSource = fs.readFileSync(path.join(repoRoot, "apps/web/src/features/account/AccountView.tsx"), "utf8");
const settingsRoutingSource = fs.readFileSync(path.join(repoRoot, "apps/web/src/features/settings/settingsRouting.ts"), "utf8");
const authSource = fs.readFileSync(path.join(repoRoot, "apps/web/src/services/auth.ts"), "utf8");
const phoneAuthSource = fs.readFileSync(path.join(repoRoot, "apps/web/src/services/phoneAuth.ts"), "utf8");
const fallbackRuntimeSource = fs.readFileSync(
  path.join(repoRoot, "apps/web/src/content/fallbackArchitectureV3Runtime.ts"),
  "utf8"
);
const deferredFallbackSource = fs.readFileSync(
  path.join(repoRoot, "apps/web/src/content/fallbackArchitectureV3DeferredBundle.ts"),
  "utf8"
);
const relationshipFallbackSource = fs.readFileSync(
  path.join(repoRoot, "apps/web/src/content/fallbackArchitectureV3RelationshipBundle.ts"),
  "utf8"
);
const emptyHouseFallbackSource = fs.readFileSync(
  path.join(repoRoot, "apps/web/src/content/fallbackArchitectureV3EmptyHouseBundle.ts"),
  "utf8"
);
const deferredSkyPlacementSource = fs.readFileSync(
  path.join(repoRoot, "apps/web/src/content/fallbackArchitectureV3SkyPlacementBundle.ts"),
  "utf8"
);
const appImportIndex = mainSource.indexOf('const appModulePromise = import("./App")');
const styleWaitIndex = mainSource.indexOf('await import("./styles.css")');

assert.ok(appImportIndex >= 0, "Startup must create an App import promise.");
assert.ok(styleWaitIndex >= 0, "Startup must await its reader stylesheet entry.");
assert.ok(appImportIndex < styleWaitIndex, "The App download must start before startup waits for CSS.");
assert.match(
  indexSource,
  /addEventListener\("vite:preloadError"/u,
  "The document bootstrap must recover when a stale deployment preload fails."
);
assert.match(
  indexSource,
  /The calendar needs a fresh load/u,
  "A repeated startup failure must render a visible reload action instead of a blank page."
);
assert.match(
  indexSource,
  /addEventListener\("unhandledrejection"[\s\S]*root"\)\?\.firstElementChild\) recover\(\)/u,
  "The document bootstrap must recover from startup imports that reject before React mounts."
);
assert.match(
  indexSource,
  /sessionStorage\.setItem\(recoveryKey[\s\S]*location\.reload\(\)/u,
  "Startup recovery must retry once before showing its manual reload action."
);
assert.doesNotMatch(mainSource, /setInterval\s*\(/u, "Blank-restore recovery must not keep a lifetime polling interval.");
assert.match(mainSource, /for \(const delay of \[1000, 5000, 15000\]\)/u, "Startup must keep bounded blank-mount checks.");
assert.match(viteSource, /fallback-content-core/u, "Core fallback content must have a stable cache chunk.");
assert.match(viteSource, /fallback-content-relationships/u, "Relationship fallback content must have a stable cache chunk.");
assert.match(viteSource, /fallback-content-transit/u, "Transit fallback content must have a stable cache chunk.");
assert.match(viteSource, /fallback-content-sky/u, "Sky fallback content must have a stable cache chunk.");
assert.match(viteSource, /fallback-content-sky-core/u, "The eager Sky source partition must have a stable cache chunk.");
assert.match(viteSource, /fallback-content-deferred-core/u, "The deferred natal and relationship source partition must have a stable cache chunk.");
assert.match(viteSource, /fallback-content-empty-house/u, "Empty-house content must have a stable on-demand cache chunk.");
assert.match(viteSource, /fallback-content-sky-placement/u, "The on-demand Sky Placement source partition must have a stable cache chunk.");
assert.match(viteSource, /fallback-content-lunation-book/u, "The on-demand protected lunation book must have a stable cache chunk.");
assert.match(
  viteSource,
  /tldr-trim-swiss-ephemeris-web-data/u,
  "The browser build must trim unused Swiss Ephemeris catalogs from its on-demand data package."
);
assert.match(
  viteSource,
  /remote_package_size:2017967/u,
  "The browser Swiss Ephemeris loader must pin the generated data-package size."
);
assert.equal(
  webSwissEphemerisData.byteLength,
  2_017_967,
  "The browser Swiss Ephemeris data package must retain only the calculation files used by the app."
);
assert.doesNotMatch(
  ephemerisSource,
  /\.fixstar(?:2)?(?:_ut|_mag)?\s*\(/u,
  "The trimmed browser data package is invalid if the app begins calling Swiss fixed-star catalogs."
);
assert.match(viteSource, /phone-auth/u, "Phone metadata must have a stable deferred cache chunk.");
assert.doesNotMatch(phoneAuthSource, /libphonenumber-js/u, "Reader boot phone helpers must not import global phone metadata.");
assert.match(
  authSource,
  /import\("\.\/phoneAuthValidation"\)/u,
  "Strict phone validation must load only when a phone auth action begins."
);
assert.match(
  fallbackRuntimeSource,
  /import\("\.\/fallbackArchitectureV3DeferredBundle"\)/u,
  "Transit content must remain behind a dynamic runtime boundary."
);
assert.match(
  fallbackRuntimeSource,
  /import\("\.\/fallbackArchitectureV3RelationshipBundle"\)/u,
  "Relationship content must remain behind its own dynamic runtime boundary."
);
assert.match(
  fallbackRuntimeSource,
  /import\("\.\/fallbackArchitectureV3SkyPlacementBundle"\)/u,
  "Sky Placement article content must remain behind a dynamic runtime boundary."
);
assert.match(
  fallbackRuntimeSource,
  /import\("\.\/fallbackArchitectureV3EmptyHouseBundle"\)/u,
  "Empty-house natal content must remain behind a dynamic runtime boundary."
);
assert.doesNotMatch(
  fallbackRuntimeSource,
  /^import .*source-rows\/sky-(?:planet-frames|placement-inventories|sign-copy).*\.json/mu,
  "Long-form Sky Placement rows must not re-enter the eager reader runtime."
);
assert.match(
  deferredSkyPlacementSource,
  /bundled-sky-placement-rows-v3\.json/u,
  "The Sky Placement route partition must use its generated package slice."
);
assert.match(
  deferredSkyPlacementSource,
  /bundled-sky-placement-house-rows-v3\.json/u,
  "Sky Placement house horoscopes must remain in their on-demand package slice."
);
assert.match(
  emptyHouseFallbackSource,
  /bundled-empty-house-rows-v3\.json/u,
  "The Empty House route partition must use its generated package slice."
);
assert.doesNotMatch(
  fallbackRuntimeSource,
  /source-rows\/fallback-source-rows-v3\.json/u,
  "The canonical all-domain source snapshot must not re-enter the reader runtime."
);
assert.doesNotMatch(
  deferredFallbackSource,
  /source-rows\/fallback-source-rows-v3\.json/u,
  "The deferred runtime must use the generated complementary partition instead of duplicating the canonical snapshot."
);
assert.doesNotMatch(
  deferredFallbackSource,
  /transit-synastry-rows-v1\.json/u,
  "The transit runtime must use its generated authored-card partition instead of importing the complete relationship source."
);
assert.match(
  relationshipFallbackSource,
  /bundled-relationship-authored-cards-v3\.json/u,
  "The relationship runtime must use the generated compatibility partition."
);
assert.doesNotMatch(
  fallbackRuntimeSource,
  /^import .*bundled-manifest-v3\.json/mu,
  "The full package key list must not be a static reader dependency."
);
assert.match(
  fallbackRuntimeSource,
  /import\("\.\/fallbackArchitectureV3\/bundled-manifest-v3\.json"\)/u,
  "The full package key list must remain available to dashboard validation on demand."
);
assert.doesNotMatch(
  readerStylesSource,
  /lunar-calendar\.css/u,
  "Calendar-only CSS must not remain in the reader startup stylesheet."
);
assert.match(
  readerStylesSource,
  /styles\/responsive\.css/u,
  "Responsive rules must load from the deterministic reader stylesheet entry."
);
assert.match(
  readerStylesSource,
  /styles\/card-systems\.css/u,
  "Shared card rules must load from the deterministic reader stylesheet entry."
);
assert.match(
  calendarRouteSource,
  /import "\.\.\/styles\/lunar-calendar\.css";/u,
  "The lazy Calendar route must own its stylesheet."
);
assert.doesNotMatch(
  readerStylesSource,
  /friends-route\.css/u,
  "Friends-only CSS must not remain in the reader startup stylesheet."
);
assert.doesNotMatch(
  readerStylesSource,
  /friends-compare-picker\.css/u,
  "Friends comparison CSS must not remain in the reader startup stylesheet."
);
assert.match(
  friendsRouteSource,
  /import "\.\.\/styles\/friends-route\.css";/u,
  "The lazy Friends route must own its production layout stylesheet."
);
assert.match(
  friendsRouteSource,
  /import "\.\.\/styles\/friends-compare-picker\.css";/u,
  "The lazy Friends route must own its comparison picker stylesheet."
);
assert.doesNotMatch(
  appSource,
  /import\s+\{[^}]*(?:FriendsPageShell|SegmentedControl|AspectGiftLessonGroup)[^}]*\}\s+from\s+"\.\/components/u,
  "Friends-only shell renderers must not remain static application-shell dependencies."
);
assert.match(
  appSource,
  /const loadManualChartsPanel = \(\) => import\("\.\/features\/friends\/ManualChartsPanel"\)[\s\S]*const ManualChartsPanel = lazy\(\(\) =>/u,
  "Friends orchestration must load only when its route renders."
);
assert.match(
  manualChartsPanelSource,
  /const FriendsWorkspaceShell = lazy\(\(\) =>\s*import\("\.\/FriendsWorkspaceShell"\)/u,
  "The Friends workspace shell must remain inside the deferred orchestration boundary."
);
assert.match(
  friendsWorkspaceShellSource,
  /import \{[\s\S]*FriendsPageShell[\s\S]*from "\.\.\/\.\.\/components\/FriendsPageShell";[\s\S]*FriendChartsList[\s\S]*SocialFriendsPanel/u,
  "The deferred Friends workspace must own the landing shell, social panel, and chart list."
);
assert.match(
  manualChartsPanelSource,
  /const loadFriendDetailModule = \(\) => import\("\.\/FriendDetail"\);[\s\S]*const FriendProfileChartRail = lazy\(\(\) =>\s*loadFriendDetailModule\(\)/u,
  "The Friends profile chart rail must share the deferred Friend Detail boundary."
);
assert.match(
  friendProfileChartRailSource,
  /import \{ FriendNatalViewControl/u,
  "The deferred profile chart rail must own its segmented control."
);
assert.match(
  appSource,
  /lazy\(\(\)\s*=>\s*\n?\s*import\("\.\/components\/charts\/AspectGiftLessonGroup"\)/u,
  "The Friends aspect grouping renderer must load only when its route renders."
);
assert.match(
  friendsPageShellSource,
  /export function FriendsPageShell/u,
  "The deferred Friends shell module must own its renderer."
);
assert.doesNotMatch(
  friendsStylesSource,
  /\.social-(?:friends-panel|finder-card|people-list|person-row|friend-row|invite-form|search-skeleton)\b/u,
  "Retired social-card selectors must not return to the eager Friends/profile stylesheet."
);
assert.doesNotMatch(
  friendsStylesSource,
  /(?:^|\n)\.friend-detail-page\s*\{/u,
  "Friends detail layout CSS must not remain in the eager Friends/profile stylesheet."
);
assert.match(
  friendDetailSource,
  /import "\.\.\/\.\.\/styles\/friends-detail\.css";/u,
  "The lazy FriendDetail component must own its layout stylesheet."
);
assert.doesNotMatch(
  appSource,
  /import\s+\{[^}]*\bCompatibilityTab\b[^}]*\}\s+from\s+"\.\/features\/friends\/CompatibilityTab"/u,
  "CompatibilityTab must not remain a static application-shell dependency."
);
assert.match(
  manualChartsPanelSource,
  /const loadCompatibilityTab = \(\) =>\s*import\("\.\/CompatibilityTab"\)[\s\S]*const CompatibilityTab = lazy\(loadCompatibilityTab\);/u,
  "CompatibilityTab must load only when its Friends profile surface renders."
);
assert.match(
  appSource,
  /<ManualChartsPanel[\s\S]*profileNatalCalculationStatus=\{profileNatalCalculationStatus\}/u,
  "Friends orchestration must expose profile-calculation state to its relationship loading UI."
);
assert.match(
  manualChartsPanelSource,
  /role="status"[\s\S]*Loading compatibility…/u,
  "Compatibility must present a visible status while the comparison chart is still calculating."
);
assert.doesNotMatch(
  appSource,
  /BlockedAccountsSettings/u,
  "Blocked account rendering must not remain in the application shell."
);
assert.match(
  memberSettingsSource,
  /lazy\(\(\)\s*=>\s*\n?\s*import\("\.\/BlockedAccountsSettings"\)/u,
  "BlockedAccountsSettings must load only when its nested Settings page renders."
);
assert.doesNotMatch(
  appSource,
  /(?:AppearanceToggle|HouseSignLabelToggle|SwitchControl|CalculationMethodSettingsGroup)/u,
  "Settings-only controls must not remain static application-shell dependencies."
);
assert.doesNotMatch(
  appSource,
  /function (?:GuestSettingsView|SettingsView|MemberSettingsView)/u,
  "Settings page implementations must not remain in the application shell."
);
assert.match(
  appSource,
  /lazy\(\(\)\s*=>\s*\n?\s*import\("\.\/features\/settings\/GuestSettingsView"\)/u,
  "The guest Settings page must load only when its route renders."
);
assert.match(
  appSource,
  /lazy\(\(\)\s*=>\s*\n?\s*import\("\.\/features\/settings\/MemberSettingsView"\)/u,
  "The member Settings page must load only when its route renders."
);
assert.match(
  settingsControlsSource,
  /export function CalculationMethodSettingsGroup/u,
  "The deferred Settings controls module must own calculation-method presentation."
);
assert.match(
  guestSettingsSource,
  /export function GuestSettingsView/u,
  "The deferred Settings module must own the guest page renderer."
);
assert.match(
  memberSettingsSource,
  /export function MemberSettingsView/u,
  "The deferred Settings module must own the member page renderer."
);
assert.doesNotMatch(
  appSource,
  /function AccountView/u,
  "Account state and presentation must not remain embedded in the application shell."
);
assert.match(
  appSource,
  /const AccountView = lazy\(\(\)\s*=>\s*\n?\s*import\("\.\/features\/settings\/MemberSettingsView"\)/u,
  "The Account page must share the deferred authenticated Settings boundary."
);
assert.match(
  accountViewSource,
  /export function AccountView/u,
  "The deferred Account module must own account state and presentation."
);
assert.doesNotMatch(
  profileViewSource,
  /id="wheel-(?:natal|updates-transits)"/u,
  "ProfileView must pass chart data instead of owning You-page wheel presentation."
);
assert.match(
  youPageSource,
  /id="wheel-natal"[\s\S]*id="wheel-updates-transits"/u,
  "The deferred You page must own natal and transit wheel presentation."
);
assert.ok(natalSkyEffectStart >= 0 && natalSkyEffectEnd > natalSkyEffectStart, "The natal-sky effect must remain inspectable.");
assert.doesNotMatch(
  natalSkyEffectSource,
  /userProfile\?\.(?:sun|moon|rising),/u,
  "Derived Big Three updates must not retrigger the natal ephemeris calculation."
);
assert.match(
  appSource,
  /profileNatalSkyRequestRef = useRef<\{ key: string; request: Promise<SkySnapshot> \} \| null>\(null\)/u,
  "Natal ephemeris calculations must retain an in-flight or resolved request for the same birth inputs."
);
assert.match(
  natalSkyEffectSource,
  /profileNatalSkyRequestRef\.current\?\.key === natalSkyRequestKey[\s\S]*profileNatalSkyRequestRef\.current = \{ key: natalSkyRequestKey, request: natalSkyRequest \}/u,
  "Repeated effect runs must reuse the natal ephemeris request when birth inputs are unchanged."
);
assert.match(
  natalSkyEffectSource,
  /userProfile\?\.charts\[0\]\?\.birthDate,[\s\S]*userProfile\?\.charts\[0\]\?\.birthTime,[\s\S]*userProfile\?\.charts\[0\]\?\.birthLocation\?\.latitude,[\s\S]*userProfile\?\.charts\[0\]\?\.birthLocation\?\.longitude,[\s\S]*userProfile\?\.charts\[0\]\?\.birthLocation\?\.timeZone,/u,
  "Birth date, time, and location must continue to retrigger the natal ephemeris calculation."
);
assert.match(
  profileViewSource,
  /const weeklyAssemblyFrame = window\.requestAnimationFrame\(\(\) => \{[\s\S]*weeklyAssemblyTimer = window\.setTimeout\(\(\) => \{[\s\S]*void buildWeeklyHoroscope\(\{[\s\S]*if \(!cancelled\) setWeeklyHoroscopeAssembly\(assembly\);[\s\S]*\}, 0\);[\s\S]*window\.cancelAnimationFrame\(weeklyAssemblyFrame\);[\s\S]*window\.clearTimeout\(weeklyAssemblyTimer\);/u,
  "Weekly horoscope assembly must yield a browser paint, then start and ignore results after navigation."
);
assert.doesNotMatch(
  profileViewSource,
  /\}, 1_000\);/u,
  "The Horoscope tab must not add an artificial one-second delay before assembly starts."
);
assert.doesNotMatch(
  appSource,
  /\}, \[location, mode, skyDate, skyRefreshKey\]\);/u,
  "Switching app sections must not restart the same current-sky calculation."
);
assert.match(
  appSource,
  /getAstrodienstSky\(skyLocation, selectedDateTime\)[\s\S]*requestAnimationFrame[\s\S]*getAstrodienstSky\(skyLocation, selectedDateTime, \{ includeTransitWindows: true \}\)/u,
  "Core sky data must paint before expensive transit-window enrichment starts."
);
assert.doesNotMatch(
  appSource,
  /function (?:CitySearchField|CitySuggestions)/u,
  "Shared city-search renderers must not be embedded in the application shell."
);
assert.match(citySearchSource, /export function CitySearchField/u, "The shared city-search module must own its field renderer.");
assert.match(citySearchSource, /export function CitySuggestions/u, "The shared city-search module must own suggestion rendering.");
assert.doesNotMatch(
  appSource,
  /function (?:settingsSubpageFromUrl|updateSettingsSubpageUrl)/u,
  "Nested Settings routing must not be embedded in the application shell."
);
assert.match(settingsRoutingSource, /export function settingsSubpageFromHref/u, "Settings routing must expose a testable href parser.");
assert.doesNotMatch(
  appSource,
  /import\s+\{[^}]*(?:NatalAspectPatternsSection|NatalAspectPatternActivationsSection)[^}]*\}\s+from\s+"\.\/features\/you\/NatalAspectPatternsSection"/u,
  "Natal aspect-pattern rendering must not remain a static application-shell dependency."
);
assert.equal(
  [...appSource.matchAll(/import\("\.\/features\/you\/NatalAspectPatternsSection"\)/gu)].length,
  2,
  "Both natal aspect-pattern surfaces must load through their lazy feature boundary."
);
assert.doesNotMatch(
  appSource,
  /import\s+\{[^}]*\bNatalChartDataTable\b[^}]*\}\s+from\s+"\.\/components\/charts\/NatalChartDataTable"/u,
  "The natal chart data table must not remain a static application-shell dependency."
);
assert.match(
  friendProfileChartRailSource,
  /import \{ NatalChartDataTable \}/u,
  "The deferred profile chart rail must own its natal table renderer."
);
assert.doesNotMatch(
  appSource,
  /import\s+\{[^}]*\bSynastryWheel\b[^}]*\}\s+from\s+"\.\/components\/charts\/Wheels"/u,
  "The Friends-only synastry wheel must not remain a static application-shell dependency."
);
assert.match(
  relationshipChartFullscreenSource,
  /import \{ SynastryWheel \}/u,
  "The interaction-only fullscreen module must own its synastry wheel."
);
assert.doesNotMatch(
  wheelSource,
  /export const SynastryWheel/u,
  "The eager Sky wheel module must not contain the relationship renderer."
);
assert.match(
  synastryWheelSource,
  /export const SynastryWheel/u,
  "The deferred relationship module must own the synastry renderer."
);
assert.doesNotMatch(
  appSource,
  /import\s+\{[^}]*(?:FriendPlacementTable|SynastryPlacementsComparison)[^}]*\}\s+from\s+"\.\/components\/charts\/PlacementRows"/u,
  "Friends-only placement tables must not remain static application-shell dependencies."
);
assert.equal(
  [...appSource.matchAll(/import\("\.\/features\/friends\/FriendPlacementTables"\)/gu)].length,
  0,
  "Friends placement tables must load through their owning deferred tabs."
);
assert.doesNotMatch(
  placementRowsSource,
  /export function (?:FriendPlacementTable|SynastryPlacementsComparison)/u,
  "The eager shared placement module must not contain Friends-only renderers."
);
assert.match(
  friendPlacementTablesSource,
  /export function FriendPlacementTable/u,
  "The deferred Friends module must own the friend placement table."
);
assert.match(
  friendPlacementTablesSource,
  /export function SynastryPlacementsComparison/u,
  "The deferred Friends module must own the synastry placement comparison."
);
assert.match(
  manualChartsPanelSource,
  /const FriendSynastryTab = lazy\(loadFriendSynastryTab\)/u,
  "Synastry presentation must load only when its Friends tab renders."
);
assert.match(
  friendSynastryTabSource,
  /import \{ SynastryPlacementsComparison \}/u,
  "The deferred Synastry tab must own its placement comparison."
);
assert.match(
  manualChartsPanelSource,
  /const FriendNatalTab = lazy\(loadFriendNatalTab\)/u,
  "Natal presentation must load only when its Friends tab renders."
);
assert.match(
  friendNatalTabSource,
  /import \{ FriendPlacementTable \}/u,
  "The deferred Natal tab must own its placement table."
);
assert.match(
  manualChartsPanelSource,
  /const FriendTransitsTab = lazy\(loadFriendTransitsTab\)/u,
  "Transit presentation must load only when its Friends tab renders."
);
assert.match(
  friendTransitsTabSource,
  /export function FriendTransitsTab/u,
  "The deferred Friends module must own transit presentation."
);
assert.doesNotMatch(
  manualChartsPanelSource,
  /friend-detail-chart-rail chart-layout__visual/u,
  "Friends chart-rail presentation must not remain embedded in ManualChartsPanel."
);
assert.match(
  friendProfileChartRailSource,
  /export function FriendProfileChartRail/u,
  "The deferred Friends module must own chart-rail presentation."
);
assert.match(
  manualChartsPanelSource,
  /const FriendProfileChartFullscreen = lazy\(\(\)\s*=>\s*\n?\s*import\("\.\/RelationshipChartFullscreen"\)/u,
  "Fullscreen relationship charts must load only when opened."
);
assert.match(
  relationshipChartFullscreenSource,
  /export function FriendProfileChartFullscreen/u,
  "The deferred fullscreen module must own relationship chart composition."
);
assert.doesNotMatch(
  appSource,
  /function RelationshipApiSummary/u,
  "Relationship API presentation must not remain in the application shell."
);
assert.match(
  manualChartsPanelSource,
  /const FriendCompositeTab = lazy\(loadFriendCompositeTab\)/u,
  "Composite presentation must load only when its Friends tab renders."
);
assert.match(
  relationshipApiSummarySource,
  /export function RelationshipApiSummary/u,
  "The deferred Friends module must own relationship API presentation."
);
assert.doesNotMatch(
  appSource,
  /import\("\.\/features\/friends\/RelationshipApiSummary"\)/u,
  "The relationship summary must load through the Composite tab boundary."
);
assert.match(
  friendCompositeTabSource,
  /import \{ RelationshipApiSummary/u,
  "The deferred Composite tab must own its relationship summary."
);
assert.doesNotMatch(
  appSource,
  /const chartFormCopy/u,
  "Friends chart-form copy must not remain owned by the application shell."
);
assert.match(
  manualChartFormSource,
  /export const manualChartFormCopy/u,
  "The Friends form model must own its chart-type copy."
);
assert.match(
  manualChartsPanelSource,
  /useManualChartsController\(\{/u,
  "ManualChartsPanel must delegate chart loading and persistence to its focused controller hook."
);
assert.match(
  manualChartsControllerSource,
  /export function useManualChartsController/u,
  "The Friends controller hook must own manual-chart loading and persistence."
);
assert.doesNotMatch(
  manualChartsPanelSource,
  /listManualCharts\(chartOwnerUserId\)|const chartsToRepair = charts\.filter/u,
  "ManualChartsPanel must not re-embed chart loading or repair orchestration."
);
assert.match(
  manualChartsPanelSource,
  /useRelationshipCompare\(\{/u,
  "ManualChartsPanel must delegate relationship request state to its focused hook."
);
assert.match(
  relationshipCompareHookSource,
  /export function useRelationshipCompare[\s\S]*compareRelationship\([\s\S]*controller\.abort\(\)/u,
  "The relationship comparison hook must own request state and cancellation."
);
assert.match(
  appSource,
  /usePersonalTiming\(\{/u,
  "The application shell must delegate personal-timing request state to its focused hook."
);
assert.doesNotMatch(
  appSource,
  /setPersonalTimingStatus|getPersonalTiming\(\{/u,
  "The application shell must not re-embed personal-timing request state or cancellation."
);
assert.match(
  tldrAstroApiSource,
  /export function getPersonalTiming\([\s\S]*options\?: TldrAstroRequestOptions[\s\S]*postTldrAstro<PersonalTimingResponse>\("\/timing\/personal", request, options\)/u,
  "Personal-timing API requests must accept cancellation options."
);
assert.match(
  personalTimingHookSource,
  /export function usePersonalTiming[\s\S]*const controller = new AbortController\(\);[\s\S]*getPersonalTiming\([\s\S]*signal: controller\.signal[\s\S]*controller\.abort\(\)/u,
  "Leaving profile timing or changing its inputs must abort obsolete API work."
);
assert.match(
  manualChartsPanelSource,
  /if \(!friendProfileWork\.synastryContacts/u,
  "Inactive Friends tabs must skip synastry contact calculation."
);
assert.match(
  manualChartsPanelSource,
  /friendProfileWork\.composite && selectedChart/u,
  "Composite chart calculation must remain scoped to its active Friends tab."
);
assert.match(
  manualChartsPanelSource,
  /friendProfileWork\.transits && currentSky && selectedChart && selectedFriendReadyNatalChart && !selectedChartIsEvent/u,
  "Friends transit calculation must remain scoped to its active tab."
);
assert.match(
  manualChartsPanelSource,
  /friendProfileWork\.natal && selectedFriendReadyNatalChart/u,
  "Friends natal row calculation must remain scoped to its active tab."
);
assert.match(
  manualChartsPanelSource,
  /const chartSettings = useMemo\(\(\) => normalizeChartSettings\(profile\.settings\), \[profile\.settings\]\)/u,
  "Friends calculation dependencies must reuse normalized chart settings across renders."
);
assert.match(
  friendProfileWorkSource,
  /export function friendProfileWorkForTab/u,
  "Friends tab calculation policy must remain independently testable."
);
assert.doesNotMatch(
  appSource,
  /function completeNatalChartTableRows/u,
  "Shared natal table data assembly must not remain owned by the application shell."
);
assert.match(
  natalChartTableRowsSource,
  /export function completeNatalChartTableRows/u,
  "The chart data module must own empty-house completion and row sorting."
);
assert.doesNotMatch(
  friendsStylesSource,
  /(?:^|\n)\.relationship-explainer-card\s*\{/u,
  "Relationship explainer CSS must not remain in the eager Friends/profile stylesheet."
);
assert.match(
  friendDetailStylesSource,
  /(?:^|\n)\.relationship-explainer-card\s*\{/u,
  "The lazy FriendDetail stylesheet must own relationship explainer CSS."
);
assert.match(
  friendDetailStylesSource,
  /@media \(max-width: 800px\)[\s\S]*\.app-shell\.mode-friends \.friend-profile-panel\.friend-chart-page[\s\S]*grid-template-columns: minmax\(0, 1fr\)/u,
  "The lazy FriendDetail stylesheet must preserve the mobile one-column layout after its CSS chunk loads."
);
assert.doesNotMatch(
  friendsStylesSource,
  /(?:^|\n)\.friend-chart-legend\s*\{/u,
  "Synastry legend and placement CSS must not remain in the eager Friends/profile stylesheet."
);
assert.match(
  friendDetailStylesSource,
  /(?:^|\n)\.friend-chart-legend\s*\{/u,
  "The lazy FriendDetail stylesheet must own synastry legend and placement CSS."
);
assert.doesNotMatch(
  friendsStylesSource,
  /(?:^|\n)\.friend-placement-column\s*\{/u,
  "Friends placement and aspect-row CSS must not remain in the eager Friends/profile stylesheet."
);
assert.match(
  friendDetailStylesSource,
  /(?:^|\n)\.friend-placement-column\s*\{/u,
  "The lazy FriendDetail stylesheet must own Friends placement and aspect-row CSS."
);
assert.doesNotMatch(
  friendsStylesSource,
  /(?:^|\n)\.add-chart-field,/u,
  "Add/edit chart field CSS must not remain in the eager Friends/profile stylesheet."
);
assert.match(
  friendChartModalSource,
  /import "\.\.\/\.\.\/styles\/friends-chart-modal\.css";/u,
  "The lazy FriendChartModal component must own its form-control stylesheet."
);
assert.match(
  friendChartModalStylesSource,
  /(?:^|\n)\.add-chart-field,/u,
  "The lazy FriendChartModal stylesheet must contain add/edit chart field CSS."
);
assert.doesNotMatch(
  fallbackRuntimeSource,
  /function createApp(?:Transit|Fallback)Renderer\([^)]*\) \{\s*const readerBundle = readerEligibleBundle/u,
  "Pre-filtered reader bundles must not be filtered again while constructing startup renderers."
);
assert.match(
  appSource,
  /const SignupView = lazy\(\(\) =>\s*import\("\.\/features\/auth\/SignupView"\)/u,
  "Signup and login presentation must stay behind a lazy application boundary."
);
assert.match(
  appSource,
  /const SkyDetailArticle = lazy\(\(\) =>\s*import\("\.\/features\/sky\/SkyDetailArticle"\)/u,
  "Sky detail article presentation must load only when a reader opens an article."
);
assert.doesNotMatch(
  appSource,
  /function SkyDetailArticle/u,
  "Sky detail article presentation must not remain embedded in the startup App module."
);
assert.match(
  skyDetailArticleSource,
  /export function SkyDetailArticle[\s\S]*article-related-aspects/u,
  "The deferred Sky detail module must retain article and related-aspect presentation."
);
assert.doesNotMatch(
  appSource,
  /function SignupView|signInWithEmail|signUpWithEmail|isPhoneAuthEnabled/u,
  "Signup forms and authentication provider code must not remain in the startup App module."
);
assert.match(
  signupViewSource,
  /export function SignupView[\s\S]*signInWithEmail[\s\S]*signUpWithEmail[\s\S]*Continue with Google/u,
  "The lazy signup module must retain email and provider authentication behavior."
);
assert.match(
  appSource,
  /const loadFriendsExperience = \(\) => Promise\.all\(\[\s*import\("\.\/routes\/FriendsRoute"\),\s*loadManualChartsPanel\(\)[\s\S]*const FriendsRoute = lazy\(\(\) =>\s*loadFriendsExperience\(\)/u,
  "The Friends route and orchestration module must load in parallel instead of forming a lazy-module waterfall."
);
assert.equal(
  appSource.match(/onPointerEnter=\{preloadFriendsExperience\}/gu)?.length,
  2,
  "Both Friends navigation entries must preload the deferred route on pointer intent."
);
assert.equal(
  appSource.match(/onFocus=\{preloadFriendsExperience\}/gu)?.length,
  2,
  "Both Friends navigation entries must preload the deferred route for keyboard users."
);
assert.doesNotMatch(
  appSource,
  /function (?:apiSubjectFromManualChart|buildFriendChartListItems|buildRelationshipComparisonOptions|groupFriendNatalAspects|isSocialBigThreeRow|manualChartBigThree|manualChartSubtitle|planetPositionFromSocialRow)/u,
  "Friends-only chart normalization and view-model assembly must not remain embedded in the startup App module."
);
assert.match(
  friendChartModelSource,
  /export function isSocialBigThreeRow[\s\S]*export function planetPositionFromSocialRow[\s\S]*export function manualChartSubtitle[\s\S]*export function manualChartBigThree[\s\S]*export function buildFriendChartListItems[\s\S]*export function buildRelationshipComparisonOptions[\s\S]*export function apiSubjectFromManualChart[\s\S]*export function groupFriendNatalAspects/u,
  "The Friends chart model must own placement normalization, chart-list and comparison view models, API subjects, and natal aspect grouping."
);
assert.doesNotMatch(
  appSource,
  /function (?:apiSettingsFromChartSettings|apiSubjectFromUserChart|validChartBirthDate|validChartBirthTime)/u,
  "Shared chart validation and API subject mapping must not remain embedded in the startup App module."
);
assert.match(
  chartProfileSource,
  /export function validChartBirthDate[\s\S]*export function validChartBirthTime[\s\S]*export function apiSettingsFromChartSettings[\s\S]*export function apiSubjectFromUserChart/u,
  "The chart-profile service must own reusable birth-data validation and API subject mapping."
);
assert.doesNotMatch(
  appSource,
  /function compactCityLabel/u,
  "Reusable location-label formatting must not remain embedded in the startup App module."
);
assert.match(
  locationLabelsSource,
  /export function compactCityLabel/u,
  "The location-label utility must own compact city formatting."
);

console.log("App startup performance contracts passed.");
