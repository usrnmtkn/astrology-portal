#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import {
  STUDIO_ASTRO_101_PREFIXES,
  STUDIO_BETWEEN_YOU_TWO_PREFIXES,
  STUDIO_PERSONAL_TRANSIT_PREFIXES,
  STUDIO_SKY_WRITEUP_PREFIXES,
  studioInventoryQuery,
  studioInventoryRequestPath
} from "../apps/admin/src/studioSectionInventory.ts";

const astro101 = studioInventoryQuery({ page: "astro101" });
assert.deepEqual(astro101.prefixes, [...STUDIO_ASTRO_101_PREFIXES]);
assert.equal(astro101.catalog, false);

const betweenYouTwo = studioInventoryQuery({
  page: "knowledge",
  fallbackSectionFilter: "friends",
  friendsTransitAudience: true,
  betweenYouTwoWorkspace: true
});
assert.deepEqual(betweenYouTwo.prefixes, [...STUDIO_BETWEEN_YOU_TWO_PREFIXES]);
assert.ok(betweenYouTwo.prefixes.every((prefix) => prefix.startsWith("fallback-hook/bond-effect-") || prefix.startsWith("fallback-hook/synastry")));

const activeForName = studioInventoryQuery({
  page: "skyWriteups",
  friendsTransitAudience: true,
  skyWriteupWorkspaceView: "transits-to-natal"
});
assert.deepEqual(activeForName.prefixes, [...STUDIO_PERSONAL_TRANSIT_PREFIXES]);
assert.ok(activeForName.prefixes.includes("authored/transit-aspect/"));

const skyWriteups = studioInventoryQuery({ page: "skyWriteups" });
assert.deepEqual(skyWriteups.prefixes, [...STUDIO_SKY_WRITEUP_PREFIXES]);

const reviewQueue = studioInventoryQuery({ page: "reviewQueue" });
assert.equal(reviewQueue.catalog, true);
assert.deepEqual(reviewQueue.prefixes, []);
assert.equal(reviewQueue.visibility, "all");

const articles = studioInventoryQuery({ page: "articles" });
assert.equal(articles.mode, "article");
assert.deepEqual(articles.prefixes, []);

const astro101Path = studioInventoryRequestPath({ ...astro101, prefixes: ["education/astro-101/"] }, 400, null);
assert.match(astro101Path, /view=inventory/u);
assert.match(astro101Path, /contentKeyPrefix=education%2Fastro-101%2F/u);
assert.doesNotMatch(astro101Path, /contentKeyPrefix=authored/u);

const dashboard = fs.readFileSync("apps/admin/src/GeneratedContentAdminDashboard.tsx", "utf8");
assert.match(dashboard, /studioInventoryQuery\(/u);
assert.match(dashboard, /studioInventoryRequestPath\(/u);
assert.match(dashboard, /loadedInventoryKeyRef/u);
assert.match(dashboard, /async function hydrateGeneratedContentRow\(row: AdminGeneratedContentRow/u);

const api = fs.readFileSync("api/admin/generated-content.ts", "utf8");
assert.match(api, /view === "inventory" && !id && !contentKey && contentKeys\.length === 0/u);
assert.match(api, /Request one contentKeyPrefix per inventory page/u);
assert.match(api, /if \(!id && mode\) \{\s*params\.set\("mode", `eq\.\$\{mode\}`\)/u);

console.log("Content Studio section-first compact inventory contract passed.");
