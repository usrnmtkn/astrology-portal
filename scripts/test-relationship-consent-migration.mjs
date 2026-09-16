#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const modulePath = process.env.RELATIONSHIP_PGLITE_MODULE;

if (!modulePath) {
  throw new Error("RELATIONSHIP_PGLITE_MODULE must point to @electric-sql/pglite/dist/index.js.");
}

const { PGlite } = await import(pathToFileURL(modulePath).href);
const db = new PGlite();
const migration = fs.readFileSync(
  new URL("../apps/web/supabase/migrations/20260808122000_relationship_report_consent.sql", import.meta.url),
  "utf8"
);

const VIEWER = "00000000-0000-4000-8000-000000000001";
const FRIEND = "00000000-0000-4000-8000-000000000002";
const OTHER = "00000000-0000-4000-8000-000000000003";
const FRIENDSHIP = "00000000-0000-4000-8000-000000000004";
const MANUAL = "00000000-0000-4000-8000-000000000005";
const REPORT = "00000000-0000-4000-8000-000000000006";
const OTHER_REPORT = "00000000-0000-4000-8000-000000000007";

async function scalar(sql, params = []) {
  const result = await db.query(sql, params);
  const row = result.rows[0];

  return row ? Object.values(row)[0] : undefined;
}

async function expectSqlError(callback, pattern, message) {
  await db.exec("savepoint expected_error");
  let caught;

  try {
    await callback();
  } catch (error) {
    caught = error;
  }

  await db.exec("rollback to savepoint expected_error");
  await db.exec("release savepoint expected_error");
  assert.ok(caught, message);
  assert.match(String(caught?.message ?? caught), pattern, message);
}

await db.exec(`
  create role anon noinherit;
  create role authenticated noinherit;
  create role service_role noinherit bypassrls;
  create schema auth;
  create schema extensions;
  create table auth.users (id uuid primary key);
  create function auth.uid()
  returns uuid
  language sql
  stable
  as $$
    select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
  $$;

  create table public.social_friendships (
    id uuid primary key,
    user_low_id uuid not null,
    user_high_id uuid not null,
    low_shares_chart boolean not null default true,
    high_shares_chart boolean not null default true
  );
  create table public.social_blocks (
    blocker_user_id uuid not null,
    blocked_user_id uuid not null
  );
  create table public.manual_charts (
    id uuid primary key,
    owner_user_id uuid not null,
    claimed_by_user_id uuid
  );
  create table public.user_reports (
    id uuid primary key,
    user_id uuid not null,
    report_type text not null,
    subject_id text,
    period_start date not null,
    period_end date not null,
    facts jsonb not null,
    facts_engine text not null,
    status text not null,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
  );
  alter table public.user_reports enable row level security;
  create policy "Users can view their reports"
    on public.user_reports for select using (auth.uid() = user_id);
  grant select, insert, update, delete on public.user_reports to authenticated;
  grant select on public.user_reports to anon;

  insert into auth.users(id) values
    ('${VIEWER}'), ('${FRIEND}'), ('${OTHER}');
  insert into public.social_friendships(id, user_low_id, user_high_id, low_shares_chart, high_shares_chart)
    values ('${FRIENDSHIP}', '${VIEWER}', '${FRIEND}', true, false);
  insert into public.manual_charts(id, owner_user_id, claimed_by_user_id)
    values ('${MANUAL}', '${VIEWER}', null);
  insert into public.user_reports(id, user_id, report_type, subject_id, period_start, period_end, facts, facts_engine, status)
    values
      ('${REPORT}', '${VIEWER}', 'relationship', 'friendship:${FRIENDSHIP}', '2026-08-08', '2027-08-07', '{}', 'fixture', 'draft'),
      ('${OTHER_REPORT}', '${OTHER}', 'year_ahead', null, '2026-08-08', '2027-08-07', '{}', 'fixture', 'draft');
`);

