#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, "..");
const roots = [
  "apps/web/src/content/fallbackArchitectureV3/source-rows",
  "apps/web/src/content/fallbackArchitectureV3/authored-inputs",
  "packages/astro-knowledge/data"
];

// Normalize reader-facing strings only. Editorial notes, provenance, source keys,
// and diagnostic fields remain byte-identical.
const readerStringFields = new Set([
  "body", "body_you", "body_they", "body_sky", "plainTranslation",
  "shadow", "traditional", "summary", "headline", "try_this", "opening",
  "tension", "development", "close", "title", "weeklyOverview",
  "conflictPatterns", "gift", "challenge", "integration", "overview",
  "tagline", "hook", "lived", "turn", "copy", "text", "do", "dont"
]);

const mappedPattern = /[\u2018\u2019\u201c\u201d\u2026\u2013\u2014\u00a0\u200b-\u200f\ufeff\u202a-\u202e\u2066-\u2069]/gu;
const mapping = new Map([
  ["\u2018", "'"], ["\u2019", "'"],
  ["\u201c", "\""], ["\u201d", "\""],
  ["\u2026", "..."],
  ["\u2013", "-"], ["\u2014", "-"],
  ["\u00a0", " "],
  ["\u200b", ""], ["\u200c", ""], ["\u200d", ""], ["\u200e", ""], ["\u200f", ""],
  ["\ufeff", ""],
  ["\u202a", ""], ["\u202b", ""], ["\u202c", ""], ["\u202d", ""], ["\u202e", ""],
  ["\u2066", ""], ["\u2067", ""], ["\u2068", ""], ["\u2069", ""]
]);

function normalize(value) {
  return value.replace(mappedPattern, (character) => mapping.get(character) ?? character);
}

function jsonFiles(directory) {
  if (!fs.existsSync(directory)) return [];
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const target = path.join(directory, entry.name);
    if (entry.isDirectory()) return jsonFiles(target);
    return entry.isFile() && entry.name.endsWith(".json") ? [target] : [];
  });
}

// Parse JSON string spans while preserving file formatting. Only changed reader
// string tokens are replaced, so accents and non-reader metadata are untouched.
function stringValueSpans(raw) {
  let cursor = 0;
  const spans = [];
  const skip = () => { while (/\s/u.test(raw[cursor] ?? "")) cursor += 1; };
  const parseString = () => {
    const start = cursor;
    cursor += 1;
    while (cursor < raw.length) {
      if (raw[cursor] === "\\") { cursor += 2; continue; }
      if (raw[cursor] === "\"") { cursor += 1; break; }
      cursor += 1;
    }
    const token = raw.slice(start, cursor);
    return { start, end: cursor, value: JSON.parse(token) };
  };
  const parseValue = (field = null) => {
    skip();
    if (raw[cursor] === "\"") {
      const token = parseString();
      if (readerStringFields.has(field)) spans.push(token);
      return;
    }
    if (raw[cursor] === "{") {
      cursor += 1; skip();
      while (cursor < raw.length && raw[cursor] !== "}") {
        const key = parseString().value;
        skip();
        if (raw[cursor] !== ":") throw new Error(`Expected colon at byte ${cursor}`);
        cursor += 1;
        parseValue(key);
        skip();
        if (raw[cursor] === ",") { cursor += 1; skip(); continue; }
        break;
      }
      if (raw[cursor] !== "}") throw new Error(`Expected object close at byte ${cursor}`);
      cursor += 1;
      return;
    }
    if (raw[cursor] === "[") {
      cursor += 1; skip();
      while (cursor < raw.length && raw[cursor] !== "]") {
        parseValue(field);
        skip();
        if (raw[cursor] === ",") { cursor += 1; skip(); continue; }
        break;
      }
      if (raw[cursor] !== "]") throw new Error(`Expected array close at byte ${cursor}`);
      cursor += 1;
      return;
    }
    while (cursor < raw.length && !/[\s,\]}]/u.test(raw[cursor])) cursor += 1;
  };
  parseValue();
  skip();
  if (cursor !== raw.length) throw new Error(`Unexpected JSON tail at byte ${cursor}`);
  return spans;
}

function inspectFile(file, apply) {
  const raw = fs.readFileSync(file, "utf8");
  const edits = [];
  const characterCounts = {};
  for (const span of stringValueSpans(raw)) {
    const next = normalize(span.value);
    if (next === span.value) continue;
    for (const character of span.value.match(mappedPattern) ?? []) {
      const code = `U+${character.codePointAt(0).toString(16).toUpperCase().padStart(4, "0")}`;
      characterCounts[code] = (characterCounts[code] ?? 0) + 1;
    }
    edits.push({ ...span, replacement: JSON.stringify(next) });
  }
  if (apply && edits.length) {
    let nextRaw = raw;
    for (const edit of edits.reverse()) {
      nextRaw = nextRaw.slice(0, edit.start) + edit.replacement + nextRaw.slice(edit.end);
    }
    fs.writeFileSync(file, nextRaw);
  }
  return { file: path.relative(repoRoot, file), values: edits.length, characterCounts };
}

const apply = process.argv.includes("--apply");
const files = roots.flatMap((root) => jsonFiles(path.join(repoRoot, root)));
const reports = files.map((file) => inspectFile(file, apply)).filter((report) => report.values > 0);
const totals = {};
for (const report of reports) {
  for (const [code, count] of Object.entries(report.characterCounts)) {
    totals[code] = (totals[code] ?? 0) + count;
  }
}
console.log(`mode: ${apply ? "apply" : "check"}`);
console.log(`files with reader-copy changes: ${reports.length}`);
console.log(`reader-copy values changed: ${reports.reduce((sum, report) => sum + report.values, 0)}`);
console.log(`characters replaced: ${Object.values(totals).reduce((sum, count) => sum + count, 0)}`);
for (const [code, count] of Object.entries(totals).sort()) console.log(`  ${code}: ${count}`);
for (const report of reports) console.log(`  ${report.file}: ${report.values} values`);
if (!apply && reports.length) process.exitCode = 1;
