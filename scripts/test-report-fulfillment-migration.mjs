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
  create table public.user_profiles (user_id uuid primary key, data jsonb not null default '{}'::jsonb, updated_at timestamptz not null default now());
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
const birthTimeMigration = fs.readFileSync(new URL("../apps/web/supabase/migrations/20260810210000_birth_time_normalization.sql", import.meta.url), "utf8");
const passingUnitCacheMigration = fs.readFileSync(new URL("../apps/web/supabase/migrations/20260811010000_report_passing_unit_cache.sql", import.meta.url), "utf8");
const authorizationTokenBudgetMigration = fs.readFileSync(new URL("../apps/web/supabase/migrations/20260811120000_report_authorization_token_budget.sql", import.meta.url), "utf8");
const deadlineWorkerRecoveryMigration = fs.readFileSync(new URL("../apps/web/supabase/migrations/20260811130000_report_deadline_worker_recovery.sql", import.meta.url), "utf8");
const validatorSpliceRecoveryMigration = fs.readFileSync(new URL("../apps/web/supabase/migrations/20260811140000_report_validator_splice_recovery.sql", import.meta.url), "utf8");
assert.match(authorizationTokenBudgetMigration, /74951c07-64fe-461d-ac49-e81858af3296/u, "The migration must carry the owner ruling for the exact Production report.");
assert.match(authorizationTokenBudgetMigration, /token_budget_lifetime = 3000000/u, "The exact Production report must receive its owner-approved 3M lifetime backstop.");
assert.match(authorizationTokenBudgetMigration, /set authorized_call_budget = 55,[\s\S]*authorized_token_budget = 1450000/u, "The current authorization must retain its approved 55-call and 1.45M-token budgets.");
assert.match(deadlineWorkerRecoveryMigration, /call_number = 37[\s\S]*state = 'interrupted'/u, "The observed zero-token call 37 must be closed as interrupted.");
assert.match(deadlineWorkerRecoveryMigration, /token_budget_lifetime = 4500000/u, "The exact Production report must receive its owner-approved 4.5M lifetime backstop.");
assert.match(deadlineWorkerRecoveryMigration, /authorized_call_budget = 55[\s\S]*authorized_token_budget = 2500000/u, "The existing authorization must retain 55 calls while receiving the 2.5M scoped token budget.");
assert.match(validatorSpliceRecoveryMigration, /authorized_call_budget = 85[\s\S]*authorized_token_budget = 4000000/u, "The current authorization must extend to 85 calls and 4M scoped tokens.");
assert.match(validatorSpliceRecoveryMigration, /token_budget_lifetime = 6000000/u, "The exact Production report must receive its owner-approved 6M lifetime backstop.");
assert.match(validatorSpliceRecoveryMigration, /validator_attempt_overrides->>'summer' = '5'/u, "Only Summer receives the owner-approved five-attempt cap.");
await db.exec("begin");
try {
  const userId = "00000000-0000-0000-0000-000000000001";
  await db.exec(migration);
  await db.exec(personalHealthMigration);
  await db.exec(compMigration);
  await db.exec(accountingMigration);
  await db.query("insert into public.user_profiles (user_id, data) values ($1, $2::jsonb)", [userId, JSON.stringify({ profile: { charts: [
    { name: "Marie", birthTime: "11:20 aM" },
    { name: "Compact", birthTime: "1120" },
    { name: "Dot", birthTime: "11.20" },
    { name: "Database", birthTime: "21:05:00" },
    { name: "Unknown", birthTime: "Time unknown" }
  ] } })]);
  await db.exec(birthTimeMigration);
  await db.exec(passingUnitCacheMigration);
  const normalizedCharts = (await db.query("select data -> 'profile' -> 'charts' as charts from public.user_profiles where user_id = $1", [userId])).rows[0].charts;
  assert.deepEqual(normalizedCharts.map((chart) => chart.birthTime), ["11:20", "11:20", "11:20", "21:05", "Time unknown"]);
  await db.exec("savepoint invalid_birth_time");
  await assert.rejects(db.query("update public.user_profiles set data = $2::jsonb where user_id = $1", [userId, JSON.stringify({ profile: { charts: [{ birthTime: "not a time" }] } })]), /Enter a valid birth time/u);
  await db.exec("rollback to savepoint invalid_birth_time");
  await db.exec("release savepoint invalid_birth_time");
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
  assert.deepEqual((await db.query("select passing_unit_cache from public.report_fulfillment_jobs where id = $1", [compJob.id])).rows[0].passing_unit_cache, {});
  await db.query("update public.report_fulfillment_jobs set passing_unit_cache = $2::jsonb where id = $1", [compJob.id, JSON.stringify({ overview: { schema: "report-passing-unit-cache.v1", body: "FIXTURE_ONLY" } })]);
  assert.equal((await db.query("select passing_unit_cache -> 'overview' ->> 'body' as body from public.report_fulfillment_jobs where id = $1", [compJob.id])).rows[0].body, "FIXTURE_ONLY");
  await db.exec("savepoint invalid_passing_unit_cache");
  await assert.rejects(db.query("update public.report_fulfillment_jobs set passing_unit_cache = '[]'::jsonb where id = $1", [compJob.id]));
  await db.exec("rollback to savepoint invalid_passing_unit_cache");
  await db.exec("release savepoint invalid_passing_unit_cache");
  await db.query("update public.report_fulfillment_jobs set passing_unit_cache = '{}'::jsonb where id = $1", [compJob.id]);
  await db.query("update public.report_fulfillment_jobs set state = 'queued' where id = $1", [compJob.id]);
  const immediateClaim = (await db.query("select * from public.claim_report_fulfillment_job('authorize-worker', $1)", [compJob.id])).rows[0];
  assert.equal(immediateClaim.id, compJob.id);
  assert.equal(immediateClaim.attempt, 1);
  await db.query("update public.report_fulfillment_jobs set state = 'paused', attempt = 0, locked_at = null, locked_by = null where id = $1", [compJob.id]);
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
  await db.exec(authorizationTokenBudgetMigration);
  const scoped = (await db.query("select model_call_count, authorization_call_count, authorized_call_budget, authorized_token_budget, authorization_token_count from public.report_fulfillment_jobs where id = $1", [compJob.id])).rows[0];
  assert.deepEqual({
    modelCallCount: scoped.model_call_count,
    authorizationCallCount: scoped.authorization_call_count,
    authorizedCallBudget: scoped.authorized_call_budget,
    authorizedTokenBudget: Number(scoped.authorized_token_budget),
    authorizationTokenCount: Number(scoped.authorization_token_count)
  }, {
    modelCallCount: 2,
    authorizationCallCount: 2,
    authorizedCallBudget: 2,
    authorizedTokenBudget: 1_450_000,
    authorizationTokenCount: 110
  }, "The active authorization must count only its own calls and tokens while lifetime numbering remains intact.");
  const replacementToken = "00000000-0000-0000-0000-000000000098";
  await db.query(`update public.report_fulfillment_jobs
    set authorization_token = $1, authorized_call_budget = 1, authorization_call_count = 0,
        authorized_token_budget = 1450000, authorization_token_count = 0, authorization_consumed_at = null
    where id = $2`, [replacementToken, compJob.id]);
  const replacementCall = (await db.query("select public.begin_report_fulfillment_call($1, $2, 'openai', 'gpt-5.6-sol', 'fixture_replacement') as begun", [compJob.id, replacementToken])).rows[0].begun;
  assert.equal(replacementCall.callNumber, 3, "A replacement authorization must retain lifetime ledger numbering.");
  assert.equal(replacementCall.authorizationCallNumber, 1, "A replacement authorization receives a fresh scoped call counter.");
  assert.equal((await db.query("select public.finish_report_fulfillment_call($1, 'complete', 5, 0, 0, 5, 0.00001, 'resp_replacement', null) as finished", [replacementCall.callId])).rows[0].finished, true);
  assert.equal(Number((await db.query("select authorization_token_count from public.report_fulfillment_jobs where id = $1", [compJob.id])).rows[0].authorization_token_count), 5);
  assert.equal(Number((await db.query("select token_count_total from public.user_reports where id = $1", [compReport.id])).rows[0].token_count_total), 115, "Lifetime accounting must retain prior-authorization spend.");
  await db.exec("savepoint exhausted_budget");
  await assert.rejects(db.query("select public.begin_report_fulfillment_call($1, $2, 'openai', 'gpt-5.6-sol', 'fixture_extra')", [compJob.id, replacementToken]), /REPORT_CALL_AUTHORIZATION_REQUIRED/u);
  await db.exec("rollback to savepoint exhausted_budget");
  await db.exec("release savepoint exhausted_budget");

  const recoveryEntitlementId = "9c751439-2038-43ee-9653-827ddd38828b";
  const recoveryReportId = "74951c07-64fe-461d-ac49-e81858af3296";
  const recoveryJobId = "1e6633f3-7ac3-4326-ba35-ae21474b45dd";
  const recoveryAuthorizationToken = "00000000-0000-0000-0000-000000000097";
  await db.query(`insert into public.report_entitlements
    (id, user_id, product_key, report_domain, report_horizon, window_anchor, selected_start, period_start, period_end, requires_birth_time, status, source, purchased_at)
    values ($1, $2, 'general_12m', 'general', '12_months', 'selected', '2026-02-18', '2026-02-18', '2027-02-17', true, 'active', 'comp', now())`, [recoveryEntitlementId, userId]);
  const generatedRecoveryReport = (await db.query("select id from public.user_reports where entitlement_id = $1", [recoveryEntitlementId])).rows[0];
  await db.query("delete from public.report_fulfillment_jobs where report_id = $1", [generatedRecoveryReport.id]);
  await db.query(`update public.user_reports
    set id = $1, fulfillment_status = 'writing', token_count_total = 2050321, token_budget_lifetime = 3000000
    where id = $2`, [recoveryReportId, generatedRecoveryReport.id]);
  await db.query(`insert into public.report_fulfillment_jobs
    (id, report_id, entitlement_id, state, step, attempt, run_after, locked_at, locked_by,
     authorization_token, authorized_call_budget, model_call_count, authorization_consumed_at,
     authorization_call_count, authorized_token_budget, authorization_token_count)
    values ($1, $2, $3, 'running', 'writing', 2, now(), '2026-08-11T06:10:48Z', 'report-worker-fixture',
            $4, 55, 37, '2026-08-11T05:25:47Z', 15, 1450000, 793038)`,
    [recoveryJobId, recoveryReportId, recoveryEntitlementId, recoveryAuthorizationToken]);
  await db.query(`insert into public.report_model_calls
    (report_id, job_id, call_number, authorization_token, provider, model, schema_name, state, created_at)
    values ($1, $2, 37, $3, 'openai', 'gpt-5.6-sol', 'report_unit_draft', 'authorized', '2026-08-11T06:15:03Z')`,
    [recoveryReportId, recoveryJobId, recoveryAuthorizationToken]);

  await db.exec(deadlineWorkerRecoveryMigration);
  const recoveredCall = (await db.query("select state, total_tokens, error, completed_at is not null as closed from public.report_model_calls where job_id = $1 and call_number = 37", [recoveryJobId])).rows[0];
  assert.deepEqual({ state: recoveredCall.state, totalTokens: Number(recoveredCall.total_tokens), closed: recoveredCall.closed }, {
    state: "interrupted", totalTokens: 0, closed: true
  }, "The Production-shaped orphaned call must close without inventing usage.");
  assert.match(recoveredCall.error, /^VERCEL_RUNTIME_TIMEOUT:/u);
  assert.equal(Number((await db.query("select token_budget_lifetime from public.user_reports where id = $1", [recoveryReportId])).rows[0].token_budget_lifetime), 4_500_000);
  const recoveredJob = (await db.query(`select state, step, locked_at, locked_by, last_error,
    model_call_count, authorized_call_budget, authorization_call_count, authorized_token_budget, authorization_token_count
    from public.report_fulfillment_jobs where id = $1`, [recoveryJobId])).rows[0];
  assert.deepEqual({
    state: recoveredJob.state,
    step: recoveredJob.step,
    lockedAt: recoveredJob.locked_at,
    lockedBy: recoveredJob.locked_by,
    lastError: recoveredJob.last_error,
    modelCallCount: recoveredJob.model_call_count,
    callBudget: recoveredJob.authorized_call_budget,
    scopedCalls: recoveredJob.authorization_call_count,
    tokenBudget: Number(recoveredJob.authorized_token_budget),
    scopedTokens: Number(recoveredJob.authorization_token_count)
  }, {
    state: "queued", step: "writing", lockedAt: null, lockedBy: null, lastError: null,
    modelCallCount: 37, callBudget: 55, scopedCalls: 15, tokenBudget: 2_500_000, scopedTokens: 793_038
  }, "Recovery must preserve authorization identity and counters while only changing the owner-ruled budgets and queue state.");

  await db.exec(`create table public.user_generated_interpretations (
    content_key text not null, subject_type text not null, subject_id text not null,
    source_snapshot jsonb not null default '{}'::jsonb
  )`);
  for (const unitId of ["overview", "year-theme", "domain:main", "winter-current", "spring"]) {
    await db.query(`insert into public.user_generated_interpretations
      (content_key, subject_type, subject_id, source_snapshot)
      values ($1, 'report_unit', $2, '{"fulfillmentPassed":true}'::jsonb)`,
    [`report:${recoveryReportId}:${unitId}`, recoveryReportId]);
  }
  await db.query(`update public.user_reports
    set fulfillment_status = 'exception', token_count = 879475,
        token_count_total = 3339047, token_budget_lifetime = 4500000
    where id = $1`, [recoveryReportId]);
  await db.query(`update public.report_fulfillment_jobs
    set state = 'exception', step = 'validating', attempt = 7,
        model_call_count = 65, authorized_call_budget = 55,
        authorization_call_count = 43, authorized_token_budget = 2500000,
        authorization_token_count = 2081764,
        last_error = 'Validator attempt cap exhausted for summer: FIXTURE_ONLY'
    where id = $1`, [recoveryJobId]);
  await db.exec(validatorSpliceRecoveryMigration);
  const validatorRecoveryReport = (await db.query(`select fulfillment_status, token_count, token_count_total, token_budget_lifetime
    from public.user_reports where id = $1`, [recoveryReportId])).rows[0];
  assert.deepEqual({
    status: validatorRecoveryReport.fulfillment_status,
    acceptedTokens: Number(validatorRecoveryReport.token_count),
    totalTokens: Number(validatorRecoveryReport.token_count_total),
    lifetimeCap: Number(validatorRecoveryReport.token_budget_lifetime)
  }, { status: "writing", acceptedTokens: 879475, totalTokens: 3339047, lifetimeCap: 6000000 });
  const validatorRecoveryJob = (await db.query(`select state, step, attempt, model_call_count,
    authorization_token, authorized_call_budget, authorization_call_count,
    authorized_token_budget, authorization_token_count, validator_attempt_overrides
    from public.report_fulfillment_jobs where id = $1`, [recoveryJobId])).rows[0];
  assert.deepEqual({
    state: validatorRecoveryJob.state,
    step: validatorRecoveryJob.step,
    attempt: validatorRecoveryJob.attempt,
    modelCallCount: validatorRecoveryJob.model_call_count,
    authorizationToken: validatorRecoveryJob.authorization_token,
    callBudget: validatorRecoveryJob.authorized_call_budget,
    scopedCalls: validatorRecoveryJob.authorization_call_count,
    tokenBudget: Number(validatorRecoveryJob.authorized_token_budget),
    scopedTokens: Number(validatorRecoveryJob.authorization_token_count),
    overrides: validatorRecoveryJob.validator_attempt_overrides
  }, {
    state: "queued", step: "writing", attempt: 7, modelCallCount: 65,
    authorizationToken: recoveryAuthorizationToken, callBudget: 85, scopedCalls: 43,
    tokenBudget: 4000000, scopedTokens: 2081764, overrides: { summer: 5 }
  }, "Validator recovery must preserve the authorization identity, counters, accounting, and five persisted units.");
  await db.exec("rollback");
} catch (error) {
  await db.exec("rollback");
  throw error;
}
console.log("Report fulfillment migration passed: Stripe idempotency, comp grants without Stripe references, authorization parking, authorization-scoped call/token budgets, owner-adjustable lifetime backstop, exact Production timeout and Summer-validator recovery, durable object-shaped passing-unit cache, immutable call ledger/accounting, atomic call-budget exhaustion, birth-data parking, exclusive facts claim, and rollback.");
