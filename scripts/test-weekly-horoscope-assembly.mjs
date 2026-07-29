#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { build } from "esbuild";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const sourcePath = path.join(
  repoRoot,
  "apps/web/src/content/fallbackArchitectureV3/source-rows/station-cards-week-openers-v1.json"
);
const rows = JSON.parse(fs.readFileSync(sourcePath, "utf8"));
const approvedRows = rows.map((row) => ({ ...row, review_status: "approved" }));
const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "tldr-weekly-test-"));
const bundlePath = path.join(tempDir, "weekly-horoscope.mjs");
await build({
  entryPoints: [path.join(repoRoot, "apps/web/src/services/weeklyHoroscope.ts")],
  bundle: true,
  format: "esm",
  platform: "node",
  outfile: bundlePath,
  logLevel: "silent"
});

const location = {
  label: "New York City, NY",
  latitude: 40.7128,
  longitude: -74.006,
  timeZone: "America/New_York"
};
const position = (planet, sign, longitude, motion = "direct") => ({
  planet,
  sign,
  longitude,
  motion
});
const natalSky = { positions: [] };
const weekSky = {
  positions: [
    position("Moon", "Aquarius", 306),
    position("Sun", "Leo", 126),
    position("Saturn", "Aries", 10, "retrograde"),
    position("Uranus", "Gemini", 6),
    position("Neptune", "Aries", 4, "retrograde"),
    position("Mars", "Leo", 140)
  ]
};
const previousSky = {
  positions: [
    position("Moon", "Scorpio", 220),
    position("Sun", "Leo", 120),
    position("Saturn", "Aries", 11, "retrograde"),
    position("Uranus", "Gemini", 5),
    position("Neptune", "Aries", 5, "retrograde"),
    position("Mars", "Cancer", 119)
  ]
};
const saturnStation = {
  id: "station-saturn-retrograde-2026-07-27",
  type: "station",
  title: "Saturn stations retrograde",
  startsAt: "2026-07-27T16:00:00.000Z",
  dateKey: "2026-07-27",
  glyph: "♄",
  primary: true,
  planet: "Saturn",
  sign: "Aries",
  phase: "station-retrograde",
  direction: "retrograde"
};
const aquariusFullMoon = {
  id: "full-moon-aquarius-2026-07-29",
  type: "lunation",
  title: "Full Moon",
  startsAt: "2026-07-29T16:00:00.000Z",
  dateKey: "2026-07-29",
  glyph: "○",
  primary: true,
  sign: "Aquarius"
};
const fixtureEphemeris = (events, current = weekSky, previous = previousSky) => ({
  getLunarCalendarMonth: async () => ({ events }),
  getAstrodienstSky: async (_location, date) => (
    date.toISOString().slice(0, 10) < "2026-07-27" ? previous : current
  )
});

