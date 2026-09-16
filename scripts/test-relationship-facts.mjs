#!/usr/bin/env node
import assert from "node:assert/strict";

import {
  composeRelationshipFacts,
  readRelationshipReport,
  RELATIONSHIP_REPORT_UNAVAILABLE_CODE,
  RelationshipReportUnavailableError
} from "../api/_lib/relationship-facts.ts";

const VIEWER = "00000000-0000-4000-8000-000000000001";
const FRIEND = "00000000-0000-4000-8000-000000000002";
const FRIENDSHIP = "00000000-0000-4000-8000-000000000003";
const MANUAL = "00000000-0000-4000-8000-000000000004";
const UNKNOWN_MANUAL = "00000000-0000-4000-8000-000000000005";

function profile(userId, name, birthDate, birthTime, location) {
  return {
    user_id: userId,
    data: {
      name,
      charts: [{
        id: `chart-${userId}`,
        name,
        birthDate,
        birthTime,
        birthCity: location.label,
        birthLocation: location
      }]
    }
  };
}

const newYork = {
  label: "FIXTURE_ONLY_NEW_YORK",
  latitude: 40.7128,
  longitude: -74.006,
  timeZone: "America/New_York"
};
const losAngeles = {
  label: "FIXTURE_ONLY_LOS_ANGELES",
  latitude: 34.0522,
  longitude: -118.2437,
  timeZone: "America/Los_Angeles"
};

class MemoryReportEnvelopeStore {
  reports = [];
  insertCount = 0;

  async findReport(identity) {
    return structuredClone(this.reports.find((report) => (
      report.user_id === identity.userId
      && report.report_type === identity.reportType
      && report.subject_id === identity.subjectId
      && report.period_start === identity.periodStart
    )) ?? null);
  }

