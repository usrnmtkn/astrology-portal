#!/usr/bin/env node
/**
 * Import the Astro 101 education package into generated_interpretations.
 *
 * Modeled on scripts/import-dashboard-source-rows.mjs and
 * scripts/import-sky-placement-continuous-v2.mjs (validate-first, write only on --approve).
 *
 * Usage:
 *   node import-astro-101-education-rows.mjs --source=./astro-101-rows.json
 *   node import-astro-101-education-rows.mjs --source=./astro-101-rows.json --approve --out=/abs/path/audit.json
 *
 * Without --approve it validates and writes nothing. With --approve it upserts in
 * batches of 100 on (content_key, target_date, mode) and writes an audit file listing every key touched.
 *
 * Env (reads apps/web/.env.local if present):
 *   SUPABASE_URL or VITE_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 */

import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const BATCH_SIZE = 100;
const REQUIRED = ["content_key", "surface", "mode", "block_type", "lane", "status", "headline", "body"];
const ALLOWED_SURFACE = new Set(["sky", "you", "natal", "synastry", "composite", "relationship"]);
const ALLOWED_MODE = new Set(["feed", "in_depth", "article"]);
const ALLOWED_STATUS = new Set(["DRAFT", "REVIEWED", "LIVE", "ARCHIVED", "ERROR"]);
const ALLOWED_BLOCK_TYPE = new Set(["essay", "sky_article"]);
const KEY_PREFIX = "education/astro-101/";
// CONTENT-CONTRACT R3: no markdown or package artifacts in display fields.
const ARTIFACT_PATTERNS = [
  [/\*\*/, "bold markdown"],
  [/^#{1,6}\s/m, "markdown heading"],
  [/-{4,}/, "package rule"],
  [/\.{4}|…\s*$/, "truncation"],
  [/\{(?!friend\})[a-zA-Z0-9_.]+\}/, "unresolved placeholder"],
  [/undefined|NaN|\[object Object\]/, "js artifact"],
];

function arg(name, fallback = null) {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  if (hit) return hit.slice(name.length + 3);
  return process.argv.includes(`--${name}`) ? true : fallback;
}

function loadEnvLocal() {
  const candidates = [
    path.resolve(process.cwd(), "apps/web/.env.local"),
    path.resolve(process.cwd(), ".env.local"),
  ];
  for (const file of candidates) {
    if (!fs.existsSync(file)) continue;
    for (const line of fs.readFileSync(file, "utf8").split("\n")) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
    }
  }
}

function validate(rows) {
  const problems = [];
  const seen = new Set();
  rows.forEach((row, i) => {
    const where = `row ${i} (${row.content_key ?? "no key"})`;
    for (const field of REQUIRED) {
      if (!row[field] || String(row[field]).trim() === "") problems.push(`${where}: missing ${field}`);
    }
    if (row.content_key && !row.content_key.startsWith(KEY_PREFIX)) {
      problems.push(`${where}: content_key must start with ${KEY_PREFIX}`);
    }
    if (seen.has(row.content_key)) problems.push(`${where}: duplicate content_key`);
    seen.add(row.content_key);
    if (!ALLOWED_SURFACE.has(row.surface)) problems.push(`${where}: surface "${row.surface}" not in enum`);
    if (!ALLOWED_MODE.has(row.mode)) problems.push(`${where}: mode "${row.mode}" not in enum`);
    if (!ALLOWED_STATUS.has(row.status)) problems.push(`${where}: status "${row.status}" not in enum`);
    if (!ALLOWED_BLOCK_TYPE.has(row.block_type)) problems.push(`${where}: block_type "${row.block_type}" not in enum`);
    for (const field of ["headline", "summary", "body"]) {
      const value = row[field];
      if (!value) continue;
      for (const [rx, label] of ARTIFACT_PATTERNS) {
        if (rx.test(value)) problems.push(`${where}: ${field} contains ${label}`);
      }
    }
    // blocks[] is optional: the flat variant carries structure in body only
    const blocks = row.sections?.blocks ?? [];
    blocks.forEach((b, j) => {
      if (!b.heading) problems.push(`${where}: block ${j} missing heading`);
      // a group block is a section header whose children carry the prose
      if (!b.body && !b.group) problems.push(`${where}: block ${j} missing body`);
    });
  });
  return problems;
}

async function upsert(rows, { url, key }) {
  const touched = [];
  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE);
    const payload = batch.map((row) => ({
      ...row,
      // Unique target is (content_key, target_date, mode) NULLS NOT DISTINCT.
      target_date: row.target_date ?? null,
    }));
    const res = await fetch(
      `${url}/rest/v1/generated_interpretations?on_conflict=content_key,target_date,mode`,
      {
      method: "POST",
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
        Prefer: "resolution=merge-duplicates,return=minimal",
      },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      throw new Error(`batch ${i / BATCH_SIZE}: ${res.status} ${await res.text()}`);
    }
    touched.push(...batch.map((r) => r.content_key));
    console.log(`  wrote ${batch.length} rows (${touched.length}/${rows.length})`);
  }
  return touched;
}

async function main() {
  const source = arg("source", "./astro-101-rows.json");
  const approve = arg("approve", false);
  const out = arg("out", null);

  const doc = JSON.parse(fs.readFileSync(path.resolve(source), "utf8"));
  const rows = Array.isArray(doc) ? doc : doc.rows;
  if (!Array.isArray(rows) || !rows.length) throw new Error(`no rows in ${source}`);
  console.log(`loaded ${rows.length} rows from ${source}`);

  const problems = validate(rows);
  if (problems.length) {
    console.error(`validation failed, ${problems.length} problems:`);
    problems.slice(0, 40).forEach((p) => console.error(`  - ${p}`));
    process.exit(1);
  }
  console.log("validation passed");

  const byKind = rows.reduce((acc, r) => {
    const kind = r.sections?.kind ?? "unknown";
    acc[kind] = (acc[kind] ?? 0) + 1;
    return acc;
  }, {});
  console.log("by kind:", byKind);

  if (!approve) {
    console.log("\ndry run. nothing written. re-run with --approve --out=/abs/path/audit.json to import.");
    return;
  }
  if (!out || !path.isAbsolute(out)) throw new Error("--approve requires an absolute --out= path for the audit file");

  loadEnvLocal();
  const url = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY");

  const touched = await upsert(rows, { url, key });
  fs.writeFileSync(out, JSON.stringify({
    package: doc.package ?? "astro-101-v1",
    imported_at: new Date().toISOString(),
    row_count: touched.length,
    content_keys: touched,
  }, null, 2) + "\n");
  console.log(`\ndone. audit written to ${out}`);
  console.log("rows land as status=DRAFT, review_state=needs_review. Review in Content Studio, Articles page.");
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
