#!/usr/bin/env node
//
// LLM-as-judge for sky placement articles: the second gate, after
// scripts/lint-placement-voice.js.
//
// The linter enforces the mechanical floor (banned words, slots, closers).
// This judge scores what a regex cannot: does the hook earn a screenshot, is
// the lived beat concrete and paced, does the turn land ONE close with bite,
// does the article survive the swap test (could another planet-sign wear this
// body?), does the register match the planet's tier. The verdict is advisory;
// a model score never publishes content without a human approval.
//
// Judging runs COLD (0.1) with optional median-of-N sampling, the settings the
// aspect judge converged on after three calibration fixes. Reuses the
// generator's provider plumbing, so it works the moment the key is set.
//
//   node scripts/judge-placement-voice.js --dry-run '{"hook":"...","lived":"...","turn":"..."}'

const fs = require("fs");
const path = require("path");
const { buildOwnerVocabularyPrompt } = require("./owner-vocabulary-prompt.js");

const root = path.join(__dirname, "..");
const readJson = (p) => JSON.parse(fs.readFileSync(p, "utf8"));
const spec = readJson(path.join(root, "voice", "tldr-astro", "sky-placement.json"));

const TIER_OF = {};
for (const [tier, members] of Object.entries(spec.planetTierRegister.tiers)) {
  for (const m of members) TIER_OF[m] = tier;
}

const TIER_HINT = {
  luminary: "a fast, felt shift over a day to a month; concrete and immediate. Penalize era-scale sweep here - a Moon placement is a passing tone, not a chapter.",
  personal: "a weeks-long pull on the mind, worth, or drive; concrete and personal.",
  social: "a year-or-two arc touching commitments, structures, and shared stories; groups and institutions may appear. Do NOT penalize it for being less about a single day.",
  generational: "an era a whole generation carries together. It is LEGITIMATELY sweeping and world-scale; judge it against its own register, but it must still touch observable behavior."
};

// Gold standard trios from the SAME tier, topped up cross-tier when thin
// (the social tier has no exemplar yet; generational is its closest register).
function goldStandard(tier, n = 2) {
  const all = spec.exemplars.filter((e) =>
    e.canonical === true
    && e.ownerApproved === true
    && e.editorialStatus === "current_sky_owner_approved"
  );
  const same = tier ? all.filter((e) => e.tier === tier) : [];
  const fallbackOrder = tier === "social" ? ["generational", "personal", "luminary"] : null;
  let pool = same;
  if (pool.length < n) {
    const rest = fallbackOrder
      ? fallbackOrder.flatMap((t) => all.filter((e) => e.tier === t))
      : all.filter((e) => !same.includes(e));
    pool = [...same, ...rest];
  }
  return pool.slice(0, n);
}

const renderTrio = (e) => {
  const lines = [`HOOK: ${e.hook}`, `LIVED: ${e.lived}`, `TURN: ${e.turn}`];
  if (e.tagline) lines.unshift(`TAGLINE: ${e.tagline}`);
  if (Array.isArray(e.moves)) lines.push(`MOVES: ${e.moves.join(" / ")}`);
  return lines.join("\n");
};

