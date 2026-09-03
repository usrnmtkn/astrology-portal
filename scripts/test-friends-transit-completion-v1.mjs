#!/usr/bin/env node
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { friendVoiceFromReaderCopy } from "../apps/web/src/content/fallbackArchitectureV3/resolver/renderTransitSynastry.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");
const completionPath = path.join(root, "packages/astro-knowledge/review/transit-aspect-friends-completion-v1.json");
const sunPath = path.join(root, "packages/astro-knowledge/review/transit-aspect-friends-sun-proposed-v1.json");
const overridePath = path.join(root, "packages/astro-knowledge/review/transit-aspect-sun-ascendant-hard-owner-published-2026-09-03.json");
const sourcePath = path.join(root, "apps/web/src/content/fallbackArchitectureV3/source-rows/transit-synastry-rows-v1.json");

const completion = JSON.parse(fs.readFileSync(completionPath, "utf8"));
const sun = JSON.parse(fs.readFileSync(sunPath, "utf8"));
const override = JSON.parse(fs.readFileSync(overridePath, "utf8"));
const source = JSON.parse(fs.readFileSync(sourcePath, "utf8"));
const sourceRows = Array.isArray(source.authoredCards) ? source.authoredCards : [];
const sourceByKey = new Map(sourceRows.map((row) => [String(row.contentKey ?? ""), row]));

assert.equal(completion.count, 351);
assert.equal(completion.records.length, 351);
assert.equal(completion.approvalLevel, "owner_signoff_untraced");
assert.equal(completion.servingEnabled, false);
assert.equal(sun.records.length, 27);

const expectedAllKeys = sourceRows
  .map((row) => String(row.contentKey ?? ""))
  .filter((key) => key.startsWith("authored/transit-aspect/"))
  .sort();
assert.equal(expectedAllKeys.length, 378, "Production source topology must contain exactly 378 personal-transit keys.");

const completionKeys = new Set();
const bodies = new Set();
const prohibited = [
  /\b(?:you|your|yours|yourself|yourselves)\b/iu,
  /—/u,
  /\bwhether\b/iu,
  /\bcapacity\b/iu,
  /\balignment\b/iu,
  /\bactivation\b/iu,
  /\bperformance\b/iu,
  /\broom\b/iu,
  /\bsteady\b/iu,
  /\bsteadier\b/iu,
  /\basks\b/iu,
  /\breal\b/iu
];

const editorialRegressions = [
  [/where [^.]{0,100}\bis concerned\b/iu, "awkward 'where … is concerned' domain grammar"],
  [/(?:^|[.!?]\s+)(?:a feeling changing|disruption exposing|a familiar sore point resurfacing|old history coloring|immediate pressure|a trigger that needs)/u, "lowercase mechanism phrase at sentence boundary"],
  [/\bask more of\b/iu, "North Node 'ask more of' phrasing"]
];

