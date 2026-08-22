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
const staged = JSON.parse(stagedText);
const ownerPackage = read("packages/astro-knowledge/review/venus-libra-house-cores-v1/venus-libra-house-cores-owner-package.md");
const ordinals = ["1st", "2nd", "3rd", "4th", "5th", "6th", "7th", "8th", "9th", "10th", "11th", "12th"];
const browserRenderer = createTransitSynastryRenderer(
  { authoredCards: [] },
  { templates: [] },
  { hookRows: source.rows, vocabularyRows: [] }
);

const normalizeReaderPunctuation = (value) => value
  .replace(/[\u2018\u2019]/gu, "'")
  .replace(/[\u201c\u201d]/gu, "\"")
  .replace(/\u2026/gu, "...")
  .replace(/[\u2013\u2014]/gu, "-")
  .replace(/\u00a0/gu, " ")
  .replace(/[\u200b-\u200f\ufeff\u202a-\u202e\u2066-\u2069]/gu, "");
const normalizedStaged = {
  ...staged,
  rows: staged.rows.map((row) => ({
    ...row,
    body_you: normalizeReaderPunctuation(row.body_you),
    body_they: normalizeReaderPunctuation(row.body_they)
  }))
};

assert.equal(source.rows.length, 12);
assert.equal(normalizedStaged.rows.length, 12);

for (const [index, row] of source.rows.entries()) {
  const house = index + 1;
  const stagedRow = normalizedStaged.rows[index];
  const ownerMatch = ownerPackage.match(new RegExp(`### ${ordinals[index]} house\\n\\n([\\s\\S]*?)\\n\\n_Provenance:`));
  assert.ok(ownerMatch, `The approved owner package must contain the ${ordinals[index]} house body.`);
  assert.equal(
    row.body_you,
    normalizeReaderPunctuation(ownerMatch[1]),
    `${row.contentKey} must preserve the owner-approved body under the global reader-punctuation normalization.`
  );
  assert.equal(row.body_you, stagedRow.body_you, `${row.contentKey} must preserve the historical approved wording even after a status change.`);
  assert.equal(row.body_they, row.body_you, `${row.contentKey} must not carry a rewritten reader variant.`);
  assert.equal(row.content_role, "house_horoscope_core");
  assert.equal(row.grammar_frame, "second_person_block");

  if (house === 5) {
    assert.equal(row.review_status, "needs_review", "The owner-rejected 5th-house passage must not remain approved.");
    assert.match(row.approved_via, /revoked by explicit owner correction 2026-08-22/u);
    assert.throws(
      () => renderSkyPlacementHouseCore({ planet: "venus", sign: "libra", house }),
      (error) => error instanceof SourceGapError && /SOURCE_GAP: house horoscope core venus\/libra\/house-5/u.test(error.message),
      "The rejected 5th-house passage must not render from the reader bundle."
    );
    assert.throws(
      () => browserRenderer.renderSkyPlacementHouseCore({ planet: "venus", sign: "libra", house }),
      (error) => error instanceof Error && /SOURCE_GAP: house horoscope core venus\/libra\/house-5/u.test(error.message),
      "The browser resolver must also reject the revoked passage."
    );
    continue;
  }

  assert.equal(row.review_status, "approved");
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

const genericApprovedRenderer = createTransitSynastryRenderer(
  { authoredCards: [] },
  { templates: [] },
  {
    hookRows: [{
      contentKey: "house-horoscope-core/uranus/gemini/house-5",
      content_role: "house_horoscope_core",
      grammar_frame: "second_person_block",
      body_you: "Approved exact test passage.",
      review_status: "approved"
    }],
    vocabularyRows: []
  }
);
assert.equal(
  genericApprovedRenderer.renderSkyPlacementHouseCore({ planet: "uranus", sign: "gemini", house: 5 }).body,
  "Approved exact test passage.",
  "The resolver must accept any governed exact house core instead of hard-coding two placement pairs."
);

console.log("Venus in Libra preserves the historical V3 bodies, revokes house 5, and supports generic governed exact-core routing.");
