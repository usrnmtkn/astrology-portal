#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  SourceGapError,
  createTransitSynastryRenderer
} from "../apps/web/src/content/fallbackArchitectureV3/dist/tldr-content.js";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const packageDir = path.join(repoRoot, "apps/web/src/content/fallbackArchitectureV3");
const readJson = (relativePath) => JSON.parse(
  fs.readFileSync(path.join(packageDir, relativePath), "utf8")
);

const baseLibrary = readJson("source-rows/transit-synastry-rows-v1.json");
const baseRows = readJson("source-rows/fallback-source-rows-v3.json");
const blend = readJson("source-rows/lunation-blend-units-v1.json");
const templates = readJson("templates/fallback-templates-v3.json");
const renderer = createTransitSynastryRenderer(
  {
    authoredCards: [
      ...baseLibrary.authoredCards,
      ...blend.authoredCards
    ]
  },
  templates,
  {
    ...baseRows,
    hookRows: [
      ...baseRows.hookRows,
      ...blend.hookRows
    ]
  }
);

assert.equal(blend.authoredCards.length, 1);
assert.equal(blend.hookRows.length, 13);
assert.ok(
  [...blend.authoredCards, ...blend.hookRows]
    .every((row) => row.review_status === "approved"),
  "Owner approval must make every delivered lunation blend unit reader-eligible."
);
assert.ok(
  blend.hookRows
    .filter((row) => row.contentKey.startsWith("fallback-hook/lunation-ruler-house/"))
    .every((row) => !/\byour\s+(?:1st|2nd|3rd|\d+th)\s+house\b/iu.test(row.body_you)),
  "Moving-body house numbers must remain computed slots, never authored ruler-hook copy."
);

const macro = renderer.renderLunationMacro({
  kind: "full-moon",
  sign: "aquarius"
});
assert.equal(macro.headline, blend.authoredCards[0].headline);
assert.equal(macro.body, blend.authoredCards[0].body);

const gemini = renderer.renderLunationHoroscope({
  kind: "full-moon",
  sign: "aquarius",
  risingSign: "gemini",
  moonHouse: 9,
  sunHouse: 3,
  ruler: "saturn",
  rulerHouse: 11,
  uranusHouse: 1,
  uranusLayerActive: true
});
const geminiCounterpoint = gemini.parts.findIndex((part) => part.startsWith("The friction this week"));
const geminiRuler = gemini.parts.findIndex((part) => part.startsWith("With Saturn ruling this Full Moon"));
const geminiUranus = gemini.parts.findIndex((part) => part.startsWith("Uranus in your 1st house"));
assert.match(gemini.parts[0], /9th house/u);
assert.match(gemini.body, /Saturn rules this sign/u);
assert.doesNotMatch(gemini.body, /Uranus rules this sign/u);
assert.ok(geminiCounterpoint > 1, "Counterpoint must follow the house frame and sign core.");
assert.ok(geminiRuler > geminiCounterpoint, "Ruler-house localization must follow the counterpoint.");
assert.match(gemini.parts[geminiCounterpoint], /3rd house/u);
assert.match(
  gemini.parts[geminiRuler],
  /^With Saturn ruling this Full Moon from your 11th house, the realizations arrive through your circles: the group chat, the friend's news, the cause that suddenly needs your answer\.$/u
);
assert.ok(geminiUranus > geminiRuler, "The conditional Uranus layer must follow the traditional ruler line.");
assert.equal(
  gemini.parts[geminiUranus],
  "Uranus in your 1st house adds a more personal element of change. Other people may notice that your direction, language, or presentation is changing before you have fully explained it."
);

const leo = renderer.renderLunationHoroscope({
  kind: "full-moon",
  sign: "aquarius",
  risingSign: "leo",
  moonHouse: 7,
  sunHouse: 1,
  ruler: "saturn",
  rulerHouse: 9,
  uranusHouse: 11,
  uranusLayerActive: true
});
assert.match(leo.parts[0], /7th house/u);
assert.match(leo.body, /your 1st house/u);
assert.match(
  leo.body,
  /With Saturn ruling this Full Moon from your 9th house, the realizations arrive through the bigger frame:/u
);
assert.doesNotMatch(leo.body, /Uranus in your/u, "Missing Uranus house copy must skip the secondary layer.");

const cancerNewMoon = renderer.renderLunationHoroscope({
  kind: "new-moon",
  sign: "cancer",
  risingSign: "aries",
  moonHouse: 4,
  sunHouse: 4,
  ruler: "moon",
  rulerHouse: 4
});
assert.doesNotMatch(cancerNewMoon.body, /The friction this week/u);
assert.doesNotMatch(cancerNewMoon.body, /ruling this New Moon/u);

const saturnVenus = baseLibrary.authoredCards.find(
  (row) => row.contentKey === "authored/transit-aspect/saturn/venus/square"
);
assert.ok(saturnVenus, "The owner-final Saturn-Venus square unit must be imported.");
const renderedSaturnVenus = renderer.renderTransitAspect({
  transiting: "saturn",
  natal: "venus",
  aspect: "square"
});
assert.equal(renderedSaturnVenus.headline, saturnVenus.headline);
assert.equal(renderedSaturnVenus.body, saturnVenus.body_you);

assert.throws(
  () => renderer.renderLunationMacro({ kind: "full-moon", sign: "aries" }),
  SourceGapError,
  "Missing macro coverage must remain an explicit source gap."
);

const skyArticle = renderer.renderSkyLunation({
  kind: "full-moon",
  sign: "aquarius",
  dateLine: "On July 29"
});
assert.ok(
  skyArticle.body.startsWith(blend.authoredCards[0].body),
  "The approved macro must lead the matching Sky lunation article."
);

console.log("lunation blend assembly checks passed: Saturn rulership, computed houses, conditional Uranus layer, and exact aspect copy");
