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
  assert.ok(["editable", "partial", "missing"].includes(access.editability), `${surface.id} must declare its actual Admin editability.`);
  if (access.editability !== "editable") {
    assert.ok(surface.risk.trim(), `${surface.id} must explain why its reader copy is not fully editable.`);
    assert.ok(surface.nextAction.trim(), `${surface.id} must name the work required for a complete editorial path.`);
  }
  assert.ok(access.readerLocation.trim(), `${surface.id} must name where readers see the content.`);
  if (access.editability !== "missing") {
    assert.ok(access.routes.length > 0, `${surface.id} must link to at least one Admin editing or review route.`);
  }
  for (const route of access.routes) {
    assert.match(route.hash, /^#[a-z0-9/-]+(?:\?.*)?$/u, `${surface.id} has an invalid Admin hash route.`);
    assert.ok(route.note.trim(), `${surface.id} route ${route.hash} must explain what the editor controls.`);
  }
  for (const source of surface.sources) {
    if (source.path.includes(":")) continue;
    assert.ok(fs.existsSync(path.join(repoRoot, source.path)), `${surface.id} points to missing source path ${source.path}.`);
  }
}

for (const requiredSurfaceId of [
  "sky-placement-detail",
  "sky-calendar-event-cards",
  "sky-calendar-day-cards",
  "sky-horoscopes",
  "daily-at-a-glance",
  "generated-reports",
  "friends-compatibility-highlights",
  "friends-circle-feed"
]) {
  assert.ok(surfaceIds.has(requiredSurfaceId), `Composition surface coverage must include ${requiredSurfaceId}.`);
}

assert.equal(writingSurfaceAdminAccess["daily-at-a-glance"].editability, "editable", "Daily At-a-Glance hook copy must have a direct Admin editor path.");
assert.ok(writingSurfaceAdminAccess["daily-at-a-glance"].routes.some((route) => route.hash.startsWith("#fallback-hooks")), "Daily At-a-Glance must open its governed daily hooks.");
assert.equal(writingSurfaceAdminAccess["generated-reports"].editability, "partial", "Reports must not claim inline copy editing before a governed report inspection/editor flow exists.");
assert.ok(writingSurfaceAdminAccess["generated-reports"].routes.some((route) => route.hash === "#report-fulfillment"), "Reports must link to their fulfillment and provenance workspace.");
assert.equal(writingSurfaceAdminAccess["friends-compatibility-highlights"].editability, "missing", "Code-composed compatibility highlights must not claim an atomic editor.");
assert.equal(writingSurfaceAdminAccess["friends-circle-feed"].editability, "missing", "Code-composed Circle feed prose must not claim an atomic editor.");

