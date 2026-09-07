import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { createServer } from "vite";
import { skyPlacementMotionCopy, skyPlacementMotionParts } from "../apps/web/src/content/skyPlacementMotion.ts";
import * as source from "../apps/web/src/content/fallbackArchitectureV3/resolver/skyPlacementV4Canonical.mjs";
import * as shipped from "../apps/web/src/content/fallbackArchitectureV3/dist/tldr-content.js";

const root = process.cwd();
const dir = "apps/web/src/content/fallbackArchitectureV3/authored-inputs/";
const read = (name: string) => JSON.parse(fs.readFileSync(dir + name + ".json", "utf8"));
const chunks = [1, 2, 3, 4].map(n => read(`sky-v4-continuous-corpus-correction-v1-chunk-${n}`));
const corpus = source.applySkyV4ContinuousCorpusCorrection(read("sky-v4-canonical-content-studio-stage-v1"), {
  ...read("sky-v4-continuous-corpus-correction-v1"), chunks, records: chunks.flatMap(c => c.records)
});
const outputs: unknown[] = [];
for (const implementation of [source, shipped]) {
  const renderer = { renderRoute: (input: Record<string, unknown>) => implementation.renderSkyV4ReaderRoute(corpus, input) };
  const cases = [];
  for (const planet of ["mercury", "venus", "mars", "jupiter", "saturn", "uranus", "neptune", "pluto", "chiron"]) {
    for (const sign of ["aries", "taurus", "aquarius"]) {
      const input = { route: "placement", planet, sign, aspects: [], contexts: [] };
      const direct = renderer.renderRoute(input);
      const rx = renderer.renderRoute({ ...input, isRetrograde: true });
      const modifier = skyPlacementMotionCopy(planet, true, renderer)!;
      assert.ok(modifier.body);
      assert.equal(rx.contentKey, direct.contentKey, "The stable base identity does not encode today's motion.");
      assert.equal(rx.readerParts[0], modifier.body, "Rx guidance must lead the preview and article.");
      assert.deepEqual(rx.readerParts.slice(1), direct.readerParts, "All base units remain intact and ordered.");
      assert.deepEqual(skyPlacementMotionParts(rx.readerParts, modifier), rx.readerParts, "No duplicate Rx modifier.");
      assert.deepEqual(skyPlacementMotionParts(direct.readerParts, modifier), rx.readerParts, "Fallback receives the same complete modifier.");
      assert.equal(skyPlacementMotionCopy(planet, false, renderer), null, "Direct/archive copy has no current modifier.");
      cases.push(rx.readerParts);
    }
  }
  outputs.push(cases);
}
assert.deepEqual(outputs[0], outputs[1], "Shared source and shipped resolver must agree.");
assert.equal(skyPlacementMotionCopy("neptune", true, { renderRoute() { throw new Error("SKY_V4_SOURCE_GAP: unavailable"); } }), null);
assert.equal(skyPlacementMotionCopy("neptune", true, { renderRoute() { return { servingEnabled: false, readerParts: ["draft"] }; } }), null);
assert.equal(skyPlacementMotionCopy("neptune", true, { renderRoute() { return { servingEnabled: true, versionStatus: "approved-serving-baseline", contentKey: "wrong", readerParts: ["wrong identity"] }; } }), null);

// Exercise the actual app adapter and its lazy content bundle, not a reimplementation.
const vite = await createServer({
  root: path.join(root, "apps/web"), appType: "custom", logLevel: "silent", server: { middlewareMode: true },
  plugins: [{ name: "sky-motion-test-exports", enforce: "pre", transform(code, id) {
    if (id.endsWith("/src/App.tsx")) return code + "\nexport { currentSkyPlacementDetailArticle, normalizeSkyPlacementSurface, normalizedSurfacePreview, currentSkyAspectDetailArticle, normalizeSkyAspectSurface, loadContentRegistry };";
    if (id.includes("/fallbackArchitectureV3/authored-inputs/") && id.endsWith(".json?url")) {
      return `export default ${fs.readFileSync(id.slice(0, -4), "utf8")};`;
    }
  } }]
});
try {
  const app = await vite.ssrLoadModule("/src/App.tsx");
  const runtime = await vite.ssrLoadModule("/src/content/fallbackArchitectureV3Runtime.ts");
  await runtime.loadSkyPlacementFallbackArchitectureV3Bundle();
  const position = {
    planet: "Neptune", sign: "Aries", glyph: "♆", signGlyph: "♈", degree: 3.5, house: 1, motion: "retrograde",
    transitStart: "2026-01-26T12:00:00Z", transitEnd: "2039-03-23T12:00:00Z", transitTimeZone: "UTC",
    retrogradeStart: "2026-07-07T12:00:00Z", retrogradeEnd: "2026-12-12T12:00:00Z"
  };
  const args = { position, positions: [position], aspects: [], generatedAt: "2026-09-07T12:00:00Z", generatedContent: new Map() };
  const rx = app.currentSkyPlacementDetailArticle(args);
  assert.equal(rx.title, "Neptune Rx in Aries");
  assert.match(rx.residencyDuration, /2039/);
  assert.equal(rx.duration, "Jul 7, 2026 - Dec 12, 2026");
  assert.ok(rx.sections[0].body.includes(skyPlacementMotionCopy("neptune", true, runtime.skyV4ReaderRenderer)!.body));
  assert.equal(rx.tldr, skyPlacementMotionCopy("neptune", true, runtime.skyV4ReaderRenderer)?.body);
  const direct = app.currentSkyPlacementDetailArticle({ ...args, position: { ...position, motion: "direct" } });
  assert.equal(direct.title, "Neptune in Aries");
  assert.equal(direct.retrograde, false);
  assert.equal(direct.residencyDuration, undefined);
  const archive = app.currentSkyPlacementDetailArticle({ ...args, articleMode: "archive" });
  assert.equal(archive.title, "Neptune in Aries");
  assert.equal(archive.tldr, undefined);
  await runtime.loadDeferredFallbackArchitectureV3Bundle();
  await app.loadContentRegistry("sky");
  let coreAspect: unknown;
  for (const fromMotion of ["direct", "retrograde"]) for (const toMotion of ["direct", "retrograde"]) {
    const aspect = { from: "Neptune", to: "Pluto", type: "sextile", orb: 0,
      fromSign: "Aries", toSign: "Aquarius", fromMotion, toMotion, exactAt: "2026-09-09T00:00:00Z" };
    const article = app.currentSkyAspectDetailArticle(aspect, aspect.exactAt, new Map());
    assert.equal(article.title, `Neptune${fromMotion === "retrograde" ? " Rx" : ""} Sextile Pluto${toMotion === "retrograde" ? " Rx" : ""}`);
    const normalized = app.normalizeSkyAspectSurface(aspect, new Map());
    if (!coreAspect) coreAspect = normalized;
    else assert.deepEqual(normalized, coreAspect, "Motion must not change core copy or its source keys.");
    assert.ok(normalized.sections.length, "The shared core must resolve.");
  }
  const originalReader = runtime.skyV4ReaderRenderer.renderRoute;
  runtime.skyV4ReaderRenderer.renderRoute = () => { throw new Error("SKY_V4_SOURCE_GAP: test unavailable"); };
  const missing = app.currentSkyPlacementDetailArticle(args);
  assert.equal(missing.body.length, 0, "No direct-only placement copy on an Rx source gap.");
  runtime.skyV4ReaderRenderer.renderRoute = originalReader;
  console.log("Sky Rx: PASS — 27 placements, source/dist parity, complete modifiers, direct/archive, current app adapter, and fail-closed gaps.");
} finally { await vite.close(); }
