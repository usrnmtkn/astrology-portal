#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  PACKAGE_VERSION,
  createFallbackRenderer
} from "../apps/web/src/content/fallbackArchitectureV3/dist/tldr-content.js";
import {
  renderNatalEmptyHouse as renderNatalEmptyHouseNode
} from "../apps/web/src/content/fallbackArchitectureV3/resolver/renderFallback.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const packageDir = path.join(repoRoot, "apps/web/src/content/fallbackArchitectureV3");
const rows = JSON.parse(
  fs.readFileSync(path.join(packageDir, "source-rows/fallback-source-rows-v3.json"), "utf8")
);
const templates = JSON.parse(
  fs.readFileSync(path.join(packageDir, "templates/fallback-templates-v3.json"), "utf8")
);
const browserRenderer = createFallbackRenderer(templates, rows);
const signs = [
  "aries",
  "taurus",
  "gemini",
  "cancer",
  "leo",
  "virgo",
  "libra",
  "scorpio",
  "sagittarius",
  "capricorn",
  "aquarius",
  "pisces"
];
const primaryRulers = {
  aries: "mars",
  taurus: "venus",
  gemini: "mercury",
  cancer: "moon",
  leo: "sun",
  virgo: "mercury",
  libra: "venus",
  scorpio: "mars",
  sagittarius: "jupiter",
  capricorn: "saturn",
  aquarius: "saturn",
  pisces: "jupiter"
};
const modernRulers = {
  scorpio: "pluto",
  aquarius: "uranus",
  pisces: "neptune"
};
const rulerReferences = {
  sun: "the Sun",
  moon: "the Moon"
};
const title = (value) => value.replace(/\b\w/g, (character) => character.toUpperCase());
const occurrences = (body, value) => body.split(value).length - 1;
const vocabularyByKey = new Map(rows.vocabularyRows.map((row) => [row.contentKey, row]));
const hooksByKey = new Map(rows.hookRows.map((row) => [row.contentKey, row]));

assert.equal(PACKAGE_VERSION, "v3-2026-07-29m");

const expectedNote = "Everyone has all 12 houses, and an empty one is normal: no planet sat there when you were born, not that the area is missing from your life. An empty house takes its instructions from its ruling planet, wherever that planet sits. A birth chart can name a pattern before it feels obvious.";
const expectedAries = "With Aries on the 11th house, friends, community, and long-term hopes respond best to speed and directness. You lose little by deciding fast here; the mistakes correct themselves quicker than the waiting does. Mars rules Aries, so this house takes its cues from wherever Mars sits in your chart. Your Mars is in Aquarius, in the 9th house. You act once the plan makes sense to you, and you are usually more motivated by the principle than by competition. You can stay with a difficult goal for a long time, especially when you have room to choose your own method. Pressure without a clear reason tends to make you resist rather than move faster. So the story of this house tends to surface there: through belief, study, travel, and the bigger picture. Timing: Quiet stretches here are normal. When Mars gets lit up, or a current planet crosses your 11th house, this side of your life steps forward and asks for real decisions.";
const expectedGemini = "With Gemini on the 1st house, identity, the body, and self-presentation stay healthy by staying in motion. Talking it through, trying both options, and changing your mind are all part of how this area works. Mercury rules Gemini, so this house takes its cues from wherever Mercury sits in your chart. Your Mercury is in Pisces, in the 10th house. Your mind works through images, impressions, and what you pick up between the lines. You may understand the mood of a conversation before anyone says what is wrong, while exact details can be harder to hold when you are overwhelmed. You often arrive at the point by following an impression first and explaining the logic afterward. So the story of this house tends to surface there: through career, reputation, and public role. Timing: Quiet stretches here are normal. When Mercury gets lit up, or a current planet crosses your 1st house, this side of your life steps forward and asks for real decisions.";

const ariesWorkedExample = browserRenderer.renderNatalEmptyHouse({
  house: 11,
  sign: "aries",
  primaryRuler: "mars",
  modernRuler: "pluto",
  ruler: "pluto",
  rulerSign: "aquarius",
  rulerHouse: 9,
  voice: "you"
}, { allowUnreviewed: true });
const geminiWorkedExample = browserRenderer.renderNatalEmptyHouse({
  house: 1,
  sign: "gemini",
  primaryRuler: "mercury",
  modernRuler: "uranus",
  ruler: "uranus",
  rulerSign: "pisces",
  rulerHouse: 10,
  voice: "you"
}, { allowUnreviewed: true });
assert.equal(ariesWorkedExample.note, expectedNote);
assert.equal(ariesWorkedExample.body, expectedAries);
assert.equal(geminiWorkedExample.body, expectedGemini);

