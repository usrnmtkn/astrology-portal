#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");

const packageRoot = path.resolve(__dirname, "..");
const configPath = path.join(packageRoot, "config", "timing-warmth-harvest-v1.json");
const timingPath = path.join(packageRoot, "data", "timing", "timing-event-sources-v9.json");
const voiceIndexPath = path.join(packageRoot, "voice", "tldr-astro", "satori-writer", "voice-index.json");
const vocabularyPath = path.join(packageRoot, "voice", "tldr-astro", "owner-vocabulary-bank.json");
const bannedWordsPath = path.join(packageRoot, "voice", "banned-words.json");
const bannedPhrasesPath = path.join(packageRoot, "voice", "tldr-astro", "banned-phrases.json");
const { passageHasRetrievalExclusion } = require("./banned-word-policy.js");

class TimingWarmthSourceGapError extends Error {
  constructor(code, detail) {
    super(`${code}: ${detail}`);
    this.name = "TimingWarmthSourceGapError";
    this.code = code;
    this.detail = detail;
    this.editorialStatus = "needs_review";
    this.serving = false;
  }
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function words(value) {
  return String(value || "").toLowerCase().match(/[a-z]+(?:['’][a-z]+)?/gu) || [];
}

function sentences(value) {
  return [...new Intl.Segmenter("en", { granularity: "sentence" }).segment(String(value || ""))]
    .map((entry) => entry.segment.trim())
    .filter(Boolean);
}

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

function timingPhase(request) {
  if (request.eventFamily === "lunation") return request.phase;
  if (request.eventFamily === "ingress") return "ingress";
  return request.phase || "";
}

function sourceFamilyFor(request) {
  const phase = timingPhase(request);
  if (request.eventFamily === "lunation") return "lunation";
  if (request.eventFamily === "ingress") return "season-ingress";
  if (phase === "cazimi") return "cazimi";
  if (phase === "station-direct" || phase === "post-shadow") return "direct-station";
  if (request.planet === "mercury") return "mercury-retrograde";
  if (request.planet === "venus") return "venus-retrograde";
  return "retrograde-station";
}

function timingRecordFor(request, timingCollection) {
  if (request.eventFamily === "lunation") {
    const meaningNote = String(request.lunationMeaning || "").trim();
    return meaningNote ? {
      id: `src.timing.lunation.${request.phase}.${request.sign}`,
      meaningNote,
      scenes: request.lunationScenes || "",
      status: "REVIEWED",
      serving: false,
      syntheticFromApprovedMacro: true
    } : null;
  }
  return timingCollection.sourceRecords.find((record) => record.id === request.sourceId) || null;
}

function nameEmotionalCore(record) {
  if (!record || record.status !== "REVIEWED" || record.serving !== false) {
    throw new TimingWarmthSourceGapError("TIMING_MEANING_UNAVAILABLE", "A reviewed, non-serving V9 timing record is required.");
  }
  const core = String(record.meaningNote || "")
    .replace(/\bGoverned constraint,[\s\S]*$/iu, "")
    .replace(/\bDo not claim[\s\S]*$/iu, "")
    .replace(/\bInterpretive(?:, not predictive)?\.?[\s\S]*$/iu, "")
    .replace(/\bPlanet meaning supplies content\.?[\s\S]*$/iu, "")
    .trim()
    .replace(/[.;:]$/u, "");
  const coreWords = words(core).filter((word) => !new Set([
    "the", "a", "an", "and", "or", "of", "to", "in", "on", "for", "with", "is", "are", "as", "this", "that", "traditionally", "structurally"
  ]).has(word));
  if (coreWords.length < 4) {
    throw new TimingWarmthSourceGapError("EMOTIONAL_CORE_UNNAMED", `Timing record ${record.id} needs an editorially nameable emotional core.`);
  }
  return core;
}

function sourceMatchesFamily(entry, request, familyPatterns) {
  const sourcePath = String(entry.sourcePath || "").toLowerCase();
  if (!familyPatterns.some((pattern) => sourcePath.includes(pattern.toLowerCase()))) return false;
  if (request.eventFamily === "ingress") {
    return sourcePath.includes(`${String(request.sign || "").toLowerCase()}-season`);
  }
  if (request.eventFamily === "lunation") {
    const sign = String(request.sign || "").toLowerCase();
    const phaseNeedle = request.phase === "new-moon" ? "new-moon" : "full-moon";
    return sourcePath.includes(sign) && (sourcePath.includes(phaseNeedle) || sourcePath.includes("eclipse"));
  }
  return true;
}

function bannedLexicon() {
  const bannedWords = readJson(bannedWordsPath).bannedWords;
  const bannedPhrases = readJson(bannedPhrasesPath).map((entry) => String(entry).toLowerCase());
  return { bannedWords, bannedPhrases };
}

function survivesBanList(line, lexicon) {
  const normalized = line.toLowerCase();
  if (passageHasRetrievalExclusion(line, lexicon.bannedWords)) return false;
  if (lexicon.bannedPhrases.some((phrase) => phrase !== "em dashes" && normalized.includes(phrase))) return false;
  return !line.includes("—") && !/\bpeople\b/iu.test(line);
}

function isTurnTowardReader(line) {
  const namesFeeling = /\b(?:feel|feels|feeling|fear|afraid|exhausted|tired|hurt|safe|unsafe|worthy|worth|need|needs|want|wants|trust|rest|vulnerable|human|alone|uncertain|confused|overwhelmed)\b/iu.test(line);
  const givesPermission = /\b(?:allowed to|do not have to|don't have to|does not have to|can|cannot|need not|let yourself|deserve|permission|it is okay|it's okay)\b/iu.test(line);
  const speaksFromInside = /\b(?:you|your|yours|yourself|we|our|ours|ourselves|us)\b/iu.test(line);
  return givesPermission || (namesFeeling && speaksFromInside);
}

function containsMovingFact(line) {
  return /(?:\b(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\b|\b\d{4}\b|\d+°|\b\d{1,2}:\d{2}\b)/u.test(line);
}

function containsPersonalChartClaim(line) {
  return /\b(?:1st|2nd|3rd|[4-9]th|1[0-2]th) house\b/iu.test(line);
}

function conflictsWithPhase(line, request) {
  const phase = timingPhase(request);
  if (phase === "station-direct" || phase === "post-shadow") return /\bretrograde\b/iu.test(line);
  if (["pre-shadow", "station-retrograde", "retrograde-passage"].includes(phase)) {
    return /\b(?:stations? direct|direct motion|moves? forward|moving forward|forward motion)\b/iu.test(line);
  }
  if (phase === "new-moon") return /\bfull moon\b/iu.test(line);
  if (phase === "full-moon") return /\bnew moon\b/iu.test(line);
  return false;
}

function minimallyCollectivize(line) {
  const objectYou = /\b(for|to|with|from|about|around|through|without|against|behind|beside|between|by|using|make|makes|made|want|wants|wanted|need|needs|needed|let|lets|allow|allows|allowed|ask|asks|asked|remind|reminds|reminded|give|gives|gave|help|helps|helped|see|sees|saw|hear|hears|heard|keep|keeps|kept|find|finds|found|meet|meets|met|support|supports|supported|drain|drains|drained|impress|impresses|impressed|encourage|encourages|encouraged|invite|invites|invited|teach|teaches|taught|show|shows|showed|force|forces|forced|require|requires|required|urge|urges|urged|tell|tells|told|lead|leads|led)\s+you\b/giu;
  const replacements = [
    [/\byou['’]re\b/giu, "we are"],
    [/\byou['’]ve\b/giu, "we have"],
    [/\byou['’]ll\b/giu, "we will"],
    [/\byou['’]d\b/giu, "we would"],
    [/\byourself\b/giu, "ourselves"],
    [/\byourselves\b/giu, "ourselves"],
    [/\byours\b/giu, "ours"],
    [/\byour\b/giu, "our"]
  ];
  let result = line.replace(/\b(anyone|someone|everyone|no one|nobody) but you\b/giu, (_match, subject) => `${subject} but us`);
  result = result.replace(objectYou, (_match, prefix) => `${prefix} us`);
  for (const [pattern, replacement] of replacements) result = result.replace(pattern, replacement);
  result = result.replace(/\byou\b/giu, "we");
  result = result.replace(/\bwe are a human being\b/giu, "we are human");
  return result.replace(/^we\b/u, "We");
}

function signaturePhrases() {
  const bank = readJson(vocabularyPath);
  return (bank.ownerSignaturePhrases || []).map((entry) => typeof entry === "string" ? entry : entry.phrase).filter(Boolean);
}

function searchTermsFor(request, core, config) {
  const stop = new Set([
    "about", "collective", "during", "existing", "full", "made", "make", "meaning", "motion", "point", "rather", "some", "structurally", "subject", "supplies", "take", "takes", "than", "that", "this", "through", "traditionally", "under", "until", "what", "when", "window", "with", "period", "sign", "style"
  ]);
  const coreTerms = words(core).filter((term) => term.length >= 4 && !stop.has(term));
  return unique([
    ...(config.phaseSearchTerms[timingPhase(request)] || []),
    ...coreTerms,
    String(request.planet || "").toLowerCase(),
    String(request.sign || "").toLowerCase()
  ]);
}

function scoreLine(line, searchTerms, vb005) {
  const normalized = line.toLowerCase();
  const lineWords = new Set(words(line));
  let score = 0;
  for (const term of searchTerms) {
    if (!term) continue;
    if (lineWords.has(term) || normalized.includes(term)) score += term.length >= 7 ? 3 : 2;
  }
  if (/\b(?:allowed to|do not have to|don't have to|deserve|permission)\b/iu.test(line)) score += 4;
  if (/\b(?:you|your|we|our|us)\b/iu.test(line)) score += 2;
  const signatureMatches = vb005.filter((phrase) => normalized.includes(String(phrase).toLowerCase()));
  score += signatureMatches.length * 3;
  return { score, signatureMatches };
}

function sourceArticleId(sourceId) {
  return String(sourceId || "").replace(/:(?:p|e)\d+$/u, "");
}

function selectFoundationLines(request, core, config, voiceIndex) {
  const family = sourceFamilyFor(request);
  const patterns = config.sourceFamilies[family];
  if (!patterns) throw new TimingWarmthSourceGapError("SOURCE_FAMILY_UNMAPPED", `No owner source family is mapped for ${family}.`);
  const searchTerms = searchTermsFor(request, core, config);
  const lexicon = bannedLexicon();
  const vb005 = signaturePhrases();
  const candidates = [];

  for (const entry of voiceIndex.entries || []) {
    if (entry.authorityClass !== "owner_authored_final" || entry.ownerAuthored !== true) continue;
    if (!sourceMatchesFamily(entry, request, patterns)) continue;
    for (const originalLine of sentences(entry.text)) {
      const wordCount = words(originalLine).length;
      if (
        wordCount < 6
        || wordCount > 42
        || containsMovingFact(originalLine)
        || containsPersonalChartClaim(originalLine)
        || conflictsWithPhase(originalLine, request)
      ) continue;
      if (!isTurnTowardReader(originalLine) || !survivesBanList(originalLine, lexicon)) continue;
      const normalizedLine = originalLine.toLowerCase();
      const relevanceTerms = searchTerms.filter((term) => ![request.planet, request.sign].includes(term));
      if (!relevanceTerms.some((term) => normalizedLine.includes(term))) continue;
      const scored = scoreLine(originalLine, searchTerms, vb005);
      if (scored.score < 2) continue;
      const usedForm = minimallyCollectivize(originalLine);
      if (/\b(?:you|your|yours|yourself|yourselves|people)\b/iu.test(usedForm)) continue;
      if (/\b(?:encourages|asks|allows|invites|teaches|shows|forces|requires|urges|tells|reminds|helps|gives) we\b/iu.test(usedForm)) continue;
      candidates.push({
        sourceArticleId: sourceArticleId(entry.sourceId),
        sourceEntryId: entry.sourceId,
        sourcePath: entry.sourcePath,
        originalLine,
        usedForm,
        adaptation: originalLine === usedForm ? "verbatim_collective" : "minimal_collectivization",
        vb005Matches: scored.signatureMatches,
        matchedTerms: searchTerms.filter((term) => normalizedLine.includes(term)),
        score: scored.score
      });
    }
  }

  candidates.sort((first, second) => second.score - first.score || first.originalLine.length - second.originalLine.length || first.sourceEntryId.localeCompare(second.sourceEntryId));
  const selected = [];
  const seen = new Set();
  for (const candidate of candidates) {
    const key = candidate.originalLine.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    selected.push(candidate);
    if (selected.length >= config.maxFoundationLines) break;
  }
  if (selected.length === 0) {
    throw new TimingWarmthSourceGapError("OWNER_FOUNDATION_UNAVAILABLE", `No qualifying owner turn survived for ${request.sourceId || request.eventFamily}.`);
  }
  return { family, searchTerms, candidates: selected };
}

function vocabularyOnly(selected, searchTerms) {
  const candidateWords = selected.flatMap((candidate) => words(candidate.usedForm));
  return unique(searchTerms.filter((term) => candidateWords.includes(term))).slice(0, 12);
}

function buildTimingWarmthPacket(request, options = {}) {
  if (request.eventFamily === "ingress" && String(request.planet || "").toLowerCase() === "moon") return null;
  const config = options.config || readJson(configPath);
  const timingCollection = options.timingCollection || readJson(timingPath);
  const voiceIndex = options.voiceIndex || readJson(voiceIndexPath);
  const timingRecord = timingRecordFor(request, timingCollection);
  const emotionalCore = nameEmotionalCore(timingRecord);
  const selection = selectFoundationLines(request, emotionalCore, config, voiceIndex);
  const preview = request.mode === "preview";
  const ownerFoundationLines = preview ? [] : selection.candidates.map(({ score, ...candidate }) => candidate);

  return {
    schemaVersion: 2,
    packetType: "current-sky-timing-event",
    status: "needs_review",
    serving: false,
    event: {
      sourceId: timingRecord.id,
      eventFamily: request.eventFamily,
      phase: timingPhase(request),
      planet: request.planet || null,
      sign: request.sign || null
    },
    emotionalCore: {
      name: emotionalCore,
      source: request.eventFamily === "lunation" ? "approved-lunation-macro" : "v9-timing-meaning-record",
      meaningNote: timingRecord.meaningNote,
      scenes: timingRecord.scenes || ""
    },
    harvest_mode: preview ? "vocabulary_only" : "foundation_line",
    ownerSourceFamily: selection.family,
    ownerFoundationInstruction: preview ? null : config.fullCardInstruction,
    ownerFoundationLines,
    ownerVocabulary: preview ? vocabularyOnly(selection.candidates, selection.searchTerms) : [],
    provenance: {
      evidenceClass: config.evidenceClass,
      meaningSourceId: timingRecord.id,
      warmthCandidates: selection.candidates.map((candidate) => ({
        sourceArticleId: candidate.sourceArticleId,
        sourceEntryId: candidate.sourceEntryId,
        sourcePath: candidate.sourcePath,
        originalLine: candidate.originalLine,
        usedForm: candidate.usedForm
      }))
    },
    cardMetadataContract: {
      label: "owner-corpus-derived",
      warmthSource: {
        requiredWhenFoundationUsed: true,
        fields: ["sourceArticleId", "originalLine", "usedForm"]
      },
      adjacentMeaningProvenanceUnchanged: true,
      approvalGatesUnchanged: true
    },
    scale: preview ? {
      addedWarmthBeats: 0,
      instruction: "Use the harvest as vocabulary guidance only. Do not add a warmth sentence."
    } : {
      maxWarmthBeats: 1,
      placement: "Second paragraph, after the phase pressure or cost is named and before the close.",
      stackedEndingFails: true
    }
  };
}

function timingJudgeInstructions() {
  return [
    "The card's turn toward the reader must trace to the supplied owner foundation lines when present.",
    "Invented permission or reassurance in place of supplied material scores 2; no turn at all when foundation lines were supplied scores 2.",
    "Verbatim use of a supplied owner line is never copying.",
    "The warmth line must match the PHASE's core; a station-direct reassurance on a station-retrograde card is a phase mismatch and scores 1.",
    "A full timing card may use one supplied warmth beat in paragraph two after the pressure or cost is named. Two warmth beats or a warmth beat followed by a second conclusion fails stacked-ending.",
    "A preview packet with harvest_mode vocabulary_only must not add a warmth beat."
  ];
}

module.exports = {
  TimingWarmthSourceGapError,
  bannedLexicon,
  buildTimingWarmthPacket,
  minimallyCollectivize,
  nameEmotionalCore,
  survivesBanList,
  timingJudgeInstructions
};
