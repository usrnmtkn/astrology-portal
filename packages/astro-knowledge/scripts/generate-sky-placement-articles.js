#!/usr/bin/env node
//
// Generate-then-lint harness for sky placement (planet-in-sign) articles.
//
// This does NOT invent astrology. It assembles a generation prompt from:
//   - source meaning: data/placements/sign/{planet}-{sign}.json (10 classical
//     planets), falling back to the V3 raw placement source rows
//     (fallback-source/placement/{planet}/{sign}/raw) for Chiron and the Nodes
//   - the three-beat template + voice contract in voice/tldr-astro/sky-placement.json
//   - the 7 owner-approved calibration trios embedded there as few-shot exemplars
// then gates the model's JSON output ({hook, lived, turn}) through
// scripts/lint-placement-voice.js, retrying on failures, with an opt-in
// LLM-as-judge second gate (scripts/judge-placement-voice.js).
//
// The model call reuses generate() from generate-sky-aspect-cards.js, so it
// uses the same provider/model/key environment as the aspect pipeline
// (CONTENT_GENERATION_PROVIDER_SKY_PLACEMENT overrides the surface).
//
//   node scripts/generate-sky-placement-articles.js --dry-run mars scorpio
//   node scripts/generate-sky-placement-articles.js --run     mars scorpio      (needs key)
//   node scripts/generate-sky-placement-articles.js --grid                      (coverage report)

const fs = require("fs");
const path = require("path");
const { lintArticle, SLOTS } = require("./lint-placement-voice.js");
const { generate } = require("./generate-sky-aspect-cards.js");
const { buildOwnerVocabularyPrompt } = require("./owner-vocabulary-prompt.js");

const root = path.join(__dirname, "..");
const repoRoot = path.resolve(root, "..", "..");
const readJson = (p) => JSON.parse(fs.readFileSync(p, "utf8"));
const spec = readJson(path.join(root, "voice", "tldr-astro", "sky-placement.json"));
const pointSignColors = readJson(path.join(root, "voice", "tldr-astro", "sign-colors-v2-points.json"));

const SIGNS = ["aries", "taurus", "gemini", "cancer", "leo", "virgo", "libra", "scorpio", "sagittarius", "capricorn", "aquarius", "pisces"];
const PLANETS = ["sun", "moon", "mercury", "venus", "mars", "jupiter", "saturn", "uranus", "neptune", "pluto", "chiron", "north-node", "south-node", "lilith"];
const TITLE = {
  sun: "the Sun", moon: "the Moon", mercury: "Mercury", venus: "Venus", mars: "Mars",
  jupiter: "Jupiter", saturn: "Saturn", uranus: "Uranus", neptune: "Neptune", pluto: "Pluto",
  chiron: "Chiron", "north-node": "the North Node", "south-node": "the South Node", lilith: "Lilith"
};
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);

const TIER_OF = {};
for (const [tier, members] of Object.entries(spec.planetTierRegister.tiers)) {
  for (const m of members) TIER_OF[m] = tier;
}

class SourceGapError extends Error {
  constructor(code, message, details = {}) {
    super(message);
    this.name = "SourceGapError";
    this.code = code;
    this.details = details;
  }
}

function normalizeToken(value) {
  return String(value ?? "").trim().toLowerCase().replace(/[\s_]+/g, "-");
}

// The V3 source rows, loaded lazily and indexed by content key. Read-only:
// this file belongs to the V3 package; the engine only consumes it.
let v3RawIndex = null;
let v3ContentIndex = null;
function loadV3Indexes() {
  if (v3ContentIndex) return;
  const p = path.join(repoRoot, "apps", "web", "src", "content", "fallbackArchitectureV3", "source-rows", "fallback-source-rows-v3.json");
  v3RawIndex = new Map();
  v3ContentIndex = new Map();
  if (!fs.existsSync(p)) return;

  const sourceRows = readJson(p);
  for (const row of [
    ...(sourceRows.vocabularyRows || []),
    ...(sourceRows.fallbackSourceRows || []),
    ...(sourceRows.hookRows || [])
  ]) {
    const contentKey = String(row.contentKey || "");
    if (contentKey) v3ContentIndex.set(contentKey, row);
    const match = contentKey.match(/^fallback-source\/placement\/([a-z-]+)\/([a-z-]+)\/raw$/);
    if (match) v3RawIndex.set(`${match[1]}/${match[2]}`, row);
  }
}

