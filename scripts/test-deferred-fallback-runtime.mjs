#!/usr/bin/env node

import assert from "node:assert/strict";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { build } from "esbuild";

const repoRoot = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const bundleFile = path.join(os.tmpdir(), "tldrastro-deferred-fallback-runtime.mjs");

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
        fallbackArchitectureV3BundledManifestSummary,
        isDeferredFallbackArchitectureV3BundleLoaded,
        loadFallbackArchitectureV3BundledManifest,
        loadDeferredFallbackArchitectureV3Bundle,
        transitSynastryFallbackRendererV3
      } from "./apps/web/src/content/fallbackArchitectureV3Runtime.ts";
    `
  }
});

const runtime = await import(`${pathToFileURL(bundleFile).href}?t=${Date.now()}`);
const skyFacts = {
  a: "uranus",
  b: "neptune",
  aspect: "sextile",
  aSign: "gemini",
  bSign: "aries"
};
const transitFacts = {
  transiting: "pluto",
  natal: "chiron",
  aspect: "square",
  window: "Until Jul 23, 2026"
};
const skyBefore = runtime.transitSynastryFallbackRendererV3.renderSkyAspectCard(skyFacts);
const transitBefore = runtime.transitSynastryFallbackRendererV3.renderTransitAspect(transitFacts);

assert.equal(runtime.fallbackArchitectureV3BundledManifestSummary.keyCount, 7175);
assert.equal((await runtime.loadFallbackArchitectureV3BundledManifest()).keys.length, 7175);
assert.equal(runtime.isDeferredFallbackArchitectureV3BundleLoaded(), false);
assert.ok(skyBefore.body, "Sky fallback copy must be available before the transit bundle loads.");
assert.notEqual(
  transitBefore.contentKey,
  "authored/transit-aspect/pluto/chiron/square",
  "The initial Sky bundle must not eagerly contain transit authored cards."
);

assert.equal(await runtime.loadDeferredFallbackArchitectureV3Bundle(), true);
assert.equal(runtime.isDeferredFallbackArchitectureV3BundleLoaded(), true);

const skyAfter = runtime.transitSynastryFallbackRendererV3.renderSkyAspectCard(skyFacts);
const transitAfter = runtime.transitSynastryFallbackRendererV3.renderTransitAspect(transitFacts);

assert.deepEqual(
  {
    body: skyAfter.body,
    contentKey: skyAfter.contentKey,
    headline: skyAfter.headline,
    templateKey: skyAfter.templateKey
  },
  {
    body: skyBefore.body,
    contentKey: skyBefore.contentKey,
    headline: skyBefore.headline,
    templateKey: skyBefore.templateKey
  },
  "Installing transit content must not change the approved Sky fallback result."
);
assert.equal(transitAfter.contentKey, "authored/transit-aspect/pluto/chiron/square");
assert.equal(await runtime.loadDeferredFallbackArchitectureV3Bundle(), false);

console.log("Deferred fallback runtime parity passed.");
