#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";

const dashboard = fs.readFileSync("apps/admin/src/GeneratedContentAdminDashboard.tsx", "utf8");
const reader = fs.readFileSync("apps/web/src/services/generatedContent.ts", "utf8");
const migration = fs.readFileSync("apps/web/supabase/migrations/20260902060000_content_studio_hydration_crud_reliability.sql", "utf8");

assert.match(dashboard, /loadGeneratedContentPage\(path: string, secret: string, signal\?: AbortSignal\)/u);
assert.match(dashboard, /dashboardLoadControllerRef\.current\?\.abort\(\)/u, "A newer CMS load must cancel the previous inventory request.");
assert.match(dashboard, /loadSequence !== dashboardLoadSequenceRef\.current/u, "Late inventory responses must not overwrite a newer dashboard load.");
assert.match(dashboard, /\(loadedRows, complete\) => \{[\s\S]{0,320}setRows\(loadedRows\)/u, "Content Studio should paint inventory progressively instead of waiting for the entire table.");
assert.match(dashboard, /visibility === "editorial" && scope === "all" \? "&view=inventory"/u, "Default editorial inventory must use the compact projection.");
assert.match(dashboard, /async function hydrateGeneratedContentRow\(row: AdminGeneratedContentRow\)/u, "Opening an inventory row must hydrate full document detail.");
assert.match(dashboard, /generated-content\?id=\$\{encodeURIComponent\(row\.id\)\}/u, "Document detail hydration must use the exact row id.");

for (const fn of [
  "loadFallbackArchitectureV3DashboardBundle",
  "loadFallbackArchitectureV3CompatibilityDashboardBundle",
  "loadFallbackArchitectureV3SkyPlacementDashboardBundle",
  "loadLiveGeneratedContentForSurfaces"
]) {
  const start = reader.indexOf(`function ${fn}`) >= 0 ? reader.indexOf(`function ${fn}`) : reader.indexOf(`function ${fn}`);
  const exportStart = reader.indexOf(`export async function ${fn}`);
  const index = exportStart >= 0 ? exportStart : start;
  assert.ok(index >= 0, `${fn} must exist.`);
  const nextExport = reader.indexOf("\nexport ", index + 10);
  const body = reader.slice(index, nextExport >= 0 ? nextExport : reader.length);
  assert.doesNotMatch(body, /\.range\(/u, `${fn} must not use OFFSET/range pagination.`);
  assert.match(body, /\.gt\("id", cursorId\)/u, `${fn} must advance by an ID cursor.`);
}

assert.match(reader, /sortGeneratedRowsNewestFirst\(rows\)/u, "Reader precedence must be restored after ID-cursor batch loading.");
assert.match(migration, /generated_interpretations_provider_id_idx/u);
assert.match(migration, /generated_interpretations_live_serving_surface_id_idx/u);
assert.match(migration, /analyze public\.generated_interpretations/u);

console.log("Content Studio CMS performance and cursor-pagination contract passed.");
