#!/usr/bin/env node

import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const sourcePath = path.join(
  repoRoot,
  "apps/web/src/content/fallbackArchitectureV3/source-rows/fallback-source-rows-v3.json"
);
const recordRelativePath = "packages/astro-knowledge/review/fallback-approval-metadata-reconciliation-2026-08-13.json";
const recordPath = path.join(repoRoot, recordRelativePath);
const migrationId = "fallback-approval-metadata-reconciliation-2026-08-13";
const write = process.argv.includes("--write");

const expectedBaseline = {
  hookRows: 4377,
  alreadyStructured: 1224,
  missingStructured: 3153,
  exactOwnerApproved: 226,
  ownerSignoffUntraced: 2320,
  ungated: 607
};

const exactRecordSpecs = [
  {
    contentKeyPattern: /^fallback-hook\/daily-(?:headline|body)\//u,
    approvedAt: "2026-08-04",
    recordPaths: [
      "packages/astro-knowledge/review/daily-glance-batch-1-approval-2026-08-04.md",
      "packages/astro-knowledge/review/daily-glance-pilots-v1-approval-2026-08-04.md"
    ]
  },
  {
    contentKeyPattern: /^fallback-hook\/daily-(?:headline|body)\//u,
    approvedAt: "2026-08-05",
    recordPaths: [
      "packages/astro-knowledge/review/daily-glance-batch-2-approval-2026-08-05.md",
      "packages/astro-knowledge/review/daily-glance-batch-2-square-chiron-approval-2026-08-05.md",
      "packages/astro-knowledge/review/daily-glance-batch-3-owner-authored-2026-08-05.md",
      "packages/astro-knowledge/review/daily-glance-batch-4-owner-authored-2026-08-05.md"
    ]
  },
  {
    contentKeyPattern: /^fallback-hook\/daily-(?:headline|body)\//u,
    approvedAt: "2026-08-11",
    recordPaths: [
      "packages/astro-knowledge/review/daily-glance-sol-directive-pilot-2026-08-11/owner-verdict-2026-08-11.json"
    ]
  },
  {
    contentKeyPattern: /^fallback-hook\/sky-placement-(?:tagline|hook|lived|turn)\/moon\//u,
    approvedAt: "2026-08-07",
    recordPaths: [
      "packages/astro-knowledge/review/moon-sign-entries-v1/moon-sign-entries-owner-package.md"
    ]
  },
  {
    contentKeyPattern: /^fallback-hook\/sky-placement-(?:tagline|hook|lived|turn)\/moon\//u,
    approvedAt: "2026-08-05",
    recordPaths: [
      "packages/astro-knowledge/review/moon-template-package-2026-08-05.md"
    ]
  },
  {
    contentKeyPattern: /^fallback-hook\/sky-placement-(?:tagline|hook|lived|turn)\/lilith\//u,
    approvedAt: "2026-08-09",
    recordPaths: [
      "packages/astro-knowledge/review/lilith-placements-v5/lilith-placements-v5-owner-package.md"
    ]
  }
];

