import assert from "node:assert/strict";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const generator = require("../packages/astro-knowledge/scripts/generate-sky-aspect-cards.js");
const { lintCard } = require("../packages/astro-knowledge/scripts/lint-sky-voice.js");
const examples = require("../packages/astro-knowledge/voice/tldr-astro/examples.json");
const cleanExample = examples.find((entry) => (
  entry.surface === "sky"
  && entry.mode === "collective-aspect-card"
  && entry.sourceId === "sky-sun-opposition-pluto"
))?.body;

assert.ok(cleanExample, "Expected the canonical Sun-Pluto sky example.");
assert.equal(lintCard(cleanExample).score, 3, "Canonical sky example must remain lint-clean.");

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

const missingSource = await generator.generateCard({
  a: "sun",
  b: "north-node",
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

const stub = await generator.generateCard({
  a: "sun",
  b: "chiron",
  aspect: "square",
  signA: "leo",
  signB: "taurus"
}, {
  generateFn: async () => {
    throw new Error("The Chiron stub must never reach the model.");
  }
});

assert.equal(stub.status, "skipped");
assert.ok(["missing-source", "source-review-required"].includes(stub.reason));

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
      assert.match(prompt, /last attempt failed the voice check/i);
    }
    return calls === 1 ? "You can read the 2° orb in the draft." : cleanExample;
  }
});

assert.equal(retried.status, "clean");
assert.equal(retried.attempts, 2);
assert.equal(retried.lint.score, 3);
assert.equal(retried.lint.fails, 0);

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
assert.equal(judged.gate, "auto-publish");

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

console.log("Sky-aspect integration contract passed.");
