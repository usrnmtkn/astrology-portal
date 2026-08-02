#!/usr/bin/env node
//
// Voice linter for sky placement (planet-in-sign) articles.
// Mirrors scripts/lint-sky-voice.js for the placement surface. Reads:
//   - voice/banned-words.json               (meaning-level bans, also fail here)
//   - voice/banned-constructions.json       (banned contrast-reveal formulas)
//   - voice/tldr-astro/sky-placement.json   (output bans, three-beat shape, pace)
//
// An article is the three slots { hook, lived, turn }. Scores 1-3:
// fails -> 1, warns -> 2, clean -> 3. Structural checks that the spec states
// as ranges (sentence counts, pace mention) are advisory NOTES, not score
// hits, because the approved exemplars themselves vary; the judge covers taste.
//
// Usage:
//   node scripts/lint-placement-voice.js '{"hook":"...","lived":"...","turn":"..."}'
//   node scripts/lint-placement-voice.js --exemplars    (lint every embedded exemplar)

const fs = require("fs");
const path = require("path");

const voiceRoot = path.join(__dirname, "..", "voice");
const readJson = (p) => JSON.parse(fs.readFileSync(p, "utf8"));

const bannedWords = readJson(path.join(voiceRoot, "banned-words.json")).bannedWords || [];
const bannedConstructions = readJson(path.join(voiceRoot, "banned-constructions.json")).bannedConstructions || [];
const spec = readJson(path.join(voiceRoot, "tldr-astro", "sky-placement.json"));
const { findBannedConstructions } = require("./banned-construction-matcher.js");

