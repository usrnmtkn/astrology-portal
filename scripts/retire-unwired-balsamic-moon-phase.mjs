#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const repoRoot = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const contentKey = "fallback-hook/natal-moon-phase-lived/balsamic";
const reviewState = "retired-unwired-balsamic-moon-phase";
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
    content_key: `eq.${contentKey}`,
    order: "id.asc"
  });
  const response = await fetch(`${baseUrl()}/rest/v1/generated_interpretations?${query}`, { headers: headers() });
  const payload = await response.json().catch(() => null);
  if (!response.ok) throw new Error(`Retirement lookup failed with ${response.status}: ${JSON.stringify(payload)}`);
  if (!Array.isArray(payload)) throw new Error("Retirement lookup returned a non-array payload.");
  return payload;
}

function retirementPatch(row, retiredAt) {
  const snapshot = record(row.source_snapshot);
  const facts = record(row.facts);
  return {
    status: "ARCHIVED",
    lane: "reference",
    review_state: reviewState,
    reviewer_notes: "Owner retired this unwired balsamic Moon-phase row on 2026-08-23. Retain wording only as historical source material.",
    source_snapshot: {
      ...snapshot,
      content_role: "source_material",
      distribution_lane: "reference",
      render_policy: "reference-only-never-serve-verbatim",
      review_status: "superseded",
      retirement: { retiredAt, reason: "No live natal Moon-phase resolver requests this key." }
    },
    facts: {
      ...facts,
      retirement: { retiredAt, reason: "No live natal Moon-phase resolver requests this key." }
    },
    updated_at: retiredAt
  };
}

loadEnv();
const rows = await fetchRows();
if (rows.length !== 1) throw new Error(`Expected exactly one ${contentKey} row; found ${rows.length}.`);
const before = rows[0];

if (!apply) {
  console.log(JSON.stringify({
    mode: "dry-run",
    contentKey,
    matchedRows: rows.length,
    before: { id: before.id, status: before.status, lane: before.lane, reviewState: before.review_state },
    next: "Run node scripts/retire-unwired-balsamic-moon-phase.mjs --apply to archive this exact row."
  }, null, 2));
  process.exit(0);
}

const retiredAt = new Date().toISOString();
const response = await fetch(`${baseUrl()}/rest/v1/generated_interpretations?id=eq.${encodeURIComponent(before.id)}`, {
  method: "PATCH",
  headers: headers({ prefer: "return=representation" }),
  body: JSON.stringify(retirementPatch(before, retiredAt))
});
const changed = await response.json().catch(() => null);
if (!response.ok) throw new Error(`Retirement update failed with ${response.status}: ${JSON.stringify(changed)}`);
if (!Array.isArray(changed) || changed.length !== 1) throw new Error(`Expected one updated row; received ${JSON.stringify(changed)}`);

const after = (await fetchRows())[0];
if (after.status !== "ARCHIVED" || after.lane !== "reference" || after.review_state !== reviewState) {
  throw new Error(`Retirement verification failed: ${JSON.stringify(after)}`);
}

console.log(JSON.stringify({
  mode: "apply",
  contentKey,
  changedRows: 1,
  before: { id: before.id, status: before.status, lane: before.lane, reviewState: before.review_state },
  after: { id: after.id, status: after.status, lane: after.lane, reviewState: after.review_state },
  retiredAt
}, null, 2));
