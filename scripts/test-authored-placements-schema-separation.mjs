#!/usr/bin/env node

import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const here = path.dirname(fileURLToPath(import.meta.url));
const repo = path.resolve(here, "..");
const {
  isNaturalZodiacAnalogySentence,
  isTarotCorrespondenceSentence,
  sentenceRecords,
  separateAstrologyBody,
} = require(path.join(repo, "packages/astro-knowledge/scripts/authored-placement-schema-separation.cjs"));

const args = process.argv.slice(2);
const value = (flag) => {
  const index = args.indexOf(flag);
  return index === -1 ? "" : args[index + 1] ?? "";
};
const inputPath = path.resolve(process.cwd(), value("--input") || "packages/astro-knowledge/generated/tldr-astro/authored-placements/authored-placements.json");
const expectLegacyNotes = args.includes("--expect-legacy-notes");
const baselinePath = path.join(repo, "packages/astro-knowledge/review/friends-transit-house-licenses-v3/authored-placements-separation-baseline.json");
const data = JSON.parse(fs.readFileSync(inputPath, "utf8"));
const baseline = JSON.parse(fs.readFileSync(baselinePath, "utf8"));
const productionSource = fs.readFileSync(path.join(repo, "api/_lib/content-generation.ts"), "utf8");
const hash = (text) => crypto.createHash("sha256").update(text).digest("hex");
const servingFields = ["astrologyBody", "astrologySupport", "readerCopy", "placementMechanism", "appBody", "body"];

assert.equal(data.entries.length, 314);
assert.equal(data.houseDoctrine.length, 12);
assert.equal(new Set(data.houseDoctrine.map((item) => item.house)).size, 12);
assert.equal(data.governance.ownerApproved, false);
assert.equal(data.governance.servingEligible, false);
assert.equal(data.governance.productionConsumerField, "astrologyBody");
assert.equal(data.governance.tarotEnabledForOrdinaryAstrology, false);
assert.match(productionSource, /sourceExcerpt\(entry\.astrologyBody\)/u);
for (const field of ["sourceBody", "tarotNotes", "businessNotes", "tarotCorrespondence", "naturalZodiacAnalogy"]) {
  assert.doesNotMatch(productionSource, new RegExp(`sourceExcerpt\\(entry\\.${field}\\)`, "u"));
}

const sentenceFixture = separateAstrologyBody(
  "The house mechanism remains. The 1st house, Aries, aligns with the Emperor, urging action. The placement consequence remains."
);
assert.equal(sentenceFixture.astrologyBody, "The house mechanism remains. The placement consequence remains.");
assert.match(sentenceFixture.tarotCorrespondence, /Emperor/u);
assert.match(sentenceFixture.naturalZodiacAnalogy, /1st house/u);
assert.equal(isTarotCorrespondenceSentence("Their intuition shines like a star."), false);
assert.equal(isTarotCorrespondenceSentence("Their romantic partners and lovers remain important."), false);

let tarotLeaks = 0;
let naturalZodiacLeaks = 0;
for (const entry of data.entries) {
  assert.equal(entry.ownerApproved, false);
  assert.equal(entry.servingEligible, false);
  assert.equal(entry.editorialStatus.reviewState, "review_needed");
  assert.equal(entry.editorialStatus.readerCopyClassification, "not_assessed");
  assert.equal(entry.editorialStatus.astrologySupportExtraction, "not_extracted");
  assert.equal(entry.editorialStatus.placementMechanismExtraction, "not_extracted");
  assert.equal(entry.readerCopy, "");
  for (const field of servingFields) {
    for (const { sentence } of sentenceRecords(entry[field] ?? "")) {
      if (isTarotCorrespondenceSentence(sentence)) tarotLeaks += 1;
      if (isNaturalZodiacAnalogySentence(sentence)) naturalZodiacLeaks += 1;
    }
  }
}
assert.equal(tarotLeaks, 0);
assert.equal(naturalZodiacLeaks, 0);

const tarotEntries = data.entries.filter((entry) => entry.tarotCorrespondence).map((entry) => entry.id);
const naturalEntries = data.entries.filter((entry) => entry.naturalZodiacAnalogy).map((entry) => entry.id);
assert.deepEqual(tarotEntries, baseline.tarotAffectedIds);
assert.deepEqual(naturalEntries, baseline.naturalZodiacAffectedIds);

for (const [id, expected] of Object.entries(baseline.unaffectedAstrologyBodySha256)) {
  const entry = data.entries.find((candidate) => candidate.id === id);
  assert.ok(entry, `missing unaffected entry ${id}`);
  assert.equal(hash(entry.astrologyBody), expected, `astrologyBody changed for unaffected entry ${id}`);
}
assert.equal(Object.keys(baseline.unaffectedAstrologyBodySha256).length, 286);