const META = /[\\^$.*+?()[\]{}|]/;
function toRegex(term) {
  if (term === "—") return /—/;
  if (META.test(term.replace(/ /g, ""))) return new RegExp(term, "i");
  return new RegExp(`\\b${term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i");
}

const SLOTS = ["hook", "lived", "turn"];
// CHANI-modeled extended slots (2026-07-27). Optional: the 7 approved trios
// predate them, so they lint only when present. The engine always emits them.
const EXTENDED_SLOTS = ["tagline", "moves"];
const sentencesOf = (text) => (String(text).match(/[^.!?]+[.!?]+/g) || []).map((s) => s.trim());

// { hook, lived, turn, tagline?, moves?, planet?, sign?, allowLegacySecondPerson? }
// -> { score, fails, warns, findings, notes }
function lintArticle(article) {
  const findings = [];
  const notes = [];
  const slots = {};
  for (const slot of SLOTS) slots[slot] = String(article?.[slot] ?? "").trim();
  const tagline = article?.tagline != null ? String(article.tagline).trim() : null;
  const moves = Array.isArray(article?.moves) ? article.moves.map((m) => String(m).trim()).filter(Boolean) : null;
  const full = [
    ...SLOTS.map((s) => slots[s]),
    tagline ?? "",
    ...(moves ?? [])
  ].filter(Boolean).join("\n\n");
  const planet = article?.planet ? String(article.planet).toLowerCase() : null;

  // Current Sky is collective. Historical owner-approved calibration copy is
  // preserved verbatim and may opt into the legacy perspective while it is
  // being linted, but newly generated or reviewed copy may not use second
  // person. Transit-to-natal copy belongs to a different surface and linter.
  if (!article?.allowLegacySecondPerson) {
    const secondPerson = full.match(/\b(?:you|your|yours|yourself|you(?:'|’)?re|you(?:'|’)?ve|you(?:'|’)?ll|you(?:'|’)?d)\b/i);
    if (secondPerson) {
      findings.push({
        severity: "fail",
        source: "current-sky-person",
        term: "second-person",
        match: secondPerson[0],
        reason: "Current Sky placement copy is collective; second person belongs to transit-to-natal copy"
      });
    }
  }

  // -- missing slots are hard fails: the renderer needs all three.
  for (const slot of SLOTS) {
    if (!slots[slot]) {
      findings.push({ severity: "fail", source: "shape", slot, term: "missing-slot", reason: `the ${slot} slot is empty` });
    }
  }

  // -- reader boundary: no dates/degrees (the computed aspect line owns timing
  //    facts), no editorial metadata leaking into copy.
  const boundary = [
    { term: "degree/orb mechanics", pattern: /\b(?:orb|degrees?)\b|°/i, reason: "degrees and orb mechanics never appear in the article body" },
    { term: "date", pattern: /\b(?:jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\s+\d{1,2}(?:st|nd|rd|th)?\b|\b20\d{2}\b|\b\d{4}-\d{2}-\d{2}\b/i, reason: "absolute dates belong to the computed current-aspect line, not the evergreen article" },
    { term: "editorial metadata", pattern: /\b(?:provenance|linter|lint score|editorial status|draft status|review queue)\b/i, reason: "reader copy must not expose editorial state" }
  ];
  for (const check of boundary) {
    const m = full.match(check.pattern);
    if (m) findings.push({ severity: "fail", source: "reader-boundary", term: check.term, match: m[0], reason: check.reason });
  }

  // -- meaning-level banned words are fails in output too
  for (const b of bannedWords) {
    const term = typeof b === "string" ? b : b.term;
    if (!term) continue;
    const m = full.match(toRegex(term));
    if (m) findings.push({ severity: "fail", source: "banned-words", term, match: m[0] });
  }

  findings.push(...findBannedConstructions(full, bannedConstructions));

  // -- surface bans from sky-placement.json
  for (const b of spec.outputBans.fail) {
    if (article?.allowLegacySecondPerson && b.term === "\\bperform(ance|ing|s|ed)?\\b") continue;
    const m = full.match(toRegex(b.term));
    if (m) findings.push({ severity: "fail", source: "sky-placement", term: b.term, match: m[0], reason: b.reason });
  }
  for (const b of spec.outputBans.warn) {
    const m = full.match(toRegex(b.term));
    if (m) findings.push({ severity: "warn", source: "sky-placement", term: b.term, match: m[0], reason: b.reason });
  }

  // -- conditional bans (term allowed only if a qualifier appears before it)
  for (const c of spec.conditionalBans || []) {
    const m = full.match(toRegex(c.term));
    if (m) {
      const before = full.slice(0, m.index).toLowerCase();
      const ok = (c.requiresBefore || []).some((w) => new RegExp(`\\b${w}\\b`, "i").test(before));
      if (!ok) findings.push({ severity: "fail", source: "sky-placement", term: c.term, match: m[0], reason: c.reason });
    }
  }

  // -- kumbaya closer: the turn must end on bite, not a blessing.
  const turnSentences = sentencesOf(slots.turn);
  const lastLine = turnSentences[turnSentences.length - 1] || "";
  if (/^(may (you|we|this)|go (gently|softly)|be (gentle|kind) (with|to) yourself|remember( that)? you are)/i.test(lastLine.trim())) {
    findings.push({ severity: "fail", source: "shape", term: "blessing-close", match: lastLine, reason: "no sign-off blessing; end on the line with the most bite" });
  }

  // -- extended slots (only when present)
  if (tagline !== null) {
    const tagWords = tagline.split(/\s+/).filter(Boolean).length;
    if (tagWords < 2 || tagWords > 5) {
      findings.push({ severity: "fail", source: "shape", slot: "tagline", term: "tagline-length", match: tagline, reason: "tagline is 2-5 words" });
    }
    if (/[.!?]$/.test(tagline)) {
      findings.push({ severity: "warn", source: "shape", slot: "tagline", term: "tagline-period", match: tagline, reason: "no terminal punctuation on the tagline" });
    }
  }
  if (moves !== null) {
    if (moves.length < 2 || moves.length > 3) {
      findings.push({ severity: "fail", source: "shape", slot: "moves", term: "moves-count", match: `${moves.length} moves`, reason: "2-3 moves, each one sentence" });
    }
    for (const m of moves) {
      if (sentencesOf(m).length > 1 || m.split(/\s+/).filter(Boolean).length > 32) {
        findings.push({ severity: "warn", source: "shape", slot: "moves", term: "move-length", match: m.slice(0, 60), reason: "each move is one short, doable sentence" });
      }
    }
  }

  // -- structural advisories (spec ranges; exemplars set the tolerance)
  const hookS = sentencesOf(slots.hook);
  const livedS = sentencesOf(slots.lived);
  if (hookS.length < 2) {
    findings.push({
      severity: "fail",
      source: "shape",
      slot: "hook",
      term: "missing-meaning-after-quote",
      match: slots.hook,
      reason: "hook sentence 1 renders as a standalone quote; at least one sentence must remain for the planet-plus-sign meaning paragraph"
    });
  }
  if (hookS.length > 4) notes.push(`hook is ${hookS.length} sentences; spec says 2-4`);
  if (livedS.length < 2 || livedS.length > 4) notes.push(`lived is ${livedS.length} sentences; spec says 2-4`);
  if (turnSentences.length < 2 || turnSentences.length > 5) notes.push(`turn is ${turnSentences.length} sentences; spec says 2-5 with one close`);
  const hookWords = slots.hook.split(/\s+/).filter(Boolean).length;
  if (hookWords > 70) notes.push(`hook is long (${hookWords} words); the hook is the sendable line, not a paragraph`);
  if (lastLine.split(/\s+/).filter(Boolean).length > 22) notes.push("closer is long; end on a shorter line with bite");

  // pace mention, article-wide (advisory: exemplars carry it in hook OR lived)
  if (planet && spec.pace.labels[planet]) {
    const paceProbe = /\b(day|days|week|weeks|month|months|year|years|decade|decades|era|generation)\b/i;
    if (!paceProbe.test(full)) notes.push(`no pace signal found; the article should land the ${planet} pace (${spec.pace.labels[planet]}) somewhere, usually in lived`);
  }

  // stacked ending: 3+ short sentences piled at the close of the turn
  let closeRun = 0;
  for (let i = turnSentences.length - 1; i >= 0; i--) {
    if (turnSentences[i].split(/\s+/).filter(Boolean).length <= 11) closeRun++;
    else break;
  }
  if (closeRun >= 3) {
    findings.push({ severity: "warn", source: "shape", term: "stacked-ending", match: `${closeRun} short closing sentences`, reason: "land one truth with bite, not a pile of aphorisms" });
  }

  const fails = findings.filter((f) => f.severity === "fail").length;
  const warns = findings.filter((f) => f.severity === "warn").length;
  let score = 3;
  if (warns >= 1) score = 2;
  if (fails >= 1) score = 1;
  return { score, fails, warns, findings, notes };
}

module.exports = { lintArticle, SLOTS, EXTENDED_SLOTS };

if (require.main === module) {
  const arg = process.argv.slice(2).join(" ");
  if (arg === "--exemplars") {
    let bad = 0;
    for (const e of spec.exemplars) {
      const r = lintArticle({ hook: e.hook, lived: e.lived, turn: e.turn, planet: e.planet, sign: e.sign, allowLegacySecondPerson: true });
      if (r.fails || r.warns) bad++;
      const flag = r.score === 3 ? "OK " : "!! ";
      console.log(`${flag} score ${r.score} (fails ${r.fails}, warns ${r.warns})  ${e.sourceId}${r.notes.length ? "  [" + r.notes.join("; ") + "]" : ""}`);
      for (const f of r.findings) console.log(`      ${f.severity}: ${f.term} ${f.match ? `"${f.match}"` : ""}`);
    }
    process.exit(bad ? 1 : 0);
  } else if (arg) {
    let article;
    try { article = JSON.parse(arg); } catch { console.error("pass a JSON article {hook, lived, turn} or --exemplars"); process.exit(1); }
    console.log(JSON.stringify(lintArticle(article), null, 2));
  } else {
    console.error('usage: lint-placement-voice.js \'{"hook":"...","lived":"...","turn":"..."}\' | --exemplars');
    process.exit(1);
  }
}
