#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");
const { buildIndex, repoRoot } = require("./build-voice-index.js");

const packageRoot = path.join(repoRoot, "packages", "astro-knowledge");
const writerRoot = path.join(packageRoot, "voice", "tldr-astro", "marie-satori-writer");
const contrastive = require(path.join(writerRoot, "contrastive-edits.json"));
const negatives = require(path.join(writerRoot, "negative-examples.json"));
const surfaceSpec = require(path.join(packageRoot, "voice", "tldr-astro", "sky-placement.json"));
const { normalizeArgs } = require(path.join(packageRoot, "scripts", "generate-sky-placement-articles.js"));

function parseArgs(argv = process.argv.slice(2)) {
  const options = { surface: "sky-placement", beat: "", goal: "", failureTags: [], keywords: [], outDir: "" };
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    const [key, inline] = token.split(/=(.*)/su);
    const value = inline ?? argv[++index];
    if (key === "--surface") options.surface = value;
    else if (key === "--planet") options.planet = value;
    else if (key === "--sign") options.sign = value;
    else if (key === "--beat") options.beat = value;
    else if (key === "--goal") options.goal = value;
    else if (key === "--failure-tags") options.failureTags = String(value || "").split(",").map((item) => item.trim()).filter(Boolean);
    else if (key === "--keywords") options.keywords = String(value || "").split(",").map((item) => item.trim()).filter(Boolean);
    else if (key === "--candidate-file") options.candidateFile = value;
    else if (key === "--candidate-id") options.candidateId = value;
    else if (key === "--out-dir") options.outDir = value;
    else throw new Error(`Unknown argument '${token}'.`);
  }
  if (!options.planet || !options.sign) throw new Error("--planet and --sign are required.");
  return options;
}

function terms(value) {
  return [...new Set(String(value || "").toLowerCase().match(/[a-z0-9]+/gu)?.filter((term) => term.length >= 3) || [])];
}

function normalized(value) {
  return terms(value).join(" ");
}

function loadCandidate(options) {
  if (!options.candidateFile) return null;
  const file = path.resolve(repoRoot, options.candidateFile);
  const value = JSON.parse(fs.readFileSync(file, "utf8"));
  const candidates = value.candidates || [value];
  const candidate = options.candidateId
    ? candidates.find((item) => item.candidateId === options.candidateId || item.sourceId === options.candidateId)
    : candidates[0];
  if (!candidate) throw new Error(`Candidate '${options.candidateId}' not found in ${options.candidateFile}.`);
  return { ...candidate, sourcePath: path.relative(repoRoot, file).replaceAll(path.sep, "/") };
}

function overlap(a, b) {
  const right = new Set(b);
  return a.filter((item) => right.has(item)).length;
}

const RELEVANCE_STOPWORDS = new Set([
  "about", "after", "again", "against", "article", "because", "before", "being", "between", "cannot", "candidate",
  "complete", "could", "every", "from", "have", "into", "more", "other", "over", "person", "placement", "replace",
  "same", "should", "than", "that", "their", "them", "then", "there", "these", "they", "this", "those", "through",
  "time", "under", "until", "very", "what", "when", "where", "which", "while", "with", "without", "would"
]);

function relevanceTerms(value) {
  return terms(String(value || "").replaceAll("_", " ")).filter((term) => !RELEVANCE_STOPWORDS.has(term));
}

