#!/usr/bin/env node

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const appSource = fs.readFileSync(path.join(repoRoot, "apps/web/src/App.tsx"), "utf8");
const mainSource = fs.readFileSync(path.join(repoRoot, "apps/web/src/main.tsx"), "utf8");
const viteSource = fs.readFileSync(path.join(repoRoot, "apps/web/vite.config.ts"), "utf8");
const readerStylesSource = fs.readFileSync(path.join(repoRoot, "apps/web/src/styles.css"), "utf8");
const friendsStylesSource = fs.readFileSync(path.join(repoRoot, "apps/web/src/styles/friends.css"), "utf8");
const friendDetailStylesSource = fs.readFileSync(path.join(repoRoot, "apps/web/src/styles/friends-detail.css"), "utf8");
const friendChartModalStylesSource = fs.readFileSync(path.join(repoRoot, "apps/web/src/styles/friends-chart-modal.css"), "utf8");
const calendarRouteSource = fs.readFileSync(path.join(repoRoot, "apps/web/src/routes/CalendarRoute.tsx"), "utf8");
const friendsRouteSource = fs.readFileSync(path.join(repoRoot, "apps/web/src/routes/FriendsRoute.tsx"), "utf8");
const friendDetailSource = fs.readFileSync(path.join(repoRoot, "apps/web/src/features/friends/FriendDetail.tsx"), "utf8");
const friendChartModalSource = fs.readFileSync(path.join(repoRoot, "apps/web/src/features/friends/FriendChartModal.tsx"), "utf8");
const wheelSource = fs.readFileSync(path.join(repoRoot, "apps/web/src/components/charts/Wheels.tsx"), "utf8");
const synastryWheelSource = fs.readFileSync(path.join(repoRoot, "apps/web/src/components/charts/SynastryWheel.tsx"), "utf8");
const placementRowsSource = fs.readFileSync(path.join(repoRoot, "apps/web/src/components/charts/PlacementRows.tsx"), "utf8");
const friendPlacementTablesSource = fs.readFileSync(
  path.join(repoRoot, "apps/web/src/features/friends/FriendPlacementTables.tsx"),
  "utf8"
);
const settingsControlsSource = fs.readFileSync(path.join(repoRoot, "apps/web/src/components/SettingsControls.tsx"), "utf8");
const guestSettingsSource = fs.readFileSync(path.join(repoRoot, "apps/web/src/features/settings/GuestSettingsView.tsx"), "utf8");
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
  /import\s+\{[^}]*\bBlockedAccountsSettings\b[^}]*\}\s+from\s+"\.\/features\/settings\/BlockedAccountsSettings"/u,
  "BlockedAccountsSettings must not remain a static application-shell dependency."
);
assert.match(
  appSource,
  /lazy\(\(\)\s*=>\s*\n?\s*import\("\.\/features\/settings\/BlockedAccountsSettings"\)/u,
  "BlockedAccountsSettings must load only when its nested Settings page renders."
);
assert.doesNotMatch(
  appSource,
  /import\s+\{[^}]*(?:AppearanceToggle|HouseSignLabelToggle|SwitchControl)[^}]*\}\s+from\s+"\.\/components\/SettingsControls"/u,
  "Settings-only controls must not remain static application-shell dependencies."
);
assert.equal(
  [...appSource.matchAll(/import\("\.\/components\/SettingsControls"\)/gu)].length,
  4,
  "All Settings controls must load through their deferred route boundary."
);
assert.doesNotMatch(
  appSource,
  /function GuestSettingsView/u,
  "The guest Settings page must not remain in the application shell."
);
assert.match(
  appSource,
  /lazy\(\(\)\s*=>\s*\n?\s*import\("\.\/features\/settings\/GuestSettingsView"\)/u,
  "The guest Settings page must load only when its route renders."
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
  appSource,
  /lazy\(\(\)\s*=>\s*\n?\s*import\("\.\/components\/charts\/NatalChartDataTable"\)/u,
  "The natal chart data table must load only when a chart table surface renders."
);
assert.doesNotMatch(
  appSource,
  /import\s+\{[^}]*\bSynastryWheel\b[^}]*\}\s+from\s+"\.\/components\/charts\/Wheels"/u,
  "The Friends-only synastry wheel must not remain a static application-shell dependency."
);
assert.match(
  appSource,
  /lazy\(\(\)\s*=>\s*\n?\s*import\("\.\/components\/charts\/SynastryWheel"\)/u,
  "The synastry wheel must load only when a relationship chart surface renders."
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
  2,
  "Both Friends placement surfaces must load through their deferred feature boundary."
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

console.log("App startup performance contracts passed.");
