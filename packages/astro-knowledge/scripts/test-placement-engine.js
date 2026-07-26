#!/usr/bin/env node

const assert = require("node:assert/strict");
const generator = require("./generate-sky-aspect-cards.js");
const { buildJudgePrompt, judgeConfig } = require("./judge-sky-voice.js");
const { lintCard } = require("./lint-sky-voice.js");
const {
  knownWeak,
  runPlacementCalibration
} = require("./test-placement-calibration.js");
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

const labeledClose = `${placementGolds[0].body}\n\nThe truth: we want to be seen. The catch: applause never holds still.`;
const labeledCloseLint = lintCard(labeledClose, { mode: placementMode });
assert.equal(labeledCloseLint.score, 1);
assert.ok(labeledCloseLint.findings.some((finding) => (
  finding.severity === "fail"
  && finding.source === "placement-label"
  && finding.term === "\\bthe truth\\s*[:?]"
)));
assert.ok(labeledCloseLint.findings.some((finding) => (
  finding.severity === "fail"
  && finding.source === "placement-label"
  && finding.term === "\\bthe catch\\s*[:?]"
)));
assert.equal(
  lintCard(labeledClose, { mode: "collective-aspect-card" }).findings.some(
    (finding) => finding.source === "placement-label"
  ),
  false,
  "Close-label failures must remain placement-mode only."
);

const softLabel = placementGolds[0].body.replace(
  "The catch is that",
  "The challenge is"
);
const softLabelLint = lintCard(softLabel, { mode: placementMode });
assert.ok(softLabelLint.findings.some((finding) => (
  finding.severity === "warn"
  && finding.term === "\\bthe challenge is\\b"
)));

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
assert.match(prompt, /never print "The truth" or "The catch" as labels/i);
assert.match(prompt, /BAD - visible scaffolding:[\s\S]*The truth:[\s\S]*The catch:/);
assert.match(prompt, /GOOD - state it plainly:[\s\S]*Being seen for something real is the whole point/);
assert.match(prompt, /DELETE THE PRE-CLOSE APHORISM - less is more/);
assert.match(prompt, /Emotional honesty builds trust[\s\S]*GOOD - cut the maxim instead of rewording it/);
assert.match(prompt, /Words move mountains[\s\S]*GOOD - cut the maxim and the "move mountains" cliche/);
assert.match(prompt, /MAKE THE MIDDLE CONCRETE/);
assert.match(prompt, /BAD - generic motivational verbs:[\s\S]*choose boldness over safety/);
assert.match(prompt, /GOOD - observable behavior:[\s\S]*Stop choosing safety over presence/);
assert.doesNotMatch(prompt, /For about a month the Sun sits in Leo/);

const aspectPrompt = generator.buildPrompt({
  a: "sun",
  b: "pluto",
  aspect: "opposition",
  signA: "leo",
  signB: "aquarius"
});
assert.doesNotMatch(aspectPrompt, /DELETE THE PRE-CLOSE APHORISM - less is more/);
assert.doesNotMatch(aspectPrompt, /MAKE THE MIDDLE CONCRETE/);

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
const configuredJudge = judgeConfig();
assert.ok(["openai", "claude"].includes(configuredJudge.provider));
assert.ok(configuredJudge.model);
assert.equal(configuredJudge.temperature, 0.1);

const calibrationReport = await runPlacementCalibration({
  concurrency: 3,
  samples: 1,
  judgeFn: async (prompt) => JSON.stringify({
    score: knownWeak.some((draft) => prompt.includes(draft)) ? 1 : 3,
    verdict: knownWeak.some((draft) => prompt.includes(draft)) ? "off-voice" : "in-voice",
    weakest: "control",
    why: "Deterministic integration control."
  })
});
assert.equal(calibrationReport.pass, true);
assert.equal(calibrationReport.goldMean, 3);
assert.equal(calibrationReport.weakMean, 1);
assert.equal(calibrationReport.separation, 2);

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
