"use strict";

const REAL_FILLER_PATTERNS = [
  /\b(?:becomes?|gets?|feels?) real\b/giu,
  /\bmake(?:s|ing)? (?:it|this|that) (?:feel )?real\b/giu,
  /\bthe real work\b/giu,
  /\breal progress\b/giu,
  /\bthe wit is real\b/giu
];

const TRANSLATION_REQUIRED_PATTERNS = [
  /\bthe fire is not the problem\b/giu,
  /\bfind(?:s|ing)? the shelf empty\b/giu,
  /\bemotional weather\b/giu,
  /\bhold(?:s|ing)? the key\b/giu,
  /\bthe door opens?\b/giu,
  /\bthe tide changes?\b/giu,
  /\bgive (?:it|this|that) a target\b/giu,
  /\bcharg(?:e|es|ed|ing) toward\b/giu,
  /\bcleanup\b/giu,
  /\b(?:idea|ideas).{0,64}\bbefore (?:getting )?dropped\b/giu,
  /\b(?:idea|ideas).{0,64}\bbefore dropping (?:it|them)\b/giu
];

function uniqueMatches(text, patterns) {
  const matches = [];
  for (const pattern of patterns) {
    pattern.lastIndex = 0;
    for (const match of String(text || "").matchAll(pattern)) matches.push(match[0]);
  }
  return [...new Set(matches)];
}

function findRealFiller(text) {
  const source = String(text || "");
  const matches = uniqueMatches(source, REAL_FILLER_PATTERNS);
  const realCount = source.match(/\breal\b/giu)?.length ?? 0;
  if (realCount > 1 && matches.length === 0) matches.push(`${realCount} uses of real`);
  return matches;
}

function findTranslationRequired(text) {
  return uniqueMatches(text, TRANSLATION_REQUIRED_PATTERNS);
}

function plainLanguageJudgeLines() {
  return [
    `REAL-FILLER: Flag "becomes/gets/feels real," "make it real," "the real work," "real progress," repeated use of "real," and comparable uses where "real" substitutes for the concrete noun or consequence. Literal, sparse uses such as "a real request" are allowed.`,
    `TRANSLATION-REQUIRED: Flag any figurative phrase the reader must decode back into ordinary behavior. Replace the image mentally with the action it hides; if that makes the sentence clearer, the draft requires revision.`
  ];
}

module.exports = {
  findRealFiller,
  findTranslationRequired,
  plainLanguageJudgeLines
};
