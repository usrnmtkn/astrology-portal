import phraseBook from "./metaphor-specificity-phrasebook.json";

export type MetaphorPhraseFlag = {
  contentKey: string;
  phrase: string;
  sentence: string;
};

export const metaphorSpecificityPhraseBook = phraseBook;

export const metaphorValidationPhrases = phraseBook.validationPhrases;

export const metaphorGuidanceSummary = phraseBook.finalEditorialTest;

export const metaphorFamilies = phraseBook.families;

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function splitSentences(text: string) {
  return text
    .replace(/\s+/g, " ")
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean);
}

export function findMetaphorPhraseFlags(text: string, contentKey = "unsaved-row"): MetaphorPhraseFlag[] {
  const source = text.trim();

  if (!source) {
    return [];
  }

  const sentences = splitSentences(source);
  const flags: MetaphorPhraseFlag[] = [];

  for (const phrase of metaphorValidationPhrases) {
    const matcher = new RegExp(`\\b${escapeRegExp(phrase)}\\b`, "i");
    const sentence = sentences.find((item) => matcher.test(item));

    if (sentence) {
      flags.push({ contentKey, phrase, sentence });
    }
  }

  return flags;
}
