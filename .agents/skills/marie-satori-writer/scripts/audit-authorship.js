#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");
const { repoRoot } = require("./build-voice-index.js");

const packageRoot = path.join(repoRoot, "packages", "astro-knowledge");
const { lintArticle } = require(path.join(packageRoot, "scripts", "lint-placement-voice.js"));
const negativeExamples = require(path.join(packageRoot, "voice", "tldr-astro", "marie-satori-writer", "negative-examples.json"));

function parseArgs(argv = process.argv.slice(2)) {
  const options = {};
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    const [key, inline] = token.split(/=(.*)/su);
    const value = inline ?? argv[++index];
    if (key === "--candidate-file") options.candidateFile = value;
    else if (key === "--candidate-id") options.candidateId = value;
    else if (key === "--article-file") options.articleFile = value;
    else if (key === "--attestation") options.attestation = value;
    else if (key === "--out") options.out = value;
    else throw new Error(`Unknown argument '${token}'.`);
  }
  if (!options.candidateFile && !options.articleFile) throw new Error("Provide --candidate-file or --article-file.");
  return options;
}

function loadArticle(options) {
  if (options.articleFile) {
    const value = JSON.parse(fs.readFileSync(path.resolve(repoRoot, options.articleFile), "utf8"));
    return { article: value.article || value, planet: value.planet || "", sign: value.sign || "", sourceId: value.candidateId || value.sourceId || options.articleFile };
  }
  const value = JSON.parse(fs.readFileSync(path.resolve(repoRoot, options.candidateFile), "utf8"));
  const candidates = value.candidates || [value];
  const candidate = options.candidateId
    ? candidates.find((item) => item.candidateId === options.candidateId || item.sourceId === options.candidateId)
    : candidates[0];
  if (!candidate) throw new Error(`Candidate '${options.candidateId}' not found.`);
  return { article: candidate.article, planet: candidate.planet || "", sign: candidate.sign || "", sourceId: candidate.candidateId || candidate.sourceId };
}

function sentences(article) {
  const result = [];
  for (const slot of ["tagline", "hook", "lived", "turn"]) {
    if (!article[slot]) continue;
    const parts = slot === "tagline"
      ? [article[slot]]
      : String(article[slot]).match(/[^.!?]+[.!?]+|[^.!?]+$/gu) || [];
    parts.map((text) => text.trim()).filter(Boolean).forEach((text, index) => result.push({ slot, index, text }));
  }
  (article.moves || []).forEach((text, index) => result.push({ slot: "moves", index, text }));
  return result;
}

function wordSet(value) {
  return new Set(String(value || "").toLowerCase().match(/[a-z0-9]+/gu)?.filter((word) => word.length >= 3) || []);
}

function jaccard(a, b) {
  const left = wordSet(a);
  const right = wordSet(b);
  const intersection = [...left].filter((word) => right.has(word)).length;
  const union = new Set([...left, ...right]).size;
  return union ? intersection / union : 0;
}

function deterministicFindings(target) {
  const allSentences = sentences(target.article);
  const findings = [];
  for (const sentence of allSentences) {
    const lower = sentence.text.toLowerCase();
    for (const example of negativeExamples.records) {
      if (lower.includes(example.text.toLowerCase())) findings.push({
        severity: "fail",
        rule: "known-negative-exact-match",
        slot: sentence.slot,
        sentence: sentence.text,
        failureTags: example.failureTags,
        reason: example.reason
      });
    }
    if (/\b(?:depends?|dependent) on disappearance\b/iu.test(sentence.text)) findings.push({
      severity: "fail",
      rule: "polished-shorthand",
      slot: sentence.slot,
      sentence: sentence.text,
      failureTags: ["abstract_consequence", "requires_interpretation"],
      reason: "Name the lost time, work, money, access, or relationship cost instead of disappearance."
    });
    if (/\b(?:a private feeling becomes a public decision|peace can be staged)\b/iu.test(sentence.text)) findings.push({
      severity: "fail",
      rule: "abstract-summary-before-behavior",
      slot: sentence.slot,
      sentence: sentence.text,
      failureTags: ["abstract_hook", "behavior_missing"],
      reason: "Replace the polished summary with the event that proves it."
    });
    if (sentence.slot === "hook" && sentence.index === 0 && new RegExp(`^${target.planet} in ${target.sign}\\b`, "iu").test(sentence.text)) findings.push({
      severity: "fail",
      rule: "definition-first-hook",
      slot: sentence.slot,
      sentence: sentence.text,
      failureTags: ["explanatory_before_observable"],
      reason: "Current Sky hooks must begin with recognizable pressure, behavior, a decision, or a contradiction."
    });
    if ((sentence.text.match(/,/gu) || []).length >= 3 && /\b(?:work|family|relationships?|community|public|organize|donate|make art)\b/iu.test(sentence.text)) findings.push({
      severity: "review",
      rule: "possible-category-inventory",
      slot: sentence.slot,
      sentence: sentence.text,
      failureTags: ["category_inventory"],
      reason: "Confirm this is one advancing sequence rather than several representative categories."
    });
  }
  for (let left = 0; left < allSentences.length; left += 1) {
    for (let right = left + 1; right < allSentences.length; right += 1) {
      const similarity = jaccard(allSentences[left].text, allSentences[right].text);
      if (similarity >= 0.72) findings.push({
        severity: "review",
        rule: "possible-repeated-beat",
        slot: `${allSentences[left].slot}/${allSentences[right].slot}`,
        sentence: `${allSentences[left].text} || ${allSentences[right].text}`,
        failureTags: ["repeated_beat"],
        reason: `Sentence word overlap is ${similarity.toFixed(2)}; confirm the second sentence advances the sequence.`
      });
    }
  }
  return { allSentences, findings };
}

