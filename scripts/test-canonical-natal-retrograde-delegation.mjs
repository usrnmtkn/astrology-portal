#!/usr/bin/env node
import assert from "node:assert/strict";

import { createCanonicalNatalAdapter } from "../apps/web/src/content/canonicalContent/natalAdapter.ts";

let canonicalReads = 0;
let legacyFacts = null;
const legacyRenderer = {
  renderNatalPlacement(facts) {
    legacyFacts = facts;
    return {
      headline: "legacy retrograde placement",
      body: "legacy retrograde placement",
      parts: ["legacy retrograde placement"],
      templateKey: "fallback-hook/natal-you-placement-complete-final/jupiter/leo/3/retrograde",
      provenanceTier: "exact-owner-approved"
    };
  },
  renderNatalAspect() {
    throw new Error("not used");
  },
  renderNatalEmptyHouse() {
    throw new Error("not used");
  }
};

const adapter = createCanonicalNatalAdapter({
  enabled: true,
  getCanonicalUnit() {
    canonicalReads += 1;
    throw new Error("Retrograde natal placement must stay on the motion-aware shipped path until canonical motion variants exist.");
  },
  legacyRenderer
});

const rendered = adapter.renderNatalPlacement({
  planet: "jupiter",
  sign: "leo",
  house: 3,
  voice: "you",
  isRetrograde: true
});

assert.equal(canonicalReads, 0);
assert.equal(legacyFacts?.isRetrograde, true);
assert.equal(rendered.templateKey, "fallback-hook/natal-you-placement-complete-final/jupiter/leo/3/retrograde");
assert.equal(rendered.body, "legacy retrograde placement");

assert.throws(
  () => adapter.renderNatalPlacement({
    planet: "mars",
    sign: "aries",
    house: 1,
    voice: "you",
    dignity: "domicile"
  }),
  /modifier overlays are outside Wave 1/u
);

console.log("Canonical natal adapter delegates retrograde placements to the motion-aware shipped renderer and keeps unsupported non-motion modifiers fail-closed.");
