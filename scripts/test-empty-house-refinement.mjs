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
const ordinal = (value) => value === 1 ? "1st" : value === 2 ? "2nd" : value === 3 ? "3rd" : `${value}th`;
const occurrences = (body, value) => body.split(value).length - 1;
const vocabularyByKey = new Map(rows.vocabularyRows.map((row) => [row.contentKey, row]));
const hooksByKey = new Map(rows.hookRows.map((row) => [row.contentKey, row]));

assert.equal(PACKAGE_VERSION, "v3-2026-07-29r");

const expectedNote = "Everyone has all 12 houses, and an empty house is normal. It means no planet was there when you were born, not that this area is missing from your life. To understand it, look to the planet that rules the sign on the house and where that planet sits in your chart. A birth chart can name a pattern before it feels obvious.";
const expectedAries = "With Aries on the 11th house, friends, community, and long-term hopes respond best to speed and directness. You may know quickly who you want around you and which future plans you are ready to pursue. Waiting too long can create more frustration than giving a direct answer. Because Aries is ruled by Mars, what happens here is guided by where your Mars sits: in Aquarius, in your 9th house of belief systems, spiritual direction, and long-term goals. You act once the plan makes sense to you, and you are usually more motivated by the principle than by competition. You can stay with a difficult goal for a long time, especially when you have room to choose your own method. Pressure without a clear reason tends to make you resist rather than move faster. Because of this, friends and future plans may develop through the way you handle belief, study, travel, and the bigger picture. Timing: You may notice more activity here when a transit reaches your Mars or when a current planet moves through your 11th house.";
const expectedGemini = "With Gemini on the 1st house, identity, the body, and self-presentation develop through movement, conversation, and trying more than one option. Talking it through, trying both options, and changing your mind are all part of how this area works. Because Gemini is ruled by Mercury, what happens here is guided by where your Mercury sits: in Pisces, in your 10th house of career, visibility, and legacy. Your mind works through images, impressions, and what you pick up between the lines. You may understand the mood of a conversation before anyone says what is wrong, while exact details can be harder to hold when you are overwhelmed. You often arrive at the point by following an impression first and explaining the logic afterward. Because of this, your identity may become clearer through the way you handle career, reputation, and public role. Timing: You may notice more activity here when a transit reaches your Mercury or when a current planet moves through your 1st house.";

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

