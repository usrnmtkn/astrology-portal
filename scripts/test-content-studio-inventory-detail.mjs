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
assert.doesNotMatch(inventorySelect, /^\s*"sections",\s*$/mu, "Inventory projection must not transfer full sections JSON.");
assert.doesNotMatch(inventorySelect, /^\s*"facts",\s*$/mu, "Inventory projection must not transfer full facts JSON.");
assert.doesNotMatch(inventorySelect, /^\s*"source_snapshot",\s*$/mu, "Inventory projection must not transfer full provenance JSON.");
assert.doesNotMatch(inventorySelect, /^\s*"created_at",\s*$/mu, "Inventory projection must not transfer creation timestamps that are unused by the list contract.");
assert.doesNotMatch(inventorySelect, /^\s*"published_at",\s*$/mu, "Inventory projection must not transfer publication timestamps that are unused by the list contract.");
assert.match(inventorySelect, /source_review_status:source_snapshot->>review_status/u);
assert.match(inventorySelect, /package_content_role:sections->packageRecord->>content_role/u);
assert.match(api, /inventory_only: true/u);
assert.match(api, /view === "inventory" && !id && !contentKey && !contentKeyPrefix/u);

assert.match(dashboard, /inventory_only\?: boolean/u);
assert.match(dashboard, /&view=inventory/u);
assert.match(dashboard, /if \(row\.inventory_only\) \{[\s\S]{0,420}hydrateGeneratedContentRow\(row\)/u);
assert.match(dashboard, /generated-content\?id=\$\{encodeURIComponent\(row\.id\)\}/u);
assert.match(dashboard, /if \(!hydrated \|\| hydrated\.inventory_only\)/u);
assert.match(dashboard, /async function openDailyGlancePair\(selector: string\)[\s\S]{0,700}hydrateGeneratedContentRow\(pair\.headlineRow/u);

console.log("Content Studio compact inventory/detail hydration contract passed.");
