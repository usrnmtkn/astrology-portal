#!/usr/bin/env node
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  applyBoundedOwnerBatchAuthorization,
  assertBatchGenerationAuthorized,
  assertServingAuthorized,
  generatedApprovalState,
  markPipelineReady,
} from "../src/astro-writing/approvalGovernance.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const reviewRelative = "packages/astro-knowledge/review/sky-calendar-exact-approved-2026-09-04-batch-51";
const reviewRoot = path.join(repoRoot, reviewRelative);
const ruling = JSON.parse(fs.readFileSync(path.join(reviewRoot, "owner-ruling.json"), "utf8"));
const evidenceRelative = `${reviewRelative}/owner-batch-authorization.json`;
const transitRoot = path.join(repoRoot, "packages/astro-knowledge/data/transits");
const previousPayloadRelative = "packages/astro-knowledge/review/sky-calendar-exact-approved-2026-09-04-batch-30/current-owner-payloads.json";
const sha256 = (value) => crypto.createHash("sha256").update(value).digest("hex");
const protectedKeys = new Set(["sky.aspect.sun.opposition.moon", "sky.aspect.saturn.opposition.pluto"]);

if (ruling.type !== "bounded_contextual_owner_batch_authorization" || ruling.authority !== "owner" || ruling.decision !== "approve") {
  throw new Error("Release requires bounded owner approval.");
}
if (ruling.batchId !== "sky-calendar-exact-approved-2026-09-04-batch-51") throw new Error("Unexpected batch.");
if (ruling.surface !== "sky-calendar-exact-aspect" || ruling.approvedField !== "readerCopy.body") throw new Error("Unexpected release surface.");
if (!ruling.capabilities?.includes("batch_generation") || !ruling.capabilities?.includes("serving")) throw new Error("Serving authorization missing.");
if (ruling.evidenceRecordPath !== evidenceRelative) throw new Error("Evidence path mismatch.");

const rows = ruling.payloadFiles.flatMap((file) => {
  const payload = JSON.parse(fs.readFileSync(path.join(reviewRoot, file), "utf8"));
  const familyFileMatches = file === `${payload.family}.json` || file.startsWith(`${payload.family}-`);
  if (!familyFileMatches || payload.rowCount !== payload.rows?.length) throw new Error(`${file}: invalid payload.`);
  return payload.rows;
}).sort((a, b) => a.contentKey.localeCompare(b.contentKey));

if (rows.length !== 51 || ruling.memberCount !== 51 || new Set(rows.map((r) => r.contentKey)).size !== 51) {
  throw new Error("Expected exactly 51 unique approved rows.");
}
for (const row of rows) {
  if (!row.body?.startsWith(row.summary ?? "")) throw new Error(`${row.contentKey}: summary/body mismatch.`);
  if (sha256(row.body) !== row.bodySha256) throw new Error(`${row.contentKey}: body hash mismatch.`);
  if (protectedKeys.has(row.contentKey)) throw new Error(`${row.contentKey}: protected benchmark cannot be released here.`);
}
const canonical = rows.map((row) => `${row.contentKey}:${row.bodySha256}`).join("\n");
if (sha256(canonical) !== ruling.memberSetSha256) throw new Error("Member-set hash mismatch.");

const authorization = {
  type: ruling.type,
  authority: ruling.authority,
  decision: ruling.decision,
  batchId: ruling.batchId,
  evidenceRecordPath: ruling.evidenceRecordPath,
  ownerStatement: ruling.ownerStatement,
  surface: ruling.surface,
  approvedField: ruling.approvedField,
  capabilities: ruling.capabilities,
  approvedAt: ruling.approvedAt,
  memberCount: rows.length,
  memberSetSha256: ruling.memberSetSha256,
  members: rows.map((row) => ({ contentKey: row.contentKey, payloadSha256: row.bodySha256 })),
};
fs.writeFileSync(path.join(reviewRoot, "owner-batch-authorization.json"), `${JSON.stringify(authorization, null, 2)}\n`);
fs.mkdirSync(path.join(reviewRoot, "records"), { recursive: true });