function scoreEntry(entry, query) {
  const entryTerms = terms(`${entry.text} ${entry.structuralFunction}`);
  const goalTerms = relevanceTerms(`${query.goal} ${(query.failureTags || []).join(" ")} ${(query.keywords || []).join(" ")}`);
  const candidateTerms = relevanceTerms(query.candidateText);
  let score = 0;
  const reasons = [];
  if (entry.surface === query.surface) { score += 1000; reasons.push("same surface"); }
  else if (entry.surface === "sky-article-longform") { score += 120; reasons.push("owner-authored astrology article"); }
  const tagOverlap = overlap(entry.failureTags || [], query.failureTags || []);
  if (tagOverlap) { score += tagOverlap * 500; reasons.push(`${tagOverlap} matching failure tag${tagOverlap === 1 ? "" : "s"}`); }
  const goalOverlap = overlap(entryTerms, goalTerms);
  if (goalOverlap) { score += Math.min(goalOverlap, 6) * 75; reasons.push(`${goalOverlap} editorial-goal terms`); }
  if (query.beat && entry.articleBeat === query.beat) { score += 200; reasons.push("same article beat"); }
  if (entry.planet && entry.planet === query.planet) { score += 150; reasons.push("same planet"); }
  if (entry.sign && entry.sign === query.sign) { score += 100; reasons.push("same sign"); }
  const candidateOverlap = overlap(entryTerms, candidateTerms);
  if (candidateOverlap) { score += Math.min(candidateOverlap, 10) * 10; reasons.push(`${candidateOverlap} candidate-language terms`); }
  if (entry.authorityClass === "owner_authored_final") score += 25;
  if (entry.authorityClass === "exact_owner_approved") score += 20;
  return { score, reasons };
}

function selectDistinct(records, limit, keyOf) {
  const selected = [];
  const seen = new Set();
  for (const record of records) {
    const key = normalized(keyOf(record));
    if (!key || seen.has(key)) continue;
    seen.add(key);
    selected.push(record);
    if (selected.length >= limit) break;
  }
  return selected;
}

function rankedPositive(index, query, limit = 5) {
  const ranked = index.entries
    .filter((entry) => entry.useAsPositiveVoiceEvidence === true)
    .filter((entry) => ["owner_authored_final", "exact_owner_approved"].includes(entry.authorityClass))
    .filter((entry) => entry.text.length >= 60 && entry.text.length <= 1600)
    .map((entry) => ({ entry, ...scoreEntry(entry, query) }))
    .sort((a, b) => b.score - a.score || a.entry.sourceId.localeCompare(b.entry.sourceId));
  const selected = [];
  const seenText = new Set();
  const seenSources = new Set();
  for (const record of ranked) {
    const textKey = normalized(record.entry.text);
    const sourceKey = record.entry.sourcePath;
    if (!textKey || seenText.has(textKey) || seenSources.has(sourceKey)) continue;
    seenText.add(textKey);
    seenSources.add(sourceKey);
    selected.push(record);
    if (selected.length >= limit) break;
  }
  return selected;
}

function rankedContrastive(query, limit = 4) {
  const ranked = contrastive.records.map((record) => {
    let score = 0;
    const reasons = [];
    if (record.surface === query.surface) { score += 100; reasons.push("same surface"); }
    if (query.beat && record.articleBeat === query.beat) { score += 70; reasons.push("same article beat"); }
    if (record.planet === query.planet) { score += 40; reasons.push("same planet"); }
    if (record.sign === query.sign) { score += 25; reasons.push("same sign"); }
    const tagOverlap = overlap(record.failureTags, query.failureTags || []);
    if (tagOverlap) { score += tagOverlap * 60; reasons.push(`${tagOverlap} matching failure tag${tagOverlap === 1 ? "" : "s"}`); }
    const termOverlap = overlap(terms(`${record.before} ${record.after} ${record.ownerReason}`), terms(`${query.goal} ${query.candidateText}`));
    if (termOverlap) { score += Math.min(termOverlap, 10) * 5; reasons.push(`${termOverlap} relevant terms`); }
    return { record, score, reasons };
  }).sort((a, b) => b.score - a.score || a.record.id.localeCompare(b.record.id));
  return selectDistinct(ranked, limit, (item) => `${item.record.before} ${item.record.after}`);
}

function rankedNegatives(query, limit = 2) {
  const ranked = negatives.records.map((record) => {
    let score = record.surface === query.surface ? 80 : 0;
    const reasons = record.surface === query.surface ? ["same surface"] : [];
    if (query.beat && record.articleBeat === query.beat) { score += 60; reasons.push("same article beat"); }
    if (record.planet === query.planet) { score += 35; reasons.push("same planet"); }
    if (record.sign === query.sign) { score += 25; reasons.push("same sign"); }
    const tagOverlap = overlap(record.failureTags, query.failureTags || []);
    if (tagOverlap) { score += tagOverlap * 55; reasons.push(`${tagOverlap} matching failure tag${tagOverlap === 1 ? "" : "s"}`); }
    const termOverlap = overlap(terms(`${record.text} ${record.reason}`), terms(`${query.goal} ${query.candidateText}`));
    if (termOverlap) { score += termOverlap * 4; reasons.push(`${termOverlap} relevant terms`); }
    return { record, score, reasons };
  }).sort((a, b) => b.score - a.score || a.record.id.localeCompare(b.record.id));
  return selectDistinct(ranked, limit, (item) => item.record.text);
}

