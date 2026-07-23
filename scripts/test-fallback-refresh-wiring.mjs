#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  createFallbackRenderer,
  createTransitSynastryRenderer
} from "../apps/web/src/content/fallbackArchitectureV3/dist/tldr-content.js";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const packageDir = path.join(repoRoot, "apps/web/src/content/fallbackArchitectureV3");

function readPackageJson(relativePath) {
  return JSON.parse(fs.readFileSync(path.join(packageDir, relativePath), "utf8"));
}

const sourceRows = readPackageJson("source-rows/fallback-source-rows-v3.json");
const transitRows = readPackageJson("source-rows/transit-synastry-rows-v1.json");
const templates = readPackageJson("templates/fallback-templates-v3.json");

const natalRenderer = createFallbackRenderer(templates, sourceRows);
const transitRenderer = createTransitSynastryRenderer(transitRows, templates, sourceRows);

const counts = {
  authoredCards: transitRows.authoredCards.length,
  fallbackHooks: sourceRows.hookRows.length,
  vocabulary: sourceRows.vocabularyRows.length,
  templates: templates.templates.length,
  sourceMaterial: sourceRows.fallbackSourceRows.length
};

assert.ok(counts.authoredCards > 0, "Package must include authored transit/synastry cards.");
assert.ok(counts.fallbackHooks > 0, "Package must include fallback hooks.");
assert.ok(counts.vocabulary > 0, "Package must include vocabulary rows.");
assert.ok(counts.templates > 0, "Package must include templates.");
const packageRows = [
  ...transitRows.authoredCards,
  ...sourceRows.hookRows,
  ...sourceRows.vocabularyRows,
  ...templates.templates
];
const needsReviewCards = transitRows.authoredCards.filter((row) => row.review_status === "needs_review");
const needsReviewHooks = sourceRows.hookRows.filter((row) => row.review_status === "needs_review");
const needsReviewRows = packageRows.filter((row) => row.review_status === "needs_review");
assert.equal(needsReviewCards.length, 0, "All authored cards must be reader eligible.");
assert.equal(needsReviewHooks.length, 0, "All legacy-replacement hooks must be reader eligible.");
assert.equal(needsReviewRows.length, 0, "The owner-approved package must not retain review-gated rows.");

const reversedMercuryCompat = transitRenderer.renderCompat({
  planet: "mercury",
  signA: "scorpio",
  signB: "gemini",
  otherName: "X"
});
assert.equal(reversedMercuryCompat.contentKey, "authored/compat-pair/mercury/scorpio/gemini");
assert.equal(reversedMercuryCompat.templateKey, "authored/compat-pair");

