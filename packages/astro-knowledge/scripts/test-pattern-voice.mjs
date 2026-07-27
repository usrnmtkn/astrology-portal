// Pattern voice gate: renders every real aspect-pattern fixture through the
// production v3 resolver (unknown-time as shipped, plus a house-injected
// known-time variant for coverage) and scores each card.
//   - Mechanical linter (scripts/lint-pattern-voice.js) ALWAYS runs; any lint
//     fail fails the suite.
//   - LLM judge (scripts/judge-pattern-voice.js) runs only when a model key is
//     present (OPENAI_API_KEY / ANTHROPIC_API_KEY); a median score of 1 fails.
// Wired as `npm run test:pattern-voice`; belongs in the aspect-pattern suite.
import { createRequire } from "node:module";
import process from "node:process";
const require = createRequire(import.meta.url);

const eng = require("../engine/aspect-patterns/index.js");
const { resolveAspectPatternV3Copy } = require("../engine/aspect-patterns/v3-copy-resolver.js");
const real = require("../engine/aspect-patterns/fixtures/real/index.js");
const examples = require("../voice/tldr-astro/pattern-examples.json");
const { generationConfig } = require("./generate-sky-aspect-cards.js");
const { lintPatternCard } = require("./lint-pattern-voice.js");
const judgeMod = require("./judge-pattern-voice.js");
const { detectPatterns, rankAspectPatterns, buildAspectPatternInterpretationContexts } = eng;

const MODEL_CONFIG = generationConfig();
const HAS_KEY = Boolean(MODEL_CONFIG.apiKey);
const rc = (f) => ({ planets: f.input.planets, ...(f.input.angles ?? {}) });

function contexts(f) {
  const det = detectPatterns({ planets: f.input.planets, aspects: f.input.aspects });
  const ranked = { ...det, ranking: rankAspectPatterns(det, rc(f)) };
  return buildAspectPatternInterpretationContexts(ranked, rc(f));
}

// Give an unknown-time context distinct houses + a housed derived point, so the
// known-time (full-section) path is exercised too. Synthetic but structurally
// faithful to what production supplies.
function withHouses(ctx) {
  const c = JSON.parse(JSON.stringify(ctx));
  const used = new Set(); let h = 1;
  const next = () => { while (used.has(h)) h++; used.add(h); return h; };
  for (const m of c.members) { m.house = next(); m.longitude = m.longitude ?? 0; }
  const apex = c.roles?.apex; const am = c.members.find((m) => m.planet === apex);
  const oppHouse = am ? ((am.house + 6 - 1) % 12) + 1 : 9;
  const point = (pt) => { if (pt && typeof pt === "object") { if (!pt.sign) pt.sign = "Sagittarius"; if (!Number.isInteger(pt.house)) pt.house = oppHouse; } };
  point(c.roles?.falloutPoint); point(c.roles?.emptyLeg);
  if (Array.isArray(c.derivedPoints)) for (const d of c.derivedPoints) { if (!d.sign) d.sign = "Sagittarius"; if (!Number.isInteger(d.house)) d.house = oppHouse; }
  c.geometry.confidence = "exact"; c.geometry.maximumOrb = 1.4;
  return c;
}

const FIX = ["grand-trine-a", "yod-wide-a", "kite-a", "mystic-rectangle-a", "grand-square-a", "isolated-t-square-a"];

const cards = [];
for (const key of FIX) {
  const f = real[key]; if (!f) continue;
  const base = contexts(f);
  if (!base.length) continue;
  const variants = [["unknown-time", base[0]]];
  try { variants.push(["known-time", withHouses(base[0])]); } catch { /* skip */ }
  for (const [variant, ctx] of variants) {
    let card;
    try { card = resolveAspectPatternV3Copy(ctx); }
    catch (e) { cards.push({ key, variant, error: e.message }); continue; }
    cards.push({ key, variant, ctx, content: card.content });
  }
}

const oldSprawl = {
  overview: "Your Venus and Moon keep an easy rhythm, while Saturn keeps changing the answer.",
  sections: [
    { id: "feel", body: "You feel the sextile working until Saturn becomes the apex that needs another response." },
    { id: "shows_up", body: "You notice the same question returning after the first answer." },
    { id: "complicated", body: "You adjust, then discover the original question is still present." },
    { id: "another_response", body: "You look toward the balancing direction opposite Saturn." },
    { id: "level_2", body: "A Yod joins a sextile to an apex through two 150-degree angles." },
    { id: "how_it_works", body: "Venus and Moon keep adjusting to Saturn." },
    { id: "planet_roles", body: "Saturn is the apex, the point everything accommodates." },
    { id: "watch_for", body: "You watch for the question returning." },
    { id: "reference_point", body: "Opposite Saturn is the balancing direction." },
    { id: "confidence_note", body: "Clear. The widest link is 1.4 degrees." }
  ]
};
const teeth = lintPatternCard(oldSprawl);
const teethTerms = new Set(teeth.findings.filter((finding) => finding.severity === "fail").map((finding) => finding.term));
const requiredTeeth = [
  "geometry-in-L1:feel",
  "over-sectioned",
  "duplicate-beat:another_response+reference_point",
  "duplicate-beat:another_response+planet_roles"
];
if (teeth.score !== 1 || teeth.fails !== 4 || requiredTeeth.some((term) => !teethTerms.has(term))) {
  console.error("TEETH CHECK: FAIL", JSON.stringify(teeth, null, 2));
  process.exit(1);
}

