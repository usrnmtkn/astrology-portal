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
const root = path.join(__dirname, "..");
const readJson = (p) => JSON.parse(fs.readFileSync(p, "utf8"));
const spec = readJson(path.join(root, "voice", "tldr-astro", "sky-placement.json"));
const compiledJudgePolicy = readJson(path.join(root, "voice", "tldr-astro", "judge-policy.generated.json"));

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
  const all = (spec.ownerApprovedCalibrationExamples || []).filter((e) =>
    e.calibrationEligible === true
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

function buildJudgePrompt(article, { tier = "", planet = "", sign = "", deterministicResults = null } = {}) {
  const placementLabel = planet && sign ? ` for ${planet} in ${sign}` : "";
  const gold = goldStandard(tier, 2);
  const decisionRules = compiledJudgePolicy.decisions.map((entry) => `  [${entry.id}] ${entry.rule}`);
  return [
    `You are the final acceptability judge for one Current Sky placement article${placementLabel}. Classify the untouched draft. Do not rewrite, approve, or promote it.`,
    tier ? `Planet-speed register: ${TIER_HINT[tier] || tier}` : ``,
    ``,
    `COMPACT FINAL-ACCEPTABILITY RUBRIC`,
    ...compiledJudgePolicy.compactRubric.map((item, index) => `  ${index + 1}. ${item}`),
    ``,
    `SCOPED ACTIVE OWNER DECISIONS`,
    ...decisionRules,
    ``,
    `SCORING`,
    `  3 = in voice. Placement-specific, concrete, natural, and compliant. A minor broad sentence may survive when no central sentence fails natural English.`,
    `  2 = borderline. The article is usable but has one clear editorial weakness, such as a generic beat or unnecessary second conclusion.`,
    `  1 = off voice. A central sentence fails natural English, the astrology or subject matter drifts, or the article is generic enough to survive a planet/sign swap.`,
    `  Any deterministic fail makes the final score 1. In particular, any facilitation-register hit in moves is score 1.`,
    `  Score 1 when the article contains neither a cycle line nor any clear teaching of what the planet does and how the sign changes its method. A named placement alone is not planet/sign teaching.`,
    `  Score 1 when a concurrent-events paragraph names an event absent from the supplied eventsDuringTransit facts, even when the prose sounds plausible.`,
    ``,
    `OWNER-REGISTER AND SCENE CHECKS`,
    `  A scene that any astrology account would attach to this sign is a fail. It must be derivable from THIS placement's combined meaning at THIS transit's scale. A Jupiter year is not a dinner; a year-long or slower transit reduced to one evening's logistics scores 1.`,
    `  Compare the draft with only the eligible owner evidence below. Generic product copy that violates no literal ban still fails the owner-register check. If no approved format exemplar is available, do not invent one or treat a needs-review card as approved.`,
    `  Treat moves as the highest-risk section until an exact owner-approved moves exemplar exists. In moves, must-have, flexible detail, decision time, each side, proposal, mutual, negotiate, stakeholder, align or alignment, and action item are facilitation-register failures and score 1.`,
    `  A tagline built as '[Planet] in [Sign] helps us grow through [abstract nouns]' fails. It must state this placement's specific promise as a complete, plain sentence understood on first read.`,
    `  Prior-residency history is limited to an engine-supplied date range. Celebrity references, pop-culture examples, political examples, and descriptions of what an era was like score 1. The deterministic regex catches only registered exact celebrity names; judge recognizable short forms, surnames, mononyms, stage names, and nicknames here.`,
    `  Natal-facing sections, second person, entering-the-chat language, main-character-era language, and glow-up language do not belong on Current Sky.`,
    ``,
    `DETERMINISTIC CHECK RESULTS`,
    JSON.stringify(deterministicResults || { status: "not supplied" }, null, 2),
    ``,
    `LIMITED OWNER-APPROVED CALIBRATION EVIDENCE`,
    ...(gold.length
      ? gold.map((entry, index) => `  [${index + 1}] ${entry.planet} in ${entry.sign}\n${renderTrio(entry).split("\n").map((line) => `      ${line}`).join("\n")}`)
      : [`  None available for this register. Use the rubric and active decisions only.`]),
    ``,
    `ARTICLE TO SCORE`,
    renderTrio(article),
    ``,
    `Return ONLY strict JSON: {"score": 1|2|3, "verdict": "in-voice"|"borderline"|"off-voice", "weakest": ["weakest line quoted", "second-weakest line quoted", "third-weakest line quoted"], "why": "one short reason"}. Always cite three lines when the draft contains at least three lines; use fewer only when the complete draft contains fewer.`
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
