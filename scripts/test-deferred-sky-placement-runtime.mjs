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
const placementHouseRows = JSON.parse(fs.readFileSync(
  path.join(repoRoot, "apps/web/src/content/fallbackArchitectureV3/bundled-sky-placement-house-rows-v3.json"),
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
  exitDate: "August 23, 2026",
  priorSign: "cancer",
  priorSignEntryDate: "June 21, 2026",
  priorSignExitDate: "July 22, 2026",
  previousResidencyEntryDate: "July 22, 2025",
  previousResidencyExitDate: "August 22, 2025"
};
const moonTaurusFacts = {
  planet: "moon",
  sign: "taurus",
  entryDate: "August 4, 2026",
  exitDate: "August 7, 2026",
  events: [{
    type: "aspect",
    a: "moon",
    aSign: "taurus",
    b: "jupiter",
    bSign: "leo",
    aspect: "square",
    exactDate: "August 6, 2026"
  }]
};
const jupiterLeoFacts = {
  planet: "jupiter",
  sign: "leo",
  entryDate: "June 30, 2026",
  exitDate: "July 26, 2027",
  events: []
};

assert.equal(runtime.isSkyPlacementFallbackArchitectureV3BundleLoaded(), false);
assert.ok(placementRows.hookRows.length > 650, "The long-form placement package must stay in its deferred partition.");
assert.equal(
  placementRows.hookRows.filter((row) => row.contentKey.startsWith("fallback-hook/sky-placement-moves/")).length,
  0,
  "The deferred placement partition must not revive retired Try this rows."
);
assert.equal(
  placementManifest.keyCount,
  placementRows.hookRows.length + placementHouseRows.hookRows.length,
  "The deferred placement manifest must cover both on-demand placement chunks."
);

const before = runtime.transitSynastryFallbackRendererV3.renderSkyPlacement(facts);
assert.equal(before.templateKey, "sky-placement-standalone-hook-v1");
assert.equal(before.contentKey, "fallback-hook/sky-placement-sign/sun/leo");
assert.doesNotMatch(before.body, /\{\{/u, "The eager reader-safety floor must always be renderable.");
assert.throws(
  () => runtime.transitSynastryFallbackRendererV3.renderSkyPlacement(moonTaurusFacts),
  /SOURCE_GAP/u,
  "The exact Moon sign-entry unit must remain in the deferred placement partition."
);

const concurrentLoads = await Promise.all([
  runtime.loadSkyPlacementFallbackArchitectureV3Bundle(),
  runtime.loadSkyPlacementFallbackArchitectureV3Bundle()
]);
assert.deepEqual(concurrentLoads, [true, true], "Concurrent route requests must share the same placement load.");
assert.equal(runtime.isSkyPlacementFallbackArchitectureV3BundleLoaded(), true);

for (let house = 1; house <= 12; house += 1) {
  const renderedHouse = runtime.transitSynastryFallbackRendererV3.renderSkyPlacementHouseCore({
    planet: "uranus",
    sign: "gemini",
    house
  });
  assert.match(
    renderedHouse.body,
    new RegExp(`Uranus in Gemini moves through your ${house}(?:st|nd|rd|th) house`, "u"),
    `The deferred reader bundle must preserve the Uranus in Gemini house ${house} runtime contract.`
  );
}

const after = runtime.transitSynastryFallbackRendererV3.renderSkyPlacement(facts);
assert.equal(after.templateKey, "sky-placement-continuous-v2");
assert.equal(after.contentKey, "fallback-hook/sky-sign-copy/sun/leo");
assert.match(after.body, /^July 22 to August 23, 2026/mu);
assert.match(after.body, /The Sun enters Leo on July 22/u);
assert.match(after.body, /the work reaches the audience it was made for/u);
assert.match(after.body, /Before August 23/u);
assert.doesNotMatch(after.body, /\{\{/u, "Engine-owned local-time slots must resolve after the partition loads.");
const moonTaurusAfter = runtime.transitSynastryFallbackRendererV3.renderSkyPlacement(moonTaurusFacts);
assert.equal(moonTaurusAfter.templateKey, "sky-placement-moon-entry-v1");
assert.equal(moonTaurusAfter.contentKey, "fallback-hook/sky-placement-hook/moon/taurus");
assert.match(moonTaurusAfter.body, /The Moon in Taurus squares Jupiter in Leo on August 6\./u);
assert.doesNotMatch(moonTaurusAfter.body, /\{\{/u);
const jupiterLeoAfter = runtime.transitSynastryFallbackRendererV3.renderSkyPlacement(jupiterLeoFacts);
assert.match(jupiterLeoAfter.body, /For about a year, Jupiter in Leo makes it harder to hide/u);
assert.match(jupiterLeoAfter.body, /somebody nearby to provide it\.$/u);
assert.match(
  runtime.transitSynastryFallbackRendererV3.renderSkyPlacementHouseCore({
    planet: "jupiter",
    sign: "leo",
    house: 7
  }).body,
  /Let people love you loudly this year/u
);
assert.equal(await runtime.loadSkyPlacementFallbackArchitectureV3Bundle(), false);

console.log("Deferred Sky Placement runtime parity passed.");
