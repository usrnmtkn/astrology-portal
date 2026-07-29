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

assert.equal(PACKAGE_VERSION, "v3-2026-07-29j");

const expectedNote = "Everyone has all 12 houses, and an empty one is normal: no planet sat there when you were born, not that the area is missing from your life. An empty house takes its instructions from its ruling planet, wherever that planet sits. A birth chart can name a pattern before it feels obvious.";
const expectedAries = "With Aries on the 11th house, friends, community, and long-term hopes respond best to speed and directness. You lose little by deciding fast here; the mistakes correct themselves quicker than the waiting does. Aries answers to Mars, so this house takes its cues from wherever Mars sits in your chart. Your Mars is in Aquarius, in the 9th house. You act from the head, cool and enterprising, and in a real emergency you are the one who stays functional. What drives you is less obvious to others, since you keep the effort quiet and let results do the talking. Friends and respect come to you through what you can actually do, so keep doing it where people can see. So the story of this house tends to surface there: through belief, study, travel, and the bigger picture. Quiet stretches here are normal. When Mars gets lit up, or a current planet crosses your 11th house, this side of your life steps forward and asks for real decisions.";
const expectedGemini = "With Gemini on the 1st house, identity, the body, and self-presentation stay healthy by staying in motion. Talking it through, trying both options, and changing your mind are all part of how this area works. Gemini answers to Mercury, so this house takes its cues from wherever Mercury sits in your chart. Your Mercury is in Pisces, in the 10th house. Your mind works in images and impressions rather than tidy facts, and instinct usually gets there before reason does. Being pinned down to details feels like a cage, and a heavy mood can pull your thinking under with it. That imagination is real creative fuel, in music, writing, or anything poetic, so give it regular work instead of letting it drift. So the story of this house tends to surface there: through career, reputation, and public role. Quiet stretches here are normal. When Mercury gets lit up, or a current planet crosses your 1st house, this side of your life steps forward and asks for real decisions.";

const ariesWorkedExample = browserRenderer.renderNatalEmptyHouse({
  house: 11,
  sign: "aries",
  primaryRuler: "mars",
  modernRuler: "pluto",
  ruler: "pluto",
  rulerSign: "aquarius",
  rulerHouse: 9,
  voice: "you"
});
const geminiWorkedExample = browserRenderer.renderNatalEmptyHouse({
  house: 1,
  sign: "gemini",
  primaryRuler: "mercury",
  modernRuler: "uranus",
  ruler: "uranus",
  rulerSign: "pisces",
  rulerHouse: 10,
  voice: "you"
});
assert.equal(ariesWorkedExample.note, expectedNote);
assert.equal(ariesWorkedExample.body, expectedAries);
assert.equal(geminiWorkedExample.body, expectedGemini);

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
      const browserResult = browserRenderer.renderNatalEmptyHouse(facts);
      const nodeResult = renderNatalEmptyHouseNode(facts);
      const houseTopic = vocabularyByKey.get(`fallback-vocab/house-topic/${house}`)?.body;
      const placementLine = hooksByKey.get(
        `fallback-hook/placement-sentence/${primaryRuler}/capricorn`
      )?.[voice === "you" ? "body_you" : "body_they"];
      const rulerReference = rulerReferences[primaryRuler] ?? title(primaryRuler);
      const expectedM2 = `${title(sign)} answers to ${rulerReference}, so this house takes its cues from wherever ${rulerReference} sits in ${voice === "you" ? "your" : "their"} chart.`;

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
