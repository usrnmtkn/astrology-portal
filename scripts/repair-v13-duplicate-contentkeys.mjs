#!/usr/bin/env node

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const sourceRelativePath = "apps/web/src/content/fallbackArchitectureV3/source-rows/fallback-source-rows-v3.json";
const lockedRelativePath = "packages/astro-knowledge/voice/tldr-astro/satori-writer/ll-matrix-v13/knowledge-matrix-v13-owner-approved-locked.json";
const jsonRecordRelativePath = "packages/astro-knowledge/review/v13-duplicate-contentkey-repair-2026-08-11.json";
const markdownRecordRelativePath = "packages/astro-knowledge/review/v13-duplicate-contentkey-repair-2026-08-11.md";
const releaseId = "ll-matrix-v13-owner-approved-runtime";
const expectedDuplicateCount = 108;
const eligibleReviewStates = new Set(["approved", "approved_reuse", "reviewed"]);
const ruledCopyEndings = new Map([
  [
    "fallback-hook/natal-aspect-lived/moon/opposition/ascendant",
    "somebody else's mood keeps deciding the whole day.",
  ],
  [
    "fallback-hook/placement-sign-lived/mars/cancer",
    "The anger builds when you cannot address it directly.",
  ],
]);
const ownerRuling = "Owner ruling 2026-08-11: For fallback-hook/natal-aspect-lived/moon/opposition/ascendant, keep the V13 copy ending \"…somebody else's mood keeps deciding the whole day.\" For fallback-hook/placement-sign-lived/mars/cancer, keep the V13 copy ending \"The anger builds when you cannot address it directly.\" For all 108 duplicated contentKeys, the V13 row supersedes the earlier row per the documented V13 precedence.";

const absolute = (relativePath) => path.join(repoRoot, relativePath);
const readJson = (relativePath) => JSON.parse(fs.readFileSync(absolute(relativePath), "utf8"));
const sha256 = (value) => crypto.createHash("sha256").update(value).digest("hex");
const rowSha256 = (row) => sha256(JSON.stringify(row));
const copyShape = (row) => JSON.stringify({
  body: row.body ?? null,
  body_you: row.body_you ?? null,
  body_they: row.body_they ?? null,
});
const approvedFingerprint = (rows) => sha256(JSON.stringify(
  rows
    .filter((row) => eligibleReviewStates.has(row.review_status))
    .map(rowSha256)
    .sort(),
));

function atomicWrite(relativePath, bytes) {
  const target = absolute(relativePath);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  const temporary = `${target}.tmp-${process.pid}`;
  try {
    fs.writeFileSync(temporary, bytes);
    fs.renameSync(temporary, target);
  } finally {
    if (fs.existsSync(temporary)) fs.unlinkSync(temporary);
  }
}

function allRows(source) {
  return [...source.vocabularyRows, ...source.hookRows];
}

function groupRows(rows) {
  const grouped = new Map();
  for (const row of rows) {
    if (!row.contentKey) throw new Error("Canonical source row is missing contentKey.");
    const group = grouped.get(row.contentKey) ?? [];
    group.push(row);
    grouped.set(row.contentKey, group);
  }
  return grouped;
}

function validateV13Rows(source, locked) {
  const expectedByKey = new Map(locked.rows.map((row) => [row.contentKey, row]));
  const v13Rows = source.hookRows.filter((row) => row.source_release === releaseId);
  if (expectedByKey.size !== 301 || v13Rows.length !== 301) {
    throw new Error(`V13 serving rows must remain 301 unique rows; locked=${expectedByKey.size}, source=${v13Rows.length}.`);
  }
  const sourceByKey = new Map(v13Rows.map((row) => [row.contentKey, row]));
  if (sourceByKey.size !== v13Rows.length) throw new Error("V13 serving rows contain duplicate contentKey values.");
  for (const [contentKey, lockedRow] of expectedByKey) {
    const sourceRow = sourceByKey.get(contentKey);
    if (!sourceRow) throw new Error(`${contentKey}: V13 serving row is missing.`);
    if (sourceRow.body !== lockedRow.copy) throw new Error(`${contentKey}: V13 serving copy drifted from the locked owner-approved row.`);
    if (sourceRow.approval?.payloadSha256 !== lockedRow.payloadSha256) {
      throw new Error(`${contentKey}: V13 approval payload hash drifted.`);
    }
  }
}