const cancerMoonScorpio = browserRenderer.renderNatalEmptyHouse({
  house: 2,
  sign: "cancer",
  primaryRuler: "moon",
  rulerSign: "scorpio",
  rulerHouse: 6,
  voice: "you"
}, { allowUnreviewed: true });
const moonScorpioPlacementRow = hooksByKey.get("fallback-hook/placement-sentence/moon/scorpio");
const moonScorpioPlacementCard = browserRenderer.renderNatalPlacement({
  planet: "moon",
  sign: "scorpio",
  house: 6,
  voice: "you"
}, { allowUnreviewed: true });
assert.equal(moonScorpioPlacementRow?.positive_test, "passed-jul29-criteria");
assert.match(cancerMoonScorpio.parts[0], /^With Cancer on the 2nd house,/u, "Cancer M1 row must render in QA preview.");
assert.equal(cancerMoonScorpio.parts[1], "The Moon rules Cancer, so this house takes its cues from wherever the Moon sits in your chart.");
assert.ok(
  cancerMoonScorpio.parts[2].endsWith(moonScorpioPlacementRow.body_you),
  "Empty-house M3 must use the Moon-in-Scorpio placement sentence bytes."
);
assert.ok(
  moonScorpioPlacementCard.body.includes(moonScorpioPlacementRow.body_you),
  "Natal placement card must use the same Moon-in-Scorpio placement sentence bytes."
);
assert.match(cancerMoonScorpio.parts[4], /^Timing:/u, "Empty-house close must keep the labeled Timing line.");
assert.doesNotMatch(cancerMoonScorpio.body, /\b(?:hurt|pouring|creative)\b/iu, "Cancer/Moon/Scorpio QA assembly must avoid blocked batch strings.");
assert.throws(
  () => browserRenderer.renderNatalEmptyHouse({
    house: 2,
    sign: "cancer",
    primaryRuler: "moon",
    rulerSign: "scorpio",
    rulerHouse: 6,
    voice: "you"
  }),
  /SOURCE_GAP/u,
  "needs_review M1/M3 rows must not serve without QA preview."
);

for (let house = 1; house <= 12; house += 1) {
  const jurisdictionRow = vocabularyByKey.get(`fallback-vocab/house-jurisdiction/${house}`);
  assert.ok(jurisdictionRow, `Missing house-jurisdiction row ${house}.`);
  assert.doesNotMatch(
    jurisdictionRow.body,
    /^(?:about|around|at|by|for|from|in|of|on|through|to|with)\b/iu,
    `House-jurisdiction ${house} must begin with a bare noun phrase.`
  );
}

let parityCount = 0;
for (let house = 1; house <= 12; house += 1) {
  for (const sign of signs) {
    for (const voice of ["you", "Sofia"]) {
      const primaryRuler = primaryRulers[sign];
      const modernRuler = modernRulers[sign] ?? "pluto";
      const facts = {
        house,
        sign,
        primaryRuler,
        modernRuler,
        ruler: modernRuler,
        rulerSign: "capricorn",
        rulerHouse: ((house + 3) % 12) + 1,
        voice
      };
      const browserResult = browserRenderer.renderNatalEmptyHouse(facts, { allowUnreviewed: true });
      const nodeResult = renderNatalEmptyHouseNode(facts, { allowUnreviewed: true });
      const houseTopic = vocabularyByKey.get(`fallback-vocab/house-topic/${house}`)?.body;
      const placementLine = hooksByKey.get(
        `fallback-hook/placement-sentence/${primaryRuler}/capricorn`
      )?.[voice === "you" ? "body_you" : "body_they"];
      const rulerReference = rulerReferences[primaryRuler] ?? title(primaryRuler);
      const expectedM2 = `${rulerReference.replace(/^./, (character) => character.toUpperCase())} rules ${title(sign)}, so this house takes its cues from wherever ${rulerReference} sits in ${voice === "you" ? "your" : "their"} chart.`;

      assert.deepEqual(browserResult, nodeResult, `${house}/${sign}/${voice}: browser/Node parity`);
      assert.equal(browserResult.parts.length, 5, `${house}/${sign}/${voice}: five movements`);
      assert.equal(browserResult.parts[1], expectedM2, `${house}/${sign}/${voice}: primary-ruler M2`);
      assert.ok(
        browserResult.parts[2].endsWith(placementLine),
        `${house}/${sign}/${voice}: M3 must preserve the dual-voice placement sentence`
      );
      assert.equal(
        occurrences(browserResult.body, houseTopic),
        1,
        `${house}/${sign}/${voice}: house jurisdiction must render exactly once`
      );
      assert.doesNotMatch(
        browserResult.body,
        /(?:—|--)/u,
        `${house}/${sign}/${voice}: assembled punctuation gate`
      );
      assert.doesNotMatch(
        browserResult.parts[1],
        /\b(?:Mars|Saturn|Jupiter)\s+and\s+(?:Pluto|Uranus|Neptune)\b/u,
        `${house}/${sign}/${voice}: M2 must not include a modern co-ruler`
      );
      assert.doesNotMatch(
        browserResult.parts[1],
        /\bis ruled by\b[\s\S]*\bso\b/iu,
        `${house}/${sign}/${voice}: retired rulership restatement`
      );
      parityCount += 1;
    }
  }
}

assert.equal(parityCount, 288);
console.log("empty-house refinement passed: 2 byte-matched examples, 288/288 parity, five movements, primary rulers, and grammar gates");
