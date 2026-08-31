#!/usr/bin/env node

import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const contentKey = "fallback-hook/natal-aspect-lived/saturn/square/ascendant";
const reviewRelative = "packages/astro-knowledge/review/saturn-square-ascendant-owner-edit-v1";
const authorityRelative = `${reviewRelative}/content-studio-owner-edit-authority.json`;
const recordRelative = `${reviewRelative}/saturn-square-ascendant-owner-edit-supersession.json`;
const manifestRelative = `${reviewRelative}/shipping-manifest.json`;
const postwriteRelative = `${reviewRelative}/postwrite-materialization.json`;
const sourceRelative = "apps/web/src/content/fallbackArchitectureV3/source-rows/fallback-source-rows-v3.json";
const sourceMechanism = "Exact owner-edited You and Friends copy captured from Content Studio and explicitly reaffirmed as the latest authority in the owner's Codex instruction on 2026-08-31.";
const apply = process.argv.includes("--apply");
const sha256 = (value) => crypto.createHash("sha256").update(value).digest("hex");
const read = (relative) => fs.readFileSync(path.join(repoRoot, relative));
const readJson = (relative) => JSON.parse(read(relative).toString("utf8"));
const jsonBytes = (value, spaces = 2) => Buffer.from(`${JSON.stringify(value, null, spaces)}\n`);

const authorityBytes = read(authorityRelative);
const authority = JSON.parse(authorityBytes.toString("utf8"));
assert.equal(authority.contentKey, contentKey);
assert.equal(authority.authority, "latest_explicit_owner_edit");
assert.equal(sha256(authority.you.body), authority.you.sha256);
assert.equal(sha256(authority.friends.body_they), authority.friends.sha256);
assert.equal(authority.you.sha256, "9ee6460ea6ccfa9fe1a9d74ba9d5f756b365b146c54db30f6118456a81091946");
assert.equal(authority.friends.sha256, "1a0d569bc79559a7fd3958402ec2689577011457d21bf7ee70b3512257bf65e7");

const source = readJson(sourceRelative);
const row = source.hookRows.find((candidate) => candidate.contentKey === contentKey);
assert.ok(row, `${contentKey}: governed source row missing`);

const priorYouRecord = readJson(authority.supersedes.you.approvalRecordPath);
const priorFriendsRecord = readJson(authority.supersedes.friends.approvalRecordPath);
assert.equal(priorYouRecord.payloadSha256, authority.supersedes.you.payloadSha256);
assert.equal(priorYouRecord.sourceArtifact.bodySha256, authority.supersedes.you.bodySha256);
assert.equal(priorFriendsRecord.payloadSha256, authority.supersedes.friends.payloadSha256);
assert.equal(priorFriendsRecord.sourceArtifact.bodySha256, authority.supersedes.friends.bodySha256);

const payload = {
  body: authority.you.body,
  body_they: authority.friends.body_they,
  sourceMechanism
};
const payloadSha256 = sha256(JSON.stringify(payload));
const approval = {
  approvalLevel: "exact_owner_approved",
  recordPath: recordRelative,
  payloadSha256,
  approvedAt: authority.ownerRulingDate
};
const record = {
  schemaVersion: 1,
  id: "saturn-square-ascendant-owner-edit-supersession-2026-08-31",
  approvalLevel: "exact_owner_approved",
  authorship: "owner_edited_exact_approved",
  provenanceNote: "The owner explicitly confirmed both separately edited Content Studio fields as the latest authority. Earlier V15 and Friends V1 approval records remain immutable historical evidence.",
  contentKey,
  textFields: ["body", "body_they"],
  payloadSha256,
  payloadHashAlgorithm: "sha256(JSON.stringify(payload))",
  payload,
  bodySha256: authority.you.sha256,
  bodyTheySha256: authority.friends.sha256,
  approvedAt: authority.ownerRulingDate,
  approvalEffect: "exact_wording_supersession",
  sourceArtifact: {
    id: authority.artifactId,
    path: authorityRelative,
    sha256: sha256(authorityBytes),
    remoteUpdatedAt: authority.remoteUpdatedAt
  },
  supersedes: {
    you: {
      approvalLevel: priorYouRecord.approvalLevel,
      recordPath: authority.supersedes.you.approvalRecordPath,
      payloadSha256: authority.supersedes.you.payloadSha256,
      bodySha256: authority.supersedes.you.bodySha256,
      historicalRecordPreserved: true
    },
    friends: {
      approvalLevel: priorFriendsRecord.approvalLevel,
      recordPath: authority.supersedes.friends.approvalRecordPath,
      payloadSha256: authority.supersedes.friends.payloadSha256,
      bodySha256: authority.supersedes.friends.bodySha256,
      historicalRecordPreserved: true
    }
  },
  ownerConfirmationSource: {
    channel: "Codex task owner message",
    taskId: "01a04fc0-899b-7cd2-bb2e-98ad182391bb",
    date: authority.ownerRulingDate
  },
  additionalBilledCalls: 0
};
const recordBytes = jsonBytes(record);
const postwriteBytes = read(postwriteRelative);

