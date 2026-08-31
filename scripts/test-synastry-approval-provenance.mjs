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
const bondEffectPrefix = "fallback-hook/bond-effect-";
const bondApprovalPrefix = "packages/astro-knowledge/review/bond-effect-directional-copy-v1/";
const livedPrefixes = [
  "fallback-hook/natal-aspect-lived/",
  "fallback-hook/placement-house-lived/",
  "fallback-hook/placement-sign-lived/",
  "fallback-hook/planet-lived/",
];
const lived108ApprovalPrefix = "packages/astro-knowledge/review/lived-experience-108-v1/records/";
const lilithLivedPrefix = "fallback-hook/natal-aspect-lived/lilith/";
const lilithLivedApprovalPrefix = "packages/astro-knowledge/review/lilith-78-lived-v2/records/";
const lilithLivedPayloadsPath = path.join(
  repoRoot,
  "packages/astro-knowledge/review/lilith-78-lived-v2/lilith-78-lived-payloads.json",
);
const v13RepairPath = path.join(
  repoRoot,
  "packages/astro-knowledge/review/v13-duplicate-contentkey-repair-2026-08-11.json",
);
const angleV15ManifestPath = path.join(
  repoRoot,
  "packages/astro-knowledge/review/angle-aspects-60-v15/shipping-manifest.json",
);
const batchApprovalPrefixes = [
  "packages/astro-knowledge/review/ascendant-batch-1-card-drafts-v1/",
  "packages/astro-knowledge/review/ascendant-batch-2-card-drafts-v1/",
  "packages/astro-knowledge/review/dedupe-chunk-1-card-drafts-v1/",
  "packages/astro-knowledge/review/dedupe-chunk-2-owner-authored-v1/",
  "packages/astro-knowledge/review/dedupe-chunk-3-owner-authored-v1/",
  "packages/astro-knowledge/review/reader-variant-grammar-fix-v2/",
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
    ["mercury", "mercury"],
    ["mercury", "mars"],
    ["mercury", "jupiter"],
    ["mercury", "saturn"],
    ["venus", "venus"],
    ["venus", "mars"],
    ["venus", "jupiter"],
    ["venus", "saturn"],
    ["mars", "mars"],
    ["mars", "jupiter"],
    ["sun", "jupiter"],
    ["sun", "saturn"],
    ["sun", "uranus"],
    ["sun", "neptune"],
    ["sun", "pluto"],
    ["moon", "jupiter"],
    ["moon", "saturn"],
    ["moon", "uranus"],
    ["moon", "neptune"],
    ["moon", "pluto"],
  ].flatMap(([planetA, planetB]) =>
    ["conjunction", "hard", "soft"].map(
      (group) => `${synastryPrefix}${planetA}/${planetB}/${group}`,
    ),
  ),
);
const allowedLevels = new Set(["exact_owner_approved", "owner_signoff_untraced"]);
const datePattern = /^\d{4}-\d{2}-\d{2}$/u;
const shaPattern = /^[a-f0-9]{64}$/u;
const readerVariantV2Manifest = JSON.parse(fs.readFileSync(
  path.join(
    repoRoot,
    "packages/astro-knowledge/review/reader-variant-grammar-fix-v2/shipping-manifest.json",
  ),
  "utf8",
));
assert.equal(readerVariantV2Manifest.rows.length, 102, "Expected 102 V2 per-row approvals");
for (const row of readerVariantV2Manifest.rows) batchExactKeys.add(row.contentKey);

