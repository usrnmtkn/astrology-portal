#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";

const api = fs.readFileSync("api/admin/generated-content-inventory.ts", "utf8");
const dashboard = fs.readFileSync("apps/admin/src/GeneratedContentAdminDashboard.tsx", "utf8");
const inventory = fs.readFileSync("apps/admin/src/studioSectionInventory.ts", "utf8");
const vercel = fs.readFileSync("vercel.json", "utf8");

assert.doesNotMatch(api, /from "\.\/generated-content/u);
assert.doesNotMatch(api, /skyArticleTemplateCompiler|astro101|skyV4ReaderCopy/u);
assert.match(api, /inventory_only: true/u);
assert.match(api, /postgrestContentKeyPrefixAnd/u);
assert.match(inventory, /\/api\/admin\/generated-content-inventory\?/u);
assert.match(dashboard, /\/api\/admin\/generated-content-inventory\?/u);
assert.match(dashboard, /activePage === "sourceDrafts"/u);
assert.match(vercel, /"api\/admin\/generated-content-inventory\.ts"/u);

console.log("Content Studio fast inventory API contract passed.");
