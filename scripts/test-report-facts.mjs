import assert from "node:assert/strict";
import fs from "node:fs";
import {
  composeReportFacts,
  createTldrAstroReportFactsClient
} from "../api/_lib/report-facts.ts";

class MemoryStore {
  reports = [];

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

  async findReusableFacts(input) {
    return this.reports.find((report) => (
      report.user_id === input.userId
      && report.report_type === "report"
      && report.report_horizon === input.reportHorizon
      && report.subject_id === input.subjectId
      && report.period_start === input.periodStart
      && report.period_end === input.periodEnd
    )) ?? null;
  }

  async insertReport(input) {
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
      status: input.status,
      created_at: "2026-08-09T12:00:00Z",
      updated_at: "2026-08-09T12:00:00Z"
    };
    this.reports.push(report);
    return structuredClone(report);
  }

  async regenerateReport(id, input) {
    const report = this.reports.find((candidate) => candidate.id === id);
    Object.assign(report, {
      period_end: input.periodEnd,
      facts: structuredClone(input.facts),
      facts_engine: input.factsEngine,
      status: input.status,
      updated_at: "2026-08-09T12:30:00Z"
    });
    return structuredClone(report);
  }

  async listUnits() {
    return [];
  }
}

const natalSubject = {
  name: "FIXTURE_ONLY_SUBJECT",
  datetime: { date: "1979-02-18", time: "11:20", timeKnown: true, timeZone: "America/New_York" },
  location: { label: "FIXTURE_ONLY_LOCATION", latitude: 40.7128, longitude: -74.006, timeZone: "America/New_York" }
};
const input = {
  userId: "fixture-user",
  subjectId: "fixture-subject",
  natalSubject,
  location: natalSubject.location,
  reportDomain: "general",
  reportHorizon: "1_month",
  start: "2026-02-18T01:59:11Z",
  end: "2026-03-18T01:59:11Z"
};
const store = new MemoryStore();
let calls = 0;
const astroClient = {
  async serviceVersion() {
    return "fixture-version";
  },
  async reportWindow(request) {
    calls += 1;
    return {
      reportHorizon: request.reportHorizon,
      startsAt: request.start,
      endsAt: request.end,
      slowTransitArcs: [],
      lunarEvents: []
    };
  }
};

const created = await composeReportFacts(input, { envelopeStore: store, astroClient });
assert.equal(created.report_type, "report");
assert.equal(created.report_domain, "general");
assert.equal(created.report_horizon, "1_month");
assert.equal(created.facts_engine, "tldrastro-api@fixture-version");
assert.equal(created.status, "draft");
assert.equal(calls, 1);

const frozen = await composeReportFacts(input, { envelopeStore: store, astroClient });
assert.equal(frozen.id, created.id);
assert.equal(calls, 1, "Existing facts must be reused without a calculation call.");

const workMoney = await composeReportFacts(
  { ...input, reportDomain: "work_money" },
  { envelopeStore: store, astroClient }
);
assert.notEqual(workMoney.id, created.id, "Each purchased domain has its own envelope.");
assert.equal(workMoney.report_domain, "work_money");
assert.deepEqual(workMoney.facts, created.facts);
assert.equal(workMoney.facts_engine, created.facts_engine);
assert.equal(calls, 1, "A second domain for the same window must reuse the frozen calculation.");

const loveConnection = await composeReportFacts(
  { ...input, reportDomain: "love_connection" },
  { envelopeStore: store, astroClient }
);
assert.notEqual(loveConnection.id, created.id);
assert.notEqual(loveConnection.id, workMoney.id);
assert.equal(loveConnection.report_domain, "love_connection");
assert.deepEqual(loveConnection.facts, created.facts);
assert.equal(calls, 1, "A third domain for the same window must reuse the frozen calculation.");

await composeReportFacts({ ...input, regenerate: true }, { envelopeStore: store, astroClient });
assert.equal(calls, 2);

const fetchCalls = [];
const client = createTldrAstroReportFactsClient({
  baseUrl: "https://fixture.invalid/",
  fetchImpl: async (url, init) => {
    fetchCalls.push({ url, init });
    if (url.endsWith("/meta/status")) {
      return new Response(JSON.stringify({ version: "fixture-version" }), { status: 200 });
    }
    return new Response(JSON.stringify({ reportHorizon: "1_month" }), { status: 200 });
  }
});
assert.equal(await client.serviceVersion(), "fixture-version");
await client.reportWindow(input);
assert.equal(fetchCalls[1].url, "https://fixture.invalid/timing/report-window");
const sent = JSON.parse(fetchCalls[1].init.body);
assert.equal(sent.includeSolarReturn, false);
assert.equal(sent.includeContentFacts, false);

const endpoint = fs.readFileSync(new URL("../api/report-facts.ts", import.meta.url), "utf8");
assert.doesNotMatch(endpoint, /generateContent|api\.openai|api\.anthropic/iu);

console.log("report facts composition, freeze, regeneration, and no-provider endpoint checks passed");
