#!/usr/bin/env node

import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { readInlineXlsxSheet } from "./lib/read-inline-xlsx.mjs";
import { validateCopy } from "../src/astro-writing/validateCopy.mjs";
import { BANNED_FRIEND_SENTENCES, validateBatchCadence, validateCrossRowUniqueness } from "../src/astro-writing/natalBatchGuards.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const sourcePath = path.join(repoRoot, "packages/astro-knowledge/review/TLDR-LL-V13-WP1-BATCH-01-EDITORIAL-REVISION-V4-OWNER-STYLE.xlsx");
const outputPath = path.join(repoRoot, "packages/astro-knowledge/review/TLDR-LL-V13-WP1-BATCH-01-EDITORIAL-REVISION-V4.xlsx");
const artifactPath = path.join(repoRoot, "packages/astro-knowledge/review/natal-writer-evidence-2026-08-13/ll-v13-wp1-batch-01-v4-two-voice-candidates.json");
const sha256 = (value) => crypto.createHash("sha256").update(value).digest("hex");
const sourceRows = readInlineXlsxSheet(sourcePath, "Candidates132");
const outputRows = readInlineXlsxSheet(outputPath, "Candidates132");
const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf8"));
const artifactByKey = new Map(artifact.rows.map((row) => [row.rowKey, row]));

assert.equal(sha256(fs.readFileSync(sourcePath)), "6f76d76702e5a2fab9f8db18aebd0633d08a50ad5a593bfabcf141b6ae710da8");
assert.equal(sourceRows.length, 132);
assert.equal(outputRows.length, 132);
assert.equal(artifact.summary.selfCandidates, 132);
assert.equal(artifact.summary.friendCandidates, 132);
assert.equal(artifact.summary.selfReauthoredAfterNewGate, 23);
assert.equal(artifact.summary.sourceGaps, 0);
assert.equal(artifact.summary.abstractSubjectOrChartDeixisFailures, 0);
assert.equal(artifact.summary.friendEntryOrDerivationFailures, 0);
assert.equal(artifact.gateEffectiveness.priorV3OwnerObservedOnlyOneObservableSentence, 34);
assert.equal(artifact.gateEffectiveness.priorV3ReadyRows, 51);
assert.equal(validateBatchCadence(artifact.rows.map((row) => ({ copy: row.self.copy }))).passed, true);
assert.equal(validateBatchCadence(artifact.rows.map((row) => ({ copy: row.friend.copy }))).passed, true);

const abstractFailureKeys = [];
for (let index = 0; index < outputRows.length; index += 1) {
  const source = sourceRows[index].cells;
  const output = outputRows[index].cells;
  assert.deepEqual(Object.values(output).slice(0, 15), Object.values(source).slice(0, 15), `Row ${index + 2}: established columns A:O changed.`);
  const candidate = artifactByKey.get(output["Row key"]);
  assert.ok(candidate, `Row ${index + 2}: missing candidate artifact row.`);
  assert.equal(output["Metadata SHA-256"], candidate.metadataSha256);
  assert.equal(output["V4 self rewrite (NOT owner approved)"], candidate.self.copy);
  assert.equal(output["V4 Friend copy (NOT owner approved)"], candidate.friend.copy);
  assert.equal(output["Owner verdict"], "");
  assert.equal(output["Owner edit"], "");
  assert.equal(output["V4 self owner verdict"], "");
  assert.equal(output["V4 self owner edit"], "");
  assert.equal(output["V4 Friend owner verdict"], "");
  assert.equal(output["V4 Friend owner edit"], "");
  const selfNewGate = validateCopy(candidate.self.copy, { family: "natal-aspect-exact", register: "collective", plan: { astrologySupport: "present" } })
    .violations.filter((item) => ["abstract_subject_grammar", "chart_deixis"].includes(item.category));
  if (selfNewGate.some((item) => item.category === "abstract_subject_grammar")) abstractFailureKeys.push(candidate.rowKey);
}
assert.deepEqual(abstractFailureKeys, [
  "mars|opposition|north_node",
  "mercury|trine|jupiter",
  "moon|trine|north_node",
  "moon|trine|saturn"
]);
const selfUniqueness = validateCrossRowUniqueness(artifact.rows.map((row) => ({ rowKey: row.rowKey, copy: row.self.copy })));
const friendUniqueness = validateCrossRowUniqueness(artifact.rows.map((row) => ({ rowKey: row.rowKey, copy: row.friend.copy })), { bannedSentences: BANNED_FRIEND_SENTENCES });
assert.equal(selfUniqueness.sentenceCount, 527);
assert.equal(selfUniqueness.uniqueSentenceCount, 527);
assert.equal(friendUniqueness.sentenceCount, 528);
assert.equal(friendUniqueness.uniqueSentenceCount, 123);
assert.equal(friendUniqueness.repeatedOccurrenceCount, 489);
assert.equal(Number(friendUniqueness.repeatedOccurrenceRate.toFixed(4)), 0.9261);
assert.equal(friendUniqueness.exactDuplicateGroups[0].count, 39);
assert.equal(friendUniqueness.exactDuplicateGroups[0].sentence, BANNED_FRIEND_SENTENCES[0]);

console.log(JSON.stringify({ rows: 132, historicalV4: { self: "527/527 unique", friend: "123/528 unique", repeatedFriendOccurrenceRate: 0.9261 }, abstractSubjectFailures: abstractFailureKeys }));
