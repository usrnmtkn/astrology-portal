#!/usr/bin/env node
import assert from "node:assert/strict";

import {
  ReportFactsFrozenError,
  createReportEnvelope,
  fetchReportEnvelope,
  listReportUnits,
  reportUnitPrefix
} from "../api/_lib/report-envelope.ts";

class MemoryReportEnvelopeStore {
  reports = [];
  units = [];

  async findReport(identity) {
    return this.reports.find((report) => (
      report.user_id === identity.userId
      && report.report_type === identity.reportType
      && report.report_domain === (identity.reportDomain ?? null)
      && report.report_horizon === (identity.reportHorizon ?? null)
      && report.subject_id === identity.subjectId
      && report.period_start === identity.periodStart
    )) ?? null;
  }

  async findReusableFacts() {
    return null;
  }

  async insertReport(input) {
    const timestamp = "2026-08-08T12:00:00.000Z";
    const report = {
      id: `report-${this.reports.length + 1}`,
      user_id: input.userId,
      report_type: input.reportType,
      report_domain: input.reportDomain ?? null,
      report_horizon: input.reportHorizon ?? null,
      subject_id: input.subjectId,
      period_start: input.periodStart,
      period_end: input.periodEnd,
      facts: structuredClone(input.facts),
      facts_engine: input.factsEngine,
      status: input.status ?? "draft",
      created_at: timestamp,
      updated_at: timestamp
    };
    this.reports.push(report);
    return structuredClone(report);
  }

  async regenerateReport(id, input) {
    const report = this.reports.find((candidate) => candidate.id === id);
    assert.ok(report);
    report.period_end = input.periodEnd;
    report.facts = structuredClone(input.facts);
    report.facts_engine = input.factsEngine;
    report.status = input.status ?? "draft";
    report.updated_at = "2026-08-08T12:30:00.000Z";
    return structuredClone(report);
  }

  async listUnits(userId, prefix) {
    return structuredClone(this.units.filter((unit) => (
      unit.user_id === userId && unit.content_key.startsWith(prefix)
    )));
  }
}

const store = new MemoryReportEnvelopeStore();
const input = {
  userId: "user-1",
  reportType: "year_ahead",
  subjectId: null,
  periodStart: "2027-01-01",
  periodEnd: "2027-12-31",
  facts: { engineVersion: "2026.08", placements: [{ body: "Saturn", degree: 12.5 }] },
  factsEngine: "tldrastro-api@2026.08"
};

const created = await createReportEnvelope(store, input);
assert.equal(created.id, "report-1");
assert.deepEqual((await fetchReportEnvelope(store, input))?.facts, input.facts);

input.facts.placements[0].degree = 13;
assert.equal(created.facts.placements[0].degree, 12.5, "Stored facts must not retain a mutable caller reference.");

await assert.rejects(
  () => createReportEnvelope(store, { ...input, facts: { ...input.facts, changed: true } }),
  (error) => error instanceof ReportFactsFrozenError && error.reportId === created.id
);

const prefix = reportUnitPrefix(created.id);
store.units.push(
  {
    id: "unit-2",
    user_id: "user-1",
    subject_type: "year_ahead_season",
    subject_id: created.id,
    content_key: `${prefix}season:2`,
    status: "DRAFT",
    body: "FIXTURE_ONLY_UNIT_TWO"
  },
  {
    id: "unit-1",
    user_id: "user-1",
    subject_type: "year_ahead_season",
    subject_id: created.id,
    content_key: `${prefix}season:1`,
    status: "DRAFT",
    body: "FIXTURE_ONLY_UNIT_ONE"
  },
  {
    id: "other-report-unit",
    user_id: "user-1",
    subject_type: "year_ahead_season",
    subject_id: "report-2",
    content_key: "report:report-2:season:1",
    status: "DRAFT",
    body: "FIXTURE_ONLY_OTHER_REPORT"
  }
);

const units = await listReportUnits(store, { userId: "user-1", reportId: created.id });
assert.deepEqual(units.map((unit) => unit.id), ["unit-1", "unit-2"]);

const regenerated = await createReportEnvelope(
  store,
  { ...input, facts: { engineVersion: "2026.09", placements: [] }, factsEngine: "tldrastro-api@2026.09" },
  { regenerate: true }
);
assert.deepEqual(regenerated.facts, { engineVersion: "2026.09", placements: [] });
assert.equal(regenerated.facts_engine, "tldrastro-api@2026.09");

console.log("report envelope round-trip, facts freeze, regeneration, and child-unit checks passed");
