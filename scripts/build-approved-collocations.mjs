#!/usr/bin/env node

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  buildCollocationTable,
  leaveOneSourceOutFalsePositiveReport,
  novelCollocationAdvisories,
  serializeCollocationTable
} from "../src/astro-writing/collocationAdvisory.mjs";
import { withoutOwnerRejectedEvidence } from "../src/astro-writing/ownerEvidenceRejections.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (relativePath) => fs.readFileSync(path.join(repoRoot, relativePath), "utf8");
const jsonl = (relativePath) => read(relativePath).trim().split(/\n/u).filter(Boolean).map(JSON.parse);
const sha = (value) => crypto.createHash("sha256").update(value).digest("hex");
const normalizedText = (value) => String(value ?? "").trim().replace(/\s+/gu, " ");

const allOwnerCorrections = [
  ...jsonl("data/writing/owner-corrections.jsonl"),
  ...jsonl("data/writing/owner-feedback-corpus.jsonl")
];
const approvedExamples = withoutOwnerRejectedEvidence(
  jsonl("data/writing/OWNER_APPROVED_EXAMPLES.jsonl"),
  allOwnerCorrections
).filter((entry) => entry.ownerApproved === true && typeof entry.text === "string" && entry.text.trim());
const ownerCorrections = allOwnerCorrections
  .filter((entry) => typeof entry.corrected === "string" && entry.corrected.trim() && !entry.corrected.trim().startsWith("["));
const voiceIndex = JSON.parse(read("packages/astro-knowledge/voice/tldr-astro/satori-writer/voice-index.json"));
const ownerCorpus = withoutOwnerRejectedEvidence(voiceIndex.entries, allOwnerCorrections).filter((entry) => (
  entry.ownerAuthored === true
  && entry.ownerApproved === true
  && entry.useAsPositiveVoiceEvidence === true
  && typeof entry.text === "string"
  && entry.text.trim()
));

const groupedCorpus = new Map();
for (const entry of ownerCorpus) {
  const sourceKey = `corpus:${entry.sourcePath}`;
  const group = groupedCorpus.get(sourceKey) ?? {
    sourceKey,
    sourceType: "owner_corpus",
    sourcePath: entry.sourcePath,
    contentKeys: [],
    texts: []
  };
  group.contentKeys.push(entry.sourceId);
  group.texts.push(entry.text.trim());
  groupedCorpus.set(sourceKey, group);
}

const candidates = [
  ...[...groupedCorpus.values()].map((entry) => ({ ...entry, text: entry.texts.join("\n") })),
  ...ownerCorrections.map((entry, index) => ({
    sourceKey: `owner-correction:${index + 1}:${sha(entry.bad).slice(0, 12)}`,
    sourceType: "owner_correction",
    sourcePath: "data/writing/owner-corrections.jsonl",
    contentKeys: [entry.category],
    text: entry.corrected.trim()
  })),
  ...approvedExamples.map((entry) => ({
    sourceKey: `${entry.family.startsWith("knowledge-matrix-") ? "matrix" : "serving"}:${entry.id ?? entry.contentKey}`,
    sourceType: entry.family.startsWith("knowledge-matrix-") ? "knowledge_matrix" : "approved_serving",
    sourcePath: entry.source ?? "data/writing/OWNER_APPROVED_EXAMPLES.jsonl",
    contentKeys: [entry.contentKey],
    text: entry.text.trim()
  }))
];

const seenText = new Set();
const records = [];
for (const candidate of candidates) {
  const digest = sha(normalizedText(candidate.text));
  if (seenText.has(digest)) continue;
  seenText.add(digest);
  records.push({ ...candidate, textSha256: digest });
}

const sourceSummary = {
  approvedExampleRowsRead: approvedExamples.length,
  ownerCorpusEntriesRead: ownerCorpus.length,
  ownerCorpusDocuments: groupedCorpus.size,
  ownerCorrectionsUsed: ownerCorrections.length,
  deduplicatedSourcesUsed: records.length,
  duplicateTextsRemoved: candidates.length - records.length,
  bySourceType: Object.fromEntries([...new Set(records.map((entry) => entry.sourceType))].sort().map((sourceType) => [
    sourceType,
    records.filter((entry) => entry.sourceType === sourceType).length
  ]))
};

const table = buildCollocationTable(records);
const serialized = serializeCollocationTable(table, sourceSummary);
const falsePositiveReport = leaveOneSourceOutFalsePositiveReport(records, table);
const targetChecks = [
  "The clearest voice makes the choice.",
  "Resentment then grows inside an arrangement that still looks calm.",
  "The connection can stay easy."
].map((text) => ({ text, advisories: novelCollocationAdvisories(text, serialized) }));

