#!/usr/bin/env node
// Apply owner exact-wording approval records to the LL matrix.
//
// Reads every `owner-exact-wording-approval` record in
// packages/astro-knowledge/review/, verifies the recorded copy still matches
// the matrix byte for byte via its payload hash, then flips the row to
// ownerApproved with the governance the record specifies.
//
// Refuses to act if the copy has changed since approval, because the owner
// approved exact wording and not a key. Idempotent. Dry run by default.

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const MATRIX = path.join(
  REPO,
  "packages/astro-knowledge/voice/tldr-astro/satori-writer/ll-matrix-v13/ll-matrix-v13.json"
);
const REVIEW = path.join(REPO, "packages/astro-knowledge/review");

const write = process.argv.includes("--write");
const matrix = JSON.parse(fs.readFileSync(MATRIX, "utf8"));

const records = fs
  .readdirSync(REVIEW)
  .filter((f) => f.endsWith(".json"))
  .map((f) => {
    try {
      const value = JSON.parse(fs.readFileSync(path.join(REVIEW, f), "utf8"));
      return value?.record === "owner-exact-wording-approval" ? { file: f, value } : null;
    } catch {
      return null;
    }
  })
  .filter(Boolean);

const results = { applied: [], alreadyApproved: [], copyDrift: [], keyMissing: [] };

for (const { file, value } of records) {
  const row = matrix.rows.find(
    (r) => String(r.key ?? "").toLowerCase() === String(value.key ?? "").toLowerCase()
  );
  if (!row) { results.keyMissing.push([file, value.key]); continue; }

  const hash = crypto.createHash("sha256").update(row.copy ?? "").digest("hex");
  if (hash !== value.payloadSha256) { results.copyDrift.push([file, value.key]); continue; }
  if (row.ownerApproved === true && row.governance === value.newGovernance) {
    results.alreadyApproved.push([file, value.key]); continue;
  }

  row.ownerApproved = true;
  row.governance = value.newGovernance;
  row.approvalRecord = `packages/astro-knowledge/review/${file}`;
  row.approvedAt = value.approvedAt;
  results.applied.push([file, value.key]);
}

for (const [name, list] of Object.entries(results)) {
  console.log(`${name}: ${list.length}`);
  for (const [file, key] of list) console.log(`   ${key}  (${file})`);
}

if (results.copyDrift.length) {
  console.error("\nREFUSED: copy changed since approval. The owner approved exact wording, not a key.");
  process.exit(1);
}

if (write && results.applied.length) {
  fs.writeFileSync(MATRIX, `${JSON.stringify(matrix, null, 1)}\n`);
  console.log(`\nwrote ${MATRIX}`);
} else {
  console.log("\ndry run; pass --write to apply");
}
