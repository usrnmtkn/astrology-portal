#!/usr/bin/env node

import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { build } from "esbuild";

const repoRoot = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const bundleFile = path.join(os.tmpdir(), "tldrastro-deferred-sky-placement-runtime.mjs");

await build({
  absWorkingDir: repoRoot,
  bundle: true,
  format: "esm",
  logLevel: "silent",
  outfile: bundleFile,
  platform: "node",
  stdin: {
    loader: "tsx",
    resolveDir: repoRoot,
    contents: `
      export {
        isSkyPlacementFallbackArchitectureV3BundleLoaded,
        loadSkyPlacementFallbackArchitectureV3Bundle,
        transitSynastryFallbackRendererV3
      } from "./apps/web/src/content/fallbackArchitectureV3Runtime.ts";
    `
  }
});

const runtime = await import(`${pathToFileURL(bundleFile).href}?t=${Date.now()}`);
const placementRows = JSON.parse(fs.readFileSync(
  path.join(repoRoot, "apps/web/src/content/fallbackArchitectureV3/bundled-sky-placement-rows-v3.json"),
  "utf8"
));
const placementManifest = JSON.parse(fs.readFileSync(
  path.join(repoRoot, "apps/web/src/content/fallbackArchitectureV3/bundled-sky-placement-manifest-v3.json"),
  "utf8"
));
const facts = {
  planet: "sun",
  sign: "leo",
  events: [],
  asOfDate: "2026-08-01",
  entryDate: "July 22, 2026",
  exitDate: "August 23, 2026"
};

assert.equal(runtime.isSkyPlacementFallbackArchitectureV3BundleLoaded(), false);
assert.ok(placementRows.hookRows.length > 800, "The long-form placement package must stay in its deferred partition.");
assert.equal(placementManifest.keyCount, placementRows.hookRows.length);

const before = runtime.transitSynastryFallbackRendererV3.renderSkyPlacement(facts);
assert.equal(before.templateKey, "sky-placement-standalone-hook-v1");
assert.equal(before.contentKey, "fallback-hook/sky-placement-sign/sun/leo");
assert.doesNotMatch(before.body, /\{\{/u, "The eager reader-safety floor must always be renderable.");

const concurrentLoads = await Promise.all([
  runtime.loadSkyPlacementFallbackArchitectureV3Bundle(),
  runtime.loadSkyPlacementFallbackArchitectureV3Bundle()
]);
assert.deepEqual(concurrentLoads, [true, true], "Concurrent route requests must share the same placement load.");
assert.equal(runtime.isSkyPlacementFallbackArchitectureV3BundleLoaded(), true);

const after = runtime.transitSynastryFallbackRendererV3.renderSkyPlacement(facts);
assert.equal(after.templateKey, "sky-placement-continuous-v2");
assert.equal(after.contentKey, "fallback-hook/sky-sign-copy/sun/leo");
assert.match(after.body, /^July 22 to August 23, 2026/mu);
assert.match(after.body, /The Sun moves into Leo on July 22/u);
assert.match(after.body, /Before August 23/u);
assert.doesNotMatch(after.body, /\{\{/u, "Engine-owned local-time slots must resolve after the partition loads.");
assert.equal(await runtime.loadSkyPlacementFallbackArchitectureV3Bundle(), false);

console.log("Deferred Sky Placement runtime parity passed.");
