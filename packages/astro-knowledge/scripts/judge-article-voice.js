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
// The spec (checks, planet-specific article structure, calibration set) lives in
// voice/tldr-astro/sky-article-longform.json. The linter still runs first
// for the mechanical floor (lexicon + trade vocabulary); this judge covers
// what a regex cannot: empathy-first opening, direct lived register, Maybe-lists,
// the teaching correction, the benediction close, and whether the article
// uses its own planet's structural family.
//
// The judge is advisory: even a 3 requires human approval. Live calls are
// explicitly authorized and audited by editorial-judge-runtime.js.
//
//   node scripts/judge-article-voice.js --dry-run ./path/to/article.md --planet uranus

const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const readJson = (p) => JSON.parse(fs.readFileSync(p, "utf8"));
const spec = readJson(path.join(root, "voice", "tldr-astro", "sky-article-longform.json"));
const { buildReferenceFactContext } = require("./reference-fact-bank.js");
const { judgePolicyLines: ownerWarmthJudgePolicyLines } = require("./owner-corpus-warmth-policy.js");
const { plainLanguageJudgeLines } = require("./plain-language-defects.js");
const ARTICLE_PROMPT_VERSION = "sky-article-longform-v6:prompt-v3-plain-language";

function furnitureFor(planet) {
  const key = String(planet || "").toLowerCase();
  if (spec.perPlanetFurniture[key]) return spec.perPlanetFurniture[key];
  for (const [k, v] of Object.entries(spec.perPlanetFurniture)) {
    if (k.split("|").includes(key)) return v;
  }
  return "";
}

function buildJudgePrompt(articleText, options = {}) {
  const { planet = "", edition = "", ownerVerbatim = false } = options;
  const furniture = furnitureFor(planet);
  const judged = spec.checks.filter((c) => c.id !== "lint-clean" && c.judge !== false);
  const referenceFactContext = buildReferenceFactContext(articleText);
  return [
    `You are the editor for Marie Satori, an astrologer. You are strict. Most drafts are "borderline" until proven otherwise.`,
    ``,
    `You are scoring a LONG-FORM sky placement article${planet ? ` (${planet}${edition ? `, ${edition}` : ""})` : ""}. Template slots in double braces ({{entryDate}}, {{aspectHits...}}) are filled by the app; do not penalize their presence, but do judge the prose around them.`,
    ownerVerbatim
      ? `OWNER-VERBATIM PROVENANCE: This is owner-published text. Apply the spec's exemption only to recognizability and mechanical adjacent-voice tic matches; judge every other voice check normally and do not assign a score from provenance alone.`
      : `OWNER-VERBATIM PROVENANCE: No exemption is asserted.`,
    ``,
    `The voice: ${spec.voiceDescription}`,
    ``,
    `Licensed on this surface (do NOT penalize): ${spec.licensedOnThisSurface.join("; ")}.`,
    furniture ? `This planet's structural family (a menu across its corpus, not a checklist for every edition): ${furniture}` : ``,
    `Interpretation rules (mandatory):`,
    ...spec.judgeGuidance.map((rule) => `  - ${rule}`),
    ...plainLanguageJudgeLines().map((rule) => `  - ${rule}`),
    ...ownerWarmthJudgePolicyLines(options).map((rule) => `  - ${rule}`),
    referenceFactContext,
    ``,
    `Score 1-3 against these checks:`,
    ...judged.map((c, i) => `  ${i + 1}. [${c.id}] ${c.rule}`),
    ``,
    `  3 = ${spec.scores["3"]}`,
    `  2 = ${spec.scores["2"]}`,
    `  1 = ${spec.scores["1"]}`,
    ``,
    `ARTICLE TO SCORE:`,
    articleText,
    ``,
    `Verdict consistency is mandatory: score 3 uses verdict "in-voice" with empty failedChecks and evidence arrays; score 2 uses verdict "borderline" with one or two material failedChecks; score 1 uses verdict "off-voice" with at least one failed check. Every failedChecks value must be one of the bracketed check IDs above.`,
    `For every failed check, provide exactly one evidence object. Its checkId must match the failed check, its sentence must be copied verbatim from the article, its reason must explain the check-specific failure, and its rewrite must show a concrete repair. Do not cite an absent optional device as evidence.`,
    `For command-runs, evidence must quote an actual scolding, generic, or unsupported command sequence; absence can never fail. For block-shape, quote a representative horoscope-block sentence and identify the specific missing or generic life-area, lived-pattern, or usable-movement function. For direct-lived-register, quote prose that remains institutional or abstraction-only in context; polished or lyrical prose is not evidence by itself.`,
    `Return ONLY strict JSON: {"score":1|2|3,"verdict":"in-voice"|"borderline"|"off-voice","why":"one concise overall reason","failedChecks":["check-id"],"evidence":[{"checkId":"check-id","sentence":"exact sentence copied from article","reason":"specific check-based reason","rewrite":"concrete repair"}]}`,
  ].filter(Boolean).join("\n");
}