function buildJudgePrompt(article, { tier = "", planet = "", sign = "" } = {}) {
  const placementLabel = planet && sign ? ` for ${planet} in ${sign}` : "";
  const gold = goldStandard(tier);
  return [
    `You are the editor of a modern astrology app. You are strict. Most drafts are "borderline" until proven otherwise.`,
    ``,
    `You are scoring a sky placement article${placementLabel}. Slots: an optional TAGLINE (2-5 word imperative under the title), HOOK, LIVED, TURN, and optional MOVES (2-3 concrete ways to work with the transit), rendered top to bottom as one article. The first sentence of HOOK is promoted by the reader into a standalone bold quote and removed from the body; the remaining hook sentences are the planet-plus-sign meaning paragraph. The date range and dated sky events are computed by the app; they are not part of what you score.`,
    `The voice: ${spec.voiceDescription}`,
    buildOwnerVocabularyPrompt({
      surface: "planet-article",
      maxCore: 14,
      maxShared: 10,
      maxAcShared: 8,
      maxSdAdditions: 6
    }),
    tier ? `This article's register is ${TIER_HINT[tier] || tier}` : ``,
    ``,
    `Score the article 1-3:`,
    `  3 = in voice. The hook opens with a standalone line someone would send to a friend, then clearly explains what the planet governs and how the sign changes its expression without reading like a definition; the lived beat shows the placement's useful expression in ordinary behavior with its pace; the turn names where that strength becomes the problem and ends on the line with the most bite; the whole thing could ONLY be this planet in this sign. Score 3 does not require flawless prose: one minor explanatory or slightly broad sentence is acceptable when the placement is unmistakable, the lived section is concrete, the turn names a real behavior and consequence, every hard surface rule passes, and no central sentence fails natural English.`,
    `  2 = borderline. Generally right but one clear flaw: a hook that explains instead of hooks, a generic lived detail, a soft or stacked ending, a mild reach beyond the source, or one beat that could swap into another placement.`,
    `  1 = off voice. Reads like a sign encyclopedia or a generic horoscope; leads with lore; moralizes or blesses; invents specifics the placement does not support; the whole article would survive a planet/sign swap; or a central sentence fails natural English while the lived section remains generalized, abstract, or lacks a recognizable sequence.`,
    ``,
    `Judge hard on these, which a regex cannot catch:`,
    `  - THE SWAP TEST: strip the headings and ask whether another planet or sign could wear this body without sounding wrong. If yes, score 1.`,
    `  - Hook quality: sentence 1 must stand alone as a recognition quote, not an announcement ("X enters Y"). The remaining hook must add real planet-function + sign-expression meaning in natural prose, not a definition or keyword list.`,
    `  - Meaning depth: the article must distinguish what the planet does from how this sign makes it act. If it only supplies atmosphere, scenes, or a generic sign description, score no higher than 2.`,
    `  - The shadow must be OBSERVABLE BEHAVIOR (what someone does), not an abstract warning.`,
    `  - CURRENT SKY IS COLLECTIVE: copy may not use "you", "your", "yours", "yourself", "yourselves", or "part of you" anywhere, including MOVES. Second person belongs to transit-to-natal copy. Any otherwise-strong Current Sky draft with second person must score below 3. Historical second-person originals are not gold evidence on this surface.`,
    `  - FIRST-READ NATURAL ENGLISH RULE: if a central sentence does not make literal sense in natural English, the article cannot receive a score of 2 or 3 unless the failure is isolated and the remaining article is strongly grounded. Score 1 when the hook contains opaque or unnatural personification AND the lived section remains generalized, abstract, or lacks a recognizable sequence. Examples: "The banished want refuses to stay reasonable." "The first idea has spent its excitement." "The arrangement stopped telling the truth." Conventional astrology language such as "Mars governs action" is allowed.`,
    `  - OBSERVATION BEFORE POLISH: the hook must begin with recognizable pressure, behavior, or a decision. A slogan or abstract placement summary that merely sounds sharp is not a lived premise.`,
    `  - STACKED ENDING RULE: when the turn has already named the behavior and cost, mark any following slogan, metaphor, reassurance, or second conclusion for deletion. This usually lowers an otherwise strong article from 3 to 2. It does not require a full rewrite.`,
    `  - Do not infer employment or career from a sign alone. Taurus does not automatically mean work; job language needs support from the planet, house, aspect, or supplied source.`,
    `  - Preserve strong owner-written lines. Do not reward rewriting a clear sentence merely to make it sound more polished.`,
    `  - One close with bite, nothing after it: no blessing, recap, or second aphorism restating the first.`,
    `  - Register match: pace and sweep must fit this tier.`,
    `  - Sign lore (rulership, modality, elements-as-labels, season history) anywhere in the body.`,
    `  - Coverage sentences that exist only to be complete.`,
    `  - FLAT INVENTORY: the lived beat must move from pressure to choice to consequence. If it merely lines up representative examples from work, family, relationships, or public life, score no higher than 2 even when the nouns are concrete. One charged sequence is voice; three peer scenarios are generated coverage.`,
    `  - ALLOWED COLLECTIVE LANGUAGE: do not flag "people", "someone", or "we" merely because they are collective nouns or pronouns. Flag them only when they conceal a behavior that should be named more specifically.`,
    `  - If a TAGLINE is present: it must be sharp and sendable, not a label ("Leo season begins" is a label; a claim or imperative is a tagline).`,
    `  - If MOVES are present: each must be a specific doable action that only fits this placement. "Journal about your feelings" or "trust the process" fails; the moves are held to the same swap test as the body.`,
    `  - Flag any sentence matching the CC/SD constructions in voice/banned-constructions.json; the tic list identifies copy that reads as CHANI or Spirit Daughter rather than the house voice. Owner-verbatim text is exempt. Treat nearby cases as a judged consideration, not an automatic fail: specific, falsifiable permission to do a nameable thing is house voice; generic affirmational permission is not.`,
    ``,
    `OWNER-APPROVED BEAT EVIDENCE (judge movement and consequence; do not require or reward copied wording):`,
    ...(spec.ownerApprovedBeatEvidence || []).map((e) => `  [${e.sourceId}] ${e.slot.toUpperCase()}: ${e.text}\n      EDITORIAL USE: ${e.use}`),
    ``,
    `CURRENT SKY OWNER-APPROVED FULL-ARTICLE GOLD for this register:`,
    ...(gold.length
      ? gold.map((e, i) => `  [${i + 1}] ${e.planet} in ${e.sign}\n${renderTrio(e).split("\n").map((l) => `      ${l}`).join("\n")}`)
      : [`  None yet. Collective adaptation candidates are deliberately excluded until the owner approves their exact wording. Judge from the rubric and the approved beat evidence only.`]),
    ``,
    `ARTICLE TO SCORE:`,
    renderTrio(article),
    ``,
    `Return ONLY strict JSON: {"score": 1|2|3, "verdict": "in-voice"|"borderline"|"off-voice", "weakest": "the single weakest sentence, quoted", "why": "one short reason"}`,
  ].filter(Boolean).join("\n");
}

