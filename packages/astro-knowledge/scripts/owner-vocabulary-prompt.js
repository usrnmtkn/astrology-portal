"use strict";

const path = require("path");
const bank = require(path.join("..", "voice", "tldr-astro", "owner-vocabulary-bank.json"));

function uniqueTerms(entries) {
  return [...new Set(entries.map((entry) => entry.term).filter(Boolean))];
}

function buildOwnerVocabularyPrompt({ surface = "", maxCore = 18, maxShared = 12, maxAcShared = 10, maxSdAdditions = 8, includePhrases = false, maxPhrases = 5 } = {}) {
  const surfaceTerms = uniqueTerms(bank.surfaceVocabulary[surface]?.terms || []);
  const core = uniqueTerms(bank.coreVocabulary).filter((term) => !surfaceTerms.includes(term)).slice(0, maxCore);
  const shared = uniqueTerms(bank.sharedOwnerSdVocabulary)
    .filter((term) => !surfaceTerms.includes(term) && !core.includes(term))
    .slice(0, maxShared);
  const sdAdditions = uniqueTerms([
    ...bank.sdLexicalAdditions.filter((entry) => entry.surfaces.includes(surface)),
    ...bank.sdLexicalAdditions.filter((entry) => entry.surfaces.includes("all"))
  ]).slice(0, maxSdAdditions);
  const acShared = uniqueTerms(bank.sharedOwnerAcVocabulary)
    .filter((term) => !surfaceTerms.includes(term) && !core.includes(term) && !shared.includes(term))
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

module.exports = { buildOwnerVocabularyPrompt };
