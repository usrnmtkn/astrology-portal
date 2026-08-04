"use strict";

const path = require("path");
const bank = require(path.join("..", "voice", "tldr-astro", "owner-vocabulary-bank.json"));
const compiledPolicy = require(path.join("..", "voice", "tldr-astro", "vocabulary-policy.generated.json"));

const CURRENT_SKY_PRONOUNS = /\b(?:you|your|yours|yourself|yourselves)\b/iu;

function exclusionsForSurface(surface) {
  const policySurface = surface === "planet-article" ? "sky-placement" : surface;
  return new Set((compiledPolicy.exclusions || [])
    .filter((entry) => {
      const labels = [...(entry.scope?.surfaces || []), ...(entry.scope?.prohibited || [])];
      return labels.some((label) => [policySurface, "all-reader-copy", "all-editorial-copy", "all-generated-copy"].includes(label));
    })
    .map((entry) => String(entry.term).toLowerCase()));
}

function countTerm(text, term) {
  const escaped = String(term).replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
  return (String(text || "").match(new RegExp(`\\b${escaped}\\b`, "giu")) || []).length;
}

function normalizedStem(term) {
  const value = String(term).toLowerCase();
  if (value.length > 5 && value.endsWith("ies")) return `${value.slice(0, -3)}y`;
  return value.length > 4 && value.endsWith("s") ? value.slice(0, -1) : value;
}

function positiveWordPool() {
  const records = new Map();
  const add = (entry, lane, priority) => {
    const term = String(typeof entry === "string" ? entry : entry.term || "").toLowerCase();
    if (!term || (records.get(term)?.priority || -1) > priority) return;
    records.set(term, {
      term,
      lane,
      priority,
      frequency: Number(entry?.frequency || 0),
      articleCoverage: Number(entry?.articleCoverage || 0)
    });
  };
  bank.coreVocabulary.forEach((entry) => add(entry, "owner_core", 5));
  Object.values(bank.surfaceVocabulary || {}).forEach((surface) => (surface.terms || []).forEach((entry) => add(entry, "owner_surface", 4)));
  bank.sharedOwnerSdVocabulary.forEach((entry) => add(entry, "owner_observed_sd_overlap", 3));
  bank.sharedOwnerAcVocabulary.forEach((entry) => add(entry, "owner_observed_ac_overlap", 3));
  bank.sdLexicalAdditions.forEach((entry) => add(entry, "owner_approved_sd_word", 2));
  return [...records.values()];
}