const friendTransit = transitRenderer.renderTransitAspect({
  transiting: "saturn",
  aspect: "square",
  natal: "venus",
  voice: "Sofia",
  window: "Until November 13"
});
assert.equal(friendTransit.headline, "Saturn square Sofia's Venus");
assert.match(friendTransit.body, /^Saturn square Sofia's natal Venus through November 13\./u);
assert.doesNotMatch(friendTransit.body, /\byou(?:r|rs|self)?\b/iu);

const friendHouse = transitRenderer.renderTransitHouse({
  planet: "saturn",
  house: 7,
  voice: "Sofia",
  window: "Until November 13"
});
assert.equal(friendHouse.headline, "Saturn moving through Sofia's 7th house");
assert.match(friendHouse.body, /^Until November 13, Saturn is moving through Sofia's 7th house\./u);
assert.doesNotMatch(friendHouse.body, /\byou(?:r|rs|self)?\b/iu);

const nodeAspect = natalRenderer.renderNatalAspect({
  planetA: "mars",
  aspect: "square",
  planetB: "north-node",
  voice: "you"
});
assert.equal(nodeAspect.headline, "Your Mars square North Node");
assert.match(nodeAspect.body, /Your energy fights your own direction/u);
assert.doesNotMatch(nodeAspect.body, /two chart functions|contact works best|generic frame/iu);

const chironAspect = natalRenderer.renderNatalAspect({
  planetA: "chiron",
  aspect: "trine",
  planetB: "venus",
  voice: "Sofia"
});
assert.equal(chironAspect.headline, "Sofia's Chiron trine Venus");
assert.match(chironAspect.body, /Old heartbreak made them kind instead of hard/u);
assert.doesNotMatch(chironAspect.body, /\byou(?:r|rs|self)?\b/iu);

const lilithAspect = natalRenderer.renderNatalAspect({
  planetA: "lilith",
  aspect: "square",
  planetB: "moon",
  voice: "Sofia"
});
assert.equal(lilithAspect.headline, "Sofia's Lilith square Moon");
assert.match(lilithAspect.body, /Suppressed needs always surface ugly/u);
assert.doesNotMatch(lilithAspect.body, /\byou(?:r|rs|self)?\b/iu);

const outerConnection = transitRenderer.renderSynastryAspect({
  planetA: "venus",
  planetB: "pluto",
  aspect: "trine",
  otherName: "Sofia"
});
assert.equal(outerConnection.headline, "Your Venus trine Sofia's Pluto");
assert.match(outerConnection.body, /the attraction between you runs hotter and deeper than either expected/u);
assert.match(outerConnection.body, /Build the trust to match the heat/u);

const connectionTransit = transitRenderer.renderBondTransit({
  transiting: "saturn",
  aspect: "square",
  planetA: "venus",
  planetB: "pluto",
  natalAspect: "trine",
  otherName: "Sofia",
  window: "Until November 13"
});
assert.match(connectionTransit.body, /^Until November 13, Saturn is square the line between your Venus and Sofia's Pluto\./u);
assert.match(connectionTransit.body, /Reliability stops being a promise and starts being something you have to prove/u);

const baseConnectionVariant = transitRenderer.renderBondTransit({
  transiting: "mars",
  aspect: "square",
  planetA: "moon",
  planetB: "venus",
  otherName: "X"
});
const thirdConnectionVariant = transitRenderer.renderBondTransit({
  transiting: "mars",
  aspect: "square",
  planetA: "moon",
  planetB: "venus",
  otherName: "X",
  variant: 3
});
assert.notEqual(thirdConnectionVariant.body, baseConnectionVariant.body);

const appSource = fs.readFileSync(path.join(repoRoot, "apps/web/src/App.tsx"), "utf8");
const runtimeSource = fs.readFileSync(
  path.join(repoRoot, "apps/web/src/content/fallbackArchitectureV3Runtime.ts"),
  "utf8"
);

assert.match(
  appSource,
  /renderTransitAspect\(\{[\s\S]*?voice[\s\S]*?\}\)/u,
  "Friend transit cards must pass voice through renderTransitAspect."
);
assert.match(
  appSource,
  /renderTransitHouse\(\{[\s\S]*?voice[\s\S]*?\}\)/u,
  "Transit house cards must pass voice through renderTransitHouse."
);
assert.match(
  appSource,
  /renderNatalAspect\(\{[\s\S]*?voice: ownerContext\?\.ownerName \?\? "you"[\s\S]*?\}\)/u,
  "Friend natal aspects must use the natal renderer with friend voice."
);
assert.match(
  appSource,
  /renderSynastryAspect\(\{[\s\S]*?planetA: normalizeContentIdPart\(contact\.yourPoint\.name\)[\s\S]*?planetB: normalizeContentIdPart\(contact\.friendPoint\.name\)[\s\S]*?otherName: friendName[\s\S]*?\}\)/u,
  "Synastry must stay reader-directed: planetA is reader, planetB is friend."
);
assert.match(
  appSource,
  /Math\.min\(\.\.\.transit\.arc\) <= 1[\s\S]*?renderBondTransit\(\{/u,
  "Bond transits must use the <=1 degree endpoint gate before renderBondTransit."
);
assert.match(
  appSource,
  /renderTransitAspect\(\{[\s\S]*?variant: stableTransitCopyVariant\(/u,
  "Transit aspects must receive a stable repeat-viewer variant."
);
assert.match(
  appSource,
  /renderTransitHouse\(\{[\s\S]*?variant: stableTransitCopyVariant\(/u,
  "Friend transit houses must receive a stable repeat-viewer variant."
);
assert.match(
  appSource,
  /renderBondTransit\(\{[\s\S]*?variant: stableTransitCopyVariant\(/u,
  "Connection transits must receive a stable repeat-viewer variant."
);
assert.match(
  runtimeSource,
  /authoredCards: bundle\.transitLib\.authoredCards\.filter\(isReaderEligible\)/u,
  "Production must filter review-gated authored cards before creating the dist renderer."
);
assert.match(
  runtimeSource,
  /hookRows: \(bundle\.rowsFile\.hookRows \?\? \[\]\)\.filter\(isReaderEligible\)/u,
  "Production must filter review-gated hook variants before creating the dist renderer."
);

console.log("fallback refresh wiring checks passed", counts);
