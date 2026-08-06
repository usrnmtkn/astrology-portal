import assert from "node:assert/strict";
import fs from "node:fs";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const generator = require("../packages/astro-knowledge/scripts/generate-sky-aspect-cards.js");
const { lintCard } = require("../packages/astro-knowledge/scripts/lint-sky-voice.js");
const { buildJudgePrompt } = require("../packages/astro-knowledge/scripts/judge-sky-voice.js");
const examples = require("../packages/astro-knowledge/voice/tldr-astro/examples.json");
const cleanExample = examples.find((entry) => (
  entry.surface === "sky"
  && entry.mode === "collective-aspect-card"
  && entry.sourceId === "sky-sun-opposition-pluto"
))?.body;

assert.ok(cleanExample, "Expected the canonical Sun-Pluto sky example.");
assert.equal(lintCard(cleanExample).score, 3, "Canonical sky example must remain lint-clean.");

const brokenSunJupiter = [
  "Confidence is loud, and the sense of possibility is even louder. With the Sun in Leo conjunct Jupiter in Leo, the field runs on belief, appetite, and the sense that doors should open just because we ask. A big yes to the extra shift, a plan that gets bigger after midnight, a promise made on a high - each is easier to land when the heat of the moment makes luck feel inevitable. The Sun in Leo wants to be seen and named; Jupiter in Leo expands every risk and reward we claim as ours.",
  "We chase what we want with less hesitation, and the odds seem to tilt in our direction - until the push gets too big and the room cools off. Real confidence brings real opportunity, but the same fire that opens doors can torch what it touches if we overplay the hand. Big luck is real. So is the fallout when we act like it can’t run out.",
  "Belief can make the room move. Overreach just makes it empty faster."
].join("\n\n");
const brokenSunJupiterLint = lintCard(brokenSunJupiter);
assert.equal(brokenSunJupiterLint.score, 1);
assert.ok(brokenSunJupiterLint.findings.some((finding) => (
  finding.severity === "fail" && finding.term === "paragraph-count"
)));
assert.ok(brokenSunJupiterLint.findings.some((finding) => (
  finding.severity === "warn" && finding.term === "double-closing-pair"
)));

const repairedExample = examples.find((entry) => (
  entry.surface === "sky"
  && entry.mode === "collective-aspect-card"
  && entry.canonical
  && entry.sourceId !== "sky-sun-opposition-pluto"
))?.body;
assert.ok(repairedExample, "Expected a second canonical sky example for repair tests.");

const normalized = generator.normalizeCardArgs({
  a: "Pluto",
  b: "Sun",
  aspect: "opposition",
  signA: "Aquarius",
  signB: "Leo"
});

assert.deepEqual(
  {
    a: normalized.a,
    b: normalized.b,
    signA: normalized.signA,
    signB: normalized.signB,
    pairKey: normalized.pairKey
  },
  {
    a: "sun",
    b: "pluto",
    signA: "leo",
    signB: "aquarius",
    pairKey: "sun-pluto"
  },
  "Reversed ephemeris input must keep each sign attached to its planet."
);

const generationPrompt = generator.buildPrompt({
  a: "sun",
  b: "uranus",
  aspect: "sextile",
  signA: "leo",
  signB: "gemini"
});

