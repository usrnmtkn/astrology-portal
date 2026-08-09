"use strict";
// Daily At-a-Glance advisory judge. GR-003: no score grants approval; the judge ranks and filters only.
const fs = require("fs");
const path = require("path");
const packageRoot = path.resolve(__dirname, "..");
const repoRoot = path.resolve(packageRoot, "..", "..");
const { loadLocalEnv } = require("./daily-glance-writer-runtime.js");
const { canonicalAstrologyReviewInstructions } = require("../../../src/astro-writing/canonicalInstructions.cjs");

const JUDGE_MODEL = "gpt-4.1-mini";
const RUBRIC_VERSION = "daily-glance-voice-v2:boundary-discipline+median3";
const evalSetPath = path.join(packageRoot, "review", "daily-glance-judge-calibration-set-v1.json");

const RUBRIC = `You judge one Daily At-a-Glance horoscope candidate (headline + body) against the owner's voice.
Score 1 (off-voice), 2 (near, needs owner rewrite), or 3 (rubric-acceptable; still never auto-approved).
Dimensions, each true/false:
- voice: reads like the GOOD examples, not the REJECTED ones; plain conversational truth; no assembled/balanced AI rhythm.
- stakes: names a recognizable cost or consequence (time, money, trust, resentment, a lost hour), not just a scene.
- structure: truth or interpretation arrives early; the lived example supports it rather than delaying it; ending completes the thought (instruction optional).
- hedging: at most one may/might/can hedge in the body; claims are made, not softened away.
- formula: no template smell - no recurring permission frames ("You don't have to", "You're allowed"), no mechanical time anchors, no scene-opener rut.
- screenshot_line: at least one sentence someone would save or send because it names something they have felt but not said this clearly.
- specificity: would fail if swapped under a different transit; carries THIS key's register (group + target).
SCORING DISCIPLINE:
- The REJECTED examples define the boundary. If the candidate shares their register (template skeleton, permission line in a fixed slot, uniform sentence rhythm, scene-first delay, coaching close), score 2 at most, even when every rule is technically satisfied.
- Score 3 is reserved for a candidate that would sit unnoticed among the GOOD examples in a blind read. When unsure between 2 and 3, choose 2.
- Competitor polish is not owner voice: punchy mind-reading diagnosis ("You've confused X with Y"), therapy-causal claims, and aphoristic cynicism score 1.
Also report best_line (the strongest sentence) and why (one blunt paragraph).
Return strict JSON: {"score":1|2|3,"verdict":"...","dimensions":{"voice":bool,"stakes":bool,"structure":bool,"hedging":bool,"formula":bool,"screenshot_line":bool,"specificity":bool},"best_line":"...","why":"..."}`;

function readEvalSet() { return JSON.parse(fs.readFileSync(evalSetPath, "utf8")); }

function pick(arr, n, seed) {
  const out = []; let h = 0;
  for (const ch of String(seed)) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  const copy = arr.slice();
  while (out.length < Math.min(n, copy.length)) { h = (h * 1103515245 + 12345) >>> 0; out.push(copy.splice(h % copy.length, 1)[0]); }
  return out;
}

function buildJudgePrompt(candidate, key) {
  const es = readEvalSet();
  const golds = pick(es.golds.filter((g) => g.key !== key), 5, key + "|g");
  const negs = pick(es.negatives.filter((g) => g.key !== key), 3, key + "|n");
  const fmt = (e) => `HEADLINE: ${e.headline}\nBODY: ${e.body}`;
  return [
    RUBRIC, "",
    "## GOOD (owner-approved, exact wording)", ...golds.map((g, i) => `### Good ${i + 1}\n${fmt(g)}`), "",
    "## REJECTED (owner rejected as flat / not her voice)", ...negs.map((g, i) => `### Rejected ${i + 1}\n${fmt(g)}`), "",
    `## CANDIDATE (key: ${key})`, fmt(candidate), "",
    "Return only the JSON verdict."
  ].join("\n");
}

function parseVerdict(raw) {
  const m = String(raw).match(/\{[\s\S]*\}/);
  if (!m) return { score: 1, verdict: "unparseable", dimensions: {}, why: "judge returned no JSON" };
  try { return JSON.parse(m[0]); } catch { return { score: 1, verdict: "unparseable", dimensions: {}, why: "bad judge JSON" }; }
}

async function callJudge(prompt) {
  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: { authorization: `Bearer ${process.env.OPENAI_API_KEY}`, "content-type": "application/json" },
    body: JSON.stringify({
      model: JUDGE_MODEL,
      instructions: canonicalAstrologyReviewInstructions,
      input: prompt,
      temperature: 0.2,
      max_output_tokens: 700
    })
  });
  const payload = await response.json();
  if (!response.ok) throw new Error(`judge http ${response.status}: ${JSON.stringify(payload).slice(0, 300)}`);
  const text = payload.output_text
    ?? (payload.output || []).flatMap((o) => (o.content || [])).filter((c) => c.type === "output_text").map((c) => c.text).join("");
  return { verdict: parseVerdict(text), usage: payload.usage || {}, raw: text };
}