await db.exec("begin");
try {
  await db.exec(migration);

  assert.equal(await scalar(
    "select public.can_read_chart_for_report($1::uuid, $2::text)",
    [VIEWER, `friendship:${FRIENDSHIP}`]
  ), false, "Paused friend sharing must deny report access.");

  await db.query("update public.social_friendships set high_shares_chart = true where id = $1", [FRIENDSHIP]);
  assert.equal(await scalar(
    "select public.can_read_chart_for_report($1::uuid, $2::text)",
    [VIEWER, `friendship:${FRIENDSHIP}`]
  ), true, "Resumed friend sharing must allow report access.");
  assert.equal(await scalar(
    "select public.can_read_chart_for_report($1::uuid, $2::text)",
    [VIEWER, `manual_chart:${MANUAL}`]
  ), true, "An owner's unclaimed manual chart must be allowed.");

  await db.query("update public.manual_charts set claimed_by_user_id = $1 where id = $2", [FRIEND, MANUAL]);
  assert.equal(await scalar(
    "select public.can_read_chart_for_report($1::uuid, $2::text)",
    [VIEWER, `manual_chart:${MANUAL}`]
  ), true, "A claimed manual chart remains eligible while the claimant shares with its owner.");
  await db.query("update public.social_friendships set high_shares_chart = false where id = $1", [FRIENDSHIP]);
  assert.equal(await scalar(
    "select public.can_read_chart_for_report($1::uuid, $2::text)",
    [VIEWER, `manual_chart:${MANUAL}`]
  ), false, "A claimant's paused sharing must revoke access to the claimed manual chart.");
  await db.query("update public.manual_charts set claimed_by_user_id = null where id = $1", [MANUAL]);
  await db.query("update public.social_friendships set high_shares_chart = true where id = $1", [FRIENDSHIP]);

  await db.exec(`set role authenticated; set "request.jwt.claim.sub" = '${VIEWER}';`);
  assert.equal(await scalar("select count(*)::int from public.user_reports"), 1,
    "Authenticated RLS must show only the viewer's currently consented report.");

  await expectSqlError(
    () => db.exec(`insert into public.user_reports(id,user_id,report_type,period_start,period_end,facts,facts_engine,status)
      values ('00000000-0000-4000-8000-000000000008','${VIEWER}','year_ahead','2026-08-08','2027-08-07','{}','fixture','draft')`),
    /row-level security|policy/iu,
    "The browser role must not create report envelopes."
  );
  await db.exec("reset role");

  await db.query("update public.social_friendships set high_shares_chart = false where id = $1", [FRIENDSHIP]);
  await db.exec(`set role authenticated; set "request.jwt.claim.sub" = '${VIEWER}';`);
  assert.equal(await scalar("select count(*)::int from public.user_reports"), 0,
    "Paused sharing must hide an already-stored relationship envelope.");
  await db.exec("reset role");

  await db.query("update public.social_friendships set high_shares_chart = true where id = $1", [FRIENDSHIP]);
  await db.query("delete from public.social_friendships where id = $1", [FRIENDSHIP]);
  await db.exec(`set role authenticated; set "request.jwt.claim.sub" = '${VIEWER}';`);
  assert.equal(await scalar("select count(*)::int from public.user_reports"), 0,
    "Unfriending must hide an already-stored relationship envelope.");
  await db.exec("reset role");

  await db.exec(`set role anon; set "request.jwt.claim.sub" = '';`);
  await expectSqlError(
    () => db.query("select public.can_read_chart_for_report($1::uuid, $2::text)", [VIEWER, `manual_chart:${MANUAL}`]),
    /permission denied/iu,
    "Anonymous callers must not execute the consent helper."
  );
  await db.exec("reset role");

  await db.exec("rollback");
} catch (error) {
  await db.exec("rollback").catch(() => undefined);
  await db.exec("reset role").catch(() => undefined);
  throw error;
} finally {
  await db.close();
}

console.log("relationship consent migration dry-run and RLS checks passed with rollback");