const { editorialGate } = require("./editorial-judge-policy.js");
const { runJudgeSamples } = require("./editorial-judge-runtime.js");
const JUDGE_TEMPERATURE = 0.1;

function normalized(value) {
  return String(value || "")
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function parseVerdict(raw, articleText = "") {
  const m = String(raw).match(/\{[\s\S]*\}/);
  if (!m) {
    return {
      score: 1,
      verdict: "off-voice",
      failedChecks: [],
      evidence: [],
      why: "judge did not return JSON",
      contractViolation: true,
      contractIssues: ["missing-json"]
    };
  }
  let parsed;
  try {
    parsed = JSON.parse(m[0]);
  } catch {
    return {
      score: 1,
      verdict: "off-voice",
      failedChecks: [],
      evidence: [],
      why: "unparseable judge output",
      contractViolation: true,
      contractIssues: ["unparseable-json"]
    };
  }

  const score = Number(parsed.score);
  const failedChecks = Array.isArray(parsed.failedChecks) ? parsed.failedChecks.map(String) : [];
  const evidence = Array.isArray(parsed.evidence) ? parsed.evidence : [];
  const allowedChecks = new Set(spec.checks.filter((entry) => entry.judge !== false && entry.id !== "lint-clean").map((entry) => entry.id));
  const expectedVerdict = { 1: "off-voice", 2: "borderline", 3: "in-voice" }[score];
  const issues = [];
  if (!expectedVerdict) issues.push("invalid-score");
  if (expectedVerdict && parsed.verdict !== expectedVerdict) issues.push("score-verdict-mismatch");
  if (!Array.isArray(parsed.failedChecks)) issues.push("failed-checks-not-array");
  if (!Array.isArray(parsed.evidence)) issues.push("evidence-not-array");
  if (new Set(failedChecks).size !== failedChecks.length) issues.push("duplicate-failed-check");
  if (score === 3 && failedChecks.length !== 0) issues.push("score-3-has-failed-checks");
  if (score === 3 && evidence.length !== 0) issues.push("score-3-has-evidence");
  if (score === 2 && (failedChecks.length < 1 || failedChecks.length > 2)) issues.push("score-2-requires-one-or-two-failed-checks");
  if (score === 1 && failedChecks.length < 1) issues.push("score-1-requires-failed-check");
  if (failedChecks.some((id) => !allowedChecks.has(id))) issues.push("unknown-failed-check");
  const evidenceIds = evidence.map((item) => String(item?.checkId || ""));
  if (new Set(evidenceIds).size !== evidenceIds.length) issues.push("duplicate-evidence-check");
  if (evidence.length !== failedChecks.length) issues.push("one-evidence-item-required-per-failed-check");
  if (JSON.stringify([...new Set(evidenceIds)].sort()) !== JSON.stringify([...new Set(failedChecks)].sort())) {
    issues.push("evidence-ids-do-not-match-failed-checks");
  }
  const article = normalized(articleText);
  for (const item of evidence) {
    const checkId = String(item?.checkId || "");
    const sentence = normalized(item?.sentence);
    const reason = String(item?.reason || "").trim();
    const rewrite = String(item?.rewrite || "").trim();
    if (!sentence || sentence.length > 600 || (article && !article.includes(sentence))) {
      issues.push(`evidence-sentence-not-in-article:${checkId || "missing"}`);
    }
    if (!reason || reason.length > 500) issues.push(`missing-or-nonconcise-evidence-reason:${checkId || "missing"}`);
    if (!rewrite || rewrite.length > 600) issues.push(`missing-or-nonconcise-evidence-rewrite:${checkId || "missing"}`);
  }
  const why = String(parsed.why || "").trim();
  if (!why || why.length > 500) issues.push("missing-or-nonconcise-overall-reason");
  return {
    ...parsed,
    why,
    failedChecks,
    evidence,
    weakest: evidence.map((item) => String(item?.sentence || "")),
    rewrites: evidence.map((item) => String(item?.rewrite || "")),
    contractViolation: issues.length > 0,
    contractIssues: issues
  };
}

// samples > 1 -> median score (self-consistency); calibration uses 5, production 1.
async function judgeLongformArticle(articleText, opts = {}) {
  const prompt = buildJudgePrompt(articleText, opts);
  const result = await runJudgeSamples({
    content: articleText,
    prompt,
    rubric: JSON.stringify(spec),
    promptVersion: ARTICLE_PROMPT_VERSION,
    rubricVersion: spec.id || "sky-article-longform-v6",
    samples: opts.samples,
    temperature: JUDGE_TEMPERATURE,
    judgeFn: opts.judgeFn,
    parseVerdict: (raw) => parseVerdict(raw, articleText),
    context: {
      surface: "sky-article-longform",
      planet: opts.planet || "",
      edition: opts.edition || "",
      ownerVerbatim: Boolean(opts.ownerVerbatim)
    },
    calibration: Boolean(opts.calibration)
  });
  return { ...result, ...editorialGate(result) };
}

module.exports = { ARTICLE_PROMPT_VERSION, buildJudgePrompt, judgeLongformArticle, parseVerdict, furnitureFor };

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
