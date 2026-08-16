"use strict";

const POLICY_CLASSES = Object.freeze({
  HARD_BAN: "HARD_BAN",
  AI_TELL_PREVENTIVE: "AI_TELL_PREVENTIVE",
  EDITORIAL_REVIEW: "EDITORIAL_REVIEW",
  REPLACEMENT_SUGGESTION: "REPLACEMENT_SUGGESTION",
  WAIVED: "WAIVED"
});

const VALID_POLICY_CLASSES = new Set(Object.values(POLICY_CLASSES));
const META = /[\\^$.*+?()[\]{}|]/u;

function escapedTerm(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
}

function termRegex(term, flags = "iu") {
  const value = String(term || "");
  if (!value) return null;
  if (META.test(value.replace(/ /gu, ""))) return new RegExp(value, flags);
  return new RegExp(`\\b${escapedTerm(value)}\\b`, flags);
}

function normalizePolicyEntry(entry) {
  if (typeof entry === "string") {
    return { term: entry, policyClass: POLICY_CLASSES.HARD_BAN, reason: "Legacy global output ban." };
  }
  return {
    ...entry,
    policyClass: entry?.policyClass || POLICY_CLASSES.HARD_BAN
  };
}

function sentenceAround(text, index) {
  const value = String(text || "");
  const start = Math.max(value.lastIndexOf(".", index), value.lastIndexOf("!", index), value.lastIndexOf("?", index)) + 1;
  const ends = [value.indexOf(".", index), value.indexOf("!", index), value.indexOf("?", index)].filter((position) => position >= 0);
  const end = ends.length ? Math.min(...ends) + 1 : value.length;
  return value.slice(start, end);
}

function matchesConfiguredContext(text, entry) {
  const patterns = entry.contextPatterns || [];
  if (!patterns.length) return true;
  return patterns.some((pattern) => new RegExp(pattern, "iu").test(text));
}

function isLiteralException(text, match, entry) {
  if (!entry.literalContextPatterns?.length) return false;
  const sentence = sentenceAround(text, match.index ?? 0);
  return entry.literalContextPatterns.some((pattern) => new RegExp(pattern, "iu").test(sentence));
}

function findingForEntry(text, rawEntry) {
  const entry = normalizePolicyEntry(rawEntry);
  if (!VALID_POLICY_CLASSES.has(entry.policyClass)) throw new Error(`Unknown banned-word policy class '${entry.policyClass}' for '${entry.term}'.`);
  if (entry.policyClass === POLICY_CLASSES.WAIVED) return null;
  const regex = termRegex(entry.term);
  const match = regex?.exec(String(text || ""));
  if (!match) return null;
  if (!matchesConfiguredContext(text, entry)) return null;
  if (entry.policyClass === POLICY_CLASSES.AI_TELL_PREVENTIVE && isLiteralException(text, match, entry)) return null;
  const severity = [POLICY_CLASSES.HARD_BAN, POLICY_CLASSES.AI_TELL_PREVENTIVE].includes(entry.policyClass)
    ? "fail"
    : "warn";
  return {
    severity,
    source: "banned-words",
    term: entry.term,
    match: match[0],
    reason: entry.reason,
    policyClass: entry.policyClass,
    preferredAlternatives: entry.policyClass === POLICY_CLASSES.REPLACEMENT_SUGGESTION
      ? [...(entry.useInstead || [])]
      : undefined
  };
}

function findPolicyFindings(text, entries) {
  return (entries || []).map((entry) => findingForEntry(text, entry)).filter(Boolean);
}

function isRetrievalExclusion(text, entry) {
  const finding = findingForEntry(text, entry);
  return Boolean(finding && [POLICY_CLASSES.HARD_BAN, POLICY_CLASSES.AI_TELL_PREVENTIVE].includes(finding.policyClass));
}

function passageHasRetrievalExclusion(text, entries) {
  return (entries || []).some((entry) => isRetrievalExclusion(text, entry));
}

module.exports = {
  POLICY_CLASSES,
  VALID_POLICY_CLASSES,
  findPolicyFindings,
  findingForEntry,
  isRetrievalExclusion,
  normalizePolicyEntry,
  passageHasRetrievalExclusion,
  termRegex
};
