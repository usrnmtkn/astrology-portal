import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";

import { build } from "esbuild";

import { renderTransitAspect as renderNodeTransitAspect } from "../apps/web/src/content/fallbackArchitectureV3/resolver/renderTransitSynastry.mjs";
import {
  createTransitSynastryRenderer as createShippedTransitSynastryRenderer,
  PACKAGE_VERSION
} from "../apps/web/src/content/fallbackArchitectureV3/dist/tldr-content.js";

const repoRoot = path.resolve(import.meta.dirname, "..");
const packageRoot = path.join(repoRoot, "apps/web/src/content/fallbackArchitectureV3");
const browserOutFile = path.join(os.tmpdir(), `tldr-transit-friend-name-anchor-${Date.now()}.mjs`);

await build({
  absWorkingDir: repoRoot,
  bundle: true,
  format: "esm",
  platform: "node",
  outfile: browserOutFile,
  write: true,
  logLevel: "silent",
  entryPoints: ["apps/web/src/content/fallbackArchitectureV3/resolver/index.browser.ts"]
});

const browserSource = await import(`${pathToFileURL(browserOutFile).href}?t=${Date.now()}`);
const transitLib = JSON.parse(fs.readFileSync(path.join(packageRoot, "source-rows/transit-synastry-rows-v1.json"), "utf8"));
const templatesFile = JSON.parse(fs.readFileSync(path.join(packageRoot, "templates/fallback-templates-v3.json"), "utf8"));
const rowsFile = JSON.parse(fs.readFileSync(path.join(packageRoot, "source-rows/fallback-source-rows-v3.json"), "utf8"));
const browserRenderer = browserSource.createTransitSynastryRenderer(transitLib, templatesFile, rowsFile);
const shippedRenderer = createShippedTransitSynastryRenderer(transitLib, templatesFile, rowsFile);

const facts = {
  transiting: "sun",
  natal: "ascendant",
  aspect: "square",
  sign: "virgo",
  voice: "Alisa P",
  window: "Until September 4"
};
const expectedOpening = "For Alisa P, someone pushes today";

for (const [label, render] of [
  ["Node resolver", renderNodeTransitAspect],
  ["browser source resolver", (input) => browserRenderer.renderTransitAspect(input)],
  ["shipped dist resolver", (input) => shippedRenderer.renderTransitAspect(input)]
]) {
  const result = render(facts);
  assert.equal(result.templateKey, "authored/transit-aspect", `${label}: approved explicit Friends copy must serve from the exact authored row.`);
  assert.equal(result.contentKey, "authored/transit-aspect/sun/ascendant/hard", `${label}: Friends copy must retain its exact source provenance.`);
  assert.ok(result.body.startsWith(expectedOpening), `${label}: the affected friend must be named in the first sentence.`);
  assert.doesNotMatch(result.body, /\b(?:you|your|yours|yourself|yourselves)\b/iu, `${label}: second-person copy must not leak into friend voice.`);
}

const readerResult = renderNodeTransitAspect({ ...facts, voice: "you" });
assert.equal(readerResult.contentKey, "authored/transit-aspect/sun/ascendant/hard", "Reader voice must retain the exact authored transit card.");
assert.equal(PACKAGE_VERSION, "v3-2026-09-01c", "The shipped package version must identify the stored Friends-copy boundary.");

const transitingBodies = ["sun", "moon", "mercury", "venus", "mars", "jupiter", "saturn", "uranus", "neptune", "pluto", "chiron", "lilith"];
const natalBodies = ["sun", "moon", "mercury", "venus", "mars", "jupiter", "saturn", "uranus", "neptune", "pluto", "ascendant", "midheaven"];
const aspects = ["conjunction", "opposition", "square", "trine", "sextile"];
let gridCount = 0;

for (const transiting of transitingBodies) {
  for (const natal of natalBodies) {
    for (const aspect of aspects) {
      const result = renderNodeTransitAspect({
        transiting,
        natal,
        aspect,
        sign: "virgo",
        voice: "Alisa P",
        window: "Until September 4"
      });
      const firstSentence = result.body.split(/(?<=[.!?])\s+/u)[0] ?? "";
      assert.ok(firstSentence.includes("Alisa P"), `${transiting}/${aspect}/${natal}: friend name must appear in the first sentence.`);
      assert.doesNotMatch(result.body, /\b(?:you|your|yours|yourself|yourselves)\b/iu, `${transiting}/${aspect}/${natal}: second-person copy must not leak.`);
      gridCount += 1;
    }
  }
}

assert.equal(gridCount, 720, "The friend-name gate must cover the complete supported transit grid.");

console.log(`Transit friend name anchor passed for Node, browser source, shipped dist, and ${gridCount} supported friend combinations.`);
