#!/usr/bin/env node

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { readInlineXlsxSheet } from "./lib/read-inline-xlsx.mjs";
import { validateCopy } from "../src/astro-writing/validateCopy.mjs";
import { BANNED_FRIEND_SENTENCES, validateBatchCadence, validateCrossRowUniqueness, validateFriendPair } from "../src/astro-writing/natalBatchGuards.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const sourceRows = readInlineXlsxSheet(path.join(repoRoot, "packages/astro-knowledge/review/TLDR-LL-V13-WP1-BATCH-01-EDITORIAL-REVISION-V4-OWNER-STYLE.xlsx"), "Candidates132");
const outputRows = readInlineXlsxSheet(path.join(repoRoot, "packages/astro-knowledge/review/TLDR-LL-V13-WP1-BATCH-01-EDITORIAL-REVISION-V5.xlsx"), "Candidates132");
const artifact = JSON.parse(fs.readFileSync(path.join(repoRoot, "packages/astro-knowledge/review/natal-writer-evidence-2026-08-13/ll-v13-wp1-batch-01-v5-two-voice-candidates.json"), "utf8"));
const byKey = new Map(artifact.rows.map((row) => [row.rowKey, row]));
const historicalAbstractSubjectFailures = [];

assert.equal(sourceRows.length, 132);
assert.equal(outputRows.length, 132);
assert.equal(artifact.summary.friendRowsReauthored, 132);
assert.equal(artifact.summary.selfRowsReauthoredForAbstractSubjectGate, 4);
assert.equal(artifact.summary.selfRowsReauthoredForCrossRowNearDuplicateGate, 1);
assert.equal(artifact.summary.blankOwnerVerdicts, true);
assert.equal(artifact.skeletonRetirement.priorV4FramePlusSlotBuilderDeleted, true);
assert.equal(artifact.skeletonRetirement.sharedFriendFrameAvailableToWriter, false);

for (let index = 0; index < outputRows.length; index += 1) {
  const source = sourceRows[index].cells;
  const output = outputRows[index].cells;
  assert.deepEqual(Object.values(output).slice(0, 15), Object.values(source).slice(0, 15), `Row ${index + 2}: established columns A:O changed.`);
  const candidate = byKey.get(output["Row key"]);
  assert.ok(candidate, output["Row key"]);
  assert.equal(output["V5 self rewrite (NOT owner approved)"], candidate.self.copy);
  assert.equal(output["V5 Friend copy (NOT owner approved)"], candidate.friend.copy);
  assert.equal(output["V5 self owner verdict"], "");
  assert.equal(output["V5 self owner edit"], "");
  assert.equal(output["V5 Friend owner verdict"], "");
  assert.equal(output["V5 Friend owner edit"], "");
  const selfGate = validateCopy(candidate.self.copy, { family: "natal-aspect-exact", register: "collective", plan: { astrologySupport: "present" } })
    .violations.filter((item) => ["abstract_subject_grammar", "chart_deixis"].includes(item.category));
  if (selfGate.some((item) => item.category === "abstract_subject_grammar")) historicalAbstractSubjectFailures.push(candidate.rowKey);
  assert.equal(validateFriendPair({ selfCopy: candidate.self.copy, friendCopy: candidate.friend.copy }).passed, true, candidate.rowKey);
}

const selfRows = artifact.rows.map((row) => ({ rowKey: row.rowKey, copy: row.self.copy }));
const friendRows = artifact.rows.map((row) => ({ rowKey: row.rowKey, copy: row.friend.copy }));
const selfUniqueness = validateCrossRowUniqueness(selfRows);
const friendUniqueness = validateCrossRowUniqueness(friendRows, { bannedSentences: BANNED_FRIEND_SENTENCES });
assert.equal(validateBatchCadence(selfRows).passed, true);
assert.equal(validateBatchCadence(friendRows).passed, true);
assert.equal(selfUniqueness.passed, true);
assert.equal(friendUniqueness.passed, true);
assert.equal(selfUniqueness.uniqueSentenceRatio, 1);
assert.equal(friendUniqueness.uniqueSentenceRatio, 1);
assert.equal(friendUniqueness.bannedFindings.length, 0);
assert.ok(selfUniqueness.highestNearDuplicatePairScore <= 0.85);
assert.ok(friendUniqueness.highestNearDuplicatePairScore <= 0.85);
assert.ok(historicalAbstractSubjectFailures.includes("jupiter|conjunction|neptune"));
assert.ok(historicalAbstractSubjectFailures.includes("moon|square|jupiter"));

console.log(JSON.stringify({ rows: 132, historicalV5AbstractSubjectFailures: historicalAbstractSubjectFailures.length, uniqueSentenceRatio: { self: 1, friend: 1 }, highestNearDuplicatePairScore: { self: selfUniqueness.highestNearDuplicatePairScore, friend: friendUniqueness.highestNearDuplicatePairScore }, bannedFriendSentences: 0, ownerVerdictsBlank: true }));
