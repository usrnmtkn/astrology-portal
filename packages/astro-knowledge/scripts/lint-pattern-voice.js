#!/usr/bin/env node
//
// Voice linter for the natal aspect-pattern reader (Yod, T-square, Grand Cross,
// Grand Trine, Kite, Mystic Rectangle). The mechanical half of the pattern
// voice gate; the LLM judge (scripts/judge-pattern-voice.js) covers whether it
// sounds human. Sibling of scripts/lint-sky-voice.js, but for the SECOND-person
// natal surface: 'you/your' is required, 'we/us/our' fails, and degrees/orb are
// ALLOWED in the mechanics level (they are the point of Level 2). What is not
// allowed is geometry leaking into the lived Level 1 paragraph.
//
// Reads the single source of truth in voice/:
//   - voice/banned-words.json            (meaning-level bans, also fail here)
//   - voice/banned-constructions.json    (banned contrast-reveal formulas)
//   - voice/tldr-astro/pattern-aspect.json (surface bans, warns, shape)
//
// Usage:  node scripts/lint-pattern-voice.js "<card body>"
//         node scripts/lint-pattern-voice.js --examples   (lint every pattern exemplar)
// Programmatic: lintPatternCard(cardOrText) where card = {overview, sections:[{id,body}]}

const fs = require("fs");
const path = require("path");

const voiceRoot = path.join(__dirname, "..", "voice");
const readJson = (p) => JSON.parse(fs.readFileSync(p, "utf8"));

const bannedWords = readJson(path.join(voiceRoot, "banned-words.json")).bannedWords || [];
const bannedConstructions = readJson(path.join(voiceRoot, "banned-constructions.json")).bannedConstructions || [];
const pat = readJson(path.join(voiceRoot, "tldr-astro", "pattern-aspect.json"));
const { findBannedConstructions } = require("./banned-construction-matcher.js");

const L1_BODY_IDS = ["feel", "shows_up", "complicated", "another_response"];