async function judgeCandidate(candidate, key, samples = 1) {
  const prompt = buildJudgePrompt(candidate, key);
  const runs = [];
  for (let i = 0; i < Math.max(1, samples); i += 1) runs.push(await callJudge(prompt));
  const scores = runs.map((r) => Number(r.verdict.score) || 1).sort((a, b) => a - b);
  const median = scores[Math.floor((scores.length - 1) / 2)];
  const primary = runs.find((r) => Number(r.verdict.score) === median) || runs[0];
  const dims = primary.verdict.dimensions || {};
  const dimScore = Object.values(dims).filter(Boolean).length;
  return { key, rubricVersion: RUBRIC_VERSION, judgeModel: JUDGE_MODEL, score: median, allScores: scores, dimScore, verdict: primary.verdict, advisoryOnly: true };
}

module.exports = { judgeCandidate, buildJudgePrompt, parseVerdict, readEvalSet, RUBRIC_VERSION, JUDGE_MODEL };

async function calibrate() {
  loadLocalEnv();
  if (!process.env.OPENAI_API_KEY) throw new Error("OPENAI_API_KEY is not configured.");
  const es = readEvalSet();
  const rows = [];
  for (const [tier, list] of [["gold", es.golds], ["negative", es.negatives]]) {
    for (const e of list) {
      const r = await judgeCandidate(e, e.key, 3);
      rows.push({ tier, key: e.key, source: e.source, score: r.score, dimScore: r.dimScore, why: (r.verdict.why || "").slice(0, 160) });
      process.stdout.write(`${tier} ${e.key} -> ${r.score} (${r.dimScore}/7)\n`);
    }
  }
  const mean = (t) => rows.filter((r) => r.tier === t).reduce((a, r) => a + r.score, 0) / rows.filter((r) => r.tier === t).length;
  const negThrees = rows.filter((r) => r.tier === "negative" && r.score === 3).length;
  const summary = {
    schemaVersion: 1, rubricVersion: RUBRIC_VERSION, judgeModel: JUDGE_MODEL, calibratedAt: new Date().toISOString(),
    goldMean: Number(mean("gold").toFixed(2)), negativeMean: Number(mean("negative").toFixed(2)), negativeScoreThrees: negThrees,
    acceptance: es.acceptance,
    passed: mean("gold") >= es.acceptance.goldMeanMin && mean("negative") <= es.acceptance.negativeMeanMax && negThrees <= es.acceptance.negativeScoreThreeMax,
    rows
  };
  fs.writeFileSync(path.join(packageRoot, "review", "daily-glance-judge-calibration-report-v1.json"), JSON.stringify(summary, null, 1));
  process.stdout.write(`\ngoldMean=${summary.goldMean} negativeMean=${summary.negativeMean} negativeThrees=${negThrees} passed=${summary.passed}\n`);
}

if (require.main === module) {
  const mode = process.argv[2];
  if (mode === "--calibrate") calibrate().catch((error) => { console.error(error.message); process.exit(1); });
  else { console.error("usage: node scripts/judge-daily-glance.js --calibrate"); process.exit(1); }
}

// --rejudge <dir>: re-score saved candidates.json files with the current rubric and rewrite winners.
async function rejudge(dir) {
  loadLocalEnv();
  if (!process.env.OPENAI_API_KEY) throw new Error("OPENAI_API_KEY is not configured.");
  const abs = path.join(packageRoot, dir);
  const files = fs.readdirSync(abs).filter((f) => f.endsWith(".candidates.json"));
  for (const f of files) {
    const key = f.replace(".candidates.json", "").replace("-", "/");
    const candidates = JSON.parse(fs.readFileSync(path.join(abs, f), "utf8"));
    for (const c of candidates) {
      if (!c.candidate) { c.rejudge = { score: 0, dimScore: 0 }; continue; }
      c.rejudge = await judgeCandidate(c.candidate, key, 3);
      process.stdout.write(`${key} sample ${c.sample}: v2 judge=${c.rejudge.score} (${c.rejudge.allScores}) dims=${c.rejudge.dimScore}/7\n`);
    }
    const ranked = candidates.slice().sort((a, b) => (b.rejudge.score - a.rejudge.score) || (b.rejudge.dimScore - a.rejudge.dimScore) || (((b.lint || {}).passed ? 1 : 0) - (((a.lint || {}).passed) ? 1 : 0)));
    fs.writeFileSync(path.join(abs, f), JSON.stringify(candidates, null, 1));
    fs.writeFileSync(path.join(abs, f.replace(".candidates.json", ".winner.json")), JSON.stringify({ key, advisoryOnly: true, rubric: RUBRIC_VERSION, winner: ranked[0].candidate, judge: ranked[0].rejudge, lint: ranked[0].lint }, null, 1));
  }
  process.stdout.write("re-ranking complete with rubric v2\n");
}

if (require.main === module && process.argv[2] === "--rejudge") {
  rejudge(process.argv[3] || "review/daily-glance-batch-3-judged").catch((error) => { console.error(error.message); process.exit(1); });
}
