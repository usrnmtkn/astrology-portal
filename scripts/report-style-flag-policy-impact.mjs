#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const {
  findPolicyFindings,
  normalizePolicyEntry,
  termRegex
} = require("../packages/astro-knowledge/scripts/banned-word-policy.js");

const root = process.cwd();
const policyPath = path.join(root, "packages/astro-knowledge/voice/banned-words.json");
const examplesPath = path.join(root, "data/writing/OWNER_APPROVED_EXAMPLES.jsonl");
const evidencePath = path.join(root, "packages/astro-knowledge/voice/tldr-astro/satori-writer/voice-index.json");
const outDir = path.join(root, "packages/astro-knowledge/review/style-flag-policy-2026-08-16");

function readJson(file) { return JSON.parse(fs.readFileSync(file, "utf8")); }
function readJsonl(file) { return fs.readFileSync(file, "utf8").split(/\r?\n/u).filter(Boolean).map(JSON.parse); }
function countBy(values, key) {
  const result = {};
  for (const value of values) result[key(value)] = (result[key(value)] ?? 0) + 1;
  return Object.fromEntries(Object.entries(result).sort((a, b) => a[0].localeCompare(b[0])));
}
function oldFlatMatches(text, entries) {
  return entries.flatMap((raw) => {
    const entry = normalizePolicyEntry(raw);
    const match = termRegex(entry.term)?.exec(String(text || ""));
    return match ? [{ term: entry.term, match: match[0] }] : [];
  });
}
function scan(records, entries) {
  const rows = records.map((record) => {
    const text = record.text ?? record.body ?? "";
    return {
      id: record.contentKey ?? record.sourceId ?? record.id,
      sourcePath: record.sourcePath ?? record.source ?? null,
      oldFindings: oldFlatMatches(text, entries),
      findings: findPolicyFindings(text, entries)
    };
  });
  const findings = rows.flatMap((row) => row.findings.map((finding) => ({ ...finding, id: row.id })));
  const oldFailed = rows.filter((row) => row.oldFindings.length);
  const newFailed = rows.filter((row) => row.findings.some((finding) => finding.severity === "fail"));
  const changed = rows.filter((row) => row.oldFindings.length && !row.findings.some((finding) => finding.severity === "fail"));
  return {
    recordsScanned: rows.length,
    rowsWithAnyFinding: rows.filter((row) => row.findings.length).length,
    rowsWithFailure: newFailed.length,
    rowsWithAdvisoryOnly: rows.filter((row) => row.findings.length && row.findings.every((finding) => finding.severity === "warn")).length,
    findingCountByPolicyClass: countBy(findings, (finding) => finding.policyClass),
    rowCountByPolicyClass: Object.fromEntries([...new Set(findings.map((finding) => finding.policyClass))].sort().map((policyClass) => [
      policyClass,
      new Set(findings.filter((finding) => finding.policyClass === policyClass).map((finding) => finding.id)).size
    ])),
    previousFlatFailureRows: oldFailed.length,
    reclassifiedFromFailure: changed.map((row) => ({
      id: row.id,
      previousTerms: row.oldFindings.map((finding) => finding.term),
      currentFindings: row.findings.map(({ term, policyClass, severity }) => ({ term, policyClass, severity }))
    }))
  };
}

const policy = readJson(policyPath);
const entries = [...policy.bannedWords, ...(policy.waivedTerms ?? [])];
const examples = readJsonl(examplesPath);
const serving = examples.filter((entry) => entry.source === "fallbackArchitectureV3");
const voiceIndex = readJson(evidencePath).entries ?? [];
const evidence = voiceIndex.filter((entry) => entry.ownerApproved === true || entry.useAsPositiveVoiceEvidence === true);
const report = {
  schema: "tldrastro-style-flag-policy-impact-v1",
  generatedAt: "2026-08-16",
  policySource: path.relative(root, policyPath),
  persistedRowStatusChanges: 0,
  note: "This policy-only change does not mutate review_status, approval, staging, promotion, or serving. Reclassified rows below describe deterministic lint outcomes only.",
  servingReaderCopy: scan(serving, entries),
  ownerCorpusAndEvidence: scan(evidence, entries)
};

fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, "impact-report.json"), `${JSON.stringify(report, null, 2)}\n`);

const lines = [
  "# Style-flag policy impact report",
  "",
  `Generated: ${report.generatedAt}`,
  "",
  "This is a policy-only audit. Persisted row status changes: **0**. No copy, review status, approval, staging, promotion, or serving state changed.",
  "",
  "## Currently serving reader copy",
  "",
  `- Records scanned: ${report.servingReaderCopy.recordsScanned}`,
  `- Rows with deterministic failure under the old flat list: ${report.servingReaderCopy.previousFlatFailureRows}`,
  `- Rows with deterministic failure under the classified policy: ${report.servingReaderCopy.rowsWithFailure}`,
  `- Rows with advisory-only findings: ${report.servingReaderCopy.rowsWithAdvisoryOnly}`,
  `- Findings by policy class: ${JSON.stringify(report.servingReaderCopy.findingCountByPolicyClass)}`,
  `- Rows by policy class: ${JSON.stringify(report.servingReaderCopy.rowCountByPolicyClass)}`,
  "",
  "## Owner corpus and evidence stores",
  "",
  `- Records scanned: ${report.ownerCorpusAndEvidence.recordsScanned}`,
  `- Rows excluded under the old flat list: ${report.ownerCorpusAndEvidence.previousFlatFailureRows}`,
  `- Rows excluded under the classified policy: ${report.ownerCorpusAndEvidence.rowsWithFailure}`,
  `- Rows with advisory-only findings: ${report.ownerCorpusAndEvidence.rowsWithAdvisoryOnly}`,
  `- Findings by policy class: ${JSON.stringify(report.ownerCorpusAndEvidence.findingCountByPolicyClass)}`,
  `- Rows by policy class: ${JSON.stringify(report.ownerCorpusAndEvidence.rowCountByPolicyClass)}`,
  "",
  "## Serving rows reclassified from the old deterministic failure",
  "",
  ...(report.servingReaderCopy.reclassifiedFromFailure.length
    ? report.servingReaderCopy.reclassifiedFromFailure.map((entry) => `- \`${entry.id}\`: ${entry.previousTerms.join(", ")} -> ${entry.currentFindings.length ? entry.currentFindings.map((finding) => `${finding.term} (${finding.policyClass}, ${finding.severity})`).join(", ") : "no finding"}`)
    : ["- None."]),
  ""
];
fs.writeFileSync(path.join(outDir, "impact-report.md"), lines.join("\n"));
console.log(JSON.stringify(report, null, 2));