let lintFails = 0, judgeFails = 0, resolveErrors = 0;
console.log(`Pattern voice gate  (LLM judge: ${HAS_KEY ? `ON - ${MODEL_CONFIG.provider}/${MODEL_CONFIG.model}` : "OFF - no model key"})`);
console.log(`TEETH CHECK: PASS (old 11-block shape lint ${teeth.score}, ${teeth.fails} structural fails)\n`);

async function run() {
  for (const exemplar of examples.filter((example) => example.canonical)) {
    if (!exemplar.content?.overview || !Array.isArray(exemplar.content?.sections)) {
      throw new Error(`Pattern gold ${exemplar.sourceId} must use structured content.`);
    }
    const serialized = judgeMod.serializePatternCard(exemplar.content);
    if (!serialized.includes("[LEVEL 1: OVERVIEW]") || !serialized.includes("[LEVEL 2:")) {
      throw new Error(`Pattern gold ${exemplar.sourceId} is missing explicit judge boundaries.`);
    }
    const exact = await judgeMod.judgeCard(exemplar.content, {
      patternType: exemplar.pattern,
      tier: exemplar.tier,
      judgeFn: async () => {
        throw new Error("Exact canonical gold must not require a stochastic judge call.");
      }
    });
    if (exact.score !== 3 || exact.exactGold !== true) {
      throw new Error(`Pattern gold ${exemplar.sourceId} did not receive its deterministic score 3.`);
    }
  }

  if (HAS_KEY) {
    for (const exemplar of examples.filter((example) => example.canonical)) {
      const verdict = await judgeMod.judgeCard(exemplar.content, {
        patternType: exemplar.pattern,
        tier: exemplar.tier,
        samples: 3
      });
      console.log(`${verdict.score === 3 ? "OK " : "!! "} gold judge ${verdict.score} (${verdict.gate})  ${exemplar.sourceId}`);
      if (verdict.score !== 3) {
        judgeFails++;
        console.log(`   GOLD JUDGE FAIL: ${verdict.why} | weakest: ${verdict.weakest || ""}`);
      }
    }
    console.log("");
  }
  for (const c of cards) {
    if (c.error) { resolveErrors++; console.log(`ERROR  ${c.key} [${c.variant}] resolve: ${c.error}`); continue; }
    const lint = lintPatternCard(c.content);
    const lf = lint.findings.filter((x) => x.severity === "fail");
    if (lf.length) { lintFails++; for (const f of lf) console.log(`   LINT FAIL ${f.source}:${f.term} ${f.match || ""}`); }
    let jline = "";
    if (HAS_KEY) {
      try {
        const v = await judgeMod.judgeCard(c.content, { apexPlanet: c.ctx.roles?.apex, focalPlanet: c.ctx.roles?.focalPlanet, patternType: c.ctx.patternType, samples: 3 });
        jline = `  judge ${v.score} (${v.gate})`;
        if (v.score === 1) {
          judgeFails++;
          console.log(`   JUDGE FAIL ${c.key} [${c.variant}]: ${v.why} | weakest: ${v.weakest || ""}`);
        } else if (v.score === 2) {
          console.log(`   JUDGE REVIEW ${c.key} [${c.variant}]: ${v.why} | weakest: ${v.weakest || ""}`);
        }
      } catch (e) {
        judgeFails++;
        jline = `  judge ERROR ${e.message}`;
      }
    }
    console.log(`${lint.score === 3 && !jline.includes("judge 1") ? "OK " : "!! "} lint ${lint.score} (fails ${lint.fails}, warns ${lint.warns})  ${c.key} [${c.variant}] :: ${c.content.eyebrow}${jline}`);
  }
  console.log(`\ncards: ${cards.length}  lintFails: ${lintFails}  judgeFails: ${judgeFails}  resolveErrors: ${resolveErrors}`);
  if (lintFails || judgeFails || resolveErrors) { console.log("PATTERN VOICE GATE: FAIL"); process.exit(1); }
  console.log("PATTERN VOICE GATE: PASS");
}
run();
