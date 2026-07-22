/*
 * This module is intentionally sanitation-only. Content eligibility and contract
 * status belong to the import pipeline; renderers may trim authored copy or
 * refuse an empty value, but must not repair, rewrite, or classify its prose.
 */

const markdownDividerLinePattern = /^(?:-{3,}|\*{3,}|_{3,})$/;
const debugTagPattern = /\[(?:FALLBACK|AUTHORED)\]/gi;
const metadataOnlyPatterns = [
  /^imported from approved project\b/i,
  /\bsource file was not copied into the repository\b/i
];
const legacyCopyFingerprintPatterns = [
  { pattern: /\bactive here\b/i, reason: "legacy active-here fallback phrase" },
  { pattern: /\bactive now\b/i, reason: "legacy active-now fallback phrase" },
  { pattern: /\bcurrent emphasis\b/i, reason: "legacy current-emphasis fallback phrase" },
  { pattern: /\btiming,\s*mood\b/i, reason: "legacy timing/mood fallback phrase" },
  { pattern: /\beveryday choices\b/i, reason: "legacy everyday-choices fallback phrase" },
  { pattern: /\bchoices around it\b/i, reason: "legacy choices-around-it fallback phrase" },
  { pattern: /^\*?\s*anchor\s*:/im, reason: "editorial Anchor metadata" },
  { pattern: /^\*?\s*flag\s*:/im, reason: "editorial Flag metadata" },
  { pattern: /^\*?\s*source\s*:/im, reason: "editorial Source metadata" },
  { pattern: /^\*?\s*corpus\s*:/im, reason: "editorial Corpus metadata" }
];

function isDevMode() {
  return typeof import.meta !== "undefined" && Boolean(import.meta.env?.DEV);
}

export function legacyCopyFingerprintReason(value: string | null | undefined) {
  const text = String(value ?? "");
  return legacyCopyFingerprintPatterns.find(({ pattern }) => pattern.test(text))?.reason ?? null;
}

export function warnIfLegacyCopyFingerprint(value: string | null | undefined, context = "reader-facing copy") {
  if (!isDevMode()) return;

  const reason = legacyCopyFingerprintReason(value);
  if (!reason) return;

  console.warn(`[legacy-copy-canary] ${reason} reached ${context}. Decommission the legacy generator path.`, {
    preview: String(value ?? "").slice(0, 240)
  });
}

export function sanitizeReaderFacingCopy(value: string | null | undefined) {
  return (value ?? "")
    .split(/\n/)
    .map((line) => line.replace(debugTagPattern, "").trim())
    .filter((line) => !markdownDividerLinePattern.test(line))
    .join("\n")
    .trim();
}

export function isReaderFacingCopy(value: string | null | undefined) {
  const normalized = sanitizeReaderFacingCopy(value).replace(/\s+/g, " ").trim();

  if (!normalized) {
    return false;
  }

  if (metadataOnlyPatterns.some((pattern) => pattern.test(normalized))) {
    return false;
  }

  return normalized.length > 0;
}

export function readerFacingParagraphs(values: Array<string | null | undefined>) {
  const paragraphs = values
    .flatMap((value) => (value ?? "").split(/\n{2,}/))
    .map((value) => sanitizeReaderFacingCopy(value))
    .filter((value) => isReaderFacingCopy(value));

  paragraphs.forEach((paragraph) => warnIfLegacyCopyFingerprint(paragraph));

  return paragraphs;
}

export function firstReaderFacingCopy(values: Array<string | null | undefined>) {
  return readerFacingParagraphs(values)[0] ?? null;
}