function v3Raw(planet, sign) {
  loadV3Indexes();
  return v3RawIndex.get(`${planet}/${sign}`) || null;
}

function v3Text(contentKey) {
  loadV3Indexes();
  const row = v3ContentIndex.get(contentKey);
  return row?.body ?? row?.body_you ?? null;
}

function authoringPairColor(planet, sign) {
  const reviewed = pointSignColors.status === "approved"
    ? pointSignColors.entries?.[`${planet}.${sign}`]
    : null;
  if (!reviewed) return null;

  const withoutLegacyFrame = String(reviewed)
    .replace(/^Right now (?:it|she) is in [A-Za-z]+, so\s+/u, "")
    .replace(/\bthis season\b/giu, "during this transit")
    .trim();

  return withoutLegacyFrame
    ? withoutLegacyFrame.charAt(0).toUpperCase() + withoutLegacyFrame.slice(1)
    : null;
}

// Concise authoring layer assembled from existing approved V3 rows. This
// teaches the model what the planet does and how the sign changes its method;
// it is source material, never copy to paste verbatim into the article.
function loadAuthoringLayer(planet, sign) {
  const planetFunction = v3Text(`fallback-vocab/planet-function/${planet}`)
    ?? v3Text(`fallback-vocab/planet-core/${planet}`);
  const planetUseful = v3Text(`fallback-vocab/planet-productive/${planet}`);
  const planetDistortion = v3Text(`fallback-vocab/planet-excess/${planet}`);
  const signMethod = v3Text(`fallback-vocab/sign-style/${sign}`);
  const signBehavior = v3Text(`fallback-vocab/sign-does/${sign}`);
  const signNeed = v3Text(`fallback-vocab/sign-need/${sign}`);
  const signDistortion = v3Text(`fallback-hook/sky-sign-trap/${sign}`);
  const pairColor = authoringPairColor(planet, sign);
  const fields = {
    planetFunction,
    planetUseful,
    planetDistortion,
    signMethod,
    signBehavior,
    signNeed,
    signDistortion
  };

  if (Object.values(fields).some((value) => !value)) {
    throw new SourceGapError(
      "missing-authoring-layer",
      `The planet/sign meaning layer is incomplete for ${planet} in ${sign}.`,
      { planet, sign, missing: Object.entries(fields).filter(([, value]) => !value).map(([key]) => key) }
    );
  }

  return { ...fields, pairColor };
}

// source meaning for a placement: data/placements/sign first, V3 raw second.
function loadMeaning(planet, sign) {
  const p = path.join(root, "data", "placements", "sign", `${planet}-${sign}.json`);
  if (fs.existsSync(p)) {
    const value = readJson(p);
    return {
      kind: "placements-sign",
      source: path.relative(root, p).replaceAll(path.sep, "/"),
      tldr: value.tldr, body: value.body, gift: value.gift, challenge: value.challenge
    };
  }
  const raw = v3Raw(planet, sign);
  if (raw) {
    return {
      kind: "v3-raw",
      source: `fallback-source-rows-v3.json#${raw.contentKey}`,
      tldr: null, body: raw.body, gift: null, challenge: null,
      note: "raw extraction; treat as the meaning boundary, phrase everything as behavior"
    };
  }
  return null;
}

function normalizeArgs({ planet, sign }) {
  const p = normalizeToken(planet);
  const s = normalizeToken(sign);
  if (!PLANETS.includes(p)) {
    throw new SourceGapError("invalid-planet", `Unknown placement planet '${planet}'.`, { planet: p });
  }
  if (!SIGNS.includes(s)) {
    throw new SourceGapError("invalid-sign", `Unknown zodiac sign '${sign}'.`, { sign: s });
  }
  const meaning = loadMeaning(p, s);
  if (!meaning) {
    throw new SourceGapError(
      "missing-source",
      `No approved placement meaning exists for ${p} in ${s}; author the source before generation.`,
      { planet: p, sign: s }
    );
  }
  return {
    planet: p,
    sign: s,
    meaning,
    authoringLayer: loadAuthoringLayer(p, s),
    tier: TIER_OF[p] || "social"
  };
}

// few-shot: two exemplar trios, preferring the SAME tier so the register is
// taught like-to-like, topped up from other tiers when the tier is thin.
function fewShot(tier, n = 2) {
  const all = spec.exemplars.filter((e) => e.canonical);
  const same = all.filter((e) => e.tier === tier);
  const pool = [...same, ...all.filter((e) => !same.includes(e))];
  return pool.slice(0, n);
}

