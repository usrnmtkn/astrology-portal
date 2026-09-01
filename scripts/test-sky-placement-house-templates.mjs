#!/usr/bin/env node

import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createServer } from "vite";
import { ownerRejectedExactTexts } from "../src/astro-writing/ownerEvidenceRejections.mjs";
import {
  renderSkyPlacementHouseCore,
  renderSkyPlacementRisingHoroscopeSet
} from "../apps/web/src/content/fallbackArchitectureV3/resolver/renderTransitSynastry.mjs";
import { requireUniformSkyPlacementHoroscopeSet } from "../apps/web/src/content/fallbackArchitectureV3/resolver/skyPlacementHoroscopeSetPolicy.mjs";
import { createTransitSynastryRenderer as createShippedTransitSynastryRenderer } from "../apps/web/src/content/fallbackArchitectureV3/dist/tldr-content.js";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (relativePath) => fs.readFileSync(path.join(repoRoot, relativePath), "utf8");
const source = JSON.parse(read(
  "apps/web/src/content/fallbackArchitectureV3/source-rows/sky-placement-house-templates-v1.json"
));
const browserRendererInputs = [
  { authoredCards: [] },
  { templates: [] },
  { hookRows: source.rows, vocabularyRows: [] }
];
const vite = await createServer({
  root: path.join(repoRoot, "apps", "web"),
  appType: "custom",
  logLevel: "silent",
  server: { middlewareMode: true }
});
const browserResolverModule = await vite.ssrLoadModule(
  "/src/content/fallbackArchitectureV3/resolver/renderTransitSynastry.browser.ts"
);
const protectedOwnerModule = await vite.ssrLoadModule(
  "/src/content/protectedOwnerSkyPlacementPassages.ts"
);
const browserSourceRenderer = browserResolverModule.createTransitSynastryRenderer(...browserRendererInputs);
const shippedRenderer = createShippedTransitSynastryRenderer(...browserRendererInputs);
const protectedOwnerSource = JSON.parse(read(
  "apps/web/src/content/fallbackArchitectureV3/authored-inputs/owner-authored-sky-placement-house-passages-v1.json"
));
const bundledHouseRows = JSON.parse(read(
  "apps/web/src/content/fallbackArchitectureV3/bundled-sky-placement-house-rows-v3.json"
));
const corrections = [
  ...read("data/writing/owner-corrections.jsonl").trim().split("\n").filter(Boolean).map(JSON.parse),
  ...read("data/writing/owner-feedback-corpus.jsonl").trim().split("\n").filter(Boolean).map(JSON.parse)
];
const rejectedTexts = ownerRejectedExactTexts(corrections);
const title = (value) => value.split("-").map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`).join(" ");
const ordinal = (house) => {
  if (house === 1) return "1st";
  if (house === 2) return "2nd";
  if (house === 3) return "3rd";
  return `${house}th`;
};

assert.equal(source.placementCount, 82, "Every governed Sky placement route must have a house template set.");
assert.equal(source.rowCount, 82 * 12, "Every governed Sky placement route must have all twelve houses.");
assert.equal(new Set(source.rows.map((row) => row.contentKey)).size, source.rowCount, "House template keys must be unique.");
assert.match(protectedOwnerSource.copyPolicy, /Never shorten, summarize, excerpt, paraphrase/u);

for (const protectedRow of protectedOwnerSource.rows) {
  const actualHash = crypto.createHash("sha256").update(protectedRow.body_you, "utf8").digest("hex");
  const actualWordCount = protectedRow.body_you.trim().split(/\s+/u).filter(Boolean).length;
  assert.equal(actualHash, protectedRow.body_sha256, `${protectedRow.contentKey} protected hash must match exact owner text.`);
  assert.equal(actualWordCount, protectedRow.word_count, `${protectedRow.contentKey} protected word count must match exact owner text.`);
  const materializedRow = source.rows.find((row) => row.contentKey === protectedRow.contentKey);
  assert.ok(materializedRow, `${protectedRow.contentKey} must materialize.`);
  assert.equal(materializedRow.body_you, protectedRow.body_you, `${protectedRow.contentKey} must materialize byte-for-byte.`);
  assert.equal(materializedRow.template_selection.selected_from, "protected-owner-authored-passage");
  assert.equal(materializedRow.source_release, "owner-authored-sky-placement-house-passages-v1");
  assert.deepEqual(materializedRow.copy_protection, {
    policy: "byte-exact-owner-authored",
    word_count: protectedRow.word_count,
    body_sha256: protectedRow.body_sha256
  });
  const bundledRow = bundledHouseRows.hookRows.find((row) => row.contentKey === protectedRow.contentKey);
  assert.equal(bundledRow?.body_you, protectedRow.body_you, `${protectedRow.contentKey} must remain exact in the app bundle.`);
  assert.equal(bundledRow?.source_release, materializedRow.source_release);
  assert.deepEqual(bundledRow?.copy_protection, materializedRow.copy_protection);
}

for (const row of source.rows) {
  const [, planet, sign, houseSlug] = row.contentKey.split("/");
  const house = Number(houseSlug.replace("house-", ""));
  const expectedHeadline = `${title(planet)} in ${title(sign)} · ${ordinal(house)} House`;
  assert.equal(row.review_status, "approved_reuse");
  assert.equal(row.content_role, "house_horoscope_core");
  assert.equal(row.grammar_frame, "second_person_block");
  assert.ok(
    ["full-owner-authored-horoscope", "compact-house-core"].includes(row.content_tier),
    `${row.contentKey} must declare its reader-depth tier.`
  );
  assert.equal(row.headline, expectedHeadline, `${row.contentKey} must have a searchable identity headline.`);
  assert.ok(row.body_you.trim());
  assert.equal(rejectedTexts.has(row.body_you.trim()), false, `${row.contentKey} must not restore owner-rejected text.`);
}

const syntheticSet = (contentTier) => Array.from({ length: 12 }, (_, index) => ({
  risingSign: `Sign ${index + 1}`,
  house: index + 1,
  body: `Body ${index + 1}`,
  contentKey: `test/house-${index + 1}`,
  contentTier
}));
assert.equal(
  requireUniformSkyPlacementHoroscopeSet(syntheticSet("compact-house-core"), {
    planet: "test",
    sign: "compact"
  }).length,
  12,
  "A complete compact-only set remains reader-eligible."
);
assert.equal(
  requireUniformSkyPlacementHoroscopeSet(syntheticSet("full-owner-authored-horoscope"), {
    planet: "test",
    sign: "full"
  }).length,
  12,
  "A complete full-only set remains reader-eligible."
);
const mixedSyntheticSet = syntheticSet("compact-house-core");
mixedSyntheticSet[4] = { ...mixedSyntheticSet[4], contentTier: "full-owner-authored-horoscope" };
assert.throws(
  () => requireUniformSkyPlacementHoroscopeSet(mixedSyntheticSet, { planet: "test", sign: "mixed" }),
  /SOURCE_GAP: mixed or unknown house horoscope tiers test\/mixed/u,
  "A mixed-depth twelve-sign set must fail closed."
);

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

for (const house of [5, 7, 8, 9, 10, 11, 12]) {
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
const risingSetEntries = Array.from({ length: 12 }, (_, index) => ({
  risingSign: zodiacSignForTest(index),
  house: index + 1
}));
function zodiacSignForTest(index) {
  return ["Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo", "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces"][index];
}
for (const renderSet of [
  renderSkyPlacementRisingHoroscopeSet,
  browserSourceRenderer.renderSkyPlacementRisingHoroscopeSet,
  shippedRenderer.renderSkyPlacementRisingHoroscopeSet
]) {
  assert.throws(
    () => renderSet({ planet: "jupiter", sign: "leo", entries: risingSetEntries }),
    /SOURCE_GAP: mixed or unknown house horoscope tiers jupiter\/leo/u,
    "The current seven-full/five-compact Jupiter in Leo set must not render as one completed horoscope set."
  );
  assert.equal(
    renderSet({ planet: "uranus", sign: "gemini", entries: risingSetEntries }).length,
    12,
    "A uniform compact set must continue to render all twelve signs."
  );
}
const jupiterLeoHouseFive = renderSkyPlacementHouseCore({ planet: "jupiter", sign: "leo", house: 5 }).body;
const browserSourceJupiterLeoHouseFive = browserSourceRenderer.renderSkyPlacementHouseCore({
  planet: "jupiter",
  sign: "leo",
  house: 5
}).body;
const shippedJupiterLeoHouseFive = shippedRenderer.renderSkyPlacementHouseCore({
  planet: "jupiter",
  sign: "leo",
  house: 5
}).body;
assert.equal(
  crypto.createHash("sha256").update(jupiterLeoHouseFive, "utf8").digest("hex"),
  "4d0e8745307ec0c96d387cf1b68a3edd8e0fd0addb5a07f685f70c4230b3865c",
  "Jupiter in Leo house 5 must retain the owner's exact long passage."
);
assert.equal(jupiterLeoHouseFive.trim().split(/\s+/u).length, 250);
assert.equal(
  browserSourceJupiterLeoHouseFive,
  jupiterLeoHouseFive,
  "The browser source resolver must preserve the owner's exact long passage."
);
assert.equal(
  shippedJupiterLeoHouseFive,
  jupiterLeoHouseFive,
  "The shipped browser artifact must preserve the owner's exact long passage."
);
assert.match(jupiterLeoHouseFive, /The best thing you build this year may be the part of your schedule that finally belongs to you\./u);
assert.doesNotMatch(jupiterLeoHouseFive, /If everybody loves the version you are already bored with/u);
for (const replacement of [
  "A compact replacement.",
  Array.from({ length: 400 }, (_, index) => `alternate-${index}`).join(" ")
]) {
  const preserved = protectedOwnerModule.preserveProtectedOwnerSkyPlacementPassage({
    body: replacement,
    contentKey: "alternate/jupiter/leo/house-5",
    house: 5,
    planet: "jupiter",
    sign: "leo"
  });
  assert.equal(
    preserved.body,
    jupiterLeoHouseFive,
    "Protected owner copy must reject alternate wording regardless of its length."
  );
  assert.equal(preserved.contentKey, "house-horoscope-core/jupiter/leo/house-5");
  assert.equal(preserved.protectionApplied, true);
}
assert.match(
  renderSkyPlacementHouseCore({ planet: "jupiter", sign: "leo", house: 7 }).body,
  /Let people love you loudly this year/u
);

const app = read("apps/web/src/App.tsx");
const article = read("apps/web/src/features/sky/SkyDetailArticle.tsx");
assert.match(app, /heading: packageSection\?\.heading \|\| personalTransitDisplayTitle\(transit\)/u);
assert.match(app, /renderSkyPlacementRisingHoroscopeSet/u);
assert.match(app, /body: packageSection\?\.body \?\? compiledAspect\?\.body \?\? null/u);
assert.match(article, /detail\.personalizedPlacement\.natalAspects\.map/u);
assert.match(article, /<h4>\{aspect\.heading\}<\/h4>/u);

await vite.close();
console.log("Sky placement house template and personalized-aspect tests passed.");
