#!/usr/bin/env node

import assert from "node:assert/strict";
import fs from "node:fs";
import { pathToFileURL } from "node:url";

const modulePath = process.env.REPORT_PGLITE_MODULE;
if (!modulePath) throw new Error("REPORT_PGLITE_MODULE must point to @electric-sql/pglite/dist/index.js.");
const { PGlite } = await import(pathToFileURL(modulePath).href);
const db = new PGlite();
await db.exec(`
  create role anon;
  create role authenticated;
  create role service_role;
  create schema auth;
  create table auth.users (id uuid primary key);
  create function auth.uid() returns uuid language sql stable as 'select null::uuid';
  create table public.user_reports (
    id uuid primary key default gen_random_uuid(), user_id uuid not null, report_type text not null,
    report_domain text, report_horizon text, subject_id uuid, period_start date not null, period_end date not null,
    facts jsonb not null default '{}'::jsonb, facts_engine text not null, status text not null default 'draft',
    created_at timestamptz not null default now(), updated_at timestamptz not null default now()
  );
  create unique index user_reports_unique_period_idx on public.user_reports
    (user_id, report_type, report_domain, report_horizon, subject_id, period_start) nulls not distinct;
`);
const migration = fs.readFileSync(new URL("../apps/web/supabase/migrations/20260809150000_report_fulfillment.sql", import.meta.url), "utf8");
const personalHealthMigration = fs.readFileSync(new URL("../apps/web/supabase/migrations/20260809160000_personal_health_report_domain.sql", import.meta.url), "utf8");
const compMigration = fs.readFileSync(new URL("../apps/web/supabase/migrations/20260810120000_comp_report_entitlements.sql", import.meta.url), "utf8");
const accountingMigration = fs.readFileSync(new URL("../apps/web/supabase/migrations/20260810130000_report_call_accounting.sql", import.meta.url), "utf8");
await db.exec("begin");
try {
  await db.exec(migration);
  await db.exec(personalHealthMigration);
  await db.exec(compMigration);
  await db.exec(accountingMigration);
  const userId = "00000000-0000-0000-0000-000000000001";
  await db.query("insert into auth.users (id) values ($1)", [userId]);
  await db.query(`insert into public.report_entitlements
    (user_id, product_key, report_domain, report_horizon, window_anchor, period_start, period_end, status, stripe_event_id, stripe_checkout_session_id, purchased_at)
    values ($1, 'general_1m', 'general', '1_month', 'purchase', '2026-08-09', '2026-09-08', 'active', 'evt_1', 'cs_1', now())`, [userId]);
  await db.exec("savepoint duplicate_event");
  await assert.rejects(db.query(`insert into public.report_entitlements
    (user_id, product_key, report_domain, report_horizon, window_anchor, period_start, period_end, status, stripe_event_id, stripe_checkout_session_id, purchased_at)
    values ($1, 'general_1m', 'general', '1_month', 'purchase', '2026-08-09', '2026-09-08', 'active', 'evt_1', 'cs_2', now())`, [userId]));
  await db.exec("rollback to savepoint duplicate_event");
  await db.exec("release savepoint duplicate_event");
  assert.equal(Number((await db.query("select count(*)::int count from public.user_reports")).rows[0].count), 1);
  assert.equal(Number((await db.query("select count(*)::int count from public.report_fulfillment_jobs")).rows[0].count), 1);
  assert.equal((await db.query("select source from public.report_entitlements where stripe_event_id = 'evt_1'")).rows[0].source, "stripe");
  assert.ok((await db.query("select fulfillment_timestamps ? 'awaiting_authorization' as recorded from public.user_reports limit 1")).rows[0].recorded);
  assert.equal((await db.query("select state from public.report_fulfillment_jobs limit 1")).rows[0].state, "paused");
  assert.equal((await db.query("select public.claim_report_facts_window('fixture-window', $1, 'worker-1') as claimed", [userId])).rows[0].claimed, true);
  assert.equal((await db.query("select public.claim_report_facts_window('fixture-window', $1, 'worker-2') as claimed", [userId])).rows[0].claimed, false);
  const awaitingId = "00000000-0000-0000-0000-000000000002";
  await db.query(`insert into public.report_entitlements
    (id, user_id, product_key, report_domain, report_horizon, window_anchor, period_start, period_end, requires_birth_time, status, stripe_event_id, stripe_checkout_session_id, purchased_at)
    values ($1, $2, 'love_connection_12m', 'love_connection', '12_months', 'solar_return_display', '2026-02-18', '2027-02-17', true, 'awaiting_birth_data', 'evt_2', 'cs_3', now())`, [awaitingId, userId]);
  assert.equal(Number((await db.query("select count(*)::int count from public.report_fulfillment_jobs")).rows[0].count), 1, "Awaiting birth data must not enqueue.");
  assert.equal((await db.query("select fulfillment_status from public.user_reports where entitlement_id = $1", [awaitingId])).rows[0].fulfillment_status, "awaiting_birth_data");
  assert.ok((await db.query("select fulfillment_timestamps ? 'awaiting_birth_data' as recorded from public.user_reports where entitlement_id = $1", [awaitingId])).rows[0].recorded);
  await db.query(`insert into public.report_entitlements
    (user_id, product_key, report_domain, report_horizon, window_anchor, period_start, period_end, requires_birth_time, status, stripe_event_id, stripe_checkout_session_id, purchased_at)
    values ($1, 'personal_health_12m', 'personal_health', '12_months', 'solar_return_display', '2026-02-18', '2027-02-17', true, 'active', 'evt_3', 'cs_4', now())`, [userId]);
  assert.equal(Number((await db.query("select count(*)::int count from public.user_reports where report_domain = 'personal_health'")).rows[0].count), 1);

  const compId = "00000000-0000-0000-0000-000000000003";
  await db.query(`insert into public.report_entitlements
    (id, user_id, product_key, report_domain, report_horizon, window_anchor, selected_start, period_start, period_end, requires_birth_time, status, source, purchased_at)
    values ($1, $2, 'work_money_4m', 'work_money', '4_months', 'selected', '2027-01-01', '2027-01-01', '2027-04-30', true, 'active', 'comp', now())`, [compId, userId]);
  const comp = (await db.query("select source, stripe_event_id, stripe_checkout_session_id from public.report_entitlements where id = $1", [compId])).rows[0];
  assert.deepEqual(comp, { source: "comp", stripe_event_id: null, stripe_checkout_session_id: null });
  const compReport = (await db.query("select id, fulfillment_status from public.user_reports where entitlement_id = $1", [compId])).rows[0];
  assert.equal(compReport.fulfillment_status, "awaiting_authorization");
  const compJob = (await db.query("select id, state from public.report_fulfillment_jobs where entitlement_id = $1", [compId])).rows[0];
  assert.equal(compJob.state, "paused");
  await db.exec("savepoint duplicate_comp");
  await assert.rejects(db.query(`insert into public.report_entitlements
    (user_id, product_key, report_domain, report_horizon, window_anchor, selected_start, period_start, period_end, requires_birth_time, status, source, purchased_at)
    values ($1, 'work_money_4m', 'work_money', '4_months', 'selected', '2027-01-01', '2027-01-01', '2027-04-30', true, 'active', 'comp', now())`, [userId]));
  await db.exec("rollback to savepoint duplicate_comp");
  await db.exec("release savepoint duplicate_comp");

  const authorizationToken = "00000000-0000-0000-0000-000000000099";
  await db.query("update public.report_fulfillment_jobs set state = 'queued', authorization_token = $1, authorized_call_budget = 2 where id = $2", [authorizationToken, compJob.id]);
  await db.query("update public.user_reports set fulfillment_status = 'queued' where id = $1", [compReport.id]);
  const claimed = (await db.query("select * from public.claim_report_fulfillment_jobs('fixture-worker', 10)")).rows.find((row) => row.id === compJob.id);
  assert.ok(claimed, "An authorized queued comp report must be claimable.");
  const firstCall = (await db.query("select public.begin_report_fulfillment_call($1, $2, 'openai', 'gpt-5.6-sol', 'fixture_draft') as begun", [compJob.id, authorizationToken])).rows[0].begun;
  assert.equal(firstCall.callNumber, 1);
  assert.equal((await db.query("select public.finish_report_fulfillment_call($1, 'complete', 100, 20, 10, 110, 0.00079, 'resp_fixture', null) as finished", [firstCall.callId])).rows[0].finished, true);
  assert.equal(Number((await db.query("select token_count_total from public.user_reports where id = $1", [compReport.id])).rows[0].token_count_total), 110);
  assert.equal(Number((await db.query("select token_spend_usd_estimate from public.user_reports where id = $1", [compReport.id])).rows[0].token_spend_usd_estimate), 0.00079);
  const secondCall = (await db.query("select public.begin_report_fulfillment_call($1, $2, 'openai', 'gpt-5.6-sol', 'fixture_critique') as begun", [compJob.id, authorizationToken])).rows[0].begun;
  assert.equal(secondCall.callNumber, 2);
  assert.equal((await db.query("select public.finish_report_fulfillment_call($1, 'error', 0, 0, 0, 0, 0, null, 'FIXTURE_ONLY') as finished", [secondCall.callId])).rows[0].finished, true);
  assert.equal((await db.query("select public.finish_report_fulfillment_call($1, 'error', 0, 0, 0, 0, 0, null, 'MUTATION') as finished", [secondCall.callId])).rows[0].finished, false, "A terminal ledger row must be immutable.");
  await db.exec("savepoint exhausted_budget");
  await assert.rejects(db.query("select public.begin_report_fulfillment_call($1, $2, 'openai', 'gpt-5.6-sol', 'fixture_extra')", [compJob.id, authorizationToken]), /REPORT_CALL_AUTHORIZATION_REQUIRED/u);
  await db.exec("rollback to savepoint exhausted_budget");
  await db.exec("release savepoint exhausted_budget");
  await db.exec("rollback");
} catch (error) {
  await db.exec("rollback");
  throw error;
}
console.log("Report fulfillment migration passed: Stripe idempotency, comp grants without Stripe references, authorization parking, immutable call ledger/accounting, atomic call-budget exhaustion, birth-data parking, exclusive facts claim, and rollback.");
