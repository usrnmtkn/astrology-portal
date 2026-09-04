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
const reviewRelative = "packages/astro-knowledge/review/sky-calendar-exact-approved-2026-09-03";
const reviewRoot = path.join(repoRoot, reviewRelative);
const rulingPath = path.join(reviewRoot, "owner-ruling.json");
const evidenceRelative = `${reviewRelative}/owner-batch-authorization.json`;
const evidencePath = path.join(repoRoot, evidenceRelative);
const recordsRoot = path.join(reviewRoot, "records");
const manifestPath = path.join(reviewRoot, "shipping-manifest.json");
const currentPayloadPath = path.join(reviewRoot, "current-owner-payloads.json");
const historicalPayloadRelative = "packages/astro-knowledge/review/sky-calendar-owner-rewrites-2026-08-20/sky-calendar-owner-rewrites-payloads.json";
const historicalPayloadPath = path.join(repoRoot, historicalPayloadRelative);
const transitRoot = path.join(repoRoot, "packages/astro-knowledge/data/transits");
const sha256 = (value) => crypto.createHash("sha256").update(value).digest("hex");
const protectedKeys = new Set([
  "sky.aspect.sun.opposition.moon",
  "sky.aspect.saturn.opposition.pluto",
]);

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function assertNonEmpty(value, label) {
  if (typeof value !== "string" || !value.trim()) throw new Error(`${label} must be a non-empty string.`);
}

const ruling = readJson(rulingPath);
if (ruling.type !== "bounded_contextual_owner_batch_authorization") throw new Error("Unexpected authorization type.");
if (ruling.authority !== "owner" || ruling.decision !== "approve") throw new Error("Release requires an owner approve decision.");
if (ruling.batchId !== "sky-calendar-exact-approved-through-2026-09-03") throw new Error("Unexpected batchId.");
if (ruling.surface !== "sky-calendar-exact-aspect") throw new Error("Unexpected surface.");
if (ruling.approvedField !== "readerCopy.body") throw new Error("Unexpected approved field.");
if (ruling.evidenceRecordPath !== evidenceRelative) throw new Error("Evidence path mismatch.");
if (!Array.isArray(ruling.capabilities) || !ruling.capabilities.includes("batch_generation") || !ruling.capabilities.includes("serving")) {
  throw new Error("Batch must explicitly authorize batch generation and serving.");
}
if (!Array.isArray(ruling.payloadFiles) || ruling.payloadFiles.length !== 9) throw new Error("Expected nine family payload files.");
assertNonEmpty(ruling.ownerStatement, "ownerStatement");

const rows = [];
for (const payloadFile of ruling.payloadFiles) {
  if (!/^[a-z]+\.json$/u.test(payloadFile)) throw new Error(`Unsafe payload file name: ${payloadFile}`);
  const payload = readJson(path.join(reviewRoot, payloadFile));
  if (`${payload.family}.json` !== payloadFile) throw new Error(`${payloadFile}: family mismatch.`);
  if (!Array.isArray(payload.rows) || payload.rows.length === 0) throw new Error(`${payloadFile}: missing rows.`);
  for (const row of payload.rows) {
    assertNonEmpty(row.contentKey, `${payloadFile} contentKey`);
    assertNonEmpty(row.summary, `${row.contentKey} summary`);
    assertNonEmpty(row.body, `${row.contentKey} body`);
    if (!row.body.startsWith(row.summary)) throw new Error(`${row.contentKey}: summary is not the approved opening sentence.`);
    const calculated = sha256(row.body);
    if (calculated !== row.bodySha256) throw new Error(`${row.contentKey}: approved body SHA-256 mismatch.`);
    if (protectedKeys.has(row.contentKey)) throw new Error(`${row.contentKey}: protected benchmark cannot enter this release batch.`);
    rows.push(row);
  }
}
rows.sort((a, b) => a.contentKey.localeCompare(b.contentKey));
const seen = new Set();
for (const row of rows) {
  if (seen.has(row.contentKey)) throw new Error(`${row.contentKey}: duplicate approved member.`);
  seen.add(row.contentKey);
}
if (rows.length !== ruling.memberCount || rows.length !== 132) {
  throw new Error(`Expected 132 exact approved rows; found ${rows.length}.`);
}
const canonical = rows.map((row) => `${row.contentKey}:${row.bodySha256}`).join("\n");
if (sha256(canonical) !== ruling.memberSetSha256) throw new Error("Approved member-set SHA-256 mismatch.");

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
fs.writeFileSync(evidencePath, `${JSON.stringify(authorization, null, 2)}\n`);
fs.mkdirSync(recordsRoot, { recursive: true });

