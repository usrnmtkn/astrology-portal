#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const privateModelRoot = path.resolve(here, "..");
const dataDir = path.join(privateModelRoot, ".local-data");
const trainPath = path.join(dataDir, "sky-article-longform.train.jsonl");
const evalPath = path.join(dataDir, "sky-article-longform.eval.jsonl");
const manifestPath = path.join(dataDir, "sky-article-longform.manifest.json");
const allowInsufficient = process.argv.includes("--allow-insufficient");

function readJsonl(file) {
  if (!fs.existsSync(file)) throw new Error(`Missing dataset file: ${file}`);
  return fs.readFileSync(file, "utf8").split("\n").filter(Boolean).map((line, index) => {
    try {
      return JSON.parse(line);
    } catch (error) {
      throw new Error(`${file}:${index + 1}: ${error.message}`);
    }
  });
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function factTokens(text) {
  return [
    ...(text.match(/\b(?:19|20)\d{2}\b/g) || []),
    ...(text.match(/\b(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+\d{1,2}\b/gi) || []),
    ...(text.match(/\b\d{1,2}°/g) || []),
  ];
}

function validateRow(row, split, hashes) {
  assert(row.surface === "sky-article-longform", `${row.id}: wrong surface`);
  assert(row.source_review_status === "approved", `${row.id}: source is not approved`);
  assert(Array.isArray(row.messages) && row.messages.length === 3, `${row.id}: expected three messages`);
  assert(row.messages[0].role === "developer", `${row.id}: missing developer message`);
  assert(row.messages[1].role === "user", `${row.id}: missing user message`);
  assert(row.messages[2].role === "assistant", `${row.id}: missing assistant message`);
  assert(!hashes.has(row.source_sha256), `${row.id}: duplicate or train/eval leakage (${split})`);
  hashes.add(row.source_sha256);

  let payload;
  try {
    payload = JSON.parse(row.messages[1].content);
  } catch {
    throw new Error(`${row.id}: user content is not structured JSON`);
  }
  assert(payload.fact_source, `${row.id}: missing fact provenance`);
  const userText = row.messages[1].content;
  const unsupported = factTokens(row.messages[2].content).filter((token) => !userText.includes(token));
  assert(unsupported.length === 0, `${row.id}: target contains unsupported fact tokens: ${unsupported.join(", ")}`);
}

const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
const train = readJsonl(trainPath);
const evalRows = readJsonl(evalPath);
const hashes = new Set();
train.forEach((row) => validateRow(row, "train", hashes));
evalRows.forEach((row) => validateRow(row, "eval", hashes));

assert(train.length === manifest.train_examples, "Train count differs from manifest");
assert(evalRows.length === manifest.eval_examples, "Eval count differs from manifest");
assert(evalRows.length > 0, "A held-out evaluation set is required");

if (!allowInsufficient) {
  assert(
    train.length >= manifest.minimum_train_examples,
    `Not ready: ${train.length} training examples; ${manifest.minimum_train_examples} required`,
  );
}

console.log(JSON.stringify({
  valid: true,
  ready_to_train: train.length >= manifest.minimum_train_examples,
  train_examples: train.length,
  eval_examples: evalRows.length,
  minimum_train_examples: manifest.minimum_train_examples,
  insufficient_allowed: allowInsufficient,
}, null, 2));
