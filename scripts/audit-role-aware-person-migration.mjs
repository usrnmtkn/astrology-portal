#!/usr/bin/env node

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const sourcePath = path.join(
  repoRoot,
  "apps/web/src/content/fallbackArchitectureV3/source-rows/fallback-source-rows-v3.json"
);
const artifactPath = path.join(
  repoRoot,
  "packages/astro-knowledge/review/role-aware-person-migration-audit-2026-08-15.json"
);
const sourceBytes = fs.readFileSync(sourcePath);
const source = JSON.parse(sourceBytes);
const sha256 = (value) => crypto.createHash("sha256").update(value).digest("hex");

const personalPronounPattern = /(?<![\p{L}-])(?:you|your|yours|yourself|yourselves|you're|you've|you'll|you'd|they|them|their|theirs|themselves|she|her|hers|herself|he|him|his|himself|we|us|our|ours|ourselves|i|me|my|mine|myself)(?![\p{L}-])/iu;
const legacyPersonSlotPattern = /\{\{(?:holder[12]|subject|possessive|Name|friend|reader|person(?:A|B)?(?:Subject|Object|Possessive(?:Adjective|Pronoun)?|Reflexive|Name|BePresent|BePast|HavePresent|VerbSuffix))\b[^}]*\}\}/u;
const proseFields = ["body", "body_you", "body_they"];

function classify(row) {
  const fields = proseFields.filter((field) => typeof row[field] === "string");
  const values = fields.map((field) => row[field]);
  const reasons = [];
  if (values.some((value) => personalPronounPattern.test(value))) reasons.push("untyped_personal_pronoun");
  if (values.some((value) => legacyPersonSlotPattern.test(value))) reasons.push("legacy_person_slot");
  if (new Set(values).size > 1) reasons.push("voice_variant_difference");

  return {
    contentKey: row.contentKey,
    sourceMetadataSha256: sha256(JSON.stringify(row)),
    proseFields: fields,
    classification: reasons.length === 0 ? "automatic_no_person_role" : "manual_role_review",
    reasons
  };
}

function summarize(rows) {
  const entries = rows.map(classify);
  const automaticEntries = entries.filter((entry) => entry.classification === "automatic_no_person_role");
  const manualEntries = entries.filter((entry) => entry.classification === "manual_role_review");
  const reasonCounts = {};
  for (const entry of entries) {
    for (const reason of entry.reasons) reasonCounts[reason] = (reasonCounts[reason] ?? 0) + 1;
  }
  return {
    total: entries.length,
    automaticNoPersonRole: automaticEntries.length,
    cannotAutoTag: manualEntries.length,
    reasonCounts,
    classificationDigestSha256: sha256(entries.map((entry) => (
      `${entry.contentKey}\t${entry.sourceMetadataSha256}\t${entry.classification}\t${entry.reasons.join(",")}`
    )).join("\n")),
    automaticContentKeysSha256: sha256(automaticEntries.map((entry) => entry.contentKey).join("\n")),
    manualReviewContentKeysSha256: sha256(manualEntries.map((entry) => entry.contentKey).join("\n")),
    manualReviewSample: manualEntries.slice(0, 25)
  };
}

const vocabulary = summarize(source.vocabularyRows);
const hooks = summarize(source.hookRows);
if (vocabulary.total !== 720 || hooks.total !== 4377) {
  throw new Error(`Unexpected corpus counts: vocabulary=${vocabulary.total}, hooks=${hooks.total}.`);
}

const artifact = {
  schema: "tldrastro-role-aware-person-migration-audit-v1",
  version: "2026-08-15",
  sourcePath: path.relative(repoRoot, sourcePath),
  sourceFileSha256: sha256(sourceBytes),
  method: {
    automaticRule: "Only rows with no personal pronoun, no legacy person slot, and no differing voice fields may receive an empty role tag automatically.",
    ambiguityRule: "Every other row requires family-level human verification; the compiler must not infer chartSubject, viewer, or otherPerson.",
    writesSourceRows: false
  },
  totals: {
    rows: vocabulary.total + hooks.total,
    automaticNoPersonRole: vocabulary.automaticNoPersonRole + hooks.automaticNoPersonRole,
    cannotAutoTag: vocabulary.cannotAutoTag + hooks.cannotAutoTag,
    ambiguousPronounRows: (vocabulary.reasonCounts.untyped_personal_pronoun ?? 0) + (hooks.reasonCounts.untyped_personal_pronoun ?? 0)
  },
  vocabulary,
  hooks
};

const expected = `${JSON.stringify(artifact, null, 2)}\n`;
if (process.argv.includes("--write")) {
  fs.writeFileSync(artifactPath, expected);
  console.log(`Wrote ${path.relative(repoRoot, artifactPath)}.`);
} else {
  if (!fs.existsSync(artifactPath) || fs.readFileSync(artifactPath, "utf8") !== expected) {
    throw new Error(`${path.relative(repoRoot, artifactPath)} is stale; run this script with --write.`);
  }
  console.log(`Role-aware migration audit: ${artifact.totals.automaticNoPersonRole} automatic no-person tags; ${artifact.totals.cannotAutoTag} rows require human role review (${artifact.totals.ambiguousPronounRows} contain untyped personal pronouns).`);
}
