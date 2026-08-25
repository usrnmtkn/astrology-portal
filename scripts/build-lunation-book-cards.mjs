#!/usr/bin/env node

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const sourcePath = path.join(
  repoRoot,
  "packages/astro-knowledge/review/lunation-card-assembly-v1/source/ritual-and-the-moon-lunation-horoscopes-v1.json",
);
const outputPath = path.join(
  repoRoot,
  "apps/web/src/content/fallbackArchitectureV3/source-rows/lunation-book-cards-v1.json",
);
const approvalRecord = "packages/astro-knowledge/review/lunation-card-assembly-v1/spec.md";
const correctionsRecord = "packages/astro-knowledge/review/lunation-card-assembly-v1/source/recovered-lunation-copy-corrections-v1.json";
const corrections = JSON.parse(fs.readFileSync(path.join(repoRoot, correctionsRecord), "utf8"));
const correctionApprovalStatement = "I approve the 22 corrected lunation passages in recovered-lunation-copy-corrections-v1.json for live serving.";
const signs = [
  "aries", "taurus", "gemini", "cancer", "leo", "virgo",
  "libra", "scorpio", "sagittarius", "capricorn", "aquarius", "pisces",
];
const sha256 = (value) => crypto.createHash("sha256").update(value, "utf8").digest("hex");
const wordCount = (value) => value.trim().split(/\s+/u).filter(Boolean).length;
const title = (value) => value.replace(/(^|-)([a-z])/gu, (_match, separator, letter) => `${separator}${letter.toUpperCase()}`);

const sourceText = fs.readFileSync(sourcePath, "utf8");
const source = JSON.parse(sourceText);
if (source.schema !== "ritual-and-the-moon-lunation-horoscopes-v1") {
  throw new Error(`Unexpected lunation book schema: ${source.schema}`);
}
if (source.status !== "owner-approved serving copy" || source.count !== 288 || source.entries.length !== 288) {
  throw new Error("The canonical lunation book must contain all 288 explicitly owner-approved entries.");
}
if (
  corrections.schema !== "recovered-lunation-copy-corrections/v1"
  || corrections.status !== "owner-approved serving correction record"
  || corrections.count !== 22
  || corrections.entries?.length !== 22
  || corrections.approval?.approvalStatement !== correctionApprovalStatement
  || corrections.approval?.approvalLevel !== "exact_owner_approved"
  || corrections.approval?.ownerApproved !== true
  || corrections.approval?.promotionAuthorized !== true
  || corrections.approval?.servingAuthorized !== true
) {
  throw new Error("The 22 recovered lunation corrections require their exact owner serving approval record.");
}
const correctionByKey = new Map(corrections.entries.map((entry) => [entry.contentKey, entry]));

const keys = new Set();
const tuples = new Set();
const authoredCards = source.entries.map((entry) => {
  const expectedHouse = ((signs.indexOf(entry.lunationSign) - signs.indexOf(entry.risingSign) + 12) % 12) + 1;
  const expectedKey = `authored/book-ritual-and-the-moon/lunation-horoscope/${entry.lunationKind}/${entry.lunationSign}/rising-${entry.risingSign}/house-${entry.house}`;
  const tuple = `${entry.lunationKind}/${entry.lunationSign}/${entry.risingSign}`;
  if (!signs.includes(entry.lunationSign) || !signs.includes(entry.risingSign)) {
    throw new Error(`Invalid sign in ${entry.contentKey}`);
  }
  if (entry.house !== expectedHouse || entry.contentKey !== expectedKey) {
    throw new Error(`Fact/key mismatch in ${entry.contentKey}`);
  }
  if (!entry.body || entry.body.length !== entry.chars) {
    throw new Error(`Protected body length mismatch in ${entry.contentKey}`);
  }
  if (keys.has(entry.contentKey) || tuples.has(tuple)) {
    throw new Error(`Duplicate lunation cell: ${entry.contentKey}`);
  }
  keys.add(entry.contentKey);
  tuples.add(tuple);

  const bodySha256 = sha256(entry.body);
  const correction = entry.recoveredFrom?.correctionRecord === correctionsRecord
    ? correctionByKey.get(entry.contentKey)
    : null;
  if (entry.recoveredFrom?.correctionRecord === correctionsRecord && correction?.correctedBodySha256 !== bodySha256) {
    throw new Error(`Recovered lunation correction approval hash mismatch in ${entry.contentKey}`);
  }
  const entryApprovalRecord = correction ? correctionsRecord : approvalRecord;
  const kindLabel = entry.lunationKind === "new-moon" ? "New Moon" : "Full Moon";
  return {
    contentKey: entry.contentKey,
    content_role: "full_copy",
    headline: `${title(entry.lunationSign)} ${kindLabel} for ${title(entry.risingSign)} Rising`,
    body: entry.body,
    review_status: "approved",
    owner_authored: true,
    lunation_kind: entry.lunationKind,
    lunation_sign: entry.lunationSign,
    rising_sign: entry.risingSign,
    house: entry.house,
    source_keys: [
      `owner/ritual-and-the-moon/${entry.contentKey}`,
      entryApprovalRecord,
    ],
    source_release: "book-ritual-and-the-moon-lunation-horoscopes-v1",
    approval: {
      approvalLevel: "owner",
      recordPath: entryApprovalRecord,
      payloadSha256: bodySha256,
      approvedAt: "2026-08-24",
      ...(correction ? {
        approvalStatement: corrections.approval.approvalStatement,
        ownerConfirmationSource: corrections.approval.ownerConfirmationSource,
        servingAuthorized: true,
      } : {}),
    },
    protected_content: {
      policy: "byte-exact-owner-authored",
      body_sha256: bodySha256,
      word_count: wordCount(entry.body),
      char_count: entry.body.length,
    },
    ...(entry.recoveredFrom ? { source_provenance: entry.recoveredFrom } : {}),
  };
});

const output = {
  schema: "lunation-book-cards/v1",
  version: "book-ritual-and-the-moon-lunation-horoscopes-v1",
  source_artifact: path.relative(repoRoot, sourcePath),
  source_sha256: sha256(sourceText),
  count: authoredCards.length,
  authoredCards,
};

fs.writeFileSync(outputPath, `${JSON.stringify(output, null, 2)}\n`);
console.log(`Wrote ${authoredCards.length} protected lunation book cards to ${path.relative(repoRoot, outputPath)}.`);
