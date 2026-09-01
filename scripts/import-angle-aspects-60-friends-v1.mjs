#!/usr/bin/env node

import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const reviewRelative = "packages/astro-knowledge/review/angle-aspects-60-friends-v1";
const reviewRoot = path.join(repoRoot, reviewRelative);
const sourceRowsRelative = "apps/web/src/content/fallbackArchitectureV3/source-rows/fallback-source-rows-v3.json";
const sourceRowsPath = path.join(repoRoot, sourceRowsRelative);
const v15ReviewRelative = "packages/astro-knowledge/review/angle-aspects-60-v15";
const v15ImportPath = path.join(repoRoot, v15ReviewRelative, "ANGLE-ASPECTS-60-V15-CONTENT-STUDIO-IMPORT.json");
const v15MarkdownPath = path.join(repoRoot, v15ReviewRelative, "ANGLE-ASPECTS-60-V15-OWNER-APPROVAL-CANDIDATE.md");
const friendsMarkdownName = "ANGLE-ASPECTS-60-FRIENDS-V1-OWNER-APPROVED.md";
const friendsJsonName = "ANGLE-ASPECTS-60-FRIENDS-V1-OWNER-APPROVED.json";
const youRevisionsName = "YOU-V15-TWO-OWNER-APPROVED-SUPERSESSIONS.json";
const copiedAuthorityNames = [
  friendsMarkdownName,
  friendsJsonName,
  youRevisionsName,
  "CODEX-HANDOFF.md",
  "SHIPPING-MANIFEST.json",
  "SHA256SUMS.txt"
];
const expected = {
  friendsMarkdown: "186fc623066981bd66a1cb7f4f00e2062391572b5f94ab1ad68b7842c5c135f2",
  friendsJson: "acdd96d177b971d1a4cc9bb1c02130347a09fcd2036de499ea35c1a205cd5640",
  youRevisions: "bba7b003351a7b145c16c17ec6b85226d74aba37124c53aa08a2da54f7f1b853",
  v15Markdown: "3bbcd3e611d72a9754e9fdb4f4390ec860a670bc53af6b059ea23a212d37bfd4",
  keySet: "f68fe6aa9a7cd67b161ba589ba31743074fad8e8e112fd96ef605184176c6984"
};
const sourceMechanisms = {
  friends: "Separately authored Friends copy transcribed byte-for-byte from the SHA-bound Friends V1 owner-approved artifact; no You-to-Friends transformation is permitted.",
  youRevision: "Later exact owner-approved You supersession transcribed byte-for-byte from the SHA-bound Friends V1 handoff revision artifact; historical V15 approval evidence is preserved."
};
const args = process.argv.slice(2);
const apply = args.includes("--apply");
const authorityArg = args.find((arg) => arg.startsWith("--authority-dir="));
const impactArg = args.find((arg) => arg.startsWith("--impact-report="));
const targetedImpactArg = args.find((arg) => arg.startsWith("--targeted-impact-report="));
const actualImpactArg = args.find((arg) => arg.startsWith("--actual-impact-report="));
const postComparatorArg = args.find((arg) => arg.startsWith("--post-comparator-report="));
const scopeAuditArg = args.find((arg) => arg.startsWith("--scope-audit-report="));
const authorityRoot = path.resolve(authorityArg?.slice("--authority-dir=".length) ?? reviewRoot);
const impactReportPath = impactArg ? path.resolve(impactArg.slice("--impact-report=".length)) : null;
const targetedImpactReportPath = targetedImpactArg ? path.resolve(targetedImpactArg.slice("--targeted-impact-report=".length)) : null;
const actualImpactReportPath = actualImpactArg ? path.resolve(actualImpactArg.slice("--actual-impact-report=".length)) : null;
const postComparatorReportPath = postComparatorArg ? path.resolve(postComparatorArg.slice("--post-comparator-report=".length)) : null;
const scopeAuditReportPath = scopeAuditArg ? path.resolve(scopeAuditArg.slice("--scope-audit-report=".length)) : null;
const sha256 = (value) => crypto.createHash("sha256").update(value).digest("hex");
const read = (filePath) => fs.readFileSync(filePath, "utf8");
const readJson = (filePath) => JSON.parse(read(filePath));
const writeJson = (filePath, value, spaces = 2) => fs.writeFileSync(filePath, `${JSON.stringify(value, null, spaces)}\n`);
const authorityPath = (name) => path.join(authorityRoot, name);
const reviewPath = (name) => path.join(reviewRoot, name);

