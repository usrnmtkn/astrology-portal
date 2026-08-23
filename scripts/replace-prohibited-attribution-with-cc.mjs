#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const repoRoot = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const args = new Map(process.argv.slice(2).map((arg) => {
  const [key, ...parts] = arg.split("=");
  return [key, parts.join("=") || true];
}));
const apply = args.has("--apply");
const envPath = String(args.get("--env") || path.join(repoRoot, "apps/web/.env.local"));
const rollbackPath = String(args.get("--rollback") || path.join(repoRoot, "artifacts", "cc-attribution-rollback.json"));
const pageSize = 500;
const prohibitedName = ["cha", "ni"].join("");
const prohibitedPattern = new RegExp(`\\b${prohibitedName}\\b`, "giu");
const prohibitedMatchPattern = new RegExp(`\\b${prohibitedName}\\b`, "iu");
const immutableColumns = new Set(["id", "created_at", "updated_at", "reviewed_at", "published_at"]);

function unquote(value) {
  const trimmed = value.trim();
  return ((trimmed.startsWith("\"") && trimmed.endsWith("\""))
    || (trimmed.startsWith("'") && trimmed.endsWith("'")))
    ? trimmed.slice(1, -1)
    : trimmed;
}

function loadEnv(filePath) {
  if (!fs.existsSync(filePath)) throw new Error(`Environment file not found: ${filePath}`);
  for (const line of fs.readFileSync(filePath, "utf8").split(/\r?\n/u)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const separator = trimmed.indexOf("=");
    if (separator <= 0) continue;
    const key = trimmed.slice(0, separator).trim();
    if (process.env[key] === undefined) process.env[key] = unquote(trimmed.slice(separator + 1));
  }
}

function required(name) {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not configured.`);
  return value;
}

function baseUrl() {
  return process.env.SUPABASE_URL ?? required("VITE_SUPABASE_URL");
}

function headers(extra = {}) {
  const key = required("SUPABASE_SERVICE_ROLE_KEY");
  return {
    apikey: key,
    authorization: `Bearer ${key}`,
    "content-type": "application/json",
    ...extra
  };
}

function replaceValue(value) {
  if (typeof value === "string") return value.replace(prohibitedPattern, "CC");
  if (Array.isArray(value)) return value.map(replaceValue);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([key, nested]) => [key, replaceValue(nested)]));
  }
  return value;
}

function changedColumns(row) {
  const patch = {};
  const before = {};
  for (const [column, value] of Object.entries(row)) {
    if (immutableColumns.has(column)) continue;
    const replacement = replaceValue(value);
    if (JSON.stringify(replacement) === JSON.stringify(value)) continue;
    patch[column] = replacement;
    before[column] = value;
  }
  return { patch, before };
}

async function fetchAllRows() {
  const rows = [];
  for (let offset = 0; ; offset += pageSize) {
    const query = new URLSearchParams({ select: "*", order: "id.asc", limit: String(pageSize), offset: String(offset) });
    const response = await fetch(`${baseUrl()}/rest/v1/generated_interpretations?${query}`, { headers: headers() });
    const payload = await response.json().catch(() => null);
    if (!response.ok) throw new Error(`Content scan failed with ${response.status}: ${JSON.stringify(payload)}`);
    if (!Array.isArray(payload)) throw new Error("Content scan returned a non-array payload.");
    rows.push(...payload);
    if (payload.length < pageSize) break;
  }
  return rows;
}

function matchesRow(row) {
  return prohibitedMatchPattern.test(JSON.stringify(row));
}

loadEnv(envPath);
const rows = await fetchAllRows();
const changes = rows
  .map((row) => ({ row, ...changedColumns(row) }))
  .filter(({ patch }) => Object.keys(patch).length > 0);

const summary = {
  mode: apply ? "apply" : "dry-run",
  scannedRows: rows.length,
  matchingRows: changes.length,
  matchingColumns: changes.reduce((count, change) => count + Object.keys(change.patch).length, 0),
  exampleKeys: changes.slice(0, 12).map(({ row }) => row.content_key)
};

if (!apply) {
  console.log(JSON.stringify({ ...summary, next: "Re-run with --apply and an explicit --rollback path." }, null, 2));
  process.exit(0);
}

if (!args.has("--rollback")) throw new Error("--apply requires an explicit --rollback=/absolute/path.json file.");
fs.mkdirSync(path.dirname(rollbackPath), { recursive: true });
fs.writeFileSync(rollbackPath, `${JSON.stringify({
  createdAt: new Date().toISOString(),
  table: "generated_interpretations",
  rows: changes.map(({ row, before }) => ({ id: row.id, contentKey: row.content_key, columns: before }))
}, null, 2)}\n`);

for (const { row, patch } of changes) {
  const response = await fetch(`${baseUrl()}/rest/v1/generated_interpretations?id=eq.${encodeURIComponent(row.id)}`, {
    method: "PATCH",
    headers: headers({ prefer: "return=minimal" }),
    body: JSON.stringify(patch)
  });
  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    throw new Error(`Content update failed for ${row.content_key} with ${response.status}: ${JSON.stringify(payload)}`);
  }
}

const after = await fetchAllRows();
const remaining = after.filter(matchesRow);
if (remaining.length > 0) {
  throw new Error(`Verification found ${remaining.length} rows that still contain the prohibited attribution.`);
}

console.log(JSON.stringify({ ...summary, verifiedRemainingRows: 0, rollbackPath }, null, 2));
