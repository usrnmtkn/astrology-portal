#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";

const api = fs.readFileSync("api/admin/generated-content.ts", "utf8");
const dashboard = fs.readFileSync("apps/admin/src/GeneratedContentAdminDashboard.tsx", "utf8");

const inventorySelectStart = api.indexOf("function generatedContentInventorySelectColumns()");
const inventoryMapStart = api.indexOf("function generatedContentInventoryRow(value: unknown)");
assert.ok(inventorySelectStart >= 0 && inventoryMapStart > inventorySelectStart, "Inventory projection helpers must exist.");
const inventorySelect = api.slice(inventorySelectStart, inventoryMapStart);
assert.doesNotMatch(inventorySelect, /^\s*"body",\s*$/mu, "Inventory projection must not transfer full body copy.");
assert.doesNotMatch(inventorySelect, /^\s*"summary",\s*$/mu, "Inventory projection must not transfer summaries that can bloat the list payload.");
assert.doesNotMatch(inventorySelect, /facts->fallbackArchitectureV3/u, "Inventory projection must not transfer facts JSON objects.");
assert.doesNotMatch(inventorySelect, /source_snapshot->flags/u, "Inventory projection must not transfer source_snapshot JSON objects.");
assert.doesNotMatch(inventorySelect, /^\s*"sections",\s*$/mu, "Inventory projection must not transfer full sections JSON.");
assert.doesNotMatch(inventorySelect, /^\s*"facts",\s*$/mu, "Inventory projection must not transfer full facts JSON.");
assert.doesNotMatch(inventorySelect, /^\s*"source_snapshot",\s*$/mu, "Inventory projection must not transfer full provenance JSON.");
assert.doesNotMatch(inventorySelect, /^\s*"created_at",\s*$/mu, "Inventory projection must not transfer creation timestamps that are unused by the list contract.");
assert.doesNotMatch(inventorySelect, /^\s*"published_at",\s*$/mu, "Inventory projection must not transfer publication timestamps that are unused by the list contract.");
assert.doesNotMatch(inventorySelect, /source_snapshot/u, "Inventory projection must not read source_snapshot JSON.");
assert.doesNotMatch(inventorySelect, /packageRecord/u, "Inventory projection must not read sections JSON.");
assert.doesNotMatch(inventorySelect, /->/u, "Inventory projection must use table columns only.");
assert.match(api, /inventory_only: true/u);
assert.match(api, /view === "inventory" && !id && !contentKey && contentKeys\.length === 0/u);
assert.match(api, /postgrestContentKeyPrefixAnd/u);
assert.match(api, /boundedGeneratedContentLimit\(requestUrl\.searchParams\.get\("limit"\), 50, 80\)/u);

assert.match(dashboard, /inventory_only\?: boolean/u);
assert.match(dashboard, /studioInventoryRequestPath\(/u);
assert.match(fs.readFileSync("apps/admin/src/studioSectionInventory.ts", "utf8"), /view: "inventory"/u);
assert.match(dashboard, /if \(row\.inventory_only\) \{[\s\S]{0,420}hydrateGeneratedContentRow\(row\)/u);
assert.match(dashboard, /generated-content-inventory\?id=\$\{encodeURIComponent\(publishedTarget\)\}/u);
assert.match(dashboard, /if \(!hydrated \|\| hydrated\.inventory_only\)/u);
assert.match(dashboard, /async function openDailyGlancePair\(selector: string\)[\s\S]{0,700}hydrateGeneratedContentRow\(pair\.headlineRow/u);
assert.match(dashboard, /readStudioContentDocument\(/u, "Opening a You-serving source must use inventory then the slim package-source API.");
assert.doesNotMatch(dashboard, /includePackageSource/u, "Dashboard document open must not boot the fat generated-content GET.");

console.log("Content Studio compact inventory/detail hydration contract passed.");
