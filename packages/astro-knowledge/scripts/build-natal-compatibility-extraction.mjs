#!/usr/bin/env node

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(HERE, "../../..");
const COMPATIBILITY_PATH = path.join(REPO_ROOT, "tldr-astro-phrasebank/phrasebank/cc-compatibility-writeups.json");
const MOON_LIBRARY_PATH = path.join(REPO_ROOT, "tldr-astro-phrasebank/phrasebank/moon-compatibility-library.json");
const SERVING_SOURCE_PATH = path.join(REPO_ROOT, "apps/web/src/content/fallbackArchitectureV3/source-rows/fallback-source-rows-v3.json");
const MANIFEST_PATH = path.join(REPO_ROOT, "packages/astro-knowledge/review/natal-compatibility-evidence-manifest-v1.json");
const MOON_REVIEW_PATH = path.join(REPO_ROOT, "packages/astro-knowledge/review/natal-moon-compatibility-derived-review-v1.json");

const PLANETS = ["sun", "moon", "mercury", "venus", "mars", "jupiter", "saturn"];
const SIGNS = ["aries", "taurus", "gemini", "cancer", "leo", "virgo", "libra", "scorpio", "sagittarius", "capricorn", "aquarius", "pisces"];

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function sha256(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function title(value) {
  return value.replace(/(^|[-\s])\p{L}/gu, (letter) => letter.toUpperCase());
}

function sentenceList(text) {
  return String(text).trim().split(/(?<=[.!?])\s+/u).map((value) => value.trim()).filter(Boolean);
}

function stripChildhoodHistory(text) {
  const sentences = sentenceList(text);
  const historyIndex = sentences.findIndex((sentence) => /^What happened growing up shaped how /u.test(sentence));
  if (historyIndex < 0) throw new Error("Expected the explicit growing-up bridge in compatibility source material.");
  if (!/^If /u.test(sentences[historyIndex + 1] ?? "")) throw new Error("Expected the childhood hypothesis immediately after the growing-up bridge.");
  const removed = sentences.slice(historyIndex, historyIndex + 2);
  const retained = [...sentences.slice(0, historyIndex), ...sentences.slice(historyIndex + 2)];
  const candidate = retained.join(" ").replace(/\bwhether\b/giu, "if");
  if (/\b(?:grew up|growing up|childhood|people who raised|adults around|in your house)\b/iu.test(candidate)) {
    throw new Error(`Childhood/history language survived the extraction: ${candidate}`);
  }
  if (/\bwhether\b/iu.test(candidate)) throw new Error("The natal candidate still contains forbidden whether language.");
  return { candidate, removed };
}

function distinct(values) {
  return [...new Set(values)];
}

function paragraphs(text) {
  return String(text).trim().split(/\n\n+/u).map((value) => value.trim()).filter(Boolean);
}

const compatibilityBytesBefore = fs.readFileSync(COMPATIBILITY_PATH);
const moonBytesBefore = fs.readFileSync(MOON_LIBRARY_PATH);
const compatibility = JSON.parse(compatibilityBytesBefore);
const moonLibrary = JSON.parse(moonBytesBefore);
const servingSource = readJson(SERVING_SOURCE_PATH);

if (moonLibrary.length !== 144) throw new Error(`Expected 144 Moon compatibility rows, found ${moonLibrary.length}.`);

const evidenceRows = [];
for (const planet of PLANETS) {
  const functions = [];
  for (const sign of SIGNS) {
    const cards = Object.values(compatibility.cards?.[planet]?.[sign] ?? {});
    if (cards.length !== 12) throw new Error(`Expected 12 compatibility cards for ${planet}|${sign}, found ${cards.length}.`);
    const yourLines = distinct(cards.filter((card) => !card.same_sign).map((card) => card.your_line).filter(Boolean));
    const theirLines = distinct(cards.filter((card) => !card.same_sign).map((card) => card.their_line).filter(Boolean));
    const cardFunctions = distinct(cards.map((card) => card.function).filter(Boolean));
    if (yourLines.length !== 1 || theirLines.length !== 11 || cardFunctions.length !== 1) {
      throw new Error(`Unexpected compatibility evidence shape for ${planet}|${sign}.`);
    }
    functions.push(cardFunctions[0]);
    evidenceRows.push({
      runtimeKey: `${planet}|${sign}`,
      planet,
      sign,
      sourcePath: path.relative(REPO_ROOT, COMPATIBILITY_PATH),
      sourceStatus: cards[0].status,
      sourceTier: cards[0].tier,
      youEvidence: yourLines[0],
      youEvidenceSha256: sha256(yourLines[0]),
      friendEvidenceVariants: theirLines,
      friendEvidenceEligibleForNatalDrafting: false,
      friendEvidenceNote: "The cc compatibility generator declares these lines pronoun-shifted. They are retained as reference only and may not seed Friend natal passages.",
    });
  }
  if (distinct(functions).length !== 1) throw new Error(`Compatibility function drift for ${planet}.`);
}

const planetIntros = PLANETS.map((planet) => {
  const intros = distinct(SIGNS.flatMap((sign) => Object.values(compatibility.cards[planet][sign]).map((card) => card.function)));
  if (intros.length !== 1) throw new Error(`Expected one compatibility intro for ${planet}, found ${intros.length}.`);
  return { planet, intro: intros[0], introSha256: sha256(intros[0]), sourcePath: path.relative(REPO_ROOT, COMPATIBILITY_PATH) };
});

const moonIntros = distinct(moonLibrary.map((row) => paragraphs(row.text)[0]));
if (moonIntros.length !== 1) throw new Error(`Expected one Moon library intro, found ${moonIntros.length}.`);

const servingByRuntimeKey = new Map(servingSource.hookRows
  .filter((row) => row.runtime_key && /^placement-sign-lived$/u.test(row.runtime_family ?? ""))
  .map((row) => [row.runtime_key, row]));

const moonRows = SIGNS.map((sign) => {
  const signTitle = title(sign);
  const readerParagraphs = distinct(moonLibrary
    .filter((row) => row.reader_moon === signTitle && row.other_moon !== signTitle)
    .map((row) => paragraphs(row.text)[1]));
  const friendParagraphs = distinct(moonLibrary
    .filter((row) => row.other_moon === signTitle && row.reader_moon !== signTitle)
    .map((row) => paragraphs(row.text)[2]));
  if (readerParagraphs.length !== 1 || friendParagraphs.length !== 1) {
    throw new Error(`Expected one stable You and Friend Moon paragraph for ${sign}.`);
  }
  const you = stripChildhoodHistory(readerParagraphs[0]);
  const friend = stripChildhoodHistory(friendParagraphs[0]);
  const friendCandidate = friend.candidate
    .replaceAll("{{other_name}}", "{{name}}")
    .replaceAll("{friend}", "{{name}}");
  if (/\b(?:you|your|yours|yourself|you're|you'll|you'd)\b/iu.test(friendCandidate)) {
    throw new Error(`Second-person leakage in Friend Moon candidate ${sign}.`);
  }
  const serving = servingByRuntimeKey.get(`moon|${sign}`);
  const renderedYou = `${moonIntros[0]}\n\n${you.candidate}`;
  const renderedFriend = friendCandidate.replaceAll("{{name}}", "Name");
  return {
    runtimeKey: `moon|${sign}`,
    planet: "moon",
    sign,
    sourcePath: path.relative(REPO_ROOT, MOON_LIBRARY_PATH),
    sourceFileSha256: sha256(moonBytesBefore),
    sourceYouParagraphSha256: sha256(readerParagraphs[0]),
    sourceFriendParagraphSha256: sha256(friendParagraphs[0]),
    intro: moonIntros[0],
    introSha256: sha256(moonIntros[0]),
    currentApprovedYouCopy: serving?.body ?? "",
    currentApprovedYouCopySha256: serving?.body ? sha256(serving.body) : "",
    youCandidate: you.candidate,
    youCandidateSha256: sha256(you.candidate),
    youRemovedHistorySentences: you.removed,
    friendSourceExcerpt: friendCandidate,
    friendSourceExcerptSha256: sha256(friendCandidate),
    friendRemovedHistorySentences: friend.removed,
    renderedYou,
    renderedYouSha256: sha256(renderedYou),
    renderedFriend,
    renderedFriendSha256: sha256(renderedFriend),
    reviewStatus: "needs_review",
    ownerApproved: false,
    servingAuthorized: false,
    ownerYouVerdict: "",
    ownerYouEdit: "",
    friendAuthoringStatus: "evidence_only_requires_separate_observer_entry_authoring",
  };
});

if (moonRows.length !== 12) throw new Error("Expected 12 Moon sign review rows.");
if (fs.readFileSync(COMPATIBILITY_PATH).compare(compatibilityBytesBefore) !== 0) throw new Error("Compatibility source changed during read-only extraction.");
if (fs.readFileSync(MOON_LIBRARY_PATH).compare(moonBytesBefore) !== 0) throw new Error("Moon compatibility library changed during read-only extraction.");

const manifest = {
  schema: "tldr-natal-compatibility-evidence-manifest/v1",
  createdAt: "2026-08-20",
  governance: {
    extractionOnly: true,
    compatibilitySourcesReadOnly: true,
    natalCandidatesOnly: true,
    servesDirectly: false,
    autoPublish: false,
    writerPromotion: false,
  },
  sourceFiles: [
    { path: path.relative(REPO_ROOT, COMPATIBILITY_PATH), sha256: sha256(compatibilityBytesBefore), byteLength: compatibilityBytesBefore.length },
    { path: path.relative(REPO_ROOT, MOON_LIBRARY_PATH), sha256: sha256(moonBytesBefore), byteLength: moonBytesBefore.length },
  ],
  counts: {
    planetIntros: planetIntros.length,
    youPlanetSignEvidenceRows: evidenceRows.length,
    friendReferenceVariantCount: evidenceRows.reduce((sum, row) => sum + row.friendEvidenceVariants.length, 0),
    moonPilotYouCandidates: moonRows.length,
    moonPilotFriendEvidenceRows: moonRows.length,
  },
  exclusions: [
    "relationship synthesis",
    "compatibility verdicts",
    "match labels",
    "childhood, parental, attachment, and growing-up hypotheses",
    "pronoun-shifted Friend evidence from cc-compatibility-writeups.json",
  ],
  planetIntros,
  evidenceRows,
};

const moonReview = {
  schema: "tldr-natal-moon-compatibility-derived-review/v1",
  createdAt: "2026-08-20",
  governance: {
    reviewGatedCandidates: true,
    readerCopyApproved: false,
    servingChanges: false,
    compatibilityChanges: false,
    autoPublish: false,
    writerPromotion: false,
    selfAndFriendReviewedSeparately: true,
    friendCompatibilityParagraphsEvidenceOnly: true,
    friendObserverEntryAuthoringStillRequired: true,
  },
  sourceManifest: path.relative(REPO_ROOT, MANIFEST_PATH),
  compatibilitySourceHashes: manifest.sourceFiles,
  counts: {
    rows: moonRows.length,
    youCandidates: moonRows.length,
    friendCandidates: 0,
    friendEvidenceRows: moonRows.length,
    childhoodHistorySentencesRemoved: moonRows.reduce((sum, row) => sum + row.youRemovedHistorySentences.length + row.friendRemovedHistorySentences.length, 0),
    ownerVerdicts: 0,
    servingRowsChanged: 0,
  },
  rows: moonRows,
};

fs.writeFileSync(MANIFEST_PATH, `${JSON.stringify(manifest, null, 2)}\n`);
fs.writeFileSync(MOON_REVIEW_PATH, `${JSON.stringify(moonReview, null, 2)}\n`);
console.log(`Built ${evidenceRows.length} natal evidence rows, ${moonRows.length} Moon You candidates, and ${moonRows.length} Friend evidence rows; compatibility sources unchanged.`);
