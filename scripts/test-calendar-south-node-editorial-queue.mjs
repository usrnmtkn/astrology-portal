#!/usr/bin/env node

import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const reviewDir = path.join(
  root,
  "packages",
  "astro-knowledge",
  "review",
  "sky-calendar-south-node-60-v1"
);
const recordsDir = path.join(reviewDir, "records");
const approvalPath = path.join(reviewDir, "owner-batch-authorization.json");

const expectedBodies = [
  "sun",
  "moon",
  "mercury",
  "venus",
  "mars",
  "jupiter",
  "saturn",
  "uranus",
  "neptune",
  "pluto",
  "chiron",
  "lilith"
];
const expectedAspects = ["conjunction", "sextile", "square", "trine", "opposition"];
const mirroredNorthNodeAspect = {
  conjunction: "opposition",
  sextile: "trine",
  square: "square",
  trine: "sextile",
  opposition: "conjunction"
};

function gitBlobSha(content) {
  const bytes = Buffer.from(content, "utf8");
  return createHash("sha1")
    .update(`blob ${bytes.length}\0`)
    .update(bytes)
    .digest("hex");
}

assert.ok(fs.existsSync(recordsDir), `Missing South Node review directory: ${recordsDir}`);
assert.ok(fs.existsSync(approvalPath), `Missing South Node owner approval: ${approvalPath}`);

const approval = JSON.parse(fs.readFileSync(approvalPath, "utf8"));
assert.equal(approval.authority, "owner", "South Node approval authority must be owner.");
assert.equal(approval.decision, "approve", "South Node batch must carry an owner approve decision.");
assert.equal(approval.batchId, "sky-calendar-south-node-60-v1", "South Node approval batch id mismatch.");
assert.equal(approval.ownerStatement, "these are great, approved", "Owner approval statement drifted.");
assert.equal(approval.approvalEffect, "exact_wording_approval", "South Node approval must bind exact wording.");
assert.equal(approval.memberCount, 60, "South Node approval must bind exactly 60 records.");
assert.equal(approval.approvedCandidateHeadSha, "2005e620da8a98f8cbc2e1aa711f4cc127f5ddac", "Approved candidate head SHA drifted.");
assert.equal(approval.runtimeEligible, false, "Editorial approval must not silently enable runtime serving.");
assert.equal(approval.servingRequiresSeparateChange, true, "South Node serving must remain a separate implementation change.");
assert.deepEqual(approval.capabilities, ["editorial_approval"], "South Node approval capabilities must remain editorial-only.");

const files = fs.readdirSync(recordsDir)
  .filter((name) => name.endsWith(".json"))
  .sort();

assert.equal(files.length, expectedBodies.length, "South Node queue must contain exactly 12 body files.");
assert.deepEqual(
  files.map((name) => name.replace(/\.json$/u, "")).sort(),
  [...expectedBodies].sort(),
  "South Node queue body files do not match the governed 12-body set."
);
assert.deepEqual(
  Object.keys(approval.recordFileBlobs).sort(),
  files,
  "Owner approval must bind every South Node record file and no extras."
);

const allRecords = [];

for (const body of expectedBodies) {
  const fileName = `${body}.json`;
  const file = path.join(recordsDir, fileName);
  const raw = fs.readFileSync(file, "utf8");
  const packet = JSON.parse(raw);

  assert.equal(
    gitBlobSha(raw),
    approval.recordFileBlobs[fileName],
    `${fileName}: approved wording changed after owner approval.`
  );
  assert.equal(packet.counterpartBody, body, `${body}.json counterpartBody mismatch.`);
  assert.equal(packet.status, "needs_review", `${body}.json must preserve its pre-approval review snapshot.`);
  assert.ok(Array.isArray(packet.records), `${body}.json records must be an array.`);
  assert.equal(packet.records.length, expectedAspects.length, `${body}.json must contain five major aspects.`);
  assert.deepEqual(
    packet.records.map((record) => record.aspect),
    expectedAspects,
    `${body}.json aspect order/set mismatch.`
  );

  for (const record of packet.records) {
    const expectedKey = `sky.aspect.${body}.${record.aspect}.south-node`;
    assert.equal(record.contentKey, expectedKey, `${expectedKey}: contentKey mismatch.`);
    assert.equal(
      record.mirroredNorthNodeAspect,
      mirroredNorthNodeAspect[record.aspect],
      `${expectedKey}: mirrored North Node aspect mismatch.`
    );
    assert.equal(record.reviewStatus, "needs_review", `${expectedKey}: pre-approval snapshot must remain unchanged.`);
    assert.equal(record.runtimeEligible, false, `${expectedKey}: must remain runtime-ineligible until serving implementation.`);
    assert.ok(typeof record.summary === "string" && record.summary.trim(), `${expectedKey}: missing summary.`);
    assert.ok(typeof record.body === "string" && record.body.trim(), `${expectedKey}: missing body.`);
    assert.match(record.body, /\bSouth Node\b/u, `${expectedKey}: body must name South Node explicitly.`);
    assert.doesNotMatch(record.body, /\bNorth Node\b/u, `${expectedKey}: North Node prose leaked into South Node draft.`);
    assert.doesNotMatch(record.body, /—/u, `${expectedKey}: em dash is banned.`);
    assert.doesNotMatch(record.body, /\bwhether\b/iu, `${expectedKey}: owner-banned 'whether' detected.`);
    assert.doesNotMatch(
      `${record.summary}\n${record.body}`,
      /\b(?:tarot|arcana|major arcana|minor arcana)\b/iu,
      `${expectedKey}: tarot reference detected in astrology content.`
    );
    allRecords.push(record);
  }
}

assert.equal(allRecords.length, 60, "South Node editorial queue must contain exactly 60 records.");
assert.equal(new Set(allRecords.map((record) => record.contentKey)).size, 60, "South Node content keys must be unique.");

for (const body of expectedBodies) {
  for (const aspect of expectedAspects) {
    assert.ok(
      allRecords.some((record) => record.contentKey === `sky.aspect.${body}.${aspect}.south-node`),
      `Missing South Node candidate for ${body} ${aspect}.`
    );
  }
}

console.log("South Node Calendar editorial queue: 60/60 exact-owner-approved, runtime-gated pole-specific passages validated.");
