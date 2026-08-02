#!/usr/bin/env node
//
// Calibration contract for the placement-article LLM-as-judge. A live
// promotion-grade run is blocked until at least one full Current Sky article
// has explicit owner approval in the collective perspective.
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

const goldExemplars = spec.exemplars.filter((e) =>
  e.canonical === true
  && e.ownerApproved === true
  && e.editorialStatus === "current_sky_owner_approved"
);
const collectiveAdaptationControls = spec.exemplars.filter((e) =>
  e.editorialStatus === "collective_adaptation_candidate"
  && e.reviewStatus === "needs_review"
  && e.ownerApproved === false
  && e.promotionAuthorized === false
);

// Known-weak drafts covering this surface's real failure modes: the retired
// kumbaya assembly, the sign-encyclopedia lead, the swap-anywhere generic, and
// unsupported domain drift, unnatural personification, the administrative
// example inventory that sounds concrete while carrying no narrative movement,
// and the polished abstraction / metaphor pile caught in owner review.
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
    label: "unnatural banished-want personification",
    planet: "venus", sign: "virgo",
    hook: "The banished want refuses to stay reasonable. Venus handles attraction, worth, and relationship; in Virgo, desire becomes exacting about what works and what does not.",
    lived: "A plan gets revised, a boundary becomes specific, and affection is measured through the details that can actually be maintained. The placement notices what care costs and where the exchange has stopped being mutual.",
    turn: "Discernment turns against itself when every preference has to justify its existence. The result is a life edited so thoroughly that nothing unplanned is allowed to matter."
  },
  {
    label: "unsupported Chiron-in-Taurus work framing",
    planet: "chiron", sign: "taurus",
    hook: "Work exposes the old wound. Chiron in Taurus makes career, productivity, and professional success the center of the transit.",
    lived: "The office becomes the proving ground. A promotion restores confidence, a better title repairs old insecurity, and steady output becomes evidence that the wound is finally healing.",
    turn: "The trouble starts when the next achievement does not hold. Productivity cannot repair every injury, no matter how impressive the record becomes."
  },
  {
    label: "flat administrative inventory",
    planet: "uranus", sign: "cancer",
    hook: "Care patterns change under Uranus in Cancer. Uranus disrupts old arrangements, while Cancer brings attention to home, family, and belonging.",
    lived: "Uranus spends about seven years in a sign. A family member stops being the automatic host; a workplace questions why one person remembers every birthday, emergency, and missing key; people build living arrangements that make room for chosen kin. We may notice new approaches to care in many areas of life.",
    turn: "The challenge comes when familiar roles become restrictive. Change can feel uncomfortable, but new arrangements can create more freedom.",
    moves: ["Discuss household responsibilities.", "Consider a new care arrangement.", "Make room for change at home."]
  },
  {
    label: "polished abstraction and unnatural personification",
    planet: "uranus", sign: "pisces",
    tagline: "Make kindness practical",
    hook: "Compassion can become a form of refusal. Uranus breaks with what has gone numb or false; in Pisces, the break moves through grief, imagination, mercy, and the stories used to make suffering seem inevitable. The disruption begins when feeling becomes impossible to keep private.",
    lived: "Uranus spends roughly seven years in Pisces, long enough for private grief to become a public refusal. The person told to cope quietly builds the fund, names the policy, and turns the ache into work someone else can use. Compassion stops being a feeling performed at a safe distance. It becomes the interruption: money moved, a rule broken, a door held open that was designed to stay shut.",
    turn: "The break goes sideways when refusing one cruel system becomes refusing every limit. We absorb each crisis, cancel our own plans, and call exhaustion proof that we care. Rescue becomes another kind of control: we decide who needs saving, break every boundary in the room, and disappear before anyone can ask what it cost. Compassion that destroys the person carrying it cannot change the system that made help necessary.",
    moves: ["Turn one act of care into a structure with a written limit.", "Offer one concrete form of help and name what remains outside our hands.", "Make something from the grief before the algorithm turns it into another hour of watching."]
  },
  {
    label: "metaphor pile and manufactured aphorism",
    planet: "mars", sign: "capricorn",
    tagline: "Finish what matters",
    hook: "A plan is only a promise until someone does the work. Mars governs action, conflict, and the force that moves a decision forward; in Capricorn, that force accepts the deadline, the standard, and the long climb. Effort stops performing urgency and starts producing proof.",
    lived: "Over the next six or seven weeks, the project reaches the part nobody applauds. The first idea has already spent its excitement; now the weak argument has to be rewritten, the missing number found, and the final decision made with no audience left to impress. Mars in Capricorn keeps returning because the work is not finished. Motivation becomes less of a feeling and more of a record.",
    turn: "Tunnel vision sets in when the mountain is all anyone can see. The push gets so relentless that determination turns into sheer stubbornness, and ambition degrades into grinding for the sake of the grind. The effort stops leading anywhere and becomes a self-inflicted punishment. The smart move is to cut the climb when the summit turns out to be just another peak to scale.",
    moves: ["Give one long-delayed project a finish line and a two-hour block.", "Write the three steps between the plan and the first visible result.", "Cancel one obligation that looks productive but moves nothing forward."]
  }
];

async function main() {
  if (!goldExemplars.length) {
    throw new Error("No current_sky_owner_approved full-article gold exists; live promotion calibration is intentionally blocked.");
  }
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

if (require.main === module) {
  if (!process.argv.includes("--authorize-live")) {
    console.log(`Calibration contract verified: ${goldExemplars.length} current-sky owner-approved golds, ${collectiveAdaptationControls.length} needs-review collective controls, and ${knownWeak.length} weak controls. Live promotion calibration is blocked until collective wording is owner-approved.`);
  } else {
    main().catch((err) => {
      console.error(`Calibration could not run: ${err.message}`);
      console.error("(This test needs the judge model wired - set the generator's API key.)");
      process.exit(1);
    });
  }
}

module.exports = { collectiveAdaptationControls, goldExemplars, knownWeak, main };
