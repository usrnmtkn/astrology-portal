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
const appSource = fs.readFileSync(path.join(repoRoot, "apps/web/src/App.tsx"), "utf8");
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

assert.equal(PACKAGE_VERSION, "v3-2026-08-10d");

const expectedNote = "Everyone has all 12 houses, and an empty house is normal. It means no planet was there when you were born, not that this area is missing from your life. To understand it, look to the planet that rules the sign on the house and where that planet sits in your chart. A birth chart can name a pattern before it feels obvious.";
const expectedAries = "With Aries on your 11th house, friends, community, and long-term hopes respond best to speed and directness. You may know quickly who you want around you and which future plans you are ready to pursue. Waiting too long can create more frustration than giving a direct answer. Because Aries is ruled by Mars, what happens here is guided by where your Mars sits: in Aquarius, in your 9th house of belief systems, spiritual direction, and long-term goals. You act on the principle and the plan, most freely when nobody is standing over you. Direct orders slow you down; a reason speeds you up. Because of this, friends and future plans may develop through the way you handle belief, study, travel, and the bigger picture. Timing: You may notice more activity here when a transit reaches your Mars or when a current planet moves through your 11th house.";
const expectedGemini = "With Gemini on your 1st house, identity, the body, and self-presentation develop through movement, conversation, and trying more than one option. Talking it through, trying both options, and changing your mind are all part of how this area works. Because Gemini is ruled by Mercury, what happens here is guided by where your Mercury sits: in Pisces, in your 10th house of career, visibility, and legacy. You follow a hunch to the answer and build the reasoning on the way back. Exact figures and firm dates hold badly when the mood around you is heavy. Because of this, your identity may become clearer through the way you handle career, reputation, and public role. Timing: You may notice more activity here when a transit reaches your Mercury or when a current planet moves through your 1st house.";
const expectedCancer = "With Cancer on your 2nd house, money, worth, and values run on feeling first. This area responds to trust and familiarity, and past experience carries real weight. Because Cancer is ruled by the Moon, what happens here is guided by where your Moon sits: in Scorpio, in your 6th house of daily work, routines, and health. Your sense of security depends on certainty: you commit slowly, read what is not being said, and hold back until a person or plan has proven itself. Once it has, the loyalty is total. Because of this, money and questions of worth may come together through the way you handle your work and routines. Timing: You may notice more activity here when a transit reaches your Moon or when a current planet moves through your 2nd house.";

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
const moonScorpioMethodRow = hooksByKey.get("fallback-hook/ruler-method/moon/scorpio");
const moonScorpioPlacementRow = hooksByKey.get("fallback-hook/placement-sentence/moon/scorpio");
const moonSixthHouseLivedRow = hooksByKey.get("fallback-hook/placement-house-lived/moon/6");
const moonScorpioPlacementCard = browserRenderer.renderNatalPlacement({
  planet: "moon",
  sign: "scorpio",
  house: 6,
  voice: "you"
}, { allowUnreviewed: true });
const moonScorpioNamedPlacementCard = browserRenderer.renderNatalPlacement({
  planet: "moon",
  sign: "scorpio",
  house: 6,
  voice: "Bird"
}, { allowUnreviewed: true });
assert.equal(moonScorpioPlacementRow?.positive_test, "passed-jul29-criteria");
assert.equal(moonScorpioPlacementRow?.review_status, "approved");
assert.equal(moonScorpioMethodRow?.review_status, "approved");
assert.equal(
  cancerMoonScorpio.parts[0],
  "With Cancer on your 2nd house, money, worth, and values run on feeling first. This area responds to trust and familiarity, and past experience carries real weight."
);
assert.equal(
  cancerMoonScorpio.parts[1],
  "Because Cancer is ruled by the Moon, what happens here is guided by where your Moon sits: in Scorpio, in your 6th house of daily work, routines, and health."
);
assert.equal(
  cancerMoonScorpio.parts[2],
  moonScorpioMethodRow.body_you,
  "Empty-house M3 must use the approved Moon-in-Scorpio ruler-method bytes."
);
assert.equal(
  cancerMoonScorpio.parts[3],
  "Because of this, money and questions of worth may come together through the way you handle your work and routines."
);
assert.equal(cancerMoonScorpio.body, expectedCancer, "The owner-final Cancer 2H worked example must render byte-for-byte.");
assert.equal(
  cancerMoonScorpio.parts[4],
  "Timing: You may notice more activity here when a transit reaches your Moon or when a current planet moves through your 2nd house."
);
assert.equal(
  moonScorpioPlacementCard.body,
  moonSixthHouseLivedRow.body,
  "Reader natal placements must prefer the exact lived house row."
);
assert.ok(
  moonScorpioNamedPlacementCard.body.includes(moonScorpioPlacementRow.body_they),
  "Named-voice natal placements must continue using the portrait-style placement sentence."
);
assert.ok(
  !moonScorpioPlacementCard.body.includes(moonScorpioMethodRow.body_you),
  "Ruler-method rows must remain scoped to empty-house M3."
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

const rulerMethodRows = rows.hookRows.filter(
  (row) => row.contentKey.startsWith("fallback-hook/ruler-method/")
);
assert.equal(rulerMethodRows.length, 84, "The complete ruler-method family must contain 84 rows.");
assert.equal(
  hooksByKey.get("fallback-hook/ruler-method/moon/aries")?.body_you,
  "You settle by acting: a fast reaction, a direct answer, and the mood clears as quickly as it came. What throws you most is having to wait.",
  "The refreshed Moon-in-Aries row must retain the owner-approved wording."
);
assert.equal(
  hooksByKey.get("fallback-hook/ruler-method/jupiter/sagittarius")?.body_you,
  "You grow by range: travel, study, belief tested against the world, and the bet on meaning over comfort. Faith in the destination is your fuel and your risk.",
  "The refreshed Jupiter-in-Sagittarius row must retain the owner-approved wording."
);
for (const row of rulerMethodRows) {
  const [, , planet, sign] = row.contentKey.split("/");
  assert.equal(row.review_status, "approved", `${row.contentKey}: owner approval must be recorded.`);
  assert.deepEqual(
    row.source_keys,
    [
      `cc/planet-in-sign/${planet}-in-${sign}`,
      `book/201419935-a-spiritual-approach-to-astrology/${planet}-in-the-signs/${sign}`
    ],
    `${row.contentKey}: both source anchors must be retained.`
  );
  assert.doesNotMatch(
    `${row.body_you} ${row.body_they}`,
    /\b(?:guided|sits|ruled|handle|notice|house|timing)\b/iu,
    `${row.contentKey}: frame words belong to the renderer, not M3.`
  );
  assert.doesNotMatch(
    row.body_they,
    /\b(?:you|your|yours|yourself)\b/iu,
    `${row.contentKey}: friend voice must not leak second person.`
  );
}

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
        `fallback-hook/ruler-method/${primaryRuler}/capricorn`
      )?.[voice === "you" ? "body_you" : "body_they"];
      const rulerReference = rulerReferences[primaryRuler] ?? title(primaryRuler);
      const rulerHouseJurisdiction = vocabularyByKey.get(
        `fallback-vocab/empty-house-ruler-jurisdiction/${facts.rulerHouse}`
      )?.body ?? vocabularyByKey.get(
        voice === "you"
          ? `fallback-vocab/house-jurisdiction/${facts.rulerHouse}`
          : `fallback-vocab/house-jurisdiction-they/${facts.rulerHouse}`
      )?.body ?? vocabularyByKey.get(`fallback-vocab/house-jurisdiction/${facts.rulerHouse}`)?.body;
      const possessive = voice === "you" ? "your" : "their";
      const expectedM2 = `Because ${title(sign)} is ruled by ${rulerReference}, what happens here is guided by where ${possessive} ${title(primaryRuler)} sits: in Capricorn, in ${possessive} ${ordinal(facts.rulerHouse)} house of ${rulerHouseJurisdiction}.`;
      const bridgeLead = hooksByKey.get(
        `fallback-hook/empty-house-bridge/${house}`
      )?.[voice === "you" ? "body_you" : "body_they"];
      const emptyHouseRulerTopic = vocabularyByKey.get(
        `fallback-vocab/empty-house-ruler-topic/${facts.rulerHouse}`
      )?.body;
      const rulerHouseTopic = emptyHouseRulerTopic
        ? `${possessive} ${emptyHouseRulerTopic}`
        : vocabularyByKey.get(`fallback-vocab/house-topic/${facts.rulerHouse}`)?.body;

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

