#!/usr/bin/env node
//
// LLM-as-judge for LONG-FORM sky placement articles: the second judge.
//
// Scope split, per the editor's ruling:
//   - judge-placement-voice.js scores the slot-tier placement pages
//     (hook/lived/turn trios). It never scores long-form articles.
//   - THIS judge scores the authored article layer: ingress editions,
//     station editions, and nodes articles. It never scores cards or trios.
//
// The spec (checks, per-planet furniture, calibration set) lives in
// voice/tldr-astro/sky-article-longform.json. The linter still runs first
// for the mechanical floor (lexicon + trade vocabulary); this judge covers
// what a regex cannot: empathy-first opening, spoken register, Maybe-lists,
// the teaching correction, the benediction close, and whether the article
// wears its own planet's furniture.
//
// Same gates and plumbing as the other judges: cold (0.1), optional
// median-of-N, 3 auto-publish / 2 human-review / 1 regenerate.
//
//   node scripts/judge-article-voice.js --dry-run ./path/to/article.md --planet uranus

const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const readJson = (p) => JSON.parse(fs.readFileSync(p, "utf8"));
const spec = readJson(path.join(root, "voice", "tldr-astro", "sky-article-longform.json"));

function furnitureFor(planet) {
  const key = String(planet || "").toLowerCase();
  if (spec.perPlanetFurniture[key]) return spec.perPlanetFurniture[key];
  for (const [k, v] of Object.entries(spec.perPlanetFurniture)) {
    if (k.split("|").includes(key)) return v;
  }
  return "";
}

function buildJudgePrompt(articleText, { planet = "", edition = "" } = {}) {
  const furniture = furnitureFor(planet);
  const judged = spec.checks.filter((c) => c.id !== "lint-clean");
  return [
    `You are the editor for Marie Satori, an astrologer. You are strict. Most drafts are "borderline" until proven otherwise.`,
    ``,
    `You are scoring a LONG-FORM sky placement article${planet ? ` (${planet}${edition ? `, ${edition}` : ""})` : ""}. Template slots in double braces ({{entryDate}}, {{aspectHits...}}) are filled by the app; do not penalize their presence, but do judge the prose around them.`,
    ``,
    `The voice: ${spec.voiceDescription}`,
    ``,
    `Licensed on this surface (do NOT penalize): ${spec.licensedOnThisSurface.join("; ")}.`,
    furniture ? `This planet's required furniture: ${furniture}` : ``,
    ``,
    `Score 1-3 against these checks:`,
    ...judged.map((c, i) => `  ${i + 1}. [${c.id}] ${c.rule}`),
    ``,
    `  3 = in voice: yes across the board.`,
    `  2 = minor drift: one or two checks soft (a stiff paragraph, a missing Maybe-list, genre furniture in one section).`,
    `  1 = out of voice: empathy-first missing, think-tank register in the body, or the wrong planet's furniture.`,
    ``,
    `ARTICLE TO SCORE:`,
    articleText,
    ``,
    `Return ONLY strict JSON: {"score": 1|2|3, "verdict": "in-voice"|"borderline"|"off-voice", "failedChecks": ["check-id", ...], "weakest": ["up to three weakest sentences, quoted"], "rewrites": ["one rewrite per weakest sentence"], "why": "one short reason"}`,
  ].filter(Boolean).join("\n");
}

// Cold judge on the generator's plumbing (same provider/model/key).
const { generate } = require("./generate-sky-aspect-cards.js");
const JUDGE_TEMPERATURE = 0.1;
async function judge(prompt) {
  return generate(prompt, { temperature: JUDGE_TEMPERATURE });
}

function parseVerdict(raw) {
  const m = String(raw).match(/\{[\s\S]*\}/);
  if (!m) return { score: 1, verdict: "off-voice", why: "judge did not return JSON" };
  try { return JSON.parse(m[0]); } catch { return { score: 1, verdict: "off-voice", why: "unparseable judge output" }; }
}

const gateFor = (score) => (score === 3 ? "auto-publish" : score === 2 ? "human-review" : "regenerate");

// samples > 1 -> median score (self-consistency); calibration uses 5, production 1.
async function judgeLongformArticle(articleText, opts = {}) {
  const fn = opts.judgeFn || judge;
  const prompt = buildJudgePrompt(articleText, opts);
  const samples = Math.max(1, opts.samples || 1);
  const verdicts = [];
  for (let i = 0; i < samples; i++) verdicts.push(parseVerdict(await fn(prompt)));
  const scores = verdicts.map((v) => v.score).sort((a, b) => a - b);
  const median = scores[Math.floor(scores.length / 2)];
  const chosen = verdicts.find((v) => v.score === median) || verdicts[0];
  return { ...chosen, score: median, samples, gate: gateFor(median) };
}

module.exports = { buildJudgePrompt, judgeLongformArticle, parseVerdict, furnitureFor };

if (require.main === module) {
  const args = process.argv.slice(2);
  const dry = args.includes("--dry-run");
  const planetIdx = args.indexOf("--planet");
  const planet = planetIdx >= 0 ? args[planetIdx + 1] : "";
  const file = args.find((a) => a.endsWith(".md"));
  if (!file) {
    console.error("usage: judge-article-voice.js [--dry-run] ./article.md --planet uranus");
    process.exit(1);
  }
  const text = fs.readFileSync(file, "utf8");
  if (dry) {
    console.log(buildJudgePrompt(text, { planet }));
  } else {
    judgeLongformArticle(text, { planet }).then((v) => {
      console.log(JSON.stringify(v, null, 2));
      process.exit(v.score === 1 ? 2 : 0);
    });
  }
}
