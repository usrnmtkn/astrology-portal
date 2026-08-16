#!/usr/bin/env node
//
// Mechanical voice gate for LONG-FORM sky articles. This intentionally does
// not reuse lint-sky-voice.js: articles license second person, questions,
// contractions, dates, and long blocks that the card surface forbids.
//
// The shared voice lexicon still applies, plus the House trade vocabulary
// scoped to sky-article-longform in voice/banned-words.json. Owner-verbatim
// calibration fixtures may report hits, but those hits are explicitly waived.

const fs = require("fs");
const path = require("path");

const voiceRoot = path.join(__dirname, "..", "voice");
const readJson = (file) => JSON.parse(fs.readFileSync(file, "utf8"));
const bannedConfig = readJson(path.join(voiceRoot, "banned-words.json"));
const bannedConstructions = readJson(path.join(voiceRoot, "banned-constructions.json")).bannedConstructions || [];
const skyVoice = readJson(path.join(voiceRoot, "tldr-astro", "sky-aspect.json"));
const { findBannedConstructions } = require("./banned-construction-matcher.js");
const { findPolicyFindings } = require("./banned-word-policy.js");
const { checkReferenceClaim } = require("./reference-fact-bank.js");

const SURFACE = "sky-article-longform";
const SECOND_PERSON_TERM = "(?<!-)\\byou\\b|(?<!-)\\byour\\b";
const META = /[\\^$.*+?()[\]{}|]/;

function toRegex(term) {
  if (term === "—") return /—/;
  if (META.test(term.replace(/ /g, ""))) return new RegExp(term, "i");
  return new RegExp(`\\b${term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i");
}

function addTermFinding(findings, text, entry, severity, source) {
  const term = typeof entry === "string" ? entry : entry.term;
  if (!term) return;
  const match = text.match(toRegex(term));
  if (!match) return;
  findings.push({
    severity,
    source,
    term,
    match: match[0],
    reason: typeof entry === "string" ? undefined : entry.reason
  });
}

function lintLongformArticle(articleText, { ownerVerbatim = false } = {}) {
  const text = String(articleText || "");
  const findings = [];

  findings.push(...findPolicyFindings(text, bannedConfig.bannedWords || []));

  for (const entry of bannedConfig.surfaceBannedWords?.[SURFACE] || []) {
    addTermFinding(findings, text, entry, "fail", `${SURFACE}-trade-vocabulary`);
  }

  // The card lexicon is shared, but its second-person rule is a deliberate
  // surface inversion for articles. Shape, length, dates, and questions are
  // enforced by the card linter itself and therefore never enter this gate.
  for (const entry of skyVoice.outputBans?.fail || []) {
    if (entry.term === SECOND_PERSON_TERM) continue;
    addTermFinding(findings, text, entry, "fail", "voice-lexicon");
  }
  for (const entry of skyVoice.outputBans?.warn || []) {
    addTermFinding(findings, text, entry, "warn", "voice-lexicon");
  }

  findings.push(...findBannedConstructions(text, bannedConstructions));
  findings.push(...checkReferenceClaim(text));

  if (!text.trim()) {
    findings.push({
      severity: "fail",
      source: "shape",
      term: "empty-article",
      match: "",
      reason: "the long-form article is empty"
    });
  }

  const activeFindings = ownerVerbatim ? [] : findings;
  const fails = activeFindings.filter((finding) => finding.severity === "fail").length;
  const warns = activeFindings.filter((finding) => finding.severity === "warn").length;
  const score = fails ? 1 : warns ? 2 : 3;

  return {
    surface: SURFACE,
    score,
    fails,
    warns,
    findings: activeFindings,
    overriddenFindings: ownerVerbatim ? findings : [],
    ownerVerbatim
  };
}

module.exports = { lintLongformArticle, SURFACE, SECOND_PERSON_TERM, toRegex };

if (require.main === module) {
  const args = process.argv.slice(2);
  const ownerVerbatim = args.includes("--owner-verbatim");
  if (args.includes("--fixtures")) {
    const fixtureRoot = path.join(voiceRoot, "tldr-astro", "fixtures", "sky-article-longform");
    const manifest = readJson(path.join(fixtureRoot, "manifest.json"));
    for (const fixture of manifest) {
      const result = lintLongformArticle(fs.readFileSync(path.join(fixtureRoot, fixture.file), "utf8"), { ownerVerbatim: true });
      console.log(`OK  ${fixture.title}: score ${result.score} (${result.overriddenFindings.length} owner-verbatim hits overridden)`);
    }
    process.exit(0);
  }
  const file = args.find((arg) => arg.endsWith(".md"));
  if (!file) {
    console.error("usage: lint-article-voice.js ./article.md [--owner-verbatim] | --fixtures");
    process.exit(1);
  }
  const result = lintLongformArticle(fs.readFileSync(file, "utf8"), { ownerVerbatim });
  console.log(JSON.stringify(result, null, 2));
  process.exit(result.score === 1 ? 2 : result.score === 2 ? 1 : 0);
}
