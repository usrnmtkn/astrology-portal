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
const migration = fs.readFileSync(
  new URL("../apps/web/supabase/migrations/20260809120000_report_horizon_types.sql", import.meta.url),
  "utf8"
);
const horizonTypes = [
  "report_1_month",
  "report_4_months",
  "report_6_months",
  "report_12_months"
];

await db.exec(`
  create table public.user_reports (
    id text primary key,
    report_type text not null,
    constraint user_reports_report_type_check
      check (report_type in ('year_ahead', 'relationship', 'saturn_return'))
  );
`);

await db.exec("begin");
try {
  await db.exec(migration);
  for (const [index, reportType] of horizonTypes.entries()) {
    await db.query(
      "insert into public.user_reports(id, report_type) values ($1, $2)",
      [`fixture-${index}`, reportType]
    );
  }
  assert.equal(
    Number((await db.query("select count(*)::int as count from public.user_reports")).rows[0].count),
    4
  );
  let invalidError;
  await db.exec("savepoint invalid_type");
  try {
    await db.exec("insert into public.user_reports(id, report_type) values ('invalid', 'report_2_months')");
  } catch (error) {
    invalidError = error;
  }
  await db.exec("rollback to savepoint invalid_type");
  await db.exec("release savepoint invalid_type");
  assert.ok(invalidError, "Unknown report horizons must fail the check constraint.");
  await db.exec("rollback");
} catch (error) {
  await db.exec("rollback").catch(() => undefined);
  throw error;
}

let rolledBackError;
try {
  await db.exec("insert into public.user_reports(id, report_type) values ('rolled-back', 'report_1_month')");
} catch (error) {
  rolledBackError = error;
}
assert.ok(rolledBackError, "Rollback must restore the prior report type constraint.");
await db.close();

console.log("report horizon migration dry-run passed and rolled back");
