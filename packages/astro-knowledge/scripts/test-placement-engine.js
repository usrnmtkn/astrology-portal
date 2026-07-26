#!/usr/bin/env node

const assert = require("node:assert/strict");
const generator = require("./generate-sky-aspect-cards.js");
const { buildJudgePrompt } = require("./judge-sky-voice.js");
const { lintCard } = require("./lint-sky-voice.js");
const examples = require("../voice/tldr-astro/examples.json");

async function main() {
const placementMode = "collective-placement-card";
const aspectGolds = examples.filter((entry) => (
  entry.surface === "sky"
  && entry.mode === "collective-aspect-card"
  && entry.canonical
));
const placementGolds = examples.filter((entry) => (
  entry.surface === "sky"
  && entry.mode === placementMode
  && entry.canonical
));

assert.equal(aspectGolds.length, 17);
assert.equal(placementGolds.length, 5);

for (const exemplar of aspectGolds) {
  const result = lintCard(exemplar.body);
  assert.deepEqual(
    { score: result.score, fails: result.fails, warns: result.warns },
    { score: 3, fails: 0, warns: 0 },
    `${exemplar.sourceId} must remain lint-clean in aspect mode.`
  );
}

for (const exemplar of placementGolds) {
  const result = lintCard(exemplar.body, { mode: placementMode });
  assert.deepEqual(
    { score: result.score, fails: result.fails, warns: result.warns },
    { score: 3, fails: 0, warns: 0 },
    `${exemplar.sourceId} must be lint-clean in placement mode.`
  );
}

const sunGold = placementGolds.find((entry) => entry.sourceId === "sky-sun-in-leo");
assert.ok(sunGold);
const bodyYou = sunGold.body.replace(
  "Warmth, nerve,",
  "You can feel the change before anyone names it. Warmth, nerve,"
);
const bodyYouLint = lintCard(bodyYou, { mode: placementMode });
assert.equal(bodyYouLint.score, 1);
assert.ok(bodyYouLint.findings.some((finding) => (
  finding.severity === "fail"
  && finding.term === "(?<!-)\\byou\\b|(?<!-)\\byour\\b"
)));

const sun = generator.normalizePlacementArgs({ planet: "Sun", sign: "Leo" });
assert.deepEqual(
  {
    planet: sun.planet,
    sign: sun.sign,
    placementSource: sun.placementSource,
    derivedFrom: sun.derivedFrom
  },
  {
    planet: "sun",
    sign: "leo",
    placementSource: "data/placements/sign/sun-leo.json",
    derivedFrom: null
  }
);

const chiron = generator.normalizePlacementArgs({ planet: "Chiron", sign: "Aries" });
assert.equal(chiron.placementSource, "data/points/placements/sign/chiron-aries.json");

const southNode = generator.normalizePlacementArgs({ planet: "South Node", sign: "Aries" });
assert.equal(southNode.placementSource, "data/points/placements/sign/north-node-libra.json");
assert.deepEqual(southNode.derivedFrom, {
  planet: "north-node",
  sign: "libra",
  frame: "comfort-zone/release"
});

const bodies = [
  "sun",
  "moon",
  "mercury",
  "venus",
  "mars",
  "jupiter",
  "saturn",
  "uranus",
  "neptune",
  "pluto",
  "chiron",
  "north-node",
  "south-node",
  "lilith"
];
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
let covered = 0;

for (const planet of bodies) {
  for (const sign of signs) {
    const normalized = generator.normalizePlacementArgs({ planet, sign });
    assert.equal(normalized.planet, planet);
    assert.equal(normalized.sign, sign);
    assert.ok(normalized.placementSource.endsWith(".json"));
    covered += 1;
  }
}

assert.equal(covered, 168);

const prompt = generator.buildPlacementPrompt({ planet: "sun", sign: "leo" });
assert.match(prompt, /collective sky placement card for Sun in Leo/i);
assert.match(prompt, /about a month; a season-sized chapter/i);
assert.match(prompt, /The Sun in Leo: identity built through expression/i);
assert.match(prompt, /impersonal "you\/your\/you're" is allowed ONLY in the final truth-and-catch pair/i);
assert.match(prompt, /evergreen base only/i);
assert.doesNotMatch(prompt, /For about a month the Sun sits in Leo/);

const southNodePrompt = generator.buildPlacementPrompt({ planet: "south-node", sign: "aries" });
assert.match(southNodePrompt, /derived from North Node in Libra/i);
assert.match(southNodePrompt, /comfort zone to recognize and release/i);
assert.match(southNodePrompt, /Do not describe South Node as the growth destination/i);

const judgePrompt = buildJudgePrompt(sunGold.body, {
  mode: placementMode,
  tier: "luminary"
});
assert.match(judgePrompt, /EVERGREEN COLLECTIVE PLACEMENT/);
assert.match(judgePrompt, /allowed only in the final truth-and-catch pair/i);
assert.match(judgePrompt, /failing to state the pace/i);
assert.doesNotMatch(judgePrompt, /never "you"/i);

let missingSourceModelCalls = 0;
const missing = await generator.generatePlacementCard({
  planet: "ascendant",
  sign: "aries"
}, {
  generateFn: async () => {
    missingSourceModelCalls += 1;
    return sunGold.body;
  }
});
assert.equal(missing.status, "skipped");
assert.equal(missing.reason, "missing-source");
assert.equal(missingSourceModelCalls, 0);

const generated = await generator.generatePlacementCard({
  planet: "sun",
  sign: "leo"
}, {
  generateFn: async () => sunGold.body
});
assert.equal(generated.status, "clean");
assert.equal(generated.lint.score, 3);
assert.equal(generated.facts.planet, "sun");
assert.equal(generated.facts.sign, "leo");
assert.equal(generated.facts.placementSource, "data/placements/sign/sun-leo.json");

const judged = await generator.generatePlacementCard({
  planet: "sun",
  sign: "leo"
}, {
  withJudge: true,
  generateFn: async () => sunGold.body,
  judgeFn: async () => JSON.stringify({
    score: 3,
    verdict: "in-voice",
    weakest: "none",
    why: "Matches the approved placement register."
  })
});
assert.equal(judged.judge.score, 3);
assert.equal(judged.gate, "auto-publish");

  console.log("Sky-placement engine contract passed: 17 aspect golds, 5 placement golds, 168 source-backed placements.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
