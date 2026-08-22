#!/usr/bin/env node

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const args = Object.fromEntries(process.argv.slice(2).map((entry) => {
  const [key, ...value] = entry.replace(/^--/, "").split("=");
  return [key, value.join("=") || "true"];
}));
const expectedByReviewState = {
  "legacy-natal-aspect-decommissioned": 234,
  "retired-promoted-emergency-floor": 240,
  "legacy-dashboard-source-disabled": 55
};
const expectedTotal = Object.values(expectedByReviewState).reduce((sum, count) => sum + count, 0);
const deleteRequested = args.delete === "true";
const backupPath = args.export ? path.resolve(String(args.export)) : "";

function unquote(value) {
  const trimmed = value.trim();
  if ((trimmed.startsWith('"') && trimmed.endsWith('"')) || (trimmed.startsWith("'") && trimmed.endsWith("'"))) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

function loadEnv(filePath) {
  if (!filePath || !fs.existsSync(filePath)) return;
  for (const line of fs.readFileSync(filePath, "utf8").split(/\r?\n/u)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const separator = trimmed.indexOf("=");
    if (separator <= 0) continue;
    const key = trimmed.slice(0, separator).trim();
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/u.test(key) || process.env[key]) continue;
    process.env[key] = unquote(trimmed.slice(separator + 1));
  }
}

loadEnv(args.env ? path.resolve(String(args.env)) : path.join(repoRoot, "apps/web/.env.local"));
loadEnv(path.join(repoRoot, ".env.local"));

const baseUrl = String(process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL ?? "").replace(/\/$/u, "");
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
if (!baseUrl || !serviceKey) {
  throw new Error("Supabase URL and SUPABASE_SERVICE_ROLE_KEY are required. Pass --env=<path> when using an isolated worktree.");
}

function headers(extra = {}) {
  return {
    apikey: serviceKey,
    authorization: `Bearer ${serviceKey}`,
    "content-type": "application/json",
    ...extra
  };
}

async function requestRows(query, init = {}) {
  const response = await fetch(`${baseUrl}/rest/v1/generated_interpretations?${query}`, {
    ...init,
    headers: headers(init.headers)
  });
  const payload = await response.json().catch(async () => ({ error: await response.text().catch(() => "") }));
  if (!response.ok) {
    throw new Error(`Supabase request failed (${response.status}): ${JSON.stringify(payload)}`);
  }
  return Array.isArray(payload) ? payload : [];
}

async function fetchCertifiedRows() {
  const rows = [];
  const limit = 500;
  for (let offset = 0; ; offset += limit) {
    const query = new URLSearchParams({
      select: "*",
      review_state: `in.(${Object.keys(expectedByReviewState).join(",")})`,
      order: "review_state.asc,id.asc",
      limit: String(limit),
      offset: String(offset)
    });
    const page = await requestRows(query);
    rows.push(...page);
    if (page.length < limit) return rows;
  }
}

function countByReviewState(rows) {
  return rows.reduce((counts, row) => {
    const key = String(row.review_state ?? "none");
    counts[key] = (counts[key] ?? 0) + 1;
    return counts;
  }, {});
}

function assertCertifiedSet(rows) {
  const counts = countByReviewState(rows);
  const countsMatch = Object.entries(expectedByReviewState).every(([state, count]) => counts[state] === count)
    && Object.keys(counts).every((state) => state in expectedByReviewState);
  if (rows.length !== expectedTotal || !countsMatch) {
    throw new Error(`Certified legacy set changed; refusing to continue. Expected ${JSON.stringify(expectedByReviewState)}, received ${JSON.stringify(counts)} (${rows.length} total).`);
  }
  const ids = new Set(rows.map((row) => row.id));
  if (ids.size !== expectedTotal || rows.some((row) => !row.id)) {
    throw new Error("Certified legacy set contains missing or duplicate IDs; refusing to continue.");
  }
}

function writeAndVerifyBackup(rows) {
  if (!backupPath) throw new Error("Pass --export=<absolute-or-relative-json-path> before deletion.");
  const rowsJson = JSON.stringify(rows);
  const payload = {
    schema: "tldrastro-certified-legacy-admin-content-backup-v1",
    exportedAt: new Date().toISOString(),
    table: "generated_interpretations",
    expectedByReviewState,
    rowCount: rows.length,
    rowsSha256: crypto.createHash("sha256").update(rowsJson).digest("hex"),
    rows
  };
  fs.mkdirSync(path.dirname(backupPath), { recursive: true });
  fs.writeFileSync(backupPath, `${JSON.stringify(payload, null, 2)}\n`, { flag: "wx", mode: 0o600 });
  const verified = JSON.parse(fs.readFileSync(backupPath, "utf8"));
  const verifiedHash = crypto.createHash("sha256").update(JSON.stringify(verified.rows)).digest("hex");
  if (verified.rowCount !== expectedTotal || verifiedHash !== verified.rowsSha256) {
    throw new Error("Backup verification failed; no rows were deleted.");
  }
  return { path: backupPath, sha256: verifiedHash };
}

async function deleteByIds(rows) {
  const deleted = [];
  for (let index = 0; index < rows.length; index += 50) {
    const ids = rows.slice(index, index + 50).map((row) => row.id);
    const query = new URLSearchParams({ id: `in.(${ids.join(",")})`, select: "id,review_state" });
    const batch = await requestRows(query, {
      method: "DELETE",
      headers: { prefer: "return=representation" }
    });
    deleted.push(...batch);
  }
  return deleted;
}

const rows = await fetchCertifiedRows();
if (args["verify-empty"] === "true") {
  if (rows.length !== 0) {
    throw new Error(`Expected the certified legacy set to be empty; ${rows.length} rows remain.`);
  }
  console.log(JSON.stringify({ mode: "verify-empty", remainingCertifiedRows: 0 }, null, 2));
  process.exit(0);
}
assertCertifiedSet(rows);

if (!deleteRequested) {
  console.log(JSON.stringify({
    mode: "dry-run",
    rowCount: rows.length,
    counts: countByReviewState(rows),
    sampleIds: rows.slice(0, 10).map((row) => row.id),
    next: "Run with --delete --confirm=DELETE-529-CERTIFIED-LEGACY-ROWS --export=<new-json-path>."
  }, null, 2));
  process.exit(0);
}

if (args.confirm !== "DELETE-529-CERTIFIED-LEGACY-ROWS") {
  throw new Error("Deletion requires --confirm=DELETE-529-CERTIFIED-LEGACY-ROWS.");
}

const backup = writeAndVerifyBackup(rows);
const deleted = await deleteByIds(rows);
assertCertifiedSet(deleted);
const remaining = await fetchCertifiedRows();
if (remaining.length !== 0) {
  throw new Error(`Deletion verification failed: ${remaining.length} certified legacy rows remain. Backup: ${backup.path}`);
}

console.log(JSON.stringify({
  mode: "deleted",
  deletedCount: deleted.length,
  deletedByReviewState: countByReviewState(deleted),
  remainingCertifiedRows: remaining.length,
  backup
}, null, 2));
