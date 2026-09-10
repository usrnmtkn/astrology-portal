import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { build } from "esbuild";

const dir = fs.mkdtempSync(path.join(os.tmpdir(), "studio-transit-preview-"));
try {
  await build({ bundle: true, platform: "node", format: "esm", outfile: path.join(dir, "preview.mjs"), logLevel: "silent", define: { "import.meta.env": "{}" }, stdin: { resolveDir: process.cwd(), contents: `
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
  const mars = { ...selection, planet: "mars", natalPoint: "mars" };
  assert.equal(runtime.renderTransitNatalPreview(mars, runtime.transitSynastryFallbackRendererV3).body, runtime.transitSynastryFallbackRendererV3.renderTransitReturn({ planet: "mars" }).parts.join("\n\n"));
  const key = "authored/transit-aspect/sun/north-node/conjunction";
  runtime.installContentPublications([{ content_key: key, state: "retired", revision: 1, row_id: null, row_updated_at: null, updated_at: "2026-09-10T00:00:00Z" }]);
  assert.throws(() => runtime.renderTransitNatalPreview(selection, runtime.transitSynastryFallbackRendererV3), /SOURCE_GAP/u);
  const source = fs.readFileSync("apps/admin/src/TransitNatalReaderPreview.tsx", "utf8");
  assert.match(source, /loadFallbackArchitectureV3DashboardBundle/u);
  assert.match(source, /subscribeToContentUpdates/u);
  assert.doesNotMatch(source, /skySourceForCandidates|packageDraft/u);
  console.log("Studio transit preview passed: shared shipped resolver, You/Friends copy, house independence, returns, and retirement.");
} finally { fs.rmSync(dir, { recursive: true, force: true }); }
