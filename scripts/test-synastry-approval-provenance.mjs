import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, "..");
const sourcePath = path.join(
  repoRoot,
  "apps/web/src/content/fallbackArchitectureV3/source-rows/fallback-source-rows-v3.json",
);
const manifestPath = path.join(
  repoRoot,
  "packages/astro-knowledge/review/synastry-provenance-restatus-manifest-2026-08-04.json",
);
const synastryPrefix = "fallback-hook/synastry-pair/";
const batchApprovalPrefixes = [
  "packages/astro-knowledge/review/ascendant-batch-1-card-drafts-v1/",
  "packages/astro-knowledge/review/ascendant-batch-2-card-drafts-v1/",
  "packages/astro-knowledge/review/dedupe-chunk-1-card-drafts-v1/",
];
const batchExactKeys = new Set(
  [
    ...["sun", "moon", "mercury", "venus", "saturn", "neptune", "pluto"].map(
      (planet) => [planet, "ascendant"],
    ),
    ["sun", "moon"],
    ["sun", "sun"],
    ["sun", "mercury"],
    ["sun", "venus"],
    ["sun", "mars"],
    ["moon", "moon"],
    ["moon", "mercury"],
    ["moon", "venus"],
    ["moon", "mars"],
    ["mercury", "venus"],
  ].flatMap(([planetA, planetB]) =>
    ["conjunction", "hard", "soft"].map(
      (group) => `${synastryPrefix}${planetA}/${planetB}/${group}`,
    ),
  ),
);
const allowedLevels = new Set(["exact_owner_approved", "owner_signoff_untraced"]);
const datePattern = /^\d{4}-\d{2}-\d{2}$/u;
const shaPattern = /^[a-f0-9]{64}$/u;

function sha256(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function exactServingPayload(row) {
  return { body_you: row.body_you, body_they: row.body_they };
}

const sourceText = fs.readFileSync(sourcePath, "utf8");
const source = JSON.parse(sourceText);
const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
const rows = source.hookRows.filter((row) => row.contentKey?.startsWith(synastryPrefix));
const statusCounts = {};
const levelCounts = { exact_owner_approved: 0, owner_signoff_untraced: 0 };
const batchExactRows = new Set();

assert.equal(rows.length, 483, "Expected 483 synastry serving rows");

for (const row of rows) {
  statusCounts[row.review_status] = (statusCounts[row.review_status] ?? 0) + 1;
  const approval = row.approval;

  if (row.review_status === "approved") {
    assert.ok(approval, `${row.contentKey}: approved synastry row lacks structured approval`);
  }
  if (row.review_status === "needs_review") {
    assert.equal(approval, undefined, `${row.contentKey}: needs_review row must not carry approval`);
  }
  if (!approval) continue;

  assert.ok(allowedLevels.has(approval.approvalLevel), `${row.contentKey}: invalid approvalLevel`);
  assert.match(approval.approvedAt, datePattern, `${row.contentKey}: invalid approvedAt`);
  levelCounts[approval.approvalLevel] += 1;

  if (approval.approvalLevel === "owner_signoff_untraced") {
    assert.equal(Object.hasOwn(approval, "recordPath"), false, `${row.contentKey}: untraced signoff has recordPath`);
    assert.equal(Object.hasOwn(approval, "payloadSha256"), false, `${row.contentKey}: untraced signoff has payloadSha256`);
    continue;
  }

  assert.equal(typeof approval.recordPath, "string", `${row.contentKey}: exact approval lacks recordPath`);
  assert.match(approval.payloadSha256, shaPattern, `${row.contentKey}: exact approval lacks payload hash`);
  if (batchApprovalPrefixes.some((prefix) => approval.recordPath.startsWith(prefix))) batchExactRows.add(row.contentKey);
  const recordPath = path.join(repoRoot, approval.recordPath);
  assert.ok(fs.existsSync(recordPath), `${row.contentKey}: approval record does not exist: ${approval.recordPath}`);

  if (approval.recordPath.endsWith(".json")) {
    const record = JSON.parse(fs.readFileSync(recordPath, "utf8"));
    assert.equal(record.approvalLevel, "exact_owner_approved", `${row.contentKey}: record level mismatch`);
    assert.equal(record.contentKey, row.contentKey, `${row.contentKey}: record contentKey mismatch`);
    assert.equal(record.approvedAt, approval.approvedAt, `${row.contentKey}: record date mismatch`);
    assert.equal(record.payloadSha256, approval.payloadSha256, `${row.contentKey}: record hash mismatch`);
    assert.equal(sha256(JSON.stringify(record.payload)), approval.payloadSha256, `${row.contentKey}: record payload hash mismatch`);
    assert.equal(record.payload.body_you, row.body_you, `${row.contentKey}: body_you differs from exact record`);
    assert.equal(record.payload.body_they, row.body_they, `${row.contentKey}: body_they differs from exact record`);
  } else {
    assert.match(approval.recordPath, /^scripts\/test-(?:mars|uranus)-ascendant-.+-copy\.mjs$/u);
    assert.equal(
      sha256(JSON.stringify(exactServingPayload(row))),
      approval.payloadSha256,
      `${row.contentKey}: serving bodies differ from contract-test approval hash`,
    );
  }
}

assert.deepEqual(statusCounts, { approved: 153, reviewed: 330 });
assert.deepEqual(levelCounts, { exact_owner_approved: 60, owner_signoff_untraced: 93 });
assert.deepEqual(batchExactRows, batchExactKeys);
assert.equal(manifest.totals.synastryRows, 483);
assert.equal(manifest.totals.approved, 132);
assert.equal(manifest.totals.reviewed, 351);
assert.equal(manifest.totals.statusChanges, 351);
assert.equal(manifest.totals.bodyTextsChanged, 0);
assert.equal(manifest.totals.rowsRemoved, 0);
assert.match(manifest.hashes.sourceSha256After, shaPattern);
assert.equal(manifest.hashes.readerPayloadSha256Before, manifest.hashes.readerPayloadSha256After);
assert.equal(manifest.statusChanges.length, 351);
assert.equal(manifest.approvalReferencesAdded.length, 129);

console.log("Synastry approval provenance coverage:");
console.log(`  rows: ${rows.length}`);
console.log(`  approved: ${statusCounts.approved}`);
console.log(`  reviewed: ${statusCounts.reviewed}`);
console.log(`  exact_owner_approved: ${levelCounts.exact_owner_approved}`);
console.log(`  owner_signoff_untraced: ${levelCounts.owner_signoff_untraced}`);
