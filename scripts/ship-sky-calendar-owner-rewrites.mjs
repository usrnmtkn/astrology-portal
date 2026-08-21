#!/usr/bin/env node
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const reviewRelative = "packages/astro-knowledge/review/sky-calendar-owner-rewrites-2026-08-20";
const reviewRoot = path.join(repoRoot, reviewRelative);
const payloadPath = path.join(reviewRoot, "sky-calendar-owner-rewrites-payloads.json");
const recordRoot = path.join(reviewRoot, "records");
const manifestPath = path.join(reviewRoot, "shipping-manifest.json");
const transitRoot = path.join(repoRoot, "packages/astro-knowledge/data/transits");
const approvalSource = `${reviewRelative}/OWNER-APPROVAL.md`;
const approvalLabel = `owner-approved Sky Calendar rewrite set, 2026-08-21 batch approval; ${approvalSource}`;
const sha256 = (value) => crypto.createHash("sha256").update(value).digest("hex");

const source = JSON.parse(fs.readFileSync(payloadPath, "utf8"));
if (source.rowCount !== 215 || Object.keys(source.payloads ?? {}).length !== 215) {
  throw new Error(`Expected 215 approved payloads; found ${Object.keys(source.payloads ?? {}).length}.`);
}
if (source.mergeAuthorized !== false) {
  throw new Error("This preparation step expects mergeAuthorized=false until the owner names PR #276 for merge.");
}
const payloadSetInput = Object.entries(source.payloads)
  .sort(([a], [b]) => a.localeCompare(b))
  .map(([contentKey, entry]) => ({ contentKey, payloadSha256: entry.sha256 }));
if (sha256(JSON.stringify(payloadSetInput)) !== source.payloadSetSha256) {
  throw new Error("Approved payload-set hash mismatch.");
}

fs.mkdirSync(recordRoot, { recursive: true });
const manifest = [];

for (const [contentKey, entry] of Object.entries(source.payloads)) {
  const parts = contentKey.split(".");
  if (parts.length !== 4 || parts[0] !== "sky") throw new Error(`${contentKey}: unsupported key.`);
  const id = parts.slice(1).join("-");
  const transitPath = path.join(transitRoot, `${id}.json`);
  if (!fs.existsSync(transitPath)) throw new Error(`${contentKey}: missing ${path.relative(repoRoot, transitPath)}.`);

  const calculatedHash = sha256(JSON.stringify(entry.payload));
  if (calculatedHash !== entry.sha256) throw new Error(`${contentKey}: payload hash mismatch.`);
  const transit = JSON.parse(fs.readFileSync(transitPath, "utf8"));
  if (`sky.${transit.transiting}.${transit.aspect}.${transit.other}` !== contentKey) {
    throw new Error(`${contentKey}: transit identity mismatch in ${transit.id}.`);
  }
  if (transit.status !== "LIVE") throw new Error(`${contentKey}: expected LIVE status.`);

  const previousPayload = {
    summary: transit.readerCopy?.summary ?? null,
    body: transit.readerCopy?.body ?? null,
  };
  transit.readerCopy = {
    summary: entry.payload.summary,
    body: entry.payload.body,
    approvedVia: approvalLabel,
  };
  fs.writeFileSync(transitPath, `${JSON.stringify(transit, null, 2)}\n`);

  const recordFile = `${id}-exact-approval.json`;
  const recordRelative = `${reviewRelative}/records/${recordFile}`;
  const record = {
    schemaVersion: 1,
    contentKey,
    surface: "sky-calendar-exact-aspect",
    approvalLevel: "exact_owner_approved",
    authorship: "owner_authored",
    approvedAt: source.approvedAt,
    ownerApprovalStatementSource: approvalSource,
    sourceWorkbook: source.sourceWorkbook,
    sourceWorkbookSha256: source.sourceWorkbookSha256,
    payloadSha256: entry.sha256,
    payload: entry.payload,
    writerArtifact: null,
    judgeArtifact: null,
  };
  fs.writeFileSync(path.join(recordRoot, recordFile), `${JSON.stringify(record, null, 2)}\n`);
  manifest.push({
    contentKey,
    sourceFile: path.relative(repoRoot, transitPath),
    recordPath: recordRelative,
    payloadSha256: entry.sha256,
    previousPayloadSha256: sha256(JSON.stringify(previousPayload)),
  });
}

manifest.sort((a, b) => a.contentKey.localeCompare(b.contentKey));
fs.writeFileSync(manifestPath, `${JSON.stringify({
  schemaVersion: 1,
  name: source.name,
  approvedAt: source.approvedAt,
  sourceWorkbook: source.sourceWorkbook,
  sourceWorkbookSha256: source.sourceWorkbookSha256,
  payloadSetSha256: source.payloadSetSha256,
  approvalSource,
  rowCount: manifest.length,
  rows: manifest,
}, null, 2)}\n`);

console.log(`Shipped ${manifest.length}/215 owner-approved Sky Calendar exact-aspect rows.`);