const ownerSignoffInNotes = /(?:owner-authored|owner-final|owner-approved|exact approval|owner\s+["“]approved|owner\s+v\d+\s+rewrite|owner rewrite|owner correction|owner edit)/iu;
const readerCopyFields = [
  "headline",
  "body",
  "body_you",
  "body_they",
  "body_sky",
  "fact_line",
  "aspect_insert",
  "primary_hook",
  "opening_heading",
  "opening",
  "tension_heading",
  "tension",
  "development_heading",
  "development",
  "close_heading",
  "close",
  "try_this",
  "aspect_units",
  "moon_entry_aspect_units"
];

function sha256(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function normalizeForRecordMatch(value) {
  return String(value)
    .replace(/[‘’]/gu, "'")
    .replace(/[“”]/gu, "\"")
    .replace(/\\n/gu, " ")
    .replace(/\s+/gu, " ")
    .trim();
}

function readerPayload(row) {
  return Object.fromEntries(
    readerCopyFields
      .filter((field) => row[field] !== undefined)
      .map((field) => [field, row[field]])
  );
}

function payloadTexts(row) {
  return ["body", "body_you", "body_they", "body_sky"]
    .map((field) => row[field])
    .filter((value) => typeof value === "string" && value.trim())
    .map(normalizeForRecordMatch);
}

function evidenceFor(row) {
  return [row.approved_via, row.note, row.notes]
    .filter((value) => typeof value === "string" && value.trim())
    .join(" | ");
}

function dateFromEvidence(evidence) {
  const iso = evidence.match(/\b(20\d{2}-\d{2}-\d{2})\b/u)?.[1];
  if (iso) return iso;

  const prose = evidence.match(/\b(Jul(?:y)?|Aug(?:ust)?)\s+(\d{1,2})\s*,?\s+(20\d{2})\b/iu);
  if (!prose) return null;
  const month = prose[1].toLowerCase().startsWith("jul") ? "07" : "08";
  return `${prose[3]}-${month}-${prose[2].padStart(2, "0")}`;
}

const recordTextByPath = new Map();
for (const spec of exactRecordSpecs) {
  for (const relativePath of spec.recordPaths) {
    if (recordTextByPath.has(relativePath)) continue;
    const absolutePath = path.join(repoRoot, relativePath);
    assert.ok(fs.existsSync(absolutePath), `Missing approval record: ${relativePath}`);
    recordTextByPath.set(relativePath, normalizeForRecordMatch(fs.readFileSync(absolutePath, "utf8")));
  }
}

function exactRecordFor(row) {
  const texts = payloadTexts(row);
  if (!texts.length) return null;

  for (const spec of exactRecordSpecs) {
    if (!spec.contentKeyPattern.test(row.contentKey)) continue;
    for (const recordPath of spec.recordPaths) {
      const recordText = recordTextByPath.get(recordPath);
      if (texts.every((text) => recordText.includes(text))) {
        return { recordPath, approvedAt: spec.approvedAt };
      }
    }
  }
  return null;
}

function hasUntracedOwnerSignoff(row) {
  if (row.review_status !== "approved") return false;
  if (typeof row.approved_via === "string" && /owner/iu.test(row.approved_via)) return true;
  return ownerSignoffInNotes.test([row.note, row.notes].filter(Boolean).join(" | "));
}

const sourceTextBefore = fs.readFileSync(sourcePath, "utf8");
const source = JSON.parse(sourceTextBefore);
const hookRows = source.hookRows ?? [];
const isMigratedApproval = (row) => (
  row.approval?.verifiedBy === migrationId
  || row.approval?.migratedBy === migrationId
);
const alreadyStructuredRows = hookRows.filter((row) => (
  row.approval?.approvalLevel && !isMigratedApproval(row)
));
const missingRows = hookRows.filter((row) => (
  !row.approval?.approvalLevel || isMigratedApproval(row)
));

assert.equal(hookRows.length, expectedBaseline.hookRows, "Unexpected hook-row baseline");
assert.equal(alreadyStructuredRows.length, expectedBaseline.alreadyStructured, "Unexpected structured-approval baseline");
assert.equal(missingRows.length, expectedBaseline.missingStructured, "Unexpected migration-scope baseline");

const readerPayloadBefore = sha256(JSON.stringify(hookRows.map((row) => [row.contentKey, readerPayload(row)])));
const exactRows = [];
const untracedRows = [];
const ungatedRows = [];

for (const row of missingRows) {
  const exactRecord = exactRecordFor(row);
  const payload = readerPayload(row);

  if (exactRecord) {
    row.approval = {
      approvalLevel: "exact_owner_approved",
      recordPath: exactRecord.recordPath,
      payloadSha256: sha256(JSON.stringify(payload)),
      approvedAt: exactRecord.approvedAt,
      verifiedBy: migrationId
    };
    exactRows.push({
      contentKey: row.contentKey,
      ...row.approval
    });
    continue;
  }

  if (hasUntracedOwnerSignoff(row)) {
    const evidence = evidenceFor(row);
    const approvedAt = dateFromEvidence(evidence);
    row.approval = {
      approvalLevel: "owner_signoff_untraced",
      ...(approvedAt ? { approvedAt } : {}),
      evidence,
      migratedBy: migrationId
    };
    untracedRows.push({
      contentKey: row.contentKey,
      reviewStatus: row.review_status,
      ...row.approval
    });
    continue;
  }

  ungatedRows.push({
    contentKey: row.contentKey,
    reviewStatus: row.review_status,
    reason: row.review_status === "reviewed"
      ? "reviewed_without_content_approval"
      : row.review_status === "needs_review"
        ? "needs_review"
        : row.review_status === "approved_reuse"
          ? "source_authorship_is_not_row_approval"
          : "review_status_without_owner_approval_evidence"
  });
}

assert.equal(exactRows.length, expectedBaseline.exactOwnerApproved, "Unexpected exact-approval classification count");
assert.equal(untracedRows.length, expectedBaseline.ownerSignoffUntraced, "Unexpected untraced-signoff classification count");
assert.equal(ungatedRows.length, expectedBaseline.ungated, "Unexpected ungated classification count");

const targetRow = hookRows.find((row) => row.contentKey === "fallback-hook/placement-house-sentence/saturn/7");
assert.equal(targetRow?.approval?.approvalLevel, "owner_signoff_untraced", "Saturn/7 fallback hook must retain its historical untraced owner sign-off");

const readerPayloadAfter = sha256(JSON.stringify(hookRows.map((row) => [row.contentKey, readerPayload(row)])));
assert.equal(readerPayloadAfter, readerPayloadBefore, "Approval migration changed reader-facing copy");

const exactByRecord = Object.fromEntries(
  [...new Set(exactRows.map((row) => row.recordPath))]
    .sort()
    .map((recordPath) => [recordPath, exactRows.filter((row) => row.recordPath === recordPath).length])
);
const untracedByEvidence = [...new Set(untracedRows.map((row) => row.evidence))]
  .map((evidence) => ({
    evidence,
    contentKeys: untracedRows.filter((row) => row.evidence === evidence).map((row) => row.contentKey)
  }))
  .sort((left, right) => right.contentKeys.length - left.contentKeys.length || left.evidence.localeCompare(right.evidence));
const ungatedByReason = Object.fromEntries(
  [...new Set(ungatedRows.map((row) => row.reason))]
    .sort()
    .map((reason) => [reason, ungatedRows.filter((row) => row.reason === reason).map((row) => row.contentKey)])
);

const record = {
  schemaVersion: 1,
  id: migrationId,
  recordedAt: "2026-08-13",
  sourcePath: path.relative(repoRoot, sourcePath),
  policy: {
    exactOwnerApproved: "Current row wording appears verbatim in a repository record that grants exact owner approval for the row family.",
    ownerSignoffUntraced: "Historical row metadata explicitly documents owner sign-off, but no repository record reproduces and approves the current wording.",
    ungated: "No row-level owner approval was inferred from review_status, source authorship, operation-only approval, or approval of shared doctrine."
  },
  counts: {
    hookRows: hookRows.length,
    alreadyStructured: alreadyStructuredRows.length,
    missingStructuredBefore: missingRows.length,
    exactOwnerApprovedAdded: exactRows.length,
    ownerSignoffUntracedAdded: untracedRows.length,
    leftUngated: ungatedRows.length
  },
  invariants: {
    readerPayloadSha256Before: readerPayloadBefore,
    readerPayloadSha256After: readerPayloadAfter,
    copyChanged: false
  },
  exactByRecord,
  exactRows,
  untracedByEvidence,
  ungatedByReason,
  gateDecision: {
    currentAcceptedLevels: ["exact_owner_approved"],
    changedByThisMigration: false,
    ownerRulingRequiredToAccept: "owner_signoff_untraced",
    recommendation: "Keep Friends exact-only until the owner explicitly rules that historical untraced sign-offs are acceptable on Friends surfaces."
  }
};

console.log(JSON.stringify(record.counts, null, 2));
console.log(`reader payload: ${readerPayloadBefore} (unchanged)`);

if (write) {
  fs.writeFileSync(sourcePath, `${JSON.stringify(source, null, 1)}\n`);
  fs.writeFileSync(recordPath, `${JSON.stringify(record, null, 2)}\n`);
  console.log(`wrote ${path.relative(repoRoot, sourcePath)}`);
  console.log(`wrote ${recordRelativePath}`);
} else {
  console.log("dry run; pass --write to apply");
}
