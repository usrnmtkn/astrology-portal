#!/usr/bin/env node
//
// Voice linter for collective sky-aspect card copy.
// Reads the single source of truth in voice/:
//   - voice/banned-words.json            (meaning-level bans, also fail here)
//   - voice/banned-constructions.json    (banned contrast-reveal formulas)
//   - voice/tldr-astro/sky-aspect.json   (output-level bans, warns, shape)
// Scores a card 1-3 and lists every flagged item. The mechanical half of the
// rubric; a human or LLM-as-judge still covers whether it sounds human.
//
// Usage:  node scripts/lint-sky-voice.js "<card body>"
//         node scripts/lint-sky-voice.js --examples   (lint every sky exemplar)

const fs = require("fs");
const path = require("path");

const voiceRoot = path.join(__dirname, "..", "voice");
const readJson = (p) => JSON.parse(fs.readFileSync(p, "utf8"));

const bannedWords = readJson(path.join(voiceRoot, "banned-words.json")).bannedWords || [];
const bannedConstructions = readJson(path.join(voiceRoot, "banned-constructions.json")).bannedConstructions || [];
const sky = readJson(path.join(voiceRoot, "tldr-astro", "sky-aspect.json"));

const META = /[\\^$.*+?()[\]{}|]/;
function toRegex(term) {
  if (term === "—") return /—/;
  // if the term already looks like a regex (has metachars other than a plain
  // phrase), use it as-is; otherwise wrap it as a word-boundary match.
  if (META.test(term.replace(/ /g, ""))) return new RegExp(term, "i");
  return new RegExp(`\\b${term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i");
}

const PLACEMENT_MODE = "collective-placement-card";
const SECOND_PERSON_TERM = "(?<!-)\\byou\\b|(?<!-)\\byour\\b";

function closerSentenceCount(sentences) {
  let count = 0;

  for (let index = sentences.length - 1; index >= 0 && count < 2; index -= 1) {
    const words = sentences[index].trim().split(/\s+/).filter(Boolean).length;
    if (words <= 13) count += 1;
    else break;
  }

  return Math.max(count, 1);
}

function lintCard(text, { mode = "collective-aspect-card" } = {}) {
  const findings = [];
  const sentences = (text.match(/[^.!?]+[.!?]+/g) || []).map((s) => s.trim());
  const placementCloserCount = mode === PLACEMENT_MODE ? closerSentenceCount(sentences) : 0;
  const placementBody = placementCloserCount
    ? sentences.slice(0, -placementCloserCount).join(" ")
    : text;
  const readerBoundaryChecks = [
    {
      term: "degree/orb mechanics",
      pattern: /\b(?:orb|degrees?)\b|°/i,
      reason: "Degrees and orb mechanics belong in the separate space caption, not the poetic body."
    },
    {
      term: "date",
      pattern: /\b(?:jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\s+\d{1,2}(?:st|nd|rd|th)?\b|\b20\d{2}\b|\b\d{4}-\d{2}-\d{2}\b/i,
      reason: "Dates belong in immutable timing or series facts, not the poetic body."
    },
    {
      term: "editorial metadata",
      pattern: /\b(?:provenance|linter|lint score|editorial status|draft status|review queue)\b/i,
      reason: "Reader copy must not expose provenance, linting, or editorial state."
    }
  ];

  for (const check of readerBoundaryChecks) {
    const match = text.match(check.pattern);
    if (match) {
      findings.push({
        severity: "fail",
        source: "reader-boundary",
        term: check.term,
        match: match[0],
        reason: check.reason
      });
    }
  }

  if (!/\b(?:we|our|us)\b/i.test(text)) {
    findings.push({
      severity: "fail",
      source: "reader-boundary",
      term: "collective person",
      match: "",
      reason: "Collective sky cards must use first-person plural (we/our/us)."
    });
  }

  // meaning-level banned words are also fails in output
  for (const b of bannedWords) {
    const term = typeof b === "string" ? b : b.term;
    if (!term) continue;
    const m = text.match(toRegex(term));
    if (m) findings.push({ severity: "fail", source: "banned-words", term, match: m[0] });
  }
  // banned contrast-reveal constructions (loose phrase match)
  for (const c of bannedConstructions) {
    const probe = (c.pattern || "").replace(/\[[^\]]*\]/g, "").trim();
    if (probe && text.toLowerCase().includes(probe.toLowerCase().slice(0, 24))) {
      findings.push({ severity: "warn", source: "banned-constructions", term: c.pattern });
    }
  }
  // output-level fail + warn from the sky surface config
  for (const b of sky.outputBans.fail) {
    const target = mode === PLACEMENT_MODE && b.term === SECOND_PERSON_TERM
      ? placementBody
      : text;
    const m = target.match(toRegex(b.term));
    if (m) findings.push({ severity: "fail", source: "sky-aspect", term: b.term, match: m[0], reason: b.reason });
  }
  for (const b of sky.outputBans.warn) {
    const m = text.match(toRegex(b.term));
    if (m) findings.push({ severity: "warn", source: "sky-aspect", term: b.term, match: m[0], reason: b.reason });
  }
  // conditional bans: term is allowed only if one of requiresBefore appears earlier
  for (const c of sky.conditionalBans || []) {
    const m = text.match(toRegex(c.term));
    if (m) {
      const before = text.slice(0, m.index).toLowerCase();
      const ok = (c.requiresBefore || []).some((w) => new RegExp(`\\b${w}\\b`, "i").test(before));
      if (!ok) findings.push({ severity: "fail", source: "sky-aspect", term: c.term, match: m[0], reason: c.reason });
    }
  }

  // register signal (advisory): how many approved phrase-bank items appear.
  // Never fails a card - forcing phrase-bank words would push toward keyword
  // stuffing. It only flags a card that drew from the register not at all.
  const useWords = [].concat(...Object.values(sky.useWords || {}));
  let registerDraw = 0;
  for (const w of useWords) {
    const re = / /.test(w) ? new RegExp(w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i") : new RegExp(`\\b${w}\\b`, "i");
    if (re.test(text)) registerDraw++;
  }

  // structural heuristics
  const words = text.split(/\s+/).filter(Boolean);
  const notes = [];
  const avg = words.length / Math.max(sentences.length, 1);
  if (avg > 26) notes.push(`long average sentence (${avg.toFixed(0)} words)`);
  const last = sentences[sentences.length - 1] || "";
  if (last.split(/\s+/).filter(Boolean).length > 22) notes.push("closer is long; end on a shorter true line");
  if (registerDraw === 0) notes.push("drew nothing from the approved phrase bank - check the register");
  const paras = text.split(/\n\s*\n/).filter((p) => p.trim()).length;
  if (paras !== 2) {
    findings.push({
      severity: "fail",
      source: "shape",
      term: "paragraph-count",
      match: `${paras} paragraphs`,
      reason: "the card template is exactly two paragraphs"
    });
  }
  // stacked ending: 3+ short sentences piled at the close. The template wants
  // ONE truth + its catch (two short lines). A run of 3+ is a warn, which trips
  // the generator's auto-regenerate loop before the card reaches the judge.
  let closeRun = 0;
  for (let i = sentences.length - 1; i >= 0; i--) {
    if (sentences[i].split(/\s+/).filter(Boolean).length <= 11) closeRun++;
    else break;
  }
  if (closeRun >= 3) {
    findings.push({ severity: "warn", source: "shape", term: "stacked-ending", match: `${closeRun} short closing sentences`, reason: "land one truth and its catch, not a pile of aphorisms" });
  }
  // A draft can hide two truth+catch pairs by making one line just long enough
  // to escape the stacked-ending rule. Catch either four compact tail
  // sentences, or two distinct short runs split by a longer sentence.
  const tail = sentences.slice(-4);
  const tailWordCounts = tail.map((sentence) => sentence.split(/\s+/).filter(Boolean).length);
  const fourCompactClosers = tail.length === 4 && tailWordCounts.every((count) => count <= 13);
  const splitTailWordCounts = sentences
    .slice(-5)
    .map((sentence) => sentence.split(/\s+/).filter(Boolean).length);
  const splitShortPairs = splitTailWordCounts.some((count, index) => (
    index >= 2
    && index <= splitTailWordCounts.length - 3
    && count > 11
    && splitTailWordCounts[index - 1] <= 11
    && splitTailWordCounts[index - 2] <= 11
    && splitTailWordCounts[index + 1] <= 11
    && splitTailWordCounts[index + 2] <= 11
  ));

  if (fourCompactClosers || splitShortPairs) {
    findings.push({
      severity: "warn",
      source: "shape",
      term: "double-closing-pair",
      match: "two compact landing pairs in the final four sentences",
      reason: "land one truth and its catch, not two separate closing pairs"
    });
  }

  const fails = findings.filter((f) => f.severity === "fail").length;
  const warns = findings.filter((f) => f.severity === "warn").length;
  // score is driven by rule violations only; structural notes are advisory
  // (the owner's fallout closers are intentionally list-shaped and long).
  let score = 3;
  if (warns >= 1) score = 2;
  if (fails >= 1) score = 1;
  return { score, fails, warns, registerDraw, findings, notes, sentences: sentences.length };
}

module.exports = { closerSentenceCount, lintCard };

if (require.main === module) {
  const arg = process.argv.slice(2).join(" ");
  if (arg === "--examples") {
    const examples = readJson(path.join(voiceRoot, "tldr-astro", "examples.json"));
    const sky = examples.filter((e) => (
      e.surface === "sky"
      && ["collective-aspect-card", PLACEMENT_MODE].includes(e.mode)
    ));
    let bad = 0;
    for (const e of sky) {
      const r = lintCard(e.body, { mode: e.mode });
      if (r.fails) bad++;
      console.log(`${r.score === 3 ? "OK " : "!! "} score ${r.score} (fails ${r.fails}, warns ${r.warns})  ${e.sourceId}`);
    }
    process.exit(bad ? 1 : 0);
  } else if (arg) {
    console.log(JSON.stringify(lintCard(arg), null, 2));
  } else {
    console.error('pass a card body, or --examples');
    process.exit(1);
  }
}