assert.match(generationPrompt, /RANGE OF GOOD CLOSES/);
assert.match(generationPrompt, /OWNER FOUNDATION LINES/);
assert.match(generationPrompt, /Adapt one of these into the card/);
assert.match(generationPrompt, /warmth beat is exactly one sentence/);
assert.doesNotMatch(generationPrompt, /Standing out is real currency/);
assert.doesNotMatch(generationPrompt, /a friend's big-hearted gesture/);

const exactAspectPrompt = generator.buildPrompt({
  a: "jupiter",
  b: "neptune",
  aspect: "trine",
  signA: "leo",
  signB: "aries"
});
assert.match(exactAspectPrompt, /EXACT ASPECT SOURCE \(primary/u);
assert.match(exactAspectPrompt, /data\/transits\/jupiter-trine-neptune\.json/u);
assert.match(exactAspectPrompt, /Imaginative ideas that turn out to have practical application/u);
assert.match(exactAspectPrompt, /The ease lets excess and overreach and illusion and escapism go unchecked/u);

const judgePrompt = buildJudgePrompt(cleanExample, { tier: "luminary" });
for (const family of [
  "self_negotiation",
  "softened_conviction",
  "downplayed_desire",
  "reduced_ambition",
  "avoidance_disguised_as_caution"
]) {
  assert.match(judgePrompt, new RegExp(family));
}
assert.doesNotMatch(judgePrompt, /Stop shrinking/i);
assert.doesNotMatch(judgePrompt, /turn toward the reader must trace to the supplied owner foundation lines/);

const normalizedWarmthTarget = generator.normalizeCardArgs({
  a: "sun",
  b: "pluto",
  aspect: "opposition",
  signA: "leo",
  signB: "aquarius"
});
const warmthHarvest = generator.aspectWarmthHarvest(normalizedWarmthTarget);
assert.equal(warmthHarvest.status, "ready");
const warmthJudgePrompt = buildJudgePrompt(cleanExample, {
  tier: "luminary",
  foundationLines: warmthHarvest.ownerFoundationLines
});
assert.match(warmthJudgePrompt, /turn toward the reader must trace to the supplied owner foundation lines/);
assert.match(warmthJudgePrompt, /SUPPLIED OWNER FOUNDATION LINES/);

const canonicalCloses = new Set(
  examples
    .filter((entry) => (
      entry.surface === "sky"
      && entry.mode === "collective-aspect-card"
      && entry.canonical
    ))
    .map((entry) => (
      [...new Intl.Segmenter("en", { granularity: "sentence" }).segment(entry.body)]
        .map(({ segment }) => segment.trim())
        .filter(Boolean)
        .slice(-2)
        .join(" ")
    ))
);
const sampledCloses = generator.closeBank(5, () => 0.42);
assert.equal(sampledCloses.length, 5);
assert.equal(new Set(sampledCloses).size, 5);
for (const close of sampledCloses) {
  assert.ok(canonicalCloses.has(close), "Every rotating close must come verbatim from a canonical exemplar.");
}

let repairPrompt = "";
const repairedCard = await generator.repairCard(cleanExample, "The ending adds a second aphorism.", {
  generateFn: async (prompt, options) => {
    repairPrompt = prompt;
    assert.equal(options.temperature, 0.1);
    return repairedExample;
  }
});

assert.match(repairPrompt, /careful editor flagged this card/i);
assert.match(repairPrompt, /The ending adds a second aphorism\./);
assert.match(repairPrompt, /Fix ONLY what the note describes/);
assert.equal(repairedCard, repairedExample);

const missingSource = await generator.generateCard({
  a: "sun",
  b: "sun",
  aspect: "conjunction",
  signA: "leo",
  signB: "leo"
}, {
  generateFn: async () => {
    throw new Error("A source gap must never reach the model.");
  }
});

assert.equal(missingSource.status, "skipped");
assert.equal(missingSource.reason, "missing-source");

const missingWarmthCore = await generator.generateCard({
  a: "sun",
  b: "moon",
  aspect: "quincunx",
  signA: "leo",
  signB: "pisces"
}, {
  generateFn: async () => {
    throw new Error("A missing human-moment beat must never reach the model.");
  }
});

assert.equal(missingWarmthCore.status, "skipped");
assert.equal(missingWarmthCore.reason, "aspect-warmth-editorial-required");
assert.deepEqual(missingWarmthCore.flags, [{
  id: "missing-human-moment-beat",
  severity: "editorial",
  blocking: true,
  reason: "Aspect entry has no human-moment beat. This is editorial data completeness; flag for editorial work. Do not request new owner prose."
}]);

const landedChironSource = await generator.generateCard({
  a: "sun",
  b: "chiron",
  aspect: "square",
  signA: "leo",
  signB: "taurus"
}, {
  generateFn: async () => {
    throw new Error("A Chiron pair without an approved human moment must not reach the model.");
  }
});

assert.equal(landedChironSource.status, "skipped");
assert.equal(landedChironSource.reason, "aspect-warmth-editorial-required");

let calls = 0;
const retried = await generator.generateCard({
  a: "sun",
  b: "pluto",
  aspect: "opposition",
  signA: "leo",
  signB: "aquarius"
}, {
  maxRetries: 2,
  generateFn: async (prompt) => {
    calls += 1;
    if (calls === 2) {
      assert.match(prompt, /LINT RETRY - YOUR PREVIOUS DRAFT USED THE BANNED PHRASE\(S\)/);
      assert.match(prompt, /"degree\/orb mechanics"/);
      assert.match(prompt, /"collective person"/);
      assert.match(prompt, /Do not use "gift" or "shadow" as labels/);
    }
    return calls === 1 ? "You can read the 2° orb in the draft." : cleanExample;
  }
});

assert.equal(retried.status, "clean");
assert.equal(retried.attempts, 2);
assert.equal(retried.lint.score, 3);
assert.equal(retried.lint.fails, 0);
assert.equal(retried.warmthHarvest.status, "ready");
assert.equal(retried.harvest_mode, "matched");
assert.deepEqual(retried.lintRetryAvoidTerms, [[
  "degree/orb mechanics",
  "collective person",
  "(?<!-)\\byou\\b|(?<!-)\\byour\\b",
  "paragraph-count"
]]);

let seamCalls = 0;
const seamRetry = await generator.generateCard({
  a: "mars",
  b: "saturn",
  aspect: "sextile",
  signA: "gemini",
  signB: "aries"
}, {
  maxRetries: 2,
  generateFn: async (prompt) => {
    seamCalls += 1;
    if (seamCalls === 2) {
      assert.match(prompt, /"the gift is"/);
      assert.match(prompt, /"the shadow is"/);
    }
    return seamCalls === 1
      ? "We find ourselves moving with enough restraint to keep the whole plan on its feet.\n\nThe gift is momentum. The shadow is overreach."
      : cleanExample;
  }
});

assert.equal(seamRetry.status, "clean");
assert.deepEqual(seamRetry.lintRetryAvoidTerms, [["the gift is", "the shadow is"]]);

let judgeGenerationPrompt = "";
const judged = await generator.generateCard({
  a: "sun",
  b: "pluto",
  aspect: "opposition",
  signA: "leo",
  signB: "aquarius"
}, {
  withJudge: true,
  judgeFeedback: "The ending is too generic.",
  generateFn: async (prompt) => {
    judgeGenerationPrompt = prompt;
    return cleanExample;
  },
  judgeFn: async () => JSON.stringify({
    score: 3,
    verdict: "in-voice",
    weakest: "none",
    why: "Matches the approved register."
  })
});

assert.match(judgeGenerationPrompt, /previous draft reached the editorial judge/i);
assert.equal(judged.judge.score, 3);
assert.equal(judged.gate, "human-review", "A model-only score 3 may recommend approval but cannot publish.");
assert.equal(judged.judge.recommendation, "approve");
assert.equal(judged.judge.approvalSource, "llm-advisory");

const cronSource = fs.readFileSync(new URL("../api/cron/generate-sky-aspects.ts", import.meta.url), "utf8");
assert.match(cronSource, /status: "DRAFT"/u, "New sky-aspect cards must remain drafts until dashboard approval.");
assert.match(cronSource, /sky-owner-approval-required/u);
assert.match(cronSource, /approvedReviewPairKeys/u);
assert.match(cronSource, /allowReviewSources: options\.allowReviewSources === true/u);
assert.match(cronSource, /owner-authored-review-pending/u, "The cron must not overwrite an owner-authored review draft.");
assert.match(cronSource, /aspectWarmthHarvest: result\.warmthHarvest \?\? null/u);
assert.match(cronSource, /warmthSource: result\.warmthSource \?\? null/u);
assert.match(cronSource, /evidenceClass: result\.evidenceClass \?\? null/u);

const adminSource = fs.readFileSync(new URL("../api/admin/generated-content.ts", import.meta.url), "utf8");
assert.match(adminSource, /judgeScore !== 3/u);
assert.match(adminSource, /judge\?\.recommendation === "approve"/u);
assert.match(adminSource, /judge\.approvalSource === "llm-advisory"/u);

let repairJudgeCalls = 0;
let repairReason = "";
const repairedToThree = await generator.generateCard({
  a: "sun",
  b: "pluto",
  aspect: "opposition",
  signA: "leo",
  signB: "aquarius"
}, {
  withJudge: true,
  generateFn: async () => cleanExample,
  repairFn: async (text, reason) => {
    assert.equal(text, cleanExample);
    repairReason = reason;
    return repairedExample;
  },
  judgeFn: async () => {
    repairJudgeCalls += 1;
    return JSON.stringify(repairJudgeCalls === 1 ? {
      score: 2,
      verdict: "borderline",
      weakest: "The ending.",
      why: "The ending adds a second aphorism."
    } : {
      score: 3,
      verdict: "in-voice",
      weakest: "none",
      why: "The repaired close lands cleanly."
    });
  }
});

assert.equal(repairReason, "The ending adds a second aphorism.");
assert.equal(repairedToThree.text, repairedExample);
assert.equal(repairedToThree.judge.score, 3);
assert.equal(repairedToThree.gate, "human-review", "A repaired model-only score 3 still requires human review.");
assert.equal(repairedToThree.judge.recommendation, "approve");
assert.equal(repairedToThree.judge.approvalSource, "llm-advisory");
assert.deepEqual(repairedToThree.repair, {
  fired: true,
  result: "2→3",
  reason: "The ending adds a second aphorism.",
  originalScore: 2,
  repairedScore: 3,
  kept: "repaired"
});

const repairedStillTwo = await generator.generateCard({
  a: "sun",
  b: "pluto",
  aspect: "opposition",
  signA: "leo",
  signB: "aquarius"
}, {
  withJudge: true,
  generateFn: async () => cleanExample,
  repairFn: async () => repairedExample,
  judgeFn: async () => JSON.stringify({
    score: 2,
    verdict: "borderline",
    weakest: "The ending.",
    why: "The ending remains slightly generic."
  })
});

assert.equal(repairedStillTwo.text, cleanExample, "A tied repair must preserve the original card.");
assert.equal(repairedStillTwo.judge.score, 2);
assert.equal(repairedStillTwo.gate, "human-review");
assert.deepEqual(repairedStillTwo.repair, {
  fired: true,
  result: "2→2",
  reason: "The ending remains slightly generic.",
  originalScore: 2,
  repairedScore: 2,
  kept: "original"
});

const review = await generator.generateCard({
  a: "sun",
  b: "pluto",
  aspect: "opposition",
  signA: "leo",
  signB: "aquarius"
}, {
  maxRetries: 1,
  generateFn: async () => "The opposition has a 2° orb on July 25, 2026."
});

assert.equal(review.status, "needs-review");
assert.ok((review.lint?.fails ?? 0) > 0);
assert.match(review.text, /2°/);

assert.equal(
  generator.reviewPairSources().size,
  33,
  "The staged Chiron/Lilith/node review bank must retain all 33 owner-review rows."
);

const gatedNodeSource = await generator.generateCard({
  a: "moon",
  b: "north-node",
  aspect: "conjunction",
  signA: "pisces",
  signB: "aquarius"
}, {
  generateFn: async () => {
    throw new Error("A pair without an approved human moment must not reach production generation.");
  }
});

assert.equal(gatedNodeSource.status, "skipped");
assert.equal(gatedNodeSource.reason, "aspect-warmth-editorial-required");

const reviewNodePrompt = generator.buildPrompt({
  a: "moon",
  b: "south-node",
  aspect: "conjunction",
  signA: "pisces",
  signB: "leo"
}, { allowReviewSources: true });

assert.match(reviewNodePrompt, /Lunar Nodes/);
assert.match(reviewNodePrompt, /EXACT ASPECT SOURCE/);
assert.match(reviewNodePrompt, /PAIR SOURCE/);
assert.match(reviewNodePrompt, /south node/i);
assert.equal(
  generator.normalizeCardArgs({
    a: "moon",
    b: "south-node",
    aspect: "conjunction",
    signA: "pisces",
    signB: "leo"
  }, { allowReviewSources: true }).pairKey,
  "moon-nodes",
  "North- and South-Node contacts must resolve to one axis-level source."
);

console.log("Sky-aspect integration contract passed.");
