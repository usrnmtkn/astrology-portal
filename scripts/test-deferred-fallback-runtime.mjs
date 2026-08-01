#!/usr/bin/env node

import assert from "node:assert/strict";
import fs from "node:fs";
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
        fallbackV3DignityLine,
        fallbackV3PlacementSentence,
        isDeferredFallbackArchitectureV3BundleLoaded,
        loadFallbackArchitectureV3BundledManifest,
        loadDeferredFallbackArchitectureV3Bundle,
        transitSynastryFallbackRendererV3
      } from "./apps/web/src/content/fallbackArchitectureV3Runtime.ts";
    `
  }
});

const runtime = await import(`${pathToFileURL(bundleFile).href}?t=${Date.now()}`);
const skyCoreRows = JSON.parse(fs.readFileSync(
  path.join(repoRoot, "apps/web/src/content/fallbackArchitectureV3/bundled-sky-core-rows-v3.json"),
  "utf8"
));
const skyCoreKeys = new Set(skyCoreRows.hookRows.map((row) => row.contentKey));
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
const skyPlacementBefore = runtime.transitSynastryFallbackRendererV3.renderSkyPlacement({
  planet: "sun",
  sign: "leo",
  events: [],
  asOfDate: "2026-08-01",
  entryDate: "July 22, 2026",
  exitDate: "August 23, 2026"
});
const skySeasonBefore = runtime.transitSynastryFallbackRendererV3.renderSkySeason({ sign: "leo", events: [] });
const skyLunationBefore = runtime.transitSynastryFallbackRendererV3.renderSkyLunation({
  kind: "new-moon",
  sign: "leo",
  dateLine: "August 12, 2026",
  events: []
});
const dignityBefore = runtime.fallbackV3DignityLine("fall", "moon", "you");
const placementBefore = runtime.fallbackV3PlacementSentence("moon", "scorpio", "they");

assert.equal(runtime.fallbackArchitectureV3BundledManifestSummary.keyCount, 7175);
assert.equal((await runtime.loadFallbackArchitectureV3BundledManifest()).keys.length, 7175);
assert.equal(runtime.isDeferredFallbackArchitectureV3BundleLoaded(), false);
assert.ok(skyBefore.body, "Sky fallback copy must be available before the transit bundle loads.");
assert.ok(skyPlacementBefore.body && skySeasonBefore.body && skyLunationBefore.body);
assert.ok(dignityBefore, "Sky dignity copy must remain in the eager core.");
assert.equal(placementBefore, "", "Natal and friend placement prose must remain deferred.");
assert.ok(
  [...skyCoreKeys].some((key) => key.startsWith("fallback-hook/sky-event/"))
    && [...skyCoreKeys].some((key) => key.startsWith("fallback-hook/transit-effect-hard/"))
    && [...skyCoreKeys].some((key) => key.startsWith("fallback-hook/transit-retro/"))
    && [...skyCoreKeys].some((key) => key.startsWith("fallback-hook/dignity-line/")),
  "The eager source slice must retain every generic dependency used by Sky."
);
assert.ok(
  ![...skyCoreKeys].some((key) => key.startsWith("fallback-hook/synastry-pair/"))
    && ![...skyCoreKeys].some((key) => key.startsWith("fallback-hook/placement-sentence/")),
  "Natal and relationship base rows must not remain in the eager Sky source slice."
);
assert.throws(
  () => runtime.transitSynastryFallbackRendererV3.renderTransitAspect(transitFacts),
  /SOURCE_GAP/u,
  "Personal-transit rendering must remain unavailable until its domain bundle loads."
);

assert.equal(await runtime.loadDeferredFallbackArchitectureV3Bundle(), true);
assert.equal(runtime.isDeferredFallbackArchitectureV3BundleLoaded(), true);

const skyAfter = runtime.transitSynastryFallbackRendererV3.renderSkyAspectCard(skyFacts);
const skyPlacementAfter = runtime.transitSynastryFallbackRendererV3.renderSkyPlacement({
  planet: "sun",
  sign: "leo",
  events: [],
  asOfDate: "2026-08-01",
  entryDate: "July 22, 2026",
  exitDate: "August 23, 2026"
});
const skySeasonAfter = runtime.transitSynastryFallbackRendererV3.renderSkySeason({ sign: "leo", events: [] });
const skyLunationAfter = runtime.transitSynastryFallbackRendererV3.renderSkyLunation({
  kind: "new-moon",
  sign: "leo",
  dateLine: "August 12, 2026",
  events: []
});
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
assert.deepEqual(skyPlacementAfter, skyPlacementBefore, "Deferred rows must not change Sky placement copy.");
assert.deepEqual(skySeasonAfter, skySeasonBefore, "Deferred rows must not change Sky season copy.");
assert.deepEqual(skyLunationAfter, skyLunationBefore, "Deferred rows must not change Sky lunation copy.");
assert.equal(runtime.fallbackV3DignityLine("fall", "moon", "you"), dignityBefore);
assert.match(
  runtime.fallbackV3PlacementSentence("moon", "scorpio", "they"),
  /guard up until they know where they stand/u,
  "Friend placement prose must become available after its domain bundle loads."
);
assert.equal(transitAfter.contentKey, "authored/transit-aspect/pluto/chiron/square");
assert.equal(await runtime.loadDeferredFallbackArchitectureV3Bundle(), false);

console.log("Deferred fallback runtime parity passed.");
