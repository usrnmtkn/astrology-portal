import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const sourceArgIndex = args.indexOf("--source");
const sourcePath = sourceArgIndex === -1
  ? path.join(repoRoot, "apps/web/src/content/fallbackArchitectureV3/source-rows/fallback-source-rows-v3.json")
  : path.resolve(args[sourceArgIndex + 1]);
const synastryPrefix = "fallback-hook/synastry-pair/";
const obliquePlaceholderAllowlist = new Set([
  `${synastryPrefix}mars/ascendant/conjunction`,
  `${synastryPrefix}mars/ascendant/hard`,
  `${synastryPrefix}mars/ascendant/soft`,
  // Exact-approved single-voice row; both bodies deliberately use holder2.
  `${synastryPrefix}venus/uranus/conjunction`,
]);

// These are valid non-third-person tokens that happen to end in "s". Any new
// token after "you" fails closed until it is classified here or by an explicit
// non-subject context below. The exact-word boundary intentionally excludes
// plural nouns after "your" (for example, "your needs").
const validDirectYouTokensEndingInS = new Set([
  "as",
  "cautious",
  "express",
  "less",
  "press",
  "process",
  "second-guess",
]);
const nonSubjectYouContexts = [
  /\b(?:both|each|either|neither|one|part|side|version)\s+of\s*$/iu,
  /\binterest\s+in\s*$/iu,
  /\bground\s+beneath\s*$/iu,
  /\baccepted\s+by\s*$/iu,
];
const irregularThirdPersonForms = new Set(["does", "has", "is", "was"]);

function grammarViolations(text) {
  const violations = [];
  const candidatePattern = /\byou\s+([A-Za-z][A-Za-z'-]*s)\b/giu;
  for (const match of text.matchAll(candidatePattern)) {
    const token = match[1].toLowerCase();
    if (validDirectYouTokensEndingInS.has(token)) continue;
    const prefix = text.slice(0, match.index);
    if (nonSubjectYouContexts.some((pattern) => pattern.test(prefix))) continue;
    const classification = irregularThirdPersonForms.has(token)
      ? "irregular third-person verb"
      : "unclassified you+...s token";
    violations.push(`${classification}: ${JSON.stringify(match[0])}`);
  }
  return violations;
}

// Permanent controls for the historical defect classes and explicit false
// positives. Unknown direct tokens fail instead of being silently allowlisted.
for (const bad of ["You names the problem.", "You ends up waiting.", "You pays the bill.", "you does this."]) {
  assert.ok(grammarViolations(bad).length > 0, `gate must reject ${JSON.stringify(bad)}`);
}
for (const good of [
  "You process the information.",
  "Neither of you has to wait.",
  "The current version of you is enough.",
  "Your needs matter.",
]) {
  assert.deepEqual(grammarViolations(good), [], `gate must permit ${JSON.stringify(good)}`);
}

const source = JSON.parse(fs.readFileSync(sourcePath, "utf8"));
const rows = source.hookRows.filter((row) => row.contentKey?.startsWith(synastryPrefix));
const failures = [];
for (const row of rows) {
  const allowObliquePlaceholders = obliquePlaceholderAllowlist.has(row.contentKey);
  for (const field of ["body_you", "body_they"]) {
    const text = row[field];
    assert.equal(typeof text, "string", `${row.contentKey}: ${field} must be a string`);
    for (const violation of grammarViolations(text)) {
      failures.push(`${row.contentKey} ${field}: ${violation}`);
    }
    if (!allowObliquePlaceholders && field === "body_you" && text.includes("{{holder1}}")) {
      failures.push(`${row.contentKey} body_you: forbidden {{holder1}} reader placeholder`);
    }
    if (!allowObliquePlaceholders && field === "body_they" && text.includes("{{holder2}}")) {
      failures.push(`${row.contentKey} body_they: forbidden {{holder2}} reader placeholder`);
    }
    if (/(?:^|[.!?]\s+|\n)[("'“‘]*you\b/gu.test(text)) {
      failures.push(`${row.contentKey} ${field}: sentence-initial lowercase "you"`);
    }
  }
}

if (failures.length > 0) {
  console.error(`Synastry reader-variant grammar gate failed (${failures.length}):`);
  for (const failure of failures) console.error(`  ${failure}`);
  process.exit(1);
}

console.log(`Synastry reader-variant grammar gate passed (${rows.length} rows).`);
