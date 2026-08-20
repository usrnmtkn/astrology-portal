#!/usr/bin/env node
/**
 * Corpus grammar lint.
 *
 * The owner has reported these defect classes before. They were documented in
 * tldr-astro-phrasebank/QA-FINDINGS-live-output.md and then shipped anyway.
 * This makes them fail automatically so they stop arriving at owner review.
 *
 * Defect classes, using the owner's own numbering:
 *   #4  pronoun object-case      "for they" where "for them" is required
 *   #5a subject-verb agreement   compound subject with a singular verb
 *   #5b dangling participle      sentence opening on a bare -ing with no subject
 *   #6  mechanical gluing        a verb phrase whose object is a glued list, or
 *                                an adverb stranded before a long list
 *   plus: the "{funcA} meets {funcB}" seam the owner already banned
 *
 * Usage:
 *   node scripts/lint-corpus-grammar.mjs [--fix-safe] [--json]
 * Exits non-zero when any defect is found.
 */

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const require = createRequire(import.meta.url);
const { CORPUS_GRAMMAR_CHECKS: CHECKS, grammarFindings } = require("../src/astro-writing/corpusGrammarChecks.cjs");
const asJson = process.argv.includes("--json");

const TEXT_FIELDS = [
  "body", "tldr", "plainTranslation", "summaryShort", "summaryDeep",
  "tension", "advice", "copy", "astrologyBody", "shadow", "business",
  "natal_sign_story", "collective_shift", "home_scene", "house_domain", "house_integration"
];

function textFieldsOf(value, out = []) {
  if (Array.isArray(value)) { for (const v of value) textFieldsOf(v, out); return out; }
  if (value && typeof value === "object") {
    for (const [k, v] of Object.entries(value)) {
      if (typeof v === "string" && TEXT_FIELDS.includes(k) && v.length > 20) out.push({ field: k, text: v });
      else textFieldsOf(v, out);
    }
  }
  return out;
}

const roots = [
  "packages/astro-knowledge/data",
  "tldr-astro-phrasebank/phrasebank",
  "packages/astro-knowledge/voice/tldr-astro/marie-satori-writer/ll-matrix-v13"
];

const findings = [];
let filesScanned = 0;
let fieldsScanned = 0;

for (const root of roots) {
  const abs = path.join(repoRoot, root);
  if (!fs.existsSync(abs)) continue;
  const files = fs.readdirSync(abs, { recursive: true, withFileTypes: true })
    .filter((e) => e.isFile() && e.name.endsWith(".json"))
    .map((e) => path.join(e.parentPath ?? abs, e.name));
  for (const file of files) {
    let doc;
    try { doc = JSON.parse(fs.readFileSync(file, "utf8")); } catch { continue; }
    filesScanned += 1;
    for (const { field, text } of textFieldsOf(doc)) {
      fieldsScanned += 1;
      for (const finding of grammarFindings(text)) {
        findings.push({
          check: finding.check, owner: finding.owner, message: finding.message,
          file: path.relative(repoRoot, file), field,
          excerpt: text.slice(Math.max(0, finding.index - 45), finding.index + finding.match.length + 55).replace(/\s+/g, " ").trim()
        });
      }
    }
  }
}

const byCheck = {};
for (const f of findings) byCheck[f.check] = (byCheck[f.check] ?? 0) + 1;

if (asJson) {
  console.log(JSON.stringify({ filesScanned, fieldsScanned, total: findings.length, byCheck, findings }, null, 2));
} else {
  console.log(`scanned ${filesScanned} files, ${fieldsScanned} prose fields\n`);
  if (!findings.length) {
    console.log("No grammar defects found.");
  } else {
    for (const check of CHECKS) {
      const hits = findings.filter((f) => f.check === check.id);
      if (!hits.length) continue;
      console.log(`${check.id}  (${check.owner}) — ${hits.length}`);
      console.log(`  ${check.message}`);
      for (const h of hits.slice(0, 4)) console.log(`    ${h.file} [${h.field}]\n      ...${h.excerpt}...`);
      if (hits.length > 4) console.log(`    ...and ${hits.length - 4} more`);
      console.log("");
    }
    console.log(`TOTAL: ${findings.length}`);
  }
}

process.exit(findings.length ? 1 : 0);
