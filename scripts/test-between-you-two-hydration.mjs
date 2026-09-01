#!/usr/bin/env node
import assert from "node:assert/strict";
import * as fallbackRuntime from "../apps/web/src/content/fallbackArchitectureV3Runtime.ts";

await fallbackRuntime.loadRelationshipFallbackArchitectureV3Bundle();

const contentKey = "fallback-hook/bond-effect-trine/venus";
const bodyYou = "{{holder1}} remembers the reader-side detail after hydration.";
const bodyThey = "You remember the friend-side detail {{holder1}} shared after hydration.";

fallbackRuntime.installFallbackArchitectureV3Bundle({
  transitLib: { authoredCards: [] },
  templatesFile: { templates: [] },
  rowsFile: {
    hookRows: [{
      contentKey,
      content_role: "fallback_hook",
      review_status: "approved",
      body_you: bodyYou,
      body_they: bodyThey
    }],
    vocabularyRows: []
  }
});

const friendEndpoint = fallbackRuntime.transitSynastryFallbackRendererV3.renderBondTransit({
  transiting: "venus",
  aspect: "trine",
  endpointPlanet: "mars",
  endpointOwner: "friend",
  activatedPlanets: ["sun"],
  otherName: "Alisa",
  sign: "libra",
  window: "Until September 6"
});

assert.equal(friendEndpoint.contentKey, contentKey);
assert.equal(
  friendEndpoint.parts[0],
  "You remember the friend-side detail Alisa shared after hydration.",
  "A hydrated relationship override must render body_they when the friend's chart is contacted."
);

const readerEndpoint = fallbackRuntime.transitSynastryFallbackRendererV3.renderBondTransit({
  transiting: "venus",
  aspect: "trine",
  endpointPlanet: "mars",
  endpointOwner: "reader",
  activatedPlanets: ["sun"],
  otherName: "Alisa",
  sign: "libra",
  window: "Until September 6"
});

assert.equal(readerEndpoint.contentKey, contentKey);
assert.equal(
  readerEndpoint.parts[0],
  "Alisa remembers the reader-side detail after hydration.",
  "A hydrated relationship override must render body_you when the reader's chart is contacted."
);

console.log("Between You Two dashboard hydration override and directional voice passed.");
