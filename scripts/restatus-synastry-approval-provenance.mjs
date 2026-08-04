import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, "..");
const sourceRelativePath =
  "apps/web/src/content/fallbackArchitectureV3/source-rows/fallback-source-rows-v3.json";
const manifestRelativePath =
  "packages/astro-knowledge/review/synastry-provenance-restatus-manifest-2026-08-04.json";
const sourcePath = path.join(repoRoot, sourceRelativePath);
const manifestPath = path.join(repoRoot, manifestRelativePath);
const synastryPrefix = "fallback-hook/synastry-pair/";
const closerRemovalNote = "owner-approved stock-closer removal, chat 2026-08-04";
const expectedPreflight = Object.freeze({
  structured: 3,
  contentProvenance: 129,
  closerNoteOnly: 336,
  none: 15,
});

const exactContractByKey = new Map([
  ...["conjunction", "hard", "soft"].map((group) => [
    `fallback-hook/synastry-pair/mars/ascendant/${group}`,
    "scripts/test-mars-ascendant-resolver-copy.mjs",
  ]),
  [
    "fallback-hook/synastry-pair/uranus/ascendant/conjunction",
    "scripts/test-uranus-ascendant-conjunction-copy.mjs",
  ],
  [
    "fallback-hook/synastry-pair/uranus/ascendant/hard",
    "scripts/test-uranus-ascendant-hard-copy.mjs",
  ],
  [
    "fallback-hook/synastry-pair/uranus/ascendant/soft",
    "scripts/test-uranus-ascendant-soft-copy.mjs",
  ],
]);

