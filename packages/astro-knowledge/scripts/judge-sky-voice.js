#!/usr/bin/env node
//
// LLM-as-judge: the second gate, after scripts/lint-sky-voice.js.
//
// The linter enforces the mechanical floor (banned words, shape, register).
// This judge scores the things a regex cannot: does it sound like a person,
// does it stay true to the source, does it overreach or moralize, does it land
// one clean close, does it match the planet tier. It returns a 1-3 verdict so
// the pipeline can auto-publish only what passes BOTH gates and route only the
// borderline cards to a human. That is what makes review scale.
//
// `judge()` is a seam - wire it to the app's model (reuse the provider config
// in generate-sky-aspect-cards.js). Until then, --dry-run prints the prompt.
//
//   node scripts/judge-sky-voice.js --dry-run "<card text>"

const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const readJson = (p) => JSON.parse(fs.readFileSync(p, "utf8"));
const sky = readJson(path.join(root, "voice", "tldr-astro", "sky-aspect.json"));
const examples = readJson(path.join(root, "voice", "tldr-astro", "examples.json"));

// planet -> tier, matching how exemplars are tagged. The judge must compare a
// card against its OWN register: an outer/generational card judged against fast
// daily Sun cards gets wrongly dinged for being sweeping.
const TIER_OF = {
  sun: "luminary", moon: "luminary",
  mercury: "personal", venus: "personal", mars: "personal",
  jupiter: "outer", saturn: "outer", uranus: "outer", neptune: "outer", pluto: "outer", chiron: "outer",
};
const TIER_HINT = {
  luminary: "a fast, personal-collective mood over a day or a week; concrete and immediate.",
  personal: "a fast, personal-collective pull around the mind, worth, or drive; concrete and immediate.",
  outer: "a slow, generational, world-scale shift. It is LEGITIMATELY more sweeping and less about a single day. Do NOT penalize it for not sounding like a fast daily card - judge it against its own register.",
};

// Gold-standard exemplars from the SAME tier as the card being judged, so the
// judge scores like-to-like. Falls back to any exemplar if the tier is thin.
function goldStandard(tier, n = 2) {
  const all = examples.filter((e) => e.surface === "sky" && e.mode === "collective-aspect-card" && e.canonical);
  const same = tier ? all.filter((e) => (e.tier || "luminary") === tier) : [];
  const pool = same.length >= n ? same : [...same, ...all.filter((e) => !same.includes(e))];
  return pool.slice(0, n).map((e) => e.body);
}

// The rubric the judge scores against. Concrete failure modes come from real
// weak drafts, so the judge knows exactly what to catch.
function buildJudgePrompt(card, { tier = "" } = {}) {
  return [
    `You are the editor of a modern astrology app. You are strict. Most drafts are "borderline" until proven otherwise.`,
    ``,
    `The voice: ${sky.voiceDescription}`,
    `Collective first-person "we", never "you". Two short paragraphs. It ends on ONE quotable pair of lines.`,
    tier ? `This card's register is ${TIER_HINT[tier] || tier}` : ``,
    ``,
    `Score the card 1-3:`,
    `  3 = in voice. Sounds spoken; every sentence could stand alone; concrete and modern; lands one clean close; true to the aspect; no overreach.`,
    `  2 = borderline. Generally right but has one clear flaw: an extra aphorism before the close, a slightly generic line, a soft ending, or a mild reach.`,
    `  1 = off voice. Reads generic or written; invents scenarios not supported by the aspect; moralizes or preaches; stacks endings; names the astrology mechanics; or drifts from the source meaning.`,
    ``,
    `Judge hard on these, which regex cannot catch:`,
    `  - Overreach / invented specifics the aspect does not support.`,
    `  - Moralizing or life-coaching ("the lesson is", "remember to", telling people what to do).`,
    `  - More than one closing aphorism (the ending must be a single truth + its catch).`,
    `  - Naming the mechanics or elements ("this trine", "fire meets water").`,
    `  - Sounding like a generic horoscope rather than these examples.`,
    ``,
    `GOLD STANDARD for this register (these are 3s):`,
    ...goldStandard(tier).map((b, i) => `  [${i + 1}] ${b}`),
    ``,
    `CARD TO SCORE:`,
    card,
    ``,
    `Return ONLY strict JSON: {"score": 1|2|3, "verdict": "in-voice"|"borderline"|"off-voice", "weakest": "the single weakest sentence, quoted", "why": "one short reason"}`,
  ].filter(Boolean).join("\n");
}

// The judge reuses the generator's model plumbing (provider, model, key), so it
// works the moment the generator's key is set - no separate wiring. Note: it
// runs at the generator's temperature; a dedicated low temperature (~0.1) makes
// the judge's scores more consistent and is worth adding later.
const { generate } = require("./generate-sky-aspect-cards.js");
// The judge runs COLD (low temperature). Judging wants determinism, not the
// creative 0.7 the generator uses; at 0.7 the same card scores differently
// across runs, which is why calibration kept shifting.
const JUDGE_TEMPERATURE = 0.1;
async function judge(prompt) {
  return generate(prompt, { temperature: JUDGE_TEMPERATURE });
}

function parseVerdict(raw) {
  const m = String(raw).match(/\{[\s\S]*\}/);
  if (!m) return { score: 1, verdict: "off-voice", why: "judge did not return JSON" };
  try { return JSON.parse(m[0]); } catch { return { score: 1, verdict: "off-voice", why: "unparseable judge output" }; }
}

// The gate. autoPublish only on a 3; a 2 goes to the (small) human queue; a 1
// is rejected and should be regenerated.
const gateFor = (score) => (score === 3 ? "auto-publish" : score === 2 ? "human-review" : "regenerate");

// samples > 1 runs the judge N times and takes the median score (self-consistency).
// Default 1 is cheap for production; calibration uses 3 for a stable read.
async function judgeCard(card, opts = {}) {
  const fn = opts.judgeFn || judge;
  const prompt = buildJudgePrompt(card, opts);
  const samples = Math.max(1, opts.samples || 1);
  const verdicts = [];
  for (let i = 0; i < samples; i++) verdicts.push(parseVerdict(await fn(prompt)));
  const scores = verdicts.map((v) => v.score).sort((a, b) => a - b);
  const median = scores[Math.floor(scores.length / 2)];
  const chosen = verdicts.find((v) => v.score === median) || verdicts[0];
  return { ...chosen, score: median, samples, gate: gateFor(median) };
}

module.exports = { buildJudgePrompt, judgeCard, parseVerdict, TIER_OF };

if (require.main === module) {
  const [mode, ...rest] = process.argv.slice(2);
  const card = rest.join(" ");
  if (mode === "--dry-run" && card) console.log(buildJudgePrompt(card));
  else { console.error('usage: --dry-run "<card text>"'); process.exit(1); }
}
