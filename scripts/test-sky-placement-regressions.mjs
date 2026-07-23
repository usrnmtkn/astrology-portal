#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import fallbackSourceRows from "../apps/web/src/content/fallbackArchitectureV3/source-rows/fallback-source-rows-v3.json" with { type: "json" };
import fallbackTemplates from "../apps/web/src/content/fallbackArchitectureV3/templates/fallback-templates-v3.json" with { type: "json" };
import transitSynastryRows from "../apps/web/src/content/fallbackArchitectureV3/source-rows/transit-synastry-rows-v1.json" with { type: "json" };
import {
  createTransitSynastryRenderer,
  PACKAGE_VERSION
} from "../apps/web/src/content/fallbackArchitectureV3/dist/tldr-content.js";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function read(relativePath) {
  return fs.readFileSync(path.join(repoRoot, relativePath), "utf8");
}

const app = read("apps/web/src/App.tsx");
const adminDashboard = read("apps/admin/src/GeneratedContentAdminDashboard.tsx");
const debugRuntime = read("apps/web/src/content/fallbackArchitectureV3Runtime.ts");
const writingSurfaceSourceMap = read("apps/admin/src/writingSurfaceSourceMap.ts");

const renderer = createTransitSynastryRenderer(transitSynastryRows, fallbackTemplates, fallbackSourceRows);
const sunLeo = renderer.renderSkyPlacement({ planet: "sun", sign: "leo" });

assert.equal(PACKAGE_VERSION, "v3-2026-07-23", "FallbackArchitectureV3 package version must expose the current imported stamp.");
assert.match(debugRuntime, /fallbackArchitectureV3PackageVersion/, "Runtime must export the package version for app/admin debug surfaces.");
assert.match(app, /Fallback package/, "App calculation diagnostics must show the fallback package version.");
assert.match(adminDashboard, /Fallback package/, "Admin dashboard must show the fallback package version.");

assert.equal(fs.existsSync(path.join(repoRoot, "apps/web/src/content/skyWriting.ts")), false, "Retired skyWriting.ts must not exist.");
assert.equal(fs.existsSync(path.join(repoRoot, "apps/web/src/content/sky-writing")), false, "Retired sky-writing source folder must not exist.");
assert.equal(fs.existsSync(path.join(repoRoot, "apps/web/src/content/skyContentSnapshot.json")), false, "Retired normalized Sky snapshot must not exist.");
assert.doesNotMatch(app, /skyWriting|resolveSkyWritingArticle|sky-writing-v1|skyContentSnapshot/u, "App reader surfaces must not reference retired Sky writing paths.");
assert.doesNotMatch(adminDashboard, /skyWriting|localSkySnapshot|skyContentSnapshot/u, "Admin must not expose retired local Sky snapshot rows.");
assert.doesNotMatch(writingSurfaceSourceMap, /sky-writing-v1|skyContentSnapshot/u, "Admin source map must not point at retired Sky writing sources.");

assert.match(app, /transitSynastryFallbackRendererV3\.renderSkyPlacement\(\{/, "Sky placement rendering must call the V3 package renderer.");
assert.match(app, /normalizeSkyPlacementSurface/, "Sky placement rendering must flow through the normalized surface path.");
assert.doesNotMatch(app, /sourceMode:\s*"fallback-only"/, "Sky package renderers must not use the retired fallback-only override flag.");

assert.equal(sunLeo.headline, "The Sun in Leo", "Package Sun-in-Leo headline must remain factual.");
assert.match(
  sunLeo.body,
  /You've been running on autopilot through a version of yourself that needs updating/,
  "Package Sun-in-Leo copy must come from dist/tldr-content.js."
);
assert.doesNotMatch(
  sunLeo.body,
  /(?:^|\n\n)(?!Wishing you )[^.\n]*warm light and generous shine,\s*$/iu,
  "Sky placement articles must not end with an incomplete trailing-comma blessing fragment."
);
assert.match(
  sunLeo.body.trim(),
  /Wishing you warm light and generous shine\.$/u,
  "Sun-in-Leo package copy should include the completed blessing sentence."
);
assert.doesNotMatch(
  sunLeo.body,
  /lamplight|The Sun crosses from Cancer into Leo|shell drawn around it/i,
  "Package Sun-in-Leo copy must not contain the retired rogue Leo passage."
);
assert.match(app, /return `\$\{skyDisplayPlanetName\(position\.planet\)\} Rx in \$\{position\.sign\}`;/, "Retrograde Sky ID title must stay factual in the app route.");

console.log(JSON.stringify({
  packageVersion: PACKAGE_VERSION,
  sunLeoHeadline: sunLeo.headline,
  sunLeoOpening: sunLeo.body.slice(0, 96),
  retrogradeTitlePath: "skyDisplayPlanetName(position.planet) Rx in position.sign"
}, null, 2));
