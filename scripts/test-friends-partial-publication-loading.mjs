import { build } from "esbuild";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

const directory = await mkdtemp(join(tmpdir(), "friends-publication-test-"));
try {
  const outfile = join(directory, "test.mjs");
  await build({
    stdin: {
      contents: `
        import assert from "node:assert/strict";
        import * as runtime from "./apps/web/src/content/fallbackArchitectureV3Runtime.ts";
        const facts = { planetA: "sun", planetB: "ascendant", aspect: "sextile", otherName: "Nikki", romanticAllowed: false };
        runtime.installFallbackArchitectureV3Bundle({
          transitLib: { authoredCards: [] }, templatesFile: { templates: [] },
          rowsFile: { hookRows: [], vocabularyRows: [] }
        });
        assert.equal(runtime.isRelationshipFallbackArchitectureV3BundleLoaded(), false);
        assert.equal(await runtime.loadRelationshipFallbackArchitectureV3Bundle(), true);
        assert.equal(runtime.isRelationshipFallbackArchitectureV3BundleLoaded(), true);
        const rendered = runtime.transitSynastryFallbackRendererV3.renderSynastryAspect(facts);
        assert.equal(rendered.contentKey, "fallback-hook/synastry-pair/sun/ascendant/soft");
        assert.ok(rendered.body.trim().length > 0);
        assert.equal(await runtime.loadRelationshipFallbackArchitectureV3Bundle(), false);
        console.log("Partial dashboard publication preserves deferred approved relationship content.");
      `,
      resolveDir: process.cwd(), sourcefile: "friends-publication-test.ts"
    },
    bundle: true, platform: "node", format: "esm",
    define: { "import.meta.env": "{}" }, outfile, logLevel: "silent"
  });
  await import(pathToFileURL(outfile).href);
} finally {
  await rm(directory, { recursive: true, force: true });
}
