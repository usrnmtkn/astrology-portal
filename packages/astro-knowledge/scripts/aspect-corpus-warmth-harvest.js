"use strict";

const fs = require("fs");
const path = require("path");

const packageRoot = path.join(__dirname, "..");
const repoRoot = path.join(packageRoot, "..", "..");
const corpusRoot = path.join(packageRoot, "voice", "tldr-astro", "fixtures", "sky-article-longform");
const referenceRoot = path.join(corpusRoot, "owner-corpus", "reference-surfaces");
const vocabularyPath = path.join(packageRoot, "voice", "tldr-astro", "owner-vocabulary-bank.json");
const bannedWordsPath = path.join(packageRoot, "voice", "banned-words.json");
const bannedPhrasesPath = path.join(packageRoot, "voice", "tldr-astro", "banned-phrases.json");
const { passageHasRetrievalExclusion } = require("./banned-word-policy.js");

const FULL_CARD_INSTRUCTION = "Adapt one of these into the card where it lands naturally, keeping its meaning and register. Verbatim is preferred when it fits. Use at most one.";
const WARMTH_PLACEMENT_INSTRUCTION = "Use one warmth sentence after the shadow or cost is named. It must be the final sentence or the sentence before it. Do not add a second conclusion.";
const OWNER_CORPUS_WARMTH_NONE_FOUND_FLAG = Object.freeze({
  id: "owner-corpus-warmth-none-found",
  severity: "info",
  blocking: false,
  reason: "No qualifying owner-corpus warmth line is available for this core. Revisit if future owner writing covers it; do not invent imitation warmth."
});
const MISSING_HUMAN_MOMENT_BEAT_FLAG = Object.freeze({
  id: "missing-human-moment-beat",
  severity: "editorial",
  blocking: true,
  reason: "Aspect entry has no human-moment beat. This is editorial data completeness; flag for editorial work. Do not request new owner prose."
});

const COLLECTIVE_SURFACES = new Set([
  "current-sky",
  "sky",
  "sky-aspect",
  "sky-exact-aspect"
]);

const SECOND_PERSON_SURFACES = new Set([
  "natal",
  "natal-aspect",
  "synastry",
  "synastry-aspect",
  "transit-to-natal",
  "transit-to-natal-aspect"
]);

const FEELING_FAMILIES = [
  ["alone", "lonely", "loneliness", "isolated", "isolation", "support", "help", "held"],
  ["approval", "applause", "validation", "validated", "seen", "unseen", "recognition", "perform", "performing", "worth", "worthy", "stage"],
  ["burden", "burdened", "weak", "weakness", "need", "needs", "needing", "depend", "dependent"],
  ["burnout", "burned", "burning", "exhaustion", "exhausted", "tired", "rest", "depleted", "overwhelmed", "overwhelm"],
  ["care", "cared", "comfort", "safe", "safety", "secure", "security", "nourish", "nourished"],
  ["control", "controls", "controlled", "controlling", "force", "forced", "forcing", "trust", "trusted", "testing", "guarded", "vulnerable", "vulnerability"],
  ["fear", "afraid", "anxiety", "anxious", "worry", "worried", "uncertain", "uncertainty"],
  ["grief", "grieving", "loss", "lost", "sad", "sadness", "pain", "hurt", "wound", "wounds"],
  ["love", "loved", "belong", "belonging", "rejected", "rejection", "chosen", "connection", "connected"],
  ["peace", "harmony", "conflict", "tension", "pressure", "pressed", "strain", "strained", "limit", "breaking"],
  ["perfect", "perfection", "perfectionism", "checking", "fix", "fixing", "mistake", "wrong", "enough"],
  ["freedom", "free", "permission", "allowed", "choice", "choose", "honest", "honesty", "truth"],
  ["hope", "hopeful", "optimism", "optimistic", "encourage", "encouragement", "confidence", "confident"],
  ["anger", "angry", "rage", "frustrated", "frustration", "resentment", "resentful"],
  ["shame", "ashamed", "guilt", "guilty", "apologizing", "prove", "earning", "earn"],
  ["curious", "curiosity", "confused", "confusion", "noise", "scattered", "clarity", "clear"],
  ["heard", "hearing", "voice", "silence", "silent", "unsaid", "unsayable", "condescending", "mask", "heal", "heals", "healing", "relief", "exhale", "exhales"],
  ["inadequacy", "inadequate", "standard", "standards", "verdict", "judged", "judgment", "failure", "failed"],
  ["want", "wants", "wanted", "desire", "hunger", "hungry", "attraction", "urge", "craving", "appetite", "pleasure"],
  ["obligation", "obligations", "obligated", "cage", "compliance", "defiance", "refusal", "trapped", "restriction", "restricted", "freedom", "free", "permission", "allowed", "choice", "choose", "guilt", "guilty", "boundary", "boundaries", "responsibility", "responsible", "expectation", "expectations"],
  ["obsession", "obsessed", "power", "powerless", "banished", "banishment", "exile", "reclaim", "reclaimed", "reclamation"],
  ["past", "future", "history", "direction", "stuck", "repeat", "repeating", "return", "returning", "nostalgia", "old"],
  ["change", "changed", "disruption", "uncertainty", "certainty", "release", "released", "ending", "end", "transform", "transformation"]
];

