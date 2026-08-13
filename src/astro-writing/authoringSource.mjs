import crypto from "node:crypto";

const PROSE_FIELDS = Object.freeze([
  "copy",
  "currentCopy",
  "current_copy",
  "existingCopy",
  "existing_copy",
  "priorCopy",
  "prior_copy",
  "revisedCopy",
  "revised_copy"
]);

function requiredText(value, label) {
  const text = String(value ?? "").trim();
  if (!text) throw new Error(`Authoring source requires ${label}.`);
  return text;
}

function textList(value) {
  return [...new Set((Array.isArray(value) ? value : []).map((entry) => String(entry).trim()).filter(Boolean))];
}

function normalized(value) {
  return String(value ?? "")
    .toLowerCase()
    .replace(/[’']/gu, "'")
    .replace(/[^a-z0-9'\s]/gu, " ")
    .replace(/\s+/gu, " ")
    .trim();
}

function wordBigrams(value) {
  const tokens = normalized(value).split(" ").filter(Boolean);
  return new Set(tokens.slice(0, -1).map((token, index) => `${token} ${tokens[index + 1]}`));
}

export function priorCopyText(priorCopy) {
  if (typeof priorCopy === "string") return priorCopy.trim();
  if (Array.isArray(priorCopy)) return priorCopy.map(priorCopyText).filter(Boolean).join("\n");
  if (priorCopy && typeof priorCopy === "object") {
    return Object.values(priorCopy).map(priorCopyText).filter(Boolean).join("\n");
  }
  return "";
}

export function priorCopySegments(priorCopy) {
  if (typeof priorCopy === "string") return [priorCopy.trim()].filter(Boolean);
  if (Array.isArray(priorCopy)) return priorCopy.flatMap(priorCopySegments);
  if (priorCopy && typeof priorCopy === "object") return Object.values(priorCopy).flatMap(priorCopySegments);
  return [];
}

export function prepareAuthoringSource(input) {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new Error("Authoring source must be an object containing rowKey, astrologySupport, and sourceConstraints.");
  }
  for (const field of PROSE_FIELDS) {
    if (String(input[field] ?? "").trim()) {
      throw new Error(`Authoring source must not contain ${field}; prior prose is downstream comparison evidence, never drafting input.`);
    }
  }
  const rowKey = requiredText(input.rowKey ?? input.row_key, "rowKey");
  const astrologySupport = requiredText(input.astrologySupport ?? input.astrology_support, "AstrologySupport");
  const sourceConstraints = textList(input.sourceConstraints ?? input.source_constraints);
  if (!sourceConstraints.length) throw new Error("Authoring source requires at least one source constraint.");
  return Object.freeze({
    rowKey,
    astrologySupport,
    sourceConstraints,
    astrologySupportSha256: crypto.createHash("sha256").update(astrologySupport).digest("hex")
  });
}

export function priorCopyDigest(priorCopy) {
  const text = priorCopyText(priorCopy);
  return text ? crypto.createHash("sha256").update(text).digest("hex") : null;
}

export function priorCopyStructuralCorrespondence(candidate, priorCopy) {
  const current = normalized(priorCopyText(candidate));
  const prior = normalized(priorCopyText(priorCopy));
  if (!current || !prior) return Object.freeze({ matched: false, score: 0, reason: "no prior comparison supplied" });
  if (current === prior || current.includes(prior) || prior.includes(current)) {
    return Object.freeze({ matched: true, score: 1, reason: "candidate reproduces the prior prose" });
  }
  const currentBigrams = wordBigrams(current);
  const priorBigrams = wordBigrams(prior);
  if (!currentBigrams.size || !priorBigrams.size) return Object.freeze({ matched: false, score: 0, reason: "insufficient structure" });
  const intersection = [...currentBigrams].filter((value) => priorBigrams.has(value)).length;
  const union = new Set([...currentBigrams, ...priorBigrams]).size;
  const score = intersection / union;
  return Object.freeze({
    matched: score >= 0.72,
    score,
    reason: score >= 0.72 ? "candidate tracks the prior prose structure" : "no deterministic structure match"
  });
}

export { PROSE_FIELDS };
