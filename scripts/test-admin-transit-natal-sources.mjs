import "./test-transit-natal-editor-scope.mjs";
import "./test-transit-exact-isolation.mjs";
import "./test-admin-bond-effect-page.mjs";
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
    export { renderTransitNatalPreview, transitNatalExactContentKey, transitNatalLabel, transitNatalPlanets, transitNatalPoints, transitNatalAspects } from './apps/admin/src/transitNatalSources.ts';
    export { loadDeferredFallbackArchitectureV3Bundle, transitSynastryFallbackRendererV3 } from './apps/web/src/content/fallbackArchitectureV3Runtime.ts';
    export { installContentPublications } from './apps/web/src/content/contentPublicationState.ts';
  ` } });
  const runtime = await import(pathToFileURL(path.join(dir, "preview.mjs")));
  await runtime.loadDeferredFallbackArchitectureV3Bundle();
  assert.equal(runtime.transitNatalExactContentKey({ planet: "mercury", natalPoint: "ascendant", aspect: "square" }), "authored/transit-aspect/mercury/ascendant/square");
  assert.equal(runtime.transitNatalExactContentKey({ planet: "sun", natalPoint: "midheaven", aspect: "trine" }), "authored/transit-aspect/sun/midheaven/trine");
  assert.equal(runtime.transitNatalExactContentKey({ planet: "mercury", natalPoint: "ascendant", aspect: "square", sign: "aries", transitHouse: "1", natalHouse: "2" }), "authored/transit-aspect/mercury/ascendant/square/aries/1/2");
  const selection = { planet: "sun", sign: "virgo", transitHouse: "4", natalHouse: "4", natalPoint: "north-node", aspect: "conjunction" };
  for (const voice of ["you", "Alex"]) {
    const actual = runtime.renderTransitNatalPreview(selection, runtime.transitSynastryFallbackRendererV3, voice);
    const expected = runtime.transitSynastryFallbackRendererV3.renderTransitAspect({ transiting: "sun", natal: "north-node", aspect: "conjunction", sign: "virgo", voice, transitHouse: "4", natalHouse: "4" });
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
  // Audit every selectable aspect in both audiences; a source gap is valid, a
  // successful preview pointing at an unrelated template or absent key is not.
  const sourceKeys = new Set(parts.flatMap(part => [...(part.hookRows ?? []), ...(part.vocabularyRows ?? []), ...(part.templates ?? [])]).map(row => row.contentKey));
  read("bundled-transit-core-authored-cards-v3.json").authoredCards.forEach(row => sourceKeys.add(row.contentKey));
  let renderedCount = 0, gapCount = 0;
  for (const planet of runtime.transitNatalPlanets) for (const natalPoint of runtime.transitNatalPoints) for (const aspect of runtime.transitNatalAspects) for (const voice of ["you", "Alex"]) {
    const selected = { planet, natalPoint, aspect, sign: "capricorn" };
    let preview;
    try { preview = runtime.renderTransitNatalPreview(selected, runtime.transitSynastryFallbackRendererV3, voice); }
    catch (error) { assert.match(String(error), /SOURCE_GAP|No reader-eligible/); gapCount++; continue; }
    renderedCount++;
    assert.ok(preview.sourceKeys.length, JSON.stringify(selected));
    for (const key of preview.sourceKeys) assert.ok(sourceKeys.has(key), `Uneditable preview source ${key} for ${JSON.stringify(selected)}`);
    if (preview.sourceKeys.some(key => key.startsWith("fallback-hook/transit-effect-"))) {
      assert.ok(!preview.sourceKeys.includes("fallback-template/transit.aspect"), `Effect-first preview claims unused template: ${JSON.stringify(selected)}`);
    }
  }
  assert.ok(renderedCount > 500, "The audit must exercise the populated catalog, not only source gaps");
  console.log(`Transit source catalog: ${renderedCount} renderable selections, ${gapCount} explicit source gaps, both audiences.`);
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
