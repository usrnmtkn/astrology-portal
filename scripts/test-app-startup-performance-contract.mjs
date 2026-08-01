#!/usr/bin/env node

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const mainSource = fs.readFileSync(path.join(repoRoot, "apps/web/src/main.tsx"), "utf8");
const viteSource = fs.readFileSync(path.join(repoRoot, "apps/web/vite.config.ts"), "utf8");
const fallbackRuntimeSource = fs.readFileSync(
  path.join(repoRoot, "apps/web/src/content/fallbackArchitectureV3Runtime.ts"),
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
assert.match(
  fallbackRuntimeSource,
  /import\("\.\/fallbackArchitectureV3DeferredBundle"\)/u,
  "Transit and relationship content must remain behind a dynamic runtime boundary."
);
assert.doesNotMatch(
  fallbackRuntimeSource,
  /function createApp(?:Transit|Fallback)Renderer\([^)]*\) \{\s*const readerBundle = readerEligibleBundle/u,
  "Pre-filtered reader bundles must not be filtered again while constructing startup renderers."
);

console.log("App startup performance contracts passed.");
