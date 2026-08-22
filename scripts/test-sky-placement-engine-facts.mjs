#!/usr/bin/env node

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { createServer } from "vite";
import SwissEph from "swisseph-wasm";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const HOUR_MS = 3_600_000;
const signs = ["Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo", "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces"];

function utcHour(date) {
  return date.getUTCHours() + date.getUTCMinutes() / 60 + date.getUTCSeconds() / 3600;
}

function normalizeDegrees(value) {
  return ((value % 360) + 360) % 360;
}

function longitude(swe, planetId, date) {
  const jd = swe.julday(date.getUTCFullYear(), date.getUTCMonth() + 1, date.getUTCDate(), utcHour(date));
  return normalizeDegrees(swe.calc_ut(jd, planetId, swe.SEFLG_SWIEPH)[0]);
}

function sign(swe, planetId, date, longitudeOffset = 0) {
  return signs[Math.floor(normalizeDegrees(longitude(swe, planetId, date) + longitudeOffset) / 30)];
}

function separation(swe, firstId, secondId, date) {
  const difference = Math.abs(longitude(swe, firstId, date) - longitude(swe, secondId, date));
  return difference > 180 ? 360 - difference : difference;
}

function localDateKey(date, timeZone) {
  const values = Object.fromEntries(new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone
  }).formatToParts(date).map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

const swe = new SwissEph();
await swe.initSwissEph();
const vite = await createServer({
  root: path.join(repoRoot, "apps", "web"),
  server: { middlewareMode: true },
  appType: "custom",
  logLevel: "silent"
});

