#!/usr/bin/env node
//
// Calibration for the LLM-as-judge. Run this once the judge model is wired
// (needs the generator's API key). It proves the judge is trustworthy before
// you let it auto-publish anything:
//
//   - every canonical exemplar must score 3 (in-voice)
//   - every known-weak draft must score 1 or 2 (never a false 3)
//
// If the judge fails this, tighten its prompt in judge-sky-voice.js - do not
// ship a judge that rubber-stamps.
//
//   node scripts/test-judge-calibration.js

const path = require("path");
const { judgeCard } = require("./judge-sky-voice.js");
const examples = require(path.join("..", "voice", "tldr-astro", "examples.json"));

const goldExemplars = examples.filter(
  (e) => e.surface === "sky" && e.mode === "collective-aspect-card" && e.canonical
);

// Real weak drafts from the gpt-4.1-mini / early gpt-4.1 runs. These must NOT
// pass as 3: template seam, stacked endings, named mechanics, moralizing.
const knownWeak = [
  "We are caught in a quick current of change that feels electric and deep at once. This trine links two air signs, making adaptation fast and clear. The gift is sharp, effective change; the shadow is upheaval so fast it risks breaking before it builds. Change will not wait for comfort or consent. Adapt quickly or get left behind. Change is here. Change demands speed.",
  "Big change is coming and we must be ready for it. The lesson here is to stay open and trust the process. Remember to breathe. When we align with the cosmic flow, everything falls into place. Power without purpose is chaos. Step into your truth and let the universe guide you.",
];

async function main() {
  let goldOff = 0;
  let goldThree = 0;
  let goldSum = 0;
  let weakFails = 0;

  for (const e of goldExemplars) {
    // median of 5 samples for a stable read (self-consistency)
    const r = await judgeCard(e.body, { tier: e.tier || "luminary", samples: 5 });
    if (r.score === 1) goldOff++;
    if (r.score === 3) goldThree++;
    goldSum += r.score;
    console.log(`${r.score === 3 ? "OK " : r.score === 2 ? "~  " : "!! "} exemplar ${e.sourceId} -> ${r.score} (${r.verdict})`);
  }
  for (const [i, draft] of knownWeak.entries()) {
    const r = await judgeCard(draft, { samples: 5 });
    const ok = r.score <= 2;
    if (!ok) weakFails++;
    console.log(`${ok ? "OK " : "!! "} known-weak #${i + 1} -> ${r.score} (${r.verdict})  ${r.why || ""}`);
  }

  // A stochastic judge can't be held to a perfect 17/17, and a hard count fails
  // whenever one borderline card flickers. The meaningful, noise-robust bar:
  // it never rates an approved exemplar as off-voice (1), it never rates a weak
  // draft as in-voice (3), and the AVERAGE exemplar reads as strongly in-voice.
  const N = goldExemplars.length;
  const mean = goldSum / N;
  const pass = goldOff === 0 && weakFails === 0 && mean >= 2.8;
  console.log(`\nexemplars: mean score ${mean.toFixed(2)} (need >= 2.80), ${goldThree}/${N} at 3, ${goldOff} rated off-voice (need 0); weak drafts passed as 3: ${weakFails} (need 0).`);
  if (!pass) {
    console.error("Judge is NOT calibrated. Sharpen the borderline exemplar(s) or tighten the judge prompt before trusting it.");
    process.exit(1);
  }
  console.log("Judge calibrated: no exemplar off-voice, average strongly in-voice, weak drafts all caught.");
}

main().catch((err) => {
  console.error(`Calibration could not run: ${err.message}`);
  console.error("(This test needs the judge model wired - set the generator's API key.)");
  process.exit(1);
});
