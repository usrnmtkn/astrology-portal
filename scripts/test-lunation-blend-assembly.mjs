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
const eligible = new Set(["approved", "approved_reuse", "reviewed"]);
const isReaderEligible = (row) => eligible.has(String(row.review_status ?? "").toLowerCase());

const baseLibrary = readJson("source-rows/transit-synastry-rows-v1.json");
const baseRows = readJson("source-rows/fallback-source-rows-v3.json");
const blend = readJson("source-rows/lunation-blend-units-v1.json");
const templates = readJson("templates/fallback-templates-v3.json");
const makeRenderer = ({ reader = false } = {}) => createTransitSynastryRenderer(
  {
    authoredCards: [
      ...baseLibrary.authoredCards,
      ...blend.authoredCards
    ].filter((row) => !reader || isReaderEligible(row))
  },
  templates,
  {
    ...baseRows,
    hookRows: [
      ...baseRows.hookRows,
      ...blend.hookRows
    ].filter((row) => !reader || isReaderEligible(row))
  }
);
const qaRenderer = makeRenderer();
const readerRenderer = makeRenderer({ reader: true });
const rulerRows = blend.hookRows.filter((row) => row.contentKey.includes("/lunation-ruler-house/"));
const uranusRows = blend.hookRows.filter((row) => row.contentKey.includes("/lunation-uranus-layer/"));

assert.equal(blend.authoredCards.length, 1);
assert.equal(rulerRows.length, 12);
assert.equal(uranusRows.length, 1);
assert.equal(rulerRows.filter(isReaderEligible).length, 1);
assert.equal(rulerRows.filter((row) => row.review_status === "needs_review").length, 11);
assert.equal(uranusRows[0].review_status, "approved");
assert.ok(
  [...rulerRows, ...uranusRows].every(
    (row) => !/\byour\s+(?:1st|2nd|3rd|\d+th)\s+house\b/iu.test(
      row.contentKey.includes("/lunation-ruler-house/") ? row.body_you : ""
    )
  ),
  "Moving-body house numbers must remain computed slots, never authored ruler-hook copy."
);

const macro = readerRenderer.renderLunationMacro({
  kind: "full-moon",
  sign: "aquarius"
});
assert.equal(macro.headline, blend.authoredCards[0].headline);
assert.equal(macro.body, blend.authoredCards[0].body);

const geminiFacts = {
  kind: "full-moon",
  sign: "aquarius",
  risingSign: "gemini",
  moonHouse: 9,
  sunHouse: 3,
  ruler: "saturn",
  rulerHouse: 11,
  uranusActive: true,
  uranusHouse: 1
};
const geminiQa = qaRenderer.renderLunationHoroscope(geminiFacts);
const geminiReader = readerRenderer.renderLunationHoroscope(geminiFacts);
const geminiCounterpoint = geminiQa.parts.findIndex((part) => part.startsWith("The friction this week"));
const geminiRuler = geminiQa.parts.findIndex((part) => part.startsWith("With Saturn ruling this lunation"));
const geminiUranus = geminiQa.parts.findIndex((part) => part.startsWith("Uranus in your 1st house"));
assert.match(geminiQa.parts[0], /9th house/u);
assert.ok(geminiCounterpoint > 1, "Counterpoint must follow the house frame and sign core.");
assert.ok(geminiRuler > geminiCounterpoint, "Traditional ruler localization must follow the counterpoint.");
assert.ok(geminiUranus > geminiRuler, "The modern secondary layer must follow, never replace, the ruler line.");
assert.match(geminiQa.parts[geminiCounterpoint], /3rd house/u);
assert.match(
  geminiQa.parts[geminiRuler],
  /^With Saturn ruling this lunation from your 11th house, the realizations arrive through your circles:/u
);
assert.doesNotMatch(
  geminiReader.body,
  /With Saturn ruling this lunation/u,
  "A needs-review ruler row must remain out of reader output."
);
assert.match(geminiReader.body, /Uranus in your 1st house adds a more personal element of change/u);

const houseOne = readerRenderer.renderLunationHoroscope({
  kind: "full-moon",
  sign: "aquarius",
  risingSign: "gemini",
  moonHouse: 9,
  sunHouse: 3,
  ruler: "saturn",
  rulerHouse: 1
});
assert.match(
  houseOne.body,
  /With Saturn ruling this lunation from your 1st house, the realizations arrive personally:/u
);

const leoReader = readerRenderer.renderLunationHoroscope({
  kind: "full-moon",
  sign: "aquarius",
  risingSign: "leo",
  moonHouse: 7,
  sunHouse: 1,
  ruler: "saturn",
  rulerHouse: 9
});
assert.match(leoReader.parts[0], /7th house/u);
assert.match(leoReader.body, /your 1st house/u);
assert.doesNotMatch(leoReader.body, /With Saturn ruling this lunation/u);

const cancerNewMoon = readerRenderer.renderLunationHoroscope({
  kind: "new-moon",
  sign: "cancer",
  risingSign: "aries",
  moonHouse: 4,
  sunHouse: 4,
  ruler: "moon",
  rulerHouse: 4
});
assert.doesNotMatch(cancerNewMoon.body, /The friction this week/u);
assert.doesNotMatch(cancerNewMoon.body, /ruling this lunation/u);

assert.throws(
  () => readerRenderer.renderLunationMacro({ kind: "full-moon", sign: "aries" }),
  SourceGapError,
  "Missing macro coverage must remain an explicit source gap."
);

const skyArticle = readerRenderer.renderSkyLunation({
  kind: "full-moon",
  sign: "aquarius",
  dateLine: "On July 29"
});
assert.ok(
  skyArticle.body.startsWith(blend.authoredCards[0].body),
  "The approved macro must lead the matching Sky lunation article."
);

console.log(
  "lunation blend assembly checks passed: 1 macro, 12 traditional-ruler rows, 1 Uranus layer, review gating, and skip rules"
);