function compactContract() {
  return {
    id: surfaceSpec.id,
    voiceDescription: surfaceSpec.voiceDescription,
    person: surfaceSpec.personNote,
    beats: surfaceSpec.shape.beats.map((beat) => ({ beat: beat.beat, requirement: beat.does })),
    taglineRules: surfaceSpec.articleStructure.taglineRules,
    movesRules: surfaceSpec.articleStructure.movesRules,
    loreBoundary: surfaceSpec.loreBoundary,
    sourcePath: "packages/astro-knowledge/voice/tldr-astro/sky-placement.json"
  };
}

function buildPacket(options) {
  if (options.surface !== "sky-placement") throw new Error("The first writer packet compiler supports sky-placement only.");
  const candidate = loadCandidate(options);
  const normalizedFacts = normalizeArgs({ planet: options.planet, sign: options.sign });
  const query = {
    ...options,
    candidateText: candidate ? JSON.stringify(candidate.article) : ""
  };
  const index = buildIndex();
  const positiveExamples = rankedPositive(index, query);
  const contrastiveEdits = rankedContrastive(query);
  const negativeExamples = rankedNegatives(query);
  if (positiveExamples.some(({ entry }) => entry.authorityClass === "ai_candidate_unreviewed")) {
    throw new Error("Unapproved AI candidate entered positive evidence.");
  }
  return {
    schemaVersion: 1,
    packetId: `marie-satori-writer:${options.surface}:${options.planet}-${options.sign}:${options.beat || "article"}`,
    createdAt: "2026-08-02T00:00:00.000Z",
    surface: options.surface,
    target: { planet: options.planet, sign: options.sign, beat: options.beat || "article", goal: options.goal, failureTags: options.failureTags, keywords: options.keywords },
    writerLane: {
      laneId: "writer:sky-placement",
      runtimeRegistered: false,
      judgeLane: "judge:sky-placement",
      rule: "Write and self-edit first. Terra-low judges only after authorship audit."
    },
    surfaceContract: compactContract(),
    astrologyFacts: {
      meaning: normalizedFacts.meaning,
      authoringLayer: normalizedFacts.authoringLayer,
      tier: normalizedFacts.tier,
      policy: "These checked-in meaning fields bound interpretation. Historical voice excerpts never supply dates, degrees, or runtime facts."
    },
    positiveExamples: positiveExamples.map(({ entry, score, reasons }) => ({ ...entry, retrievalScore: score, selectionReasons: reasons })),
    contrastiveEdits: contrastiveEdits.map(({ record, score, reasons }) => ({ ...record, retrievalScore: score, selectionReasons: reasons })),
    negativeExamples: negativeExamples.map(({ record, score, reasons }) => ({ ...record, retrievalScore: score, selectionReasons: reasons })),
    vocabularySource: "packages/astro-knowledge/voice/tldr-astro/owner-vocabulary-bank.json",
    bannedPatternSource: "packages/astro-knowledge/voice/banned-constructions.json",
    currentCandidate: candidate ? {
      candidateId: candidate.candidateId || candidate.sourceId,
      sourcePath: candidate.sourcePath,
      article: candidate.article,
      governance: {
        reviewStatus: candidate.reviewStatus || candidate.status || "needs_review",
        ownerApproved: candidate.ownerApproved === true,
        promotionAuthorized: candidate.promotionAuthorized === true,
        canonical: candidate.canonical === true
      }
    } : null,
    governance: {
      mayChangeOwnerApproval: false,
      mayPromote: false,
      mayChangeModelRegistry: false,
      mayUseThirdPartyAsVoiceEvidence: false,
      mayUseCalibrationOnlyV3AsGenerationEvidence: false,
      surfaceCompatibilityNote: "Published owner examples from older surfaces may contain second person. They guide diction and pressure-consequence logic only; the Current Sky surface contract remains controlling."
    }
  };
}

