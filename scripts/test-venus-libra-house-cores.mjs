#!/usr/bin/env node

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { renderSkyPlacementHouseCore } from "../apps/web/src/content/fallbackArchitectureV3/resolver/renderTransitSynastry.mjs";
import { SourceGapError } from "../apps/web/src/content/fallbackArchitectureV3/resolver/renderFallback.mjs";
import { createTransitSynastryRenderer } from "../apps/web/src/content/fallbackArchitectureV3/dist/tldr-content.js";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (relativePath) => fs.readFileSync(path.join(repoRoot, relativePath), "utf8");
const sourceText = read("apps/web/src/content/fallbackArchitectureV3/source-rows/venus-libra-house-cores-v1.json");
const stagedText = read("packages/astro-knowledge/review/venus-libra-house-cores-v1/venus-libra-house-cores-staged-rows.json");
const source = JSON.parse(sourceText);
const ownerPackage = read("packages/astro-knowledge/review/venus-libra-house-cores-v1/venus-libra-house-cores-owner-package.md");
const ordinals = ["1st", "2nd", "3rd", "4th", "5th", "6th", "7th", "8th", "9th", "10th", "11th", "12th"];
const browserRenderer = createTransitSynastryRenderer(
  { authoredCards: [] },
  { templates: [] },
  { hookRows: source.rows, vocabularyRows: [] }
);

assert.equal(sourceText, stagedText, "The serving source must remain byte-identical to the staged owner package JSON.");
assert.equal(source.rows.length, 12);

for (const [index, row] of source.rows.entries()) {
  const house = index + 1;
  const ownerMatch = ownerPackage.match(new RegExp(`### ${ordinals[index]} house\\n\\n([\\s\\S]*?)\\n\\n_Provenance:`));
  assert.ok(ownerMatch, `The approved owner package must contain the ${ordinals[index]} house body.`);
  assert.equal(row.body_you, ownerMatch[1], `${row.contentKey} must be byte-identical to the owner-approved body.`);
  assert.equal(row.body_they, row.body_you, `${row.contentKey} must not carry a rewritten reader variant.`);
  assert.equal(row.review_status, "approved");
  assert.equal(row.content_role, "house_horoscope_core");
  assert.equal(row.grammar_frame, "second_person_block");

  const rendered = renderSkyPlacementHouseCore({ planet: "venus", sign: "libra", house });
  assert.equal(rendered.contentKey, row.contentKey);
  assert.equal(rendered.body, row.body_you, `${row.contentKey} must render without truncation or punctuation changes.`);
  assert.equal(rendered.templateKey, "house-horoscope-core/venus-libra-v1");

  const browserRendered = browserRenderer.renderSkyPlacementHouseCore({ planet: "venus", sign: "libra", house });
  assert.equal(browserRendered.contentKey, row.contentKey);
  assert.equal(browserRendered.body, row.body_you, `${row.contentKey} must match in the browser resolver.`);
}

assert.throws(
  () => renderSkyPlacementHouseCore({ planet: "venus", sign: "scorpio", house: 1 }),
  (error) => error instanceof SourceGapError && /SOURCE_GAP: house horoscope core venus\/scorpio\/house-1/u.test(error.message),
  "A non-approved Venus sign must fail closed."
);
assert.throws(
  () => renderSkyPlacementHouseCore({ planet: "mercury", sign: "libra", house: 1 }),
  (error) => error instanceof SourceGapError && /SOURCE_GAP: house horoscope core mercury\/libra\/house-1/u.test(error.message),
  "A non-approved Libra planet must fail closed."
);

console.log("Venus in Libra house cores preserve all 12 approved V3 bodies and fail closed outside the approved pair.");
