#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");
const { PROSE_FIELDS, bodyFor, lintExactEntry } = require("./sky-exact-aspect-corpus.js");

const DEFAULT_DIR = path.join(__dirname, "..", "out", "sky-exact-aspect-drafts");
const BATCH_FILES = {
  lilith: "TLDR-Sky-Lilith-Exact-Aspects-DRAFT.md",
  chiron: "TLDR-Sky-Chiron-Exact-Aspects-DRAFT.md",
  "node-axis": "TLDR-Sky-Node-Axis-Exact-Aspects-DRAFT.md",
  "classical-quincunx": "TLDR-Sky-Classical-Quincunxes-DRAFT.md"
};
const EXPECTED = { lilith: 72, chiron: 66, "node-axis": 60, "classical-quincunx": 42 };

function normalizeWords(text) {
  return String(text || "").toLowerCase().match(/[a-z0-9']+/g) || [];
}

function ngrams(text, size) {
  const words = normalizeWords(text);
  const out = new Set();
  for (let index = 0; index <= words.length - size; index += 1) out.add(words.slice(index, index + size).join(" "));
  return out;
}

function readRecords(outDir) {
  if (!fs.existsSync(outDir)) throw new Error(`Draft directory does not exist: ${outDir}`);
  return fs.readdirSync(outDir)
    .filter((name) => name.endsWith(".json") && !name.startsWith("_"))
    .map((name) => JSON.parse(fs.readFileSync(path.join(outDir, name), "utf8")))
    .sort((a, b) => a.id.localeCompare(b.id));
}

function repetitionAudit(records) {
  const livedPhraseRows = new Map();
  const openingRows = new Map();
  for (const record of records) {
    const lived = bodyFor(record.draft);
    for (const phrase of ngrams(lived, 5)) {
      if (!livedPhraseRows.has(phrase)) livedPhraseRows.set(phrase, []);
      livedPhraseRows.get(phrase).push(record.id);
    }
    const opening = normalizeWords(lived).slice(0, 5).join(" ");
    if (!openingRows.has(opening)) openingRows.set(opening, []);
    openingRows.get(opening).push(record.id);
  }
  return {
    repeatedFiveGrams: [...livedPhraseRows.entries()]
      .filter(([, ids]) => ids.length >= 4)
      .map(([phrase, ids]) => ({ phrase, count: ids.length, ids }))
      .sort((a, b) => b.count - a.count || a.phrase.localeCompare(b.phrase)),
    repeatedOpenings: [...openingRows.entries()]
      .filter(([opening, ids]) => opening && ids.length >= 3)
      .map(([opening, ids]) => ({ opening, count: ids.length, ids }))
      .sort((a, b) => b.count - a.count || a.opening.localeCompare(b.opening))
  };
}

function settingAudit(records) {
  const terms = ["announcement", "committee", "email", "manager", "meeting", "memo", "policy", "team", "group chat"];
  return terms.map((term) => {
    const ids = records.filter((record) => bodyFor(record.draft).toLowerCase().includes(term)).map((record) => record.id);
    return { term, count: ids.length, share: records.length ? ids.length / records.length : 0, ids };
  }).filter((row) => row.share >= 0.1).sort((a, b) => b.share - a.share);
}

function markdownFor(batch, records) {
  const title = {
    lilith: "Lilith exact Current Sky aspects",
    chiron: "Chiron exact Current Sky aspects",
    "node-axis": "Node-axis exact Current Sky aspects",
    "classical-quincunx": "Classical quincunx Current Sky aspects"
  }[batch];
  return [
    `# ${title} (needs_review)`,
    ``,
    `These are GPT-5.6 Sol drafts for owner review. They are non-serving and are not approved reader copy.`,
    ``,
    ...records.flatMap((record) => [
      `## ${record.draft.title}`,
      ``,
      bodyFor(record.draft),
      ``,
      `Review gate: ${record.reviewGate}; judge: ${record.judge?.score || "?"}/3; attempts: ${record.attempts}.`,
      ``
    ])
  ].join("\n");
}

function writeJson(filePath, value) {
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

function run(outDir = DEFAULT_DIR, { allowPartial = false } = {}) {
  const records = readRecords(outDir);
  const byBatch = records.reduce((groups, record) => {
    if (!groups[record.batch]) groups[record.batch] = [];
    groups[record.batch].push(record);
    return groups;
  }, {});
  const countFindings = Object.entries(EXPECTED)
    .filter(([batch, count]) => (byBatch[batch] || []).length !== count)
    .map(([batch, count]) => ({ batch, expected: count, actual: (byBatch[batch] || []).length }));
  const lintFailures = records.flatMap((record) => {
    const lint = lintExactEntry(record.draft);
    return lint.fails ? [{ id: record.id, findings: lint.findings }] : [];
  });
  const judgeRepairs = records.filter((record) => record.reviewGate !== "owner-review").map((record) => ({
    id: record.id,
    score: record.judge?.score || 0,
    naturalnessScore: record.naturalnessJudge?.score || 0,
    naturalnessContractViolation: Boolean(record.naturalnessJudge?.contractViolation),
    naturalnessContractIssues: record.naturalnessJudge?.contractIssues || [],
    weakestField: record.judge?.weakestField || "",
    why: record.naturalnessJudge?.why || record.judge?.why || ""
  }));
  const repetition = repetitionAudit(records);
  const settingSaturation = settingAudit(records);
  const audit = {
    schemaVersion: 1,
    recordedAt: new Date().toISOString(),
    status: "needs_review",
    serving: false,
    recordCount: records.length,
    counts: Object.fromEntries(Object.entries(byBatch).map(([batch, rows]) => [batch, rows.length])),
    countFindings,
    lintFailures,
    judgeRepairs,
    repetition,
    settingSaturation,
    passed: (allowPartial || countFindings.length === 0)
      && lintFailures.length === 0
      && judgeRepairs.length === 0
      && repetition.repeatedFiveGrams.length === 0
      && repetition.repeatedOpenings.length === 0
      && settingSaturation.length === 0
  };
  writeJson(path.join(outDir, "_audit.json"), audit);
  for (const [batch, fileName] of Object.entries(BATCH_FILES)) {
    fs.writeFileSync(path.join(outDir, fileName), markdownFor(batch, byBatch[batch] || []));
  }
  return audit;
}

if (require.main === module) {
  try {
    const outArg = process.argv.find((token) => token.startsWith("--out="));
    const result = run(
      outArg ? path.resolve(outArg.slice(6)) : DEFAULT_DIR,
      { allowPartial: process.argv.includes("--allow-partial") }
    );
    console.log(JSON.stringify(result, null, 2));
    if (!result.passed) process.exitCode = 1;
  } catch (error) {
    console.error(error instanceof Error ? error.stack : error);
    process.exitCode = 1;
  }
}

module.exports = { readRecords, repetitionAudit, run, settingAudit };