const PERMISSION_PATTERNS = [
  /\b(?:you|we) (?:are|are not|aren't) (?:allowed|alone|wrong|weak|a burden|too much|enough|human)\b/iu,
  /\b(?:you|we) (?:do not|don't|does not|doesn't) (?:have|need) to\b/iu,
  /\b(?:you|we) (?:can|cannot|can't) (?:be|still|rest|need|want|ask|say|choose|stop|leave|change|take)\b/iu,
  /\b(?:your|our) needs? (?:matter|are|is|deserve)\b/iu,
  /\b(?:that|this|the) (?:does not|doesn't|is not|isn't) mean\b/iu,
  /\b(?:rest|love|care|support|help|worth|safety|comfort|honesty|connection) (?:does not|doesn't|can|is|isn't|should not|shouldn't)\b/iu,
  /\b(?:let yourself|let ourselves|give yourself|give ourselves|take your time|take our time)\b/iu
];

const INSIDE_FEELING_PATTERNS = [
  /\b(?:you|we|your|our)\b[^.!?]{0,100}\b(?:feel|feeling|feels|felt|exhausted|afraid|anxious|ashamed|guarded|overwhelmed|unseen|unworthy)\b/iu,
  /\b(?:the|this|your|our) (?:exhaustion|burnout|pressure|pain|fear|shame|grief|loneliness|resentment)\b[^.!?]{0,100}\b(?:is|isn't|comes|came|starts|started|means|doesn't|from|because)\b/iu,
  /\b(?:worth|worthy|rest|care|support|needs?)\b[^.!?]{0,100}\b(?:earn|earned|earning|prove|proved|deserve|deserves|matter|matters|allowed|burden|weak)\b/iu,
  /\b(?:earn|earning|prove|proving)\b[^.!?]{0,100}\b(?:worth|worthy|approval|validation|rest|love|belonging)\b/iu
];

const PORTABILITY_BAN = /\b(?:transit|retrograde|eclipse|lunation|solstice|equinox|zodiac|degrees?|houses?|sun|moon|mercury|venus|mars|jupiter|saturn|uranus|neptune|pluto|chiron|lilith|aries|taurus|gemini|cancer|leo|virgo|libra|scorpio|sagittarius|capricorn|aquarius|pisces|january|february|march|april|may|june|july|august|september|october|november|december)\b/iu;

let corpusLineCache = null;
let policyCache = null;
const harvestCache = new Map();

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function words(value) {
  return String(value || "").toLowerCase().match(/[a-z0-9]+(?:'[a-z0-9]+)?/gu) || [];
}

function normalizedText(value) {
  return words(value).join(" ");
}

function sentenceSegments(value) {
  return [...new Intl.Segmenter("en", { granularity: "sentence" }).segment(String(value || ""))]
    .map(({ segment }) => segment.trim())
    .filter(Boolean);
}

function markdownToPlain(value) {
  return String(value || "")
    .replace(/^---[\s\S]*?---\s*/u, "")
    .replace(/^#{1,6}\s+.*$/gmu, "")
    .replace(/^[-*+]\s+/gmu, "")
    .replace(/\[([^\]]+)\]\([^\)]+\)/gu, "$1")
    .replace(/[*_`>#]/gu, "")
    .replace(/\s+/gu, " ")
    .trim();
}

function sourceArticleId(filePath) {
  return path.basename(filePath, path.extname(filePath));
}

function corpusFiles() {
  const referenceFiles = fs.existsSync(referenceRoot)
    ? fs.readdirSync(referenceRoot).filter((name) => name.endsWith(".md")).map((name) => path.join(referenceRoot, name))
    : [];
  const ownerEditionFiles = fs.readdirSync(corpusRoot)
    .filter((name) => /^TLDR-Article-Edition-.*-OWNER\.md$/u.test(name))
    .map((name) => path.join(corpusRoot, name));
  return [...referenceFiles, ...ownerEditionFiles].sort();
}

function ownerCorpusLines() {
  if (corpusLineCache) return corpusLineCache;
  const seen = new Set();
  const records = [];
  for (const filePath of corpusFiles()) {
    const plain = markdownToPlain(fs.readFileSync(filePath, "utf8"));
    sentenceSegments(plain).forEach((line, index) => {
      const key = normalizedText(line);
      if (!key || seen.has(key)) return;
      seen.add(key);
      records.push({
        sourceArticleId: sourceArticleId(filePath),
        sourcePath: path.relative(repoRoot, filePath).replaceAll(path.sep, "/"),
        lineIndex: index + 1,
        originalLine: line
      });
    });
  }
  corpusLineCache = records;
  return corpusLineCache;
}

function policyTerms() {
  if (policyCache) return policyCache;
  const bannedWords = readJson(bannedWordsPath);
  const vocabulary = readJson(vocabularyPath);
  policyCache = {
    globalEntries: bannedWords.bannedWords || [],
    banned: [
      ...Object.values(bannedWords.surfaceBannedWords || {}).flat().map((entry) => entry.term),
      ...readJson(bannedPhrasesPath)
    ].map((term) => String(term || "").toLowerCase()).filter(Boolean),
    signaturePhrases: (vocabulary.ownerSignaturePhrases || []).map((entry) => entry.phrase.toLowerCase())
  };
  return policyCache;
}

function passesBanList(line) {
  const lower = String(line || "").toLowerCase();
  if (lower.includes("—")) return false;
  if (passageHasRetrievalExclusion(line, policyTerms().globalEntries)) return false;
  return !policyTerms().banned.some((term) => {
    if (!term || term === "em dashes") return false;
    return new RegExp(`(?:^|[^a-z0-9])${term.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&")}(?:$|[^a-z0-9])`, "iu").test(lower);
  });
}

function feelingSearchTerms(core) {
  const coreWords = new Set(words(core));
  const terms = new Set();
  for (const family of FEELING_FAMILIES) {
    if (family.some((term) => coreWords.has(term))) family.forEach((term) => terms.add(term));
  }
  return [...terms];
}

function isTurnTowardReader(line, searchTerms) {
  const value = String(line || "").trim();
  const count = words(value).length;
  if (count < 5 || count > 60) return false;
  if (PORTABILITY_BAN.test(value) || /\?\s*$/u.test(value)) return false;
  if (![...PERMISSION_PATTERNS, ...INSIDE_FEELING_PATTERNS].some((pattern) => pattern.test(value))) return false;
  const lineWords = new Set(words(value));
  return searchTerms.some((term) => lineWords.has(term));
}

function replacePronoun(match, replacement) {
  return match === match.toUpperCase() ? replacement.toUpperCase() : /^[A-Z]/u.test(match) ? `${replacement[0].toUpperCase()}${replacement.slice(1)}` : replacement;
}

function collectivize(line) {
  return String(line || "")
    .replace(/\byourselves\b/giu, (match) => replacePronoun(match, "ourselves"))
    .replace(/\byourself\b/giu, (match) => replacePronoun(match, "ourselves"))
    .replace(/\byours\b/giu, (match) => replacePronoun(match, "ours"))
    .replace(/\byour\b/giu, (match) => replacePronoun(match, "our"))
    .replace(/\byou['’]re\b/giu, (match) => replacePronoun(match, "we're"))
    .replace(/\byou['’]ve\b/giu, (match) => replacePronoun(match, "we've"))
    .replace(/\byou['’]ll\b/giu, (match) => replacePronoun(match, "we'll"))
    .replace(/\byou['’]d\b/giu, (match) => replacePronoun(match, "we'd"))
    .replace(/\b(to|for|with|from|about|around|inside|behind|without) you\b/giu, (match, preposition) => `${preposition} us`)
    .replace(/\b(tell|tells|told|show|shows|showed|give|gives|gave|ask|asks|asked|remind|reminds|reminded|teach|teaches|taught|leave|leaves|left|make|makes|made|help|helps|helped|keep|keeps|kept|let|lets|allow|allows|allowed) you\b/giu, (match, verb) => `${verb} us`)
    .replace(/\byou\b/giu, (match) => replacePronoun(match, "we"))
    .replace(/\bour actual self\b/giu, "our actual selves");
}

function surfaceVoice(surface) {
  if (COLLECTIVE_SURFACES.has(surface)) return "collective";
  if (SECOND_PERSON_SURFACES.has(surface)) return "second_person";
  throw new Error(`Unsupported aspect surface '${surface}'.`);
}

function extractHumanMoment(entry) {
  return String(
    entry?.humanMoment
    ?? entry?.human_moment
    ?? entry?.humanMomentBeat
    ?? entry?.readerCopy?.humanMoment
    ?? entry?.readerCopy?.summary
    ?? ""
  ).trim();
}

function harvestMode(format) {
  return ["tldr-line", "short-preview", "short"].includes(format) ? "vocabulary_only" : "matched";
}

function warmthFlagIds(flags = []) {
  return flags.map((flag) => flag?.id).filter(Boolean).join(", ");
}

function scoreLine(record, searchTerms) {
  const lineWords = new Set(words(record.originalLine));
  const overlap = searchTerms.filter((term) => lineWords.has(term)).length;
  const searchSet = new Set(searchTerms);
  const signatureHits = policyTerms().signaturePhrases.filter((phrase) => (
    record.originalLine.toLowerCase().includes(phrase)
    && words(phrase).some((term) => searchSet.has(term))
  ));
  const pronounFree = !/\b(?:you|your|yours|yourself|yourselves)\b/iu.test(record.originalLine);
  return {
    score: (overlap * 20) + (signatureHits.length * 8) + (pronounFree ? 4 : 0),
    overlap,
    signatureHits,
    pronounFree
  };
}

function failedHarvest({ surface, core, flag, searchTerms = [] }) {
  return {
    schemaVersion: 1,
    status: "editorial_required",
    generationAllowed: false,
    surface,
    voice: surfaceVoice(surface),
    harvest_mode: null,
    humanMoment: core || null,
    searchTerms,
    ownerFoundationLines: [],
    flags: [flag],
    insertInstruction: null,
    placementInstruction: null
  };
}

function noFoundationHarvest({ surface, core, flag, searchTerms = [] }) {
  return {
    schemaVersion: 1,
    status: "ready",
    generationAllowed: true,
    surface,
    voice: surfaceVoice(surface),
    harvest_mode: "none_found",
    humanMoment: core,
    searchTerms,
    ownerFoundationLines: [],
    flags: [flag],
    insertInstruction: null,
    placementInstruction: null
  };
}

function buildAspectWarmthHarvest(entry, { surface = "sky-exact-aspect", format = "full-card", limit = 3 } = {}) {
  const core = extractHumanMoment(entry);
  if (!core) return failedHarvest({ surface, format, core, flag: MISSING_HUMAN_MOMENT_BEAT_FLAG });
  const cacheKey = JSON.stringify({ core, surface, format, limit });
  if (harvestCache.has(cacheKey)) return harvestCache.get(cacheKey);
  const searchTerms = feelingSearchTerms(core);
  if (!searchTerms.length) {
    const noFoundation = noFoundationHarvest({ surface, core, flag: OWNER_CORPUS_WARMTH_NONE_FOUND_FLAG });
    harvestCache.set(cacheKey, noFoundation);
    return noFoundation;
  }
  const voice = surfaceVoice(surface);
  const ranked = ownerCorpusLines()
    .filter((record) => passesBanList(record.originalLine))
    .filter((record) => isTurnTowardReader(record.originalLine, searchTerms))
    .map((record) => ({ ...record, ...scoreLine(record, searchTerms) }))
    .filter((record) => record.overlap > 0)
    .sort((left, right) => right.score - left.score || left.sourceArticleId.localeCompare(right.sourceArticleId) || left.lineIndex - right.lineIndex);
  const selected = [];
  const seenLines = new Set();
  for (const record of ranked) {
    const key = normalizedText(record.originalLine);
    if (seenLines.has(key)) continue;
    seenLines.add(key);
    const suppliedLine = voice === "collective" ? collectivize(record.originalLine) : record.originalLine;
    if (voice === "collective" && /\b(?:you|your|yours|yourself|yourselves)\b/iu.test(suppliedLine)) continue;
    selected.push({
      sourceArticleId: record.sourceArticleId,
      sourcePath: record.sourcePath,
      originalLine: record.originalLine,
      suppliedLine,
      selectionReasons: [
        `${record.overlap} emotional-core term${record.overlap === 1 ? "" : "s"}`,
        ...(record.signatureHits.length ? [`VB-005 signature phrase: ${record.signatureHits.join(", ")}`] : []),
        record.pronounFree ? "pronoun-free owner line" : voice === "collective" ? "minimally collectivized for Current Sky" : "second person retained for natal surface"
      ]
    });
    if (selected.length >= Math.max(1, Math.min(3, limit))) break;
  }
  if (!selected.length) {
    const noFoundation = noFoundationHarvest({ surface, core, flag: OWNER_CORPUS_WARMTH_NONE_FOUND_FLAG, searchTerms });
    harvestCache.set(cacheKey, noFoundation);
    return noFoundation;
  }
  const mode = harvestMode(format);
  const result = {
    schemaVersion: 1,
    status: "ready",
    generationAllowed: true,
    surface,
    voice,
    harvest_mode: mode,
    humanMoment: core,
    searchTerms,
    ownerFoundationLines: selected,
    flags: [],
    insertInstruction: mode === "matched" ? FULL_CARD_INSTRUCTION : null,
    placementInstruction: mode === "matched" ? WARMTH_PLACEMENT_INSTRUCTION : null
  };
  harvestCache.set(cacheKey, result);
  return result;
}

function similarity(left, right) {
  const leftWords = new Set(words(left));
  const rightWords = new Set(words(right));
  if (!leftWords.size || !rightWords.size) return 0;
  const overlap = [...leftWords].filter((word) => rightWords.has(word)).length;
  return overlap / Math.max(leftWords.size, rightWords.size);
}

function warmthSourceForDraft(draftText, foundationLines) {
  const sentences = sentenceSegments(draftText);
  let best = null;
  for (const foundation of foundationLines || []) {
    for (const sentence of sentences) {
      const score = similarity(sentence, foundation.suppliedLine);
      if (!best || score > best.score) best = { foundation, sentence, score };
    }
  }
  if (!best || best.score < 0.72) return null;
  return {
    sourceArticleId: best.foundation.sourceArticleId,
    originalLine: best.foundation.originalLine,
    usedForm: best.sentence
  };
}

function matchingWarmthSentences(draftText, foundationLines) {
  const sentences = sentenceSegments(draftText);
  return sentences.flatMap((sentence, index) => {
    const match = (foundationLines || [])
      .map((foundation) => ({ foundation, score: similarity(sentence, foundation.suppliedLine) }))
      .sort((left, right) => right.score - left.score)[0];
    return match?.score >= 0.72 ? [{ sentence, index, ...match }] : [];
  });
}

function lintAspectWarmthUsage(draftText, harvest) {
  const sentences = sentenceSegments(draftText);
  const matches = matchingWarmthSentences(draftText, harvest?.ownerFoundationLines || []);
  const findings = [];
  if (harvest?.generationAllowed && harvest.status === "ready" && harvest.harvest_mode === "vocabulary_only" && matches.length) {
    findings.push({ severity: "fail", field: "body", reason: "vocabulary_only packet inserted an owner foundation line" });
  }
  if (harvest?.generationAllowed && harvest.status === "ready" && harvest.harvest_mode === "matched") {
    if (matches.length > 1) {
      findings.push({ severity: "fail", field: "body", reason: `expected at most one warmth beat; found ${matches.length}` });
    }
    if (matches.length === 1 && matches[0].index < sentences.length - 2) {
      findings.push({ severity: "fail", field: "body", reason: "warmth beat must be the final or penultimate sentence" });
    }
  }
  return {
    score: findings.length ? 1 : 3,
    fails: findings.length,
    findings,
    matches: matches.map(({ sentence, index, foundation, score }) => ({
      sentence,
      sentenceIndex: index,
      sourceArticleId: foundation.sourceArticleId,
      similarity: score
    }))
  };
}

function annotateCandidateWithWarmth(candidate, harvest) {
  const draftText = String(candidate?.body ?? candidate?.draft?.body ?? candidate?.text ?? "").trim();
  const warmthSource = warmthSourceForDraft(draftText, harvest?.ownerFoundationLines || []);
  return {
    ...candidate,
    ...(warmthSource ? { warmthSource, evidenceClass: "owner-corpus-derived" } : {})
  };
}

function foundationPromptBlock(harvest) {
  if (!harvest || harvest.status !== "ready") return "";
  if (harvest.harvest_mode === "none_found") {
    return [
      "HARVEST MODE: none_found.",
      "No qualifying owner foundation line exists for this emotional core. Keep the register plain. Do not invent permission, reassurance, benediction, or a turn-toward-the-reader line. The absence of a warmth beat is acceptable."
    ].join("\n");
  }
  const lines = [
    "OWNER FOUNDATION LINES:",
    ...harvest.ownerFoundationLines.map((entry, index) => `[${index + 1}] (${entry.sourceArticleId}) ${entry.suppliedLine}`),
    ""
  ];
  if (harvest.harvest_mode === "matched") {
    lines.push(harvest.insertInstruction, harvest.placementInstruction);
  } else {
    lines.push("HARVEST MODE: vocabulary_only. Let these lines inform word choice only. Do not insert or add a warmth beat.");
  }
  return lines.join("\n");
}

module.exports = {
  COLLECTIVE_SURFACES,
  FULL_CARD_INSTRUCTION,
  MISSING_HUMAN_MOMENT_BEAT_FLAG,
  OWNER_CORPUS_WARMTH_NONE_FOUND_FLAG,
  SECOND_PERSON_SURFACES,
  WARMTH_PLACEMENT_INSTRUCTION,
  annotateCandidateWithWarmth,
  buildAspectWarmthHarvest,
  collectivize,
  extractHumanMoment,
  feelingSearchTerms,
  foundationPromptBlock,
  lintAspectWarmthUsage,
  matchingWarmthSentences,
  ownerCorpusLines,
  passesBanList,
  sentenceSegments,
  warmthFlagIds,
  warmthSourceForDraft
};
