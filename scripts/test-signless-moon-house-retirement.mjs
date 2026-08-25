#!/usr/bin/env node

import assert from "node:assert/strict";
import fs from "node:fs";
import { mapPhrasebank } from "./prepare-tldr-astro-store-import.mjs";

const importer = fs.readFileSync("scripts/prepare-tldr-astro-store-import.mjs", "utf8");
assert.match(importer, /bodySlug\(row\.planet\) === "moon"/u);
assert.match(importer, /Moon horoscopes require planet, zodiac sign, and rising-derived house/u);

const runtime = fs.readFileSync(
  "apps/web/src/content/fallbackArchitectureV3/bundled-sky-placement-house-rows-v3.json",
  "utf8"
);
const exactKeys = new Set(runtime.match(/house-horoscope-core\/moon\/[a-z-]+\/house-(?:1[0-2]|[1-9])(?=")/gu) ?? []);
assert.equal(exactKeys.size, 144, "Expected 12 signs × 12 houses of exact Moon runtime coverage.");

for (let house = 1; house <= 12; house += 1) {
  assert.doesNotMatch(runtime, new RegExp(`sky\\.planetary\\.moon\\.house_${house}(?:\"|\\b)`, "u"));
}

const mappedMoonRows = mapPhrasebank()
  .filter((row) => /^cc\/horoscope\/moon-(?:1[0-2]|[1-9])$/u.test(String(row.incoming_key)))
  .sort((left, right) => String(left.incoming_key).localeCompare(String(right.incoming_key)));
assert.equal(mappedMoonRows.length, 12, "Expected the historical source catalog to contain 12 Moon-house rows.");
assert(mappedMoonRows.every((row) => row.action === "SKIP" && row.target_database_key === null));

console.log("Signless Moon-house retirement contract passed (12 generic keys excluded; 144 exact keys retained).");