const renderTrio = (e) => {
  const lines = [`HOOK: ${e.hook}`, `LIVED: ${e.lived}`, `TURN: ${e.turn}`];
  if (e.tagline) lines.unshift(`TAGLINE: ${e.tagline}`);
  if (Array.isArray(e.moves)) lines.push(`MOVES: ${e.moves.join(" / ")}`);
  return lines.join("\n");
};

// Canonical exemplars now teach complete five-slot articles. These marked shape
// illustrations remain supplemental reminders, not substitutes for gold copy.
function extendedShapeExamples() {
  const byBeat = Object.fromEntries((spec.shape.extendedSlots || []).map((s) => [s.beat, s.shapeExamples || []]));
  return [
    `TAGLINE shape examples (shape only, do not copy): ${(byBeat.tagline || []).map((t) => `"${t}"`).join(", ")}`,
    `MOVES shape examples (shape only, do not copy): ${(byBeat.moves || []).map((t) => `"${t}"`).join(" | ")}`
  ];
}

function buildPrompt(args) {
  const { planet, sign, meaning, authoringLayer, tier } = normalizeArgs(args);
  const pace = spec.pace.labels[planet];
  const tierHint = spec.planetTierRegister.hints[tier];
  const failList = spec.outputBans.fail.map((x) => x.term).join(", ");
  const shots = fewShot(tier);

  return [
    `Write ONE sky placement article for ${TITLE[planet]} in ${cap(sign)} - the current-sky transit, read by everyone while it lasts.`,
    ``,
    `VOICE: ${spec.voiceDescription}`,
    `PERSON: ${spec.personNote}`,
    `REGISTER: this is a ${tier} placement - ${tierHint}. Pace: ${TITLE[planet]} spends ${pace} in a sign; the article must land that pace somewhere, usually in LIVED.`,
    buildOwnerVocabularyPrompt({ surface: "planet-article", maxCore: 14, maxShared: 10, maxAcShared: 8, maxSdAdditions: 6 }),
    ``,
    `SOURCE MEANING (the boundary - do not add claims beyond this):`,
    meaning.tldr ? `  tldr: ${meaning.tldr}` : null,
    `  meaning: ${meaning.body}`,
    meaning.gift ? `  gift: ${meaning.gift}` : null,
    meaning.challenge ? `  challenge: ${meaning.challenge}` : null,
    meaning.note ? `  note: ${meaning.note}` : null,
    ``,
    `PLANET + SIGN MEANING LAYER (source material, not display copy):`,
    `  what ${TITLE[planet]} does: ${authoringLayer.planetFunction}`,
    `  useful expression: ${authoringLayer.planetUseful}`,
    `  planet distortion: ${authoringLayer.planetDistortion}`,
    `  how ${cap(sign)} moves: ${authoringLayer.signMethod}`,
    `  recognizable behavior: ${authoringLayer.signBehavior}`,
    `  what the sign needs: ${authoringLayer.signNeed}`,
    `  sign distortion: ${authoringLayer.signDistortion}`,
    authoringLayer.pairColor ? `  reviewed pair color: ${authoringLayer.pairColor}` : null,
    `  Use this layer to explain the combination in fresh prose. Do not paste these fields as a keyword list.`,
    ``,
    `SHAPE - the article renders top to bottom as tagline, computed date range, then three beats, then moves. You write five slots:`,
    `  0. TAGLINE: ${spec.articleStructure.taglineRules}`,
    ...spec.shape.beats.map((b) => `  ${b.n}. ${b.beat.toUpperCase()}: ${b.does}`),
    `  4. MOVES: ${spec.articleStructure.movesRules}`,
    `  (The date range and any dated sky events during the transit are computed by the app and rendered separately - never write dates.)`,
    ``,
    `RULES:`,
    `  - Never use these words/phrases: ${failList}.`,
    `  - Do not use the word "steady" AT ALL - it burned five drafts in the last sweep. Use grounded, solid, sure, calm, or unhurried. Em dash is banned; use a spaced hyphen " - ".`,
    `  - ${spec.loreBoundary}`,
    `  - No absolute dates, degrees, or ephemeris facts; the app appends the computed current-aspect line separately.`,
    `  - HOOK SENTENCE 1 is a standalone recognition quote. The reader renders it separately in bold and removes it from the body. It must make sense on its own.`,
    `  - The rest of HOOK is the meaning paragraph: explain what ${TITLE[planet]} governs and how ${cap(sign)} changes its method, pace, or priorities. Translate the source layer into natural prose and behavior; never recite a keyword list.`,
    ``,
    `ANTI-PATTERNS (why weak drafts fail - avoid every one):`,
    `  - THE SWAP TEST: if this article could have another planet or sign swapped in without sounding wrong, it is not specific enough. Every beat must only make sense for ${TITLE[planet]} in ${cap(sign)}.`,
    `  - The turn ends on the line with the most bite. Nothing after it: no blessing, no "wishing you", no motivational recap, no soft summary.`,
    `  - Do not stack closing aphorisms; one truth, one catch at most.`,
    `  - The shadow is observable behavior (what someone does), never an abstract warning.`,
    `  - No "the [sign] trap" framing, no "for everyone at once" wrapper, no coverage checklist. If a sentence exists only to satisfy coverage, cut it.`,
    `  - A directive is allowed only when it is specific ("Say what happened, say what you need"), never generic ("embrace the change").`,
    `  - SAMENESS IS THE ENEMY. The first batch failed because every card reached for the same objects and openers. Banned outright: "coffee order", "unsent", "overfilled calendar", "group chat", hooks starting "You catch yourself" or "You find yourself", and moves built on "Send the/one message". Invent evidence and moves that could ONLY belong to this placement. Vary the hook form: a claim, a scene, a question, an overheard line - not always second-person observation.`,
    ``,
    `IN-VOICE EXEMPLARS (match this register and shape, do not copy any phrasing):`,
    ...shots.map((e, i) => `  [${i + 1}] ${TITLE[e.planet]} in ${cap(e.sign)}\n${renderTrio(e).split("\n").map((l) => `      ${l}`).join("\n")}`),
    ...extendedShapeExamples().map((l) => `  ${l}`),
    ``,
    `OUT OF VOICE (a weak draft - do NOT write like this: lore-led, listy, kumbaya close, generic moves):`,
    `      TAGLINE: Embrace the ${sign} energy`,
    `      HOOK: ${cap(sign)} season is here! ${TITLE[planet]} enters the sign known for its unique qualities.`,
    `      LIVED: This transit brings themes of growth, transformation, and new opportunities for everyone at once.`,
    `      TURN: Watch out for the ${sign} trap of excess. Embrace the change and trust the process. Wishing you a beautiful transit.`,
    `      MOVES: Trust the process. / Step into your power. / Journal about your feelings.`,
    ``,
    `Return ONLY strict JSON: {"tagline": "...", "hook": "...", "lived": "...", "turn": "...", "moves": ["...", "..."]}`,
  ].filter((line) => line !== null).join("\n");
}

