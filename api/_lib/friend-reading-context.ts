import { extractTransitAspectClaims } from "./transit-reading-aspect-claims.js";

export const FRIEND_RELATIONSHIP_CONTEXT_RULE = "Use you/your only within supplied relationship context. Open that paragraph by naming the friend and explicitly identifying your relationship or connection. Following sentences may keep that context without repeating the name. A new paragraph or a switch to the friend's own life ends it. Keep the reader's natal points distinct from the friend's; name whose point is being activated.";

function escaped(value: string) { return value.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&"); }
const secondPerson = /\b(?:you|your|yours|yourself|yourselves)\b/iu;
const relationship = /\b(?:between|connection|relationship)\b/iu;

/** A paragraph can retain its explicit relationship subject; it cannot license the next one. */
export function friendReadingContexts(text: string, friendName: string, hasRelationship: boolean) {
  const name = new RegExp(`(?<![\\p{L}\\p{N}])${escaped(friendName)}(?![\\p{L}\\p{N}])`, "iu");
  const personalSubject = new RegExp(`^(?:separately\\b|outside (?:this|your|the) (?:relationship|connection)\\b|(?:${escaped(friendName)}|they|their|he|she)\\b)`, "iu");
  const result: Array<{ text: string; start: number; end: number; relationship: boolean }> = [];
  const segmenter = new Intl.Segmenter("en", { granularity: "sentence" });
  for (const paragraph of text.matchAll(/[^\n]+/gu)) {
    let inRelationship = false;
    for (const part of segmenter.segment(paragraph[0])) {
      const sentence = part.segment;
      const anchor = hasRelationship && name.test(sentence) && secondPerson.test(sentence) && relationship.test(sentence);
      if (anchor) inRelationship = true;
      else if (!secondPerson.test(sentence)
        && (personalSubject.test(sentence.trim()) || extractTransitAspectClaims(sentence).length > 0)) inRelationship = false;
      const start = paragraph.index! + part.index;
      result.push({ text: sentence, start, end: start + sentence.length, relationship: inRelationship });
    }
  }
  return result;
}

/** Normalize the known friend's possessive only, never an arbitrary person's name. */
export function friendAspectClaims(text: string, friendName: string) {
  const normalized = text.replace(new RegExp(`(?<![\\p{L}\\p{N}])${escaped(friendName)}['’]s\\s+`, "giu"), "their ");
  return extractTransitAspectClaims(normalized).map(claim => ({
    ...claim,
    owner: /\b(?:your|my|our)\b/iu.test(claim.text) ? "reader" as const
      : /\b(?:their|his|her)\b/iu.test(claim.text) ? "friend" as const : "unspecified" as const
  }));
}