const manifestRows = [];
for (const row of rows) {
  const parts = row.contentKey.split(".");
  if (parts.length !== 5 || parts[0] !== "sky" || parts[1] !== "aspect") throw new Error(`${row.contentKey}: malformed key.`);
  const [, , transiting, aspect, other] = parts;
  const id = `${transiting}-${aspect}-${other}`;
  const transitPath = path.join(transitRoot, `${id}.json`);
  if (!fs.existsSync(transitPath)) throw new Error(`${row.contentKey}: missing transit source.`);

  const approvalState = applyBoundedOwnerBatchAuthorization(markPipelineReady(generatedApprovalState()), {
    authorization,
    contentKey: row.contentKey,
    field: ruling.approvedField,
    payloadSha256: row.bodySha256,
    surface: ruling.surface,
  });
  assertBatchGenerationAuthorized(approvalState);
  assertServingAuthorized(approvalState);

  const transit = JSON.parse(fs.readFileSync(transitPath, "utf8"));
  if (`sky.aspect.${transit.transiting}.${transit.aspect}.${transit.other}` !== row.contentKey || transit.status !== "LIVE") {
    throw new Error(`${row.contentKey}: transit identity/status mismatch.`);
  }
  const previous = { summary: transit.readerCopy?.summary ?? null, body: transit.readerCopy?.body ?? null, approvedVia: transit.readerCopy?.approvedVia ?? null };
  transit.readerCopy = {
    ...(transit.readerCopy ?? {}),
    summary: row.summary,
    body: row.body,
    approvedVia: `bounded owner-approved exact Calendar batch ${ruling.batchId}; ${evidenceRelative}`,
  };
  fs.writeFileSync(transitPath, `${JSON.stringify(transit, null, 2)}\n`);

  const recordRelative = `${reviewRelative}/records/${id}-exact-approval.json`;
  fs.writeFileSync(path.join(repoRoot, recordRelative), `${JSON.stringify({
    schemaVersion: 2,
    contentKey: row.contentKey,
    surface: ruling.surface,
    approvedField: ruling.approvedField,
    approvalLevel: "exact_owner_approved",
    authority: "owner",
    decision: "approve",
    approvedAt: ruling.approvedAt,
    ownerStatement: ruling.ownerStatement,
    batchId: ruling.batchId,
    evidenceRecordPath: evidenceRelative,
    capabilities: ruling.capabilities,
    bodySha256: row.bodySha256,
    summary: row.summary,
    body: row.body,
  }, null, 2)}\n`);
  manifestRows.push({
    contentKey: row.contentKey,
    sourceFile: path.relative(repoRoot, transitPath),
    recordPath: recordRelative,
    bodySha256: row.bodySha256,
    previousReaderCopySha256: sha256(JSON.stringify(previous)),
  });
}

fs.writeFileSync(path.join(reviewRoot, "shipping-manifest.json"), `${JSON.stringify({
  schemaVersion: 2,
  name: "Sky Calendar exact owner-approved release, 2026-09-04 batch 51",
  batchId: ruling.batchId,
  approvedAt: ruling.approvedAt,
  ownerStatement: ruling.ownerStatement,
  surface: ruling.surface,
  approvedField: ruling.approvedField,
  capabilities: ruling.capabilities,
  memberSetSha256: ruling.memberSetSha256,
  evidenceRecordPath: evidenceRelative,
  rowCount: manifestRows.length,
  protectedUntouched: [...protectedKeys].sort(),
  rows: manifestRows,
}, null, 2)}\n`);

const previousProjection = JSON.parse(fs.readFileSync(path.join(repoRoot, previousPayloadRelative), "utf8"));
if (previousProjection.rowCount !== 215 || Object.keys(previousProjection.payloads ?? {}).length !== 215) {
  throw new Error("Previous owner payload projection must contain 215 rows.");
}
const currentPayloads = JSON.parse(JSON.stringify(previousProjection.payloads));
for (const row of rows) {
  const legacyKey = row.contentKey.replace(/^sky\.aspect\./u, "sky.");
  const payload = { summary: row.summary, body: row.body };
  currentPayloads[legacyKey] = { sha256: sha256(JSON.stringify(payload)), payload };
}
const payloadSetSha256 = sha256(JSON.stringify(Object.entries(currentPayloads).sort(([a], [b]) => a.localeCompare(b)).map(([contentKey, entry]) => ({ contentKey, payloadSha256: entry.sha256 }))));
fs.writeFileSync(path.join(reviewRoot, "current-owner-payloads.json"), `${JSON.stringify({
  schemaVersion: 2,
  name: "Current owner-approved Sky Calendar exact aspect payloads after 2026-09-04 batch 51",
  rowCount: 215,
  approvedOverlayCount: 51,
  protectedBaselineCount: protectedKeys.size,
  previousProjectionPath: previousPayloadRelative,
  overlayBatchId: ruling.batchId,
  overlayEvidenceRecordPath: evidenceRelative,
  payloadSetSha256,
  payloads: currentPayloads,
}, null, 2)}\n`);

console.log("Released 51 hash-bound owner-approved exact Calendar aspect rows.");
