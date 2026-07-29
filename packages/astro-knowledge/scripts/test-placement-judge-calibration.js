#!/usr/bin/env node
//
// Calibration for the placement-article LLM-as-judge. Run once the judge model
// is wired (needs the generator's API key). It proves the judge is trustworthy
// before it may auto-publish:
//
//   - no owner-approved calibration trio may be rated off-voice (1)
//   - no known-weak draft may be rated in-voice (3)
//   - exemplar mean must sit >= 1.5 above weak mean (separation, the stable
//     bar the aspect judge converged on; absolute means flicker with noise)
//
// If the judge fails this, tighten judge-placement-voice.js - do not ship a
// judge that rubber-stamps. Only set SKY_PLACEMENT_JUDGE_CALIBRATED=true after
// this passes.
//
//   node scripts/test-placement-judge-calibration.js

const path = require("path");
const { judgeArticle, TIER_OF } = require("./judge-placement-voice.js");
const spec = require(path.join("..", "voice", "tldr-astro", "sky-placement.json"));

const goldExemplars = spec.exemplars.filter((e) => e.canonical);

// Known-weak drafts covering this surface's real failure modes: the retired
// kumbaya assembly, the sign-encyclopedia lead, the swap-anywhere generic, and
// the announcement hook with stacked endings.
const knownWeak = [
  {
    label: "retired kumbaya assembly",
    planet: "sun", sign: "leo",
    tagline: "Embrace the Leo energy",
    hook: "Leo season is here! The Sun enters the fiery fifth sign of the zodiac, known for warmth, courage, and creativity.",
    lived: "This transit brings themes of self-expression, confidence, and joy for everyone at once. Leo is a fixed fire sign ruled by the Sun itself, so this is a homecoming full of radiant energy and opportunities to shine.",
    turn: "Watch out for the Leo trap of pride and drama. Embrace your inner light and trust the process. Wishing you a bold and beautiful Leo season.",
    moves: ["Journal about your feelings.", "Trust the process.", "Step into your power."]
  },
  {
    label: "swap-anywhere generic",
    planet: "mars", sign: "scorpio",
    hook: "Something is shifting, and we can all feel it.",
    lived: "Over the coming weeks, this transit invites us to slow down and reflect on what really matters. Old patterns come up for review, and new possibilities begin to emerge. It is a powerful time for growth and transformation.",
    turn: "The challenge is resisting the change instead of flowing with it. Growth is rarely comfortable, but it is always worth it. Trust that everything is unfolding exactly as it should."
  },
  {
    label: "announcement hook, stacked endings",
    planet: "venus", sign: "aries",
    hook: "Venus enters Aries, the sign of the pioneer.",
    lived: "For about four weeks, love gets bolder and more direct. We chase what we want. Attraction moves fast here.",
    turn: "The shadow is impatience in love. Desire is not devotion. Passion fades. Real love stays. Choose wisely."
  },
  {
    label: "moralizing coach",
    planet: "saturn", sign: "pisces",
    hook: "It is time to get serious about your dreams.",
    lived: "Saturn in Pisces asks us to do the work of making our visions real. The lesson here is discipline in the service of imagination. Remember to stay grounded while you reach for what inspires you.",
    turn: "The trap is escapism, avoiding responsibility by drifting into fantasy. But limitations are really liberations in disguise. Do the work, honor your commitments, and your dreams will thank you for it."
  }
];

async function main() {
  let goldOff = 0;
  let goldThree = 0;
  let goldSum = 0;
  let weakSum = 0;
  let weakFails = 0;

  for (const e of goldExemplars) {
    // median of 5 samples for a stable read (self-consistency)
    const r = await judgeArticle(
      { hook: e.hook, lived: e.lived, turn: e.turn },
      { tier: e.tier || TIER_OF[e.planet] || "luminary", planet: e.planet, sign: e.sign, samples: 5 }
    );
    if (r.score === 1) goldOff++;
    if (r.score === 3) goldThree++;
    goldSum += r.score;
    console.log(`${r.score === 3 ? "OK " : r.score === 2 ? "~  " : "!! "} exemplar ${e.sourceId} -> ${r.score} (${r.verdict})`);
  }
  for (const draft of knownWeak) {
    const r = await judgeArticle(
      { hook: draft.hook, lived: draft.lived, turn: draft.turn, tagline: draft.tagline, moves: draft.moves },
      { tier: TIER_OF[draft.planet] || "luminary", planet: draft.planet, sign: draft.sign, samples: 5 }
    );
    const ok = r.score <= 2;
    if (!ok) weakFails++;
    weakSum += r.score;
    console.log(`${ok ? "OK " : "!! "} known-weak (${draft.label}) -> ${r.score} (${r.verdict})  ${r.why || ""}`);
  }

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

main().catch((err) => {
  console.error(`Calibration could not run: ${err.message}`);
  console.error("(This test needs the judge model wired - set the generator's API key.)");
  process.exit(1);
});
