#!/usr/bin/env node

import assert from "node:assert/strict";
import fs from "node:fs";
import { runInNewContext } from "node:vm";
import { build } from "esbuild";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const startup = fs.readFileSync(path.join(repoRoot, "apps/web/src/startup.js"), "utf8");
const boundary = fs.readFileSync(path.join(repoRoot, "src/shared/components/PageLoading.tsx"), "utf8");
const vercel = fs.readFileSync(path.join(repoRoot, "vercel.json"), "utf8");

for (const source of [startup, boundary]) {
  assert.match(source, /__tldrastroReaderPageRecovery/u, "Reader recovery must use one shared history-state guard.");
  assert.match(source, /2 \* 60 \* 1000/u, "Reader recovery must be cooldown guarded so a real bug cannot reload-loop.");
  assert.match(source, /you\|sky\|calendar\|friends/u, "Reader recovery must cover the primary hash routes.");
  assert.match(source, /path === "\/learn"/u, "Path-based Learn must get the same one-shot stale-chunk recovery as Sky.");
  assert.match(source, /path === "\/friends"/u, "Path-based Friends must get the same one-shot stale-chunk recovery as Sky.");
  assert.match(source, /path !== "\/"/u, "Automatic recovery must stay on reader HTML routes and exclude admin/report paths.");
  assert.match(source, /history\.replaceState/u, "Automatic recovery must be tab-local and survive the one reload it initiates.");
  assert.doesNotMatch(source, /sessionStorage/u, "Reader recovery must not consume the session-storage namespace used by app state.");
}

assert.match(startup, /vite:preloadError/u, "Vite stale-chunk failures must have an automatic reader recovery path.");
assert.match(startup, /script\?\.src\.includes\("\/assets\/"\)/u, "A stale hashed entry chunk must use the same reader recovery path.");
assert.match(startup, /if \(reloadReaderRouteOnce\(\)\)/u, "Startup must reload the reader once before showing the terminal failure state.");
assert.match(boundary, /componentDidCatch[\s\S]*reloadReaderRouteOnce\(\)/u, "Mounted reader render failures must get one guarded recovery attempt.");
assert.match(boundary, /addEventListener\("vite:preloadError", this\.handlePreloadError\)/u, "Late lazy-chunk failures must be caught after React mounts.");
assert.match(boundary, /<summary>Error details<\/summary>/u, "If recovery cannot fix the page, the local failure detail must remain inspectable.");

const vercelConfig = JSON.parse(vercel);
assert.ok(Array.isArray(vercelConfig.headers), "Vercel must explicitly control HTML cache freshness.");
for (const route of ["/", "/index.html", "/admin/(.*)", "/reports/(.*)", "/learn", "/learn/(.*)", "/friends"]) {
  const rule = vercelConfig.headers.find((entry) => entry.source === route);
  assert.ok(rule, `Missing no-store HTML header rule for ${route}`);
  const cache = rule.headers?.find((header) => header.key.toLowerCase() === "cache-control")?.value ?? "";
  assert.match(cache, /no-store/u, `${route} must not retain a stale HTML/chunk map across deployments.`);
}

console.log("Reader deployment recovery contract passed.");

// Exercise both shipped recovery owners against real routes. Auth navigation
// must not be replaced by a retry of the document it is leaving.
const recovery = await build({entryPoints: [path.join(repoRoot, "src/shared/components/PageLoading.tsx")],
  bundle: true, write: false, platform: "node", format: "cjs", loader: {".css": "empty"},
  define: {"process.env.NODE_ENV": '"production"'}});
for (const [owner, source] of [["startup", startup + "\nglobalThis.recover = reloadReaderRouteOnce;"],
  ["mounted", recovery.outputFiles[0].text + "\nglobalThis.recover = module.exports.reloadReaderRouteOnce;"]]) {
  for (const [route, allowed] of [["/?auth=login", false], ["/?auth=signup#friends", false],
    ["/?code=synthetic-code", false], ["/#access_token=synthetic-token", false],
    ["/admin/content", false], ["/reports/example", false], ["/#calendar?view=day", true],
    ["/?date=2030-01-01#sky", true], ["/learn", true], ["/friends", true]]) {
    let reloads = 0;
    const location = Object.assign(new URL(route, "https://fixture.example.test"), {reload: () => reloads++});
    const history = {state: {}, replaceState(value) {this.state = value;}};
    const window = {location, history, localStorage: {getItem: () => null}, addEventListener() {}, setTimeout: () => 1};
    const context = {window, location, history, URLSearchParams, module: {exports: {}}, exports: {},
      document: {getElementById: () => null, querySelector: () => null,
        documentElement: {dataset: {}, toggleAttribute() {}}},
      matchMedia: () => ({matches: false, addEventListener() {}}),
      MutationObserver: class {observe() {}}, clearTimeout() {}};
    runInNewContext(source, context);
    assert.equal(context.recover(), allowed, `${owner}: ${route}`);
    assert.equal(reloads, allowed ? 1 : 0, `${owner}: ${route} reload count`);
    if (allowed) {assert.equal(context.recover(), false); assert.equal(reloads, 1, 'The reader still gets exactly one automatic retry');}
    else assert.deepEqual(history.state, {}, 'Auth/editor history remains untouched');
  }
}
console.log("PASS startup and mounted auth-route exclusion, editor protection and one-shot reader recovery.");