const cleanText = (v) => String(v)
  .trim()
  .replace(/\s*—\s*/g, " - ") // deterministic formatting, not a voice change
  .replace(/ {2,}/g, " ");

function parseArticle(raw) {
  const m = String(raw).match(/\{[\s\S]*\}/);
  if (!m) return null;
  try {
    const parsed = JSON.parse(m[0]);
    if (SLOTS.every((s) => typeof parsed[s] === "string" && parsed[s].trim())) {
      const article = {};
      for (const s of SLOTS) article[s] = cleanText(parsed[s]);
      // extended slots (CHANI structure). Required from the model; parse
      // stays lenient so injected legacy fixtures without them still work.
      if (typeof parsed.tagline === "string" && parsed.tagline.trim()) {
        article.tagline = cleanText(parsed.tagline).replace(/[.!?]+$/, "");
      }
      if (Array.isArray(parsed.moves)) {
        const moves = parsed.moves.map((x) => cleanText(x)).filter(Boolean);
        if (moves.length) article.moves = moves;
      }
      return article;
    }
  } catch { /* fall through */ }
  return null;
}

// the V3 hook rows this article materializes into: the three beats, plus
// tagline and moves when present (moves join as one line per move). Drafts,
// never approved here: review_status is set for the human/judge-gated queue.
function toHookRows({ planet, sign }, article, provenance = {}) {
  const row = (slot, body) => ({
    contentKey: `fallback-hook/sky-placement-${slot}/${planet}/${sign}`,
    content_role: "fallback_hook",
    grammar_frame: slot === "tagline" ? "fragment" : "complete_sentence",
    body_you: body,
    body_they: body,
    review_status: "needs_review",
    source_keys: [provenance.source || "sky-placement-generation-pipeline"],
    notes: `Generated by scripts/generate-sky-placement-articles.js (${provenance.model || "unwired"}); judge gate: ${provenance.gate || "not-run"}. Pair-authored copy overrides the generic planet fallback once approved.`
  });
  const rows = SLOTS.map((slot) => row(slot, article[slot]));
  if (article.tagline) rows.unshift(row("tagline", article.tagline));
  if (article.moves) rows.push(row("moves", article.moves.join("\n")));
  return rows;
}

