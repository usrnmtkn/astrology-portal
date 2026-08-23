#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const repoRoot = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const contentKeys = [
  "fallback-hook/aspect-lived/quincunx",
  "fallback-hook/aspect-lived/sextile"
];
const reviewState = "source-material-generic-aspect-baseline";
const apply = process.argv.includes("--apply");

function unquote(value) {
  const trimmed = value.trim();
  return ((trimmed.startsWith("\"") && trimmed.endsWith("\""))
    || (trimmed.startsWith("'") && trimmed.endsWith("'")))
    ? trimmed.slice(1, -1)
    : trimmed;
}

function loadEnv() {
  const envPath = path.join(repoRoot, "apps/web/.env.local");
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/u)) {
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

function record(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function headers(extra = {}) {
  const key = required("SUPABASE_SERVICE_ROLE_KEY");
  return { apikey: key, authorization: `Bearer ${key}`, "content-type": "application/json", ...extra };
}

function baseUrl() {
  return process.env.SUPABASE_URL ?? required("VITE_SUPABASE_URL");
}

async function fetchRows() {
  const query = new URLSearchParams({
    select: "id,content_key,status,lane,review_state,reviewer_notes,facts,source_snapshot,updated_at",
    content_key: `in.(${contentKeys.join(",")})`,
    order: "content_key.asc"
  });
  const response = await fetch(`${baseUrl()}/rest/v1/generated_interpretations?${query}`, { headers: headers() });
  const payload = await response.json().catch(() => null);
  if (!response.ok) throw new Error(`Source-material lookup failed with ${response.status}: ${JSON.stringify(payload)}`);
  if (!Array.isArray(payload)) throw new Error("Source-material lookup returned a non-array payload.");
  return payload;
}

function sourceMaterialPatch(row, classifiedAt) {
  const snapshot = record(row.source_snapshot);
  const facts = record(row.facts);
  const classification = {
    classifiedAt,
    purpose: "baseline-for-exact-pair-authoring",
    neverServeVerbatim: true
  };
  return {
    status: "REVIEWED",
    lane: "reference",
    review_state: reviewState,
    reviewer_notes: "Owner retained this generic aspect doctrine as source material only. Write and serve exact planet/point pair passages instead.",
    source_snapshot: {
      ...snapshot,
      content_role: "source_material",
      distribution_lane: "reference",
      render_policy: "reference-only-generic-aspect-baseline-v1",
      review_status: "reviewed",
      source_material: classification
    },
    facts: { ...facts, source_material: classification },
    updated_at: classifiedAt
  };
}

loadEnv();
const rows = await fetchRows();
const returnedKeys = rows.map((row) => row.content_key).sort();
assertExactKeys(returnedKeys);

function assertExactKeys(keys) {
  const expected = [...contentKeys].sort();
  if (JSON.stringify(keys) !== JSON.stringify(expected)) {
    throw new Error(`Expected exactly ${expected.join(", ")}; found ${keys.join(", ") || "none"}.`);
  }
}

if (!apply) {
  console.log(JSON.stringify({
    mode: "dry-run",
    matchedRows: rows.length,
    before: rows.map((row) => ({
      id: row.id,
      contentKey: row.content_key,
      status: row.status,
      lane: row.lane,
      reviewState: row.review_state
    })),
    next: "Run node scripts/reclassify-generic-aspect-baselines.mjs --apply to move these exact rows to source material."
  }, null, 2));
  process.exit(0);
}

const classifiedAt = new Date().toISOString();
const changed = [];
for (const row of rows) {
  const response = await fetch(`${baseUrl()}/rest/v1/generated_interpretations?id=eq.${encodeURIComponent(row.id)}`, {
    method: "PATCH",
    headers: headers({ prefer: "return=representation" }),
    body: JSON.stringify(sourceMaterialPatch(row, classifiedAt))
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok) throw new Error(`Source-material update failed with ${response.status}: ${JSON.stringify(payload)}`);
  if (!Array.isArray(payload) || payload.length !== 1) throw new Error(`Expected one updated row; received ${JSON.stringify(payload)}`);
  changed.push(payload[0]);
}

const after = await fetchRows();
assertExactKeys(after.map((row) => row.content_key).sort());
if (!after.every((row) => row.status === "REVIEWED" && row.lane === "reference" && row.review_state === reviewState)) {
  throw new Error(`Source-material verification failed: ${JSON.stringify(after)}`);
}

console.log(JSON.stringify({
  mode: "apply",
  changedRows: changed.length,
  after: after.map((row) => ({
    id: row.id,
    contentKey: row.content_key,
    status: row.status,
    lane: row.lane,
    reviewState: row.review_state
  })),
  classifiedAt
}, null, 2));
