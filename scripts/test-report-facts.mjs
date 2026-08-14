import assert from "node:assert/strict";
import fs from "node:fs";
import {
  composeReportFacts,
  createTldrAstroReportFactsClient,
  normalizeReportFactDates
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
  location: { label: "FIXTURE_ONLY_LOCATION", latitude: 40.7831, longitude: -73.9712, timeZone: "America/New_York", coordinateSource: { provider: "owner_ruling_2026-08-14", sourceId: "manhattan-borough-centroid", resolution: "borough_centroid" } }
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
  async preflight() {},
  async serviceVersion() {
    return "fixture-version";
  },
  async reportWindow(request) {
    calls += 1;
    return {
      reportHorizon: request.reportHorizon,
      startsAt: request.start,
      endsAt: request.end,
      natal: { metadata: { ephemeris: { actualEngine: "swiss", fallback: false }, chartProvenance: { provenanceHash: "a".repeat(64) } } },
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

const personalHealth = await composeReportFacts(
  { ...input, reportDomain: "personal_health" },
  { envelopeStore: store, astroClient }
);
assert.notEqual(personalHealth.id, loveConnection.id);
assert.equal(personalHealth.report_domain, "personal_health");
assert.deepEqual(personalHealth.facts, created.facts);
assert.equal(calls, 1, "A fourth domain for the same window must reuse the frozen calculation.");

await composeReportFacts({ ...input, regenerate: true }, { envelopeStore: store, astroClient });
assert.equal(calls, 2);

const fetchCalls = [];
const client = createTldrAstroReportFactsClient({
  baseUrl: "https://fixture.invalid/",
  fetchImpl: async (url, init) => {
    fetchCalls.push({ url, init });
    if (url.endsWith("/meta/status")) {
      return new Response(JSON.stringify({
        version: "fixture-version",
        features: [
          { id: "timing.report_window", path: "/timing/report-window", method: "POST" },
          { id: "timing.solar_return", path: "/timing/solar-return", method: "POST" }
        ]
      }), { status: 200 });
    }
    if (init?.body === "{}") return new Response(JSON.stringify({ detail: [] }), { status: 422 });
    return new Response(JSON.stringify({
      reportHorizon: "1_month",
      slowTransitArcs: [{ passes: [{ exactAt: "2026-05-19T03:30:00Z" }] }]
    }), { status: 200 });
  }
});
await client.preflight();
assert.equal(await client.serviceVersion(), "fixture-version");
const normalizedWindow = await client.reportWindow(input);
assert.deepEqual(fetchCalls.slice(0, 3).map((call) => [call.init.method, call.url]), [
  ["GET", "https://fixture.invalid/meta/status"],
  ["POST", "https://fixture.invalid/timing/report-window"],
  ["POST", "https://fixture.invalid/timing/solar-return"]
]);
assert.equal(fetchCalls[4].url, "https://fixture.invalid/timing/report-window");
const sent = JSON.parse(fetchCalls[4].init.body);
assert.equal(sent.includeSolarReturn, false);
assert.equal(sent.includeContentFacts, false);
assert.equal("natalPointLongitudes" in sent, false, "Cached angles must never enter the canonical report calculation request.");
assert.equal(sent.natalSubject.location.coordinateSource.sourceId, "manhattan-borough-centroid");
assert.equal(normalizedWindow.slowTransitArcs[0].passes[0].exactAtDate, "2026-05-18",
  "All report prose dates must be normalized once through the report-location timezone.");
assert.equal(normalizeReportFactDates({ occursAt: "2026-10-07T02:10:26Z" }, "America/New_York").occursAtDate, "2026-10-06");

const missingEndpointClient = createTldrAstroReportFactsClient({
  baseUrl: "https://missing-fixture.invalid",
  fetchImpl: async (url) => url.endsWith("/meta/status")
    ? new Response(JSON.stringify({ features: [
      { id: "timing.report_window", path: "/timing/report-window", method: "POST" }
    ] }), { status: 200 })
    : new Response(JSON.stringify({ ok: false }), { status: 404 })
});
await assert.rejects(
  missingEndpointClient.preflight(),
  /CALCULATION_API_PREFLIGHT_FAILED: GET \/meta\/status is missing POST \/timing\/solar-return/u
);

const unresponsiveEndpointClient = createTldrAstroReportFactsClient({
  baseUrl: "https://unresponsive-fixture.invalid",
  fetchImpl: async (url) => url.endsWith("/meta/status")
    ? new Response(JSON.stringify({ features: [
      { id: "timing.report_window", path: "/timing/report-window", method: "POST" },
      { id: "timing.solar_return", path: "/timing/solar-return", method: "POST" }
    ] }), { status: 200 })
    : new Response(JSON.stringify({ ok: false }), { status: url.endsWith("/timing/report-window") ? 404 : 422 })
});
await assert.rejects(
  unresponsiveEndpointClient.preflight(),
  /CALCULATION_API_PREFLIGHT_FAILED: POST \/timing\/report-window contract probe returned 404/u
);

const endpoint = fs.readFileSync(new URL("../api/report-facts.ts", import.meta.url), "utf8");
assert.doesNotMatch(endpoint, /generateContent|api\.openai|api\.anthropic/iu);

console.log("report facts composition, freeze, regeneration, and no-provider endpoint checks passed");