function sha256(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function exactPayload(row) {
  return { body_you: row.body_you, body_they: row.body_they };
}

function readerPayload(rows) {
  return rows
    .map(({ contentKey, body_you, body_they }) => ({ contentKey, body_you, body_they }))
    .sort((left, right) => left.contentKey.localeCompare(right.contentKey));
}

function contentSignoffSegments(row) {
  if (typeof row.approved_via !== "string" || !row.approved_via.trim()) return [];
  return row.approved_via
    .split(" | ")
    .map((segment) => segment.trim())
    .filter((segment) => segment && segment !== closerRemovalNote);
}

function categoryFor(row) {
  if (row.approval) return "structured";
  const contentSegments = contentSignoffSegments(row);
  if (contentSegments.length > 0) return "contentProvenance";
  if (row.approved_via === closerRemovalNote) return "closerNoteOnly";
  return "none";
}

function approvedAtFromContentSignoff(row) {
  const segments = contentSignoffSegments(row);
  const dates = [...new Set(segments.flatMap((segment) => segment.match(/\b\d{4}-\d{2}-\d{2}\b/gu) ?? []))];
  assert.equal(dates.length, 1, `${row.contentKey}: expected exactly one content-signoff date`);
  return dates[0];
}

function countsByCategory(rows) {
  const counts = { structured: 0, contentProvenance: 0, closerNoteOnly: 0, none: 0 };
  for (const row of rows) counts[categoryFor(row)] += 1;
  return counts;
}

function parseArgs(argv) {
  const unknown = argv.filter((argument) => argument !== "--apply");
  if (unknown.length > 0) throw new Error(`Unknown argument(s): ${unknown.join(", ")}`);
  return { apply: argv.includes("--apply") };
}

const { apply } = parseArgs(process.argv.slice(2));
const sourceTextBefore = fs.readFileSync(sourcePath, "utf8");
const source = JSON.parse(sourceTextBefore);
const rows = source.hookRows.filter((row) => row.contentKey?.startsWith(synastryPrefix));
const beforeByKey = new Map(rows.map((row) => [row.contentKey, structuredClone(row)]));
const preflight = countsByCategory(rows);

assert.equal(rows.length, 483, "Expected 483 synastry serving rows");
assert.deepEqual(preflight, expectedPreflight, "Synastry provenance preflight does not match the approved baseline");

const readerPayloadBefore = readerPayload(rows);
const statusChanges = [];
const approvalReferencesAdded = [];

for (const row of rows) {
  const category = categoryFor(row);
  if (category === "structured") continue;

  if (category === "contentProvenance") {
    const approvedAt = approvedAtFromContentSignoff(row);
    const recordPath = exactContractByKey.get(row.contentKey);
    if (recordPath) {
      assert.ok(fs.existsSync(path.join(repoRoot, recordPath)), `${row.contentKey}: missing exact contract ${recordPath}`);
      row.approval = {
        approvalLevel: "exact_owner_approved",
        recordPath,
        payloadSha256: sha256(JSON.stringify(exactPayload(row))),
        approvedAt,
      };
    } else {
      row.approval = {
        approvalLevel: "owner_signoff_untraced",
        approvedAt,
      };
    }
    approvalReferencesAdded.push({ contentKey: row.contentKey, ...row.approval });
    continue;
  }

  assert.equal(row.review_status, "approved", `${row.contentKey}: unexpected starting review status`);
  row.review_status = "reviewed";
  assert.equal(Object.hasOwn(row, "approval"), false, `${row.contentKey}: provenance-free row gained approval`);
  statusChanges.push({
    contentKey: row.contentKey,
    category,
    reviewStatusBefore: "approved",
    reviewStatusAfter: "reviewed",
    approvedVia: row.approved_via ?? null,
  });
}

for (const row of rows) {
  const before = beforeByKey.get(row.contentKey);
  const category = categoryFor(before);
  if (category === "structured") {
    assert.deepEqual(row, before, `${row.contentKey}: pre-existing structured row changed`);
    continue;
  }

  const allowedKeys = category === "contentProvenance"
    ? new Set(["approval"])
    : new Set(["review_status"]);
  const allKeys = new Set([...Object.keys(before), ...Object.keys(row)]);
  for (const key of allKeys) {
    if (!allowedKeys.has(key)) {
      assert.deepEqual(row[key], before[key], `${row.contentKey}: unauthorized change to ${key}`);
    }
  }
}

const readerPayloadAfter = readerPayload(rows);
assert.deepEqual(readerPayloadAfter, readerPayloadBefore, "Reader-facing synastry bodies changed");
assert.equal(statusChanges.length, 351, "Expected 351 honest re-status changes");
assert.equal(approvalReferencesAdded.length, 129, "Expected 129 approval references");
assert.equal(
  approvalReferencesAdded.filter(({ approvalLevel }) => approvalLevel === "exact_owner_approved").length,
  6,
  "Expected six Mars/Uranus exact upgrades",
);

const postCounts = Object.fromEntries(
  ["approved", "reviewed"].map((status) => [status, rows.filter((row) => row.review_status === status).length]),
);
const approvalLevelCounts = Object.fromEntries(
  ["exact_owner_approved", "owner_signoff_untraced"].map((level) => [
    level,
    rows.filter((row) => row.approval?.approvalLevel === level).length,
  ]),
);
assert.deepEqual(postCounts, { approved: 132, reviewed: 351 });
assert.deepEqual(approvalLevelCounts, { exact_owner_approved: 9, owner_signoff_untraced: 123 });

const sourceTextAfter = `${JSON.stringify(source, null, 1)}\n`;
const manifest = {
  schema: "tldrastro-synastry-provenance-restatus-manifest-v1",
  operation: "structured approval provenance and honest synastry re-status",
  ownerAuthorization: "owner-approved deterministic operation class, chat 2026-08-04",
  sourcePath: sourceRelativePath,
  scopePrefix: synastryPrefix,
  closerRemovalNote,
  preflight,
  totals: {
    synastryRows: rows.length,
    approved: postCounts.approved,
    reviewed: postCounts.reviewed,
    rowsRemoved: 0,
    bodyTextsChanged: 0,
    statusChanges: statusChanges.length,
    approvalReferencesAdded: approvalReferencesAdded.length,
    exactOwnerApproved: approvalLevelCounts.exact_owner_approved,
    exactUpgrades: 6,
    ownerSignoffUntraced: approvalLevelCounts.owner_signoff_untraced,
  },
  hashes: {
    sourceSha256Before: sha256(sourceTextBefore),
    sourceSha256After: sha256(sourceTextAfter),
    readerPayloadSha256Before: sha256(JSON.stringify(readerPayloadBefore)),
    readerPayloadSha256After: sha256(JSON.stringify(readerPayloadAfter)),
  },
  exactUpgradeEvidence: approvalReferencesAdded.filter(
    ({ approvalLevel }) => approvalLevel === "exact_owner_approved",
  ),
  statusChanges,
  approvalReferencesAdded,
};

if (!apply) {
  console.log(JSON.stringify({ mode: "dry-run", ...manifest.totals, preflight }, null, 2));
  process.exit(0);
}

fs.mkdirSync(path.dirname(manifestPath), { recursive: true });
fs.writeFileSync(sourcePath, sourceTextAfter);
fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
console.log(JSON.stringify({ mode: "apply", manifestPath: manifestRelativePath, ...manifest.totals }, null, 2));