const priorYouHistory = {
  approvalLevel: priorYouRecord.approvalLevel,
  recordPath: authority.supersedes.you.approvalRecordPath,
  payloadSha256: authority.supersedes.you.payloadSha256,
  approvedAt: priorYouRecord.approvedAt,
  bodySha256: authority.supersedes.you.bodySha256,
  textField: "body",
  supersededBy: recordRelative
};
const priorFriendsHistory = {
  approvalLevel: priorFriendsRecord.approvalLevel,
  recordPath: authority.supersedes.friends.approvalRecordPath,
  payloadSha256: authority.supersedes.friends.payloadSha256,
  approvedAt: priorFriendsRecord.approvedAt,
  bodySha256: authority.supersedes.friends.bodySha256,
  textField: "body_they",
  supersededBy: recordRelative
};

row.historical_approvals = [
  ...(row.historical_approvals ?? []).filter((entry) => entry.supersededBy !== recordRelative),
  priorYouHistory
];
row.body_they_historical_approvals = [
  ...(row.body_they_historical_approvals ?? []).filter((entry) => entry.supersededBy !== recordRelative),
  priorFriendsHistory
];
row.body = authority.you.body;
row.sourceMechanism = sourceMechanism;
row.approval = approval;
row.body_they = authority.friends.body_they;
row.body_they_review_status = "approved";
row.body_they_sha256 = authority.friends.sha256;
row.body_they_approved_via = authorityRelative;
row.body_they_authorship = "owner_edited_exact_approved";
row.body_they_name_variable = "{{Name}}";
row.body_they_sourceMechanism = sourceMechanism;
row.body_they_approval = approval;
row.source_keys = [...new Set([...(row.source_keys ?? []), authorityRelative])];

const manifest = {
  schemaVersion: 1,
  release: "saturn-square-ascendant-owner-edit-v1",
  approvedAt: authority.ownerRulingDate,
  contentKey,
  authorityArtifact: {
    path: authorityRelative,
    sha256: sha256(authorityBytes),
    remoteUpdatedAt: authority.remoteUpdatedAt,
    youBodySha256: authority.you.sha256,
    friendsBodySha256: authority.friends.sha256
  },
  approvalRecord: {
    path: recordRelative,
    sha256: sha256(recordBytes),
    payloadSha256
  },
  supersededRecordsPreserved: [
    authority.supersedes.you.approvalRecordPath,
    authority.supersedes.friends.approvalRecordPath
  ],
  postwriteEvidence: {
    path: postwriteRelative,
    sha256: sha256(postwriteBytes)
  },
  scope: {
    exactKeyCount: 1,
    keys: [contentKey],
    readerCopyOutsideKeyChanged: 0
  }
};

if (apply) {
  fs.mkdirSync(path.join(repoRoot, reviewRelative), { recursive: true });
  fs.writeFileSync(path.join(repoRoot, recordRelative), recordBytes);
  fs.writeFileSync(path.join(repoRoot, manifestRelative), jsonBytes(manifest));
  fs.writeFileSync(path.join(repoRoot, sourceRelative), jsonBytes(source, 1));
}

console.log(JSON.stringify({
  mode: apply ? "applied" : "verify-only",
  contentKey,
  authoritySha256: manifest.authorityArtifact.sha256,
  youBodySha256: authority.you.sha256,
  friendsBodySha256: authority.friends.sha256,
  payloadSha256,
  recordSha256: manifest.approvalRecord.sha256,
  historicalRecordsPreserved: manifest.supersededRecordsPreserved.length
}, null, 2));