  async insertReport(input) {
    this.insertCount += 1;
    const report = {
      id: `report-${this.reports.length + 1}`,
      user_id: input.userId,
      report_type: input.reportType,
      subject_id: input.subjectId,
      period_start: input.periodStart,
      period_end: input.periodEnd,
      facts: structuredClone(input.facts),
      facts_engine: input.factsEngine,
      status: input.status ?? "draft",
      created_at: "2026-08-08T12:00:00.000Z",
      updated_at: "2026-08-08T12:00:00.000Z"
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
    report.updated_at = "2026-08-08T12:30:00.000Z";
    return structuredClone(report);
  }

  async listUnits() {
    return [];
  }
}

function position(point, longitude, house = 1) {
  return { point, planet: point, longitude, sign: "Aries", house };
}

function contact(id, fromPerson, fromPoint, aspect, toPerson, toPoint, orb, score) {
  return {
    id,
    fromPerson,
    fromPoint,
    fromSign: "Aries",
    fromHouse: 1,
    toPerson,
    toPoint,
    toSign: "Libra",
    toHouse: 7,
    aspect,
    orb,
    strength: 90,
    score,
    knowledgeIds: [`fixture-only-${id}`]
  };
}

function astroFixture() {
  const calls = [];
  const natal = {
    metadata: { calculatedAt: "2026-08-08T12:00:00.000Z", ephemeris: { library: "pyswisseph" } },
    subjectName: "FIXTURE_ONLY_SUBJECT",
    positions: [position("Sun", 10), position("Moon", 20)],
    angles: { Ascendant: position("Ascendant", 5) },
    houseCusps: [0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330],
    aspects: [{ from: "Sun", to: "Moon", type: "square", orb: 1, fromHouse: 1, toHouse: 2 }],
    chartRuler: "Mars",
    sect: null,
    dignitySummary: {}
  };
  const contacts = [
    contact("square-top", "B", "Mars", "square", "A", "Moon", 0.2, 130),
    contact("trine-tight", "A", "Venus", "trine", "B", "Sun", 0.1, 125),
    contact("opposition-two", "A", "Saturn", "opposition", "B", "Moon", 0.4, 120),
    contact("sextile-two", "B", "Mercury", "sextile", "A", "Venus", 0.5, 115),
    contact("conjunction-five", "B", "Sun", "conjunction", "A", "Sun", 0.7, 110),
    contact("ascendant-filter", "B", "Ascendant", "square", "A", "Mars", 0.05, 140),
    contact("sixth", "B", "Jupiter", "trine", "A", "Moon", 0.8, 100)
  ];
  contacts[1].applying = true;
  contacts[1].phase = "applying";
  const composite = {
    metadata: natal.metadata,
    positions: [position("Sun", 15, 3)],
    aspects: [{ from: "Sun", to: "Moon", type: "trine", orb: 0.5, fromHouse: 3, toHouse: 7 }],
    houseCusps: natal.houseCusps,
    angles: { Ascendant: position("Ascendant", 10) }
  };

  return {
    calls,
    client: {
      async serviceVersion() {
        calls.push("version");
        return "0.1.0";
      },
      async natal(subject) {
        calls.push(["natal", subject]);
        return structuredClone(natal);
      },
      async synastry(personA, personB) {
        calls.push(["synastry", personA, personB]);
        return { metadata: natal.metadata, contacts: structuredClone(contacts), houseOverlays: [{ id: "fixture-overlay", house: 7 }] };
      },
      async composite(personA, personB) {
        calls.push(["composite", personA, personB]);
        return structuredClone(composite);
      }
    }
  };
}

function fixtureDataSource() {
  const consent = new Map([
    [`friendship:${FRIENDSHIP}`, true],
    [`manual_chart:${MANUAL}`, true],
    [`manual_chart:${UNKNOWN_MANUAL}`, true]
  ]);
  const profiles = new Map([
    [VIEWER, profile(VIEWER, "FIXTURE_ONLY_VIEWER", "1994-04-12", "8:35 AM", newYork)],
    [FRIEND, profile(FRIEND, "FIXTURE_ONLY_FRIEND", "1991-11-03", "9:10 PM", losAngeles)]
  ]);
  const manualCharts = new Map([
    [MANUAL, {
      id: MANUAL,
      owner_user_id: VIEWER,
      claimed_by_user_id: null,
      display_name: "FIXTURE_ONLY_MANUAL",
      birth_date: "1988-05-15",
      birth_time: "10:20:00",
      birth_time_unknown: false,
      birth_place: "FIXTURE_ONLY_CHICAGO",
      birth_latitude: 41.8781,
      birth_longitude: -87.6298,
      birth_timezone: "America/Chicago"
    }],
    [UNKNOWN_MANUAL, {
      id: UNKNOWN_MANUAL,
      owner_user_id: VIEWER,
      claimed_by_user_id: null,
      display_name: "FIXTURE_ONLY_UNKNOWN_TIME",
      birth_date: "1987-02-07",
      birth_time: null,
      birth_time_unknown: true,
      birth_place: "FIXTURE_ONLY_BOSTON",
      birth_latitude: 42.3601,
      birth_longitude: -71.0589,
      birth_timezone: "America/New_York"
    }]
  ]);

  return {
    consent,
    source: {
      async canReadChartForReport(_viewer, subjectRef) {
        return consent.get(subjectRef) === true;
      },
      async loadFriendship(id) {
        return id === FRIENDSHIP ? { id, user_low_id: VIEWER, user_high_id: FRIEND } : null;
      },
      async loadManualChart(id) {
        return structuredClone(manualCharts.get(id) ?? null);
      },
      async loadUserProfile(id) {
        return structuredClone(profiles.get(id) ?? null);
      }
    }
  };
}

const period = { periodStart: "2026-08-08", periodEnd: "2027-08-07" };

{
  const store = new MemoryReportEnvelopeStore();
  const data = fixtureDataSource();
  const astro = astroFixture();
  const report = await composeRelationshipFacts({
    viewerUserId: VIEWER,
    subject: { kind: "friendship", id: FRIENDSHIP },
    ...period
  }, { dataSource: data.source, envelopeStore: store, astroClient: astro.client });

  assert.equal(report.facts_engine, "tldrastro-api@0.1.0");
  assert.equal(report.subject_id, `friendship:${FRIENDSHIP}`);
  assert.equal(report.facts.contacts.length, 5);
  assert.equal(report.facts.contacts.filter((item) => item.hardest).length, 1);
  assert.equal(report.facts.contacts.find((item) => item.hardest).id, "ascendant-filter");
  assert.equal(report.facts.contacts.filter((item) => item.tightestHarmonious).length, 1);
  assert.equal(report.facts.contacts.find((item) => item.tightestHarmonious).id, "trine-tight");
  assert.equal(report.facts.contacts.find((item) => item.id === "trine-tight").applying, true);
  assert.equal(report.facts.contacts.find((item) => item.id === "trine-tight").phase, "applying");
  assert.equal(report.facts.overlays.length, 1);
  assert.ok(report.facts.composite.positions.length > 0);
  assert.equal(astro.calls.length, 4);

  const frozen = await composeRelationshipFacts({
    viewerUserId: VIEWER,
    subject: { kind: "friendship", id: FRIENDSHIP },
    ...period
  }, { dataSource: data.source, envelopeStore: store, astroClient: astro.client });
  assert.equal(frozen.id, report.id);
  assert.equal(astro.calls.length, 4, "A frozen envelope must be returned without another FastAPI call.");

  data.consent.set(`friendship:${FRIENDSHIP}`, false);
  await assert.rejects(
    () => readRelationshipReport({
      viewerUserId: VIEWER,
      subject: { kind: "friendship", id: FRIENDSHIP },
      periodStart: period.periodStart
    }, { dataSource: data.source, envelopeStore: store }),
    (error) => error instanceof RelationshipReportUnavailableError && error.code === RELATIONSHIP_REPORT_UNAVAILABLE_CODE
  );
  assert.equal(store.reports.length, 1, "Revocation leaves the stored envelope intact.");
}

{
  const store = new MemoryReportEnvelopeStore();
  const data = fixtureDataSource();
  const astro = astroFixture();
  data.consent.set(`friendship:${FRIENDSHIP}`, false);

  await assert.rejects(
    () => composeRelationshipFacts({
      viewerUserId: VIEWER,
      subject: { kind: "friendship", id: FRIENDSHIP },
      ...period
    }, { dataSource: data.source, envelopeStore: store, astroClient: astro.client }),
    (error) => error instanceof RelationshipReportUnavailableError
  );
  assert.equal(astro.calls.length, 0, "Consent refusal must happen before every FastAPI call.");
  assert.equal(store.insertCount, 0, "Consent refusal must not create an envelope.");
}

{
  const store = new MemoryReportEnvelopeStore();
  const data = fixtureDataSource();
  const astro = astroFixture();
  const report = await composeRelationshipFacts({
    viewerUserId: VIEWER,
    subject: { kind: "manual_chart", id: MANUAL },
    ...period
  }, { dataSource: data.source, envelopeStore: store, astroClient: astro.client });

  assert.equal(report.subject_id, `manual_chart:${MANUAL}`);
  assert.equal(store.insertCount, 1, "An owner's unclaimed manual chart is eligible.");
}

{
  const store = new MemoryReportEnvelopeStore();
  const data = fixtureDataSource();
  const astro = astroFixture();
  const report = await composeRelationshipFacts({
    viewerUserId: VIEWER,
    subject: { kind: "manual_chart", id: UNKNOWN_MANUAL },
    ...period
  }, { dataSource: data.source, envelopeStore: store, astroClient: astro.client });

  assert.equal(report.facts.meta.birthTimeUnknown, true);
  assert.equal(report.facts.meta.birthTimeUnknownFor.subject, true);
  assert.deepEqual(report.facts.overlays, []);
  assert.deepEqual(report.facts.composite.angles, {});
  assert.deepEqual(report.facts.composite.houseCusps, []);
  assert.equal(report.facts.composite.positions[0].house, null);
  assert.deepEqual(report.facts.subjectNatal.angles, {});
  assert.ok(report.facts.contacts.every((item) => ![item.fromPoint, item.toPoint].includes("Ascendant")));
  assert.ok(report.facts.contacts.every((item) => item.fromHouse === null && item.toHouse === null));
  const natalCall = astro.calls.find((call) => Array.isArray(call) && call[0] === "natal");
  assert.equal(natalCall[1].datetime.timeKnown, false);
  assert.equal(natalCall[1].datetime.time, null, "Unknown time must not be replaced in the composed input.");
}

console.log("relationship facts composition, freeze, consent revocation, manual-chart, and unknown-time checks passed");
