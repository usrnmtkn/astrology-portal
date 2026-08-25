#!/usr/bin/env node

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const expectedKeys = Array.from({ length: 12 }, (_, index) => `sky.planetary.moon.house_${index + 1}`);
const args = Object.fromEntries(process.argv.slice(2).map((entry) => {
  const [key, ...value] = entry.replace(/^--/u, "").split("=");
  return [key, value.join("=") || "true"];
}));
const apply = args.apply === "true";
const backupPath = args.export ? path.resolve(String(args.export)) : "";

function unquote(value) {
  const trimmed = value.trim();
  return ((trimmed.startsWith("\"") && trimmed.endsWith("\""))
    || (trimmed.startsWith("'") && trimmed.endsWith("'")))
    ? trimmed.slice(1, -1)
    : trimmed;
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
  if (!response.ok) throw new Error(`Supabase request failed (${response.status}): ${JSON.stringify(payload)}`);
  return Array.isArray(payload) ? payload : [];
}

async function fetchTargets() {
  const query = new URLSearchParams({
    select: "*",
    content_key: `in.(${expectedKeys.join(",")})`,
    order: "content_key.asc,id.asc"
  });
  return requestRows(query);
}

function assertExactTargets(rows) {
  const keys = rows.map((row) => row.content_key).sort();
  const expected = [...expectedKeys].sort();
  if (rows.length !== expected.length || JSON.stringify(keys) !== JSON.stringify(expected)) {
    throw new Error(`Expected exactly the 12 signless Moon-house rows; found ${rows.length}: ${keys.join(", ") || "none"}.`);
  }
  if (new Set(rows.map((row) => row.id)).size !== expected.length || rows.some((row) => !row.id)) {
    throw new Error("Target set contains missing or duplicate IDs; refusing to delete.");
  }
}

function verifySignSpecificRuntimeCoverage() {
  const runtimePath = path.join(repoRoot, "apps/web/src/content/fallbackArchitectureV3/bundled-sky-placement-house-rows-v3.json");
  const serialized = fs.readFileSync(runtimePath, "utf8");
  const matches = serialized.match(/house-horoscope-core\/moon\/[a-z-]+\/house-(?:1[0-2]|[1-9])(?=")/gu) ?? [];
  const keys = new Set(matches);
  if (keys.size < 144) {
    throw new Error(`Expected at least 144 sign-specific Moon-in-sign-in-house runtime keys; found ${keys.size}.`);
  }
  return keys.size;
}

function writeBackup(rows) {
  if (!backupPath) throw new Error("Pass --export=<new-json-path> before deletion.");
  const rowsJson = JSON.stringify(rows);
  const rowsSha256 = crypto.createHash("sha256").update(rowsJson).digest("hex");
  const payload = {
    schema: "tldrastro-signless-moon-house-backup-v1",
    exportedAt: new Date().toISOString(),
    table: "generated_interpretations",
    reason: "Moon reader horoscopes require planet, zodiac sign, and house; these keys omit the zodiac sign.",
    rowCount: rows.length,
    rowsSha256,
    rows
  };
  fs.mkdirSync(path.dirname(backupPath), { recursive: true });
  fs.writeFileSync(backupPath, `${JSON.stringify(payload, null, 2)}\n`, { flag: "wx", mode: 0o600 });
  const verified = JSON.parse(fs.readFileSync(backupPath, "utf8"));
  const verifiedHash = crypto.createHash("sha256").update(JSON.stringify(verified.rows)).digest("hex");
  if (verified.rowCount !== 12 || verifiedHash !== verified.rowsSha256) {
    throw new Error("Backup verification failed; no rows were deleted.");
  }
  return { path: backupPath, sha256: verifiedHash };
}

const runtimeMoonSignHouseKeys = verifySignSpecificRuntimeCoverage();
const rows = await fetchTargets();

if (args["verify-empty"] === "true") {
  if (rows.length !== 0) throw new Error(`${rows.length} signless Moon-house rows remain.`);
  console.log(JSON.stringify({ mode: "verify-empty", remainingRows: 0, runtimeMoonSignHouseKeys }, null, 2));
  process.exit(0);
}

assertExactTargets(rows);

if (!apply) {
  console.log(JSON.stringify({
    mode: "dry-run",
    matchedRows: rows.length,
    runtimeMoonSignHouseKeys,
    targets: rows.map((row) => ({ id: row.id, contentKey: row.content_key, status: row.status })),
    next: "Run with --apply --confirm=DELETE-12-SIGNLESS-MOON-HOUSE-ROWS --export=<new-json-path>."
  }, null, 2));
  process.exit(0);
}

if (args.confirm !== "DELETE-12-SIGNLESS-MOON-HOUSE-ROWS") {
  throw new Error("Deletion requires --confirm=DELETE-12-SIGNLESS-MOON-HOUSE-ROWS.");
}

const backup = writeBackup(rows);
const query = new URLSearchParams({
  id: `in.(${rows.map((row) => row.id).join(",")})`,
  select: "id,content_key"
});
const deleted = await requestRows(query, { method: "DELETE", headers: { prefer: "return=representation" } });
assertExactTargets(deleted);

const remaining = await fetchTargets();
if (remaining.length !== 0) {
  throw new Error(`Deletion verification failed: ${remaining.length} rows remain. Backup: ${backup.path}`);
}

console.log(JSON.stringify({
  mode: "apply",
  deletedRows: deleted.length,
  deletedKeys: deleted.map((row) => row.content_key).sort(),
  runtimeMoonSignHouseKeys,
  backup
}, null, 2));