let converterComparisons = 0;
for (const record of completion.records) {
  assert.match(record.contentKey, /^authored\/transit-aspect\//u);
  assert.equal(record.contentKey.startsWith("authored/transit-aspect/sun/"), false, `${record.contentKey}: Sun belongs to the exact-approved packet.`);
  assert.equal(completionKeys.has(record.contentKey), false, `${record.contentKey}: duplicate completion key.`);
  completionKeys.add(record.contentKey);
  assert.equal(record.review_status, "owner_signoff_untraced");
  assert.equal(record.authorship, "independent_friend_authoring_from_mechanism");
  assert.equal(record.approvalLevel, "owner_signoff_untraced");
  assert.equal(record.owner_directed, true);

  const body = String(record.body_they ?? "");
  assert.ok(body.length > 0, `${record.contentKey}: missing Friends copy.`);
  assert.match(body, /\{\{Name\}\}/u, `${record.contentKey}: missing {{Name}}.`);
  assert.match(body, /\{\{aspectWord\}\}/u, `${record.contentKey}: missing {{aspectWord}}.`);
  assert.match(body, /\{\{untilDate\}\}/u, `${record.contentKey}: missing {{untilDate}}.`);
  assert.equal(body.includes("\n\n"), true, `${record.contentKey}: Friends passage must remain two paragraphs.`);
  for (const pattern of prohibited) {
    assert.doesNotMatch(body, pattern, `${record.contentKey}: prohibited style/language pattern ${pattern}.`);
  }
  for (const [pattern, label] of editorialRegressions) {
    assert.doesNotMatch(body, pattern, `${record.contentKey}: ${label}.`);
  }
  assert.doesNotMatch(body, /\bthey\s+(?:is|has|was)\b/iu, `${record.contentKey}: likely they/them agreement error.`);
  assert.doesNotMatch(body, /\btheir\s+(?:is|are|was|were)\b/iu, `${record.contentKey}: likely possessive agreement error.`);

  const wordCount = body
    .replace(/\{\{[^{}]+\}\}/gu, "variable")
    .trim()
    .split(/\s+/u)
    .filter(Boolean).length;
  assert.ok(wordCount >= 80, `${record.contentKey}: too short at ${wordCount} words.`);
  assert.ok(wordCount <= 155, `${record.contentKey}: too long at ${wordCount} words.`);

  const expectedHash = crypto.createHash("sha256").update(body).digest("hex");
  assert.equal(record.body_they_sha256, expectedHash, `${record.contentKey}: SHA-256 mismatch.`);
  assert.equal(bodies.has(body), false, `${record.contentKey}: duplicate Friends passage.`);
  bodies.add(body);

  const sourceRow = sourceByKey.get(record.contentKey);
  assert.ok(sourceRow, `${record.contentKey}: missing source row.`);
  const readerBody = String(sourceRow.body_you ?? sourceRow.body ?? sourceRow.readerCopy ?? "");
  if (readerBody) {
    const legacyConverted = friendVoiceFromReaderCopy(readerBody, "{{Name}}");
    assert.notEqual(body, legacyConverted, `${record.contentKey}: exact legacy You-to-Friends converter output is forbidden.`);
    converterComparisons += 1;
  }
}
assert.equal(completionKeys.size, 351);
assert.ok(converterComparisons >= 340, `Expected converter comparison coverage for nearly all completion rows, got ${converterComparisons}.`);

const sunByKey = new Map(sun.records.map((record) => [record.contentKey, record.body_they]));
sunByKey.set(override.contentKey, override.body_they);
const allByKey = new Map([...sunByKey, ...completion.records.map((record) => [record.contentKey, record.body_they])]);
assert.equal(allByKey.size, 378, "Combined Sun + completion corpus must cover 378 unique keys.");
assert.deepEqual([...allByKey.keys()].sort(), expectedAllKeys, "Combined Friends corpus must exactly match the production personal-transit key topology.");

const phraseCounts = new Map();
for (const body of allByKey.values()) {
  const words = String(body)
    .replace(/\{\{[^{}]+\}\}/gu, "variable")
    .toLowerCase()
    .replace(/[^a-z0-9'\s-]/gu, " ")
    .split(/\s+/u)
    .filter(Boolean);
  for (let i = 0; i <= words.length - 9; i += 1) {
    const phrase = words.slice(i, i + 9).join(" ");
    phraseCounts.set(phrase, (phraseCounts.get(phrase) ?? 0) + 1);
  }
}
const repeated = [...phraseCounts.entries()]
  .filter(([, count]) => count > 15)
  .sort((a, b) => b[1] - a[1]);
assert.deepEqual(repeated, [], `9-word phrase repetition exceeded corpus limit: ${JSON.stringify(repeated.slice(0, 20))}`);

console.log(JSON.stringify({
  status: "pass",
  exactApprovedSunRows: 27,
  ownerDirectedIndependentRows: completion.records.length,
  totalFriendsTransitRows: allByKey.size,
  converterComparisons,
  duplicateBodies: 0,
  editorialGrammarRegressions: 0,
  repeatedNineWordPhrasesOver15: repeated.length
}, null, 2));
