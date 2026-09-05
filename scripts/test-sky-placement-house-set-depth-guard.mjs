import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  filterMixedDepthSkyPlacementHouseRows,
  incompleteOwnerAuthoredHousePlacementKeys
} from "../apps/web/src/content/fallbackArchitectureV3/skyPlacementHouseSetGuard.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const houseRows = JSON.parse(fs.readFileSync(
  path.join(root, "apps/web/src/content/fallbackArchitectureV3/bundled-sky-placement-house-rows-v3.json"),
  "utf8"
)).hookRows;
const ownerRows = JSON.parse(fs.readFileSync(
  path.join(root, "apps/web/src/content/fallbackArchitectureV3/authored-inputs/owner-authored-sky-placement-house-passages-v1.json"),
  "utf8"
)).rows;

const jupiterLeoPrefix = "house-horoscope-core/jupiter/leo/house-";
const uranusGeminiPrefix = "house-horoscope-core/uranus/gemini/house-";
const jupiterLeoRows = houseRows.filter((row) => row.contentKey.startsWith(jupiterLeoPrefix));
const ownerJupiterLeoRows = ownerRows.filter((row) => row.contentKey.startsWith(jupiterLeoPrefix));
const uranusGeminiRows = houseRows.filter((row) => row.contentKey.startsWith(uranusGeminiPrefix));

assert.equal(jupiterLeoRows.length, 12, "The bundled Jupiter/Leo reader source must contain all 12 houses.");
assert.equal(ownerJupiterLeoRows.length, 12, "The protected owner-authored Jupiter/Leo source must now be complete 12/12.");
assert.ok(ownerJupiterLeoRows.every((row) => row.review_status === "approved"));

const incomplete = incompleteOwnerAuthoredHousePlacementKeys(houseRows, ownerRows);
assert.equal(incomplete.size, 0, "A complete byte-matching 12/12 owner set must not be withheld.");

const guarded = filterMixedDepthSkyPlacementHouseRows(houseRows, ownerRows);
assert.equal(
  guarded.filter((row) => row.contentKey.startsWith(jupiterLeoPrefix)).length,
  12,
  "Current complete Jupiter/Leo must remain available."
);
assert.equal(
  guarded.filter((row) => row.contentKey.startsWith(uranusGeminiPrefix)).length,
  uranusGeminiRows.length,
  "Compact-only placements must remain available."
);

const partialOwnerRows = ownerRows.filter((row) => row.contentKey !== `${jupiterLeoPrefix}6`);
assert.deepEqual(
  [...incompleteOwnerAuthoredHousePlacementKeys(houseRows, partialOwnerRows)],
  ["jupiter/leo"],
  "Removing one protected house must turn the placement into an incomplete owner-authored set."
);
assert.equal(
  filterMixedDepthSkyPlacementHouseRows(houseRows, partialOwnerRows)
    .filter((row) => row.contentKey.startsWith(jupiterLeoPrefix)).length,
  0,
  "A future partial owner-authored set must fail closed as a whole set."
);

const driftedHouseRows = houseRows.map((row) => (
  row.contentKey === `${jupiterLeoPrefix}1`
    ? { ...row, body_you: `${row.body_you} DRIFT` }
    : row
));
assert.deepEqual(
  [...incompleteOwnerAuthoredHousePlacementKeys(driftedHouseRows, ownerRows)],
  ["jupiter/leo"],
  "A complete owner set must still fail closed if one reader body drifts."
);
assert.equal(
  filterMixedDepthSkyPlacementHouseRows(driftedHouseRows, ownerRows)
    .filter((row) => row.contentKey.startsWith(jupiterLeoPrefix)).length,
  0,
  "Reader-copy drift must withhold the entire protected placement set."
);

console.log("Sky placement house-set depth guard passed: current Jupiter/Leo remains 12/12; future partial or drifted protected sets fail closed.");