const META = /[\\^$.*+?()[\]{}|]/;
function toRegex(term) {
  if (term === "—") return /—/;
  if (META.test(term.replace(/ /g, ""))) return new RegExp(term, "i");
  return new RegExp(`\\b${term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i");
}

// Accepts a resolved card object ({overview, sections:[{id,body}]}) or a plain
// string. Returns {text, sections} where sections is [] for a bare string.
function normalizeCard(card) {
  if (typeof card === "string") return { text: card, sections: [], overview: "" };
  const overview = card.overview || card.content?.overview || "";
  const sections = card.sections || card.content?.sections || [];
  const text = [overview, ...sections.map((s) => s.body)].filter(Boolean).join("\n\n");
  return { text, sections, overview };
}

function normalizedSentences(value) {
  return (String(value || "").match(/[^.!?]+(?:[.!?]+|$)/g) || [])
    .map((sentence) => sentence
      .trim()
      .toLowerCase()
      .replace(/\s+/g, " ")
      .replace(/[.,;:!?]+$/g, "")
      .trim())
    .filter((sentence) => sentence.split(/\s+/).filter(Boolean).length >= 6);
}

function lintPatternCard(card) {
  const { text, sections, overview } = normalizeCard(card);
  const findings = [];

  // ---- reader-boundary: dates + editorial metadata leak (degrees/orb are OK here) ----
  const readerBoundaryChecks = [
    {
      term: "date",
      pattern: /\b(?:jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\s+\d{1,2}(?:st|nd|rd|th)?\b|\b20\d{2}\b|\b\d{4}-\d{2}-\d{2}\b/i,
      reason: "Natal patterns are timeless; no calendar dates in the body."
    },
    {
      term: "editorial metadata",
      pattern: /\b(?:provenance|linter|lint score|editorial status|draft status|review queue)\b/i,
      reason: "Reader copy must not expose provenance, linting, or editorial state."
    }
  ];
  for (const check of readerBoundaryChecks) {
    const m = text.match(check.pattern);
    if (m) findings.push({ severity: "fail", source: "reader-boundary", term: check.term, match: m[0], reason: check.reason });
  }

  // ---- register: second person required ----
  if (!/\byou(?:r|rs)?\b/i.test(text)) {
    findings.push({ severity: "fail", source: "reader-boundary", term: "second person", match: "", reason: "The natal pattern reader must address the reader in the second person (you/your)." });
  }

  // ---- meaning-level banned words (shared) are fails in output ----
  for (const b of bannedWords) {
    const term = typeof b === "string" ? b : b.term;
    if (!term) continue;
    const m = text.match(toRegex(term));
    if (m) findings.push({ severity: "fail", source: "banned-words", term, match: m[0] });
  }
  findings.push(...findBannedConstructions(text, bannedConstructions));
  // ---- surface fail + warn from pattern-aspect.json ----
  for (const b of pat.outputBans.fail) {
    const m = text.match(toRegex(b.term));
    if (m) findings.push({ severity: "fail", source: "pattern-aspect", term: b.term, match: m[0], reason: b.reason });
  }
  for (const b of pat.outputBans.warn) {
    const m = text.match(toRegex(b.term));
    if (m) findings.push({ severity: "warn", source: "pattern-aspect", term: b.term, match: m[0], reason: b.reason });
  }
  // ---- conditional bans (steady) ----
  for (const c of pat.conditionalBans || []) {
    const m = text.match(toRegex(c.term));
    if (m) {
      const before = text.slice(0, m.index).toLowerCase();
      const ok = (c.requiresBefore || []).some((w) => new RegExp(`\\b${w}\\b`, "i").test(before));
      if (!ok) findings.push({ severity: "fail", source: "pattern-aspect", term: c.term, match: m[0], reason: c.reason });
    }
  }

  // ---- geometry must not leak into Level 1 (overview + feel) ----
  const geomTerms = pat.geometryTermsForL1Check || [];
  const geomRe = new RegExp(`\\b(?:${geomTerms.map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})\\b`, "i");
  const l1Texts = [];
  if (overview) l1Texts.push(["overview", overview]);
  for (const s of sections) if (s.id === "feel") l1Texts.push(["feel", s.body]);
  for (const [id, body] of l1Texts) {
    const m = body.match(geomRe);
    if (m) findings.push({ severity: "fail", source: "shape", term: `geometry-in-L1:${id}`, match: m[0], reason: "Geometry belongs in Level 2; the lived paragraph must stay felt." });
  }

  // ---- no complete sentence may be repeated across lived Level 1 and mechanics Level 2 ----
  if (sections.length) {
    const levelOneBodies = [
      overview,
      ...sections.filter((section) => L1_BODY_IDS.includes(section.id)).map((section) => section.body)
    ];
    const levelTwoBodies = sections
      .filter((section) => !L1_BODY_IDS.includes(section.id) && section.id !== "confidence_note")
      .map((section) => section.body);
    const levelOneSentences = new Set(levelOneBodies.flatMap(normalizedSentences));
    const levelTwoSentences = new Set(levelTwoBodies.flatMap(normalizedSentences));
    const crossLevelDuplicates = [...levelOneSentences]
      .filter((sentence) => levelTwoSentences.has(sentence))
      .sort();

    for (const sentence of crossLevelDuplicates) {
      findings.push({
        severity: "fail",
        source: "shape",
        term: "cross-level-dup",
        match: sentence,
        reason: "A sentence is repeated across Level 1 and Level 2."
      });
    }
  }

  // ---- shape: over-sectioning + duplicate beats (needs structured sections) ----
  if (sections.length) {
    const ids = sections.map((s) => s.id);
    const l1Count = ids.filter((id) => L1_BODY_IDS.includes(id)).length;
    const maxLived = pat.shape?.maxLivedSections ?? 1;
    if (l1Count > maxLived) {
      findings.push({ severity: "fail", source: "shape", term: "over-sectioned", match: `${l1Count} L1 body sections`, reason: pat.shape?.maxLivedSectionsReason || "Level 1 should be one merged lived paragraph." });
    }
    for (const dup of pat.shape?.duplicateBeatBans || []) {
      if (dup.ids.every((id) => ids.includes(id))) {
        findings.push({ severity: "fail", source: "shape", term: `duplicate-beat:${dup.ids.join("+")}`, match: dup.ids.join(" & "), reason: dup.reason });
      }
    }
    if (!ids.includes("level_2")) findings.push({ severity: "warn", source: "shape", term: "missing-mechanics", match: "", reason: "no Level 2 mechanics section found" });
  }

  // ---- advisory register draw ----
  const useWords = [].concat(...Object.values(pat.useWords || {}).filter(Array.isArray));
  let registerDraw = 0;
  for (const w of useWords) {
    const re = / /.test(w) ? new RegExp(w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i") : new RegExp(`\\b${w}\\b`, "i");
    if (re.test(text)) registerDraw++;
  }

  // ---- advisory structural notes (do not lower score) ----
  const sentences = (text.match(/[^.!?]+[.!?]+/g) || []).map((s) => s.trim());
  const words = text.split(/\s+/).filter(Boolean);
  const notes = [];
  const avg = words.length / Math.max(sentences.length, 1);
  if (avg > 28) notes.push(`long average sentence (${avg.toFixed(0)} words)`);
  if (registerDraw === 0) notes.push("drew nothing from the approved phrase bank - check the register");

  const fails = findings.filter((f) => f.severity === "fail").length;
  const warns = findings.filter((f) => f.severity === "warn").length;
  let score = 3;
  if (warns >= 1) score = 2;
  if (fails >= 1) score = 1;
  return { score, fails, warns, registerDraw, findings, notes, sentences: sentences.length };
}

module.exports = { lintPatternCard };

if (require.main === module) {
  const arg = process.argv.slice(2).join(" ");
  if (arg === "--examples") {
    const examples = readJson(path.join(voiceRoot, "tldr-astro", "pattern-examples.json"));
    let bad = 0;
    for (const e of examples) {
      const r = lintPatternCard(e.content || e.body);
      if (r.fails) { bad++; for (const f of r.findings.filter((x) => x.severity === "fail")) console.log(`     FAIL ${f.source}:${f.term} ${f.match || ""}`); }
      console.log(`${r.score === 3 ? "OK " : "!! "} score ${r.score} (fails ${r.fails}, warns ${r.warns})  ${e.sourceId}`);
    }
    process.exit(bad ? 1 : 0);
  } else if (arg) {
    console.log(JSON.stringify(lintPatternCard(arg), null, 2));
  } else {
    console.error('pass a card body, or --examples');
    process.exit(1);
  }
}
