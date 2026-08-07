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
      export {
        loadDeferredFallbackArchitectureV3Bundle,
        transitSynastryFallbackRendererV3,
        transitV3SameBeatKeyForContentKey
      } from "./apps/web/src/content/fallbackArchitectureV3Runtime.ts";
    `
  }
});

const runtime = await import(pathToFileURL(outFile));
await runtime.loadDeferredFallbackArchitectureV3Bundle();
const { transitSynastryFallbackRendererV3, transitV3SameBeatKeyForContentKey } = runtime;

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
  "authored/transit-aspect/pluto/chiron/square",
  "Pluto square Chiron should use its exact Phase 1 authored unit."
);
assert.equal(oldChironCopy.test(plutoChiron.parts.join("\n")), false, "Pluto square Chiron must not render the retired planet-agnostic Chiron copy.");

const plutoTrineChiron = render("pluto", "trine", "chiron");
assert.equal(
  plutoTrineChiron.contentKey,
  "authored/transit-aspect/pluto/chiron/trine",
  "Pluto trine Chiron should use its exact Phase 1 authored unit."
);
assert.equal(oldChironCopy.test(plutoTrineChiron.parts.join("\n")), false, "Pluto trine Chiron must not render the retired planet-agnostic Chiron copy.");
assert.match(plutoTrineChiron.parts.join("\n"), /easier to excavate on your own terms/i);

const neptuneSextileChiron = render("neptune", "sextile", "chiron");
assert.equal(
  neptuneSextileChiron.contentKey,
  "authored/transit-aspect/neptune/chiron/sextile",
  "Neptune sextile Chiron should use its exact Phase 1 authored unit."
);
assert.equal(oldChironCopy.test(neptuneSextileChiron.parts.join("\n")), false, "Neptune sextile Chiron must not render the retired planet-agnostic Chiron copy.");
assert.match(neptuneSextileChiron.parts.join("\n"), /leaves a door open at your sore spot/i);

const jupiterChiron = render("jupiter", "square", "chiron");
assert.equal(
  jupiterChiron.contentKey,
  "authored/transit-aspect/jupiter/chiron/square",
  "Jupiter square Chiron should use its exact Phase 1 authored unit."
);
assert.equal(oldChironCopy.test(jupiterChiron.parts.join("\n")), false, "Jupiter square Chiron must not render the retired planet-agnostic Chiron copy.");
assert.notEqual(
  plutoChiron.parts.join("\n"),
  jupiterChiron.parts.join("\n"),
  "Different transiting bodies must render distinct Chiron copy."
);

const venusAscendant = render("venus", "square", "ascendant");
assert.equal(
  venusAscendant.contentKey,
  "authored/transit-aspect/venus/ascendant/hard",
  "Venus square Ascendant should resolve through the current authored hard-contact unit."
);
assert.match(venusAscendant.parts.join("\n"), /The complaint gets swallowed to keep things nice/i);
assert.equal(/close enough to read/i.test(venusAscendant.parts.join("\n")), false);

const venusDescendant = render("venus", "square", "descendant");
assert.equal(/close enough to read/i.test(venusDescendant.parts.join("\n")), false);
assert.match(venusDescendant.parts.join("\n"), /Venus is squaring your natal Descendant/i);

function renderedParts(result) {
  return result.parts.join("\n");
}

const readerMetadataPattern = /\*?\s*(?:Anchor|Flag|Source|Corpus):/i;

const marsNorthNode = render("mars", "square", "north-node");
assert.equal(
  marsNorthNode.contentKey,
  undefined,
  "Non-conjunction node contacts should stay on the current fallback lane."
);
assert.match(renderedParts(marsNorthNode), /Mars is squaring your natal North Node/i);
assert.equal(
  readerMetadataPattern.test(renderedParts(marsNorthNode)),
  false,
  "Reader-facing transit cards must not expose editorial Anchor/Flag/Source/Corpus notes."
);
const marsNodalAxis = render("mars", "square", "nodal-axis");
assert.match(renderedParts(marsNodalAxis), /There's one conversation, skill, or truth/i);
assert.equal(
  readerMetadataPattern.test(renderedParts(marsNodalAxis)),
  false,
  "Nodal-axis transit cards must not expose editorial metadata."
);
assert.equal(
  transitV3SameBeatKeyForContentKey(venusAscendant.contentKey),
  null,
  "Unrelated transit aspect cards should not receive a same-beat selection key."
);

const friendSunMars = transitSynastryFallbackRendererV3.renderTransitAspect({
  transiting: "sun",
  aspect: "square",
  natal: "mars",
  voice: "Chris",
  window: "Until July 30"
});
assert.equal(friendSunMars.contentKey, "authored/transit-aspect/sun/mars/hard");
assert.match(renderedParts(friendSunMars), /The temper is close to the surface/u);
assert.match(renderedParts(friendSunMars), /The Sun square Chris's Mars until July 30/u);
assert.doesNotMatch(renderedParts(friendSunMars), /\byou(?:r|rs|self)?\b/iu);
assert.doesNotMatch(renderedParts(friendSunMars), /wants the spotlight to land and stay/u);

const friendSunSun = transitSynastryFallbackRendererV3.renderTransitAspect({
  transiting: "sun",
  aspect: "opposition",
  natal: "sun",
  voice: "Chris",
  window: "Until July 31"
});
assert.equal(friendSunSun.contentKey, "authored/transit-aspect/sun/sun/hard");
assert.match(renderedParts(friendSunSun), /A plan they assumed was finished gets handed back with questions/u);
assert.notEqual(
  renderedParts(friendSunSun),
  renderedParts(friendSunMars),
  "Adjacent Sun transit cards with different natal targets must not reuse the same body."
);

const friendBond = transitSynastryFallbackRendererV3.renderBondTransit({
  transiting: "lilith",
  aspect: "trine",
  endpointPlanet: "ascendant",
  endpointOwner: "friend",
  activatedPlanets: ["ascendant"],
  otherName: "Chris",
  sign: "sagittarius",
  window: "Until August 1"
});
assert.match(
  renderedParts(friendBond),
  /^It is easier to say the opinion, preference, or refusal you usually soften around each other/u
);
assert.match(
  renderedParts(friendBond),
  /Lilith in Sagittarius is trine Chris's Ascendant until August 1, activating the connection it makes with your Ascendant\.$/u
);
assert.doesNotMatch(renderedParts(friendBond), /That line is one of|How you come across meets/u);

const friendBondVariantBodies = [undefined, 2, 3].map((variant) => renderedParts(
  transitSynastryFallbackRendererV3.renderBondTransit({
    transiting: "lilith",
    aspect: "trine",
    endpointPlanet: "ascendant",
    endpointOwner: "friend",
    activatedPlanets: ["ascendant"],
    otherName: "Chris",
    sign: "sagittarius",
    variant,
    window: "Until August 1"
  })
));
assert.equal(
  new Set(friendBondVariantBodies).size,
  3,
  "The three Lilith bond slots must provide distinct preview language."
);

const friendLilithAscendant = transitSynastryFallbackRendererV3.renderTransitAspect({
  transiting: "lilith",
  aspect: "trine",
  natal: "ascendant",
  sign: "sagittarius",
  voice: "Chris",
  window: "Until August 1"
});
assert.match(renderedParts(friendLilithAscendant), /^Their first impressions, the style they lead with, and how they meet the world drop the polite filter/u);
assert.match(renderedParts(friendLilithAscendant), /Lilith in Sagittarius is trining Chris's natal Ascendant until August 1\.$/u);
assert.doesNotMatch(renderedParts(friendLilithAscendant), /In plain terms/u);

console.log("Transit aspect V3 selection contract passed.");