try {
  const weekly = await import(`${pathToFileURL(bundlePath).href}?v=${Date.now()}`);

  assert.deepEqual(weekly.weeklyContentImportCounts, {
    total: 24,
    station: 18,
    openers: 6,
    readerEligible: 0,
    needsReview: 24
  });
  assert.equal(rows.filter((row) => row.surface === "weekly-station").length, 18);
  assert.equal(rows.filter((row) => row.surface === "weekly-opener").length, 6);
  assert.ok(rows.every((row) => row.review_status === "needs_review"));
  assert.ok(rows.every((row) => !/SOURCE_GAP/u.test(`${row.headline}\n${row.body}`)));

  const sundayBefore = weekly.weeklyWindowFor(new Date("2026-08-02T23:59:00Z"), "America/New_York");
  const sundayAfter = weekly.weeklyWindowFor(new Date("2026-08-03T00:00:00Z"), "America/New_York");
  assert.equal(sundayBefore.weekStart, "2026-07-27");
  assert.equal(sundayBefore.weekEnd, "2026-08-02");
  assert.equal(sundayAfter.weekStart, "2026-08-03");
  assert.equal(sundayAfter.weekEnd, "2026-08-09");

  const gatedStation = weekly.resolveWeeklyStationCopy(saturnStation, rows);
  const approvedStation = weekly.resolveWeeklyStationCopy(saturnStation, approvedRows);
  const authoredStation = approvedRows.find(
    (row) => row.contentKey === "authored/station/saturn/rx"
  );
  assert.ok(authoredStation);
  assert.notEqual(gatedStation.body, authoredStation.body);
  assert.equal(approvedStation.body, authoredStation.body);

  assert.equal(weekly.resolveWeeklyOpener("lunation", [aquariusFullMoon], rows), undefined);
  const approvedOpener = weekly.resolveWeeklyOpener(
    "lunation",
    [aquariusFullMoon],
    approvedRows
  );
  assert.ok(approvedOpener);
  assert.match(approvedOpener.body, /Aquarius/u);
  assert.doesNotMatch(approvedOpener.body, /\{\{/u);

  const facts = weekly.lunationBlendFacts(weekSky, "Aquarius", "Gemini", "full-moon");
  assert.deepEqual(
    {
      moonHouse: facts.moonHouse,
      sunHouse: facts.sunHouse,
      ruler: facts.ruler,
      rulerHouse: facts.rulerHouse,
      uranusHouse: facts.uranusHouse
    },
    {
      moonHouse: 9,
      sunHouse: 3,
      ruler: "saturn",
      rulerHouse: 11,
      uranusHouse: 1
    }
  );
  assert.equal(facts.uranusActive, true);

  const realWeek = await weekly.buildWeeklyHoroscope({
    userId: "weekly-acceptance-fixture",
    natalSky,
    risingSign: "gemini",
    location,
    now: new Date("2026-07-29T12:00:00Z"),
    rows: approvedRows,
    ephemeris: fixtureEphemeris([saturnStation, aquariusFullMoon])
  });
  assert.equal(realWeek.weekStart, "2026-07-27");
  assert.equal(realWeek.weekEnd, "2026-08-02");
  assert.equal(realWeek.weekType, "lunation");
  assert.equal(realWeek.chip, "Lunation week");
  assert.match(realWeek.opener?.headline ?? "", /Full Moon week/u);
  assert.match(realWeek.opener?.body ?? "", /Aquarius/u);
  assert.equal(realWeek.sections.length, 2);
  assert.equal(realWeek.sections[0].source, "station");
  assert.equal(realWeek.sections[0].dateKey, "2026-07-27");
  assert.equal(realWeek.sections[1].source, "lunation");
  assert.equal(realWeek.sections[1].dateKey, "2026-07-29");
  assert.equal(realWeek.sections.filter((section) => section.accented).length, 1);
  assert.equal(realWeek.sections.find((section) => section.accented)?.source, "lunation");
  assert.equal(realWeek.sections.filter((section) => /Saturn stations/iu.test(section.driverLabel)).length, 1);
  assert.equal(realWeek.sections.filter((section) => /Full Moon/iu.test(section.driverLabel)).length, 1);
  assert.match(realWeek.background ?? "", /Neptune remains retrograde in Aries/u);
  assert.ok(realWeek.sections.every((section) => !/Neptune/iu.test(section.driverLabel)));
  assert.equal(new Set(realWeek.sections.map((section) => section.body)).size, realWeek.sections.length);
  assert.ok(realWeek.sections.every((section) => !/SOURCE_GAP/u.test(section.body)));
  assert.equal(realWeek.sourceGaps.length, 0);
  assert.match(realWeek.sections[1].body, /9th house/u);
  assert.match(realWeek.sections[1].body, /3rd house/u);
  assert.doesNotMatch(realWeek.sections[1].body, /With Saturn ruling this lunation from your 11th house/u);
  assert.match(realWeek.sections[1].body, /Uranus in your 1st house/u);

  const quietWeek = await weekly.buildWeeklyHoroscope({
    userId: "weekly-quiet-fixture",
    natalSky,
    risingSign: "gemini",
    location,
    now: new Date("2026-07-29T12:00:00Z"),
    rows: approvedRows,
    ephemeris: fixtureEphemeris([])
  });
  assert.equal(quietWeek.weekType, "quiet");
  assert.match(quietWeek.opener?.headline ?? "", /quiet(?:er)? week/iu);
  assert.equal(quietWeek.sections.length, 1);
  assert.equal(quietWeek.sections[0].source, "weekly-moon");
  assert.ok(quietWeek.background);

  const start = new Date("2026-01-05T12:00:00Z");
  for (let index = 0; index < 52; index++) {
    const now = new Date(start);
    now.setUTCDate(start.getUTCDate() + index * 7);
    const assembly = await weekly.buildWeeklyHoroscope({
      userId: "weekly-52-fixture",
      natalSky,
      risingSign: "gemini",
      location,
      now,
      rows: approvedRows,
      ephemeris: {
        getLunarCalendarMonth: async () => ({ events: [] }),
        getAstrodienstSky: async () => weekSky
      }
    });
    assert.ok(
      assembly.sections.every((section) => (
        !section.dateKey
        || (section.dateKey >= assembly.weekStart && section.dateKey <= assembly.weekEnd)
      ))
    );
    assert.equal(new Set(assembly.sections.map((section) => section.body)).size, assembly.sections.length);
    assert.ok(assembly.sections.every((section) => !/SOURCE_GAP/u.test(section.body)));
  }

  const youPage = fs.readFileSync(
    path.join(repoRoot, "apps/web/src/features/you/YouPage.tsx"),
    "utf8"
  );
  const app = fs.readFileSync(path.join(repoRoot, "apps/web/src/App.tsx"), "utf8");
  assert.match(youPage, /\{ value: "daily", label: "Daily" \}/u);
  assert.match(youPage, /\{ value: "weekly", label: "Weekly" \}/u);
  assert.doesNotMatch(youPage, /weeklyHoroscopeAssembly\.cards\.map/u);
  assert.match(youPage, /weeklyHoroscopeAssembly\.sections\.map/u);
  assert.match(youPage, /weekly-horoscope__background/u);
  assert.match(app, /buildWeeklyHoroscope\(\{/u);

  console.log(
    "weekly horoscope assembly checks passed: 24 gated imports, Jul 27 acceptance, quiet week, and 52-week invariants"
  );
} finally {
  fs.rmSync(tempDir, { recursive: true, force: true });
}
