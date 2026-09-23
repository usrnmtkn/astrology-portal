import { extractTransitAspectClaims } from "./transit-reading-aspect-claims.js";
import { isFriendRelationshipHeading } from "../../src/reporting/friendReportStructure.js";

export const FRIEND_RELATIONSHIP_CONTEXT_RULE = "Use you/your only within supplied relationship context. Put relationship material in the final section labeled '## Between you and <friend name>'. Following sentences may keep that context without repeating the name. A new heading or an explicit switch to the friend's own life ends it. Older unsectioned prose must open each relationship paragraph by naming the friend and explicitly identifying your relationship or connection. Keep the reader's natal points distinct from the friend's; name whose point is being activated.";

function escaped(value: string) { return value.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&"); }
const secondPerson = /\b(?:you|your|yours|yourself|yourselves)\b/iu;
const relationship = /\b(?:between|connection|relationship)\b/iu;

/** A named section retains relationship scope; legacy prose needs a per-paragraph anchor. */
export function friendReadingContexts(text: string, friendName: string, hasRelationship: boolean) {
  const name = new RegExp(`(?<![\\p{L}\\p{N}])${escaped(friendName)}(?![\\p{L}\\p{N}])`, "iu");
  const personalSubject = new RegExp(`^(?:separately\\b|outside (?:this|your|the) (?:relationship|connection)\\b|(?:${escaped(friendName)}|they|their|he|she)\\b)`, "iu");
  const result: Array<{ text: string; start: number; end: number; relationship: boolean }> = [];
  const segmenter = new Intl.Segmenter("en", { granularity: "sentence" });
  let relationshipSection = false;
  for (const paragraph of text.matchAll(/[^\n]+/gu)) {
    if (/^\s*#{1,6}\s/u.test(paragraph[0])) {
      relationshipSection = hasRelationship && isFriendRelationshipHeading(paragraph[0], friendName);
      continue;
    }
    let inRelationship = relationshipSection;
    for (const part of segmenter.segment(paragraph[0])) {
      const sentence = part.segment;
      const anchor = hasRelationship && name.test(sentence) && secondPerson.test(sentence) && relationship.test(sentence);
      if (anchor) inRelationship = true;
      else if (/^(?:separately\b|outside (?:this|your|the) (?:relationship|connection)\b)/iu.test(sentence.trim())) {
        inRelationship = false; relationshipSection = false;
      } else if (!relationshipSection && !secondPerson.test(sentence)
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
