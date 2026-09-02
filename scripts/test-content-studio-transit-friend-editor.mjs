#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dashboard = fs.readFileSync(path.join(root, "apps/admin/src/GeneratedContentAdminDashboard.tsx"), "utf8");
const api = fs.readFileSync(path.join(root, "api/admin/generated-content.ts"), "utf8");
const transitSources = fs.readFileSync(path.join(root, "apps/admin/src/transitNatalSources.ts"), "utf8");

assert.match(dashboard, /const pageSize = scope === "compatibility" \? 500 : 400;/u);
assert.match(dashboard, /const generatedContentPageRetryDelaysMs = \[350, 1_000\];/u);
assert.match(dashboard, /const isAuthoredTransitAspectDraft = isPackageDraft[\s\S]{0,180}authored\/transit-aspect\//u);
assert.match(dashboard, /const showPackageBodyThey = isPackageDraft[\s\S]{0,260}isAuthoredTransitAspectDraft/u);
assert.match(dashboard, /Friends uses this complete third-person passage/u);
assert.match(dashboard, /transit-aspect-they-name-hint/u);
assert.match(api, /authored\/transit-aspect\/[\s\S]{0,220}slot === "\{\{Name\}\}"/u);
assert.match(transitSources, /separate You and Friends passages/u);
console.log("Content Studio Transit to Natal Friends editor contract passed.");
