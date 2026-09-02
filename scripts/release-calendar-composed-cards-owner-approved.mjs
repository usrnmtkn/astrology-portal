#!/usr/bin/env node

import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const releaseRel = "packages/astro-knowledge/review/sky-calendar-composed-first-glance-2026-08-31/composed-cards-serving-release-2026-09-01.json";
const sourceRel = "packages/astro-knowledge/data/sky-calendar/composed-cards-v1.json";
const sourcePath = path.join(repoRoot, sourceRel);

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(path.join(repoRoot, relativePath), "utf8"));
}

function sha256(value) {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

function lowerSentenceStart(value) {
  return value ? `${value.charAt(0).toLowerCase()}${value.slice(1)}` : value;
}

function payloadHash(forecast, details) {
  return sha256(JSON.stringify({ forecast, details }));
}

const release = readJson(releaseRel);
const source = readJson(sourceRel);

if (release.schema !== "tldr.sky-calendar.composed-card-serving-release.v1") {
  throw new Error(`Unexpected release schema: ${release.schema}`);
}
if (release.owner_approved !== true || release.owner_authorized !== true || release.serving_enabled !== true) {
  throw new Error("Composed-card release is not fully owner-approved and serving-authorized.");
}
if (!Array.isArray(release.rows) || release.rows.length !== 24 || release.expected_row_count !== 24) {
  throw new Error("Composed-card release must contain exactly 24 rows.");
}
if (!Array.isArray(source.cards) || source.cards.length !== 24) {
  throw new Error(`Expected exactly 24 composed source cards, found ${source.cards?.length ?? "none"}.`);
}

const releaseKeys = release.rows.map((row) => row.contentKey);
if (new Set(releaseKeys).size !== 24) {
  throw new Error("Composed-card release contains duplicate keys.");
}
const sourceKeys = source.cards.map((card) => card.id);
if (JSON.stringify([...releaseKeys].sort()) !== JSON.stringify([...sourceKeys].sort())) {
  throw new Error("Release key set does not exactly match the 24 composed source cards.");
}

for (const row of release.rows) {
  if (typeof row.body !== "string" || !row.body.trim()) {
    throw new Error(`${row.contentKey} has an empty approved body.`);
  }
  if (sha256(row.body) !== row.bodySha256) {
    throw new Error(`${row.contentKey} approved body hash mismatch.`);
  }
}
const computedSetHash = sha256(JSON.stringify(release.rows.map(({ contentKey, bodySha256 }) => ({ contentKey, bodySha256 }))));
if (computedSetHash !== release.payload_set_sha256) {
  throw new Error(`Release payload-set hash mismatch: expected ${release.payload_set_sha256}, found ${computedSetHash}.`);
}

const releaseByKey = new Map(release.rows.map((row) => [row.contentKey, row]));
const alreadyReleased = source.cards.every((card) => {
  const approved = releaseByKey.get(card.id);
  return approved
    && card.forecast === lowerSentenceStart(approved.body)
    && card.ownerApproved === true
    && card.servingAuthorized === true
    && card.approvedVia === releaseRel
    && card.payloadSha256 === payloadHash(card.forecast, card.details);
});

if (!alreadyReleased) {
  const currentBlobSha = execFileSync("git", ["hash-object", sourcePath], { encoding: "utf8" }).trim();
  if (currentBlobSha !== release.source_file_blob_sha_before_release) {
    throw new Error(`Composed source drifted before release: expected ${release.source_file_blob_sha_before_release}, found ${currentBlobSha}.`);
  }
}

const detailsBefore = new Map(source.cards.map((card) => [card.id, card.details]));

for (const card of source.cards) {
  const approved = releaseByKey.get(card.id);
  if (!approved) throw new Error(`Missing approved release row for ${card.id}.`);

  const parts = card.id.split("/");
  if (parts.length !== 6 || parts[0] !== "sky-card") {
    throw new Error(`Unexpected composed-card key shape: ${card.id}`);
  }
  const [, planetA, signA, aspect, planetB, signB] = parts;
  const identity = [card.planetA, card.signA, card.aspect, card.planetB, card.signB];
  const expectedIdentity = [planetA, signA, aspect, planetB, signB];
  if (JSON.stringify(identity) !== JSON.stringify(expectedIdentity)) {
    throw new Error(`${card.id} identity drifted before release.`);
  }
  if (typeof card.details !== "string" || !card.details.trim()) {
    throw new Error(`${card.id} Details is empty.`);
  }

  card.forecast = lowerSentenceStart(approved.body.trim());
  card.ownerApproved = true;
  card.servingAuthorized = true;
  card.approvedVia = releaseRel;
  card.approvedAt = "2026-09-01";
  card.payloadSha256 = payloadHash(card.forecast, card.details);
}

for (const card of source.cards) {
  if (card.details !== detailsBefore.get(card.id)) {
    throw new Error(`${card.id} Details drifted during release.`);
  }
}

fs.writeFileSync(sourcePath, `${JSON.stringify(source, null, 2)}\n`);

console.log(JSON.stringify({
  ok: true,
  batchId: release.batch_id,
  releasedRows: release.rows.length,
  source: sourceRel,
  release: releaseRel,
  alreadyReleased
}, null, 2));
