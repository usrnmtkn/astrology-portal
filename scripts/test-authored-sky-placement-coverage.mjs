#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");
const productionProjectRef = "hdmdufozrgrajkfhydit";
const productionReadRequested = process.argv.includes("--production-read");

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

const expected = expectedRows();
const expectedKeys = new Set();
for (const row of expected) {
  assert.ok(row.text.length > 0, `${row.contentKey} must contain authored copy.`);
  assert.equal(expectedKeys.has(row.contentKey), false, `${row.contentKey} must be unique.`);
  assert.equal(/reviewed .* bank|Use the reviewed/i.test(row.text), false, `${row.contentKey} must not contain reviewed-bank placeholder copy.`);
  expectedKeys.add(row.contentKey);
}

if (!productionReadRequested) {
  console.log(JSON.stringify({
    status: "PASS",
    mode: "offline",
    checkedRows: expected.length
  }, null, 2));
  process.exit(0);
}

assert.equal(
  process.env.TLDR_ALLOW_PRODUCTION_READ,
  "1",
  "Production coverage reads require TLDR_ALLOW_PRODUCTION_READ=1."
);

const supabaseUrl = String(process.env.TLDR_PRODUCTION_SUPABASE_URL ?? "").trim();
const supabaseKey = String(process.env.TLDR_PRODUCTION_SUPABASE_PUBLISHABLE_KEY ?? "").trim();
assert.ok(supabaseUrl, "Set TLDR_PRODUCTION_SUPABASE_URL for a production coverage read.");
assert.ok(supabaseKey, "Set TLDR_PRODUCTION_SUPABASE_PUBLISHABLE_KEY for a production coverage read.");

const parsedSupabaseUrl = new URL(supabaseUrl);
assert.equal(parsedSupabaseUrl.protocol, "https:", "Production Supabase reads must use HTTPS.");
assert.equal(
  parsedSupabaseUrl.hostname,
  `${productionProjectRef}.supabase.co`,
  `Production coverage is restricted to Supabase project ${productionProjectRef}.`
);

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
  mode: "production-read",
  checkedRows: expected.length,
  liveRows: [...liveByKey.values()].flat().length
}, null, 2));