function selectOwnerVocabulary({
  surface = "planet-article",
  planet,
  sign,
  verifiedAstrology = {},
  ownerPassages = [],
  affinityEntries = [],
  currentSky = true,
  maxWords = 10,
  maxPhrases = 3
} = {}) {
  const excluded = exclusionsForSurface(surface);
  const allowed = (term) => {
    const words = String(term).toLowerCase().match(/[a-z]+/gu) || [];
    return words.length > 0
      && words.every((word) => !excluded.has(word))
      && (!currentSky || !CURRENT_SKY_PRONOUNS.test(term));
  };
  const supportedText = (verifiedAstrology.supportedDomains || []).join(" ");
  const astrologyText = [
    verifiedAstrology.planetFunction,
    verifiedAstrology.signExpression,
    verifiedAstrology.combinedMeaning,
    verifiedAstrology.collectiveGift,
    ...(verifiedAstrology.observableShadowBehaviors || [])
  ].filter(Boolean).join(" ");
  const ownerPassageText = ownerPassages.map((entry) => entry.text).join(" ");
  const signText = affinityEntries.filter((entry) => entry.sign === sign).map((entry) => entry.text).join(" ");
  const signSeasonText = affinityEntries
    .filter((entry) => entry.sign === sign && String(entry.sourcePath || "").includes(`${sign}-season`))
    .map((entry) => entry.text)
    .join(" ");
  const planetText = affinityEntries.filter((entry) => entry.planet === planet).map((entry) => entry.text).join(" ");
  const unsupportedWords = new Set((verifiedAstrology.unsupportedDomainWarnings || [])
    .join(" ")
    .match(/\b(?:career|work|money|credit|spending|travel|education|law|houses?|natal)\b/giu)
    ?.map((term) => term.toLowerCase()) || []);
  if (unsupportedWords.has("career") || unsupportedWords.has("work")) {
    ["career", "work", "professional", "job"].forEach((term) => unsupportedWords.add(term));
  }
  if (unsupportedWords.has("money") || unsupportedWords.has("spending") || unsupportedWords.has("credit")) {
    ["money", "spending", "credit", "financial", "purchase", "purchases"].forEach((term) => unsupportedWords.add(term));
  }

  const rankedWords = positiveWordPool()
    .filter((entry) => allowed(entry.term) && !unsupportedWords.has(entry.term))
    .map((entry) => {
      const supportedHits = countTerm(supportedText, entry.term);
      const astrologyHits = countTerm(astrologyText, entry.term);
      const signSeasonHits = countTerm(signSeasonText, entry.term);
      const signHits = countTerm(signText, entry.term);
      const planetHits = countTerm(planetText, entry.term);
      const passageHits = countTerm(ownerPassageText, entry.term);
      return {
        ...entry,
        relevance: {
          supportedDomain: supportedHits,
          verifiedAstrology: astrologyHits,
          sameSignSeasonOwnerCorpus: signSeasonHits,
          sameSignOwnerCorpus: signHits,
          samePlanetOwnerCorpus: planetHits,
          selectedOwnerPassages: passageHits
        },
        score: supportedHits * 160 + astrologyHits * 100 + Math.min(signSeasonHits, 12) * 15 + Math.min(signHits, 20) * 3 + Math.min(planetHits, 20) * 2 + Math.min(passageHits, 8) * 3 + entry.priority
      };
    })
    .filter((entry) => entry.score > entry.priority)
    .sort((a, b) => b.score - a.score || b.articleCoverage - a.articleCoverage || b.frequency - a.frequency || a.term.localeCompare(b.term));
  const words = [];
  const usedStems = new Set();
  for (const entry of rankedWords) {
    const stem = normalizedStem(entry.term);
    if (usedStems.has(stem)) continue;
    words.push(entry);
    usedStems.add(stem);
    if (words.length === maxWords) break;
  }

  const phrases = (bank.ownerSignaturePhrases || [])
    .filter((entry) => allowed(entry.phrase)
      && !(String(entry.phrase).toLowerCase().match(/[a-z]+/gu) || []).some((term) => unsupportedWords.has(term)))
    .map((entry) => {
      const signSeasonHits = countTerm(signSeasonText, entry.phrase);
      const signHits = countTerm(signText, entry.phrase);
      const planetHits = countTerm(planetText, entry.phrase);
      const passageHits = countTerm(ownerPassageText, entry.phrase);
      const directTokens = String(entry.phrase).toLowerCase().match(/[a-z]+/gu) || [];
      const astrologyTokenHits = directTokens.filter((token) => countTerm(`${supportedText} ${astrologyText}`, token) > 0).length;
      return {
        phrase: entry.phrase,
        lane: "owner_signature_phrase",
        frequency: entry.frequency,
        articleCoverage: entry.articleCoverage,
        relevance: { sameSignSeasonOwnerCorpus: signSeasonHits, sameSignOwnerCorpus: signHits, samePlanetOwnerCorpus: planetHits, selectedOwnerPassages: passageHits, astrologyTokenHits },
        score: Math.min(signSeasonHits, 4) * 100 + Math.min(passageHits, 4) * 80 + Math.min(signHits, 12) * 5 + Math.min(planetHits, 12) * 4 + astrologyTokenHits * 10
      };
    })
    .filter((entry) => entry.score > 0 && (entry.relevance.sameSignSeasonOwnerCorpus > 0 || entry.relevance.selectedOwnerPassages > 0))
    .sort((a, b) => b.score - a.score || b.articleCoverage - a.articleCoverage || a.phrase.localeCompare(b.phrase))
    .slice(0, maxPhrases);

  return {
    id: `${bank.id}:placement-relevant-v1`,
    sourceBankId: bank.id,
    authority: bank.authority,
    use: "optional_menu_not_quota",
    selection: { surface, planet, sign, maxWords, maxPhrases },
    words,
    phrases
  };
}