const classCounts = data.entries.reduce((counts, entry) => {
  const contentClass = entry.editorialStatus.contentClass;
  counts[contentClass] = (counts[contentClass] ?? 0) + 1;
  return counts;
}, {});
assert.deepEqual(classCounts, {
  derived_generated_prose: 1,
  esoteric_tarot_correspondence: 12,
  long_source_reference_prose: 208,
  short_distilled_astrology: 93,
});
assert.ok(data.entries.filter((entry) => entry.editorialStatus.contentClass === "short_distilled_astrology")
  .every((entry) => !entry.ownerApproved && !entry.servingEligible && !entry.readerCopy));

for (const doctrine of data.houseDoctrine) {
  assert.ok(doctrine.doctrine);
  assert.ok(doctrine.sourceProvenance.sourceKey);
  assert.equal(doctrine.ownerApproved, false);
  assert.equal(doctrine.servingEligible, false);
  assert.equal(isTarotCorrespondenceSentence(doctrine.doctrine), false);
  assert.equal(isNaturalZodiacAnalogySentence(doctrine.doctrine), false);
}

for (const entry of data.entries) {
  for (const field of ["sourceBody", "tarotNotes", "businessNotes"]) {
    if (expectLegacyNotes) assert.ok(Object.hasOwn(entry, field), `${field} was not retained for Phase 1`);
    else assert.equal(Object.hasOwn(entry, field), false, `${field} survived Phase 2`);
  }
}
assert.doesNotMatch(JSON.stringify(data), /(?:\/Users\/|\/home\/)/u);

const astrologyBodyCharacters = data.entries.reduce((total, entry) => total + entry.astrologyBody.length, 0);
const allSentences = data.entries.flatMap((entry) => sentenceRecords(entry.astrologyBody).map(({ sentence }) => sentence));
const sentenceCounts = new Map();
for (const sentence of allSentences) sentenceCounts.set(sentence, (sentenceCounts.get(sentence) ?? 0) + 1);
const doctrineSentences = new Set(data.houseDoctrine.map((item) => item.doctrine));
const uniquePlacementRelevantSentences = [...new Set(allSentences)].filter((sentence) => (
  sentenceCounts.get(sentence) === 1
  && !doctrineSentences.has(sentence)
  && !isTarotCorrespondenceSentence(sentence)
  && !isNaturalZodiacAnalogySentence(sentence)
));
const uniquePlacementRelevantCharacters = uniquePlacementRelevantSentences.reduce((total, sentence) => total + sentence.length, 0);
const strictPlacementKeyedSentences = [];
const regexEscape = (text) => text.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
for (const entry of data.entries) {
  const placementKeys = [entry.planet, entry.sign].filter(Boolean).map((item) => item.toLowerCase());
  for (const paragraph of entry.astrologyBody.split(/\n{2,}/u)) {
    const paragraphText = paragraph.toLowerCase();
    if (!placementKeys.some((key) => new RegExp(`\\b${regexEscape(key)}\\b`, "iu").test(paragraphText))) continue;
    for (const { sentence } of sentenceRecords(paragraph)) {
      if (sentenceCounts.get(sentence) !== 1 || doctrineSentences.has(sentence)) continue;
      if (isTarotCorrespondenceSentence(sentence) || isNaturalZodiacAnalogySentence(sentence)) continue;
      strictPlacementKeyedSentences.push(sentence);
    }
  }
}
const strictPlacementKeyedUnique = [...new Set(strictPlacementKeyedSentences)];
const strictPlacementKeyedCharacters = strictPlacementKeyedUnique.reduce((total, sentence) => total + sentence.length, 0);

console.log(JSON.stringify({
  passed: true,
  phase: expectLegacyNotes ? 1 : 2,
  entries: data.entries.length,
  populatedAstrologyBodies: data.entries.filter((entry) => entry.astrologyBody).length,
  astrologyBodyCharacters,
  astrologyBodyDelta: baseline.baselineAstrologyBodyCharacters - astrologyBodyCharacters,
  tarotSeparatedEntries: tarotEntries.length,
  naturalZodiacSeparatedEntries: naturalEntries.length,
  tarotLeaks,
  naturalZodiacLeaks,
  unaffectedByteIdentical: Object.keys(baseline.unaffectedAstrologyBodySha256).length,
  contentClassCounts: classCounts,
  houseDoctrineRecords: data.houseDoctrine.length,
  uniquePlacementRelevantSentences: uniquePlacementRelevantSentences.length,
  uniquePlacementRelevantCharacters,
  strictPlacementKeyedUniqueSentences: strictPlacementKeyedUnique.length,
  strictPlacementKeyedCharacters,
  legacyNotesRetained: expectLegacyNotes,
  failClosed: true,
}, null, 2));
