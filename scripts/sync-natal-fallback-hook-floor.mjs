#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const repoRoot = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const sourcePath = path.join(repoRoot, "scripts/content-source/tldrastro-fallback-templates-rows.json");
const backupDir = path.join(repoRoot, "scripts/generated");
const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
const apply = process.argv.includes("--apply");

const hookKeys = [
  "fallback-hook/you.natal-placement",
  "fallback-hook/you.natal-house-placement",
  "fallback-hook/you.natal-synthesis"
];

function unquoteEnvValue(value) {
  const trimmed = value.trim();
  const quote = trimmed[0];

  if ((quote === "\"" || quote === "'") && trimmed.endsWith(quote)) {
    return trimmed.slice(1, -1);
  }

  return trimmed;
}

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;

  for (const rawLine of fs.readFileSync(filePath, "utf8").split(/\r?\n/)) {
    const line = rawLine.trim();

    if (!line || line.startsWith("#")) continue;

    const separatorIndex = line.indexOf("=");

    if (separatorIndex <= 0) continue;

    const key = line.slice(0, separatorIndex).trim();
    const value = unquoteEnvValue(line.slice(separatorIndex + 1));

    if (/^[A-Za-z_][A-Za-z0-9_]*$/.test(key) && process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

function requireEnv(name) {
  const value = process.env[name];

  if (!value) {
    throw new Error(`${name} is not configured.`);
  }

  return value;
}

function supabaseUrl() {
  return process.env.SUPABASE_URL ?? requireEnv("VITE_SUPABASE_URL");
}

function serviceRoleKey() {
  return requireEnv("SUPABASE_SERVICE_ROLE_KEY");
}

function adminHeaders(extra = {}) {
  const key = serviceRoleKey();

  return {
    apikey: key,
    authorization: `Bearer ${key}`,
    "content-type": "application/json",
    ...extra
  };
}

function sourceRows() {
  const payload = JSON.parse(fs.readFileSync(sourcePath, "utf8"));
  const rows = payload.templateRows ?? payload.rows ?? [];

  return hookKeys.map((contentKey) => {
    const row = rows.find((item) => item.contentKey === contentKey);

    if (!row) {
      throw new Error(`${contentKey} is missing from ${sourcePath}.`);
    }

    return row;
  });
}

async function fetchJson(url, options = {}) {
  const response = await fetch(url, options);
  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(`Supabase request failed with ${response.status}: ${JSON.stringify(payload)}`);
  }

  return payload;
}

async function existingHookRows() {
  const params = new URLSearchParams({
    select: "*",
    content_key: `in.(${hookKeys.map((key) => `"${key}"`).join(",")})`
  });

  return fetchJson(`${supabaseUrl()}/rest/v1/generated_interpretations?${params}`, {
    headers: adminHeaders()
  });
}

async function existingPromotedFloorRows() {
  const params = new URLSearchParams({
    select: "*",
    model: "eq.compiled-phrasebank-authored-placement-floor"
  });

  return fetchJson(`${supabaseUrl()}/rest/v1/generated_interpretations?${params}`, {
    headers: adminHeaders()
  });
}

function rowForHook(row) {
  const contentKey = row.contentKey;

  return {
    content_key: contentKey,
    surface: "you",
    mode: "in_depth",
    status: "LIVE",
    event_type: "runtime-fallback-hook",
    target_date: null,
    headline: String(row.headline ?? contentKey).trim(),
    summary: String(row.summary ?? "").trim(),
    body: String(row.body ?? "").trim(),
    sections: [],
    block_type: "fallback_template",
    lane: "serving",
    review_state: null,
    evergreen: true,
    evergreen_at: new Date().toISOString(),
    evergreen_by: "emergency-floor-sync",
    facts: {
      tldrDashboardSource: true,
      sourceFile: path.basename(sourcePath),
      contentFamily: "runtime-fallback-hook",
      emergencyFloor: "fallback-hook",
      sourceStatus: "LIVE_SERVING"
    },
    knowledge_ids: [],
    source_snapshot: {
      contentType: "template",
      emergencyFloor: "fallback-hook",
      sourceFile: path.basename(sourcePath),
      canonicalKey: contentKey,
      note: "Emergency floor is fallback hook template plus vocab. Sparse promoted natal.sign/natal.house rows are not the emergency floor."
    },
    reviewer_notes: "",
    prompt_version: "fallback-hook-emergency-floor-v2",
    provider: "dashboard-source",
    model: "manual",
    updated_at: new Date().toISOString()
  };
}

async function upsertHooks(rows) {
  return fetchJson(`${supabaseUrl()}/rest/v1/generated_interpretations?on_conflict=content_key`, {
    method: "POST",
    headers: adminHeaders({
      prefer: "resolution=merge-duplicates,return=representation"
    }),
    body: JSON.stringify(rows.map(rowForHook))
  });
}

async function archivePromotedFloorRows() {
  return fetchJson(`${supabaseUrl()}/rest/v1/generated_interpretations?model=eq.compiled-phrasebank-authored-placement-floor`, {
    method: "PATCH",
    headers: adminHeaders({
      prefer: "return=representation"
    }),
    body: JSON.stringify({
      status: "ARCHIVED",
      lane: "serving",
      review_state: "retired-promoted-emergency-floor",
      reviewer_notes: "Retired because emergency floor now means fallback-hook templates plus vocab, not sparse promoted content rows.",
      updated_at: new Date().toISOString()
    })
  });
}

loadEnvFile(path.join(repoRoot, ".env.local"));
loadEnvFile(path.join(repoRoot, "apps/web/.env.local"));

const hooks = sourceRows();
const beforeHooks = await existingHookRows();
const beforeFloor = await existingPromotedFloorRows();

fs.mkdirSync(backupDir, { recursive: true });
const backupPath = path.join(backupDir, `natal-fallback-hook-floor-backup-${timestamp}.json`);
fs.writeFileSync(backupPath, JSON.stringify({
  createdAt: new Date().toISOString(),
  apply,
  hookKeys,
  existingHookRows: beforeHooks,
  promotedFloorRows: beforeFloor
}, null, 2));

let upsertedHooks = [];
let archivedFloorRows = [];

if (apply) {
  upsertedHooks = await upsertHooks(hooks);
  archivedFloorRows = await archivePromotedFloorRows();
}

console.log(JSON.stringify({
  status: apply ? "APPLIED" : "DRY_RUN",
  backupPath,
  hookRowsToUpsert: hooks.map((row) => ({
    contentKey: row.contentKey,
    body: row.body
  })),
  existingHookRows: beforeHooks.length,
  promotedFloorRowsToArchive: beforeFloor.length,
  upsertedHooks: upsertedHooks.length,
  archivedPromotedFloorRows: archivedFloorRows.length
}, null, 2));
