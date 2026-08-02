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
const manualChartsPanelSource = appSource.slice(appSource.indexOf("function ManualChartsPanel"));
const profileViewSource = appSource.slice(appSource.indexOf("function ProfileView"), appSource.indexOf("function ManualChartsPanel"));
const mainSource = fs.readFileSync(path.join(repoRoot, "apps/web/src/main.tsx"), "utf8");
const viteSource = fs.readFileSync(path.join(repoRoot, "apps/web/vite.config.ts"), "utf8");
const readerStylesSource = fs.readFileSync(path.join(repoRoot, "apps/web/src/styles.css"), "utf8");
const friendsStylesSource = fs.readFileSync(path.join(repoRoot, "apps/web/src/styles/friends.css"), "utf8");
const friendDetailStylesSource = fs.readFileSync(path.join(repoRoot, "apps/web/src/styles/friends-detail.css"), "utf8");
const friendChartModalStylesSource = fs.readFileSync(path.join(repoRoot, "apps/web/src/styles/friends-chart-modal.css"), "utf8");
const calendarRouteSource = fs.readFileSync(path.join(repoRoot, "apps/web/src/routes/CalendarRoute.tsx"), "utf8");
const friendsRouteSource = fs.readFileSync(path.join(repoRoot, "apps/web/src/routes/FriendsRoute.tsx"), "utf8");
const friendDetailSource = fs.readFileSync(path.join(repoRoot, "apps/web/src/features/friends/FriendDetail.tsx"), "utf8");
const youPageSource = fs.readFileSync(path.join(repoRoot, "apps/web/src/features/you/YouPage.tsx"), "utf8");
const friendsPageShellSource = fs.readFileSync(path.join(repoRoot, "apps/web/src/components/FriendsPageShell.tsx"), "utf8");
const friendsWorkspaceShellSource = fs.readFileSync(
  path.join(repoRoot, "apps/web/src/features/friends/FriendsWorkspaceShell.tsx"),
  "utf8"
);
const friendChartModelSource = fs.readFileSync(
  path.join(repoRoot, "apps/web/src/features/friends/friendChartModel.ts"),
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
const appImportIndex = mainSource.indexOf('const appModulePromise = import("./App")');
const styleWaitIndex = mainSource.indexOf("await Promise.all([");

assert.ok(appImportIndex >= 0, "Startup must create an App import promise.");
assert.ok(styleWaitIndex >= 0, "Startup must await its stylesheet group.");
assert.ok(appImportIndex < styleWaitIndex, "The App download must start before startup waits for CSS.");
assert.doesNotMatch(mainSource, /setInterval\s*\(/u, "Blank-restore recovery must not keep a lifetime polling interval.");
assert.match(mainSource, /for \(const delay of \[1000, 5000, 15000\]\)/u, "Startup must keep bounded blank-mount checks.");
assert.match(viteSource, /fallback-content-core/u, "Core fallback content must have a stable cache chunk.");
assert.match(viteSource, /fallback-content-relationships/u, "Relationship fallback content must have a stable cache chunk.");
assert.match(viteSource, /fallback-content-sky/u, "Sky fallback content must have a stable cache chunk.");
assert.match(viteSource, /fallback-content-sky-core/u, "The eager Sky source partition must have a stable cache chunk.");
assert.match(viteSource, /fallback-content-deferred-core/u, "The deferred natal and relationship source partition must have a stable cache chunk.");
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
  "Transit and relationship content must remain behind a dynamic runtime boundary."
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
  /const loadFriendsWorkspaceShell = \(\) => import\("\.\/features\/friends\/FriendsWorkspaceShell"\)[\s\S]*const FriendsWorkspaceShell = lazy\(\(\) =>\s*loadFriendsWorkspaceShell\(\)/u,
  "The Friends workspace shell must load only when its route renders."
);
assert.match(
  friendsWorkspaceShellSource,
  /import \{[\s\S]*FriendsPageShell[\s\S]*from "\.\.\/\.\.\/components\/FriendsPageShell";[\s\S]*FriendChartsList[\s\S]*SocialFriendsPanel/u,
  "The deferred Friends workspace must own the landing shell, social panel, and chart list."
);
assert.match(
  appSource,
  /const FriendProfileChartRail = lazy\(\(\)\s*=>\s*\n?\s*import\("\.\/features\/friends\/FriendDetail"\)/u,
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
  appSource,
  /lazy\(\(\)\s*=>\s*\n?\s*import\("\.\/features\/friends\/CompatibilityTab"\)/u,
  "CompatibilityTab must load only when its Friends profile surface renders."
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
  appSource,
  /lazy\(\(\)\s*=>\s*\n?\s*import\("\.\/features\/friends\/FriendSynastryTab"\)/u,
  "Synastry presentation must load only when its Friends tab renders."
);
assert.match(
  friendSynastryTabSource,
  /import \{ SynastryPlacementsComparison \}/u,
  "The deferred Synastry tab must own its placement comparison."
);
assert.match(
  appSource,
  /lazy\(\(\)\s*=>\s*\n?\s*import\("\.\/features\/friends\/FriendNatalTab"\)/u,
  "Natal presentation must load only when its Friends tab renders."
);
assert.match(
  friendNatalTabSource,
  /import \{ FriendPlacementTable \}/u,
  "The deferred Natal tab must own its placement table."
);
assert.match(
  appSource,
  /lazy\(\(\)\s*=>\s*\n?\s*import\("\.\/features\/friends\/FriendTransitsTab"\)/u,
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
  appSource,
  /const FriendProfileChartFullscreen = lazy\(\(\)\s*=>\s*\n?\s*import\("\.\/features\/friends\/RelationshipChartFullscreen"\)/u,
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
  appSource,
  /lazy\(\(\)\s*=>\s*\n?\s*import\("\.\/features\/friends\/FriendCompositeTab"\)/u,
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
  appSource,
  /if \(!friendProfileWork\.synastryContacts/u,
  "Inactive Friends tabs must skip synastry contact calculation."
);
assert.match(
  appSource,
  /friendProfileWork\.composite && selectedChart/u,
  "Composite chart calculation must remain scoped to its active Friends tab."
);
assert.match(
  appSource,
  /friendProfileWork\.transits && currentSky && selectedChart && !selectedChartIsEvent/u,
  "Friends transit calculation must remain scoped to its active tab."
);
assert.match(
  appSource,
  /friendProfileWork\.natal && selectedChart\?\.natalChart/u,
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
  /const loadFriendsExperience = \(\) => Promise\.all\(\[\s*import\("\.\/routes\/FriendsRoute"\),\s*loadFriendsWorkspaceShell\(\)[\s\S]*const FriendsRoute = lazy\(\(\) =>\s*loadFriendsExperience\(\)/u,
  "The Friends route and consolidated landing workspace must load in parallel instead of forming a lazy-module waterfall."
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
  /function (?:isSocialBigThreeRow|manualChartSubtitle|planetPositionFromSocialRow)/u,
  "Friends-only chart normalization must not remain embedded in the startup App module."
);
assert.match(
  friendChartModelSource,
  /export function isSocialBigThreeRow[\s\S]*export function planetPositionFromSocialRow[\s\S]*export function manualChartSubtitle/u,
  "The Friends chart model must own social-placement normalization and chart-list subtitles."
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