const cancerMoonScorpio = browserRenderer.renderNatalEmptyHouse({
  house: 2,
  sign: "cancer",
  primaryRuler: "moon",
  rulerSign: "scorpio",
  rulerHouse: 6,
  voice: "you"
});
const moonScorpioPlacementRow = hooksByKey.get("fallback-hook/placement-sentence/moon/scorpio");
const moonScorpioPlacementCard = browserRenderer.renderNatalPlacement({
  planet: "moon",
  sign: "scorpio",
  house: 6,
  voice: "you"
}, { allowUnreviewed: true });
assert.equal(moonScorpioPlacementRow?.positive_test, "passed-jul29-criteria");
assert.equal(moonScorpioPlacementRow?.review_status, "approved");
assert.equal(
  cancerMoonScorpio.parts[0],
  "With Cancer on the 2nd house, money, worth, and values run on feeling first. This area responds to trust and familiarity, and past experience carries real weight."
);
assert.equal(
  cancerMoonScorpio.parts[1],
  "Because Cancer is ruled by the Moon, what happens here is guided by where your Moon sits: in Scorpio, in your 6th house of health, routines, and self-discipline."
);
assert.equal(
  cancerMoonScorpio.parts[2],
  moonScorpioPlacementRow.body_you,
  "Empty-house M3 must use the Moon-in-Scorpio placement sentence bytes untouched."
);
assert.equal(
  cancerMoonScorpio.parts[3],
  "Because of this, money and questions of worth may come together through the way you handle work, health, and daily routine."
);
assert.equal(
  cancerMoonScorpio.parts[4],
  "Timing: You may notice more activity here when a transit reaches your Moon or when a current planet moves through your 2nd house."
);
assert.ok(
  moonScorpioPlacementCard.body.includes(moonScorpioPlacementRow.body_you),
  "Natal placement card must use the same Moon-in-Scorpio placement sentence bytes."
);
assert.doesNotMatch(cancerMoonScorpio.body, /\b(?:hurt|pouring|creative)\b/iu, "Cancer/Moon/Scorpio QA assembly must avoid blocked batch strings.");
assert.equal(
  browserRenderer.renderNatalEmptyHouse({
    house: 2,
    sign: "cancer",
    primaryRuler: "moon",
    rulerSign: "scorpio",
    rulerHouse: 6,
    voice: "you"
  }).body,
  cancerMoonScorpio.body,
  "Owner-cleared M1/M3 rows must serve without the QA preview bypass."
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

const expectedVariantKeys = ["f", "a", "b", "c", "d", "e"];
const previewM2Bodies = expectedVariantKeys.map((variant, index) => {
  const house = index + 1;
  const row = hooksByKey.get(`fallback-hook/empty-house-ruler-v3/${variant}`);
  assert.equal(row?.review_status, "needs_review", `V3 M2 variant ${variant.toUpperCase()} must remain review-gated.`);
  return browserRenderer.renderNatalEmptyHouse({
    house,
    sign: "cancer",
    primaryRuler: "moon",
    rulerSign: "scorpio",
    rulerHouse: 6,
    voice: "you"
  }, { allowUnreviewed: true }).parts[1];
});
assert.equal(
  new Set(previewM2Bodies).size,
  6,
  "The six modulo buckets must preview six distinct V3 M2 variants."
);

let parityCount = 0;
const repeatedClosingSentences = new Map();
for (let house = 1; house <= 12; house += 1) {
  for (const sign of signs) {
    const cuspRow = hooksByKey.get(`fallback-hook/house-cusp/${sign}`);
    assert.equal(cuspRow?.review_status, "approved", `${sign} house-cusp row must be reader-serving.`);
    assert.doesNotMatch(
      `${cuspRow?.body_you ?? ""} ${cuspRow?.body_they ?? ""}`,
      /(^|[^{])\{(?:houseOrdinal|houseTopic)\}(?!\})/u,
      `${sign} house-cusp row must use double-brace slots.`
    );
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
      const rulerHouseJurisdiction = vocabularyByKey.get(
        voice === "you"
          ? `fallback-vocab/house-jurisdiction/${facts.rulerHouse}`
          : `fallback-vocab/house-jurisdiction-they/${facts.rulerHouse}`
      )?.body ?? vocabularyByKey.get(`fallback-vocab/house-jurisdiction/${facts.rulerHouse}`)?.body;
      const possessive = voice === "you" ? "your" : "their";
      const expectedM2 = `Because ${title(sign)} is ruled by ${rulerReference}, what happens here is guided by where ${possessive} ${title(primaryRuler)} sits: in Capricorn, in ${possessive} ${ordinal(facts.rulerHouse)} house of ${rulerHouseJurisdiction}.`;
      const bridgeLead = hooksByKey.get(
        `fallback-hook/empty-house-bridge/${house}`
      )?.[voice === "you" ? "body_you" : "body_they"];
      const rulerHouseTopic = vocabularyByKey.get(
        `fallback-vocab/house-topic/${facts.rulerHouse}`
      )?.body;

      assert.deepEqual(browserResult, nodeResult, `${house}/${sign}/${voice}: browser/Node parity`);
      assert.equal(browserResult.parts.length, 5, `${house}/${sign}/${voice}: five movements`);
      assert.equal(browserResult.parts[1], expectedM2, `${house}/${sign}/${voice}: primary-ruler M2`);
      assert.equal(
        browserResult.parts[2],
        placementLine,
        `${house}/${sign}/${voice}: M3 must preserve the dual-voice placement sentence`
      );
      assert.equal(
        browserResult.parts[3],
        `Because of this, ${bridgeLead.replace(/^./, (character) => character.toLowerCase())} through the way ${voice === "you" ? "you" : "they"} handle ${rulerHouseTopic}.`,
        `${house}/${sign}/${voice}: M4 must use the source-house bridge and compact ruler-house topic`
      );
      assert.equal(
        browserResult.parts[4],
        `Timing: ${voice === "you" ? "You" : "They"} may notice more activity here when a transit reaches ${possessive} ${title(primaryRuler)} or when a current planet moves through ${possessive} ${ordinal(house)} house.`,
        `${house}/${sign}/${voice}: M5 must keep the labeled timing frame`
      );
      assert.equal(
        occurrences(browserResult.body, houseTopic),
        1,
        `${house}/${sign}/${voice}: house jurisdiction must render exactly once`
      );
      assert.equal(
        occurrences(browserResult.body, rulerHouseJurisdiction),
        1,
        `${house}/${sign}/${voice}: ruler-house full jurisdiction must render exactly once`
      );
      assert.doesNotMatch(
        browserResult.body,
        /(?:—|--)/u,
        `${house}/${sign}/${voice}: assembled punctuation gate`
      );
      assert.doesNotMatch(
        browserResult.body,
        /story of this house|surface there|takes its cues|gets lit up|this side of (?:your|their) life|asks for real decisions|answers to/iu,
        `${house}/${sign}/${voice}: retired empty-house language`
      );
      assert.doesNotMatch(
        browserResult.parts[1],
        /\b(?:Mars|Saturn|Jupiter)\s+and\s+(?:Pluto|Uranus|Neptune)\b/u,
        `${house}/${sign}/${voice}: M2 must not include a modern co-ruler`
      );
      const closingSentence = browserResult.parts[4];
      const closingCount = repeatedClosingSentences.get(closingSentence) ?? 0;
      repeatedClosingSentences.set(closingSentence, closingCount + 1);
      parityCount += 1;
    }
  }
}

assert.equal(parityCount, 288);
for (const [sentence, count] of repeatedClosingSentences) {
  if (count > 1) {
    assert.match(sentence, /^Timing:/u, "Only labeled Timing lines may repeat as final sentences.");
  }
}
console.log("empty-house V3 passed: staged six-variant M2 family, 288/288 parity, five movements, primary rulers, and jurisdiction gates");
