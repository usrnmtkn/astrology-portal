#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const app = fs.readFileSync(path.join(root, "apps/web/src/App.tsx"), "utf8");
const panel = fs.readFileSync(path.join(root, "apps/web/src/features/friends/ManualChartsPanel.tsx"), "utf8");

assert.match(
  app,
  /installFallbackArchitectureV3Bundle\(bundle\);[\s\S]{0,180}setFallbackArchitectureV3Version[\s\S]{0,180}setFallbackDashboardOverlayVersion/u,
  "Installing a live Content Studio core overlay must publish a distinct overlay generation."
);
assert.match(
  app,
  /routePath = selectedSkyDetail\?\.routePath[\s\S]{0,500}routePath\?\.startsWith\("friends\?"\)[\s\S]{0,500}setSelectedSkyDetail\(null\)/u,
  "An already-open Friends detail must be released after a newer live overlay installs so it cannot remain a frozen pre-hydration snapshot."
);
assert.match(
  panel,
  /friendsRouteStateFromUrl\(\)[\s\S]{0,1000}routeState\.detail\.startsWith\(prefix\)[\s\S]{0,1000}openFriendTransitDetail\(transit\)/u,
  "Friends must rebuild a routed personal-transit detail when the panel remounts."
);
assert.match(
  panel,
  /\[currentSky, fallbackArchitectureV3Version, relationshipGeneratedContent, selectedChart, selectedFriendEligibleTransits\]/u,
  "Friends personal-transit summaries must recompute when the fallback runtime changes after reader-eligible selection."
);

console.log("Friends live detail refresh contract passed.");
