import assert from "node:assert/strict";
import {
  normalizeNatalPlacementPreviewInput,
  renderNatalPlacementPreview,
  renderNatalPlacementPreviewState
} from "../api/admin/natal-placement-preview.ts";

const fallbackProvider = "tldrastro-fallback-architecture-v3";

const signOnlyInput = normalizeNatalPlacementPreviewInput({
  audience: "you",
  overrides: [],
  planet: "sun",
  sign: "aries"
});
const signOnly = renderNatalPlacementPreview(signOnlyInput);
assert.equal(signOnly.headline, "Sun in Aries");
assert.equal(signOnly.parts.length, 1, "The API must return the planet-in-sign paragraph before a house is selected.");
assert.ok(signOnly.body.trim().length > 0, "The API must load its packaged fallback data and return reader copy.");

const fullInput = normalizeNatalPlacementPreviewInput({
  audience: "you",
  house: "1",
  overrides: [],
  planet: "sun",
  sign: "aries"
});
const fullPlacement = renderNatalPlacementPreview(fullInput);
assert.equal(fullPlacement.headline, "Sun in Aries in the 1st house");
assert.equal(fullPlacement.parts.length, 2, "Selecting a house must add the house paragraph.");

const retrogradeInput = normalizeNatalPlacementPreviewInput({
  audience: "you",
  house: "6",
  motion: "retrograde",
  overrides: [],
  planet: "mercury",
  sign: "virgo"
});
assert.equal(retrogradeInput.motion, "retrograde");
const retrogradePlacement = renderNatalPlacementPreview(retrogradeInput);
assert.match(
  retrogradePlacement.body,
  /retrograde in the birth chart/u,
  "A retrograde preview must render the motion-specific passage."
);
assert.equal(retrogradePlacement.parts.length, 2, "The retrograde modifier is appended to the relevant sign or house paragraph.");

const jupiterLeoRetrograde = renderNatalPlacementPreview(normalizeNatalPlacementPreviewInput({
  audience: "you",
  house: "3",
  motion: "retrograde",
  overrides: [],
  planet: "jupiter",
  sign: "leo"
}));
assert.match(jupiterLeoRetrograde.body, /Jupiter describes what gets bigger/u);
assert.match(jupiterLeoRetrograde.body, /Warmth spills out of you/u);
assert.match(jupiterLeoRetrograde.body, /Your Jupiter is in your 3rd house/u);
assert.match(jupiterLeoRetrograde.body, /Jupiter is retrograde in the birth chart/u);
assert.doesNotMatch(
  jupiterLeoRetrograde.body,
  /Leo wants people to see how much care went into the effort/u,
  "The production preview must not fall through to the generic Leo floor when the shipped Jupiter-specific composition is available."
);

const reviewedOnlyMarker = "REVIEWED STUDIO COPY MUST NOT REPLACE PRODUCTION";
const reviewedOnlyState = renderNatalPlacementPreviewState(normalizeNatalPlacementPreviewInput({
  audience: "you",
  house: "3",
  motion: "retrograde",
  overrides: [{
    id: "reviewed-only",
    lane: "serving",
    provider: fallbackProvider,
    status: "REVIEWED",
    updatedAt: "2026-09-02T04:00:00.000Z",
    packageRow: {
      contentKey: "fallback-hook/placement-sentence/jupiter/leo",
      content_role: "fallback_hook",
      grammar_frame: "complete_sentence",
      body_you: reviewedOnlyMarker,
      body_they: reviewedOnlyMarker,
      review_status: "approved"
    }
  }],
  planet: "jupiter",
  sign: "leo"
}));
assert.doesNotMatch(reviewedOnlyState.rendered.body, new RegExp(reviewedOnlyMarker, "u"));
assert.match(reviewedOnlyState.rendered.body, /Jupiter describes what gets bigger/u);
assert.deepEqual(reviewedOnlyState.appliedOverrideKeys, []);
assert.deepEqual(reviewedOnlyState.ignoredOverrides, [{
  contentKey: "fallback-hook/placement-sentence/jupiter/leo",
  reason: "not-live"
}]);

