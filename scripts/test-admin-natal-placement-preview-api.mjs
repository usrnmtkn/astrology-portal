import assert from "node:assert/strict";
import {
  normalizeNatalPlacementPreviewInput,
  renderNatalPlacementPreview
} from "../api/admin/natal-placement-preview.ts";

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

assert.throws(
  () => normalizeNatalPlacementPreviewInput({ audience: "you", house: "13", overrides: [], planet: "sun", sign: "aries" }),
  /house must be between 1 and 12/u
);

console.log("Natal placement preview API loads its packaged data and renders sign-only and full placements.");
