#!/usr/bin/env node

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const mainSource = fs.readFileSync(path.join(repoRoot, "apps/web/src/main.tsx"), "utf8");
const viteSource = fs.readFileSync(path.join(repoRoot, "apps/web/vite.config.ts"), "utf8");
const readerStylesSource = fs.readFileSync(path.join(repoRoot, "apps/web/src/styles.css"), "utf8");
const friendsStylesSource = fs.readFileSync(path.join(repoRoot, "apps/web/src/styles/friends.css"), "utf8");
const calendarRouteSource = fs.readFileSync(path.join(repoRoot, "apps/web/src/routes/CalendarRoute.tsx"), "utf8");
const friendsRouteSource = fs.readFileSync(path.join(repoRoot, "apps/web/src/routes/FriendsRoute.tsx"), "utf8");
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
  fallbackRuntimeSource,
  /function createApp(?:Transit|Fallback)Renderer\([^)]*\) \{\s*const readerBundle = readerEligibleBundle/u,
  "Pre-filtered reader bundles must not be filtered again while constructing startup renderers."
);

console.log("App startup performance contracts passed.");