function sha256(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function exactServingPayload(row) {
  return { body_you: row.body_you, body_they: row.body_they };
}

const sourceText = fs.readFileSync(sourcePath, "utf8");
const source = JSON.parse(sourceText);
const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
const v13Repair = JSON.parse(fs.readFileSync(v13RepairPath, "utf8"));
const angleV15Manifest = JSON.parse(fs.readFileSync(angleV15ManifestPath, "utf8"));
const angleV15Keys = new Set(angleV15Manifest.rows.map((row) => row.contentKey));
const lilithLivedPayloads = JSON.parse(fs.readFileSync(lilithLivedPayloadsPath, "utf8"));
const lilithLivedPayloadsByContentKey = new Map(
  Object.entries(lilithLivedPayloads.payloads ?? {}).map(([workbookKey, entry]) => {
    const [object, aspect, counterpart] = workbookKey.split("|");
    assert.equal(object, "lilith", `${workbookKey}: canonical lived payload object mismatch`);
    assert.ok(aspect && counterpart, `${workbookKey}: canonical lived payload key is incomplete`);
    return [
      `${lilithLivedPrefix}${aspect}/${counterpart.replaceAll("_", "-")}`,
      entry,
    ];
  }),
);
assert.equal(lilithLivedPayloadsByContentKey.size, 78, "Expected 78 canonical Lilith payload hashes");
const rows = source.hookRows.filter((row) => row.contentKey?.startsWith(synastryPrefix));
const statusCounts = {};
const levelCounts = { exact_owner_approved: 0, owner_signoff_untraced: 0 };
const batchExactRows = new Set();
let exactApprovalRecordsResolved = 0;

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
  exactApprovalRecordsResolved += 1;

  if (approval.recordPath.endsWith(".json")) {
    const record = JSON.parse(fs.readFileSync(recordPath, "utf8"));
    assert.equal(Array.isArray(record.rows), false, `${row.contentKey}: exact approval must use a per-row record`);
    assert.equal(record.approvalLevel, "exact_owner_approved", `${row.contentKey}: record level mismatch`);
    assert.equal(record.approvedAt, approval.approvedAt, `${row.contentKey}: record date mismatch`);
    assert.equal(record.contentKey, row.contentKey, `${row.contentKey}: record contentKey mismatch`);
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

assert.deepEqual(statusCounts, { approved: 165, reviewed: 318 });
assert.deepEqual(levelCounts, { exact_owner_approved: 165, owner_signoff_untraced: 0 });
assert.equal(exactApprovalRecordsResolved, 165);
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

const bondRows = source.hookRows.filter((row) => row.contentKey?.startsWith(bondEffectPrefix));
assert.equal(bondRows.length, 139, "Expected 139 bond-effect serving rows");

function assertExactBondApproval(row) {
  assert.equal(row.review_status, "approved", `${row.contentKey}: bond-effect row must be approved`);
  assert.equal(row.approval?.approvalLevel, "exact_owner_approved", `${row.contentKey}: bond-effect approval level mismatch`);
  assert.match(row.approval?.approvedAt ?? "", datePattern, `${row.contentKey}: bond-effect approval date missing`);
  assert.ok(
    row.approval?.recordPath?.startsWith(bondApprovalPrefix),
    `${row.contentKey}: bond-effect approval record must use ${bondApprovalPrefix}`,
  );
  assert.match(row.approval?.payloadSha256 ?? "", shaPattern, `${row.contentKey}: bond-effect payload hash missing`);
  const recordPath = path.join(repoRoot, row.approval.recordPath);
  assert.ok(fs.existsSync(recordPath), `${row.contentKey}: bond-effect approval record missing`);
  const record = JSON.parse(fs.readFileSync(recordPath, "utf8"));
  assert.equal(record.authorship, "owner_authored", `${row.contentKey}: bond-effect authorship mismatch`);
  assert.equal(record.contentKey, row.contentKey, `${row.contentKey}: bond-effect record contentKey mismatch`);
  assert.equal(record.payloadSha256, row.approval.payloadSha256, `${row.contentKey}: bond-effect record hash mismatch`);
  assert.equal(sha256(JSON.stringify(record.payload)), row.approval.payloadSha256, `${row.contentKey}: bond-effect record payload hash mismatch`);
  assert.equal(record.payload.body_you, row.body_you, `${row.contentKey}: bond-effect body_you differs from exact record`);
  assert.equal(record.payload.body_they, row.body_they, `${row.contentKey}: bond-effect body_they differs from exact record`);
}

for (const row of bondRows) assertExactBondApproval(row);
assert.throws(
  () => assertExactBondApproval({ ...bondRows[0], review_status: "reviewed" }),
  /bond-effect row must be approved/u,
  "Bond provenance gate must fail closed when an approved row is restated as reviewed.",
);

const livedRows = source.hookRows.filter((row) => (
  livedPrefixes.some((prefix) => row.contentKey?.startsWith(prefix))
  && (
    row.approval?.recordPath?.startsWith(lived108ApprovalPrefix)
    || row.approval?.recordPath?.startsWith(lilithLivedApprovalPrefix)
  )
));
const lilithLivedRows = livedRows.filter((row) => row.contentKey.startsWith(lilithLivedPrefix));
const sourceRowsByKey = new Map(source.hookRows.map((row) => [row.contentKey, row]));
const activeV13RepairEntries = v13Repair.entries.filter((entry) => !angleV15Keys.has(entry.contentKey));
const lived108Rows = activeV13RepairEntries.map((entry) => sourceRowsByKey.get(entry.contentKey)).filter(Boolean);
assert.equal(lived108Rows.length, 105, "Expected 105 V13-superseded lived-experience rows after three explicit V15 supersessions");
for (const [index, row] of lived108Rows.entries()) {
  const disposition = activeV13RepairEntries[index];
  assert.equal(row.source_release, "ll-matrix-v13-owner-approved-runtime");
  assert.equal(sha256(JSON.stringify(row)), disposition.kept.rowSha256, `${row.contentKey}: V13 repair provenance drifted`);
}
assert.equal(lilithLivedRows.length, 78, "Expected 78 Lilith lived-experience serving rows");
assert.equal(lived108Rows.length + lilithLivedRows.length, 183, "Expected 183 retained V13/Lilith lived-experience rows after three explicit V15 supersessions");

function assertExactLivedApproval(row) {
  const isLilith = row.contentKey.startsWith(lilithLivedPrefix);
  const expectedApprovalPrefix = isLilith ? lilithLivedApprovalPrefix : lived108ApprovalPrefix;
  const expectedWorkbookPath = isLilith
    ? "packages/astro-knowledge/review/lilith-78-lived-v2/TLDR-LILITH-78-LIVED-EXPERIENCE-V2-OWNER-EDITED.xlsx"
    : "packages/astro-knowledge/review/lived-experience-108-v1/TLDR-LL-FULL-108-LIVED-EXPERIENCE-OWNER-APPROVED.xlsx";
  assert.equal(row.review_status, "approved", `${row.contentKey}: lived-experience row must be approved`);
  assert.equal(row.approval?.approvalLevel, "exact_owner_approved", `${row.contentKey}: lived approval level mismatch`);
  assert.equal(row.approval?.approvedAt, "2026-08-10", `${row.contentKey}: lived approval date mismatch`);
  assert.ok(
    row.approval?.recordPath?.startsWith(expectedApprovalPrefix),
    `${row.contentKey}: lived approval record must use ${expectedApprovalPrefix}`,
  );
  assert.match(row.approval?.payloadSha256 ?? "", shaPattern, `${row.contentKey}: lived payload hash missing`);
  assert.equal(row.reader_only, true, `${row.contentKey}: lived row must be reader-only`);
  assert.equal(row.render_policy, "reader-only-exact-lived-v1", `${row.contentKey}: lived render policy mismatch`);
  assert.equal(Object.hasOwn(row, "body_you"), false, `${row.contentKey}: lived row must not synthesize body_you`);
  assert.equal(Object.hasOwn(row, "body_they"), false, `${row.contentKey}: lived row must not synthesize body_they`);
  const recordPath = path.join(repoRoot, row.approval.recordPath);
  assert.ok(fs.existsSync(recordPath), `${row.contentKey}: lived approval record missing`);
  const record = JSON.parse(fs.readFileSync(recordPath, "utf8"));
  assert.equal(record.authorship, "owner_authored", `${row.contentKey}: lived authorship mismatch`);
  assert.equal(record.contentKey, row.contentKey, `${row.contentKey}: lived record contentKey mismatch`);
  assert.equal(record.approvalLevel, "exact_owner_approved", `${row.contentKey}: lived record approval level mismatch`);
  assert.equal(record.payloadSha256, row.approval.payloadSha256, `${row.contentKey}: lived record hash mismatch`);
  assert.equal(sha256(JSON.stringify(record.payload)), row.approval.payloadSha256, `${row.contentKey}: lived record payload hash mismatch`);
  assert.equal(record.payload.body, row.body, `${row.contentKey}: lived body differs from exact record`);
  assert.equal(record.payload.sourceMechanism, row.sourceMechanism, `${row.contentKey}: lived sourceMechanism differs from record`);
  if (isLilith) {
    const canonicalEntry = lilithLivedPayloadsByContentKey.get(row.contentKey);
    assert.ok(canonicalEntry, `${row.contentKey}: canonical Lilith payload is missing`);
    assert.equal(
      sha256(JSON.stringify(canonicalEntry.payload)),
      canonicalEntry.sha256,
      `${row.contentKey}: canonical Lilith payload hash is stale`,
    );
    assert.equal(
      row.approval.payloadSha256,
      canonicalEntry.sha256,
      `${row.contentKey}: serving approval hash differs from canonical Lilith payload`,
    );
    assert.deepEqual(
      record.payload,
      canonicalEntry.payload,
      `${row.contentKey}: exact record differs from canonical Lilith payload`,
    );
    assert.equal(record.payload.astroHint, row.astroHint, `${row.contentKey}: lived astroHint differs from record`);
  } else {
    assert.equal(Object.hasOwn(row, "astroHint"), false, `${row.contentKey}: original lived row unexpectedly gained astroHint`);
  }
  assert.equal(
    record.sourceWorkbook.path,
    expectedWorkbookPath,
    `${row.contentKey}: lived workbook provenance mismatch`,
  );
}

for (const row of lilithLivedRows) assertExactLivedApproval(row);
assert.throws(
  () => assertExactLivedApproval({ ...lilithLivedRows[0], body: `${lilithLivedRows[0].body} changed` }),
  /lived body differs from exact record/u,
  "Lived provenance gate must fail closed when approved body text changes.",
);

console.log("Synastry approval provenance coverage:");
console.log(`  rows: ${rows.length}`);
console.log(`  approved: ${statusCounts.approved}`);
console.log(`  reviewed: ${statusCounts.reviewed}`);
console.log(`  exact_owner_approved: ${levelCounts.exact_owner_approved}`);
console.log(`  exact approval records resolved: ${exactApprovalRecordsResolved}`);
console.log(`  owner_signoff_untraced: ${levelCounts.owner_signoff_untraced}`);
console.log(`  bond-effect exact_owner_approved: ${bondRows.length}`);
console.log(`  lived-experience 108 exact_owner_approved: ${lived108Rows.length}`);
console.log(`  Lilith lived-experience exact_owner_approved: ${lilithLivedRows.length}`);
