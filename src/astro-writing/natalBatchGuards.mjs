import { CONCRETE_NOUNS, OBSERVABLE_ACTIONS } from "./validateCopy.mjs";
import { priorCopyStructuralCorrespondence } from "./authoringSource.mjs";

const WORD = /[a-z0-9']+/giu;

function textWords(text) {
  return String(text || "").toLowerCase().match(WORD) || [];
}

function sentences(text) {
  return String(text || "").trim().split(/(?<=[.!?])\s+/u).map((sentence) => sentence.trim()).filter(Boolean);
}

function containsTerm(sentence, terms) {
  const normalized = String(sentence || "").toLowerCase();
  return terms.some((term) => new RegExp(`\\b${term.replaceAll(" ", "\\s+")}\\b`, "iu").test(normalized));
}

export function observableSentenceProfile(copy) {
  const items = sentences(copy);
  const observable = items.filter((sentence) => containsTerm(sentence, [...CONCRETE_NOUNS, ...OBSERVABLE_ACTIONS]));
  return {
    sentenceCount: items.length,
    observableSentenceCount: observable.length,
    onlyOneObservableSentence: items.length > 1 && observable.length === 1
  };
}

function openingConstruction(copy) {
  return textWords(sentences(copy)[0]).slice(0, 2).join(" ");
}

function closingConstruction(copy) {
  const items = sentences(copy);
  return textWords(items.at(-1)).slice(0, 3).join(" ");
}

function frequency(values) {
  const counts = new Map();
  for (const value of values.filter(Boolean)) counts.set(value, (counts.get(value) || 0) + 1);
  return [...counts.entries()].sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]));
}

export function validateBatchCadence(rows, { limit = 0.15, copyField = "copy" } = {}) {
  const copies = rows.map((row) => row?.[copyField]).filter((copy) => typeof copy === "string" && copy.trim());
  const openings = frequency(copies.map(openingConstruction));
  const closings = frequency(copies.map(closingConstruction));
  const exceeds = ([, count]) => count / copies.length > limit;
  const openingViolations = openings.filter(exceeds);
  const closingViolations = closings.filter(exceeds);
  return {
    passed: copies.length > 0 && openingViolations.length === 0 && closingViolations.length === 0,
    rowCount: copies.length,
    limit,
    maxOpening: openings[0] ? { construction: openings[0][0], count: openings[0][1], rate: openings[0][1] / copies.length } : null,
    maxClosing: closings[0] ? { construction: closings[0][0], count: closings[0][1], rate: closings[0][1] / copies.length } : null,
    openingViolations: openingViolations.map(([construction, count]) => ({ construction, count, rate: count / copies.length })),
    closingViolations: closingViolations.map(([construction, count]) => ({ construction, count, rate: count / copies.length }))
  };
}

const FRIEND_INTERIOR = /\bName (?:feels?|thinks?|knows?|believes?|wants?|needs?|hopes?|fears?|worries?|imagines?|remembers?)\b/iu;
const FRIEND_COACHING = /\b(?:you should|you need to|try to|remember to|give Name|let Name|ask Name to|do not|don't)\b/iu;
const OBSERVER_OPENING = /\b(?:people|the room|a meeting|coworkers?|friends?|family|clients?|a manager|someone|others?|you (?:see|hear|notice|watch|find|learn))\b/iu;

export function validateFriendPair({ selfCopy, friendCopy }) {
  const first = sentences(friendCopy)[0] || "";
  const structural = priorCopyStructuralCorrespondence(friendCopy, selfCopy);
  const violations = [];
  if (!OBSERVER_OPENING.test(first)) violations.push({ category: "friend_entry_position", detail: "Friend opening does not locate the reader at an observable position in the room." });
  if (structural.matched) violations.push({ category: "pronoun_swap_derivation", detail: `${structural.reason} (${structural.score.toFixed(3)}).` });
  if (FRIEND_INTERIOR.test(friendCopy)) violations.push({ category: "friend_interior_access", detail: "Friend copy asserts an interior state that the observer cannot verify." });
  if (FRIEND_COACHING.test(friendCopy)) violations.push({ category: "friend_coaching", detail: "Friend copy coaches the reader about how to manage the other person." });
  if (!/\bName\b/u.test(friendCopy)) violations.push({ category: "friend_entry_position", detail: "Friend copy omitted the Name token." });
  return { passed: violations.length === 0, structuralSimilarity: structural.score, violations };
}
