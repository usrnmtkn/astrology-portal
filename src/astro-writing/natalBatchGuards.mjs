import { CONCRETE_NOUNS, OBSERVABLE_ACTIONS } from "./validateCopy.mjs";
import { priorCopyStructuralCorrespondence } from "./authoringSource.mjs";

const WORD = /[a-z0-9']+/giu;

function textWords(text) {
  return String(text || "").toLowerCase().match(WORD) || [];
}

function sentences(text) {
  return String(text || "").trim().split(/(?<=[.!?])\s+/u).map((sentence) => sentence.trim()).filter(Boolean);
}

export const BANNED_FRIEND_SENTENCES = Object.freeze([
  "The two moves arrive together, so people begin expecting both from Name in the same moment.",
  "The two moves cooperate easily enough that people hand Name the next part before anyone explains why.",
  "The room has to respond to both sides, and what looked simple can turn into a choice between them.",
  "The friction shows up in a delayed answer, a sharper exchange, or extra work before the result settles.",
  "The pattern becomes easiest to see in what gets decided, repaired, clarified, or moved after Name steps in.",
  "That is why people may trust Name with the next decision while missing how much pressure came with the first one."
]);

function normalizedSentence(text) {
  return String(text || "")
    .replace(/\bName\b/gu, "NAME")
    .toLowerCase()
    .replace(/[^a-z0-9' ]/gu, " ")
    .replace(/\s+/gu, " ")
    .trim();
}

function tokenEditDistance(left, right) {
  const previous = Array.from({ length: right.length + 1 }, (_, index) => index);
  for (let leftIndex = 1; leftIndex <= left.length; leftIndex += 1) {
    const current = [leftIndex];
    for (let rightIndex = 1; rightIndex <= right.length; rightIndex += 1) {
      current[rightIndex] = Math.min(
        current[rightIndex - 1] + 1,
        previous[rightIndex] + 1,
        previous[rightIndex - 1] + (left[leftIndex - 1] === right[rightIndex - 1] ? 0 : 1)
      );
    }
    previous.splice(0, previous.length, ...current);
  }
  return previous[right.length];
}

function tokenSimilarity(left, right) {
  const leftTokens = textWords(left);
  const rightTokens = textWords(right);
  const denominator = Math.max(leftTokens.length, rightTokens.length);
  if (!denominator) return 1;
  return 1 - tokenEditDistance(leftTokens, rightTokens) / denominator;
}

function threeItemSeries(sentence) {
  const matches = [];
  const pattern = /(?:[:;]|\b(?:through|with|include|includes|including|like|such as|in)\s+)([^,.;!?]{2,80}),\s+([^,.;!?]{2,80}),\s+(?:and|or)\s+([^,.;!?]{2,80})(?=[,.;!?]|$)/giu;
  for (const match of String(sentence || "").matchAll(pattern)) {
    const items = match.slice(1, 4).map((item) => normalizedSentence(item));
    if (items.every((item) => item.split(" ").length <= 12)) matches.push(items.join(" | "));
  }
  return matches;
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

export function assessPassageShape(copy, {
  minSentences = 4,
  minWords = 55,
  minObservableSentences = 2
} = {}) {
  const profile = observableSentenceProfile(copy);
  const wordCount = textWords(copy).length;
  const findings = [];
  if (profile.sentenceCount < minSentences) findings.push({ category: "passage_shape", classification: "advisory", detail: `Fewer than ${minSentences} sentences.` });
  if (wordCount < minWords) findings.push({ category: "passage_length", classification: "advisory", detail: `Fewer than ${minWords} words.` });
  if (profile.observableSentenceCount < minObservableSentences) findings.push({ category: "observable_noun_floor", classification: "advisory", detail: `Fewer than ${minObservableSentences} sentences contain observable language.` });
  return {
    passed: true,
    advisoryPassed: findings.length === 0,
    policy: "advisory-only",
    wordCount,
    ...profile,
    findings
  };
}

export function assessCrossRowReuse(rows, {
  copyField = "copy",
  keyField = "rowKey",
  nearDuplicateThreshold = 0.85,
  bannedSentences = BANNED_FRIEND_SENTENCES
} = {}) {
  const entries = rows.flatMap((row, rowIndex) => sentences(row?.[copyField]).map((sentence, sentenceIndex) => ({
    rowKey: row?.[keyField] ?? String(rowIndex),
    sentenceIndex,
    sentence,
    normalized: normalizedSentence(sentence)
  })));
  const bySentence = new Map();
  for (const entry of entries) {
    if (!bySentence.has(entry.normalized)) bySentence.set(entry.normalized, []);
    bySentence.get(entry.normalized).push(entry);
  }
  const exactDuplicateGroups = [...bySentence.values()]
    .filter((group) => new Set(group.map((entry) => entry.rowKey)).size > 1)
    .map((group) => ({ sentence: group[0].sentence, count: group.length, rows: [...new Set(group.map((entry) => entry.rowKey))] }));
  const uniqueEntries = [...bySentence.values()].map((group) => group[0]);
  const nearDuplicates = [];
  let highestNearDuplicatePairScore = 0;
  let highestNearDuplicatePair = null;
  for (let leftIndex = 0; leftIndex < uniqueEntries.length; leftIndex += 1) {
    for (let rightIndex = leftIndex + 1; rightIndex < uniqueEntries.length; rightIndex += 1) {
      const left = uniqueEntries[leftIndex];
      const right = uniqueEntries[rightIndex];
      if (left.rowKey === right.rowKey) continue;
      const score = tokenSimilarity(left.normalized, right.normalized);
      if (score > highestNearDuplicatePairScore) {
        highestNearDuplicatePairScore = score;
        highestNearDuplicatePair = { left: left.sentence, leftRow: left.rowKey, right: right.sentence, rightRow: right.rowKey, score };
      }
      if (score > nearDuplicateThreshold) nearDuplicates.push({ left: left.sentence, leftRow: left.rowKey, right: right.sentence, rightRow: right.rowKey, score });
    }
  }
  const seriesByText = new Map();
  for (const entry of entries) {
    for (const series of threeItemSeries(entry.sentence)) {
      if (!seriesByText.has(series)) seriesByText.set(series, new Set());
      seriesByText.get(series).add(entry.rowKey);
    }
  }
  const sharedThreeItemSeries = [...seriesByText.entries()]
    .filter(([, rowKeys]) => rowKeys.size > 1)
    .map(([series, rowKeys]) => ({ series, rows: [...rowKeys] }));
  const normalizedBanned = new Set(bannedSentences.map(normalizedSentence));
  const bannedFindings = entries
    .filter((entry) => normalizedBanned.has(entry.normalized))
    .map((entry) => ({ rowKey: entry.rowKey, sentence: entry.sentence, category: "owner_banned_string", classification: "blocking" }));
  return {
    passed: entries.length > 0 && bannedFindings.length === 0,
    policy: "reuse-metrics-advisory-owner-banned-strings-blocking",
    rowCount: rows.length,
    sentenceCount: entries.length,
    uniqueSentenceCount: bySentence.size,
    uniqueSentenceRatio: entries.length ? bySentence.size / entries.length : 0,
    nearDuplicateThreshold,
    highestNearDuplicatePairScore,
    highestNearDuplicatePair,
    exactDuplicateGroups,
    nearDuplicates,
    sharedThreeItemSeries,
    bannedFindings
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
    passed: copies.length > 0,
    advisoryPassed: openingViolations.length === 0 && closingViolations.length === 0,
    policy: "advisory-only",
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
const SECOND_PERSON = /\b(?:you|your|yours|yourself)\b/iu;

function personNeutralTokens(copy) {
  return textWords(String(copy || "")
    .replace(/\b(?:Name|you|your|yours|yourself)\b/giu, "person"))
    .map((token) => {
      if (token.length > 4 && token.endsWith("ies")) return `${token.slice(0, -3)}y`;
      if (token.length > 4 && token.endsWith("es")) return token.slice(0, -2);
      if (token.length > 3 && token.endsWith("s")) return token.slice(0, -1);
      return token;
    });
}

function pronounSwapSimilarity(selfCopy, friendCopy) {
  const selfTokens = personNeutralTokens(selfCopy);
  const friendTokens = personNeutralTokens(friendCopy);
  const denominator = Math.max(selfTokens.length, friendTokens.length);
  return denominator ? 1 - tokenEditDistance(selfTokens, friendTokens) / denominator : 0;
}

export function validateFriendPair({ selfCopy, friendCopy }) {
  const first = sentences(friendCopy)[0] || "";
  const structural = priorCopyStructuralCorrespondence(friendCopy, selfCopy);
  const swapSimilarity = pronounSwapSimilarity(selfCopy, friendCopy);
  const violations = [];
  if (!OBSERVER_OPENING.test(first)) violations.push({ category: "friend_entry_position", detail: "Friend opening does not locate the reader at an observable position in the room." });
  if (structural.matched || swapSimilarity >= 0.85) violations.push({ category: "pronoun_swap_derivation", detail: `${structural.matched ? structural.reason : "person-neutral sentence structure matches the Self passage"} (${Math.max(structural.score, swapSimilarity).toFixed(3)}).` });
  if (FRIEND_INTERIOR.test(friendCopy)) violations.push({ category: "friend_interior_access", detail: "Friend copy asserts an interior state that the observer cannot verify." });
  if (FRIEND_COACHING.test(friendCopy)) violations.push({ category: "friend_coaching", detail: "Friend copy coaches the reader about how to manage the other person." });
  if (SECOND_PERSON.test(friendCopy)) violations.push({ category: "friend_second_person_leakage", detail: "Friend copy contains second-person language." });
  if (!/\bName\b/u.test(friendCopy)) violations.push({ category: "friend_entry_position", detail: "Friend copy omitted the Name token." });
  return { passed: violations.length === 0, structuralSimilarity: Math.max(structural.score, swapSimilarity), violations };
}

export function validateFriendAuthoringMethod({ friendCopy, sharedParagraphSkeletonAvailable = false }) {
  const reuse = assessCrossRowReuse([{ rowKey: "candidate", copy: friendCopy }]);
  const violations = [...reuse.bannedFindings];
  if (sharedParagraphSkeletonAvailable) {
    violations.push({ category: "shared_friend_paragraph_skeleton", classification: "blocking", detail: "A shared Friend paragraph skeleton is available to the authoring path." });
  }
  if (SECOND_PERSON.test(friendCopy)) {
    violations.push({ category: "friend_second_person_leakage", classification: "blocking", detail: "Friend copy contains second-person language." });
  }
  return { passed: violations.length === 0, violations };
}
