#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");

const liveCheckRequested =
  process.argv.includes("--live") || process.env.TLDR_RUN_LIVE_SUPABASE_CHECK === "1";

if (!liveCheckRequested) {
  console.log(JSON.stringify({
    status: "SKIP",
    reason: "Live Supabase coverage is environment-gated; run npm run test:content:live where credentials are available."
  }, null, 2));
  process.exit(0);
}

function parseEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return {};
  const env = {};
  for (const rawLine of fs.readFileSync(filePath, "utf8").split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const match = line.match(/^(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (!match) continue;
    env[match[1]] = match[2].replace(/^['"]|['"]$/g, "");
  }
  return env;
}

function slug(value) {
  return String(value ?? "").trim().toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
}

function expectedRows() {
  const filePath = path.join(repoRoot, "tldr-astro-phrasebank/phrasebank/cc-planet-in-sign-reviewed.json");
  const data = JSON.parse(fs.readFileSync(filePath, "utf8"));
  const rows = data.reviewed.map((row) => ({
    contentKey: `sky.placement.${slug(row.body)}.${slug(row.sign)}`,
    text: String(row.collective_shift ?? "").trim()
  }));
  assert.equal(rows.length, 120, "Expected 120 authored sky placement rows.");
  return rows;
}

const env = {
  ...parseEnvFile(path.join(repoRoot, "apps/web/.env.local")),
  ...parseEnvFile(path.join(repoRoot, ".env.local"))
};
function firstPresent(...values) {
  return values.find((value) => String(value ?? "").trim().length > 0);
}

const supabaseUrl = firstPresent(process.env.VITE_SUPABASE_URL, env.VITE_SUPABASE_URL, process.env.SUPABASE_URL, env.SUPABASE_URL);
const supabaseKey = firstPresent(
  process.env.VITE_SUPABASE_ANON_KEY,
  env.VITE_SUPABASE_ANON_KEY,
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY,
  env.VITE_SUPABASE_PUBLISHABLE_KEY,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  env.SUPABASE_SERVICE_ROLE_KEY
);

if (!supabaseUrl || !supabaseKey) {
  throw new Error("Live Supabase coverage was requested, but Supabase URL/key env vars are not configured.");
}

const expected = expectedRows();
const supabase = createClient(supabaseUrl, supabaseKey);
const liveByKey = new Map();

for (let index = 0; index < expected.length; index += 100) {
  const keys = expected.slice(index, index + 100).map((row) => row.contentKey);
  const { data, error } = await supabase
    .from("generated_interpretations")
    .select("content_key,status,lane,review_state,body,sections,source_snapshot")
    .in("content_key", keys);
  if (error) throw error;
  for (const row of data ?? []) {
    if (row.status === "LIVE" && row.lane === "serving" && row.review_state === null) {
      const list = liveByKey.get(row.content_key) ?? [];
      list.push(row);
      liveByKey.set(row.content_key, list);
    }
  }
}

for (const expectedRow of expected) {
  const live = liveByKey.get(expectedRow.contentKey) ?? [];
  assert.equal(live.length, 1, `${expectedRow.contentKey} must have exactly one LIVE serving row.`);
  assert.equal(String(live[0].body ?? "").trim(), expectedRow.text, `${expectedRow.contentKey} body must match collective_shift.`);
  assert.equal(String(live[0].sections?.collective_shift ?? "").trim(), expectedRow.text, `${expectedRow.contentKey} sections.collective_shift must match.`);
  assert.equal(/reviewed .* bank|Use the reviewed/i.test(live[0].body ?? ""), false, `${expectedRow.contentKey} must not render reviewed-bank placeholder.`);
}

console.log(JSON.stringify({
  status: "PASS",
  checkedRows: expected.length,
  liveRows: [...liveByKey.values()].flat().length
}, null, 2));
