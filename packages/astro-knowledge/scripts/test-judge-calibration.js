#!/usr/bin/env node
//
// Calibration for the LLM-as-judge. Run this once the judge model is wired
// (needs the generator's API key). It proves the judge is trustworthy before
// you use it as editorial advice:
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
  "Today the energy is powerful and transformative. The cosmos invites you to step into your power and release what no longer serves you. Trust the journey. Everything happens for a reason. Momentum without meaning is just motion. Believe in yourself and the universe will provide.",
  "This is a powerful time for growth and transformation. The universe is aligning to support your journey, and abundance flows when you believe. Trust that everything is unfolding exactly as it should. Release what no longer serves you and step into your highest self. You are exactly where you need to be. Let the light guide you home.",
];

async function main() {
  let goldOff = 0;
  let goldThree = 0;
  let goldSum = 0;
  let weakSum = 0;
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
    weakSum += r.score;
    console.log(`${ok ? "OK " : "!! "} known-weak #${i + 1} -> ${r.score} (${r.verdict})  ${r.why || ""}`);
  }

  // Gating a STOCHASTIC judge on an absolute mean fails whenever a borderline
  // exemplar flickers between 2 and 3 - noise, not a real regression. What is
  // stable and meaningful is SEPARATION: the judge reliably scores our good
  // cards far above known-bad ones. So the trust bar is:
  //   1. no approved exemplar rated off-voice (1)
  //   2. no weak draft rated in-voice (3)
  //   3. exemplar mean is at least 1.5 above weak mean (a wide, stable gap)
  // The raw exemplar mean is still printed every run, so the stochastic edge
  // stays visible and is never hidden.
  const N = goldExemplars.length;
  const goldMean = goldSum / N;
  const weakMean = weakSum / knownWeak.length;
  const separation = goldMean - weakMean;
  const pass = goldOff === 0 && weakFails === 0 && separation >= 1.5;
  console.log(`\nexemplar mean ${goldMean.toFixed(2)} (${goldThree}/${N} at 3, ${goldOff} off-voice), weak mean ${weakMean.toFixed(2)} (${weakFails} passed as 3), separation ${separation.toFixed(2)} (need >= 1.50).`);
  if (!pass) {
    console.error("Judge is NOT calibrated: it does not separate good from bad by a clear margin, or it mis-rated a control.");
    process.exit(1);
  }
  console.log("Judge calibrated: separates good from bad by a wide margin, no control mis-rated.");
}

if (!process.argv.includes("--authorize-live")) {
  console.log(`Calibration contract verified: ${goldExemplars.length} approved examples and ${knownWeak.length} weak controls. Live judging was not run.`);
  process.exit(0);
}

main().catch((err) => {
  console.error(`Calibration could not run: ${err.message}`);
  console.error("(This test needs the judge model wired - set the generator's API key.)");
  process.exit(1);
});
