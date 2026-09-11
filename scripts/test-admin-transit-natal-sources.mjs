import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { build } from "esbuild";

const dir = fs.mkdtempSync(path.join(os.tmpdir(), "studio-transit-preview-"));
try {
  await build({ bundle: true, platform: "node", format: "esm", outfile: path.join(dir, "preview.mjs"), logLevel: "silent", define: { "import.meta.env": "{}" }, stdin: { resolveDir: process.cwd(), contents: `
    export { createTransitSynastryRenderer } from './apps/web/src/content/fallbackArchitectureV3/resolver/renderTransitSynastry.browser.ts';
    export { renderTransitNatalPreview, transitNatalLabel } from './apps/admin/src/transitNatalSources.ts';
    export { loadDeferredFallbackArchitectureV3Bundle, transitSynastryFallbackRendererV3 } from './apps/web/src/content/fallbackArchitectureV3Runtime.ts';
    export { installContentPublications } from './apps/web/src/content/contentPublicationState.ts';
  ` } });
  const runtime = await import(pathToFileURL(path.join(dir, "preview.mjs")));
  await runtime.loadDeferredFallbackArchitectureV3Bundle();
  const selection = { planet: "sun", sign: "virgo", transitHouse: "4", natalHouse: "4", natalPoint: "north-node", aspect: "conjunction" };
  for (const voice of ["you", "Alex"]) {
    const actual = runtime.renderTransitNatalPreview(selection, runtime.transitSynastryFallbackRendererV3, voice);
    const expected = runtime.transitSynastryFallbackRendererV3.renderTransitAspect({ transiting: "sun", natal: "north-node", aspect: "conjunction", sign: "virgo", voice });
    assert.equal(actual.body, expected.parts.join("\n\n"));
    assert.ok(actual.sourceKeys.includes(expected.contentKey));
    assert.deepEqual(runtime.renderTransitNatalPreview({ ...selection, transitHouse: "10", natalHouse: "8" }, runtime.transitSynastryFallbackRendererV3, voice), actual);
  }
  const lilith = { ...selection, planet: "lilith", sign: "capricorn", natalPoint: "north-node", aspect: "trine" };
  const facts = { transiting: "lilith", sign: "capricorn", natal: "north-node", aspect: "trine", voice: "you" };
  const base = "apps/web/src/content/fallbackArchitectureV3/";
  const read = name => JSON.parse(fs.readFileSync(base + name, "utf8"));
  const parts = ["bundled-sky-core-rows-v3.json", "bundled-initial-reader-rows-v3.json", "bundled-deferred-core-rows-v3.json", "bundled-shared-placement-rows-v3.json"].map(read);
  const sourceRenderer = runtime.createTransitSynastryRenderer(read("bundled-transit-core-authored-cards-v3.json"), {templates:parts[1].templates}, {hookRows:parts.flatMap(p=>p.hookRows??[]), vocabularyRows:parts.flatMap(p=>p.vocabularyRows??[])});
  const nodeRenderer = await import(pathToFileURL(path.resolve(base + "resolver/renderTransitSynastry.mjs")));
  const shipped = runtime.renderTransitNatalPreview(lilith, runtime.transitSynastryFallbackRendererV3);
  for (const actual of [sourceRenderer.renderTransitAspect(facts), nodeRenderer.renderTransitAspect(facts)]) {
    assert.equal(actual.body, shipped.body);
    assert.deepEqual(actual.sourceKeys, shipped.sourceKeys);
  }
  assert.deepEqual(shipped.sourceKeys, ["fallback-hook/transit-effect-soft/lilith", "fallback-vocab/planet-topic/north-node"]);
  const mars = { ...selection, planet: "mars", natalPoint: "mars" };
  assert.equal(runtime.renderTransitNatalPreview(mars, runtime.transitSynastryFallbackRendererV3).body, runtime.transitSynastryFallbackRendererV3.renderTransitReturn({ planet: "mars" }).parts.join("\n\n"));
  const key = "authored/transit-aspect/sun/north-node/conjunction";
  runtime.installContentPublications([{ content_key: key, state: "retired", revision: 1, row_id: null, row_updated_at: null, updated_at: "2026-09-10T00:00:00Z" }]);
  assert.throws(() => runtime.renderTransitNatalPreview(selection, runtime.transitSynastryFallbackRendererV3), /SOURCE_GAP/u);
  const source = fs.readFileSync("apps/admin/src/TransitNatalReaderPreview.tsx", "utf8");
  assert.match(source, /api\/admin\/transit-natal-preview/u);
  assert.match(source, /subscribeToContentUpdates/u);
  assert.doesNotMatch(source, /skySourceForCandidates|packageDraft/u);
  console.log("Studio transit preview passed: shared shipped resolver, You/Friends copy, house independence, returns, and retirement.");
} finally { fs.rmSync(dir, { recursive: true, force: true }); }
