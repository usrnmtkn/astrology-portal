#!/usr/bin/env node
import assert from "node:assert/strict";
import { composeNatalPlacement } from "../apps/web/src/content/sourceGroundedModels.ts";

function directNodeComposition() {
  return composeNatalPlacement({
    natalSky: {
      positions: [
        { planet: "North Node", sign: "Virgo", house: 4, degree: 18, glyph: "☊", motion: "direct" }
      ],
      aspects: []
    },
    ownerPerspective: "you",
    position: { planet: "North Node", sign: "Virgo", house: 4, degree: 18, glyph: "☊", motion: "direct" }
  });
}

function retrogradeNodeComposition() {
  return composeNatalPlacement({
    natalSky: {
      positions: [
        { planet: "North Node", sign: "Virgo", house: 4, degree: 18, glyph: "☊", motion: "retrograde" }
      ],
      aspects: []
    },
    ownerPerspective: "you",
    position: { planet: "North Node", sign: "Virgo", house: 4, degree: 18, glyph: "☊", motion: "retrograde" }
  });
}

const direct = directNodeComposition();
assert.ok(direct.conditionalBranches?.includes("layer_4_node_direct_at_birth"), "Direct natal Node must expose the direct-node branch.");
assert.ok(direct.slots.directNodeModifier, "Direct natal Node must render the direct-node modifier slot.");
assert.ok(direct.finalCopy.includes("paying attention to the past"), "Direct natal Node copy must preserve the past-attention interpretation.");
assert.ok(direct.finalCopy.includes("old stories, inherited patterns, and unfinished memories"), "Direct natal Node copy must include behavioral evidence.");

const retrograde = retrogradeNodeComposition();
assert.ok(!retrograde.conditionalBranches?.includes("layer_4_node_direct_at_birth"), "Retrograde natal Node must not render the direct-node branch.");
assert.ok(!retrograde.slots.directNodeModifier, "Retrograde natal Node must not render the direct-node modifier slot.");

console.log("Direct natal Node copy ok.");
