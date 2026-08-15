"use strict";

const TAROT_TERMS = /\b(?:Emperor|Star|Lovers|Magician|Hermit|Fool|Chariot|Empress|Hierophant|Tower|Tarot|Arcana)\b/u;
const NATURAL_ZODIAC_PATTERNS = [
  /\bThe 1st house,\s*Aries,\s*aligns with the Emperor\b/iu,
  /\bAs the natural ruler of the 3rd house,\s*Gemini feels at home\b/iu,
];

const HOUSE_DOCTRINE_SELECTORS = [
  [1, "sun-1st-house", "The 1st House is the house of first impressions"],
  [2, "libra-2nd-house", "The 2nd house is associated with our values"],
  [3, "scorpio-3rd-house", "The third house represents communication"],
  [4, "mars-4th-house", "The 4th house is often tied to our roots"],
  [5, "aquarius-5th-house", "The fifth house asks us to explore"],
  [6, "venus-6th-house", "The 6th House is traditionally associated"],
  [7, "sun-7th-house", "The 7th house represents your approach"],
  [8, "sun-8th-house", "The 8th house represents the realms"],
  [9, "sun-9th-house", "The 9th house represents your beliefs"],
  [10, "gemini-10th-house", "The 10th house symbolizes your career"],
  [11, "aquarius-11th-house", "The 11th house represents your aspirations"],
  [12, "leo-12th-house", "The twelfth house holds within it"],
];

function stringValue(value) {
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return typeof value === "string" && value.trim() ? value.trim() : "";
}

function sentenceRecords(text) {
  const records = [];
  for (const paragraph of String(text ?? "").split(/\n{2,}/u)) {
    const matches = [...paragraph.matchAll(/[^.!?]+(?:[.!?]+|$)/gu)];
    for (const match of matches) {
      const sentence = match[0].trim();
      if (sentence) records.push({ raw: match[0], sentence });
    }
  }
  return records;
}

function isTarotCorrespondenceSentence(sentence) {
  return TAROT_TERMS.test(String(sentence));
}

function isNaturalZodiacAnalogySentence(sentence) {
  return NATURAL_ZODIAC_PATTERNS.some((pattern) => pattern.test(String(sentence)));
}

function separateAstrologyBody(body) {
  const original = String(body ?? "");
  if (!original) return { astrologyBody: "", tarotCorrespondence: "", naturalZodiacAnalogy: "", changed: false };

  const tarot = [];
  const analogy = [];
  let changed = false;
  const paragraphs = [];

  for (const paragraph of original.split(/\n{2,}/u)) {
    const kept = [];
    for (const record of sentenceRecords(paragraph)) {
      const tarotMatch = isTarotCorrespondenceSentence(record.sentence);
      const analogyMatch = isNaturalZodiacAnalogySentence(record.sentence);
      if (tarotMatch) tarot.push(record.sentence);
      if (analogyMatch) analogy.push(record.sentence);
      if (tarotMatch || analogyMatch) changed = true;
      else kept.push(record.raw);
    }
    const cleaned = kept.join("").trim();
    if (cleaned) paragraphs.push(cleaned);
  }

  if (!changed) return { astrologyBody: original, tarotCorrespondence: "", naturalZodiacAnalogy: "", changed: false };
  return {
    astrologyBody: paragraphs.join("\n\n"),
    tarotCorrespondence: tarot.join("\n\n"),
    naturalZodiacAnalogy: analogy.join("\n\n"),
    changed: true,
  };
}

function contentClass(section) {
  const body = stringValue(section.astrologyBody);
  if (!body) return "esoteric_tarot_correspondence";
  if (section.id === "aquarius-10th-house") return "derived_generated_prose";
  if (body.length <= 400) return "short_distilled_astrology";
  return "long_source_reference_prose";
}

function buildHouseDoctrine(sections) {
  return HOUSE_DOCTRINE_SELECTORS.map(([house, sourceKey, prefix]) => {
    const section = sections.find((candidate) => candidate.id === sourceKey);
    if (!section) throw new Error(`Missing house-doctrine source section ${sourceKey}`);
    const sentence = sentenceRecords(section.sourceBody ?? section.astrologyBody)
      .map((record) => record.sentence)
      .find((candidate) => candidate.startsWith(prefix));
    if (!sentence) throw new Error(`Missing exact house-doctrine sentence ${sourceKey}: ${prefix}`);
    if (isTarotCorrespondenceSentence(sentence) || isNaturalZodiacAnalogySentence(sentence)) {
      throw new Error(`House doctrine ${house} contains prohibited correspondence material`);
    }
    return {
      house,
      doctrine: sentence,
      sourceProvenance: {
        sourceFamily: "MS-CA",
        sourceKey,
        sourceLineRange: stringValue(section.sourceLineRange),
        governance: "owner-authored-source-review-needed",
      },
      ownerApproved: false,
      servingEligible: false,
    };
  });
}

module.exports = {
  HOUSE_DOCTRINE_SELECTORS,
  NATURAL_ZODIAC_PATTERNS,
  TAROT_TERMS,
  buildHouseDoctrine,
  contentClass,
  isNaturalZodiacAnalogySentence,
  isTarotCorrespondenceSentence,
  sentenceRecords,
  separateAstrologyBody,
};