function markdownFor(record) {
  const conflictSections = record.entries
    .filter((entry) => entry.copyChanged)
    .map((entry) => `### \`${entry.contentKey}\`\n\n- Dropped earlier copy: ${JSON.stringify(entry.dropped.copy.body)}\n- Kept V13 copy: ${JSON.stringify(entry.kept.copy.body)}\n`)
    .join("\n");
  const keyRows = record.entries.map((entry) => (
    `| \`${entry.contentKey}\` | \`${entry.kept.rowSha256}\` | \`${entry.dropped.rowSha256}\` | ${entry.copyChanged ? "owner-ruled V13 copy" : "copy identical; V13 metadata retained"} |`
  )).join("\n");
  return `# LL V13 duplicate contentKey repair\n\nDate: 2026-08-11\n\n## Authority\n\n${ownerRuling}\n\nThe governing ingestion record is \`packages/astro-knowledge/review/ll-matrix-v13-ingestion-2026-08-10.md\`. Its V13 exact-key precedence requires replacement, not append-order precedence.\n\n## Root cause and repair\n\nCommit \`77f2602e\` appended the 301 V13 runtime rows after existing rows. For 108 keys already present, that produced two canonical rows with the same \`contentKey\`. This repair deterministically keeps the single row whose \`source_release\` is \`${releaseId}\` and removes the superseded earlier row. The transform is idempotent.\n\n- Duplicate keys before repair: ${record.counts.duplicateKeysBefore}\n- Superseded approved rows removed: ${record.counts.supersededRowsRemoved}\n- Duplicate keys after repair: ${record.counts.duplicateKeysAfter}\n- V13 rows retained: ${record.counts.v13RowsRetained}\n- Non-removed approved-row fingerprint before: \`${record.invariants.nonRemovedApprovedRowsBeforeSha256}\`\n- Approved-row fingerprint after: \`${record.invariants.approvedRowsAfterSha256}\`\n- Other approved-row changes: ${record.invariants.otherApprovedRowsChanged}\n\n## Owner-ruled copy conflicts\n\n${conflictSections}\n## Per-key disposition\n\n| contentKey | Kept V13 row SHA-256 | Dropped earlier row SHA-256 | Copy disposition |\n|---|---|---|---|\n${keyRows}\n\n## Generated artifacts\n\nGenerated fallback manifests, \`dist/tldr-content.js\`, and \`content-book.html\` are regenerated from the repaired source. They are never merged across branches.\n`;
}

const cliArguments = process.argv.slice(2);
const write = cliArguments.includes("--write");
const replaceSource = cliArguments.includes("--replace-source");
const baseRefIndex = cliArguments.indexOf("--base-ref");
const baseRef = baseRefIndex === -1 ? null : cliArguments[baseRefIndex + 1];
const validArguments = new Set(["--write", "--check", "--base-ref", "--replace-source", baseRef]);
if (!baseRef && baseRefIndex !== -1) {
  throw new Error("--base-ref requires a git ref.");
}
if (cliArguments.some((argument) => !validArguments.has(argument))) {
  throw new Error("Usage: node scripts/repair-v13-duplicate-contentkeys.mjs [--write|--check] [--base-ref <git-ref>] [--replace-source]");
}
if (replaceSource && (!write || !baseRef)) {
  throw new Error("--replace-source requires --write and --base-ref.");
}

const workingSourceBytes = fs.readFileSync(absolute(sourceRelativePath));
const sourceBytesBefore = baseRef
  ? execFileSync("git", ["show", `${baseRef}:${sourceRelativePath}`], {
      cwd: repoRoot,
      maxBuffer: 32 * 1024 * 1024,
    })
  : workingSourceBytes;
const source = JSON.parse(sourceBytesBefore.toString("utf8"));
const locked = readJson(lockedRelativePath);
validateV13Rows(source, locked);
const rowsBefore = allRows(source);
const duplicateGroups = [...groupRows(rowsBefore).entries()].filter(([, rows]) => rows.length > 1);

if (!write) {
  if (duplicateGroups.length > 0) {
    throw new Error(`Canonical source contains ${duplicateGroups.length} duplicate contentKey values.`);
  }
  console.log("V13 duplicate contentKey repair check passed: zero duplicate contentKeys; 301 V13 rows retained.");
  process.exit(0);
}

if (duplicateGroups.length === 0) {
  console.log("V13 duplicate contentKey repair: already clean; no files changed.");
  process.exit(0);
}
if (duplicateGroups.length !== expectedDuplicateCount) {
  throw new Error(`Expected ${expectedDuplicateCount} duplicate keys, found ${duplicateGroups.length}. Rebase record must be reviewed.`);
}

