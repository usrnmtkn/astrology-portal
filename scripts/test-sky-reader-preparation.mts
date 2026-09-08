import assert from "node:assert/strict";
import { performance } from "node:perf_hooks";
import { skyPlacementSourceCorpus as corpus } from "../api/_lib/sky-placement-sources";
import { createSkyV4ReaderRoute, renderSkyV4ReaderRoute } from "../apps/web/src/content/fallbackArchitectureV3/resolver/skyPlacementV4Canonical.mjs";
import { createSkyV4ReaderRoute as shippedFactory } from "../apps/web/src/content/fallbackArchitectureV3/dist/tldr-content.js";
import { build } from "esbuild";

const inputs = [
  { route: "placement", planet: "saturn", sign: "aries", isRetrograde: true },
  { route: "placement", planet: "sun", sign: "virgo" },
  { route: "placement", planet: "saturn", sign: "aries", articleAvailable: false },
  { route: "new-moon", sign: "virgo" },
  { route: "full-moon", sign: "pisces" },
  { route: "node-axis", northSign: "pisces", southSign: "virgo" }
];
const built = await build({ entryPoints: ["apps/web/src/content/fallbackArchitectureV3/resolver/index.browser.ts"], bundle: true, platform: "node", format: "esm", write: false });
const browserSource = await import(`data:text/javascript;base64,${Buffer.from(built.outputFiles[0].text).toString("base64")}`);
const expected = inputs.map(input => renderSkyV4ReaderRoute(corpus, input));
for (const factory of [createSkyV4ReaderRoute, browserSource.createSkyV4ReaderRoute, shippedFactory]) {
  const mutable = structuredClone(corpus);
  const prepared = factory(mutable);
  inputs.forEach((input, index) => assert.deepEqual(prepared(input), expected[index]));
  mutable.content.continuous.find((row: any) => row.contentKey === "sky-placement/article/saturn/aries").placementArticle = "Changed after snapshot";
  assert.deepEqual(prepared(inputs[0]), expected[0], "caller mutation must not bypass snapshot validation");
  assert.throws(() => prepared({ ...inputs[0], draftFields: { placementArticle: "not published" } }), /READER_BOUNDARY/);
  assert.throws(() => prepared({ contentKey: "sky-v4/template/continuous" }), /NOT_RELEASED/);
}
const start = performance.now();
for (let i = 0; i < 10; i++) renderSkyV4ReaderRoute(corpus, inputs[i % inputs.length]);
const before = performance.now() - start;
const prepared = createSkyV4ReaderRoute(corpus);
const next = performance.now();
for (let i = 0; i < 10; i++) prepared(inputs[i % inputs.length]);
const after = performance.now() - next;
assert(after < before / 3, "prepared rendering must eliminate repeated full-corpus work");
console.log(`PASS Node/browser-source/shipped parity and immutable snapshots; 10 readings: ${before.toFixed(1)}ms → ${after.toFixed(1)}ms`);