try {
  const ephemeris = await vite.ssrLoadModule("/src/services/ephemeris.ts");
  const cases = [
    { planet: "jupiter", sign: "libra", date: new Date("2026-08-03T12:00:00Z"), planetId: swe.SE_JUPITER },
    { planet: "saturn", sign: "aries", date: new Date("2026-08-03T12:00:00Z"), planetId: swe.SE_SATURN },
    { planet: "uranus", sign: "gemini", date: new Date("2026-08-03T12:00:00Z"), planetId: swe.SE_URANUS },
    { planet: "neptune", sign: "aries", date: new Date("2026-08-03T12:00:00Z"), planetId: swe.SE_NEPTUNE },
    { planet: "pluto", sign: "aquarius", date: new Date("2026-08-03T12:00:00Z"), planetId: swe.SE_PLUTO },
    { planet: "chiron", sign: "aries", date: new Date("2026-08-03T12:00:00Z"), planetId: 15, structuralPoint: true },
    { planet: "north-node", sign: "aquarius", date: new Date("2026-08-03T12:00:00Z"), planetId: swe.SE_TRUE_NODE, structuralPoint: true },
    { planet: "south-node", sign: "leo", date: new Date("2026-08-03T12:00:00Z"), planetId: swe.SE_TRUE_NODE, longitudeOffset: 180, structuralPoint: true }
  ];
  const ids = {
    Sun: swe.SE_SUN,
    Mercury: swe.SE_MERCURY,
    Venus: swe.SE_VENUS,
    Mars: swe.SE_MARS,
    Jupiter: swe.SE_JUPITER,
    Saturn: swe.SE_SATURN,
    Uranus: swe.SE_URANUS,
    Neptune: swe.SE_NEPTUNE,
    Pluto: swe.SE_PLUTO
  };
  const aspectAngles = { conjunction: 0, sextile: 60, square: 90, trine: 120, opposition: 180 };

  for (const testCase of cases) {
    const facts = await ephemeris.getSkyPlacementTransitFacts({
      planet: testCase.planet,
      sign: testCase.sign,
      referenceDate: testCase.date,
      timeZone: "America/New_York"
    });
    const start = new Date(facts.transitStart);
    const end = new Date(facts.transitEnd);
    assert.equal(sign(swe, testCase.planetId, new Date(start.getTime() + HOUR_MS), testCase.longitudeOffset), facts.sign);
    assert.notEqual(sign(swe, testCase.planetId, new Date(start.getTime() - HOUR_MS), testCase.longitudeOffset), facts.sign);
    assert.equal(sign(swe, testCase.planetId, new Date(end.getTime() - HOUR_MS), testCase.longitudeOffset), facts.sign);
    assert.notEqual(sign(swe, testCase.planetId, new Date(end.getTime() + HOUR_MS), testCase.longitudeOffset), facts.sign);
    assert.equal(facts.priorSign, sign(swe, testCase.planetId, new Date(start.getTime() - HOUR_MS), testCase.longitudeOffset));
    assert.ok(new Date(facts.priorSignEntryDate) < new Date(facts.priorSignExitDate));
    if (facts.planet === "Pluto" && facts.sign === "Aquarius") {
      assert.equal(
        facts.previousResidency,
        null,
        "Pluto's prior Aquarius residency predates the verified 1800 boundary of the shipped Swiss planetary file."
      );
    } else {
      assert.ok(facts.previousResidency, `${facts.planet} needs a previous same-sign residency`);
      assert.ok(new Date(facts.previousResidency.exitDate) < start);
      assert.equal(facts.previousResidency.sign, facts.sign);
    }
    if (testCase.structuralPoint) assert.deepEqual(facts.rankedEventsDuringTransit, []);
    else assert.ok(facts.rankedEventsDuringTransit.length >= 2, `${facts.planet} transit needs ranked exact aspects`);
    assert.deepEqual(
      [...facts.rankedEventsDuringTransit].sort((first, second) => first.rank - second.rank || first.occursAt.localeCompare(second.occursAt)),
      facts.rankedEventsDuringTransit,
      "Events must be engine-ranked before the knowledge join"
    );
    for (const event of facts.rankedEventsDuringTransit.slice(0, 4)) {
      const otherId = ids[event.otherPlanet];
      assert.ok(otherId != null, `Missing direct test ID for ${event.otherPlanet}`);
      const exactAt = new Date(event.occursAt);
      assert.ok(exactAt >= start && exactAt <= end);
      assert.ok(Math.abs(separation(swe, testCase.planetId, otherId, exactAt) - aspectAngles[event.aspect]) < 0.0001);
      assert.equal(event.dateKey, localDateKey(exactAt, facts.timeZone));
    }
  }

  const saturnCapricorn = await ephemeris.getSkyPlacementTransitFacts({
    planet: "saturn",
    sign: "capricorn",
    referenceDate: new Date("2047-02-01T12:00:00Z"),
    timeZone: "UTC"
  });
  assert.equal(saturnCapricorn.transitStart, "2047-01-24T15:40:42.999Z");
  assert.equal(saturnCapricorn.transitEnd, "2050-01-21T13:15:43.999Z");
  assert.equal(saturnCapricorn.priorSign, "Sagittarius");
  assert.equal(saturnCapricorn.priorSignEntryDate, "2044-10-31T12:52:22.999Z");
  assert.equal(saturnCapricorn.priorSignExitDate, "2047-01-24T15:40:42.999Z");
  assert.deepEqual(saturnCapricorn.previousResidency, {
    sign: "Capricorn",
    entryDate: "2017-12-20T04:48:42.999Z",
    exitDate: "2020-12-17T05:04:02.999Z"
  });

  const currentSky = await ephemeris.getAstrodienstSky(
    { ...ephemeris.defaultLocation, timeZone: "America/New_York" },
    new Date("2026-08-03T12:00:00Z"),
    { includeTransitWindows: true }
  );
  const currentJupiter = currentSky.positions.find((position) => position.planet === "Jupiter");
  const currentSun = currentSky.positions.find((position) => position.planet === "Sun");
  const currentVenus = currentSky.positions.find((position) => position.planet === "Venus");
  const currentChiron = currentSky.positions.find((position) => position.planet === "Chiron");
  const currentSouthNode = currentSky.positions.find((position) => position.planet === "South Node");
  for (const position of [currentSun, currentVenus, currentChiron]) {
    assert.ok(position?.priorTransitSign && position.priorTransitStart && position.priorTransitEnd);
    assert.ok(position?.previousSignResidencyStart && position.previousSignResidencyEnd);
  }
  assert.ok(currentJupiter?.priorTransitSign && currentJupiter.priorTransitStart && currentJupiter.priorTransitEnd);
  assert.ok(currentJupiter?.previousSignResidencyStart && currentJupiter.previousSignResidencyEnd);
  assert.ok(currentSouthNode?.priorTransitSign && currentSouthNode.priorTransitStart && currentSouthNode.priorTransitEnd);
  assert.notEqual(currentSouthNode?.sign, currentSky.positions.find((position) => position.planet === "North Node")?.sign);
  assert.equal(currentJupiter?.transitTimeZone, "America/New_York");

  const { renderSkyPlacement } = await import(
    `${pathToFileURL(path.join(repoRoot, "apps", "web", "src", "content", "fallbackArchitectureV3", "resolver", "renderTransitSynastry.mjs")).href}?current-sky=${Date.now()}`
  );
  const placementBodies = new Set([
    "Sun", "Moon", "Mercury", "Venus", "Mars", "Jupiter", "Saturn", "Uranus",
    "Neptune", "Pluto", "Chiron", "Lilith", "North Node", "South Node"
  ]);
  const currentPlacementAudit = currentSky.positions
    .filter((position) => placementBodies.has(position.planet))
    .map((position) => {
      const timeZone = position.transitTimeZone || "America/New_York";
      const formatDate = (value) => value
        ? new Intl.DateTimeFormat("en-US", {
            month: "long",
            day: "numeric",
            year: "numeric",
            timeZone
          }).format(new Date(value))
        : null;
      const finalExit = position.residencyPasses?.at(-1)?.exitDate ?? position.transitEnd;
      const rendered = renderSkyPlacement({
        planet: position.planet.toLowerCase().replaceAll(" ", "-"),
        sign: position.sign.toLowerCase(),
        entryDate: formatDate(position.transitStart),
        exitDate: formatDate(finalExit),
        residencyPasses: position.residencyPasses,
        residencyStations: position.residencyStations,
        priorSign: position.priorTransitSign?.toLowerCase() ?? null,
        priorSignEntryDate: formatDate(position.priorTransitStart),
        priorSignExitDate: formatDate(position.priorTransitEnd),
        previousResidencyEntryDate: formatDate(position.previousSignResidencyStart),
        previousResidencyExitDate: formatDate(position.previousSignResidencyEnd),
        isRetrograde: position.motion === "retrograde" && !["North Node", "South Node"].includes(position.planet),
        events: []
      });

      assert.ok(rendered.body.trim(), `${position.planet}/${position.sign} rendered a blank placement article`);
      assert.doesNotMatch(rendered.body, /\{\{/u, `${position.planet}/${position.sign} exposed an unresolved placeholder`);
      return `${position.planet}/${position.sign}:${rendered.templateKey}`;
    });
  assert.equal(currentPlacementAudit.length, placementBodies.size, "Every current Sky Placement body must be audited");

  const source = fs.readFileSync(path.join(repoRoot, "scripts", "build-sky-placement-engine-facts.mjs"), "utf8");
  const appSource = fs.readFileSync(path.join(repoRoot, "apps", "web", "src", "App.tsx"), "utf8");
  assert.doesNotMatch(source, /America\/Los_Angeles|Pacific\/|\bPT\b/u, "Authoring dates must not hardcode Pacific Time");
  assert.match(source, /resolvedOptions\(\)\.timeZone/u, "Authoring dates must default to the user's local time zone");
  assert.match(
    appSource,
    /function formatPlacementTransitEndpoint[\s\S]{0,500}timeZone: position\.transitTimeZone \|\| Intl\.DateTimeFormat\(\)\.resolvedOptions\(\)\.timeZone \|\| "UTC"/u,
    "Reader placement dates must use the calculated user's time zone instead of a fixed zone"
  );

  console.log(`Sky Placement engine facts passed: all slow-mover families expose prior-sign handoffs; Saturn, Uranus, Neptune, Chiron, and both Nodes expose previous same-sign residencies; Pluto-in-Aquarius correctly returns no prior range because its last residency predates the verified 1800 Swiss-data boundary; the Saturn-in-Capricorn 2047-2050 sample and 2017-2020 recurrence are byte-verified; ${currentPlacementAudit.length} current body/sign routes render reader prose from actual ephemeris facts.`);
} finally {
  await vite.close();
}