const droppedRows = new Set();
const entries = duplicateGroups.map(([contentKey, rows]) => {
  const kept = rows.filter((row) => row.source_release === releaseId);
  const dropped = rows.filter((row) => row.source_release !== releaseId);
  if (rows.length !== 2 || kept.length !== 1 || dropped.length !== 1) {
    throw new Error(`${contentKey}: expected exactly one V13 row and one superseded earlier row.`);
  }
  const keptRow = kept[0];
  const droppedRow = dropped[0];
  droppedRows.add(droppedRow);
  const expectedEnding = ruledCopyEndings.get(contentKey);
  if (expectedEnding && !String(keptRow.body ?? "").endsWith(expectedEnding)) {
    throw new Error(`${contentKey}: V13 copy does not match the owner's ruled ending.`);
  }
  return {
    contentKey,
    copyChanged: copyShape(keptRow) !== copyShape(droppedRow),
    kept: {
      sourceRelease: releaseId,
      rowSha256: rowSha256(keptRow),
      copy: JSON.parse(copyShape(keptRow)),
    },
    dropped: {
      sourceRelease: droppedRow.source_release ?? null,
      rowSha256: rowSha256(droppedRow),
      copy: JSON.parse(copyShape(droppedRow)),
    },
  };
}).sort((left, right) => left.contentKey.localeCompare(right.contentKey));

const copyConflicts = entries.filter((entry) => entry.copyChanged).map((entry) => entry.contentKey);
if (JSON.stringify(copyConflicts) !== JSON.stringify([...ruledCopyEndings.keys()].sort())) {
  throw new Error(`Copy-conflict set drifted: ${JSON.stringify(copyConflicts)}.`);
}

const retainedVocabularyRows = source.vocabularyRows.filter((row) => !droppedRows.has(row));
const retainedHookRows = source.hookRows.filter((row) => !droppedRows.has(row));
const repaired = { ...source, vocabularyRows: retainedVocabularyRows, hookRows: retainedHookRows };
const rowsAfter = allRows(repaired);
const duplicateKeysAfter = [...groupRows(rowsAfter).values()].filter((rows) => rows.length > 1).length;
if (duplicateKeysAfter !== 0 || rowsBefore.length - rowsAfter.length !== expectedDuplicateCount) {
  throw new Error("Dedupe postcondition failed.");
}
validateV13Rows(repaired, locked);

const nonRemovedApprovedRowsBefore = rowsBefore.filter((row) => (
  eligibleReviewStates.has(row.review_status) && !droppedRows.has(row)
));
const nonRemovedApprovedFingerprint = approvedFingerprint(nonRemovedApprovedRowsBefore);
const approvedRowsAfterFingerprint = approvedFingerprint(rowsAfter);
if (nonRemovedApprovedFingerprint !== approvedRowsAfterFingerprint) {
  throw new Error("Approved-row invariant failed outside the 108 documented removals.");
}

const sourceBytesAfter = Buffer.from(`${JSON.stringify(repaired, null, 1)}\n`);
if (baseRef && !replaceSource && !workingSourceBytes.equals(sourceBytesAfter)) {
  throw new Error(`Current source differs from the deterministic repair of ${baseRef}; refusing to overwrite an unrecorded source delta.`);
}
const record = {
  schemaVersion: 1,
  record: "v13-duplicate-contentkey-repair-2026-08-11",
  baseCommit: execFileSync("git", ["rev-parse", baseRef ?? "HEAD"], { cwd: repoRoot, encoding: "utf8" }).trim(),
  source: sourceRelativePath,
  lockedAuthority: lockedRelativePath,
  ownerRuling,
  rootCause: "Commit 77f2602e appended V13 rows instead of replacing earlier same-key rows.",
  counts: {
    duplicateKeysBefore: duplicateGroups.length,
    supersededRowsRemoved: rowsBefore.length - rowsAfter.length,
    duplicateKeysAfter,
    v13RowsRetained: rowsAfter.filter((row) => row.source_release === releaseId).length,
    copyIdenticalDuplicates: entries.filter((entry) => !entry.copyChanged).length,
    ownerRuledCopyConflicts: entries.filter((entry) => entry.copyChanged).length,
  },
  invariants: {
    sourceBeforeSha256: sha256(sourceBytesBefore),
    sourceAfterSha256: sha256(sourceBytesAfter),
    nonRemovedApprovedRowsBeforeSha256: nonRemovedApprovedFingerprint,
    approvedRowsAfterSha256: approvedRowsAfterFingerprint,
    otherApprovedRowsChanged: 0,
    v13RowsRetainedByteIdentical: true,
  },
  entries,
};

atomicWrite(sourceRelativePath, sourceBytesAfter);
atomicWrite(jsonRecordRelativePath, `${JSON.stringify(record, null, 2)}\n`);
atomicWrite(markdownRecordRelativePath, markdownFor(record));
console.log(`V13 duplicate contentKey repair wrote ${entries.length} dispositions; removed ${record.counts.supersededRowsRemoved} rows; zero duplicates remain.`);
