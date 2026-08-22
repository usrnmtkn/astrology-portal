#!/usr/bin/env node

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  writingSurfaceAdminAccess,
  writingSurfaceSourceMap
} from "../apps/admin/src/writingSurfaceSourceMap.ts";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const surfaceIds = new Set(writingSurfaceSourceMap.map((surface) => surface.id));
const accessIds = new Set(Object.keys(writingSurfaceAdminAccess));

assert.deepEqual([...accessIds].sort(), [...surfaceIds].sort(), "Every reader surface must have exactly one Admin access contract.");

for (const surface of writingSurfaceSourceMap) {
  const access = writingSurfaceAdminAccess[surface.id];
  assert.ok(access.readerLocation.trim(), `${surface.id} must name where readers see the content.`);
  assert.ok(access.routes.length > 0, `${surface.id} must link to at least one Admin editing or review route.`);
  for (const route of access.routes) {
    assert.match(route.hash, /^#[a-z0-9/-]+(?:\?.*)?$/u, `${surface.id} has an invalid Admin hash route.`);
    assert.ok(route.note.trim(), `${surface.id} route ${route.hash} must explain what the editor controls.`);
  }
  for (const source of surface.sources) {
    if (source.path.includes(":")) continue;
    assert.ok(fs.existsSync(path.join(repoRoot, source.path)), `${surface.id} points to missing source path ${source.path}.`);
  }
}

const skyAspectAccess = writingSurfaceAdminAccess["sky-aspect-detail"];
assert.ok(skyAspectAccess.routes.some((route) => route.hash === "#source-drafts"), "Current Sky aspect details must link to the held source-draft review surface.");
assert.ok(skyAspectAccess.routes.some((route) => route.hash.startsWith("#exact-content")), "Current Sky aspect details must also link to saved exact content.");

const dashboardSource = fs.readFileSync(path.join(repoRoot, "apps/admin/src/GeneratedContentAdminDashboard.tsx"), "utf8");
assert.match(dashboardSource, /governanceState === "needs-owner-decision"/u, "The general editor must block held source drafts from being made LIVE.");
assert.match(dashboardSource, /saving one does not approve it or make it visible to readers/u, "The source-draft screen must state its serving boundary." );
const surfaceMapSource = fs.readFileSync(path.join(repoRoot, "apps/admin/src/writingSurfaceSourceMap.ts"), "utf8");
assert.doesNotMatch(surfaceMapSource, /apps\/web\/src\/services\/horoscopes\.ts|normalizeCalendarDaySurface|dayCardBody/u, "The surface directory must not retain removed horoscope or calendar render paths.");

const heldSourceRoot = path.join(repoRoot, "packages/astro-knowledge/data/points/aspects/sky/four-body-unverified");
const heldSources = fs.readdirSync(heldSourceRoot)
  .filter((fileName) => fileName.endsWith(".json"))
  .map((fileName) => JSON.parse(fs.readFileSync(path.join(heldSourceRoot, fileName), "utf8")));
assert.equal(heldSources.length, 198, "The Admin source-draft route must cover every held four-body Sky aspect passage.");
assert.ok(heldSources.every((source) => (
  source.authorityClass === "unverified"
  && source.governanceState === "needs-owner-decision"
  && source.status === "NEEDS_OWNER_DECISION"
  && source.surfacePermission.includes("doctrine-only")
)), "Held Sky aspect passages must retain their non-serving governance metadata.");

const generatedContentApi = fs.readFileSync(path.join(repoRoot, "api/admin/generated-content.ts"), "utf8");
assert.match(generatedContentApi, /sourceDrafts"\) === "sky-aspects"/u, "The secret-protected Admin API must expose the held source-draft catalog.");
assert.match(generatedContentApi, /listHeldSkyAspectSourceDrafts/u, "The Admin API must load the held source-draft directory.");

console.log(`Admin writing surface map passed: ${surfaceIds.size} reader surfaces have explicit editorial destinations.`);