const cmsSurfaceIds = [
  "sky-calendar-day-cards",
  "sky-horoscopes",
  "chart-placement-row-microcopy",
  "natal-empty-house",
  "personal-transit-detail",
  "personal-transit-house"
];
for (const surfaceId of cmsSurfaceIds) {
  const starters = writingSurfaceAdminAccess[surfaceId].cmsStarters ?? [];
  assert.ok(starters.length > 0, `${surfaceId} must provide a one-click CMS authoring starter.`);
  for (const starter of starters) {
    assert.match(starter.contentKey, /^cms\//u, `${surfaceId} CMS starter must use the reserved cms/ namespace.`);
    assert.ok(Array.isArray(starter.allowedSlots), `${surfaceId} CMS starter must explicitly declare its calculated fact slots.`);
  }
}

const requiredCmsStarterKeys = [
  "cms/calendar-day/moon",
  "cms/calendar-day/phase",
  "cms/calendar-day/continuation",
  "cms/weekly-horoscope/weekly-moon",
  "cms/weekly-horoscope/lunation",
  "cms/weekly-horoscope/station",
  "cms/weekly-horoscope/return",
  "cms/weekly-horoscope/heavy",
  "cms/weekly-horoscope/macro",
  "cms/chart-placement-row/template",
  "cms/natal-empty-house/card/you/template",
  "cms/natal-empty-house/detail/you/template",
  "cms/natal-empty-house/card/they/template",
  "cms/natal-empty-house/detail/they/template",
  "cms/personal-transit-aspect/you/template",
  "cms/personal-transit-house/you/template",
  "cms/personal-transit-house/they/template"
];
const cmsStarterKeys = new Set(Object.values(writingSurfaceAdminAccess).flatMap((access) => access.cmsStarters?.map((starter) => starter.contentKey) ?? []));
for (const contentKey of requiredCmsStarterKeys) {
  assert.ok(cmsStarterKeys.has(contentKey), `Surface Map must offer a one-click starter for ${contentKey}.`);
}

const skyAspectAccess = writingSurfaceAdminAccess["sky-aspect-detail"];
assert.ok(skyAspectAccess.routes.some((route) => route.hash === "#source-drafts"), "Current Sky aspect details must link to the held source-draft review surface.");
assert.ok(skyAspectAccess.routes.some((route) => route.hash.startsWith("#exact-content")), "Current Sky aspect details must also link to saved exact content.");

const personalTransitStarter = writingSurfaceAdminAccess["personal-transit-detail"].cmsStarters?.[0];
assert.ok(personalTransitStarter?.allowedSlots.includes("transitHouseOrdinal"), "Personalized aspect CMS metadata must expose the calculated transit house.");
assert.ok(personalTransitStarter?.allowedSlots.includes("natalHouseOrdinal"), "Personalized aspect CMS metadata must expose the calculated natal house.");
assert.ok(personalTransitStarter?.allowedSlots.includes("aspectVerb"), "Personalized aspect CMS metadata must expose the exact aspect verb.");

const dashboardSource = fs.readFileSync(path.join(repoRoot, "apps/admin/src/GeneratedContentAdminDashboard.tsx"), "utf8");
assert.match(dashboardSource, /governanceState === "needs-owner-decision"/u, "The general editor must block held source drafts from being made LIVE.");
assert.match(dashboardSource, /saving one does not approve it or make it visible to readers/u, "The source-draft screen must state its serving boundary." );
assert.match(dashboardSource, /announceContentUpdate/u, "Published Admin edits must notify open reader tabs to refresh content.");
assert.match(dashboardSource, /cms-surface-template-v1/u, "The Surface Map must provide a governed CMS authoring path.");
assert.match(dashboardSource, /contentSystem === "cms-surface-override" \|\| draft\.contentKey\.startsWith\("cms\/"\)/u, "Saving a CMS row must preserve its CMS provenance and fail-closed template type.");
assert.match(dashboardSource, /contentType: "mustache-template"[\s\S]*contentSystem: "cms-surface-override"[\s\S]*contentLevel: "owner-authored"/u, "CMS rows must remain owner-authored Mustache templates after save.");
assert.match(dashboardSource, /validateCmsTemplate/u, "The Admin editor must validate CMS placeholders before Sign Off.");
assert.match(dashboardSource, /disabled=\{isLoading \|\| !cmsCanSignOff\}/u, "The Admin editor must block Sign Off for incomplete CMS templates.");
assert.match(dashboardSource, /access\.editability === "partial" \? "partial" : "missing"/u, "The surface directory must keep known code-composed gaps in the missing-editor filter.");
const generatedContentApiSource = fs.readFileSync(path.join(repoRoot, "api/admin/generated-content.ts"), "utf8");
assert.match(generatedContentApiSource, /CMS template cannot be published/u, "The Admin API must reject incomplete CMS templates even when the UI is bypassed.");
assert.match(generatedContentApiSource, /isCmsRow \? "manual-admin" : "claude"/u, "CMS rows must retain manual owner-authored provenance instead of being labeled as model output.");
const cmsTemplateValidationSource = fs.readFileSync(path.join(repoRoot, "apps/web/src/content/cmsTemplateValidation.ts"), "utf8");
assert.match(cmsTemplateValidationSource, /from "\.\.\/services\/templateInterpolation\.js"/u, "Shared CMS validator imports must retain a server-runtime-resolvable .js extension.");
const surfaceMapSource = fs.readFileSync(path.join(repoRoot, "apps/admin/src/writingSurfaceSourceMap.ts"), "utf8");
assert.doesNotMatch(surfaceMapSource, /apps\/web\/src\/services\/horoscopes\.ts|normalizeCalendarDaySurface|dayCardBody/u, "The surface directory must not retain removed horoscope or calendar render paths.");
const compositionWorkspaceSource = fs.readFileSync(path.join(repoRoot, "apps/admin/src/CompositionMapWorkspace.tsx"), "utf8");
assert.match(compositionWorkspaceSource, /writingSurfaceSourceMap/u, "Composition Map must consume the canonical app-wide reader-surface registry.");
assert.match(compositionWorkspaceSource, /Surfaces &amp; systems/u, "Composition Map must begin with an app-wide surface-and-system view.");
assert.match(compositionWorkspaceSource, /Template internals/u, "Composition Map must preserve the atomic fallback-template workspace as a separate scope.");
assert.match(compositionWorkspaceSource, /onStartCmsRow/u, "Composition Map must preserve one-click governed CMS override authoring.");

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
assert.match(generatedContentApi, /path\.dirname\(fileURLToPath\(import\.meta\.url\)\)[\s\S]*"\.\.\/\.\."[\s\S]*four-body-unverified/u, "The held source-draft catalog must resolve from the repository instead of the dev server working directory.");

const appSource = fs.readFileSync(path.join(repoRoot, "apps/web/src/App.tsx"), "utf8");
const codeComposedRuntimeSurfaceIds = [...appSource.matchAll(/normalizedSurfacePreview\(normalizePackageCardSurface\(\{[\s\S]*?surface: "([^"]+)"/gu)].map((match) => match[1]);
const mappedRuntimeSurfaceIds = new Set(writingSurfaceSourceMap.flatMap((surface) => surface.runtimeSurfaceIds ?? []));
assert.deepEqual(
  codeComposedRuntimeSurfaceIds.filter((surfaceId) => !mappedRuntimeSurfaceIds.has(surfaceId)),
  [],
  "Every code-composed package-card surface in App.tsx must remain visible in Composition Map."
);
const calendarSource = fs.readFileSync(path.join(repoRoot, "apps/web/src/features/calendar/LunarCalendar.tsx"), "utf8");
const weeklySource = fs.readFileSync(path.join(repoRoot, "apps/web/src/services/weeklyHoroscope.ts"), "utf8");
const placementSource = fs.readFileSync(path.join(repoRoot, "apps/web/src/components/charts/PlacementRows.tsx"), "utf8");
for (const [label, source] of [
  ["reader app", appSource],
  ["Calendar", calendarSource],
  ["weekly horoscope", weeklySource],
  ["placement rows", placementSource]
]) {
  assert.match(source, /resolveCmsSurfaceOverride/u, `${label} must resolve reviewed CMS surface overrides.`);
}
assert.match(appSource, /subscribeToContentUpdates/u, "The reader app must refresh when Content Studio publishes or demotes a row.");

console.log(`Admin writing surface map passed: ${surfaceIds.size} writing surfaces and systems have explicit editorial status.`);
