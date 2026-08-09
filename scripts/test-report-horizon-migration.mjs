#!/usr/bin/env node

import assert from "node:assert/strict";
import fs from "node:fs";
import { pathToFileURL } from "node:url";

const modulePath = process.env.REPORT_PGLITE_MODULE;
if (!modulePath) {
  throw new Error("REPORT_PGLITE_MODULE must point to @electric-sql/pglite/dist/index.js.");
}

const { PGlite } = await import(pathToFileURL(modulePath).href);
const db = new PGlite();
const horizonMigration = fs.readFileSync(
  new URL("../apps/web/supabase/migrations/20260809120000_report_horizon_types.sql", import.meta.url),
  "utf8"
);
const domainMigration = fs.readFileSync(
  new URL("../apps/web/supabase/migrations/20260809130000_report_domains.sql", import.meta.url),
  "utf8"
);
const legacyTypes = ["report_1_month", "report_4_months", "report_6_months", "report_12_months"];

await db.exec(`
  create table public.user_reports (
    id text primary key,
    user_id text not null,
    report_type text not null,
    subject_id text,
    period_start date not null,
    period_end date not null,
    constraint user_reports_report_type_check
      check (report_type in ('year_ahead', 'relationship', 'saturn_return'))
  );
  create unique index user_reports_unique_period_idx
    on public.user_reports (user_id, report_type, subject_id, period_start)
    nulls not distinct;
`);

await db.exec("begin");
try {
  await db.exec(horizonMigration);
  for (const [index, reportType] of legacyTypes.entries()) {
    await db.query(
      `insert into public.user_reports
        (id, user_id, report_type, subject_id, period_start, period_end)
       values ($1, $2, $3, $4, $5, $6)`,
      [`fixture-${index}`, `user-${index}`, reportType, "subject", "2026-02-18", "2027-02-17"]
    );
  }

  await db.exec(domainMigration);
  const backfilled = await db.query(`
    select report_type, report_domain, report_horizon
    from public.user_reports
    order by report_horizon
  `);
  assert.equal(backfilled.rows.length, 4);
  assert.ok(backfilled.rows.every((row) => row.report_type === "report" && row.report_domain === "general"));
  assert.deepEqual(
    backfilled.rows.map((row) => row.report_horizon).sort(),
    ["1_month", "4_months", "6_months", "12_months"].sort()
  );

  for (const [index, domain] of ["general", "work_money"].entries()) {
    await db.query(
      `insert into public.user_reports
        (id, user_id, report_type, report_domain, report_horizon, subject_id, period_start, period_end)
       values ($1, 'dual-user', 'report', $2, '12_months', 'dual-subject', '2026-02-18', '2027-02-17')`,
      [`dual-${index}`, domain]
    );
  }
  assert.equal(
    Number((await db.query("select count(*)::int as count from public.user_reports where user_id = 'dual-user'")).rows[0].count),
    2,
    "General and Work & Money must coexist as separate envelopes for one user/window."
  );

  for (const statement of [
    "insert into public.user_reports values ('bad-domain', 'u', 'report', 's', '2026-01-01', '2026-02-01', 'love', '1_month')",
    "insert into public.user_reports (id, user_id, report_type, subject_id, period_start, period_end) values ('missing-dims', 'u', 'report', 's', '2026-01-01', '2026-02-01')",
    "insert into public.user_reports (id, user_id, report_type, subject_id, period_start, period_end, report_domain, report_horizon) values ('wrong-dims', 'u', 'relationship', 's', '2026-01-01', '2026-02-01', 'general', '1_month')"
  ]) {
    await db.exec("savepoint invalid_row");
    let invalidError;
    try {
      await db.exec(statement);
    } catch (error) {
      invalidError = error;
    }
    assert.ok(invalidError, `Expected report dimension constraint failure: ${statement}`);
    await db.exec("rollback to savepoint invalid_row");
    await db.exec("release savepoint invalid_row");
  }

  await db.exec("rollback");
} catch (error) {
  await db.exec("rollback").catch(() => undefined);
  throw error;
}

const columns = await db.query(`
  select column_name from information_schema.columns
  where table_schema = 'public' and table_name = 'user_reports'
`);
assert.ok(!columns.rows.some((row) => row.column_name === "report_domain"));
await assert.rejects(() => db.exec(`
  insert into public.user_reports
    (id, user_id, report_type, subject_id, period_start, period_end)
  values ('rolled-back', 'u', 'report_1_month', 's', '2026-01-01', '2026-02-01')
`));
await db.close();

console.log("report domain migration backfill, dual-envelope identity, constraints, and rollback passed");
