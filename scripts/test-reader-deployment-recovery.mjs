#!/usr/bin/env node

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const startup = fs.readFileSync(path.join(repoRoot, "apps/web/src/startup.js"), "utf8");
const boundary = fs.readFileSync(path.join(repoRoot, "apps/web/src/components/PageLoading.tsx"), "utf8");
const vercel = fs.readFileSync(path.join(repoRoot, "vercel.json"), "utf8");

for (const source of [startup, boundary]) {
  assert.match(source, /tldrastro:reader-page-recovery/u, "Reader recovery must use one shared session guard.");
  assert.match(source, /2 \* 60 \* 1000/u, "Reader recovery must be cooldown guarded so a real bug cannot reload-loop.");
  assert.match(source, /(?:you\|sky\|calendar\|friends|you\|sky\|calendar\|friends)/u, "Reader recovery must cover the primary hash routes.");
  assert.match(source, /pathname[^\n]*=== "\/"/u, "Automatic recovery must stay on the reader root and exclude admin/report routes.");
  assert.match(source, /sessionStorage/u, "Automatic recovery must be session guarded.");
}

assert.match(startup, /vite:preloadError/u, "Vite stale-chunk failures must have an automatic reader recovery path.");
assert.match(startup, /script\?\.src\.includes\("\/assets\/"\)/u, "A stale hashed entry chunk must use the same reader recovery path.");
assert.match(startup, /if \(reloadReaderRouteOnce\(\)\) return;/u, "Startup must reload the reader once before showing the terminal failure state.");
assert.match(boundary, /componentDidCatch[\s\S]*reloadReaderRouteOnce\(\)/u, "Mounted reader render failures must get one guarded recovery attempt.");
assert.match(boundary, /addEventListener\("vite:preloadError", this\.handlePreloadError\)/u, "Late lazy-chunk failures must be caught after React mounts.");
assert.match(boundary, /<summary>Error details<\/summary>/u, "If recovery cannot fix the page, the local failure detail must remain inspectable.");

const vercelConfig = JSON.parse(vercel);
assert.ok(Array.isArray(vercelConfig.headers), "Vercel must explicitly control HTML cache freshness.");
for (const route of ["/", "/index.html", "/admin/(.*)", "/reports/(.*)"]) {
  const rule = vercelConfig.headers.find((entry) => entry.source === route);
  assert.ok(rule, `Missing no-store HTML header rule for ${route}`);
  const cache = rule.headers?.find((header) => header.key.toLowerCase() === "cache-control")?.value ?? "";
  assert.match(cache, /no-store/u, `${route} must not retain a stale HTML/chunk map across deployments.`);
}

console.log("Reader deployment recovery contract passed.");