const liveMarker = "LIVE STUDIO JUPITER LEO COPY";
const liveState = renderNatalPlacementPreviewState(normalizeNatalPlacementPreviewInput({
  audience: "you",
  house: "3",
  motion: "retrograde",
  overrides: [{
    id: "live-serving",
    lane: "serving",
    provider: fallbackProvider,
    status: "LIVE",
    updatedAt: "2026-09-02T04:01:00.000Z",
    packageRow: {
      contentKey: "fallback-hook/placement-sentence/jupiter/leo",
      content_role: "fallback_hook",
      grammar_frame: "complete_sentence",
      body_you: liveMarker,
      body_they: liveMarker,
      review_status: "approved"
    }
  }],
  planet: "jupiter",
  sign: "leo"
}));
assert.match(liveState.rendered.body, new RegExp(liveMarker, "u"));
assert.deepEqual(liveState.appliedOverrideKeys, ["fallback-hook/placement-sentence/jupiter/leo"]);
assert.deepEqual(liveState.ignoredOverrides, []);

const referenceLaneState = renderNatalPlacementPreviewState(normalizeNatalPlacementPreviewInput({
  audience: "you",
  overrides: [{
    id: "reference-only",
    lane: "reference",
    provider: fallbackProvider,
    status: "LIVE",
    updatedAt: "2026-09-02T04:02:00.000Z",
    packageRow: {
      contentKey: "fallback-hook/placement-sentence/jupiter/leo",
      content_role: "fallback_hook",
      grammar_frame: "complete_sentence",
      body_you: "REFERENCE LANE MUST NOT RENDER",
      body_they: "REFERENCE LANE MUST NOT RENDER",
      review_status: "approved"
    }
  }],
  planet: "jupiter",
  sign: "leo"
}));
assert.doesNotMatch(referenceLaneState.rendered.body, /REFERENCE LANE MUST NOT RENDER/u);
assert.match(referenceLaneState.rendered.body, /Jupiter describes what gets bigger/u);
assert.deepEqual(referenceLaneState.ignoredOverrides, [{
  contentKey: "fallback-hook/placement-sentence/jupiter/leo",
  reason: "not-serving"
}]);

const staleKeyState = renderNatalPlacementPreviewState(normalizeNatalPlacementPreviewInput({
  audience: "you",
  overrides: [{
    id: "not-current-package-key",
    lane: "serving",
    provider: fallbackProvider,
    status: "LIVE",
    updatedAt: "2026-09-02T04:03:00.000Z",
    packageRow: {
      contentKey: "fallback-hook/natal-you-placement-complete-final/jupiter/leo/3/not-installed",
      content_role: "full_copy",
      body: "UNINSTALLED EXACT COPY MUST NOT RENDER",
      reader_only: true,
      render_policy: "reader-only-exact-lived-v1",
      review_status: "approved"
    }
  }],
  house: "3",
  motion: "retrograde",
  planet: "jupiter",
  sign: "leo"
}));
assert.doesNotMatch(staleKeyState.rendered.body, /UNINSTALLED EXACT COPY MUST NOT RENDER/u);
assert.match(staleKeyState.rendered.body, /Jupiter describes what gets bigger/u);
assert.deepEqual(staleKeyState.ignoredOverrides, [{
  contentKey: "fallback-hook/natal-you-placement-complete-final/jupiter/leo/3/not-installed",
  reason: "not-current-package-key"
}]);

assert.equal(normalizeNatalPlacementPreviewInput({
  audience: "you",
  isRetrograde: true,
  overrides: [],
  planet: "venus",
  sign: "taurus"
}).motion, "retrograde");

assert.throws(
  () => normalizeNatalPlacementPreviewInput({ audience: "you", house: "13", overrides: [], planet: "sun", sign: "aries" }),
  /house must be between 1 and 12/u
);

console.log("Natal placement preview matches the shipped reader projection, mirrors production hydration gates, and preserves Jupiter Leo retrograde parity.");