function renderMarkdown(packet) {
  const lines = [
    `# Marie Satori writing packet`,
    ``,
    `Target: ${packet.target.planet} in ${packet.target.sign}; beat=${packet.target.beat}`,
    `Goal: ${packet.target.goal || "complete article authorship pass"}`,
    `Writer lane: ${packet.writerLane.laneId} (registry activation: ${packet.writerLane.runtimeRegistered ? "yes" : "no"})`,
    ``,
    `## Exact astrology boundary`,
    ``,
    `- Source: ${packet.astrologyFacts.meaning.source}`,
    `- Meaning: ${packet.astrologyFacts.meaning.body}`,
    `- Gift: ${packet.astrologyFacts.meaning.gift || "not supplied"}`,
    `- Challenge: ${packet.astrologyFacts.meaning.challenge || "not supplied"}`,
    ``,
    `## Positive owner evidence`,
    ``
  ];
  packet.positiveExamples.forEach((entry, index) => lines.push(
    `### ${index + 1}. ${entry.sourceId}`,
    ``,
    `Selected because: ${entry.selectionReasons.join(", ") || "highest governed owner-authority match"}.`,
    `Source: ${entry.sourcePath}`,
    `Authority: ${entry.authorityClass}`,
    ``,
    entry.text,
    ``
  ));
  lines.push(`## Contrastive owner edits`, ``);
  packet.contrastiveEdits.forEach((entry, index) => lines.push(
    `### ${index + 1}. ${entry.id}`,
    ``,
    `Selected because: ${entry.selectionReasons.join(", ")}.`,
    `Failure tags: ${entry.failureTags.join(", ")}.`,
    `Before: ${entry.before}`,
    `After: ${entry.after}`,
    `Reason: ${entry.ownerReason}`,
    ``
  ));
  lines.push(`## Directly relevant failures`, ``);
  packet.negativeExamples.forEach((entry, index) => lines.push(
    `### ${index + 1}. ${entry.id}`,
    ``,
    `Selected because: ${entry.selectionReasons.join(", ")}.`,
    `Text: ${entry.text}`,
    `Why it fails: ${entry.reason}`,
    ``
  ));
  lines.push(
    `## Current candidate`,
    ``,
    packet.currentCandidate ? `Source: ${packet.currentCandidate.sourcePath}\n\n${JSON.stringify(packet.currentCandidate.article, null, 2)}` : "No current candidate supplied.",
    ``,
    `## Governance`,
    ``,
    `This packet cannot grant approval, promote content, alter model routing, or treat calibration-only v3 as generation evidence.`,
    ``,
    packet.governance.surfaceCompatibilityNote
  );
  return `${lines.join("\n")}\n`;
}

function main() {
  const options = parseArgs();
  const packet = buildPacket(options);
  const outDir = options.outDir
    ? path.resolve(repoRoot, options.outDir)
    : path.join(packageRoot, "out", "marie-satori-writer", `${options.planet}-${options.sign}-${options.beat || "article"}`);
  fs.mkdirSync(outDir, { recursive: true });
  const jsonPath = path.join(outDir, "packet.json");
  const markdownPath = path.join(outDir, "packet.md");
  fs.writeFileSync(jsonPath, `${JSON.stringify(packet, null, 2)}\n`);
  fs.writeFileSync(markdownPath, renderMarkdown(packet));
  console.log(`Packet: ${path.relative(repoRoot, jsonPath)}`);
  console.log(`Report: ${path.relative(repoRoot, markdownPath)}`);
  console.log(`Selected ${packet.positiveExamples.length} positive, ${packet.contrastiveEdits.length} contrastive, and ${packet.negativeExamples.length} negative examples.`);
}

module.exports = { buildPacket, parseArgs, rankedContrastive, rankedNegatives, rankedPositive, renderMarkdown };

if (require.main === module) {
  try { main(); } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  }
}
