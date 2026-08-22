#!/usr/bin/env node

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { ownerRejectedExactTexts } from "../src/astro-writing/ownerEvidenceRejections.mjs";
import { renderSkyPlacementHouseCore } from "../apps/web/src/content/fallbackArchitectureV3/resolver/renderTransitSynastry.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (relativePath) => fs.readFileSync(path.join(repoRoot, relativePath), "utf8");
const source = JSON.parse(read(
  "apps/web/src/content/fallbackArchitectureV3/source-rows/sky-placement-house-templates-v1.json"
));
const corrections = [
  ...read("data/writing/owner-corrections.jsonl").trim().split("\n").filter(Boolean).map(JSON.parse),
  ...read("data/writing/owner-feedback-corpus.jsonl").trim().split("\n").filter(Boolean).map(JSON.parse)
];
const rejectedTexts = ownerRejectedExactTexts(corrections);

assert.equal(source.placementCount, 82, "Every governed Sky placement route must have a house template set.");
assert.equal(source.rowCount, 82 * 12, "Every governed Sky placement route must have all twelve houses.");
assert.equal(new Set(source.rows.map((row) => row.contentKey)).size, source.rowCount, "House template keys must be unique.");

for (const row of source.rows) {
  assert.equal(row.review_status, "approved_reuse");
  assert.equal(row.content_role, "house_horoscope_core");
  assert.equal(row.grammar_frame, "second_person_block");
  assert.ok(row.body_you.trim());
  assert.equal(rejectedTexts.has(row.body_you.trim()), false, `${row.contentKey} must not restore owner-rejected text.`);
}

for (let house = 1; house <= 12; house += 1) {
  const sourceRow = source.rows.find((row) => (
    row.contentKey === `house-horoscope-core/uranus/gemini/house-${house}`
  ));
  assert.ok(sourceRow, `Uranus in Gemini house ${house} must exist.`);
  const rendered = renderSkyPlacementHouseCore({ planet: "uranus", sign: "gemini", house });
  assert.equal(rendered.body, sourceRow.body_you, `Uranus in Gemini house ${house} must render verbatim.`);
}

for (const placementKey of ["moon/taurus", "lilith/sagittarius", "north-node/aquarius", "south-node/leo"]) {
  for (let house = 1; house <= 12; house += 1) {
    const sourceRow = source.rows.find((row) => (
      row.contentKey === `house-horoscope-core/${placementKey}/house-${house}`
    ));
    assert.ok(sourceRow, `${placementKey} house ${house} must exist.`);
    const [planet, sign] = placementKey.split("/");
    assert.equal(
      renderSkyPlacementHouseCore({ planet, sign, house }).body,
      sourceRow.body_you,
      `${placementKey} house ${house} must render verbatim.`
    );
  }
}

for (let house = 7; house <= 12; house += 1) {
  const sourceRow = source.rows.find((row) => (
    row.contentKey === `house-horoscope-core/jupiter/leo/house-${house}`
  ));
  assert.ok(sourceRow, `Jupiter in Leo house ${house} must exist.`);
  assert.equal(
    renderSkyPlacementHouseCore({ planet: "jupiter", sign: "leo", house }).body,
    sourceRow.body_you,
    `Jupiter in Leo house ${house} must render the recovered Content Studio copy verbatim.`
  );
}
assert.match(
  renderSkyPlacementHouseCore({ planet: "jupiter", sign: "leo", house: 7 }).body,
  /Let people love you loudly this year/u
);

const app = read("apps/web/src/App.tsx");
const article = read("apps/web/src/features/sky/SkyDetailArticle.tsx");
assert.match(app, /heading: packageSection\?\.heading \|\| personalTransitDisplayTitle\(transit\)/u);
assert.match(app, /body: compiledAspect\?\.body \?\? packageSection\?\.body \?\? null/u);
assert.match(article, /detail\.personalizedPlacement\.natalAspects\.map/u);
assert.match(article, /<h4>\{aspect\.heading\}<\/h4>/u);

console.log("Sky placement house template and personalized-aspect tests passed.");
