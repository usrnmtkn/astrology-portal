import assert from "node:assert/strict";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { build } from "esbuild";

const repoRoot = path.resolve(import.meta.dirname, "..");
const outFile = path.join(os.tmpdir(), `tldr-transit-aspect-v3-selection-${Date.now()}.mjs`);

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
      export { transitSynastryFallbackRendererV3 } from "./apps/web/src/content/fallbackArchitectureV3Runtime.ts";
    `
  }
});

const { transitSynastryFallbackRendererV3 } = await import(pathToFileURL(outFile));

function render(transiting, aspect, natal) {
  return transitSynastryFallbackRendererV3.renderTransitAspect({
    transiting,
    aspect,
    natal,
    window: "Until Jul 23, 2026"
  });
}

const oldChironCopy = /Something recent hit an old sore spot/i;

const plutoChiron = render("pluto", "square", "chiron");
assert.equal(
  plutoChiron.contentKey,
  "authored/transit-aspect/any/chiron/conjunction",
  "Pluto square Chiron should use the package's heavy-sharing Chiron fallthrough."
);
assert.equal(oldChironCopy.test(plutoChiron.parts.join("\n")), true, "Pluto square Chiron should render the approved heavy-sharing Chiron copy.");

const jupiterChiron = render("jupiter", "square", "chiron");
assert.equal(
  jupiterChiron.contentKey,
  "authored/transit-aspect/any/chiron/conjunction",
  "Jupiter square Chiron should use the package's heavy-sharing Chiron fallthrough."
);
assert.equal(oldChironCopy.test(jupiterChiron.parts.join("\n")), true, "Jupiter square Chiron should render the approved heavy-sharing Chiron copy.");
assert.equal(
  plutoChiron.parts.join("\n"),
  jupiterChiron.parts.join("\n"),
  "Heavy-sharing Chiron fallthrough should intentionally collapse these transit pairs to the same approved copy."
);

const venusAscendant = render("venus", "square", "ascendant");
assert.equal(
  venusAscendant.contentKey,
  "authored/transit-aspect/venus/ascendant/any",
  "Venus square Ascendant should resolve through the full transit/aspect/natal authored key."
);
assert.match(venusAscendant.parts.join("\n"), /People are warmer to you than usual today/i);
assert.equal(/close enough to read/i.test(venusAscendant.parts.join("\n")), false);

const venusDescendant = render("venus", "square", "descendant");
assert.equal(/close enough to read/i.test(venusDescendant.parts.join("\n")), false);
assert.match(venusDescendant.parts.join("\n"), /Venus is square your natal Descendant/i);

console.log("Transit aspect V3 selection contract passed.");
