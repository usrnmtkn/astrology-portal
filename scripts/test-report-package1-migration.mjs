#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import { pathToFileURL } from "node:url";

const modulePath = process.env.REPORT_PGLITE_MODULE;
if (!modulePath) throw new Error("REPORT_PGLITE_MODULE must point to @electric-sql/pglite/dist/index.js.");
const { PGlite } = await import(pathToFileURL(modulePath).href);
const db = new PGlite();
await db.exec(`
  create table public.manual_charts (id uuid primary key default gen_random_uuid());
  create table public.user_generated_interpretations (id uuid primary key default gen_random_uuid());
  create table public.user_reports (id uuid primary key default gen_random_uuid());
  insert into public.manual_charts default values;
`);
const migration = fs.readFileSync(new URL("../apps/web/supabase/migrations/20260814120000_report_chart_provenance_and_delivery.sql", import.meta.url), "utf8");
await db.exec("begin");
await db.exec(migration);
const legacy = (await db.query("select birth_coordinate_provider, birth_coordinate_source_id, birth_coordinate_resolution from public.manual_charts limit 1")).rows[0];
assert.deepEqual(legacy, { birth_coordinate_provider: "legacy", birth_coordinate_source_id: "unrecorded", birth_coordinate_resolution: "legacy_unprovenanced" });
for (const [column, expectedDefault] of [["birth_coordinate_provider", "legacy"], ["birth_coordinate_source_id", "unrecorded"], ["birth_coordinate_resolution", "legacy_unprovenanced"]]) {
  const metadata = (await db.query("select is_nullable, column_default from information_schema.columns where table_schema='public' and table_name='manual_charts' and column_name=$1", [column])).rows[0];
  assert.equal(metadata.is_nullable, "NO", `${column} must fail closed instead of storing missing provenance.`);
  assert.match(String(metadata.column_default), new RegExp(expectedDefault), `${column} must supply its governed legacy default for older clients.`);
}
await db.exec("insert into public.manual_charts default values");
assert.equal(Number((await db.query("select count(*)::int count from public.manual_charts where birth_coordinate_provider='legacy' and birth_coordinate_source_id='unrecorded' and birth_coordinate_resolution='legacy_unprovenanced'")).rows[0].count), 2, "The migration backfill and post-migration client default must agree.");
for (const [table, column] of [["user_generated_interpretations", "display_order"], ["user_reports", "review_document"], ["user_reports", "review_document_bytes"], ["user_reports", "review_document_hash"]]) {
  assert.equal(Number((await db.query("select count(*)::int count from information_schema.columns where table_schema='public' and table_name=$1 and column_name=$2", [table, column])).rows[0].count), 1);
}
await db.exec("rollback");
assert.equal(Number((await db.query("select count(*)::int count from information_schema.columns where table_schema='public' and table_name='user_reports' and column_name='review_document'")).rows[0].count), 0, "Dry-run rollback must restore the pre-migration schema.");
await db.close();
console.log("Package 1 migration dry-run and rollback passed.");
