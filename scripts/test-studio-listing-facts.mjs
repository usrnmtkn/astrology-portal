#!/usr/bin/env node
// The Studio classifies a list row from a few small facts that travel beside its columns. Those
// facts are projected in two places: the studio_facts column in SQL, and the TypeScript the API and
// the test fixtures share. When the two lists drift, a row silently loses its group, its title, or
// its place in the review queue, and only a browser suite notices.
import assert from "node:assert/strict";
import fs from "node:fs";
import { PGlite } from "@electric-sql/pglite";

const ts = fs.readFileSync("src/shared/studio-listing-facts.ts", "utf8");
const sql = fs.readFileSync(
  "apps/web/supabase/migrations/20260919180000_generated_content_studio_listing_facts.sql",
  "utf8"
);

function tsKeys(name) {
  const start = ts.indexOf(`export const ${name} = [`);
  assert.ok(start >= 0, `${name} must be exported for the projection contract.`);
  const list = ts.slice(start, ts.indexOf("] as const", start));
  return [...list.matchAll(/"([^"]+)"/gu)].map(match => match[1]);
}

function sqlKeys(objectName) {
  const start = sql.indexOf(`'${objectName}', nullif(jsonb_strip_nulls(jsonb_build_object(`);
  assert.ok(start >= 0, `The ${objectName} projection must exist in the migration.`);
  const block = sql.slice(start, sql.indexOf("))", sql.indexOf("jsonb_build_object(", start)));
  return [...block.matchAll(/^\s+'([^']+)',/gmu)].map(match => match[1]).filter(key => key !== objectName);
}

const sourceKeys = sqlKeys("source");
// flags is an array rather than a scalar, so the TypeScript list carries it separately.
assert.deepEqual(sourceKeys.filter(key => key !== "flags"), tsKeys("listingSourceKeys"));
assert.ok(sourceKeys.includes("flags"), "The source projection must keep the flags array.");
assert.match(ts, /source\.flags = flags/u, "The TypeScript projection must keep the flags array.");
assert.deepEqual(sqlKeys("packageRecord"), tsKeys("listingPackageRecordKeys"));

assert.match(sql, /add column if not exists studio_facts jsonb\s+generated always as/u,
  "studio_facts must be generated, so no backfill update moves every row's updated_at.");
assert.match(fs.readFileSync("api/admin/generated-content-inventory.ts", "utf8"),
  /studioListingRow\(row, /u, "The inventory list must project its rows through the shared contract.");

// A list row carries no saved copy, and an editor must still know to load the document.
assert.match(ts, /body: null/u);
assert.match(ts, /summary: null/u);
assert.match(ts, /inventory_only: true/u);

const db = new PGlite();
try {
  await db.exec(`create table public.generated_interpretations (
    id int primary key, body text, updated_at timestamptz,
    sections jsonb, source_snapshot jsonb, facts jsonb
  );`);
  await db.query(`insert into public.generated_interpretations values (1, $1, $2, $3, $4, $5)`, [
    'Synthetic opening.\n\nSynthetic ending.', '2026-10-03T12:00:00Z',
    { packageRecord: { contentKey: 'fallback-hook/sky-placement-hook/moon/cancer', review_status: 'approved', body_you: 'Private full document' } },
    { sourceType: 'fixture', flags: ['fixture'], privateHistory: 'Must not enter listing' },
    { fallbackArchitectureV3: true }
  ]);
  const before = (await db.query('select body,updated_at,sections,source_snapshot,facts from public.generated_interpretations')).rows;
  await db.exec(sql);
  await db.exec(sql); // Recovery must also work where the original migration already ran.
  assert.deepEqual((await db.query('select body,updated_at,sections,source_snapshot,facts from public.generated_interpretations')).rows, before);
  const metadata = (await db.query('select studio_facts from public.generated_interpretations')).rows[0].studio_facts;
  assert.deepEqual(metadata, {
    source: { sourceType: 'fixture', flags: ['fixture'] },
    packageRecord: { contentKey: 'fallback-hook/sky-placement-hook/moon/cancer', review_status: 'approved' },
    fallbackArchitectureV3: true
  });
  await db.exec(`update public.generated_interpretations set sections = jsonb_set(sections, '{packageRecord,review_status}', '"needs_review"');`);
  assert.equal((await db.query('select studio_facts from public.generated_interpretations')).rows[0].studio_facts.packageRecord.review_status, 'needs_review');
  const fn = (await db.query("select prosecdef, proconfig from pg_proc where proname='generated_interpretations_studio_facts'")).rows[0];
  assert.equal(fn.prosecdef, false);
  assert.deepEqual(fn.proconfig, ['search_path=""']);
} finally { await db.close(); }
console.log("Studio listing-facts SQL projection, idempotent migration, copy/version preservation and automatic refresh passed.");
