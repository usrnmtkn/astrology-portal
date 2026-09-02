import assert from "node:assert/strict";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { build } from "esbuild";

const repoRoot = path.resolve(import.meta.dirname, "..");
const outFile = path.join(os.tmpdir(), `tldr-friends-transit-dashboard-override-${Date.now()}.mjs`);

await build({
  absWorkingDir: repoRoot,
  bundle: true,
  format: "esm",
  platform: "node",
  outfile: outFile,
  write: true,
  logLevel: "silent",
  stdin: {
    resolveDir: repoRoot,
    loader: "tsx",
    contents: `
      export {
        installFallbackArchitectureV3Bundle,
        loadDeferredFallbackArchitectureV3Bundle,
        transitSynastryFallbackRendererV3
      } from "./apps/web/src/content/fallbackArchitectureV3Runtime.ts";
    `
  }
});

const runtime = await import(pathToFileURL(outFile));
await runtime.loadDeferredFallbackArchitectureV3Bundle();

const renderVenusMoon = () => runtime.transitSynastryFallbackRendererV3.renderTransitAspect({
  transiting: "venus",
  aspect: "square",
  natal: "moon",
  voice: "Alisa P",
  window: "Until September 6"
});

const before = renderVenusMoon();
assert.equal(before.contentKey, "authored/transit-aspect/venus/moon/hard");
assert.doesNotMatch(before.parts.join("\n"), /CONTENT STUDIO VENUS MOON OVERRIDE MARKER/u);

runtime.installFallbackArchitectureV3Bundle({
  transitLib: {
    authoredCards: [{
      contentKey: "authored/transit-aspect/venus/moon/hard",
      content_role: "full_copy",
      review_status: "approved",
      body: "CONTENT STUDIO VENUS MOON OVERRIDE MARKER."
    }]
  },
  templatesFile: { templates: [] },
  rowsFile: { hookRows: [], vocabularyRows: [] }
});

const after = renderVenusMoon();
assert.equal(after.contentKey, "authored/transit-aspect/venus/moon/hard");
assert.match(
  after.parts.join("\n"),
  /CONTENT STUDIO VENUS MOON OVERRIDE MARKER/u,
  "An approved Content Studio transit revision must override the bundled Friends Transit card."
);
assert.notEqual(after.parts.join("\n"), before.parts.join("\n"));

console.log("Friends Transit dashboard override contract passed.");
