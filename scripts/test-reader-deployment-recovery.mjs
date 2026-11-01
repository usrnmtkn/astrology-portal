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

assert.match(startup, /__tldrastroReaderPageRecovery/u, "Reader recovery must use one shared history-state guard.");
assert.match(startup, /2 \* 60 \* 1000/u, "Reader recovery must be cooldown guarded so a real bug cannot reload-loop.");
assert.match(startup, /history\.replaceState/u, "Automatic recovery must be tab-local and survive the one reload it initiates.");
for (const source of [startup, boundary]) {
  assert.match(source, /__tldrastroReloadReaderOnce/u, "Startup and mounted recovery must share the same guarded operation.");
  assert.doesNotMatch(source, /sessionStorage/u, "Reader recovery must not consume the session-storage namespace used by app state.");
}
assert.match(startup, /you\|sky\|calendar\|friends/u, "Reader recovery must cover the primary hash routes.");
assert.match(startup, /path === "\/learn"/u, "Path-based Learn must get one-shot stale-chunk recovery.");
assert.match(startup, /path === "\/friends"/u, "Path-based Friends must get one-shot stale-chunk recovery.");
assert.match(startup, /path !== "\/"/u, "Other HTML routes must stay manual.");

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
  ["mounted", "(() => {" + startup + "})();\n" + recovery.outputFiles[0].text + "\nglobalThis.recover = module.exports.reloadReaderRouteOnce;"]]) {
  for (const [route, allowed] of [["/?auth=login", false], ["/?auth=signup#friends", false],
    ["/?code=synthetic-code", false], ["/#access_token=synthetic-token", false],
    ["/?readerReturn=%2F%23friends%3Ftab%3Dcircle", false],
    ["/?readerReturn=%2Freports%2F#sky", false],
    ["/?returnTo=%2Fadmin%2Fcontent", false],
    ["/?readerReturn=invalid#friends", false],
    ["/?%61uth=login#sky", false], ["/?%72eaderReturn=invalid#sky", false],
    ["/admin/content", false], ["/reports/example", false], ["/#calendar?view=day", true],
    ["/admin", false], ["/reports", false], ["/unknown", false], ["/learned", false], ["/friendship", false],
    ["/?date=2030-01-01#sky", true], ["/learn", true], ["/learn/", true], ["/learn/item", true],
    ["/friends", true], ["/friends/", true]]) {
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
    if (owner === 'mounted') {
      history.state = {};
      context.document.querySelector = () => ({});
      const beforeEditor = reloads;
      assert.equal(context.recover(), false, 'An open Calendar editor must keep its draft');
      assert.equal(reloads, beforeEditor);
      context.document.querySelector = () => null;
      delete window.__tldrastroReloadReaderOnce;
      history.state = {};
      const count = reloads;
      assert.equal(context.recover(), false, 'A page without the reader shell must keep recovery manual');
      assert.equal(reloads, count);
      assert.deepEqual(history.state, {});
    }
  }
}
console.log("PASS startup and mounted auth-route exclusion, editor protection and one-shot reader recovery.");

// Real startup recovery may only refetch same-origin JavaScript assets. It
// waits for their bodies, including preloads that failed before its listener.
{
  let reloads = 0, manualRetry, releaseBody;
  const listeners = new Map(), requests = [];
  const body = new Promise(resolve => { releaseBody = resolve; });
  let holdBody = true;
  class Script { constructor(src, decoration = false) { this.src = src; this.decoration = decoration; } hasAttribute() { return this.decoration; } }
  class Link { constructor(href, rel = "modulepreload") { this.href = href; this.rel = rel; } }
  const assets = [new Link("https://fixture.example.test/assets/App-fixture.js"),
    new Link("https://external.example.test/assets/foreign.js"), new Link("https://fixture.example.test/api/private.js"),
    new Link("https://fixture.example.test/assets/styles.css")];
  const button = { addEventListener(_name, callback) { manualRetry = callback; }, disabled: false };
  const startupElement = { isConnected: false, querySelector: () => button };
  const location = Object.assign(new URL("/?readerReturn=%2F%23friends", "https://fixture.example.test"), { reload: () => reloads++ });
  const window = { location, addEventListener: (name, callback) => listeners.set(name, callback), setTimeout: () => 1 };
  const context = { window, location, history: {}, URL, URLSearchParams,
    HTMLScriptElement: Script, HTMLLinkElement: Link,
    AbortSignal: { timeout: milliseconds => ({ milliseconds }) },
    fetch: async (href, options) => {
      requests.push({ href, options });
      return { arrayBuffer: () => holdBody ? body : Promise.resolve(new ArrayBuffer(0)) };
    },
    document: { getElementById: id => id === "app-startup" ? startupElement : null,
      querySelectorAll: () => assets, documentElement: { dataset: {}, toggleAttribute() {} } },
    matchMedia: () => ({ matches: false, addEventListener() {} }),
    MutationObserver: class { observe() {} }, clearTimeout() {} };
  runInNewContext(startup, context);
  assert.equal(window.__tldrastroRecoverPageAssets(), undefined, "Healthy navigation stays synchronous");
  for (const target of [new Link("https://fixture.example.test/assets/sky-fixture.js"),
    new Link("https://fixture.example.test/assets/sky-fixture.js"), ...assets.slice(1),
    new Script("https://fixture.example.test/assets/optional.js", true)]) listeners.get("error")({ target });
  const recovery = window.__tldrastroRecoverPageAssets();
  assert.equal(requests.length, 1, "Deduplicate failed JS; exclude foreign origins, API paths, CSS and decoration");
  assert.equal(requests[0].options.cache, "reload");
  assert.equal(requests[0].options.signal.milliseconds, 5000, "Each cache refresh is bounded");
  let complete = false;
  recovery.then(() => { complete = true; });
  await Promise.resolve();
  assert.equal(complete, false, "Headers alone cannot count as a refreshed module");
  releaseBody(new ArrayBuffer(0));
  await recovery;
  assert.equal(reloads, 0, "Preparing a navigation must not replace its owner");
  holdBody = false;
  await manualRetry({ currentTarget: button });
  assert.equal(button.disabled, true);
  assert.equal(reloads, 1);
  assert.deepEqual(requests.slice(1).map(request => request.href).sort(),
    ["https://fixture.example.test/assets/App-fixture.js", "https://fixture.example.test/assets/sky-fixture.js"]);
}
console.log("PASS bounded same-origin module refresh, completed bodies and manual startup recovery.");
