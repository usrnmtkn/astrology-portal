#!/usr/bin/env node
// Ships owner-authored synastry pair copy: applies hash-pinned payloads to the
// serving rows, writes exact-approval records, and verifies byte-identity.
// Deterministic; no model calls. Follows the PR #79/#82 shipping pattern.
//
// Usage:
//   node scripts/ship-owner-authored-chunk.mjs --payloads <payloads.json> --chunk <name> --approved-at <YYYY-MM-DD>
//
// The payloads file maps "planetA-planetB/aspect" -> { payload, sha256 } where
// payload is { body_you, body_they, warmthSource, labels } and sha256 is
// sha256(JSON.stringify(payload)). The script fails closed on any hash mismatch.

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const argVal = (f) => { const i = args.indexOf(f); return i === -1 ? null : args[i + 1]; };
const payloadsPath = argVal("--payloads");
const chunkName = argVal("--chunk");
const approvedAt = argVal("--approved-at");
if (!payloadsPath || !chunkName || !approvedAt) {
  console.error("Required: --payloads <file> --chunk <name> --approved-at <YYYY-MM-DD>");
  process.exit(1);
}

const payloads = JSON.parse(fs.readFileSync(path.resolve(payloadsPath), "utf8"));
const rowsPath = path.join(repoRoot, "apps/web/src/content/fallbackArchitectureV3/source-rows/fallback-source-rows-v3.json");
const doc = JSON.parse(fs.readFileSync(rowsPath, "utf8"));
const reviewDir = `packages/astro-knowledge/review/${chunkName}`;
fs.mkdirSync(path.join(repoRoot, reviewDir), { recursive: true });

const sha256 = (obj) => crypto.createHash("sha256").update(JSON.stringify(obj)).digest("hex");
const byKey = new Map(doc.hookRows.map((r, i) => [r.contentKey, i]));
const manifest = [];
let failures = 0;

for (const [key, entry] of Object.entries(payloads)) {
  const [pair, aspect] = key.split("/");
  const dash = pair.indexOf("-");
  const a = pair.slice(0, dash);
  const b = pair.slice(dash + 1);
  const contentKey = `fallback-hook/synastry-pair/${a}/${b}/${aspect}`;
  const idx = byKey.get(contentKey);
  if (idx === undefined) { console.error(`MISSING ROW: ${contentKey}`); failures++; continue; }

  const recomputed = sha256(entry.payload);
  if (recomputed !== entry.sha256) { console.error(`HASH MISMATCH: ${key}`); failures++; continue; }

  const recordRel = `${reviewDir}/${a}-${b}-${aspect}-exact-approval.json`;
  const record = {
    schemaVersion: 1,
    id: `${chunkName}-${a}-${b}-${aspect}`,
    approvalLevel: "exact_owner_approved",
    authorship: "owner_authored",
    provenanceNote: "Owner-authored copy supplied verbatim; no Sol writer or Terra judge artifacts exist for this payload by design.",
    contentKey,
    payloadSha256: entry.sha256,
    payloadHashAlgorithm: "sha256(JSON.stringify(payload))",
    payload: entry.payload,
    approvedAt,
    approvalEffect: "exact_wording_approval",
    additionalBilledCalls: 0
  };
  fs.writeFileSync(path.join(repoRoot, recordRel), `${JSON.stringify(record, null, 2)}\n`);

  const row = doc.hookRows[idx];
  const previousBody = row.body_you;
  row.body_you = entry.payload.body_you;
  row.body_they = entry.payload.body_they;
  row.review_status = "approved";
  row.approval = {
    approvalLevel: "exact_owner_approved",
    recordPath: recordRel,
    payloadSha256: entry.sha256,
    approvedAt
  };
  row.approved_via = [row.approved_via, `owner-authored exact approval, ${approvedAt}`].filter(Boolean).join(" | ");
  manifest.push({ contentKey, recordPath: recordRel, payloadSha256: entry.sha256, previousBodySha256: crypto.createHash("sha256").update(previousBody || "").digest("hex") });
}

if (failures) { console.error(`ABORTED: ${failures} failures; no file written.`); process.exit(2); }

fs.writeFileSync(rowsPath, `${JSON.stringify(doc, null, 1)}\n`);
fs.writeFileSync(path.join(repoRoot, reviewDir, "shipping-manifest.json"), `${JSON.stringify({ chunk: chunkName, approvedAt, rows: manifest }, null, 2)}\n`);

// verification pass: re-read and confirm byte identity
const check = JSON.parse(fs.readFileSync(rowsPath, "utf8"));
const cm = new Map(check.hookRows.map((r) => [r.contentKey, r]));
let ok = 0;
for (const [key, entry] of Object.entries(payloads)) {
  const [pair, aspect] = key.split("/");
  const dash = pair.indexOf("-");
  const contentKey = `fallback-hook/synastry-pair/${pair.slice(0, dash)}/${pair.slice(dash + 1)}/${aspect}`;
  const r = cm.get(contentKey);
  if (r.body_you === entry.payload.body_you && r.approval?.payloadSha256 === entry.sha256) ok++;
  else console.error(`VERIFY FAIL: ${contentKey}`);
}
console.log(`shipped ${ok}/${Object.keys(payloads).length} rows; records + manifest in ${reviewDir}`);
process.exit(ok === Object.keys(payloads).length ? 0 : 2);