function renderOwnerVocabularySelection(selection) {
  const words = (selection?.words || []).map((entry) => entry.term).join(", ");
  const phrases = (selection?.phrases || []).map((entry) => `“${entry.phrase}”`).join("; ");
  return [
    "APPROVED OWNER VOCABULARY (optional menu, never a quota)",
    "These choices come from the approved owner vocabulary bank and were selected for this placement. Use only what fits naturally. Do not force, stack, or repeat them.",
    words ? `Words: ${words}.` : "Words: No placement-relevant bank terms selected.",
    phrases ? `Owner phrase evidence: ${phrases}. Use sparingly and do not build the paragraph around a phrase.` : "Owner phrase evidence: None selected for this placement."
  ].join("\n");
}

function uniqueTerms(entries) {
  return [...new Set(entries.map((entry) => entry.term).filter(Boolean))];
}

function buildOwnerVocabularyPrompt({ surface = "", maxCore = 18, maxShared = 12, maxAcShared = 10, maxSdAdditions = 8, includePhrases = false, maxPhrases = 5 } = {}) {
  const excluded = exclusionsForSurface(surface);
  const allowed = (term) => !excluded.has(String(term).toLowerCase());
  const surfaceTerms = uniqueTerms(bank.surfaceVocabulary[surface]?.terms || []).filter(allowed);
  const core = uniqueTerms(bank.coreVocabulary).filter((term) => allowed(term) && !surfaceTerms.includes(term)).slice(0, maxCore);
  const shared = uniqueTerms(bank.sharedOwnerSdVocabulary)
    .filter((term) => allowed(term) && !surfaceTerms.includes(term) && !core.includes(term))
    .slice(0, maxShared);
  const sdAdditions = uniqueTerms([
    ...bank.sdLexicalAdditions.filter((entry) => entry.surfaces.includes(surface)),
    ...bank.sdLexicalAdditions.filter((entry) => entry.surfaces.includes("all"))
  ]).filter(allowed).slice(0, maxSdAdditions);
  const acShared = uniqueTerms(bank.sharedOwnerAcVocabulary)
    .filter((term) => allowed(term) && !surfaceTerms.includes(term) && !core.includes(term) && !shared.includes(term))
    .slice(0, maxAcShared);
  const lines = [
    "OWNER VOCABULARY PALETTE (menu, never quota):",
    core.length ? `Core owner words: ${core.join(", ")}.` : "",
    surfaceTerms.length ? `Owner words prominent on ${surface}: ${surfaceTerms.slice(0, 15).join(", ")}.` : "",
    shared.length ? `Words shared by Marie and Spirit Daughter: ${shared.join(", ")}. Use them only as individual lexical choices; never reconstruct Spirit Daughter phrasing or cadence.` : "",
    acShared.length ? `Words shared by Marie and AC: ${acShared.join(", ")}. Use them only as individual lexical choices; never copy AC phrases, metaphors, or cadence.` : "",
    sdAdditions.length
      ? `Neutral Spirit Daughter word additions approved for individual-word use: ${sdAdditions.join(", ")}. Marie's syntax, meaning, and rhythm remain authoritative.`
      : "",
    includePhrases
      ? `Owner-only phrase evidence (vary; do not template): ${bank.ownerSignaturePhrases.slice(0, maxPhrases).map((entry) => `“${entry.phrase}”`).join("; ")}.`
      : "",
    "Use only words that fit the actual meaning. Repetition, forced insertion, SD signature constructions, and New Age register all fail the voice target."
  ];
  return lines.filter(Boolean).join("\n");
}

module.exports = { buildOwnerVocabularyPrompt, renderOwnerVocabularySelection, selectOwnerVocabulary };