const mercuryMethod = hooksByKey.get("fallback-hook/ruler-method/mercury/pisces")?.body_you;
const geminiMercuryCard = browserRenderer.renderNatalEmptyHouse({
  house: 3,
  sign: "gemini",
  primaryRuler: "mercury",
  rulerSign: "pisces",
  rulerHouse: 10,
  rulerOccurrence: 1,
  voice: "you"
});
const virgoMercuryCard = browserRenderer.renderNatalEmptyHouse({
  house: 6,
  sign: "virgo",
  primaryRuler: "mercury",
  rulerSign: "pisces",
  rulerHouse: 10,
  rulerOccurrence: 2,
  voice: "you"
});
assert.equal(geminiMercuryCard.parts.length, 5, "The first Mercury-ruled empty house keeps M3.");
assert.equal(virgoMercuryCard.parts.length, 4, "The second Mercury-ruled empty house suppresses M3.");
assert.equal(
  occurrences(`${geminiMercuryCard.body} ${virgoMercuryCard.body}`, mercuryMethod),
  1,
  "A shared Mercury method row must render once across Gemini- and Virgo-cusp cards."
);
assert.equal(
  virgoMercuryCard.parts[2],
  "Because Virgo is also ruled by Mercury, the same pattern applies: routines and health habits may take shape through the way you handle career, reputation, and public role.",
  "The second shared-ruler card must use the owner-approved same-pattern M4 frame."
);
assert.deepEqual(
  virgoMercuryCard,
  renderNatalEmptyHouseNode({
    house: 6,
    sign: "virgo",
    primaryRuler: "mercury",
    rulerSign: "pisces",
    rulerHouse: 10,
    rulerOccurrence: 2,
    voice: "you"
  }),
  "Shared-ruler suppression must retain browser/Node parity."
);
assert.match(
  appSource,
  /function emptyHouseRulerOccurrence[\s\S]*?emptyHouses[\s\S]*?currentRuler[\s\S]*?candidate <= house[\s\S]*?\.length \|\| 1;/u,
  "The app must compute a ruler occurrence from each profile's ordered empty-house set."
);
assert.equal(
  occurrences(appSource, "rulerOccurrence: emptyHouseRulerOccurrence"),
  2,
  "Both empty-house card and detail surfaces must pass the shared-ruler occurrence into the package."
);

console.log("empty-house V3 passed: 84 approved method rows, exact Cancer example, shared-ruler suppression, 288/288 parity, and jurisdiction gates");
