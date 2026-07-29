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

assert.equal(PACKAGE_VERSION, "v3-2026-07-29o");

const expectedNote = "Everyone has all 12 houses, and an empty house is normal. It means no planet was there when you were born, not that this area is missing from your life. To understand it, look to the planet that rules the sign on the house and where that planet sits in your chart. A birth chart can name a pattern before it feels obvious.";
const expectedAries = "With Aries on the 11th house, friends, community, and long-term hopes respond best to speed and directness. You may know quickly who you want around you and which future plans you are ready to pursue. Waiting too long can create more frustration than giving a direct answer. Mars rules Aries, so what happens in this house is connected to where Mars sits in your chart. Your Mars is in Aquarius, in the 9th house. You act once the plan makes sense to you, and you are usually more motivated by the principle than by competition. You can stay with a difficult goal for a long time, especially when you have room to choose your own method. Pressure without a clear reason tends to make you resist rather than move faster. Friends and future plans may develop through belief systems, spiritual direction, and long-term goals. Timing: You may notice more activity here when a transit reaches Mars or when a current planet moves through your 11th house.";
const expectedGemini = "With Gemini on the 1st house, identity, the body, and self-presentation develop through movement, conversation, and trying more than one option. Talking it through, trying both options, and changing your mind are all part of how this area works. Mercury rules Gemini, so what happens in this house is connected to where Mercury sits in your chart. Your Mercury is in Pisces, in the 10th house. Your mind works through images, impressions, and what you pick up between the lines. You may understand the mood of a conversation before anyone says what is wrong, while exact details can be harder to hold when you are overwhelmed. You often arrive at the point by following an impression first and explaining the logic afterward. Your identity may become clearer through career, visibility, and legacy. Timing: You may notice more activity here when a transit reaches Mercury or when a current planet moves through your 1st house.";

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
assert.match(cancerMoonScorpio.parts[0], /^With Cancer on the 2nd house,/u, "Cancer M1 row must render in QA preview.");
assert.equal(cancerMoonScorpio.parts[1], "The Moon rules Cancer, so what happens in this house is connected to where the Moon sits in your chart.");
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
  const bridgeRow = hooksByKey.get(`fallback-hook/empty-house-bridge/${house}`);
  assert.ok(jurisdictionRow, `Missing house-jurisdiction row ${house}.`);
  assert.equal(bridgeRow?.review_status, "approved", `Empty-house bridge ${house} must be reader-serving.`);
  assert.doesNotMatch(
    jurisdictionRow.body,
    /^(?:about|around|at|by|for|from|in|of|on|through|to|with)\b/iu,
    `House-jurisdiction ${house} must begin with a bare noun phrase.`
  );
}

let parityCount = 0;
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
      const expectedM2 = `${rulerReference.replace(/^./, (character) => character.toUpperCase())} rules ${title(sign)}, so what happens in this house is connected to where ${rulerReference} sits in ${voice === "you" ? "your" : "their"} chart.`;
      const bridgeLead = hooksByKey.get(
        `fallback-hook/empty-house-bridge/${house}`
      )?.[voice === "you" ? "body_you" : "body_they"];
      const rulerHouseJurisdiction = vocabularyByKey.get(
        `fallback-vocab/house-jurisdiction/${facts.rulerHouse}`
      )?.body;

      assert.deepEqual(browserResult, nodeResult, `${house}/${sign}/${voice}: browser/Node parity`);
      assert.equal(browserResult.parts.length, 5, `${house}/${sign}/${voice}: five movements`);
      assert.equal(browserResult.parts[1], expectedM2, `${house}/${sign}/${voice}: primary-ruler M2`);
      assert.ok(
        browserResult.parts[2].endsWith(placementLine),
        `${house}/${sign}/${voice}: M3 must preserve the dual-voice placement sentence`
      );
      assert.equal(
        browserResult.parts[3],
        `${bridgeLead} through ${rulerHouseJurisdiction}.`,
        `${house}/${sign}/${voice}: M4 must use its source-house lead and compact ruler-house jurisdiction`
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
        browserResult.body,
        /story of this house|surface there|takes its cues|gets lit up|this side of (?:your|their) life|asks for real decisions|answers to/iu,
        `${house}/${sign}/${voice}: retired empty-house language`
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
console.log("empty-house refinement passed: 2 byte-matched examples, 288/288 reader-serving parity, five movements, primary rulers, and grammar gates");
