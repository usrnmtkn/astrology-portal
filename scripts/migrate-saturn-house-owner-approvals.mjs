#!/usr/bin/env node

import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const sourcePath = path.join(
  repoRoot,
  "apps/web/src/content/fallbackArchitectureV3/source-rows/transit-synastry-rows-v1.json"
);
const reviewRootRelative = "packages/astro-knowledge/review/saturn-house-owner-approved-2026-07-28";
const reviewRoot = path.join(repoRoot, reviewRootRelative);
const checkOnly = process.argv.includes("--check");
const approvedAt = "2026-07-28";
const recordedAt = "2026-08-13";

const source = JSON.parse(fs.readFileSync(sourcePath, "utf8"));
const rowsByKey = new Map(source.authoredCards.map((row) => [row.contentKey, row]));
const targetKeys = Array.from({ length: 12 }, (_, index) => index + 1).flatMap((house) => [
  `authored/transit-house-intro/saturn/${house}`,
  `authored/transit-house-sign/saturn/${house}/aries`
]);
const sha256 = (value) => crypto.createHash("sha256").update(value).digest("hex");
const manifestRows = [];

if (!checkOnly) {
  fs.mkdirSync(reviewRoot, { recursive: true });
}

for (const contentKey of targetKeys) {
  const row = rowsByKey.get(contentKey);
  assert.ok(row, `${contentKey}: owner-reviewed Saturn row is missing`);
  assert.equal(row.review_status, "approved", `${contentKey}: review status changed`);
  assert.match(
    row.approved_via ?? "",
    /^owner-rewritten full 12-house set, chat 2026-07-28/u,
    `${contentKey}: historical owner-review evidence changed`
  );
  assert.equal(typeof row.body_you, "string", `${contentKey}: body_you is missing`);
  assert.equal(typeof row.body_they, "string", `${contentKey}: body_they is missing`);

  const payload = {
    body_you: row.body_you,
    body_they: row.body_they
  };
  const payloadSha256 = sha256(JSON.stringify(payload));
  const [, layer, , house, sign] = contentKey.split("/");
  const fileName = layer === "transit-house-intro"
    ? `saturn-house-${house}-intro-exact-approval.json`
    : `saturn-house-${house}-${sign}-exact-approval.json`;
  const recordPath = `${reviewRootRelative}/${fileName}`;
  const record = {
    schemaVersion: 1,
    recordType: "transit_house_serving_exact_approval",
    approvalId: `saturn-house-owner-approved-2026-07-28-${layer}-${house}${sign ? `-${sign}` : ""}`,
    approvalLevel: "exact_owner_approved",
    authorship: "owner_reviewed",
    approvedAt,
    recordedAt,
    surface: "you|friends",
    contentKey,
    payloadHashAlgorithm: "sha256(JSON.stringify(payload))",
    payloadSha256,
    payload,
    historicalEvidence: {
      readerRewriteCommit: "133e2332c48c147876f352290891ab55a83fde8e",
      friendVoiceReviewCommit: "102631f0a3b5851898935c43d6bb9d39f89decf4",
      sourceRowApprovalNote: row.approved_via
    },
    ownerConfirmationStatement: "the writing that was being shown in the natal chart was approved",
    ownerConfirmationSource: "owner_chat_2026-08-13_source_metadata_correction",
    approvalEffect: "exact_wording_approval",
    copyMutation: "none"
  };
  const expectedApproval = {
    approvalLevel: "exact_owner_approved",
    recordPath,
    payloadSha256,
    approvedAt
  };

  if (checkOnly) {
    assert.deepEqual(row.approval, expectedApproval, `${contentKey}: serving approval metadata drifted`);
    const storedRecord = JSON.parse(fs.readFileSync(path.join(repoRoot, recordPath), "utf8"));
    assert.deepEqual(storedRecord, record, `${contentKey}: exact approval record drifted`);
  } else {
    row.approval = expectedApproval;
    fs.writeFileSync(path.join(repoRoot, recordPath), `${JSON.stringify(record, null, 2)}\n`);
  }

  manifestRows.push({ contentKey, recordPath, payloadSha256 });
}

const manifest = {
  schemaVersion: 1,
  migration: "saturn-house-owner-approved-2026-07-28",
  approvedAt,
  recordedAt,
  sourceCopyMutation: "none",
  rows: manifestRows
};
const manifestPath = path.join(reviewRoot, "approval-manifest.json");

if (checkOnly) {
  assert.deepEqual(
    JSON.parse(fs.readFileSync(manifestPath, "utf8")),
    manifest,
    "Saturn house exact-approval manifest drifted"
  );
} else {
  fs.writeFileSync(sourcePath, `${JSON.stringify(source, null, 1)}\n`);
  fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
}

console.log(`${checkOnly ? "verified" : "recorded"} ${targetKeys.length} byte-identical Saturn house approval rows`);