function verifyFile(filePath, digest, label) {
  assert.equal(sha256(fs.readFileSync(filePath)), digest, `${label} SHA-256 mismatch`);
}

function parseFriendsMarkdown(markdown) {
  const entries = [];
  const lines = markdown.replace(/\r\n/gu, "\n").split("\n");
  for (let index = 0; index < lines.length; index += 1) {
    if (!lines[index].startsWith("### ")) continue;
    const heading = lines[index].slice(4).trim();
    const anchorLine = lines[index + 2] ?? "";
    const anchor = anchorLine.match(/^Content-key anchor: `([^`]+)`$/u)?.[1];
    assert.ok(anchor, `${heading}: missing content-key anchor`);
    const bodyLines = [];
    for (let bodyIndex = index + 4; bodyIndex < lines.length; bodyIndex += 1) {
      if (lines[bodyIndex].startsWith("### ") || lines[bodyIndex].startsWith("## ")) break;
      bodyLines.push(lines[bodyIndex]);
    }
    entries.push({ heading, contentKey: anchor, body: bodyLines.join("\n").trim() });
  }
  return entries;
}

function expectedKeySet() {
  const planets = ["sun", "moon", "mercury", "venus", "mars", "jupiter", "saturn", "uranus", "neptune", "pluto"];
  const aspects = ["conjunction", "square", "opposition"];
  const angles = ["ascendant", "midheaven"];
  return new Set(planets.flatMap((planet) => aspects.flatMap((aspect) => angles.map(
    (angle) => `fallback-hook/natal-aspect-lived/${planet}/${aspect}/${angle}`
  ))));
}

function fileSlug(contentKey) {
  return contentKey.replace("fallback-hook/", "").replaceAll("/", "-");
}

function payloadHash(payload) {
  return sha256(JSON.stringify(payload));
}

function nonTargetSignature(document, targetKeys) {
  const clone = structuredClone(document);
  for (const key of ["hookRows", "fallbackSourceRows", "vocabularyRows", "templates"]) {
    if (Array.isArray(clone[key])) clone[key] = clone[key].filter((row) => !targetKeys.has(row.contentKey));
  }
  return sha256(JSON.stringify(clone));
}

const friendsMarkdownPath = authorityPath(friendsMarkdownName);
const friendsJsonPath = authorityPath(friendsJsonName);
const youRevisionsPath = authorityPath(youRevisionsName);
verifyFile(friendsMarkdownPath, expected.friendsMarkdown, "Friends Markdown authority");
verifyFile(friendsJsonPath, expected.friendsJson, "Friends JSON authority");
verifyFile(youRevisionsPath, expected.youRevisions, "You revision authority");
verifyFile(v15MarkdownPath, expected.v15Markdown, "V15 You Markdown authority");

const friends = readJson(friendsJsonPath);
const revisions = readJson(youRevisionsPath);
const passages = parseFriendsMarkdown(read(friendsMarkdownPath));
const passageByKey = new Map(passages.map((entry) => [entry.contentKey, entry]));
const requiredKeys = expectedKeySet();
const suppliedKeys = new Set(friends.rows.map((row) => row.base_content_key));
assert.equal(friends.rowCount, 60);
assert.equal(friends.rows.length, 60);
assert.equal(passages.length, 60);
assert.equal(suppliedKeys.size, 60);
assert.deepEqual([...suppliedKeys].sort(), [...requiredKeys].sort());
assert.equal(sha256(`${[...suppliedKeys].sort().join("\n")}\n`), expected.keySet);
assert.equal(friends.canonicalMarkdownSha256, expected.friendsMarkdown);
assert.equal(revisions.revisions.length, 2);

for (const [index, friend] of friends.rows.entries()) {
  const passage = passageByKey.get(friend.base_content_key);
  assert.ok(passage, `${friend.base_content_key}: Markdown passage missing`);
  assert.equal(passage.body, friend.body, `${friend.base_content_key}: Markdown/JSON body mismatch`);
  assert.equal(friend.ordinal, index + 1, `${friend.base_content_key}: ordinal mismatch`);
  assert.equal(friend.surface, "friends");
  assert.equal(friend.voice, "they");
  assert.equal(friend.name_variable, "{{Name}}");
  assert.equal(friend.approval_level, "exact_owner_approved");
  assert.equal(sha256(friend.body), friend.body_sha256, `${friend.base_content_key}: body hash mismatch`);
  assert.match(friend.body, /\{\{Name\}\}/u, `${friend.base_content_key}: missing {{Name}}`);
  assert.doesNotMatch(friend.body, /(?:^|[^A-Za-z])(?:you|your|yours)(?=$|[^A-Za-z])/iu, `${friend.base_content_key}: second-person leak`);
  assert.match(friend.body, /\b(?:they|them|their|theirs)\b/iu, `${friend.base_content_key}: singular-they language missing`);
}

const source = readJson(sourceRowsPath);
const originSource = JSON.parse(execFileSync(
  "git",
  ["show", `origin/main:${sourceRowsRelative}`],
  { cwd: repoRoot, encoding: "utf8", maxBuffer: 20 * 1024 * 1024 }
));
const sourceByKey = new Map(source.hookRows.map((row) => [row.contentKey, row]));
const v15Import = readJson(v15ImportPath);
const v15ByKey = new Map(v15Import.rows.map((row) => [row.content_key, row]));
const revisionByKey = new Map(revisions.revisions.map((revision) => [revision.content_key, revision]));
assert.equal(v15Import.rowCount, 60);
assert.equal(v15ByKey.size, 60);
for (const key of requiredKeys) {
  assert.ok(sourceByKey.has(key), `${key}: governed source row missing`);
  const allowedBodies = new Set([v15ByKey.get(key)?.body, revisionByKey.get(key)?.body].filter(Boolean));
  assert.ok(allowedBodies.has(sourceByKey.get(key).body), `${key}: pre-import V15 You drift`);
}

const records = [];
const recordWrites = [];
for (const friend of friends.rows) {
  const row = sourceByKey.get(friend.base_content_key);
  const ordinal = String(friend.ordinal).padStart(3, "0");
  const recordRelative = `${reviewRelative}/records/${ordinal}-${fileSlug(friend.base_content_key)}-friends-exact-approval.json`;
  const recordPath = path.join(repoRoot, recordRelative);
  const payload = { body_they: friend.body, sourceMechanism: sourceMechanisms.friends };
  const record = {
    schemaVersion: 1,
    id: `angle-aspects-60-friends-v1-${ordinal}`,
    approvalLevel: "exact_owner_approved",
    authorship: friend.authorship,
    provenanceNote: "The Friends body is separately authored and exact owner approved. It is not derived from the You body.",
    contentKey: friend.base_content_key,
    packetKey: friend.packet_key,
    textField: "body_they",
    payloadSha256: payloadHash(payload),
    payloadHashAlgorithm: "sha256(JSON.stringify(payload))",
    payload,
    approvedAt: friends.approvedAt,
    approvalEffect: "exact_wording_approval",
    sourceArtifact: {
      id: friends.release,
      path: `${reviewRelative}/${friendsMarkdownName}`,
      sha256: expected.friendsMarkdown,
      jsonPath: `${reviewRelative}/${friendsJsonName}`,
      jsonSha256: expected.friendsJson,
      passageHeading: passageByKey.get(friend.base_content_key).heading,
      passageOrdinal: friend.ordinal,
      bodySha256: friend.body_sha256
    },
    ownerConfirmationSource: {
      channel: "Codex task owner message and SHA-pinned handoff",
      taskId: "01a04fc0-899b-7cd2-bb2e-98ad182391bb",
      date: friends.approvedAt
    },
    additionalBilledCalls: 0
  };
  row.body_they = friend.body;
  row.body_they_review_status = "approved";
  row.body_they_sha256 = friend.body_sha256;
  row.body_they_approved_via = `${reviewRelative}/${friendsMarkdownName}`;
  row.body_they_authorship = friend.authorship;
  row.body_they_name_variable = friend.name_variable;
  row.body_they_sourceMechanism = sourceMechanisms.friends;
  row.body_they_approval = {
    approvalLevel: record.approvalLevel,
    recordPath: recordRelative,
    payloadSha256: record.payloadSha256,
    approvedAt: record.approvedAt
  };
  row.source_keys = [...new Set([
    ...(row.source_keys ?? []),
    `${reviewRelative}/${friendsMarkdownName}`,
    `${reviewRelative}/${friendsJsonName}`
  ])];
  records.push({
    ordinal: friend.ordinal,
    packetKey: friend.packet_key,
    contentKey: friend.base_content_key,
    recordPath: recordRelative,
    payloadSha256: record.payloadSha256,
    bodySha256: friend.body_sha256
  });
  recordWrites.push({ recordPath, record });
}

const revisionRecords = [];
for (const revision of revisions.revisions) {
  const row = sourceByKey.get(revision.content_key);
  assert.ok(row, `${revision.content_key}: You revision target missing`);
  assert.equal(sha256(revision.body), revision.body_sha256);
  const slug = fileSlug(revision.content_key);
  const recordRelative = `${reviewRelative}/you-supersessions/${slug}-you-exact-supersession.json`;
  const existingHistory = (row.historical_approvals ?? []).find((entry) => entry.supersededBy === recordRelative);
  const priorApproval = existingHistory
    ? {
        approvalLevel: existingHistory.approvalLevel,
        recordPath: existingHistory.recordPath,
        payloadSha256: existingHistory.payloadSha256,
        approvedAt: existingHistory.approvedAt
      }
    : structuredClone(row.approval);
  const priorBodySha256 = existingHistory?.bodySha256 ?? sha256(row.body);
  const payload = { body: revision.body, sourceMechanism: sourceMechanisms.youRevision };
  const record = {
    schemaVersion: 1,
    id: `angle-aspects-60-friends-v1-you-supersession-${slug}`,
    approvalLevel: "exact_owner_approved",
    authorship: "owner_reviewed",
    provenanceNote: "Later exact owner-approved You wording supersedes the serving V15 body without mutating the historical V15 record.",
    contentKey: revision.content_key,
    textField: "body",
    payloadSha256: payloadHash(payload),
    payloadHashAlgorithm: "sha256(JSON.stringify(payload))",
    payload,
    approvedAt: revisions.approvedAt,
    approvalEffect: "exact_wording_supersession",
    sourceArtifact: {
      id: "you-v15-two-owner-approved-supersessions",
      path: `${reviewRelative}/${youRevisionsName}`,
      sha256: expected.youRevisions,
      bodySha256: revision.body_sha256
    },
    supersedes: {
      priorApproval,
      priorBodySha256,
      historicalRecordPreserved: true
    },
    ownerConfirmationSource: {
      channel: "Codex task owner message and SHA-pinned handoff",
      taskId: "01a04fc0-899b-7cd2-bb2e-98ad182391bb",
      date: revisions.approvedAt
    },
    additionalBilledCalls: 0
  };
  row.historical_approvals = existingHistory
    ? row.historical_approvals
    : [
        ...(row.historical_approvals ?? []),
        { ...priorApproval, bodySha256: priorBodySha256, supersededBy: recordRelative }
      ];
  row.body = revision.body;
  row.sourceMechanism = sourceMechanisms.youRevision;
  row.approval = {
    approvalLevel: record.approvalLevel,
    recordPath: recordRelative,
    payloadSha256: record.payloadSha256,
    approvedAt: record.approvedAt
  };
  row.source_keys = [...new Set([...(row.source_keys ?? []), `${reviewRelative}/${youRevisionsName}`])];
  revisionRecords.push({
    contentKey: revision.content_key,
    recordPath: recordRelative,
    payloadSha256: record.payloadSha256,
    bodySha256: revision.body_sha256,
    priorApprovalRecordPath: priorApproval.recordPath,
    priorBodySha256
  });
  recordWrites.push({ recordPath: path.join(repoRoot, recordRelative), record });
}

const payloadArtifact = {
  schemaVersion: 1,
  release: friends.release,
  sourceMarkdownSha256: expected.friendsMarkdown,
  sourceJsonSha256: expected.friendsJson,
  rowCount: records.length,
  rows: records
};
const impactReport = impactReportPath && fs.existsSync(impactReportPath) ? readJson(impactReportPath) : null;
const targetedImpactReport = targetedImpactReportPath && fs.existsSync(targetedImpactReportPath) ? readJson(targetedImpactReportPath) : null;
const actualImpactReport = actualImpactReportPath && fs.existsSync(actualImpactReportPath) ? readJson(actualImpactReportPath) : null;
const postComparatorReport = postComparatorReportPath && fs.existsSync(postComparatorReportPath) ? readJson(postComparatorReportPath) : null;
const scopeAuditReport = scopeAuditReportPath && fs.existsSync(scopeAuditReportPath) ? readJson(scopeAuditReportPath) : null;
const shippingManifest = {
  schemaVersion: 1,
  release: "angle-aspects-60-friends-v1-plus-two-you-supersessions",
  approvedAt: friends.approvedAt,
  base: {
    branch: "codex/friends-angle-aspects-v1-20260831",
    originMainSha: "43d2ebfebd2db366ae6dfb4fd89ee9b6b7cdc0fd"
  },
  sourceArtifacts: {
    friendsMarkdown: { path: `${reviewRelative}/${friendsMarkdownName}`, sha256: expected.friendsMarkdown },
    friendsJson: { path: `${reviewRelative}/${friendsJsonName}`, sha256: expected.friendsJson },
    youRevisionsJson: { path: `${reviewRelative}/${youRevisionsName}`, sha256: expected.youRevisions },
    baselineV15Markdown: { path: `${v15ReviewRelative}/ANGLE-ASPECTS-60-V15-OWNER-APPROVAL-CANDIDATE.md`, sha256: expected.v15Markdown }
  },
  friendsRowCount: records.length,
  friendsKeySetSha256: expected.keySet,
  friendsRecords: records,
  youRevisionCount: revisionRecords.length,
  youRevisionRecords: revisionRecords,
  prewriteRemoteImpact: impactReport ? {
    capturedAt: impactReport.capturedAt,
    reportPath: `${reviewRelative}/prewrite-remote-impact.json`,
    rowsUpdated: impactReport.predictedTargetedMaterialization.rowsUpdated,
    rowsCreated: impactReport.predictedTargetedMaterialization.rowsCreated,
    rowsDeleted: impactReport.predictedTargetedMaterialization.rowsDeleted,
    rowsArchivedOrDemoted: impactReport.predictedTargetedMaterialization.rowsArchivedOrDemoted,
    safeToProceed: impactReport.safeToProceed
  } : null,
  targetedMaterializerImpact: targetedImpactReport ? {
    capturedAt: targetedImpactReport.capturedAt,
    reportPath: `${reviewRelative}/targeted-materializer-impact.json`,
    exactKeysCompared: targetedImpactReport.exactKeysCompared,
    predicted: targetedImpactReport.predicted,
    packageManifest: targetedImpactReport.packageManifest
  } : null,
  actualTargetedMaterialization: actualImpactReport ? {
    beforeCapturedAt: actualImpactReport.beforeCapturedAt,
    afterCapturedAt: actualImpactReport.afterCapturedAt,
    reportPath: `${reviewRelative}/postwrite-remote-impact.json`,
    invocationCounts: actualImpactReport.invocationCounts,
    remoteOutcome: actualImpactReport.remoteOutcome,
    package: actualImpactReport.package
  } : null,
  postwriteComparator: postComparatorReport ? {
    reportPath: `${reviewRelative}/postwrite-targeted-comparator.json`,
    exactKeysCompared: postComparatorReport.exactKeysCompared,
    predicted: postComparatorReport.predicted,
    changedFieldPaths: postComparatorReport.changedFieldPaths
  } : null,
  scopeAudit: scopeAuditReport ? {
    reportPath: `${reviewRelative}/scope-audit.json`,
    targetKeyCount: scopeAuditReport.targetKeyCount,
    governedSource: scopeAuditReport.governedSource,
    parity: scopeAuditReport.parity,
    remote: scopeAuditReport.remote
  } : null,
  invariants: {
    friendsMarkdownJsonParity: "60/60",
    friendsBodyHashParity: "60/60",
    youBaselineCheckedBeforeImport: "60/60",
    otherV15YouBodiesRequiredUnchanged: 58,
    scope: "exact 60 hard-angle natal angle keys only",
    nonTargetSourceRowsSha256Before: nonTargetSignature(originSource, requiredKeys),
    nonTargetSourceRowsSha256After: nonTargetSignature(source, requiredKeys),
    nonTargetSourceRowsChanged: nonTargetSignature(originSource, requiredKeys) === nonTargetSignature(source, requiredKeys) ? 0 : 1
  }
};

if (!apply) {
  console.log(JSON.stringify({
    mode: "verify-only",
    friendsRows: records.length,
    friendsMarkdownJsonParity: "60/60",
    youRevisions: revisionRecords.length,
    sourceWouldChange: true
  }, null, 2));
  process.exit(0);
}

fs.mkdirSync(path.join(reviewRoot, "records"), { recursive: true });
fs.mkdirSync(path.join(reviewRoot, "you-supersessions"), { recursive: true });
for (const name of copiedAuthorityNames) {
  if (path.resolve(authorityPath(name)) !== path.resolve(reviewPath(name))) {
    fs.copyFileSync(authorityPath(name), reviewPath(name));
  }
}
for (const { recordPath, record } of recordWrites) writeJson(recordPath, record);
writeJson(reviewPath("friends-v1-payloads.json"), payloadArtifact);
if (impactReport) writeJson(reviewPath("prewrite-remote-impact.json"), impactReport);
if (targetedImpactReport) writeJson(reviewPath("targeted-materializer-impact.json"), targetedImpactReport);
if (actualImpactReport) writeJson(reviewPath("postwrite-remote-impact.json"), actualImpactReport);
if (postComparatorReport) writeJson(reviewPath("postwrite-targeted-comparator.json"), postComparatorReport);
if (scopeAuditReport) writeJson(reviewPath("scope-audit.json"), scopeAuditReport);
writeJson(reviewPath("shipping-manifest.json"), shippingManifest);
writeJson(sourceRowsPath, source, 1);

for (const name of [friendsMarkdownName, friendsJsonName, youRevisionsName]) {
  verifyFile(reviewPath(name), sha256(fs.readFileSync(authorityPath(name))), `${name} copied authority`);
}
console.log(JSON.stringify({
  mode: "applied",
  friendsRows: records.length,
  friendsMarkdownJsonParity: "60/60",
  youRevisions: revisionRecords.length,
  friendsRecords: recordWrites.length - revisionRecords.length,
  reviewRoot: reviewRelative,
  sourceRowsPath: sourceRowsRelative
}, null, 2));