async function generateArticle(args, {
  maxRetries = 3,
  generateFn = generate,
  withJudge = false,
  judgeFn,
  judgeFeedback
} = {}) {
  let normalized;
  try {
    normalized = normalizeArgs(args);
  } catch (error) {
    if (error instanceof SourceGapError) {
      return { status: "skipped", reason: error.code, note: error.message, facts: error.details };
    }
    throw error;
  }

  let prompt = buildPrompt(normalized);
  if (judgeFeedback) {
    prompt = `${prompt}\n\nThe previous draft reached the editorial judge but was rejected. Rewrite from scratch while fixing this feedback: ${judgeFeedback}`;
  }

  let lastAttempt = null;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    const raw = await generateFn(prompt);
    const article = parseArticle(raw);
    if (!article) {
      prompt = `${prompt}\n\nYour last reply was not the required strict JSON {"tagline": "...", "hook": "...", "lived": "...", "turn": "...", "moves": ["...", "..."]}. Return only that JSON.`;
      lastAttempt = { raw, article: null, lint: null };
      continue;
    }
    const lint = lintArticle({ ...article, planet: normalized.planet });
    lastAttempt = { raw, article, lint };
    if (lint.score === 3 && lint.fails === 0) {
      const result = {
        status: "clean",
        article,
        lint,
        attempts: attempt,
        facts: {
          planet: normalized.planet,
          sign: normalized.sign,
          tier: normalized.tier,
          meaningSource: normalized.meaning.source,
          meaningKind: normalized.meaning.kind,
          authoringLayer: "fallback-architecture-v3-approved-rows"
        }
      };
      if (withJudge) {
        const { judgeArticle } = require("./judge-placement-voice.js");
        result.judge = await judgeArticle(article, { tier: normalized.tier, planet: normalized.planet, sign: normalized.sign, judgeFn });
        result.gate = result.judge.gate; // human-review | regenerate (exact approved assets may auto-publish elsewhere)
      }
      result.rows = toHookRows(normalized, article, { source: normalized.meaning.source, gate: result.gate });
      return result;
    }
    const problems = lint.findings.map((f) => `${f.severity}: "${f.match || f.term}" (${f.reason || ""})`).join("; ");
    prompt = `${prompt}\n\nYour last attempt failed the voice check: ${problems}. Rewrite it fixing exactly those, keeping the meaning and the three beats. Return only the JSON.`;
  }
  return {
    status: "needs-review",
    note: "did not pass the linter within retries",
    attempts: maxRetries,
    article: lastAttempt?.article ?? null,
    lint: lastAttempt?.lint ?? null,
    facts: { planet: normalized.planet, sign: normalized.sign, tier: normalized.tier, meaningSource: normalized.meaning.source }
  };
}

// which of the 168 grid cells have source meaning, which are already authored
function gridReport() {
  const v3Path = path.join(repoRoot, "apps", "web", "src", "content", "fallbackArchitectureV3", "source-rows", "fallback-source-rows-v3.json");
  const authored = new Set();
  if (fs.existsSync(v3Path)) {
    for (const row of readJson(v3Path).hookRows || []) {
      const m = String(row.contentKey || "").match(/^fallback-hook\/sky-placement-hook\/([a-z-]+)\/([a-z-]+)$/);
      if (m && row.review_status === "approved") authored.add(`${m[1]}/${m[2]}`);
    }
  }
  const report = { authored: [], ready: [], missingSource: [] };
  for (const planet of PLANETS) {
    for (const sign of SIGNS) {
      const key = `${planet}/${sign}`;
      if (authored.has(key)) report.authored.push(key);
      else if (loadMeaning(planet, sign)) report.ready.push(key);
      else report.missingSource.push(key);
    }
  }
  return report;
}