const { editorialGate } = require("./editorial-judge-policy.js");
const { runJudgeSamples } = require("./editorial-judge-runtime.js");
const JUDGE_TEMPERATURE = 0.1;

function parseVerdict(raw) {
  const m = String(raw).match(/\{[\s\S]*\}/);
  if (!m) return { score: 1, verdict: "off-voice", why: "judge did not return JSON" };
  try { return JSON.parse(m[0]); } catch { return { score: 1, verdict: "off-voice", why: "unparseable judge output" }; }
}

// samples > 1 -> median score (self-consistency); calibration uses 5, production 1.
async function judgeArticle(article, opts = {}) {
  const prompt = buildJudgePrompt(article, opts);
  const result = await runJudgeSamples({
    content: JSON.stringify(article),
    prompt,
    rubric: JSON.stringify(spec),
    rubricVersion: spec.id || "sky-placement-voice-v1",
    samples: opts.samples,
    temperature: JUDGE_TEMPERATURE,
    judgeFn: opts.judgeFn,
    parseVerdict,
    context: { surface: "sky-placement", planet: opts.planet || "", sign: opts.sign || "", tier: opts.tier || "" },
    calibration: Boolean(opts.calibration)
  });
  return { ...result, ...editorialGate(result) };
}

module.exports = { buildJudgePrompt, judgeArticle, parseVerdict, TIER_OF, TIER_HINT };

if (require.main === module) {
  const [mode, ...rest] = process.argv.slice(2);
  const raw = rest.join(" ");
  if (mode === "--dry-run" && raw) {
    let article;
    try { article = JSON.parse(raw); } catch { console.error("pass a JSON article {hook, lived, turn}"); process.exit(1); }
    const planet = article.planet || "";
    console.log(buildJudgePrompt(article, { tier: TIER_OF[planet] || "", planet, sign: article.sign || "" }));
  } else {
    console.error('usage: --dry-run \'{"hook":"...","lived":"...","turn":"..."}\'');
    process.exit(1);
  }
}
