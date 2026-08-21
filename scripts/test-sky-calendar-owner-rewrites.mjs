#!/usr/bin/env node
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const reviewRelative = "packages/astro-knowledge/review/sky-calendar-owner-rewrites-2026-08-20";
const reviewRoot = path.join(repoRoot, reviewRelative);
const source = JSON.parse(fs.readFileSync(path.join(reviewRoot, "sky-calendar-owner-rewrites-payloads.json"), "utf8"));
const manifest = JSON.parse(fs.readFileSync(path.join(reviewRoot, "shipping-manifest.json"), "utf8"));
const workbookBytes = fs.readFileSync(path.join(repoRoot, source.sourceWorkbook));
const sha256 = (value) => crypto.createHash("sha256").update(value).digest("hex");

assert.equal(source.rowCount, 215);
assert.equal(Object.keys(source.payloads).length, 215);
assert.equal(manifest.rowCount, 215);
assert.equal(manifest.rows.length, 215);
assert.equal(sha256(workbookBytes), source.sourceWorkbookSha256, "Owner-approved workbook hash drifted.");

const setHashInput = Object.entries(source.payloads)
  .sort(([a], [b]) => a.localeCompare(b))
  .map(([contentKey, entry]) => ({ contentKey, payloadSha256: entry.sha256 }));
assert.equal(sha256(JSON.stringify(setHashInput)), source.payloadSetSha256, "Payload set hash drifted.");
assert.deepEqual(source.decisionCounts, { include: 215, revise: 0, reject: 0 });
assert.equal(source.mergeAuthorized, false);

const transitFiles = fs.readdirSync(path.join(repoRoot, "packages/astro-knowledge/data/transits"))
  .filter((name) => name.endsWith(".json"));
const liveReaderRecords = transitFiles
  .map((name) => JSON.parse(fs.readFileSync(path.join(repoRoot, "packages/astro-knowledge/data/transits", name), "utf8")))
  .filter((record) => record.status === "LIVE" && record.readerCopy?.body);
assert.equal(liveReaderRecords.length, 215);

for (const [contentKey, entry] of Object.entries(source.payloads)) {
  assert.equal(sha256(JSON.stringify(entry.payload)), entry.sha256, `${contentKey}: payload hash drifted.`);
  const [, transiting, aspect, other] = contentKey.split(".");
  const id = `${transiting}-${aspect}-${other}`;
  const transit = JSON.parse(fs.readFileSync(path.join(repoRoot, `packages/astro-knowledge/data/transits/${id}.json`), "utf8"));
  assert.deepEqual(
    { summary: transit.readerCopy.summary, body: transit.readerCopy.body },
    entry.payload,
    `${contentKey}: serving copy differs from the owner-approved payload.`,
  );
  assert.match(transit.readerCopy.approvedVia, /OWNER-APPROVAL\.md/u, `${contentKey}: approval source missing.`);
  assert.equal(Object.hasOwn(transit.readerCopy, "calendarLeadIn"), false, `${contentKey}: obsolete lead-in metadata remains.`);

  const recordPath = path.join(reviewRoot, `records/${id}-exact-approval.json`);
  const record = JSON.parse(fs.readFileSync(recordPath, "utf8"));
  assert.equal(record.approvalLevel, "exact_owner_approved");
  assert.equal(record.authorship, "owner_authored");
  assert.equal(record.payloadSha256, entry.sha256);
  assert.deepEqual(record.payload, entry.payload);
  assert.equal(record.ownerApprovalStatementSource, `${reviewRelative}/OWNER-APPROVAL.md`);
}

assert.match(source.payloads["sky.moon.conjunction.venus"].payload.body, /The care is genuine/u);
assert.doesNotMatch(source.payloads["sky.moon.conjunction.venus"].payload.body, /The warmth is genuine/u);
assert.match(source.payloads["sky.sun.square.pluto"].payload.body, /cannot repair a missing paper trail/u);
assert.doesNotMatch(source.payloads["sky.sun.square.pluto"].payload.body, /will not settle a missing paper trail/u);
assert.match(source.payloads["sky.jupiter.conjunction.saturn"].payload.body, /attention given to the opportunity itself/u);
assert.doesNotMatch(source.payloads["sky.jupiter.conjunction.saturn"].payload.body, /attention you give the upside/u);

console.log(`Sky Calendar owner rewrite gate passed: ${source.rowCount} exact-approved rows; set ${source.payloadSetSha256}.`);
