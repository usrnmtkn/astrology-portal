#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");
const { lintBatchRepetition } = require("./lint-placement-voice.js");

function entriesFromFile(filePath) {
  const value = JSON.parse(fs.readFileSync(filePath, "utf8"));
  if (Array.isArray(value.articles)) return value.articles;
  if (Array.isArray(value.rows)) return value.rows.map((article, index) => ({ id: article.id || article.contentKey || `${path.basename(filePath)}-${index + 1}`, article }));
  if (value.article) return [{ id: value.id || value.runId || path.basename(path.dirname(filePath)), article: value.article }];
  throw new Error(`${filePath} does not contain an article, articles, or rows collection.`);
}

function main() {
  const files = process.argv.slice(2).map((filePath) => path.resolve(filePath));
  if (!files.length) throw new Error("Pass one or more Sky Placement result or batch JSON files.");
  const entries = files.flatMap(entriesFromFile);
  const result = lintBatchRepetition(entries);
  process.stdout.write(`${JSON.stringify({ articleCount: entries.length, ...result }, null, 2)}\n`);
  if (!result.passed) process.exitCode = 1;
}

try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
}
