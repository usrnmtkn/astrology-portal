"use strict";
// Judged best-of-N selection for the daily glance. Writer: config-routed Sol. Judge: advisory gpt-4.1-mini (GR-003).
const fs = require("fs");
const path = require("path");
const packageRoot = path.resolve(__dirname, "..");
const { readJson, buildPacket, renderModelInput, packetLint, lintOutput, loadLocalEnv, normalizeUsage, outputText } = require("./daily-glance-writer-runtime.js");
const { judgeCandidate } = require("./judge-daily-glance.js");
const { canonicalAstrologyWritingInstructions } = require("../../../src/astro-writing/canonicalInstructions.cjs");

function parseCandidate(raw) {
  const m = String(raw).match(/\{[\s\S]*\}/);
  if (!m) return null;
  try { const d = JSON.parse(m[0]); return (d.headline && d.body) ? { headline: d.headline, body: d.body } : null; } catch { return null; }
}

async function writerCall(config, modelInput) {
  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: { authorization: `Bearer ${process.env.OPENAI_API_KEY}`, "content-type": "application/json" },
    body: JSON.stringify({
      model: config.routing.model,
      instructions: canonicalAstrologyWritingInstructions,
      input: modelInput,
      reasoning: { effort: config.routing.reasoningEffort },
      max_output_tokens: config.routing.maxOutputTokens ?? 24000
    })
  });
  const payload = await response.json();
  if (!response.ok) throw new Error(`writer http ${response.status}: ${JSON.stringify(payload).slice(0, 300)}`);
  return { raw: outputText(payload), usage: normalizeUsage(payload.usage), responseId: payload.id || null, status: payload.status || null };
}

async function main() {
  const args = process.argv.slice(2);
  const get = (flag, dflt) => { const i = args.indexOf(flag); return i >= 0 ? args[i + 1] : dflt; };
  const configFile = get("--config", "config/daily-glance-writer-sol-xhigh-batch-3-v2.json");
  const outDir = get("--out", "review/daily-glance-batch-3-judged");
  const samples = Number(get("--samples", "4"));
  if (!args.includes("--authorize-live")) { console.error("Pass --authorize-live to bill. Owner authorization required."); process.exit(1); }
  loadLocalEnv();
  if (!process.env.OPENAI_API_KEY) throw new Error("OPENAI_API_KEY is not configured.");
  const config = readJson(path.join(packageRoot, configFile));
  fs.mkdirSync(path.join(packageRoot, outDir), { recursive: true });
  const results = [];
  for (const target of config.keys) {
    const key = target.key;
    const slug = key.replace(/\//g, "-");
    const packet = buildPacket(key, config);
    const modelInput = renderModelInput(packet);
    const pl = packetLint(packet, modelInput, config);
    if (!pl.passed) throw new Error(`Packet self-lint failed for ${key}; refusing to bill.`);
    const candidates = [];
    for (let i = 0; i < samples; i += 1) {
      const w = await writerCall(config, modelInput);
      const candidate = parseCandidate(w.raw);
      const lint = candidate ? lintOutput(candidate, key, config) : { passed: false, hard: ["unparseable"] };
      const judged = candidate ? await judgeCandidate(candidate, key) : { score: 0, dimScore: 0, verdict: { why: "unparseable writer output" } };
      candidates.push({ sample: i + 1, candidate, raw: w.raw, writerUsage: w.usage, responseId: w.responseId, lint, judge: judged });
      process.stdout.write(`${key} sample ${i + 1}: judge=${judged.score} dims=${judged.dimScore}/7 lint=${lint.passed}\n`);
    }
    const ranked = candidates.slice().sort((a, b) => (b.judge.score - a.judge.score) || (b.judge.dimScore - a.judge.dimScore) || ((b.lint.passed ? 1 : 0) - (a.lint.passed ? 1 : 0)));
    const winner = ranked[0];
    fs.writeFileSync(path.join(packageRoot, outDir, `${slug}.candidates.json`), JSON.stringify(candidates, null, 1));
    fs.writeFileSync(path.join(packageRoot, outDir, `${slug}.winner.json`), JSON.stringify({ key, advisoryOnly: true, winner: winner.candidate, judge: winner.judge, lint: winner.lint }, null, 1));
    results.push({ key, winnerScore: winner.judge.score, winnerDims: winner.judge.dimScore, samples });
  }
  const totals = { schemaVersion: 1, mode: "judged-best-of-n", samplesPerKey: samples, keys: results, note: "Winners are unapproved candidates for the owner sitting. GR-003: judge scores rank; they never approve." };
  fs.writeFileSync(path.join(packageRoot, outDir, "selection-summary.json"), JSON.stringify(totals, null, 1));
  process.stdout.write(`\n${JSON.stringify(totals, null, 2)}\n`);
}

main().catch((error) => { console.error(error.message); process.exit(1); });