const manifestRows = [];
for (const row of rows) {
  const parts = row.contentKey.split(".");
  if (parts.length !== 5 || parts[0] !== "sky" || parts[1] !== "aspect") {
    throw new Error(`${row.contentKey}: unsupported exact-aspect key.`);
  }
  const [, , transiting, aspect, other] = parts;
  const id = `${transiting}-${aspect}-${other}`;
  const transitPath = path.join(transitRoot, `${id}.json`);
  if (!fs.existsSync(transitPath)) throw new Error(`${row.contentKey}: missing ${path.relative(repoRoot, transitPath)}.`);

  const approvalState = applyBoundedOwnerBatchAuthorization(markPipelineReady(generatedApprovalState()), {
    authorization,
    contentKey: row.contentKey,
    field: ruling.approvedField,
    payloadSha256: row.bodySha256,
    surface: ruling.surface,
  });
  assertBatchGenerationAuthorized(approvalState);
  assertServingAuthorized(approvalState);

  const transit = readJson(transitPath);
  const expectedKey = `sky.aspect.${transit.transiting}.${transit.aspect}.${transit.other}`;
  if (expectedKey !== row.contentKey) throw new Error(`${row.contentKey}: transit identity mismatch in ${transit.id}.`);
  if (transit.status !== "LIVE") throw new Error(`${row.contentKey}: expected LIVE transit status.`);

  const previous = {
    summary: transit.readerCopy?.summary ?? null,
    body: transit.readerCopy?.body ?? null,
    approvedVia: transit.readerCopy?.approvedVia ?? null,
  };
  transit.readerCopy = {
    ...(transit.readerCopy ?? {}),
    summary: row.summary,
    body: row.body,
    approvedVia: `bounded owner-approved exact Calendar batch ${ruling.batchId}; ${evidenceRelative}`,
  };
  fs.writeFileSync(transitPath, `${JSON.stringify(transit, null, 2)}\n`);

  const recordRelative = `${reviewRelative}/records/${id}-exact-approval.json`;
  const record = {
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
  };
  fs.writeFileSync(path.join(repoRoot, recordRelative), `${JSON.stringify(record, null, 2)}\n`);

  manifestRows.push({
    contentKey: row.contentKey,
    sourceFile: path.relative(repoRoot, transitPath),
    recordPath: recordRelative,
    bodySha256: row.bodySha256,
    previousReaderCopySha256: sha256(JSON.stringify(previous)),
  });
}

fs.writeFileSync(manifestPath, `${JSON.stringify({
  schemaVersion: 2,
  name: "Sky Calendar exact owner-approved release through 2026-09-03",
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

const historical = readJson(historicalPayloadPath);
if (historical.rowCount !== 215 || Object.keys(historical.payloads ?? {}).length !== 215) {
  throw new Error("Historical exact owner baseline no longer contains 215 rows.");
}
const currentPayloads = JSON.parse(JSON.stringify(historical.payloads));
for (const row of rows) {
  const legacyKey = row.contentKey.replace(/^sky\.aspect\./u, "sky.");
  const payload = { summary: row.summary, body: row.body };
  currentPayloads[legacyKey] = { sha256: sha256(JSON.stringify(payload)), payload };
}
if (Object.keys(currentPayloads).length !== 215) throw new Error("Current exact owner payload projection must contain 215 rows.");
const currentSetHashInput = Object.entries(currentPayloads)
  .sort(([a], [b]) => a.localeCompare(b))
  .map(([contentKey, entry]) => ({ contentKey, payloadSha256: entry.sha256 }));
const currentPayloadSetSha256 = sha256(JSON.stringify(currentSetHashInput));
fs.writeFileSync(currentPayloadPath, `${JSON.stringify({
  schemaVersion: 2,
  name: "Current owner-approved Sky Calendar exact aspect payloads",
  rowCount: 215,
  approvedOverlayCount: rows.length,
  protectedBaselineCount: protectedKeys.size,
  historicalBaselinePath: historicalPayloadRelative,
  overlayBatchId: ruling.batchId,
  overlayEvidenceRecordPath: evidenceRelative,
  payloadSetSha256: currentPayloadSetSha256,
  payloads: currentPayloads,
}, null, 2)}\n`);

console.log(`Released ${manifestRows.length}/132 hash-bound owner-approved exact Calendar aspect rows; projected 215 current exact owner payloads.`);
