#!/usr/bin/env node
import assert from "node:assert/strict";
import os from "node:os";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const aspectDir = path.join(repoRoot, "packages/astro-knowledge/data/insights/natal-aspects");
const dryRun = !process.argv.includes("--apply");
const verifyOnly = process.argv.includes("--verify-only");
const prepareCurl = process.argv.includes("--prepare-curl");
const cleanupCurl = process.argv.includes("--cleanup-curl");
const now = new Date().toISOString();
const curlPayloadPath = `${os.tmpdir()}/tldrastro-sun-moon-natal-aspects-upsert.json`;
const curlUpsertConfigPath = `${os.tmpdir()}/tldrastro-sun-moon-natal-aspects-upsert.curl`;
const curlVerifyConfigPath = `${os.tmpdir()}/tldrastro-sun-moon-natal-aspects-verify.curl`;

const aspectIds = [
  "sun-conjunction-moon",
  "sun-sextile-moon",
  "sun-square-moon",
  "sun-trine-moon",
  "sun-opposition-moon",
  "sun-quincunx-moon",
];

function unquoteEnvValue(value) {
  const trimmed = value.trim();
  const quote = trimmed[0];
  return (quote === "\"" || quote === "'") && trimmed.endsWith(quote)
    ? trimmed.slice(1, -1)
    : trimmed;
}

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;

  for (const line of fs.readFileSync(filePath, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const separatorIndex = trimmed.indexOf("=");
    if (separatorIndex <= 0) continue;
    const key = trimmed.slice(0, separatorIndex).trim();
    const value = unquoteEnvValue(trimmed.slice(separatorIndex + 1));
    if (/^[A-Za-z_][A-Za-z0-9_]*$/.test(key) && process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

function requiredEnv(name) {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not configured.`);
  return value;
}

function unlinkIfExists(filePath) {
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function titleCase(value) {
  return String(value)
    .split(/[-_\s]+/g)
    .filter(Boolean)
    .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
    .join(" ");
}

function aspectFromRecord(record) {
  const factor = record.sourceFactors?.[0] ?? {};
  const aspect = factor.aspect;
  if (typeof aspect !== "string" || !aspect.trim()) {
    throw new Error(`${record.id} is missing sourceFactors[0].aspect`);
  }
  return aspect.trim().toLowerCase();
}

function toRow(record) {
  const aspect = aspectFromRecord(record);
  const headline = record.displayTitle || `Sun ${titleCase(aspect)} Moon`;

  return {
    content_key: `natal.aspect.sun.${aspect}.moon`,
    surface: "you",
    mode: "feed",
    status: "LIVE",
    lane: "serving",
    review_state: null,
    event_type: "natal-aspect",
    target_date: null,
    headline,
    summary: record.summary,
    body: record.body,
    sections: {
      sourceField: "body",
      authoredInsightCardId: record.id,
      dashboardCanonicalKey: `dashboard.natal-aspect.sun.${aspect}.moon`,
      gift: record.gift,
      shadow: record.shadow,
      integration: record.integration,
      do: record.do,
      dont: record.dont,
    },
    block_type: "natal_aspect",
    provider: "authored-natal-aspect-copy",
    model: "authored-sun-moon-natal-aspects-v1",
    facts: {
      contentLevel: "source-grounded",
      authoredCopy: true,
      sourcePackage: "@tldr/astro-knowledge",
      sourceInsightCardId: record.id,
      sourceFactors: record.sourceFactors,
      dashboardCanonicalKey: `dashboard.natal-aspect.sun.${aspect}.moon`,
    },
    source_snapshot: {
      contentType: "authored-natal-aspect",
      sourceType: "authored-insight-card",
      sourcePackage: "@tldr/astro-knowledge",
      sourceFile: `packages/astro-knowledge/data/insights/natal-aspects/${record.id}.json`,
      sourceInsightCardId: record.id,
      canonicalKey: `natal.aspect.sun.${aspect}.moon`,
      dashboardCanonicalKey: `dashboard.natal-aspect.sun.${aspect}.moon`,
      displayTitle: headline,
      templateVersion: "authored-sun-moon-natal-aspects-v1",
      syncedAt: now,
    },
    flags: [],
    evergreen: true,
    evergreen_at: now,
    evergreen_by: "sync-authored-sun-moon-natal-aspects",
    updated_at: now,
  };
}

async function fetchRowsByKeys(supabase, keys) {
  const { data, error } = await supabase
    .from("generated_interpretations")
    .select("id,content_key,status,lane,review_state,headline,body,summary,sections,source_snapshot,facts,flags,updated_at")
    .in("content_key", keys)
    .order("updated_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

function rowsByKey(rows) {
  const map = new Map();
  for (const row of rows) {
    const list = map.get(row.content_key) ?? [];
    list.push(row);
    map.set(row.content_key, list);
  }
  return map;
}

async function upsertRows(supabase, desiredRows) {
  const existing = rowsByKey(await fetchRowsByKeys(supabase, desiredRows.map((row) => row.content_key)));
  const inserted = [];
  const updated = [];
  const archivedDuplicates = [];

  for (const desired of desiredRows) {
    const currentRows = existing.get(desired.content_key) ?? [];
    const preferred = currentRows.find((row) => row.status === "LIVE" && row.lane === "serving") ?? currentRows[0];

    if (!preferred) {
      inserted.push(desired.content_key);
      if (!dryRun) {
        const { error } = await supabase.from("generated_interpretations").insert(desired);
        if (error) throw error;
      }
      continue;
    }

    updated.push(desired.content_key);
    if (!dryRun) {
      const { error } = await supabase
        .from("generated_interpretations")
        .update(desired)
        .eq("id", preferred.id);
      if (error) throw error;
    }

    for (const duplicate of currentRows.filter((row) => row.id !== preferred.id)) {
      archivedDuplicates.push(duplicate.content_key);
      if (!dryRun) {
        const { error } = await supabase
          .from("generated_interpretations")
          .update({
            status: "ARCHIVED",
            lane: "archived",
            review_state: "replaced_by_authored_sun_moon_aspect_sync",
            flags: [...new Set([...(Array.isArray(duplicate.flags) ? duplicate.flags : []), "REPLACED_BY_AUTHORED_SUN_MOON_ASPECT_SYNC"])],
          })
          .eq("id", duplicate.id);
        if (error) throw error;
      }
    }
  }

  return { archivedDuplicates, inserted, updated };
}

async function verifyRows(supabase, desiredRows) {
  const liveRows = rowsByKey(await fetchRowsByKeys(supabase, desiredRows.map((row) => row.content_key)));
  const missing = [];
  const duplicateLive = [];
  const mismatched = [];

  for (const desired of desiredRows) {
    const rows = (liveRows.get(desired.content_key) ?? [])
      .filter((row) => row.status === "LIVE" && row.lane === "serving" && row.review_state === null);

    if (rows.length === 0) {
      missing.push(desired.content_key);
      continue;
    }

    if (rows.length > 1) duplicateLive.push(desired.content_key);

    const row = rows[0];
    if (String(row.body ?? "").trim() !== desired.body.trim()) mismatched.push(`${desired.content_key}:body`);
    if (String(row.headline ?? "").trim() !== desired.headline.trim()) mismatched.push(`${desired.content_key}:headline`);
  }

  return { duplicateLive, mismatched, missing };
}

loadEnvFile(path.join(repoRoot, "apps/web/.env.local"));

if (cleanupCurl) {
  unlinkIfExists(curlPayloadPath);
  unlinkIfExists(curlUpsertConfigPath);
  unlinkIfExists(curlVerifyConfigPath);
  console.log(JSON.stringify({
    status: "PASS",
    cleaned: [curlPayloadPath, curlUpsertConfigPath, curlVerifyConfigPath],
  }, null, 2));
  process.exit(0);
}

const supabaseUrl = process.env.SUPABASE_URL ?? requiredEnv("VITE_SUPABASE_URL");
const serviceRoleKey = requiredEnv("SUPABASE_SERVICE_ROLE_KEY");
const supabase = createClient(supabaseUrl, serviceRoleKey);

const desiredRows = aspectIds.map((id) => toRow(readJson(path.join(aspectDir, `${id}.json`))));

for (const row of desiredRows) {
  assert.equal(row.status, "LIVE");
  assert.equal(row.lane, "serving");
  assert.equal(row.review_state, null);
  assert.match(row.headline, /^Sun (Conjunct|Sextile|Square|Trine|Opposite|Quincunx) Moon$/);
  assert.match(row.content_key, /^natal\.aspect\.sun\.(conjunction|sextile|square|trine|opposition|quincunx)\.moon$/);
}

if (prepareCurl) {
  const keys = desiredRows.map((row) => row.content_key);
  const encodedKeys = keys.join(",");
  fs.writeFileSync(curlPayloadPath, `${JSON.stringify(desiredRows, null, 2)}\n`);
  fs.writeFileSync(curlUpsertConfigPath, [
    `url = "${supabaseUrl}/rest/v1/generated_interpretations?on_conflict=content_key"`,
    "request = POST",
    `header = "apikey: ${serviceRoleKey}"`,
    `header = "authorization: Bearer ${serviceRoleKey}"`,
    'header = "content-type: application/json"',
    'header = "prefer: resolution=merge-duplicates,return=representation"',
    `data = "@${curlPayloadPath}"`,
    "",
  ].join("\n"));
  fs.writeFileSync(curlVerifyConfigPath, [
    `url = "${supabaseUrl}/rest/v1/generated_interpretations?select=content_key,status,lane,review_state,headline,body,updated_at&content_key=in.(${encodedKeys})&order=updated_at.desc"`,
    "request = GET",
    `header = "apikey: ${serviceRoleKey}"`,
    `header = "authorization: Bearer ${serviceRoleKey}"`,
    'header = "accept: application/json"',
    "",
  ].join("\n"));
  console.log(JSON.stringify({
    status: "PASS",
    payload: curlPayloadPath,
    upsertConfig: curlUpsertConfigPath,
    verifyConfig: curlVerifyConfigPath,
    rows: desiredRows.length,
  }, null, 2));
  process.exit(0);
}

const result = verifyOnly ? { archivedDuplicates: [], inserted: [], updated: [] } : await upsertRows(supabase, desiredRows);
const verification = dryRun && !verifyOnly
  ? { duplicateLive: [], mismatched: [], missing: [] }
  : await verifyRows(supabase, desiredRows);

if (!dryRun || verifyOnly) {
  assert.deepEqual(verification.missing, [], "Missing LIVE Sun-Moon natal aspect rows after sync.");
  assert.deepEqual(verification.duplicateLive, [], "Duplicate LIVE Sun-Moon natal aspect rows after sync.");
  assert.deepEqual(verification.mismatched, [], "Mismatched Sun-Moon natal aspect rows after sync.");
}

console.log(JSON.stringify({
  status: dryRun && !verifyOnly ? "DRY_RUN" : "PASS",
  mode: verifyOnly ? "verify-only" : dryRun ? "dry-run" : "apply",
  desiredRows: desiredRows.length,
  ...result,
  verification,
}, null, 2));
