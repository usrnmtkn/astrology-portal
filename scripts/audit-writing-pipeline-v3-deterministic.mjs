#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { validateCopy, validateCopyBatch } from "../src/astro-writing/validateCopy.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const reportRoot = path.join(repoRoot, "packages/astro-knowledge/review/writing-pipeline-v3");
const approvedPath = path.join(repoRoot, "data/writing/OWNER_APPROVED_EXAMPLES.jsonl");
const corpusRoot = path.join(repoRoot, "packages/astro-knowledge/voice/tldr-astro/fixtures/sky-article-longform");

function walk(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const target = path.join(directory, entry.name);
    return entry.isDirectory() ? walk(target) : [target];
  });
}

function jsonl(file) {
  return fs.readFileSync(file, "utf8").trim().split("\n").filter(Boolean).map(JSON.parse);
}

function wordSet(text) {
  return new Set(String(text).toLowerCase().match(/[a-z][a-z'-]{3,}/gu) ?? []);
}

const ownerCorpusFiles = walk(corpusRoot).filter((file) => /(?:OWNER|owner-corpus).*\.(?:md|txt)$/iu.test(file));
const ownerVocabulary = wordSet(ownerCorpusFiles.map((file) => fs.readFileSync(file, "utf8")).join("\n"));
const examples = jsonl(approvedPath);
const perEntry = [];
const negationPivotCountsPerEntry = [];

for (const entry of examples) {
  const contentKey = String(entry.contentKey ?? "");
  const skyPage = contentKey.includes("/sky-sign-copy/") || contentKey.includes("/sky-placement-");
  const result = validateCopy(entry.text, {
    family: entry.family,
    register: entry.register,
    surface: skyPage ? "sky-placement-page" : "evidence",
    expectedPlaceholders: [...String(entry.text).matchAll(/\{\{([\w.]+)\}\}/gu)].map((match) => match[1]).sort(),
    ownerCorpusVocabulary: ownerVocabulary
  });
  const newFindings = [
    ...result.violations.filter((finding) => ["register_consistency", "placeholder_integrity", "owner_line_integrity", "negation_pivot_cap"].includes(finding.category)),
    ...result.advisories
  ];
  if (result.counts.negationPivots > 0) {
    negationPivotCountsPerEntry.push({
      id: entry.id,
      contentKey: entry.contentKey,
      count: result.counts.negationPivots
    });
  }
  if (newFindings.length) perEntry.push({ id: entry.id, contentKey: entry.contentKey, family: entry.family, findings: newFindings });
}

const batches = [];
let totalBatchGroups = 0;
const byFamily = Map.groupBy(examples, (entry) => entry.family);
for (const [family, entries] of byFamily) {
  for (let start = 0; start < entries.length; start += 12) {
    const group = entries.slice(start, start + 12);
    if (group.length < 4) continue;
    totalBatchGroups += 1;
    const result = validateCopyBatch(group.map((entry) => entry.text));
    if (result.violations.length || result.advisories.length || result.counts.negationPivots > 0) {
      batches.push({ family, start, size: group.length, findings: [...result.violations, ...result.advisories], counts: result.counts });
    }
  }
}

const counts = {};
for (const item of perEntry) for (const finding of item.findings) counts[finding.category] = (counts[finding.category] ?? 0) + 1;
for (const batch of batches) for (const finding of batch.findings) counts[finding.category] = (counts[finding.category] ?? 0) + 1;
const entriesFlagged = new Set(perEntry.map((entry) => entry.id ?? entry.contentKey)).size;
const entryCategoryRates = Object.fromEntries([
  "register_consistency",
  "placeholder_integrity",
  "owner_line_integrity",
  "negation_pivot_cap",
  "synonym_redundancy",
  "vocabulary_outside_corpus",
  "spine_scaffold_grammar"
].map((category) => {
  const count = new Set(perEntry.filter((entry) => entry.findings.some((finding) => finding.category === category)).map((entry) => entry.id ?? entry.contentKey)).size;
  return [category, { entries: count, rate: Number((count / examples.length).toFixed(6)) }];
}));
const batchCategoryRates = Object.fromEntries([
  "scene_noun_frequency",
  "opening_syntax_repetition",
  "anchor_construction_repetition",
  "negation_pivot_page_cap",
  "negation_pivot_set_cap",
  "spine_scaffold_repetition"
].map((category) => {
  const count = batches.filter((batch) => batch.findings.some((finding) => finding.category === category)).length;
  return [category, { groups: count, rate: Number((count / totalBatchGroups).toFixed(6)) }];
}));
const summary = {
  version: "writing-pipeline-v3-deterministic-audit-2026-08-13",
  corpus: {
    approvedExamples: examples.length,
    ownerCorpusFiles: ownerCorpusFiles.length,
    ownerCorpusVocabularyTokens: ownerVocabulary.size
  },
  policy: {
    blockingNow: ["register_consistency", "placeholder_integrity", "owner_line_integrity", "negation_pivot_cap", "negation_pivot_page_cap", "negation_pivot_set_cap"],
    advisoryOnly: ["synonym_redundancy", "scene_noun_frequency", "opening_syntax_repetition", "anchor_construction_repetition", "spine_scaffold_grammar", "spine_scaffold_repetition", "vocabulary_outside_corpus"],
    note: "Every finding on owner-approved evidence is counted as a potential false positive until the owner rules."
  },
  totals: {
    entriesFlagged,
    potentialFalsePositiveEntryRate: Number((entriesFlagged / examples.length).toFixed(6)),
    potentialFalsePositiveRatesByEntryCategory: entryCategoryRates,
    totalBatchGroups,
    batchGroupsFlagged: batches.length,
    potentialFalsePositiveRatesByBatchCategory: batchCategoryRates,
    findingsByCategory: counts
  },
  negationPivotCountsPerEntry,
  sampleEntryFindings: perEntry.slice(0, 30),
  sampleBatchFindings: batches.slice(0, 30)
};

fs.mkdirSync(reportRoot, { recursive: true });
fs.writeFileSync(path.join(reportRoot, "deterministic-audit.json"), `${JSON.stringify(summary, null, 2)}\n`);
fs.writeFileSync(path.join(reportRoot, "deterministic-audit.md"), `# Writing pipeline v3 deterministic audit

This audit runs the new checks against owner-approved evidence before any new advisory is
allowed to gate writing. Findings on approved text are potential false positives, not edit
instructions.

- Approved examples: ${examples.length}
- Owner-corpus source files used for vocabulary: ${ownerCorpusFiles.length}
- Owner-corpus vocabulary tokens: ${ownerVocabulary.size}
- Entries with at least one new finding: ${entriesFlagged}
- Potential false-positive entry rate: ${(100 * entriesFlagged / examples.length).toFixed(2)}%
- Twelve-entry batch groups with repetition/concentration findings: ${batches.length}
- Total twelve-entry batch groups tested: ${totalBatchGroups}
- Approved entries containing at least one negation pivot: ${negationPivotCountsPerEntry.length}
- Total negation pivots counted in approved entries: ${negationPivotCountsPerEntry.reduce((total, entry) => total + entry.count, 0)}

## Findings by category

${Object.entries(counts).sort(([a], [b]) => a.localeCompare(b)).map(([category, count]) => `- ${category}: ${count}`).join("\n") || "- None"}

### Potential false-positive rates by approved entry

${Object.entries(entryCategoryRates).map(([category, value]) => `- ${category}: ${value.entries}/${examples.length} (${(value.rate * 100).toFixed(2)}%)`).join("\n")}

### Potential false-positive rates by approved twelve-entry group

${Object.entries(batchCategoryRates).map(([category, value]) => `- ${category}: ${value.groups}/${totalBatchGroups} (${(value.rate * 100).toFixed(2)}%)`).join("\n")}

## Enforcement

Register, placeholder integrity, protected-line integrity, and the owner-ruled negation-pivot
caps remain blocking mechanical contracts for new copy. Spine scaffold findings require owner
review because a machine cannot decide whether a particular line earned its place; repeated
scaffolds across a set are reported as machinery. Synonym redundancy, scene-noun concentration,
opening/anchor repetition, and vocabulary outside the corpus remain advisory. Vocabulary outside
the corpus is always advisory; an uncommon word may be exactly right.

See \`deterministic-audit.json\` for samples and batch details.
`);

console.log(JSON.stringify(summary.totals, null, 2));
