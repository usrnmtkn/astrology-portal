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
        fallbackRendererV3,
        fallbackV3DignityLine,
        fallbackV3PlacementSentence,
        isDeferredFallbackArchitectureV3BundleLoaded,
        isEmptyHouseFallbackArchitectureV3BundleLoaded,
        isRelationshipFallbackArchitectureV3BundleLoaded,
        loadFallbackArchitectureV3BundledManifest,
        loadDeferredFallbackArchitectureV3Bundle,
        loadEmptyHouseFallbackArchitectureV3Bundle,
        loadRelationshipFallbackArchitectureV3Bundle,
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
const bundledKeyCount = runtime.fallbackArchitectureV3BundledManifestSummary.keyCount;

assert.ok(bundledKeyCount > 0, "The bundled fallback summary must report its generated key count.");
assert.equal((await runtime.loadFallbackArchitectureV3BundledManifest()).keys.length, bundledKeyCount);
assert.equal(runtime.isDeferredFallbackArchitectureV3BundleLoaded(), false);
assert.equal(runtime.isEmptyHouseFallbackArchitectureV3BundleLoaded(), false);
assert.equal(runtime.isRelationshipFallbackArchitectureV3BundleLoaded(), false);
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
assert.throws(
  () => runtime.fallbackRendererV3.renderNatalEmptyHouse({
    house: 1,
    sign: "pisces",
    rulerHouse: 12,
    rulerSystem: "modern",
    voice: "Friend"
  }),
  /SOURCE_GAP/u,
  "Empty-house V14 copy must remain unavailable until its dedicated bundle loads."
);

assert.equal(await runtime.loadDeferredFallbackArchitectureV3Bundle(), true);
assert.equal(runtime.isDeferredFallbackArchitectureV3BundleLoaded(), true);
assert.equal(runtime.isEmptyHouseFallbackArchitectureV3BundleLoaded(), false);
assert.throws(
  () => runtime.fallbackRendererV3.renderNatalEmptyHouse({
    house: 1,
    sign: "pisces",
    rulerHouse: 12,
    rulerSystem: "modern",
    voice: "Friend"
  }),
  /SOURCE_GAP/u,
  "The transit/natal deferred bundle must not duplicate the empty-house corpus."
);

assert.equal(await runtime.loadEmptyHouseFallbackArchitectureV3Bundle(), true);
assert.equal(runtime.isEmptyHouseFallbackArchitectureV3BundleLoaded(), true);
const emptyHouseAfter = runtime.fallbackRendererV3.renderNatalEmptyHouse({
  house: 1,
  sign: "pisces",
  rulerHouse: 12,
  rulerSystem: "modern",
  voice: "Friend"
});
assert.equal(emptyHouseAfter.parts.length, 2);
assert.match(emptyHouseAfter.parts[0], /highly responsive to the atmosphere around them/u);
assert.match(emptyHouseAfter.parts[1], /Intuition, dreams, and solitude can become an enormous private world/u);
assert.deepEqual(emptyHouseAfter.sourceKeys, [
  "fallback-hook/empty-house/base/1",
  "fallback-hook/empty-house/sign/1/pisces",
  "fallback-hook/empty-house/rising-ruler/pisces/neptune/12"
]);
assert.equal(await runtime.loadEmptyHouseFallbackArchitectureV3Bundle(), false);

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
const compatibilityBefore = runtime.transitSynastryFallbackRendererV3.renderCompat({
  planet: "moon",
  signA: "aries",
  signB: "taurus",
  otherName: "Alex"
});
assert.equal(
  compatibilityBefore.templateKey,
  "fallback-template/compat.cross-sign",
  "The core bundle may compose the approved compatibility floor without downloading authored compatibility cards."
);
assert.equal(await runtime.loadDeferredFallbackArchitectureV3Bundle(), false);

assert.equal(await runtime.loadRelationshipFallbackArchitectureV3Bundle(), true);
assert.equal(runtime.isRelationshipFallbackArchitectureV3BundleLoaded(), true);
const compatibilityAfter = runtime.transitSynastryFallbackRendererV3.renderCompat({
  planet: "moon",
  signA: "aries",
  signB: "taurus",
  otherName: "Alex"
});
assert.equal(compatibilityAfter.contentKey, "authored/compat-deep/moon/aries/taurus");
assert.ok(compatibilityAfter.body.includes("Alex"));
assert.equal(await runtime.loadRelationshipFallbackArchitectureV3Bundle(), false);

console.log("Deferred fallback runtime parity passed.");
