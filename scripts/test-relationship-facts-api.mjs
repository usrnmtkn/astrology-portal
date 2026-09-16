#!/usr/bin/env node
import assert from "node:assert/strict";
import { Readable } from "node:stream";

import handler from "../api/relationship-report-facts.ts";
import {
  createSupabaseRelationshipFactsDataSource,
  createTldrAstroRelationshipClient,
  RELATIONSHIP_REPORT_AUTH_REQUIRED_CODE
} from "../api/_lib/relationship-facts.ts";

const subject = {
  name: "FIXTURE_ONLY_SUBJECT",
  datetime: {
    date: "1994-04-12",
    time: "08:35",
    timeKnown: true,
    timeZone: "America/New_York"
  },
  location: {
    label: "FIXTURE_ONLY_LOCATION",
    latitude: 40.7128,
    longitude: -74.006,
    timeZone: "America/New_York"
  },
  settings: {
    houseSystem: "whole_sign",
    zodiac: "tropical",
    aspectProfile: "standard"
  }
};

{
  const requests = [];
  const client = createTldrAstroRelationshipClient({
    baseUrl: "https://fixture-api.test/",
    fetchImpl: async (url, init) => {
      requests.push({ url, init });

      if (url.endsWith("/meta/status")) {
        return Response.json({ version: "9.9.9" });
      }

      return Response.json({ metadata: {}, positions: [], contacts: [], houseOverlays: [], aspects: [], angles: {}, houseCusps: [] });
    }
  });

  assert.equal(await client.serviceVersion(), "9.9.9");
  await client.natal(subject);
  await client.synastry(subject, subject);
  await client.composite(subject, subject);

  assert.deepEqual(requests.map((request) => request.url), [
    "https://fixture-api.test/meta/status",
    "https://fixture-api.test/chart/natal",
    "https://fixture-api.test/relationship/synastry",
    "https://fixture-api.test/relationship/composite"
  ]);
  assert.equal(requests[0].init, undefined);
  for (const request of requests.slice(1)) {
    const body = JSON.parse(request.init.body);
    assert.equal(body.includeContentFacts, false, "Facts composition must not request API-authored content.");
  }
}

{
  const calls = [];
  const source = createSupabaseRelationshipFactsDataSource({
    supabaseUrl: "https://fixture-supabase.test/",
    serviceRoleKey: "fixture-service-role",
    fetchImpl: async (url, init) => {
      calls.push({ url, init });

      if (url.endsWith("/rest/v1/rpc/can_read_chart_for_report")) {
        return Response.json(true);
      }

      return Response.json([]);
    }
  });

  assert.equal(await source.canReadChartForReport("viewer", "friendship:fixture"), true);
  assert.equal(calls[0].init.method, "POST");
  assert.deepEqual(JSON.parse(calls[0].init.body), {
    viewer: "viewer",
    subject_ref: "friendship:fixture"
  });
  assert.equal(calls[0].init.headers.authorization, "Bearer fixture-service-role");
}

{
  const req = Readable.from([]);
  req.method = "POST";
  req.url = "/api/relationship-report-facts";
  req.headers = {};
  const response = {
    statusCode: 0,
    headers: {},
    body: "",
    setHeader(name, value) {
      this.headers[name] = value;
    },
    end(value) {
      this.body = String(value ?? "");
    }
  };

  await handler(req, response);
  assert.equal(response.statusCode, 401);
  assert.equal(JSON.parse(response.body).code, RELATIONSHIP_REPORT_AUTH_REQUIRED_CODE);
}

console.log("relationship facts API routes, service-role RPC, no-content request, and unauthenticated-path checks passed");