// Batch runner: authors every un-authored, sourced cell. Resumable (skips
// cells with an existing draft file), judge-gated, never touches the 7
// approved trios or any V3 file - drafts land in out/sky-placement-drafts/
// as one JSON per cell plus a rolling summary. Merge into hookRows only
// after review (see CODEX-SKY-PLACEMENT-GENERATION-PIPELINE.md).
async function runBatch({ outDir, limit = Infinity, planets = null, generateFn, judgeFn, withJudge = true } = {}) {
  const dir = outDir || path.join(root, "out", "sky-placement-drafts");
  fs.mkdirSync(dir, { recursive: true });
  const grid = gridReport();
  const summary = { started: new Date().toISOString(), done: 0, autoPublish: 0, humanReview: 0, regenerate: 0, needsReview: 0, skipped: 0, failed: 0 };
  let todo = grid.ready.filter((key) => !fs.existsSync(path.join(dir, `${key.replace("/", "-")}.json`)));
  if (planets) todo = todo.filter((key) => planets.includes(key.split("/")[0]));

  for (const key of todo.slice(0, limit)) {
    const [planet, sign] = key.split("/");
    try {
      const result = await generateArticle({ planet, sign }, { withJudge, ...(generateFn ? { generateFn } : {}), ...(judgeFn ? { judgeFn } : {}) });
      fs.writeFileSync(path.join(dir, `${planet}-${sign}.json`), JSON.stringify(result, null, 2));
      summary.done++;
      if (result.status === "clean") {
        if (result.gate === "auto-publish") summary.autoPublish++;
        else if (result.gate === "regenerate") summary.regenerate++;
        else summary.humanReview++;
      } else if (result.status === "skipped") summary.skipped++;
      else summary.needsReview++;
      console.log(`${result.status === "clean" ? "OK " : "!! "} ${planet}/${sign}  status=${result.status}  gate=${result.gate || "-"}  attempts=${result.attempts || "-"}`);
    } catch (error) {
      summary.failed++;
      console.error(`ERR ${planet}/${sign}: ${error.message}`);
    }
    fs.writeFileSync(path.join(dir, "_summary.json"), JSON.stringify(summary, null, 2));
  }
  console.log(`\nbatch: ${summary.done} generated (${summary.autoPublish} auto-publish, ${summary.humanReview} human-review, ${summary.regenerate} judge-rejected), ${summary.needsReview} failed lint, ${summary.failed} errored. Drafts in ${dir}`);
  return summary;
}

module.exports = {
  PLANETS, SIGNS, TIER_OF, SourceGapError,
  normalizeArgs, buildPrompt, parseArticle, toHookRows, generateArticle, gridReport, runBatch
};

// ---- CLI ----
if (require.main === module) {
  const [mode, planet, sign] = process.argv.slice(2);
  if (mode === "--grid") {
    const r = gridReport();
    console.log(`authored (approved): ${r.authored.length}`);
    for (const k of r.authored) console.log(`  ${k}`);
    console.log(`ready to generate:   ${r.ready.length}`);
    console.log(`missing source:      ${r.missingSource.length}`);
    for (const k of r.missingSource) console.log(`  ${k}`);
  } else if (mode === "--dry-run" && planet && sign) {
    try {
      console.log(buildPrompt({ planet, sign }));
    } catch (error) {
      console.error(error instanceof Error ? error.message : error);
      process.exit(2);
    }
  } else if (mode === "--run" && planet && sign) {
    generateArticle({ planet, sign }, { withJudge: true })
      .then((r) => {
        console.log(JSON.stringify(r, null, 2));
        if (r.status !== "clean") process.exitCode = 2;
      })
      .catch((error) => {
        console.error(error instanceof Error ? error.message : error);
        process.exitCode = 1;
      });
  } else if (mode === "--batch") {
    // --batch [limit] [planet,planet,...]   e.g. --batch 24 sun,moon
    const limit = planet && /^\d+$/.test(planet) ? Number(planet) : Infinity;
    const planetsArg = (planet && !/^\d+$/.test(planet) ? planet : sign) || null;
    runBatch({ limit, planets: planetsArg ? planetsArg.split(",") : null })
      .catch((error) => {
        console.error(error instanceof Error ? error.message : error);
        process.exitCode = 1;
      });
  } else {
    console.error("usage: --dry-run <planet> <sign> | --run <planet> <sign> | --grid | --batch [limit] [planets]");
    process.exit(1);
  }
}