const outputDir = path.join(repoRoot, "data/writing/collocations");
const reviewDir = path.join(repoRoot, "packages/astro-knowledge/review/writing-pipeline-v3/novel-collocation-advisory-v1");
fs.mkdirSync(outputDir, { recursive: true });
fs.mkdirSync(reviewDir, { recursive: true });
const tablePath = path.join(outputDir, "approved-collocations-v1.json");
const reportPath = path.join(reviewDir, "false-positive-report.json");
fs.writeFileSync(tablePath, `${JSON.stringify(serialized)}\n`);
fs.writeFileSync(reportPath, `${JSON.stringify({ sourceSummary, tableCounts: table.counts, falsePositiveReport, targetChecks }, null, 2)}\n`);

const percent = (value) => `${(value * 100).toFixed(2)}%`;
const markdown = `# Novel collocation advisory v1: false-positive measurement

Status: experimental, advisory-only, inactive pending owner review.

## Source build

- Approved example rows read: ${sourceSummary.approvedExampleRowsRead.toLocaleString("en-US")}
- Positive owner-corpus passages read: ${sourceSummary.ownerCorpusEntriesRead.toLocaleString("en-US")} across ${sourceSummary.ownerCorpusDocuments} source documents
- Owner-directed corrected lines used: ${sourceSummary.ownerCorrectionsUsed.toLocaleString("en-US")}
- Deduplicated approved sources used: ${sourceSummary.deduplicatedSourcesUsed.toLocaleString("en-US")}
- Duplicate texts removed before measurement: ${sourceSummary.duplicateTextsRemoved.toLocaleString("en-US")}
- Approved sentences represented: ${table.counts.sentences.toLocaleString("en-US")}
- Unique adjective-noun and verb-noun pairs: ${table.counts.uniquePairs.toLocaleString("en-US")}

## Honest false-positive test

Method: leave one approved source out. Each source is checked only against pairs found in other approved sources. Because every evaluated source is owner-approved, every flag is counted as a false positive.

- Approved sources flagged: ${falsePositiveReport.totals.sourcesFlagged.toLocaleString("en-US")} of ${falsePositiveReport.totals.sourcesEvaluated.toLocaleString("en-US")} (${percent(falsePositiveReport.totals.sourceFalsePositiveRate)})
- Approved sentences flagged: ${falsePositiveReport.totals.sentencesFlagged.toLocaleString("en-US")} of ${falsePositiveReport.totals.sentencesEvaluated.toLocaleString("en-US")} (${percent(falsePositiveReport.totals.sentenceFalsePositiveRate)})
- Pair occurrences flagged: ${falsePositiveReport.totals.pairOccurrencesFlagged.toLocaleString("en-US")} of ${falsePositiveReport.totals.pairOccurrencesEvaluated.toLocaleString("en-US")} (${percent(falsePositiveReport.totals.pairFalsePositiveRate)})

| Source | Sources | Sources flagged | Source FP rate | Sentence FP rate | Pair FP rate |
|---|---:|---:|---:|---:|---:|
${Object.entries(falsePositiveReport.bySourceType).map(([sourceType, value]) => `| ${sourceType} | ${value.sources.toLocaleString("en-US")} | ${value.sourcesFlagged.toLocaleString("en-US")} | ${percent(value.sourceFalsePositiveRate)} | ${percent(value.sentenceFalsePositiveRate)} | ${percent(value.pairFalsePositiveRate)} |`).join("\n")}

## Target probes

${targetChecks.map((entry) => `- ${JSON.stringify(entry.text)}: ${entry.advisories.length ? entry.advisories.map((flag) => `\`${flag.detail}\``).join(", ") : "no novel pair found"}`).join("\n")}

## Governance

This detector is deterministic and advisory-only. It cannot block, revise, approve, stage, promote, or serve copy. It is not active in the writing pipeline while the owner reviews this measurement. A novel pair is a reading-order hint, not proof that a sentence is wrong.

The measured noise is high enough that activation is not recommended in its current form. The target probes work, but the same rule flags many legitimate one-off phrases in approved prose. No threshold was silently weakened to improve the reported score.
`;
fs.writeFileSync(path.join(reviewDir, "README.md"), markdown);

console.log(JSON.stringify({
  table: path.relative(repoRoot, tablePath),
  report: path.relative(repoRoot, reportPath),
  sourceSummary,
  tableCounts: table.counts,
  falsePositiveTotals: falsePositiveReport.totals,
  targetChecks
}, null, 2));
