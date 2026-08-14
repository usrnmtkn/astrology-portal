#!/usr/bin/env node

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { readInlineXlsxSheet } from "./lib/read-inline-xlsx.mjs";
import { validateCopy } from "../src/astro-writing/validateCopy.mjs";
import { BANNED_FRIEND_SENTENCES, validateBatchCadence, validateCrossRowUniqueness, validateFriendPair, validatePassageShape } from "../src/astro-writing/natalBatchGuards.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const v5Workbook = readInlineXlsxSheet(path.join(root, "packages/astro-knowledge/review/TLDR-LL-V13-WP1-BATCH-01-EDITORIAL-REVISION-V5.xlsx"), "Candidates132");
const v6Workbook = readInlineXlsxSheet(path.join(root, "packages/astro-knowledge/review/TLDR-LL-V13-WP1-BATCH-01-EDITORIAL-REVISION-V6.xlsx"), "Candidates132");
const artifact = JSON.parse(fs.readFileSync(path.join(root, "packages/astro-knowledge/review/natal-writer-evidence-2026-08-13/ll-v13-wp1-batch-01-v6-two-voice-candidates.json"), "utf8"));
const byKey = new Map(artifact.rows.map((row) => [row.rowKey, row]));

assert.equal(v5Workbook.length, 132);
assert.equal(v6Workbook.length, 132);
assert.deepEqual(artifact.metrics.friend.sentenceCountDistribution, { "4": 132 });
assert.equal(artifact.metrics.friend.medianWords, 61);
assert.equal(artifact.metrics.self.medianWords, 69);
assert.equal(artifact.metrics.self.zeroObservableNounRows, 0);
assert.equal(artifact.metrics.friend.zeroObservableNounRows, 0);
assert.equal(artifact.metrics.self.underTwoObservableNounRows, 0);
assert.equal(artifact.metrics.friend.underTwoObservableNounRows, 0);

for (let index = 0; index < v6Workbook.length; index += 1) {
  const before = Object.values(v5Workbook[index].cells).slice(0, 15);
  const after = Object.values(v6Workbook[index].cells).slice(0, 15);
  assert.deepEqual(after, before, `Row ${index + 2}: established columns A:O changed.`);
  const cells = v6Workbook[index].cells;
  const row = byKey.get(cells["Row key"]);
  assert.ok(row, cells["Row key"]);
  assert.equal(cells["V6 self rewrite (NOT owner approved)"], row.self.copy);
  assert.equal(cells["V6 Friend copy (NOT owner approved)"], row.friend.copy);
  assert.equal(cells["V6 self owner verdict"], "");
  assert.equal(cells["V6 self owner edit"], "");
  assert.equal(cells["V6 Friend owner verdict"], "");
  assert.equal(cells["V6 Friend owner edit"], "");
  assert.equal(validatePassageShape(row.self.copy, { minSentences: 1, minWords: 1, minDistinctObservableNouns: 2 }).passed, true, row.rowKey);
  assert.equal(validatePassageShape(row.friend.copy).passed, true, row.rowKey);
  const selfAbstract = validateCopy(row.self.copy, { plan: { astrologySupport: "present" } }).violations.filter((item) => item.category === "abstract_subject_grammar");
  const friendAbstract = validateCopy(row.friend.copy, { plan: { astrologySupport: "present" } }).violations.filter((item) => item.category === "abstract_subject_grammar");
  assert.deepEqual(selfAbstract, [], row.rowKey);
  assert.deepEqual(friendAbstract, [], row.rowKey);
  assert.equal(validateFriendPair({ selfCopy: row.self.copy, friendCopy: row.friend.copy }).passed, true, row.rowKey);
}

const selfRows = artifact.rows.map((row) => ({ rowKey: row.rowKey, copy: row.self.copy }));
const friendRows = artifact.rows.map((row) => ({ rowKey: row.rowKey, copy: row.friend.copy }));
const selfUnique = validateCrossRowUniqueness(selfRows);
const friendUnique = validateCrossRowUniqueness(friendRows, { bannedSentences: BANNED_FRIEND_SENTENCES });
assert.equal(validateBatchCadence(selfRows).passed, true);
assert.equal(validateBatchCadence(friendRows).passed, true);
assert.equal(selfUnique.passed, true);
assert.equal(friendUnique.passed, true);
assert.equal(selfUnique.uniqueSentenceRatio, 1);
assert.equal(friendUnique.uniqueSentenceRatio, 1);
assert.equal(friendUnique.bannedFindings.length, 0);
assert.ok(selfUnique.highestNearDuplicatePairScore <= 0.85);
assert.ok(friendUnique.highestNearDuplicatePairScore <= 0.85);

console.log(JSON.stringify({ rows: 132, sentenceDistribution: artifact.metrics, uniqueSentenceRatio: { self: 1, friend: 1 }, highestNearDuplicatePairScore: { self: selfUnique.highestNearDuplicatePairScore, friend: friendUnique.highestNearDuplicatePairScore }, bannedFriendSentences: 0, ownerVerdictsBlank: true }));
