#!/usr/bin/env node

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { renderSkyPlacementHouseCore } from "../apps/web/src/content/fallbackArchitectureV3/resolver/renderTransitSynastry.mjs";
import { SourceGapError } from "../apps/web/src/content/fallbackArchitectureV3/resolver/renderFallback.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (relativePath) => fs.readFileSync(path.join(repoRoot, relativePath), "utf8");
const sourceText = read("apps/web/src/content/fallbackArchitectureV3/source-rows/sun-leo-house-cores-v1.json");
const stagedText = read("packages/astro-knowledge/review/sun-leo-house-cores-v1/sun-leo-house-cores-staged-rows.json");
const source = JSON.parse(sourceText);
const staged = JSON.parse(stagedText);
const pilot = read("packages/astro-knowledge/review/sun-leo-house-cores-v1/sun-leo-house-cores-v13-pilot.md");
const app = read("apps/web/src/App.tsx");
const article = read("apps/web/src/features/sky/SkyDetailArticle.tsx");
const ordinals = ["1st", "2nd", "3rd", "4th", "5th", "6th", "7th", "8th", "9th", "10th", "11th", "12th"];

assert.equal(sourceText, stagedText, "The serving source must remain byte-identical to the staged owner package JSON.");
assert.equal(source.rows.length, 12);

for (const [index, row] of source.rows.entries()) {
  const house = index + 1;
  const pilotMatch = pilot.match(new RegExp(`### ${ordinals[index]} house\\n\\n([\\s\\S]*?)\\n\\n_Provenance:`));
  assert.ok(pilotMatch, `The approved V13 pilot must contain the ${ordinals[index]} house body.`);
  assert.equal(row.body_you, pilotMatch[1], `${row.contentKey} must be byte-identical to the V13 pilot body.`);
  assert.equal(row.body_they, row.body_you, `${row.contentKey} must not carry a rewritten reader variant.`);
  assert.equal(row.review_status, "approved");
  assert.equal(row.content_role, "house_horoscope_core");
  assert.equal(row.grammar_frame, "second_person_block");

  const rendered = renderSkyPlacementHouseCore({ planet: "sun", sign: "leo", house });
  assert.equal(rendered.contentKey, row.contentKey);
  assert.equal(rendered.body, row.body_you, `${row.contentKey} must render without truncation or punctuation changes.`);
}

const expandedApprovedCore = renderSkyPlacementHouseCore({ planet: "sun", sign: "virgo", house: 1 });
assert.equal(expandedApprovedCore.contentKey, "house-horoscope-core/sun/virgo/house-1");
assert.ok(expandedApprovedCore.body, "An approved post-pilot Sun/sign core must render from the governed package.");
assert.throws(
  () => renderSkyPlacementHouseCore({ planet: "uranus", sign: "taurus", house: 1 }),
  (error) => error instanceof SourceGapError && /SOURCE_GAP: house horoscope core uranus\/taurus\/house-1/u.test(error.message),
  "A planet-sign combination without a governed core must fail closed."
);

assert.match(
  app,
  /if \(!risingSign \|\| !detail\.routePath\?\.startsWith\("sky\/placement\/"\)\) \{[\s\S]*?personalizedPlacement: null/u,
  "No stored rising sign must render no personalized block."
);
assert.match(app, /wholeSignHouseForSign\(position\.sign, risingSign\)/u);
assert.match(
  app,
  /console\.warn\(error instanceof Error \? error\.message : String\(error\)\);[\s\S]*?personalizedPlacement: null/u,
  "A non-pilot SOURCE_GAP must be logged and render no personalized block."
);
assert.match(article, /<h2[\s\S]*?detail\.personalizedPlacement\.heading[\s\S]*?<\/h2>/u);
assert.match(article, /<p>\{detail\.personalizedPlacement\.body\}<\/p>/u);
assert.match(article, /<h3>Aspects to the natal chart<\/h3>/u);

console.log("Sun in Leo house cores preserve all 12 approved V13 bodies, expanded governed coverage renders, and unsupported combinations fail closed.");