const semanticQuestions = [
  "Does the sentence make literal sense on first read?",
  "Does it name observable behavior, a real decision, or a concrete consequence?",
  "Is an abstraction being made to act like a person?",
  "Is the sentence merely explaining the placement?",
  "Does it sound like a content writer imitating Marie?",
  "Does it repeat an idea already established?",
  "Does it require the reader to translate polished shorthand?",
  "Could it move to another placement with minimal changes?",
  "Does it continue the article's sequence?",
  "Is the cost named specifically?",
  "Is the sentence needed, or is it filling paragraph length?"
];

const articleQuestions = [
  "The hook begins with recognizable pressure, behavior, a decision, or a contradiction.",
  "Astrology follows or accompanies the lived observation rather than replacing it.",
  "Every beat advances one sequence.",
  "The lived section is not an inventory.",
  "The turn names behavior and consequence.",
  "The ending does not stack another metaphor, slogan, or conclusion.",
  "Moves carry pressure, choice, or consequence instead of administration.",
  "Current Sky contains no second person.",
  "The article did not become more polished at the expense of natural English."
];

function validateAttestation(attestation, sentenceCount) {
  if (!attestation) return { present: false, passed: false, failures: ["semantic authorship attestation missing"] };
  const failures = [];
  if (!Array.isArray(attestation.sentences) || attestation.sentences.length !== sentenceCount) failures.push("attestation must cover every sentence");
  for (const record of attestation.sentences || []) {
    if (!record || record.passed !== true) failures.push(`sentence ${record?.slot || "unknown"}/${record?.index ?? "?"} requires rewrite`);
  }
  if (!Array.isArray(attestation.articleChecks) || attestation.articleChecks.length !== articleQuestions.length) failures.push("attestation must cover every article-level check");
  for (const record of attestation.articleChecks || []) {
    if (!record || record.passed !== true) failures.push(`article check failed: ${record?.question || "unknown"}`);
  }
  return { present: true, passed: failures.length === 0, failures };
}

function audit(target, attestation = null) {
  const lint = lintArticle({ ...target.article, planet: target.planet, sign: target.sign });
  const deterministic = deterministicFindings(target);
  const semantic = validateAttestation(attestation, deterministic.allSentences.length);
  const hardFailures = deterministic.findings.filter((finding) => finding.severity === "fail");
  const gate = lint.fails || hardFailures.length
    ? "rewrite_required"
    : semantic.passed
      ? "authorship_pass"
      : "authorship_review_required";
  return {
    schemaVersion: 1,
    sourceId: target.sourceId,
    gate,
    deterministicLint: lint,
    deterministicFindings: deterministic.findings,
    sentenceAuditTemplate: deterministic.allSentences.map((sentence) => ({ ...sentence, questions: semanticQuestions })),
    articleAuditTemplate: articleQuestions,
    semanticAttestation: semantic,
    rule: "A failing deterministic or semantic authorship check requires rewritten candidate wording, not a warning-only handoff."
  };
}

function main() {
  const options = parseArgs();
  const target = loadArticle(options);
  const attestationFile = options.attestation ? JSON.parse(fs.readFileSync(path.resolve(repoRoot, options.attestation), "utf8")) : null;
  const attestation = attestationFile?.attestations?.[target.sourceId] || attestationFile;
  const report = audit(target, attestation);
  const serialized = `${JSON.stringify(report, null, 2)}\n`;
  if (options.out) {
    const out = path.resolve(repoRoot, options.out);
    fs.mkdirSync(path.dirname(out), { recursive: true });
    fs.writeFileSync(out, serialized);
    console.log(`Authorship audit: ${path.relative(repoRoot, out)} (${report.gate})`);
  } else process.stdout.write(serialized);
  if (report.gate === "rewrite_required") process.exitCode = 1;
}

module.exports = { articleQuestions, audit, deterministicFindings, semanticQuestions };

if (require.main === module) {
  try { main(); } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  }
}
